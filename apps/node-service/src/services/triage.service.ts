import { createLogger } from "../lib/logger";


const log = createLogger("triage.service");

export async function triageEmailForDraftGeneration(
  subject: string,
  body: string,
  senderEmail: string,
): Promise<{ needReply: boolean; reason?: string }> {
  const aiRes = await fetch(`${process.env.AI_SERVICE_URL}/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subject: subject,
      fromEmail: senderEmail,
      body: body
    }),
  });

    if (!aiRes.ok) {
        log.warn(
        "AI service returned a non-ok response, using fallback draft generator",
      );

      return {
        needReply: false,
        reason: "AI service error, defaulting to reply needed",
      };
    }

    const data = (await aiRes.json()) as {
        needReply: boolean | string;
        reason?: string;
    }

    return {
        needReply: data.needReply === "True" || data.needReply === true,
        reason: data.reason,
    };

}
