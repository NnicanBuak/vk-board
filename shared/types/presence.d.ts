export interface PresenceUserProfile {
  firstName: string;
  lastName: string;
  photo100: string;
}

export interface PresenceUserPublic extends PresenceUserProfile {
  userId: number;
}
