export enum NotificationType {
  NEW_LISTING = "NEW_LISTING",
  GROUP_JOIN_REQUEST = "GROUP_JOIN_REQUEST",
  GROUP_JOIN_ACCEPTED = "GROUP_JOIN_ACCEPTED",
  GROUP_MEMBER_LEFT = "GROUP_MEMBER_LEFT",
  GROUP_DISBANDED = "GROUP_DISBANDED",
  FLIGHT_STATUS = "FLIGHT_STATUS",
  CONNECTION_REQUEST = "CONNECTION_REQUEST",
  CONNECTION_ACCEPTED = "CONNECTION_ACCEPTED",
  CONNECTION_REJECTED = "CONNECTION_REJECTED",
}

export interface NotificationData {
  groupId?: string;
  actorUserId?: string; // The user who triggered the action
  listingId?: string;
  flightId?: string;
  metadata?: Record<string, any>;
}

export interface CreateNotificationPayload {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: NotificationData;
}
