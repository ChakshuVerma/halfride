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

export interface NotificationData {
  groupId?: string;
  groupName?: string; // Display name for group (shown in bold in UI)
  actorUserId?: string; // The user who triggered the action
  listingId?: string;
  metadata?: Record<string, any>;
}

export interface CreateNotificationPayload {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
}
