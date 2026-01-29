/**
 * Firestore Collection Names
 */
export const COLLECTIONS = {
  USERS: 'users',
  FLIGHT_DETAIL: 'flightDetail',
  TRAVELLER_DATA: 'traveller_data',
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
  status: 'active' | 'completed' | 'pending_initial_fetch';
  createdAt: any;
  updatedAt: any;
}

export interface TravellerDataSchema {
  date: string; // "YYYY-MM-DD" from flightDate
  flightArrival: string; // Airport Code
  flightDeparture: string; // Airport Code
  terminal: string;
  destination: string; // User defined destination
  flightRef: any; // DocumentReference to flightDetail
  userRef: any; // DocumentReference to users
  updatedAt: any;
}

/**
 * Field Name Constants
 */

export const USER_FIELDS = {
  USER_ID: 'userID',
  FIRST_NAME: 'FirstName',
  LAST_NAME: 'LastName',
  DOB: 'DOB',
  IS_FEMALE: 'isFemale',
  PHONE: 'Phone',
  USERNAME: 'username',
  BIO: 'bio',
  TAGS: 'tags',
  IS_VERIFIED: 'isVerified',
  PASSWORD_SALT: 'passwordSalt',
  PASSWORD_HASH: 'passwordHash',
  REFRESH_JTI_HASH: 'refreshJtiHash',
  REFRESH_UPDATED_AT: 'refreshUpdatedAt',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt',
} as const;


export const FLIGHT_FIELDS = {
  FLIGHT_ID: 'flightId',
  CARRIER: 'carrier',
  FLIGHT_NUMBER: 'flightNumber',
  FLIGHT_DATE: 'flightDate',
  ETA_FETCHED_AT: 'etaFetchedAt',
  FLIGHT_DATA: 'flightData',
  STATUS: 'status',
  CREATED_AT: 'createdAt',
  UPDATED_AT: 'updatedAt'
} as const;

export const TRAVELLER_FIELDS = {
  DATE: 'date',
  FLIGHT_ARRIVAL: 'flightArrival',
  FLIGHT_DEPARTURE: 'flightDeparture',
  TERMINAL: 'terminal',
  DESTINATION: 'destination',
  FLIGHT_REF: 'flightRef',
  USER_REF: 'userRef',
  UPDATED_AT: 'updatedAt'
} as const;


