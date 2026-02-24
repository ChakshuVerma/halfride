import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Plane,
  Users,
  Calendar,
  Phone,
  ChevronLeft,
  Loader2,
  ArrowRight,
  Sparkles,
  Compass,
  Luggage,
  Camera,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useProfileByUsername } from "@/hooks/useProfileByUsername";
import { useUserProfileApi } from "@/hooks/useUserProfileApi";
import { ROUTES } from "@/constants/routes";
import { useEntityModal } from "@/contexts/useEntityModal";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/date";
import { LoadingState } from "@/components/common/LoadingState";
import { ErrorState } from "@/components/common/ErrorState";

export default function ProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { openEntityModal } = useEntityModal();
  const { user, userProfile, setUserProfile } = useAuth();
  const { data, loading, error, fetchProfile } = useProfileByUsername(username);
  const { uploadProfilePhoto, fetchProfile: fetchMeProfile } = useUserProfileApi();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingPhoto(true);
    try {
      const res = await uploadProfilePhoto(file);
      if (res.ok && res.photoURL) {
        setUserProfile(userProfile ? { ...userProfile, photoURL: res.photoURL ?? undefined } : { photoURL: res.photoURL });
        await fetchMeProfile();
        await fetchProfile();
        toast.success("Photo updated");
      } else {
        toast.error(res.error ?? "Failed to upload photo");
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  useEffect(() => {
    if (username) fetchProfile();
  }, [username, fetchProfile]);

  if (loading && !data) {
    return <LoadingState message="Loading profile…" />;
  }

  if (error && !data) {
    const is404 =
      error.toLowerCase().includes("not found") ||
      error.toLowerCase().includes("404");
    return (
      <div className="w-full max-w-2xl mx-auto px-4 py-8 md:py-12">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(ROUTES.DASHBOARD)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Card className="border-border/80 overflow-hidden">
          <ErrorState
            icon={<User className="h-6 w-6 text-destructive/80" />}
            title={is404 ? "Profile not found" : "Something went wrong"}
            description={
              is404 ? "No user exists with this username." : error
            }
            primaryAction={{
              label: "Back to dashboard",
              onClick: () => navigate(ROUTES.DASHBOARD),
            }}
            className="p-8 md:p-10"
          />
        </Card>
      </div>
    );
  }

  if (!data?.user) return null;

  const profileUser = data.user;
  const isOwnProfile = data.isOwnProfile;
  const displayName =
    [profileUser.FirstName, profileUser.LastName].filter(Boolean).join(" ") ||
    profileUser.username;
  const initials = displayName
    .split(/\s+/)
    .map((s) => s.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasBasicInfo = isOwnProfile && (profileUser.DOB || profileUser.Phone);
  const tripCount = data.pastTrips.length;
  const uniqueDestinations = Array.from(
    new Set(
      data.pastTrips
        .map((t) => t.destination?.trim())
        .filter((d): d is string => Boolean(d)),
    ),
  );
  const hasNoActiveTrip = !data.currentGroup && !data.activeTrip;

  return (
    <div className="min-h-screen bg-background">
      {/* Cover + profile header */}
      <div className="relative border-b border-border/60 bg-gradient-to-b from-muted/50 to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--color-primary)/0.08),transparent]" />
        <div className="relative w-full max-w-3xl mx-auto px-4 pt-6 pb-8 md:pt-8 md:pb-10">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 left-4 md:left-0 text-muted-foreground hover:text-foreground hover:bg-background/80"
            onClick={() => navigate(ROUTES.DASHBOARD)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>

          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 pt-10 sm:pt-6">
            <div className="relative group">
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-3xl sm:text-4xl shadow-lg ring-4 ring-background overflow-hidden">
                {profileUser.photoURL ? (
                  <img
                    src={profileUser.photoURL}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              {isOwnProfile && (
                <>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70"
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
                  </button>
                </>
              )}
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0 pb-0.5">
              <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight truncate">
                {displayName}
              </h1>
              <p className="text-muted-foreground mt-1 font-medium">
                @{profileUser.username}
              </p>
              {profileUser.bio && (
                <p className="text-sm text-foreground/80 mt-3 max-w-md leading-relaxed">
                  {profileUser.bio}
                </p>
              )}
              {isOwnProfile && (
                <Badge variant="secondary" className="mt-3 gap-1">
                  <Sparkles className="h-3 w-3" />
                  Your profile
                </Badge>
              )}
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 mt-6 pt-6 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plane className="h-4 w-4" />
              </span>
              <span>
                <span className="font-semibold text-foreground">{tripCount}</span>{" "}
                trip{tripCount !== 1 ? "s" : ""} completed
              </span>
            </div>
            {uniqueDestinations.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>
                  <span className="font-semibold text-foreground">
                    {uniqueDestinations.length}
                  </span>{" "}
                  destination{uniqueDestinations.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* About / intro card — always show */}
          <Card className="border-border/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md md:col-span-2 bg-muted/20">
            <CardContent className="flex flex-row items-start gap-4 p-5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Compass className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold text-foreground">
                  {isOwnProfile ? "Your HalfRide profile" : "Traveller on HalfRide"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  {isOwnProfile
                    ? "Share this profile when matching with fellow travellers. Your trips and basic info help others connect with you."
                    : "Connect to split rides to and from the airport. View their current or past trips below."}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Basic info (own profile only) */}
          {hasBasicInfo && (
            <Card className="border-border/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </span>
                  Basic info
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <ul className="space-y-2.5">
                  {profileUser.DOB && (
                    <li className="flex items-center gap-3 text-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="text-foreground">
                        Born {formatShortDate(profileUser.DOB)}
                      </span>
                    </li>
                  )}
                  {profileUser.Phone && (
                    <li className="flex items-center gap-3 text-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/80">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                      </span>
                      <span className="text-foreground">{profileUser.Phone}</span>
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Current group */}
          {data.currentGroup && (
            <Card className="border-border/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="pb-2 px-5 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    Current group
                  </CardTitle>
                  <Badge variant="secondary" className="font-normal text-xs">
                    {data.currentGroup.memberCount} member
                    {data.currentGroup.memberCount !== 1 ? "s" : ""}
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  {data.currentGroup.name || "Unnamed group"}
                  {data.currentGroup.flightArrivalAirport &&
                    ` · ${data.currentGroup.flightArrivalAirport}`}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                {data.currentGroup.flightArrivalAirport && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      openEntityModal({
                        type: "group",
                        airportCode: data.currentGroup!.flightArrivalAirport!,
                        entityId: data.currentGroup!.groupId,
                      })
                    }
                  >
                    View group
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Active trip (no group) */}
          {!data.currentGroup && data.activeTrip && (
            <Card className="border-border/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Plane className="h-4 w-4" />
                  </span>
                  Current trip
                </CardTitle>
                <CardDescription className="mt-1">
                  {data.activeTrip.flightDeparture} →{" "}
                  {data.activeTrip.flightArrival}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0 space-y-2.5">
                <p className="flex items-center gap-2 text-sm text-foreground">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  {data.activeTrip.destination}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data.activeTrip.flightNumber} · Terminal{" "}
                  {data.activeTrip.terminal}
                </p>
                {data.activeTrip.flightArrival && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() =>
                      openEntityModal({
                        type: "traveller",
                        airportCode: data.activeTrip!.flightArrival,
                        entityId: profileUser.userID,
                      })
                    }
                  >
                    View listing
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* No active trip placeholder */}
          {hasNoActiveTrip && (
            <Card className="border-border/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-8 px-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-3">
                  <Luggage className="h-6 w-6" />
                </span>
                <h3 className="font-semibold text-foreground text-sm">
                  No active trip right now
                </h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  {isOwnProfile
                    ? "When you add a flight and look for travellers, your current trip will show here."
                    : "This traveller isn't on an active trip at the moment."}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Destinations visited — when we have past trips */}
          {uniqueDestinations.length > 0 && (
            <Card className="border-border/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md md:col-span-2">
              <CardHeader className="pb-2 px-5 pt-5">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  Destinations visited
                </CardTitle>
                <CardDescription className="mt-1">
                  {isOwnProfile
                    ? "Places you've travelled to with HalfRide."
                    : "Places they've travelled to with HalfRide."}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-5 pb-5 pt-0">
                <div className="flex flex-wrap gap-2">
                  {uniqueDestinations.slice(0, 12).map((dest) => (
                    <span
                      key={dest}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/40 px-3 py-1.5 text-sm text-foreground"
                    >
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      {dest}
                    </span>
                  ))}
                  {uniqueDestinations.length > 12 && (
                    <span className="inline-flex items-center rounded-full bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                      +{uniqueDestinations.length - 12} more
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Past trips — full width on grid */}
          <Card className="border-border/70 shadow-sm overflow-hidden transition-shadow hover:shadow-md md:col-span-2">
            <CardHeader className="pb-2 px-5 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Plane className="h-4 w-4" />
                  </span>
                  Past trips
                </CardTitle>
                {data.pastTrips.length > 0 && (
                  <Badge variant="outline" className="font-normal text-xs">
                    {data.pastTrips.length} trip
                    {data.pastTrips.length !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              <CardDescription className="mt-1">
                {data.pastTrips.length === 0
                  ? "Completed trips will appear here."
                  : "Your recent completed trips."}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5 pb-5 pt-0">
              {data.pastTrips.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 py-8 text-center">
                  <Plane className="h-9 w-9 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No completed trips yet.
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">
                    Finish a trip to see it here.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/60 rounded-lg border border-border/60 overflow-hidden">
                  {data.pastTrips.map((trip) => (
                    <li
                      key={trip.travellerDataId}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 bg-card transition-colors",
                        "hover:bg-muted/40",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground text-sm">
                          {trip.flightDeparture} → {trip.flightArrival}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5 truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          {trip.destination}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 sm:pl-4">
                        <span>{formatShortDate(trip.date)}</span>
                        <span className="font-medium text-foreground/70">
                          {trip.flightNumber}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Own profile actions */}
        {isOwnProfile && user && (
          <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-2">
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => navigate(ROUTES.DASHBOARD)}
            >
              Dashboard
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => navigate(ROUTES.AIRPORT)}
            >
              Find travellers
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
