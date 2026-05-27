// src/lib/gmail-client.ts
import { google } from 'googleapis';
import { prisma } from './prisma';
import { decrypt, encrypt } from './crypto';

export async function getGmailClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { encryptedTokens: true },
  });

  if (!user?.encryptedTokens) {
    throw new Error('User not found or missing tokens');
  }

  const { accessToken, refreshToken } = JSON.parse(decrypt(user.encryptedTokens));

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token:  accessToken,
    refresh_token: refreshToken,
  });

  // When googleapis auto-refreshes, persist the new access token
  oauth2Client.on('tokens', async (newTokens) => {
    if (!newTokens.access_token) return;

    const current = JSON.parse(decrypt(user.encryptedTokens!));
    await prisma.user.update({
      where: { id: userId },
      data: {
        encryptedTokens: encrypt(
          JSON.stringify({ ...current, accessToken: newTokens.access_token })
        ),
      },
    });
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
}