export type Traveller = {
  id: string;
  name: string;
  gender: "Male" | "Female" | "Other";
  destination: string;
  airportName: string;
  flightDateTime: Date;
  flightDepartureTime?: Date | string;
  terminal: string;
  flightNumber: string;
  distanceFromUserKm: number;
  flightCarrier?: string;
  flightNumberRaw?: string;
  bio?: string;
  tags?: string[];
  isVerified?: boolean;
  username: string;
  connectionStatus?: "SEND_REQUEST" | "REQUEST_SENT" | "REQUEST_RECEIVED";
  /** True when this traveller is the current user's own listing. */
  isOwnListing?: boolean;
};

export type Group = {
  id: string;
  name: string;
  airportName?: string; // set by frontend when mapping from API (airportCode + name)
  airportCode?: string;
  destinations: string[];
  groupSize: number;
  maxUsers: number;
  genderBreakdown: {
    male: number;
    female: number;
  };
  createdAt: string | Date;
  /** True when the current user has a pending join request for this group (request sent, not yet accepted/rejected). */
  hasPendingJoinRequest?: boolean;
};

export const ENTITY_TYPE = {
  TRAVELLER: "traveller",
  GROUP: "group",
} as const;

export const VIEW_MODE = {
  INDIVIDUAL: "individual",
  GROUP: "group",
} as const;

export type ViewMode = (typeof VIEW_MODE)[keyof typeof VIEW_MODE];

export type SelectedEntity =
  | { type: typeof ENTITY_TYPE.TRAVELLER; data: Traveller }
  | { type: typeof ENTITY_TYPE.GROUP; data: Group }
  | null;
