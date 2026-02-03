import { useCallback, useState } from "react"
import { sessionRequest } from "@/lib/api"
import { API_ROUTES } from "@/lib/apiRoutes"
import type { Traveller, Group } from "@/components/traveller/types"

// Dummy data – this will eventually come from the backend
const dummyTravellers: Traveller[] = [
  {
    id: "t1",
    name: "Aarav Sharma",
    gender: "Male",
    username: "@aaravdev",
    destination: "Connaught Place, Delhi",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 90 * 60 * 1000),
    terminal: "t1",
    flightNumber: "AI 111",
    distanceFromUserKm: 12,
    bio: "Tech enthusiast loving the startup life.",
    tags: ["Tech", "Coffee", "Startups"],
    isVerified: true,
  },
  {
    id: "t2",
    name: "Sara Khan",
    gender: "Female",
    username: "@sara_designs",
    destination: "Juhu Beach, Mumbai",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 3 * 60 * 60 * 1000),
    terminal: "t1",
    flightNumber: "AI 853",
    distanceFromUserKm: 25,
    bio: "Fashion designer looking for travel buddies.",
    tags: ["Fashion", "Art", "Travel"],
    isVerified: true,
  },
  {
    id: "t3",
    name: "Rohan Mehta",
    gender: "Male",
    username: "@rohan_jams",
    destination: "Indiranagar, Bengaluru",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 45 * 60 * 1000),
    terminal: "t2",
    flightNumber: "AI 185",
    distanceFromUserKm: 8,
    bio: "Musician on tour. Let's jam?",
    tags: ["Music", "Guitar", "Concerts"],
    isVerified: false,
  },
  {
    id: "t4",
    name: "Neha Verma",
    gender: "Female",
    username: "@neha_eats",
    destination: "Banjara Hills, Hyderabad",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
    terminal: "t3",
    flightNumber: "AI 443",
    distanceFromUserKm: 16,
    bio: "Foodie exploring the best cuisines.",
    tags: ["Foodie", "Cooking", "Photography"],
    isVerified: true,
  },
  {
    id: "t5",
    name: "Kabir Singh",
    gender: "Male",
    username: "@kabir_fit",
    destination: "T. Nagar, Chennai",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 4 * 60 * 60 * 1000),
    terminal: "t2",
    flightNumber: "AI 485",
    distanceFromUserKm: 22,
    bio: "Fitness freak and extensive traveler.",
    tags: ["Fitness", "Gym", "Hiking"],
    isVerified: false,
  },
  {
    id: "t6",
    name: "Ananya Iyer",
    gender: "Female",
    username: "@ananya_reads",
    destination: "Koregaon Park, Pune",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 30 * 60 * 1000),
    terminal: "t1",
    flightNumber: "AI 1706",
    distanceFromUserKm: 10,
    bio: "Bookworm and nature lover.",
    tags: ["Books", "Nature", "Quiet"],
    isVerified: true,
  },
]

const dummyGroups: Group[] = [
  {
    id: "g1",
    name: "Friends Trip – Goa",
    gender: "Other",
    destination: "Calangute Beach, Goa",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 2 * 60 * 60 * 1000),
    terminal: "t1",
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
    destination: "Marina Bay, Singapore",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 5 * 60 * 60 * 1000),
    terminal: "t2",
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
    destination: "Hawa Mahal, Jaipur",
    airportName: "Indira Gandhi International Airport",
    flightDateTime: new Date(new Date().getTime() + 75 * 60 * 1000),
    terminal: "t1",
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
    destination: "Fort Kochi",
    airportName: "Kempegowda International Airport",
    flightDateTime: new Date(new Date().getTime() + 2.5 * 60 * 60 * 1000),
    terminal: "t2",
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
  const [loading, setLoading] = useState(false)

  const fetchTravellers = useCallback(async (airportCode?: string): Promise<Traveller[]> => {
    if (!airportCode) return []

    setLoading(true)
    try {
      const url = `${API_ROUTES.TRAVELLERS_BY_AIRPORT}/${airportCode}`
      const response = await sessionRequest<{ ok: boolean; data: Traveller[] }>(url)
      
      const data = response.data || []
      return data
    } catch (error) {
      console.error("Failed to fetch travellers:", error)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGroups = useCallback(async (airportName?: string): Promise<Group[]> => {
    setLoading(true)
    try {
      // TODO: Replace with actual API call
      // return sessionRequest<Group[]>(API_ROUTES.GROUPS, { params: { airportName } })
      await new Promise((resolve) => setTimeout(resolve, 600)) // Fake delay
      let data = dummyGroups
      if (airportName) {
        data = data.filter((g) => g.airportName === airportName)
      }
      return data
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchGroupMembers = useCallback(async (groupId: string, count?: number): Promise<Traveller[]> => {
    setLoading(true)
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 600)) // Fake delay
      // Return a subset of travellers as group members matching the requested count
      const requestedCount = count || Math.floor(Math.random() * 3) + 2
      
      // If we need more members than we have dummy data for, repeat the list
      const result: Traveller[] = []
      while (result.length < requestedCount) {
        const remaining = requestedCount - result.length
        const slice = dummyTravellers.slice(0, Math.min(remaining, dummyTravellers.length))
        
        // Deep clone to provide unique IDs for repeated items
        const clonedSlice = slice.map((t, idx) => ({
             ...t, 
             id: `${t.id}_${result.length + idx}` 
        }))
        
        result.push(...clonedSlice)
      }
      return result
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    fetchTravellers,
    fetchGroups,
    fetchGroupMembers,
    loading,
  }
}
