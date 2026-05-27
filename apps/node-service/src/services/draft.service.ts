// src/services/draft.service.ts

export interface EmailDetails {
  subject: string;
  body: string;
  fromEmail: string;
  senderName?: string;
}

/**
 * Calls the Python AI service to generate a customized draft reply.
 * Falls back to an intelligent template-based reply if the AI service is unreachable or key is missing.
 */
export async function generateAIDraftCall(
  userId: string,
  email: EmailDetails,
  tone: string = "friendly",
  instruction?: string
): Promise<string> {
  const aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";

  if (process.env.AI_SERVICE_URL) {
    try {
      console.log(`Calling Python AI service at ${aiServiceUrl}/draft/generate for user ${userId}`);
      const response = await fetch(`${aiServiceUrl}/draft/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          emailBody: email.body,
          emailSubject: email.subject,
          senderName: email.senderName || email.fromEmail,
          tone,
          instruction,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { draftText: string; draft?: string };
        const draftText = data.draftText || data.draft;
        if (draftText) {
          return draftText.trim();
        }
      }
      console.log("AI service returned a non-ok response, using fallback draft generator");
    } catch (err) {
      console.log("Error contacting Python AI service, using fallback draft generator:", err);
    }
  }

  // High-Quality Custom Fallback Draft Generator
  console.log("Generating fallback draft reply based on tone and instruction...");
  const cleanSender = email.senderName || email.fromEmail.split("<")[0].trim() || "there";
  
  let greeting = `Hi ${cleanSender},`;
  if (tone === "formal") {
    greeting = `Dear ${cleanSender},`;
  }

  let bodyText = "";
  if (instruction) {
    bodyText = `Thank you for your message regarding "${email.subject}". \n\nConcerning your point about: "${instruction}", I wanted to confirm that we are fully aligned on this approach and will move forward accordingly.`;
  } else {
    bodyText = `Thank you for your email regarding "${email.subject}". I have received it and will look into it shortly.`;
  }

  let closing = "\n\nBest regards,";
  if (tone === "friendly") {
    closing = "\n\nThanks and warm regards,";
  } else if (tone === "concise") {
    closing = "\n\nBest,";
  }

  return `${greeting}\n\n${bodyText}${closing}`;
}
