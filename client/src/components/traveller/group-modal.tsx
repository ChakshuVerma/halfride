import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  UsersRound,
  User,
  Users,
  ArrowRight,
  Loader2,
  Check,
  X,
  UserPlus,
  Pencil,
  CheckCircle2,
} from "lucide-react";

import { DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi";
import type { Group, Traveller } from "./types";
import { formatShortDate } from "@/lib/date";
import { LoadingState } from "@/components/common/LoadingState";
import { useNavigate } from "react-router-dom";
import { getGroupChatPath } from "@/constants/routes";

type JoinRequestUser = {
  id: string;
  name: string;
  gender: string;
  photoURL?: string | null;
  destination: string;
  terminal: string;
  flightNumber: string;
};

const CONSTANTS = {
  LABELS: {
    CAPACITY: "Group Capacity",
    MIN_DISTANCE: "Min Dist",
    WAIT_TIME: "Wait Time",
    GENDER_DIST: "Gender Distribution",
    GROUP_OF: "Group of",
    FLIGHT_PREFIX: "Flight",
    SEPARATOR_DOT: " • ",
    JOIN: "Join Group",
    LEAVE_GROUP: "Leave Group",
    MEMBERS: "Members",
    NO_MEMBERS: "No members found",
    JOIN_REQUESTS: "Join requests",
    NO_JOIN_REQUESTS: "No pending join requests",
    ACCEPT: "Accept",
    REJECT: "Reject",
    REQUEST_SENT: "Request sent",
    USERS_Lower: "users",
    TERM: "Term",
    OF: "of",
    GROUP_FULL: "Group Full",
    NEED_LISTING_TO_JOIN:
      "Post your flight at this airport to join this group.",
    REQUEST_PENDING: "Join request pending",
    EDIT_NAME: "Edit name",
    SAVE: "Save",
    CANCEL: "Cancel",
    NAME_PLACEHOLDER: "Group name",
    NAME_RULES: "Letters and spaces only, max 50 characters",
    CHAR_COUNT: "characters",
  },
  UNITS: {
    KM_MIN: "km (min)",
  },
  LOGS: {
    LOAD_FAILED: "Failed to load members",
    JOIN_CLICKED: "Join Group clicked for",
  },
  GENDER: {
    MALE: "Male",
    FEMALE: "Female",
  },
  TOASTS: {
    NAME_UPDATED: "Group name updated",
    NAME_UPDATE_FAILED: "Failed to update name",
    LEFT_GROUP: "Left group",
    LEAVE_FAILED: "Failed to leave group",
    JOIN_REQUEST_SENT: "Join request sent",
    JOIN_REQUEST_FAILED: "Failed to send join request",
    REQUEST_ACCEPTED: "Request accepted",
    REQUEST_REJECTED: "Request rejected",
    RESPOND_FAILED: "Failed to respond to request",
  },
};

type GroupModalProps = {
  group: Group;
  /** True when the current user is a member of this group. */
  isCurrentUserInGroup?: boolean;
  /** True when the current user has an active listing at this group's airport. Join button is shown only when true. */
  hasListingAtThisAirport?: boolean;
  /** Called when user chooses to open chat from this modal. Use to close the modal or track navigation. */
  onOpenChat?: () => void;
  /** Called after user successfully leaves the group. Use to close modal and refetch list. */
  onLeaveGroup?: () => void;
  /** Called after user successfully sends a join request. Use to close modal and refetch list. */
  onJoinRequestSuccess?: () => void;
  /** Called after user successfully updates the group name. Use to refetch groups list. */
  onGroupNameUpdated?: () => void;
};

const GROUP_NAME_MAX_LENGTH = 50;
const GROUP_NAME_ALPHABETS_ONLY = /^[A-Za-z\s]*$/;

export function GroupModal({
  group,
  isCurrentUserInGroup: isCurrentUserInGroupProp = false,
  hasListingAtThisAirport = false,
  onOpenChat,
  onLeaveGroup,
  onJoinRequestSuccess,
  onGroupNameUpdated,
}: GroupModalProps) {
  const navigate = useNavigate();
  const {
    fetchGroupById,
    fetchGroupMembers,
    leaveGroup,
    requestJoinGroup,
    fetchGroupJoinRequests,
    respondToJoinRequest,
    updateGroupName,
    fetchGroupMembersLoading,
    fetchGroupJoinRequestsLoading,
    leaveGroupLoading,
    updateGroupNameLoading,
    requestJoinGroupLoading,
    respondToJoinRequestLoading,
  } = useGetTravellerApi();

  const [members, setMembers] = useState<Traveller[]>([]);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequestUser[]>([]);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState(group.name);
  const [nameUpdateError, setNameUpdateError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState(group.name);
  const [refreshedStatus, setRefreshedStatus] = useState<{
    hasPendingJoinRequest: boolean;
    isCurrentUserMember: boolean;
  } | null>(null);
  const [modalLoaded, setModalLoaded] = useState(false);

  const hasPendingJoinRequest =
    refreshedStatus?.hasPendingJoinRequest ?? group.hasPendingJoinRequest ?? false;
  const isCurrentUserInGroup =
    refreshedStatus?.isCurrentUserMember ?? isCurrentUserInGroupProp;

  const capacityPercentage = Math.round(
    (group.groupSize / group.maxUsers) * 100,
  );
  const isFull = group.groupSize >= group.maxUsers;

  const handleStartEditName = () => {
    setEditNameValue(displayName);
    setNameUpdateError(null);
    setEditingName(true);
  };

  const handleCancelEditName = () => {
    setEditingName(false);
    setEditNameValue(displayName);
    setNameUpdateError(null);
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (trimmed.length === 0) {
      setNameUpdateError("Group name cannot be empty");
      return;
    }
    if (trimmed.length > GROUP_NAME_MAX_LENGTH) {
      setNameUpdateError(`Max ${GROUP_NAME_MAX_LENGTH} characters`);
      return;
    }
    if (!GROUP_NAME_ALPHABETS_ONLY.test(trimmed)) {
      setNameUpdateError("Only letters and spaces allowed");
      return;
    }
    setNameUpdateError(null);
    const result = await updateGroupName(group.id, trimmed);

    if (result.ok) {
      setDisplayName(trimmed);
      setEditingName(false);
      onGroupNameUpdated?.();
      toast.success(CONSTANTS.TOASTS.NAME_UPDATED);
    } else {
      const msg = result.error ?? CONSTANTS.TOASTS.NAME_UPDATE_FAILED;
      setNameUpdateError(msg);
      toast.error(msg);
    }
  };

  const handleOpenChat = () => {
    onOpenChat?.();
    navigate(getGroupChatPath(group.id));
  };

  const handleEditNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") void handleSaveName();
    if (e.key === "Escape") handleCancelEditName();
  };

  // On modal open or when switching groups, load all data, then show UI
  useEffect(() => {
    let isCancelled = false;

    const loadModalData = async () => {
      setModalLoaded(false);
      try {
        const [latest, membersData] = await Promise.all([
          fetchGroupById(group.id, group.airportName),
          fetchGroupMembers(group.id),
        ]);

        if (isCancelled) return;

        setMembers(membersData);

        if (latest) {
          setRefreshedStatus({
            hasPendingJoinRequest: latest.hasPendingJoinRequest ?? false,
            isCurrentUserMember: latest.isCurrentUserMember ?? false,
          });

          if (latest.isCurrentUserMember ?? false) {
            try {
              const requests = await fetchGroupJoinRequests(group.id);
              if (!isCancelled) {
                setJoinRequests(requests);
              }
            } catch (err) {
              console.error("Failed to load join requests", err);
              if (!isCancelled) {
                setJoinRequests([]);
              }
            }
          } else {
            setJoinRequests([]);
          }
        } else {
          setRefreshedStatus(null);
          setJoinRequests([]);
        }
      } catch (err) {
        console.error("Failed to load group modal data", err);
        if (!isCancelled) {
          setMembers([]);
          setRefreshedStatus(null);
          setJoinRequests([]);
        }
      } finally {
        if (!isCancelled) {
          setModalLoaded(true);
        }
      }
    };

    void loadModalData();

    return () => {
      isCancelled = true;
    };
  }, [group.id, group.airportName, fetchGroupById, fetchGroupMembers, fetchGroupJoinRequests]);

  const renderGenderBar = (type: "Male" | "Female") => {
    const isMale = type === CONSTANTS.GENDER.MALE;
    const count = isMale
      ? group.genderBreakdown.male
      : group.genderBreakdown.female;

    const containerClass = isMale
      ? "rounded-l-lg border-l bg-muted/50 border-border"
      : "rounded-r-lg border-r bg-muted/50 border-border";

    const overlayClass = "bg-primary/5 group-hover:bg-primary/10";

    const textClass = "text-foreground";

    return (
      <div
        key={type}
        className={`h-8 flex items-center justify-center border-y relative group overflow-hidden ${containerClass}`}
        style={{ flex: Math.max(1, count) }}
      >
        <div className={`absolute inset-0 transition-colors ${overlayClass}`} />
        <span
          className={`relative z-10 text-xs font-bold flex items-center gap-1 ${textClass}`}
        >
          <User className="w-3 h-3" />
          {count}
        </span>
      </div>
    );
  };

  if (!modalLoaded) {
    return (
      <div className="p-4 sm:p-6 pr-12 sm:pr-14 min-w-0 max-w-full">
        <LoadingState
          message="Loading group…"
          className="min-h-[220px]"
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 pr-12 sm:pr-14 space-y-4 sm:space-y-5 min-w-0 max-w-full">
      {/* Header Section */}
      <DialogHeader className="space-y-0 pb-4 border-b border-border/10 min-w-0">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 min-w-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-muted to-muted/80 border border-border shadow-lg">
              <UsersRound
                className="w-5 h-5 sm:w-6 sm:h-6 text-primary"
                strokeWidth={1.5}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1 w-full">
            {isCurrentUserInGroup && editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) =>
                    setEditNameValue(
                      e.target.value.slice(0, GROUP_NAME_MAX_LENGTH),
                    )
                  }
                  onKeyDown={handleEditNameKeyDown}
                  placeholder={CONSTANTS.LABELS.NAME_PLACEHOLDER}
                  maxLength={GROUP_NAME_MAX_LENGTH}
                  className="w-full text-lg sm:text-xl font-bold tracking-tight bg-muted/30 border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                  disabled={updateGroupNameLoading}
                />
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <p className="text-[10px] text-muted-foreground">
                    {CONSTANTS.LABELS.NAME_RULES}
                  </p>
                  <p
                    className={`text-[10px] font-medium shrink-0 ${
                      editNameValue.length >= GROUP_NAME_MAX_LENGTH
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}
                  >
                    {editNameValue.length}/{GROUP_NAME_MAX_LENGTH}{" "}
                    {CONSTANTS.LABELS.CHAR_COUNT}
                  </p>
                </div>
                {nameUpdateError && (
                  <p className="text-xs text-destructive font-medium">
                    {nameUpdateError}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={updateGroupNameLoading}
                    onClick={handleSaveName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                  >
                    {updateGroupNameLoading && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    )}
                    {CONSTANTS.LABELS.SAVE}
                  </button>
                  <button
                    type="button"
                    disabled={updateGroupNameLoading}
                    onClick={handleCancelEditName}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-muted/30 text-sm font-medium hover:bg-muted/50"
                  >
                    {CONSTANTS.LABELS.CANCEL}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                  <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-foreground/90 truncate min-w-0">
                    {displayName}
                  </DialogTitle>
                  {isCurrentUserInGroup && (
                    <button
                      type="button"
                      onClick={handleStartEditName}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                      title={CONSTANTS.LABELS.EDIT_NAME}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <DialogDescription className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground/80 font-medium">
                  <span className="inline-flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-md border border-border/40 shrink-0">
                    <Users className="w-3 h-3 shrink-0" />
                    {group.groupSize} {CONSTANTS.LABELS.USERS_Lower}
                  </span>
                  <span className="text-muted-foreground/40 shrink-0">•</span>
                  <span className="truncate min-w-0">
                    Created {formatShortDate(group.createdAt)}
                  </span>
                </DialogDescription>
              </>
            )}
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-4">
        {/* Capacity Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
              {CONSTANTS.LABELS.CAPACITY}
            </span>
            <span className="text-xs font-semibold text-foreground">
              {group.groupSize}{" "}
              <span className="text-muted-foreground font-normal">
                {CONSTANTS.LABELS.OF}
              </span>{" "}
              {group.maxUsers}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted/30 overflow-hidden shadow-inner ring-1 ring-border/10">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${
                isFull
                  ? "bg-destructive"
                  : "bg-gradient-to-r from-primary via-primary/90 to-primary/80"
              }`}
              style={{ width: `${Math.min(100, capacityPercentage)}%` }}
            />
          </div>
        </div>

        {/* Gender Distribution */}
        <div className="rounded-xl bg-muted/5 border border-border/10 p-2.5 sm:p-3 space-y-2 sm:space-y-2.5 min-w-0 overflow-hidden">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">
            {CONSTANTS.LABELS.GENDER_DIST}
          </span>
          <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
            {renderGenderBar("Male")}
            {renderGenderBar("Female")}
          </div>
        </div>

        {/* Group Members List */}
        <div className="space-y-2 sm:space-y-2.5 pt-2 border-t border-border/10 min-w-0">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">
            {CONSTANTS.LABELS.MEMBERS} ({members.length})
          </span>
          <div className="relative">
            <div className="space-y-2 max-h-[120px] sm:max-h-[160px] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {fetchGroupMembersLoading ? (
                <div className="flex items-center justify-center py-6 text-primary/80">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : members.length > 0 ? (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 sm:gap-3 p-2 rounded-xl hover:bg-muted/10 transition-colors border border-transparent hover:border-border/5 min-w-0"
                  >
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 border shadow-sm overflow-hidden ${
                        !member.photoURL &&
                        "bg-muted border-border text-foreground"
                      }`}
                    >
                      {member.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                        {member.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <span className="bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/20 text-foreground/80 shrink-0">
                          {member.flightNumber}
                        </span>
                        <span className="shrink-0">•</span>
                        <span className="whitespace-nowrap">
                          {member.destination}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2 text-center">
                  {CONSTANTS.LABELS.NO_MEMBERS}
                </p>
              )}
            </div>
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent rounded-b"
              aria-hidden
            />
          </div>
        </div>

        {/* Join Requests */}
        {isCurrentUserInGroup && joinRequests.length > 0 && (
          <div className="space-y-2 sm:space-y-2.5 pt-2 border-t border-border/10 min-w-0">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              {CONSTANTS.LABELS.JOIN_REQUESTS} ({joinRequests.length})
            </span>
            <div className="relative">
              <div className="space-y-2 max-h-[140px] overflow-y-auto overflow-x-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {fetchGroupJoinRequestsLoading ? (
                  <div className="flex items-center justify-center py-4 text-primary/80">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                ) : joinRequests.length > 0 ? (
                  joinRequests.map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center gap-2 sm:gap-3 p-2 rounded-xl border border-border/10 bg-muted/5 min-w-0"
                    >
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 border shadow-sm overflow-hidden ${
                          !req.photoURL &&
                          "bg-muted border-border text-foreground"
                        }`}
                      >
                        {req.photoURL ? (
                          <img
                            src={req.photoURL}
                            alt={req.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-xs sm:text-sm font-semibold text-foreground truncate">
                          {req.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          <span className="bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/20 shrink-0">
                            {req.flightNumber}
                          </span>
                          <span className="shrink-0">•</span>
                          <span className="whitespace-nowrap truncate">
                            {req.destination}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={
                            respondToJoinRequestLoading ||
                            respondingId === req.id
                          }
                          className="p-2 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20 transition-colors disabled:opacity-50"
                          title={CONSTANTS.LABELS.ACCEPT}
                          onClick={async () => {
                            setRespondingId(req.id);
                            const result = await respondToJoinRequest(
                              group.id,
                              req.id,
                              "accept",
                            );
                            setRespondingId(null);
                            if (result.ok) {
                              setJoinRequests((prev) =>
                                prev.filter((r) => r.id !== req.id),
                              );
                              const freshMembers = await fetchGroupMembers(
                                group.id,
                              );
                              setMembers(freshMembers);
                              toast.success(CONSTANTS.TOASTS.REQUEST_ACCEPTED);
                            } else {
                              toast.error(
                                result.error ?? CONSTANTS.TOASTS.RESPOND_FAILED,
                              );
                            }
                          }}
                        >
                          {respondingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={
                            respondToJoinRequestLoading ||
                            respondingId === req.id
                          }
                          className="p-2 rounded-lg bg-destructive/15 text-destructive hover:bg-destructive/25 border border-destructive/20 transition-colors disabled:opacity-50"
                          title={CONSTANTS.LABELS.REJECT}
                          onClick={async () => {
                            setRespondingId(req.id);
                            const result = await respondToJoinRequest(
                              group.id,
                              req.id,
                              "reject",
                            );
                            setRespondingId(null);
                            if (result.ok) {
                              setJoinRequests((prev) =>
                                prev.filter((r) => r.id !== req.id),
                              );
                              toast.success(CONSTANTS.TOASTS.REQUEST_REJECTED);
                            } else {
                              toast.error(
                                result.error ?? CONSTANTS.TOASTS.RESPOND_FAILED,
                              );
                            }
                          }}
                        >
                          {respondingId === req.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-2 text-center">
                    {CONSTANTS.LABELS.NO_JOIN_REQUESTS}
                  </p>
                )}
              </div>
              <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent rounded-b"
                aria-hidden
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-1 space-y-2 min-w-0">
          {(leaveError || joinError) && (
            <p className="text-xs sm:text-sm text-destructive font-medium break-words">
              {leaveError ?? joinError}
            </p>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            {isCurrentUserInGroup && (
              <>
                <button
                  type="button"
                  className="flex-1 min-w-0 rounded-xl px-4 py-2.5 sm:py-2.5 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 active:bg-primary/95 transition-colors"
                  onClick={handleOpenChat}
                >
                  Open chat
                </button>
                <button
                  type="button"
                  className="flex-1 min-w-0 rounded-xl px-4 py-2.5 sm:py-2.5 text-sm font-bold text-primary-foreground bg-primary hover:bg-primary/90 active:bg-primary/80 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  disabled={leaveGroupLoading}
                  onClick={() => setShowLeaveConfirm(true)}
                >
                  {leaveGroupLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                  ) : (
                    CONSTANTS.LABELS.LEAVE_GROUP
                  )}
                </button>
                <ConfirmDialog
                  open={showLeaveConfirm}
                  onOpenChange={setShowLeaveConfirm}
                  title="Leave group?"
                  description="Are you sure you want to leave this group? Other members will be notified."
                  confirmLabel="Leave group"
                  variant="secondary"
                  onConfirm={async () => {
                    setLeaveError(null);
                    const result = await leaveGroup(group.id);
                    if (result.ok) {
                      onLeaveGroup?.();
                      toast.success(CONSTANTS.TOASTS.LEFT_GROUP);
                    } else {
                      const msg = result.error ?? CONSTANTS.TOASTS.LEAVE_FAILED;
                      setLeaveError(msg);
                      toast.error(msg);
                    }
                  }}
                />
              </>
            )}
            {!isCurrentUserInGroup && (
              <>
                {hasPendingJoinRequest ? (
                  <div
                    className="flex-1 min-w-0 w-full h-12 rounded-xl bg-primary text-primary-foreground text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl cursor-not-allowed opacity-80"
                    aria-live="polite"
                  >
                    {CONSTANTS.LABELS.REQUEST_PENDING}{" "}
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                ) : hasListingAtThisAirport ? (
                  <button
                    disabled={isFull || requestJoinGroupLoading}
                    className={`flex-1 min-w-0 group relative overflow-hidden rounded-xl px-4 py-2.5 transition-all ${
                      isFull
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99]"
                    }`}
                    onClick={async () => {
                      setJoinError(null);
                      const result = await requestJoinGroup(group.id);
                      if (result.ok) {
                        setRefreshedStatus((prev) => ({
                          ...prev,
                          hasPendingJoinRequest: true,
                          isCurrentUserMember: prev?.isCurrentUserMember ?? false,
                        }));
                        onJoinRequestSuccess?.();
                        toast.success(CONSTANTS.TOASTS.JOIN_REQUEST_SENT);
                      } else {
                        const msg =
                          result.error ?? CONSTANTS.TOASTS.JOIN_REQUEST_FAILED;
                        setJoinError(msg);
                        toast.error(msg);
                      }
                    }}
                  >
                    {!isFull && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    )}
                    <span className="relative flex items-center justify-center gap-2 font-bold text-sm tracking-wide">
                      {requestJoinGroupLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isFull ? (
                        CONSTANTS.LABELS.GROUP_FULL
                      ) : (
                        <>
                          {CONSTANTS.LABELS.JOIN}
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </span>
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-2 px-4 flex-1">
                    {CONSTANTS.LABELS.NEED_LISTING_TO_JOIN}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
