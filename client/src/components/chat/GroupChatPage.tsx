import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Users, X, Calendar, MapPin, Plane, ChevronRight, Info, User, CheckCircle2 } from "lucide-react";
import { useGroupChat } from "@/hooks/useGroupChat";
import { useAuth } from "@/contexts/AuthContext";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { Spinner } from "@/components/ui/spinner";
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi";
import type { Traveller, Group } from "@/components/traveller/types";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getAirportPath, ROUTES } from "@/constants/routes";
import { formatShortDate } from "@/lib/date";
import { useEntityModal } from "@/contexts/useEntityModal";
import { cn } from "@/lib/utils";

type GroupSidebarProps = {
  group: Group | null;
  members: Traveller[];
  groupLoading: boolean;
  groupError: string | null;
  leaveGroupLoading: boolean;
  /** Called when user clicks "Leave group" – typically opens a confirm dialog. */
  onLeaveGroup: () => void;
  /** When provided, clicking a member opens their profile (traveller modal with flight ETA). */
  onMemberClick?: (member: Traveller) => void;
  /** Called when user verifies at terminal. */
  onVerifyAtTerminal?: () => Promise<void>;
  verifyAtTerminalLoading?: boolean;
  currentUserReadyToOnboard?: boolean;
};

function GroupSidebar({
  group,
  members,
  groupLoading,
  groupError,
  leaveGroupLoading,
  onLeaveGroup,
  onMemberClick,
  onVerifyAtTerminal,
  verifyAtTerminalLoading = false,
  currentUserReadyToOnboard = false,
}: GroupSidebarProps) {
  return (
    <>
      {/* Group info header */}
      <div className="px-4 py-4 border-b border-border/60 bg-linear-to-br from-muted/30 via-background to-muted/20">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Users className="h-5 w-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold leading-tight truncate text-foreground">
              {group?.name ?? "Group"}
            </h2>
            {(group?.airportName || group?.airportCode) && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-2.5 py-1.5 shadow-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-[11px] font-medium text-foreground">
                  {group.airportName ?? group.airportCode}
                </span>
              </div>
            )}
            {group?.createdAt != null && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-border/50 bg-background/80 px-2.5 py-1.5 shadow-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <span className="block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Created
                  </span>
                  <span className="block truncate text-[11px] font-medium text-foreground">
                    {formatShortDate(group.createdAt)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        {group && (
          <div className="mt-3 space-y-2.5">
            {/* Capacity */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  Capacity
                </span>
                <span className="text-[11px] font-semibold text-foreground">
                  {group.groupSize}{" "}
                  <span className="text-muted-foreground font-normal">of</span>{" "}
                  {group.maxUsers}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted/30 overflow-hidden ring-1 ring-border/10">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    group.groupSize >= group.maxUsers
                      ? "bg-destructive"
                      : "bg-linear-to-r from-primary via-primary/90 to-primary/80"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round((group.groupSize / group.maxUsers) * 100),
                    )}%`,
                  }}
                />
              </div>
            </div>
            {/* Gender distribution */}
            <div className="rounded-lg bg-muted/5 border border-border/10 p-2 space-y-1.5">
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">
                Gender
              </span>
              <div className="flex items-center gap-0.5 min-w-0 rounded-md overflow-hidden">
                <div
                  className="h-7 flex items-center justify-center gap-1 rounded-l-md border border-r-0 border-border bg-muted/50 px-2 min-w-0"
                  style={{
                    flex: Math.max(1, group.genderBreakdown.male),
                  }}
                >
                  <User className="h-3 w-3 shrink-0 text-foreground" />
                  <span className="text-[11px] font-bold text-foreground truncate">
                    {group.genderBreakdown.male}
                  </span>
                </div>
                <div
                  className="h-7 flex items-center justify-center gap-1 rounded-r-md border border-border bg-muted/50 px-2 min-w-0"
                  style={{
                    flex: Math.max(1, group.genderBreakdown.female),
                  }}
                >
                  <User className="h-3 w-3 shrink-0 text-foreground" />
                  <span className="text-[11px] font-bold text-foreground truncate">
                    {group.genderBreakdown.female}
                  </span>
                </div>
              </div>
            </div>
            <span className="inline-flex items-center rounded-lg bg-background/90 border border-border/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground shadow-sm">
              {group.destinations.length} destinations
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-2">
        {groupLoading && (
          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Spinner className="h-4 w-4 text-primary" />
            <span>Loading group details…</span>
          </div>
        )}

        {!groupLoading && groupError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
            {groupError}
          </div>
        )}

        {!groupLoading && !groupError && members.length > 0 && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80 px-1 pb-1">
            Members
          </p>
        )}

        {!groupLoading &&
          !groupError &&
          members.map((member) => {
            const isClickable = !!onMemberClick;
            const Wrapper = isClickable ? "button" : "div";
            return (
              <Wrapper
                key={member.id}
                type={isClickable ? "button" : undefined}
                onClick={isClickable ? () => onMemberClick(member) : undefined}
                className={cn(
                  "w-full flex items-start gap-2 rounded-xl border border-border/60 bg-background/80 px-2.5 py-2.5 text-left text-[11px] transition-colors",
                  isClickable &&
                    "cursor-pointer hover:bg-muted/50 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                )}
              >
                {member.photoURL ? (
                  <img
                    src={member.photoURL}
                    alt={member.name}
                    className="h-8 w-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1 justify-between">
                    <span className="font-semibold truncate text-foreground">{member.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {member.readyToOnboard && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400 px-1.5 py-0.5 text-[9px] font-medium">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Ready
                        </span>
                      )}
                      {isClickable && (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  {member.username && (
                    <span className="text-[10px] text-muted-foreground truncate block">
                      @{member.username}
                    </span>
                  )}
                  <div className="text-[10px] text-muted-foreground">
                    <div className="truncate">
                      <span className="font-medium text-foreground/90">{member.destination}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-muted/60 px-1.5 py-0.5">
                        <Plane className="h-2.5 w-2.5" />
                        T{member.terminal} · {member.flightNumber}
                      </span>
                    </div>
                  </div>
                </div>
              </Wrapper>
            );
          })}

        {!groupLoading && !groupError && members.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center mt-6">
            No members to show yet.
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border/60 mt-auto bg-background/95 space-y-2">
        {group && group.isCurrentUserMember && onVerifyAtTerminal && (
          currentUserReadyToOnboard ? (
            <div className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-[11px] font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Ready to onboard
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-[11px] gap-2"
              onClick={onVerifyAtTerminal}
              disabled={verifyAtTerminalLoading}
            >
              {verifyAtTerminalLoading ? "Verifying…" : "Verify I'm at terminal"}
            </Button>
          )
        )}
        {group && group.isCurrentUserMember && (
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-[11px]"
            onClick={onLeaveGroup}
            disabled={leaveGroupLoading}
          >
            {leaveGroupLoading ? "Leaving group…" : "Leave group"}
          </Button>
        )}
        {group && group.isCurrentUserMember === false && (
          <p className="mt-1 text-[10px] text-muted-foreground text-center">
            You are not a member of this group.
          </p>
        )}
      </div>
    </>
  );
}

export function GroupChatPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openEntityModal } = useEntityModal();
  const {
    fetchGroupById,
    fetchGroupMembers,
    leaveGroup,
    verifyAtTerminal,
    leaveGroupLoading,
    verifyAtTerminalLoading,
  } = useGetTravellerApi();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Traveller[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const handleMemberClick = (member: Traveller) => {
    const airportCode = group?.airportCode;
    if (!airportCode) return;
    openEntityModal({
      type: "traveller",
      airportCode,
      entityId: member.id,
      airportName: group?.airportName,
      viewOnly: true,
    });
    setIsGroupModalOpen(false);
  };

  const {
    messages,
    loading,
    error,
    hasMore,
    loadingMore,
    loadMore,
    sendMessage,
  } = useGroupChat(groupId, { pageSize: 50 });

  useEffect(() => {
    if (!groupId) {
      setGroup(null);
      setMembers([]);
      setGroupError(null);
      return;
    }

    let cancelled = false;
    const loadGroupData = async () => {
      setGroupLoading(true);
      setGroupError(null);
      try {
        const [groupData, memberData] = await Promise.all([
          fetchGroupById(groupId),
          fetchGroupMembers(groupId),
        ]);
        if (cancelled) return;
        if (groupData == null) {
          navigate(ROUTES.NOT_FOUND, {
            replace: true,
            state: {
              title: "Group not found",
              message:
                "This group doesn't exist or you don't have access to it.",
            },
          });
          return;
        }
        setGroup(groupData);
        setMembers(memberData);
      } catch (err) {
        console.error("Failed to load group sidebar data", err);
        if (!cancelled) {
          navigate(ROUTES.NOT_FOUND, {
            replace: true,
            state: {
              title: "Group not found",
              message: "We couldn't load this group. It may have been removed.",
            },
          });
        }
      } finally {
        if (!cancelled) {
          setGroupLoading(false);
        }
      }
    };

    void loadGroupData();

    return () => {
      cancelled = true;
    };
  }, [groupId, fetchGroupById, fetchGroupMembers, navigate]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleOpenLeaveConfirm = () => {
    setShowLeaveConfirm(true);
  };

  const currentUserReadyToOnboard =
    members.find((m) => m.id === user?.uid)?.readyToOnboard ?? false;

  const handleVerifyAtTerminal = useCallback(async () => {
    if (!groupId || verifyAtTerminalLoading) return;
    if (!navigator.geolocation) {
      toast.error("Location access is not available");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const result = await verifyAtTerminal(groupId, latitude, longitude);
        if (result.ok) {
          toast.success("You're marked as ready to onboard");
          const memberData = await fetchGroupMembers(groupId);
          setMembers(memberData);
        } else {
          toast.error(result.error ?? "Failed to verify");
        }
      },
      () => {
        toast.error("Location access denied or unavailable");
      },
      { enableHighAccuracy: true },
    );
  }, [groupId, verifyAtTerminal, verifyAtTerminalLoading, fetchGroupMembers]);

  const handleConfirmLeaveGroup = async () => {
    if (!groupId || !group) return;

    const result = await leaveGroup(groupId);
    if (!result.ok) {
      setGroupError(result.error ?? "Failed to leave group");
      setShowLeaveConfirm(false);
      return;
    }

    const airportCode = group.airportCode;
    if (airportCode) {
      navigate(getAirportPath(airportCode));
    } else {
      navigate(-1);
    }
  };

  const title = "Group chat";
  const subtitle = groupId ? `Group ID: ${groupId}` : undefined;

  const isNotMember = group != null && group.isCurrentUserMember === false;
  const composerDisabled = !groupId || !user || groupLoading || isNotMember;

  let composerHint: string | undefined;
  if (!groupId) {
    composerHint = "Invalid group. Please go back and try again.";
  } else if (!user) {
    composerHint = "You must be logged in to send messages.";
  } else if (groupLoading) {
    composerHint = "Checking your membership in this group…";
  } else if (isNotMember) {
    composerHint = "You must be a member of this group to send messages.";
  }

  // Don't show chat UI until we've confirmed the group exists (avoids flash before redirect to not-found)
  if (groupId && group == null) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-linear-to-b from-background via-background to-muted/60 px-4 py-8">
        <Spinner className="h-8 w-8 text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading group…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] justify-center bg-linear-to-b from-background via-background to-muted/60 px-2 sm:px-4 py-2 sm:py-4">
      <div className="flex w-full max-w-5xl h-[80vh] rounded-3xl border border-border/60 bg-background/95 shadow-xl overflow-hidden flex-col md:flex-row">
        {/* Left sidebar: group info & members (desktop and up) */}
        <aside className="hidden md:flex md:w-80 lg:w-96 border-r border-border/60 bg-muted/10 flex-col">
          <GroupSidebar
            group={group}
            members={members}
            groupLoading={groupLoading}
            groupError={groupError}
            leaveGroupLoading={leaveGroupLoading}
            onLeaveGroup={handleOpenLeaveConfirm}
            onMemberClick={group?.airportCode ? handleMemberClick : undefined}
            onVerifyAtTerminal={handleVerifyAtTerminal}
            verifyAtTerminalLoading={verifyAtTerminalLoading}
            currentUserReadyToOnboard={currentUserReadyToOnboard}
          />
        </aside>

        <ConfirmDialog
          open={showLeaveConfirm}
          onOpenChange={setShowLeaveConfirm}
          title="Leave group?"
          description="Are you sure you want to leave this group? You will no longer receive messages from this group."
          confirmLabel="Leave group"
          cancelLabel="Cancel"
          variant="destructive"
          onConfirm={handleConfirmLeaveGroup}
          isLoading={leaveGroupLoading}
        />

        {/* Right panel: chat header, messages & composer */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {/* Header */}
          <header className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-linear-to-r from-background to-muted/40">
            <button
              type="button"
              onClick={handleBack}
              className="p-2 rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-col min-w-0">
              <span className="text-sm sm:text-base font-semibold leading-snug truncate">
                {title}
              </span>
              {subtitle && (
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {subtitle}
                </span>
              )}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                className="inline-flex md:hidden items-center justify-center rounded-full border border-border/60 bg-muted/60 p-1.5 text-muted-foreground hover:bg-muted"
                onClick={() => setIsGroupModalOpen(true)}
                aria-label="Show group info"
              >
                <Info className="h-4 w-4" />
              </button>
              <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[10px] font-medium">
                Active
              </span>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 flex flex-col min-h-0">
            {loading && (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-xs text-muted-foreground">
                <Spinner className="h-5 w-5 text-primary" />
                <span>Loading chat…</span>
              </div>
            )}
            {!loading && error && (
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="w-full rounded-2xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  <div className="font-semibold mb-1">Unable to load chat</div>
                  <div className="text-[11px] opacity-90">{error}</div>
                </div>
              </div>
            )}
            {!loading && !error && (
              <MessageList
                messages={messages}
                currentUserId={user?.uid ?? null}
                onLoadMore={hasMore ? loadMore : undefined}
                hasMore={hasMore && !loadingMore}
                scrollKey={groupId ?? undefined}
              />
            )}
          </main>

          {/* Composer */}
          <MessageComposer
            onSend={async (text) => {
              await sendMessage(text);
            }}
            disabled={composerDisabled}
            disabledHint={composerHint}
          />
        </div>
      </div>

      {/* Mobile group info modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-auto rounded-t-3xl bg-background border border-border/60 shadow-xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="text-sm font-semibold">Group info</span>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-full p-1 hover:bg-muted"
                onClick={() => setIsGroupModalOpen(false)}
                aria-label="Close group info"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <GroupSidebar
              group={group}
              members={members}
              groupLoading={groupLoading}
              groupError={groupError}
              leaveGroupLoading={leaveGroupLoading}
              onLeaveGroup={handleOpenLeaveConfirm}
              onMemberClick={group?.airportCode ? handleMemberClick : undefined}
              onVerifyAtTerminal={handleVerifyAtTerminal}
              verifyAtTerminalLoading={verifyAtTerminalLoading}
              currentUserReadyToOnboard={currentUserReadyToOnboard}
            />
          </div>
        </div>
      )}
    </div>
  );
}

