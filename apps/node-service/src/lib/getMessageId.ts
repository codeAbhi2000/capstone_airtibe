import { createLogger } from "./logger";

const log = createLogger("getMessageId");

export async function getMessageId(userEmail : string , historyId: string , gmailClient : any) : Promise<string | null> {
    try {
        // 1. Try fetching via History API first
        const lookbackHistoryId = (BigInt(historyId) - 1n).toString();
        
        const historyResponse = await gmailClient.users.history.list({
            userId: 'me',
            startHistoryId: lookbackHistoryId,
            historyTypes: ['messageAdded']
        });

        let targetMessageId = null;
        const historyRecords = historyResponse.data.history;

        if (historyRecords && historyRecords.length > 0) {
            // Find the message ID from history records
            for (const record of historyRecords) {
                if (record.messagesAdded) {
                    for (const addedMessage of record.messagesAdded) {
                        if (addedMessage.message.labelIds.includes('INBOX')) {
                            targetMessageId = addedMessage.message.id;
                            break;
                        }
                    }
                }
                if (targetMessageId) break;
            }
        }

        // 2. FALLBACK: If history API didn't return the message array, 
        // fetch the latest unread/incoming message directly from the inbox.
        if (!targetMessageId) {
            log.warn("History array empty — falling back to fetching latest message directly");
            
            const messageListResponse = await gmailClient.users.messages.list({
                userId: 'me',
                q: 'label:INBOX', // Filter for items in the inbox
                maxResults: 1     // We only want the single newest email
            });

            const messages = messageListResponse.data.messages;
            if (messages && messages.length > 0) {
                targetMessageId = messages[0].id;
            }
        }

        if (!targetMessageId) {
            log.warn("Could not isolate any new message IDs");
            return null;
        }

        log.info({ targetMessageId }, "🎯 Target Message ID isolated");
        return targetMessageId
        
        // 3. Now safely call gmailClient.users.messages.get with targetMessageId...

    } catch (error) {
        log.error({ err: error }, "Processing failed");
        return null
    }
}