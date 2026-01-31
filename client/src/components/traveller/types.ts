export type Traveller = {
  id: string
  name: string
  gender: "Male" | "Female" | "Other"
  destination: string
  airportName: string
  flightDateTime: Date
  flightDepartureTime?: Date | string
  terminal: string
  flightNumber: string
  distanceFromUserKm: number
  bio?: string
  tags?: string[]
  isVerified?: boolean
  username: string
}

export type Group = {
  id: string
  name: string
  gender: "Male" | "Female" | "Other"
  destination: string
  airportName: string
  flightDateTime: Date
  terminal: string
  flightNumber: string
  distanceFromUserKm: number
  groupSize: number
  maxUsers: number
  genderBreakdown: {
    male: number
    female: number
  }
}

export const ENTITY_TYPE = {
  TRAVELLER: 'traveller',
  GROUP: 'group',
} as const

export const VIEW_MODE = {
  INDIVIDUAL: 'individual',
  GROUP: 'group',
} as const

export type ViewMode = typeof VIEW_MODE[keyof typeof VIEW_MODE]

export type SelectedEntity =
  | { type: typeof ENTITY_TYPE.TRAVELLER; data: Traveller }
  | { type: typeof ENTITY_TYPE.GROUP; data: Group }
  | null
