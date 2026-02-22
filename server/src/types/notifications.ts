export enum NotificationType {
  NEW_LISTING = "NEW_LISTING",
  GROUP_JOIN_REQUEST = "GROUP_JOIN_REQUEST",
  GROUP_JOIN_ACCEPTED = "GROUP_JOIN_ACCEPTED",
  GROUP_JOIN_REJECTED = "GROUP_JOIN_REJECTED",
  GROUP_JOIN_REQUEST_DECIDED = "GROUP_JOIN_REQUEST_DECIDED", // to other members: "X accepted/rejected Y's request"
  GROUP_MEMBER_LEFT = "GROUP_MEMBER_LEFT",
  GROUP_DISBANDED = "GROUP_DISBANDED",
  CONNECTION_REQUEST = "CONNECTION_REQUEST",
  CONNECTION_ACCEPTED = "CONNECTION_ACCEPTED",
  CONNECTION_REJECTED = "CONNECTION_REJECTED",
}

/** Action types the client can perform when the user taps a notification. */
export const NOTIFICATION_ACTION_TYPES = {
  OPEN_GROUP: "OPEN_GROUP",
  OPEN_TRAVELLER: "OPEN_TRAVELLER",
} as const;

export type NotificationActionType =
  (typeof NOTIFICATION_ACTION_TYPES)[keyof typeof NOTIFICATION_ACTION_TYPES];

export interface NotificationActionPayload {
  airportCode: string;
  groupId?: string;
  userId?: string;
}

export interface NotificationAction {
  type: NotificationActionType;
  payload: NotificationActionPayload;
}

export interface NotificationData {
  groupId?: string;
  groupName?: string; // Display name for group (shown in bold in UI)
  airportCode?: string;
  actorUserId?: string; // The user who triggered the action
  listingId?: string;
  metadata?: Record<string, unknown>;
  /** When set, the client will use this to navigate / open UI (e.g. group modal, traveller modal). Omit for no action. */
  action?: NotificationAction;
}

export interface CreateNotificationPayload {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
}
