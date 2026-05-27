// gmail service all gmail related logic goes here, like fetching emails, sending emails, etc. This is where the Gmail API client will be used.

import { getGmailClient } from "../lib/gmail-client";

export function decodeBody(payload: any): string {
  if (!payload) return '';

  // Multipart email — find the plain text part
  if (payload.parts && payload.parts.length > 0) {
    const textPart = payload.parts.find(
      (p: any) => p.mimeType === 'text/plain'
    );

    // If no plain text part, recurse into nested parts (e.g. multipart/alternative)
    if (!textPart) {
      for (const part of payload.parts) {
        const nested = decodeBody(part);
        if (nested) return nested;
      }
      return '';
    }

    const data = textPart.body?.data || '';
    return Buffer.from(data, 'base64').toString('utf8').trim();
  }

  // Single part email — body is directly on payload
  const data = payload.body?.data || '';
  return Buffer.from(data, 'base64').toString('utf8').trim();
}

export async function fetchSentEmails(userId: string, count = 30) {
  const gmail = await getGmailClient(userId); // handles token refresh automatically

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: 'in:sent',
    maxResults: count,
  });

  const ids = list.data.messages || [];

  // Batch in groups of 10 to respect quota
  const results = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const messages = await Promise.all(
      batch.map(({ id }) =>
        gmail.users.messages.get({ userId: 'me', id: id!, format: 'full' })
      )
    );
    results.push(...messages);
  }

  return results.map(({ data }) => ({
    body: decodeBody(data.payload),
  }));
}

export async function fetchIncomingEmail(userId: string, messageId: string) {
  const gmail = await getGmailClient(userId);
  const msg = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full'
  });

  const headers = msg.data.payload?.headers || [];
  const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  const subject = getHeader('subject');
  const fromEmail = getHeader('from');
  const body = decodeBody(msg.data.payload);
  const threadId = msg.data.threadId || '';

  // Extract sender friendly name
  let senderName = fromEmail;
  if (fromEmail.includes('<')) {
    senderName = fromEmail.split('<')[0].trim();
  }

  return {
    messageId,
    threadId,
    subject,
    fromEmail,
    senderName,
    body
  };
}

export async function sendReplyEmail(
  userId: string,
  toEmail: string,
  subject: string,
  body: string,
  originalMessageId: string,
  threadId: string
) {
  const gmail = await getGmailClient(userId);

  // Ensure subject starts with Re: if it doesn't already
  const cleanSubject = subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`;
  const utf8Subject = `=?utf-8?B?${Buffer.from(cleanSubject).toString('base64')}?=`;

  const emailLines = [
    `To: ${toEmail}`,
    `Subject: ${utf8Subject}`,
    'Content-Type: text/plain; charset=utf-8',
    'MIME-Version: 1.0',
    `In-Reply-To: ${originalMessageId}`,
    `References: ${originalMessageId}`,
    '',
    body
  ];

  const emailStr = emailLines.join('\r\n');
  const raw = Buffer.from(emailStr)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await gmail.users.messages.send({
    userId: 'me',
    requestBody: {
      raw,
      threadId
    }
  });

  return response.data;
}