export type Traveller = {
  id: string
  name: string
  gender: "Male" | "Female" | "Other"
  destination: string
  airportName: string
  flightDateTime: Date
  terminal: string
  flightNumber: string
  distanceFromUserKm: number
  bio?: string
  tags?: string[]
  isVerified?: boolean
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

export type ViewMode = "individual" | "group"

export type SelectedEntity =
  | { type: "traveller"; data: Traveller }
  | { type: "group"; data: Group }
  | null
