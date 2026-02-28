import { useCallback, useState } from "react";
import { useApi } from "./useApi";
import { API_ROUTES } from "@/lib/apiRoutes";

export type ProfileUser = {
  userID: string;
  username: string;
  FirstName?: string;
  LastName?: string;
  bio?: string;
  photoURL?: string | null;
  Phone?: string;
  DOB?: string;
  isFemale?: boolean;
};

export type PastTrip = {
  travellerDataId: string;
  date: string;
  flightArrival: string;
  flightDeparture: string;
  destination: string;
  terminal: string;
  flightNumber: string;
};

export type CurrentGroup = {
  groupId: string;
  name?: string;
  flightArrivalAirport?: string;
  memberCount: number;
};

export type ActiveTrip = {
  flightArrival: string;
  flightDeparture: string;
  destination: string;
  terminal: string;
  flightNumber: string;
};

export type ProfileByUsernameData = {
  ok: boolean;
  user: ProfileUser;
  isOwnProfile: boolean;
  pastTrips: PastTrip[];
  currentGroup: CurrentGroup | null;
  activeTrip: ActiveTrip | null;
};

export function useProfileByUsername(username: string | undefined) {
  const { sessionRequest } = useApi();
  const [data, setData] = useState<ProfileByUsernameData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!username) {
      setError("Username is required");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await sessionRequest<ProfileByUsernameData>(
        API_ROUTES.USER_PROFILE_BY_USERNAME(username),
      );
      setData(res);
      return res;
    } catch (e: any) {
      const message = e?.message ?? "Failed to load profile";
      setError(message);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [username, sessionRequest]);

  /** Update profile page user from "me" profile response (e.g. after photo upload) to avoid a second fetch. */
  const mergeMeProfileIntoData = useCallback(
    (meProfile: { user?: { photoURL?: string | null; FirstName?: string; LastName?: string; DOB?: string; isFemale?: boolean; Phone?: string } | null }) => {
      if (!meProfile?.user) return;
      setData((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                photoURL: meProfile.user?.photoURL ?? prev.user.photoURL,
                FirstName: meProfile.user?.FirstName ?? prev.user.FirstName,
                LastName: meProfile.user?.LastName ?? prev.user.LastName,
                DOB: meProfile.user?.DOB ?? prev.user.DOB,
                isFemale: meProfile.user?.isFemale ?? prev.user.isFemale,
                Phone: meProfile.user?.Phone ?? prev.user.Phone,
              },
            }
          : prev,
      );
    },
    [],
  );

  return { data, loading, error, fetchProfile, mergeMeProfileIntoData };
}
