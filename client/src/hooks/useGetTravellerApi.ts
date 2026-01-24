import { useCallback } from "react"
import type { Traveller, Group } from "@/components/traveller/types"

// Dummy data – this will eventually come from the backend
const dummyTravellers: Traveller[] = [
  {
    id: "t1",
    name: "Aarav Sharma",
    gender: "Male",
    destination: "Delhi (DEL)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 90 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 111",
    distanceFromUserKm: 12,
  },
  {
    id: "t2",
    name: "Sara Khan",
    gender: "Female",
    destination: "Mumbai (BOM)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 3 * 60 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 853",
    distanceFromUserKm: 25,
  },
  {
    id: "t3",
    name: "Rohan Mehta",
    gender: "Male",
    destination: "Bengaluru (BLR)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 45 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 185",
    distanceFromUserKm: 8,
  },
  {
    id: "t4",
    name: "Neha Verma",
    gender: "Female",
    destination: "Hyderabad (HYD)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
    terminal: "T3",
    flightNumber: "AI 443",
    distanceFromUserKm: 16,
  },
  {
    id: "t5",
    name: "Kabir Singh",
    gender: "Male",
    destination: "Chennai (MAA)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 4 * 60 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 485",
    distanceFromUserKm: 22,
  },
  {
    id: "t6",
    name: "Ananya Iyer",
    gender: "Female",
    destination: "Pune (PNQ)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 30 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 1706",
    distanceFromUserKm: 10,
  },
]

const dummyGroups: Group[] = [
  {
    id: "g1",
    name: "Friends Trip – Goa",
    gender: "Other",
    destination: "Goa (GOI)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 473",
    distanceFromUserKm: 18,
    groupSize: 4,
    maxUsers: 5,
    genderBreakdown: {
      male: 2,
      female: 2,
    },
  },
  {
    id: "g2",
    name: "Family Vacation – Singapore",
    gender: "Other",
    destination: "Singapore (SIN)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 5 * 60 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 111",
    distanceFromUserKm: 30,
    groupSize: 3,
    maxUsers: 4,
    genderBreakdown: {
      male: 1,
      female: 2,
    },
  },
  {
    id: "g3",
    name: "Office Offsite – Jaipur",
    gender: "Other",
    destination: "Jaipur (JAI)",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 75 * 60 * 1000),
    terminal: "T1",
    flightNumber: "AI 715",
    distanceFromUserKm: 14,
    groupSize: 6,
    maxUsers: 8,
    genderBreakdown: {
      male: 4,
      female: 2,
    },
  },
  {
    id: "g4",
    name: "College Reunion – Kochi",
    gender: "Other",
    destination: "Kochi (COK)",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 2.5 * 60 * 60 * 1000),
    terminal: "T2",
    flightNumber: "AI 485",
    distanceFromUserKm: 19,
    groupSize: 5,
    maxUsers: 6,
    genderBreakdown: {
      male: 3,
      female: 2,
    },
  },
]

export function useGetTravellerApi() {
  const fetchTravellers = useCallback(async (): Promise<Traveller[]> => {
    // TODO: Replace with actual API call
    // return sessionRequest<Traveller[]>(API_ROUTES.TRAVELLERS)
    await new Promise((resolve) => setTimeout(resolve, 800)) // Fake delay
    return dummyTravellers
  }, [])

  const fetchGroups = useCallback(async (): Promise<Group[]> => {
    // TODO: Replace with actual API call
    // return sessionRequest<Group[]>(API_ROUTES.GROUPS)
    await new Promise((resolve) => setTimeout(resolve, 600)) // Fake delay
    return dummyGroups
  }, [])

  return {
    fetchTravellers,
    fetchGroups,
  }
}
