import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle } from "lucide-react";
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi";
import { TravellerModal } from "@/components/traveller/traveller-modal";
import { GroupModal } from "@/components/traveller/group-modal";
import type { Group, Traveller } from "@/components/traveller/types";
import { ENTITY_TYPE } from "@/components/traveller/types";

const MODAL_LABELS = {
  DETAILS: "Details",
  VIEW_MORE_INFO: "View more information.",
} as const;

const ERROR_MESSAGES = {
  GENERIC: "Something went wrong. Please try again.",
  GROUP_NOT_FOUND: "Group not found. It may have been removed or is no longer active.",
  TRAVELLER_NOT_FOUND: "Traveller or listing not found. It may have been removed or is no longer active.",
} as const;

type EntityModalParams = {
  type: "group" | "traveller";
  airportCode: string;
  entityId: string;
  /** Optional airport name for display/fetch; falls back to airportCode. */
  airportName?: string;
};

type EntityModalContextValue = {
  openEntityModal: (params: EntityModalParams) => void;
  closeEntityModal: () => void;
};

const EntityModalContext = createContext<EntityModalContextValue | null>(null);

export function useEntityModal() {
  const ctx = useContext(EntityModalContext);
  if (!ctx) {
    throw new Error("useEntityModal must be used within EntityModalProvider");
  }
  return ctx;
}

type EntityModalProviderProps = { children: ReactNode };

export function EntityModalProvider({ children }: EntityModalProviderProps) {
  const [params, setParams] = useState<EntityModalParams | null>(null);
  const [entity, setEntity] = useState<Group | Traveller | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchGroupById,
    fetchTravellerByAirportAndUser,
    fetchTravellers,
    fetchUserDestination,
    revokeListing,
    revokeListingLoading,
  } = useGetTravellerApi();

  const openEntityModal = useCallback((p: EntityModalParams) => {
    setParams(p);
    setEntity(null);
    setError(null);
    setLoading(true);
    setUserContext({
      isUserInGroup: false,
      userGroupId: null,
      userDestination: null,
    });
  }, []);

  const closeEntityModal = useCallback(() => {
    setParams(null);
    setEntity(null);
    setError(null);
    setLoading(false);
  }, []);

  const airportName = params?.airportName ?? params?.airportCode ?? "";

  const fetchEntity = useCallback(async () => {
    if (!params) return;
    setLoading(true);
    setError(null);
    try {
      if (params.type === "group") {
        const group = await fetchGroupById(params.entityId, airportName);
        if (group) {
          setEntity(group);
        } else {
          setEntity(null);
          setError(ERROR_MESSAGES.GROUP_NOT_FOUND);
        }
      } else {
        const traveller = await fetchTravellerByAirportAndUser(
          params.airportCode,
          params.entityId,
          airportName,
        );
        if (traveller) {
          setEntity(traveller);
        } else {
          setEntity(null);
          setError(ERROR_MESSAGES.TRAVELLER_NOT_FOUND);
        }
      }
    } catch {
      setEntity(null);
      setError(ERROR_MESSAGES.GENERIC);
    } finally {
      setLoading(false);
    }
  }, [
    params,
    airportName,
    fetchGroupById,
    fetchTravellerByAirportAndUser,
  ]);

  useEffect(() => {
    if (params) void fetchEntity();
  }, [params?.type, params?.airportCode, params?.entityId, fetchEntity]);

  // User context for modal (isUserInGroup, userDestination) – fetch when modal opens so join/leave and "has listing" work
  const [userContext, setUserContext] = useState<{
    isUserInGroup: boolean;
    userGroupId: string | null;
    userDestination: string | null;
  }>({ isUserInGroup: false, userGroupId: null, userDestination: null });

  useEffect(() => {
    if (!params?.airportCode) return;

    const load = async () => {
      const [travellersResult, destination] = await Promise.all([
        fetchTravellers(params.airportCode),
        fetchUserDestination(params.airportCode),
      ]);
      setUserContext({
        isUserInGroup: travellersResult.isUserInGroup,
        userGroupId: travellersResult.userGroupId ?? null,
        userDestination: destination,
      });
    };

    void load();
  }, [params?.airportCode, fetchTravellers, fetchUserDestination]);

  const handleLeaveGroup = useCallback(async () => {
    closeEntityModal();
  }, [closeEntityModal]);

  const handleJoinRequestSuccess = useCallback(async () => {
    closeEntityModal();
  }, [closeEntityModal]);

  const handleConnectionResponded = useCallback(() => {
    closeEntityModal();
  }, [closeEntityModal]);

  const handleRevokeListing = useCallback(async () => {
    if (!params?.airportCode) return false;
    const result = await revokeListing(params.airportCode);
    if (result.ok) {
      closeEntityModal();
      return true;
    }
    return false;
  }, [params?.airportCode, revokeListing, closeEntityModal]);

  const isOpen = params !== null;

  return (
    <EntityModalContext.Provider value={{ openEntityModal, closeEntityModal }}>
      {children}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) closeEntityModal();
        }}
      >
        <DialogContent
          className="w-[95vw] max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl border-zinc-200 bg-white/95 backdrop-blur-xl p-0 shadow-2xl [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">{MODAL_LABELS.DETAILS}</DialogTitle>
          <DialogDescription className="sr-only">
            {MODAL_LABELS.VIEW_MORE_INFO}
          </DialogDescription>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircle className="h-6 w-6" />
              </span>
              <p className="mt-4 text-sm text-muted-foreground">{error}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchEntity()}
                >
                  Try again
                </Button>
                <Button variant="secondary" size="sm" onClick={closeEntityModal}>
                  Close
                </Button>
              </div>
            </div>
          ) : entity && params?.type === ENTITY_TYPE.TRAVELLER ? (
            <TravellerModal
              traveller={entity as Traveller}
              isUserInGroup={userContext.isUserInGroup}
              onConnectionResponded={handleConnectionResponded}
              onRevokeListing={
                (entity as Traveller).isOwnListing
                  ? () => void handleRevokeListing()
                  : undefined
              }
              isRevokingListing={revokeListingLoading}
              onFetchTravellerDetail={(userId) =>
                fetchTravellerByAirportAndUser(
                  params.airportCode,
                  userId,
                  airportName,
                )
              }
            />
          ) : entity && params?.type === "group" ? (
            <GroupModal
              group={entity as Group}
              isCurrentUserInGroup={
                userContext.userGroupId != null &&
                userContext.userGroupId === (entity as Group).id
              }
              hasListingAtThisAirport={!!userContext.userDestination}
              onLeaveGroup={handleLeaveGroup}
              onJoinRequestSuccess={handleJoinRequestSuccess}
              onGroupNameUpdated={() => {}}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </EntityModalContext.Provider>
  );
}
