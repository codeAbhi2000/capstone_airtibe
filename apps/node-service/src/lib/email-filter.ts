/**
 * 
 * Hard filter for email drafting app — rejects OTPs, notifications,
 * and no-reply/system-generated emails without any AI call.
 *
 * Usage:
 *   const { shouldSkip } = require('./emailFilter');
 *   const result = shouldSkip({ sender, subject, body });
 *   if (result.skip) return res.json({ skipped: true, reason: result.reason });
 */
 
const SENDER_PATTERNS = [
  /noreply/i,
  /no-reply/i,
  /donotreply/i,
  /do-not-reply/i,
  /mailer-daemon/i,
  /postmaster/i,
  /notifications?@/i,
  /alerts?@/i,
  /automated@/i,
  /system@/i,
  /bounce@/i,
  /daemon@/i,
  /support\+[a-z0-9]+@/i,
];

// ---------------------------------------------------------------------------
// 2. SUBJECT patterns
// ---------------------------------------------------------------------------
const SUBJECT_PATTERNS = [
  /\b(otp|one.?time.?(password|code|pin))\b/i,
  /\b(verification|verify|confirm)\s+(code|pin|otp)\b/i,
  /\byour\s+(code|pin|otp)\s+is\b/i,
  /\b\d{4,8}\b\s+is\s+(your|the)\s+(code|otp|pin)/i,
  /\b(alert|notification|notify|reminder)\b/i,
  /\bpassword\s+(reset|changed|updated)\b/i,
  /\b(login|sign.?in)\s+(attempt|alert|notification)\b/i,
  /\bnew\s+(device|sign.?in|login)\s+detected\b/i,
  /\bsecurity\s+(alert|notification|code)\b/i,
  /\b(account|billing|payment)\s+(alert|notification|update)\b/i,
  /\byour\s+(order|delivery|shipment|package)\b/i,
  /\b(invoice|receipt|transaction)\s+#?\d+/i,
  /\b(unsubscribe|opt.?out)\b/i,
  /\b(newsletter|digest|weekly\s+update|daily\s+digest)\b/i,
  /\b(auto.?reply|out\s+of\s+office)\b/i,
];

// ---------------------------------------------------------------------------
// 3. BODY patterns
// ---------------------------------------------------------------------------
const BODY_PATTERNS = [
  /^\s*\d{4,8}\s*$/m,
  /\byour\s+(verification|one.?time|otp|security)\s+(code|pin|password)\s+(is\s+)?[:：]?\s*\d{4,8}\b/i,
  /\benter\s+(this\s+)?(code|otp|pin)\s*[:：]?\s*\d{4,8}\b/i,
  /\bdo\s+not\s+share\s+this\s+(code|otp|pin)\b/i,
  /\b(expires?|valid)\s+(in|for|until)\s+\d+\s+(minute|min|hour|second)/i,
  /this\s+is\s+an?\s+(automated|auto.?generated)\s+(message|email|notification)/i,
  /please\s+do\s+not\s+reply\s+to\s+this\s+(email|message)/i,
  /you('re|\s+are)\s+receiving\s+this\s+(because|email|notification)/i,
  /\bunsubscribe\b.{0,60}\bhttps?:\/\//i,
  /\bview\s+(this\s+)?(email|message)\s+in\s+(your\s+)?browser\b/i,
];

// ---------------------------------------------------------------------------
// 4. QUALITY gate
// ---------------------------------------------------------------------------
const MIN_SUBJECT_LENGTH = 5;
const MIN_BODY_LENGTH    = 10;

const COMMON_SHORT_WORDS = new Set([
  "a", "i", "am", "an", "as", "at", "be", "by", "do", "go", "he", "hi",
  "if", "in", "is", "it", "me", "my", "no", "of", "ok", "on", "or", "so",
  "to", "up", "us", "we", "you", "the", "and", "for", "are", "but", "not",
  "was", "has", "had", "him", "his", "her", "can", "did", "got", "let",
  "our", "out", "say", "she", "its", "who", "how", "why", "yes", "hey"
]);
 
// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
function  is_gibberish(text: string, min_word_ratio: Number = 0.5) : boolean{
    /** 
    Returns True if the body looks like gibberish.
    Heuristic: less than 50% of whitespace-separated tokens look like real words
    (i.e. contain at least 2 vowels or are common short words).
   */
    const tokens = text.trim().split(/\s+/);
  if (!tokens.length || (tokens.length === 1 && tokens[0] === "")) return true;

  // A token is "real" if it's a known short word OR contains a vowel + at least 1 more letter
  const realWord = /[aeiouAEIOU][a-zA-Z]/;
  const realCount = tokens.filter(t => {
    const lower = t.toLowerCase().replace(/[^a-z]/g, "");
    return COMMON_SHORT_WORDS.has(lower) || realWord.test(t);
  }).length;
    return ((realCount / tokens.length) as Number) < min_word_ratio;
}
    

/**
 * @param {{ sender?: string, subject?: string, body?: string }} email
 * @returns {{ skip: boolean, reason?: string }}
 */

export function shouldSkip({ sender = '', subject = '', body = '' } = {}) {
  const s = (str: string) => String(str || '').trim();
 
  const cleanSender  = s(sender);
  const cleanSubject = s(subject);
  const cleanBody    = s(body);
 
  // --- Check 1: Sender ---
  for (const pattern of SENDER_PATTERNS) {
    if (pattern.test(cleanSender)) {
      return { skip: true, reason: `sender_blocked: matched ${pattern}` };
    }
  }
 
  // --- Check 2: Subject ---
  for (const pattern of SUBJECT_PATTERNS) {
    if (pattern.test(cleanSubject)) {
      return { skip: true, reason: `subject_blocked: matched ${pattern}` };
    }
  }
 
  // --- Check 3: Body patterns ---
  for (const pattern of BODY_PATTERNS) {
    if (pattern.test(cleanBody)) {
      return { skip: true, reason: `body_blocked: matched ${pattern}` };
    }
  }

  if (is_gibberish(cleanBody)) {
    return { skip: true, reason: 'body_blocked: detected as gibberish' };
  }
 
  // --- Check 4: Quality gate ---
  if (cleanSubject.length < MIN_SUBJECT_LENGTH) {
    return { skip: true, reason: 'quality_gate: subject too short' };
  }
  if (cleanBody.length < MIN_BODY_LENGTH) {
    return { skip: true, reason: 'quality_gate: body too short' };
  }
 
  return { skip: false };
}