/**
 * Maximum length for free-text "reason" inputs (override, reassignment, closure, decision, flag).
 * Stricter than the API contract (which allows up to 2,000); enforced in the UI only.
 */
export const REASON_MAX_LENGTH = 250;

/** Validation message shared by every reason schema. */
export const REASON_MAX_MESSAGE = `Use at most ${REASON_MAX_LENGTH} characters.`;
