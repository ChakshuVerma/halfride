import { NotificationType } from "../types/notifications";
/**
 * Firestore Collection Names
 */
export const COLLECTIONS = {
  USERS: "users",
  FLIGHT_DETAIL: "flightDetail",
  TRAVELLER_DATA: "traveller_data",
  AIRPORTS: "airports",
  NOTIFICATIONS: "notifications",
  GROUPS: "groups",
} as const;

/**
 * Database Inferred Interfaces
 */

export interface UserSchema {
  userID: string;
  FirstName: string;
  LastName: string;
  DOB: string; // "YYYY-MM-DD"
  isFemale: boolean;
  Phone: string | null;
  username?: string;
  bio?: string;
  photoURL?: string | null;
  tags?: string[];
  isVerified?: boolean;
  passwordSalt?: string;
  passwordHash?: string;
  refreshJtiHash?: string | null;
  refreshUpdatedAt?: any; // Timestamp
  createdAt: any; // Firebase Firestore Timestamp
  updatedAt: any; // Firebase Firestore Timestamp
}

export interface FlightDetailSchema {
  flightId: string; // carrier_flightNumber
  carrier: string;
  flightNumber: string;
  flightDate: string; // "YYYY-MM-DD"
  etaFetchedAt: any; // Timestamp
  flightData: any; // Complex object from FlightStats API
  status: "active" | "completed" | "pending_initial_fetch";
  createdAt: any;
  updatedAt: any;
}

// We assume that one traveller can have only one entry at a time which is active
export interface TravellerDataSchema {
  date: string; // "YYYY-MM-DD" from flightDate
  flightArrival: string; // Airport Code
  flightDeparture: string; // Airport Code
  terminal: string;
  destination: string; // User defined destination
  flightRef: any; // DocumentReference to flightDetail
  userRef: any; // DocumentReference to users
  createdAt: any;
  updatedAt: any;
  connectionRequests: any[]; // Array of DocumentReference to users
  groupRef: any; // DocumentReference to groups
  isCompleted: boolean;
  /** True when user verified at terminal via GPS. */
  readyToOnboard?: boolean;
  /** Timestamp when user verified at terminal. */
  readyToOnboardAt?: any;
}

export interface NotificationSchema {
  notificationId: string;
  recipientRef: any; // DocumentReference to users
  type: NotificationType;
  title: string;
  body: string;
  data: {
    groupRef?: any; // DocumentReference to groups
    actorUserRef?: any; // DocumentReference to users
    listingId?: string; // Listing might not be a top-level collection yet?
    flightRef?: any; // DocumentReference to flightDetail
    metadata?: any;
  };
  isRead: boolean;
  createdAt: any;
}

export interface GroupSchema {
  groupId: string;
  /** Display name; max 50 chars, alphabets only. Any member can update. */
  name?: string;
  members: any[]; // Array of DocumentReference to users
  pendingRequests: any[]; // Array of DocumentReference to users
  /** Airport code (e.g. DEL) for querying groups by airport. Members may be from different flights/terminals. */
  flightArrivalAirport?: string;
  createdAt: any;
  updatedAt: any;
}

/**
 * Group Chat Messages
 */

export interface GroupMessageSchema {
  /** Firestore document ID (duplicated for easier querying/mapping if needed). */
  messageId: string;
  /** Parent group ID (denormalized for easier querying/aggregation). */
  groupId: string;
  /** UID of the sender (string, for simple checks and rules). */
  senderId: string;
  /** Cached display name (e.g. username or first name). */
  senderDisplayName: string;
  /** Cached avatar URL, if available. */
  senderPhotoURL?: string | null;
  /** Message text content. */
  text: string;
  /** When the message was created (server timestamp). */
  createdAt: any;
  /** Optional: when the message was last edited. */
  editedAt?: any;
  /** Optional: soft-delete timestamp. */
  deletedAt?: any;
  /** Optional: UID of the user who deleted the message. */
  deletedBy?: string;
}

/**
 * Field Name Constants
 */

export const USER_FIELDS = {
  USER_ID: "userID",
  FIRST_NAME: "FirstName",
  LAST_NAME: "LastName",
  DOB: "DOB",
  IS_FEMALE: "isFemale",
  PHONE: "Phone",
  USERNAME: "username",
  BIO: "bio",
  PHOTO_URL: "photoURL",
  TAGS: "tags",
  IS_VERIFIED: "isVerified",
  PASSWORD_SALT: "passwordSalt",
  PASSWORD_HASH: "passwordHash",
  REFRESH_JTI_HASH: "refreshJtiHash",
  REFRESH_UPDATED_AT: "refreshUpdatedAt",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const FLIGHT_FIELDS = {
  FLIGHT_ID: "flightId",
  CARRIER: "carrier",
  FLIGHT_NUMBER: "flightNumber",
  FLIGHT_DATE: "flightDate",
  ETA_FETCHED_AT: "etaFetchedAt",
  FLIGHT_DATA: "flightData",
  STATUS: "status",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

export const TRAVELLER_FIELDS = {
  DATE: "date",
  FLIGHT_ARRIVAL: "flightArrival",
  FLIGHT_DEPARTURE: "flightDeparture",
  TERMINAL: "terminal",
  DESTINATION: "destination",
  FLIGHT_REF: "flightRef",
  USER_REF: "userRef",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
  CONNECTION_REQUESTS: "connectionRequests",
  GROUP_REF: "groupRef",
  IS_COMPLETED: "isCompleted",
  READY_TO_ONBOARD: "readyToOnboard",
  READY_TO_ONBOARD_AT: "readyToOnboardAt",
} as const;

// [NEW]
export const NOTIFICATION_FIELDS = {
  NOTIFICATION_ID: "notificationId",
  RECIPIENT_REF: "recipientRef",
  TYPE: "type",
  TITLE: "title",
  BODY: "body",
  DATA: "data",
  IS_READ: "isRead",
  CREATED_AT: "createdAt",
} as const;

// [NEW]
export const GROUP_FIELDS = {
  GROUP_ID: "groupId",
  NAME: "name",
  MEMBERS: "members",
  PENDING_REQUESTS: "pendingRequests",
  FLIGHT_ARRIVAL_AIRPORT: "flightArrivalAirport",
  MEMBER_UIDS: "memberUids",
  CREATED_AT: "createdAt",
  UPDATED_AT: "updatedAt",
} as const;

/** Group subcollections (per-group nested collections). */
export const GROUP_SUBCOLLECTIONS = {
  MESSAGES: "messages",
} as const;

/** Field names for documents under groups/{groupId}/messages/{messageId}. */
export const GROUP_MESSAGE_FIELDS = {
  MESSAGE_ID: "messageId",
  GROUP_ID: "groupId",
  TYPE: "type", // "user" | "system" (e.g. "X joined/left the group")
  SENDER_ID: "senderId",
  SENDER_DISPLAY_NAME: "senderDisplayName",
  SENDER_PHOTO_URL: "senderPhotoURL",
  TEXT: "text",
  CREATED_AT: "createdAt",
  EDITED_AT: "editedAt",
  DELETED_AT: "deletedAt",
  DELETED_BY: "deletedBy",
} as const;

