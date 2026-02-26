import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Users, X } from "lucide-react";
import { useGroupChat } from "@/hooks/useGroupChat";
import { useAuth } from "@/contexts/AuthContext";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { Spinner } from "@/components/ui/spinner";
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi";
import type { Traveller, Group } from "@/components/traveller/types";
import { Button } from "@/components/ui/button";
import { getAirportPath } from "@/constants/routes";

type GroupSidebarProps = {
  group: Group | null;
  members: Traveller[];
  groupLoading: boolean;
  groupError: string | null;
  leaveGroupLoading: boolean;
  onLeaveGroup: () => void;
};

function GroupSidebar({
  group,
  members,
  groupLoading,
  groupError,
  leaveGroupLoading,
  onLeaveGroup,
}: GroupSidebarProps) {
  return (
    <>
      <div className="px-4 py-3 border-b border-border/60 bg-linear-to-r from-background to-muted/40">
        <div className="text-sm font-semibold leading-snug truncate">
          {group?.name ?? "Group"}
        </div>
        {(group?.airportName || group?.airportCode) && (
          <div className="mt-0.5 text-[11px] text-muted-foreground truncate">
            {group.airportName ?? group.airportCode}
          </div>
        )}
        {group && (
          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-background/80 border border-border/60 px-2 py-0.5">
              {group.groupSize}/{group.maxUsers} members
            </span>
            <span className="inline-flex items-center rounded-full bg-background/80 border border-border/60 px-2 py-0.5">
              {group.genderBreakdown.male}M / {group.genderBreakdown.female}F
            </span>
            <span className="inline-flex items-center rounded-full bg-background/80 border border-border/60 px-2 py-0.5">
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

        {!groupLoading && !groupError && members.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center mt-6">
            No members to show yet.
          </div>
        )}

        {!groupLoading &&
          !groupError &&
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-start gap-2 rounded-xl border border-border/60 bg-background/80 px-2.5 py-2 text-[11px]"
            >
              {member.photoURL ? (
                <img
                  src={member.photoURL}
                  alt={member.name}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                  {member.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-1 justify-between">
                  <span className="font-medium truncate">{member.name}</span>
                  {member.username && (
                    <span className="text-[10px] text-muted-foreground truncate">
                      @{member.username}
                    </span>
                  )}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  <div className="truncate">
                    Destination:{" "}
                    <span className="font-medium">{member.destination}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    <span className="inline-flex items-center rounded-full bg-muted/60 px-1.5 py-0.5">
                      T{member.terminal}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-muted/60 px-1.5 py-0.5">
                      {member.flightNumber}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>

      <div className="px-4 py-3 border-t border-border/60 mt-auto bg-background/95">
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
  const {
    fetchGroupById,
    fetchGroupMembers,
    leaveGroup,
    leaveGroupLoading,
  } = useGetTravellerApi();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Traveller[]>([]);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

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
        setGroup(groupData);
        setMembers(memberData);
      } catch (err) {
        console.error("Failed to load group sidebar data", err);
        if (!cancelled) {
          setGroupError("Unable to load group details");
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
  }, [groupId, fetchGroupById, fetchGroupMembers]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleLeaveGroup = async () => {
    if (!groupId || !group) return;
    const confirmed = window.confirm(
      "Are you sure you want to leave this group?",
    );
    if (!confirmed) return;

    const result = await leaveGroup(groupId);
    if (!result.ok) {
      setGroupError(result.error ?? "Failed to leave group");
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
            onLeaveGroup={handleLeaveGroup}
          />
        </aside>

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
                className="inline-flex md:hidden items-center justify-center rounded-full border border-border/60 bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                onClick={() => setIsGroupModalOpen(true)}
                aria-label="Show group info"
              >
                <Users className="h-3 w-3 mr-1" />
                Info
              </button>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium">
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
              onLeaveGroup={handleLeaveGroup}
            />
          </div>
        </div>
      )}
    </div>
  );
}

