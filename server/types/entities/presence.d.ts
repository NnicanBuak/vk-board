/**
 * Backend-only in-memory record for board presence.
 * `ts` stays server-side and is used only for TTL filtering.
 */
export interface PresenceUserRecord {
  userId: number;
  firstName: string;
  lastName: string;
  photo100: string;
  ts: number;
}
