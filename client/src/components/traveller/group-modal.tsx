import { useEffect, useState } from "react";
import { DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  UsersRound,
  User,
  MapPin,
  Users,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useGetTravellerApi } from "@/hooks/useGetTravellerApi";
import type { Group, Traveller } from "./types";

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
    MEMBERS: "Members",
    NO_MEMBERS: "No members found",
    USERS_Lower: "users",
    TERM: "Term",
    OF: "of",
    GROUP_FULL: "Group Full",
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
};

type GroupModalProps = {
  group: Group;
};

export function GroupModal({ group }: GroupModalProps) {
  const { fetchGroupMembers, loading } = useGetTravellerApi();
  const [members, setMembers] = useState<Traveller[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const capacityPercentage = Math.round(
    (group.groupSize / group.maxUsers) * 100,
  );
  const isFull = group.groupSize >= group.maxUsers;

  useEffect(() => {
    const loadMembers = async () => {
      setIsLoadingMembers(true);
      try {
        const data = await fetchGroupMembers(group.id, group.groupSize);
        setMembers(data);
      } catch (err) {
        console.error(CONSTANTS.LOGS.LOAD_FAILED, err);
      } finally {
        setIsLoadingMembers(false);
      }
    };
    void loadMembers();
  }, [group.id, fetchGroupMembers]);

  const renderGenderBar = (type: "Male" | "Female") => {
    const isMale = type === CONSTANTS.GENDER.MALE;
    const count = isMale
      ? group.genderBreakdown.male
      : group.genderBreakdown.female;
    const className = isMale
      ? "rounded-l-lg border-l"
      : "rounded-r-lg border-r";

    return (
      <div
        key={type}
        className={`h-8 flex items-center justify-center border-y relative group overflow-hidden ${
          isMale
            ? "bg-blue-100/50 border-blue-200/50"
            : "bg-pink-100/50 border-pink-200/50"
        } ${className}`}
        style={{ flex: Math.max(1, count) }}
      >
        <div
          className={`absolute inset-0 transition-colors ${
            isMale
              ? "bg-blue-500/5 group-hover:bg-blue-500/10"
              : "bg-pink-500/5 group-hover:bg-pink-500/10"
          }`}
        />
        <span
          className={`relative z-10 text-xs font-bold flex items-center gap-1 ${
            isMale ? "text-blue-700" : "text-pink-700"
          }`}
        >
          <User className="w-3 h-3" />
          {count}
        </span>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
      {/* Header Section */}
      <DialogHeader className="space-y-0 pb-4 border-b border-border/10">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 border border-black/5 dark:border-white/10 shadow-lg">
              <UsersRound
                className="w-6 h-6 text-violet-600 dark:text-violet-400"
                strokeWidth={1.5}
              />
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-3">
              <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground/90 truncate">
                {group.name}
              </DialogTitle>
            </div>

            <DialogDescription className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground/80 font-medium">
              <span className="inline-flex items-center gap-1 bg-muted/30 px-2 py-0.5 rounded-md border border-border/40">
                <Users className="w-3 h-3" />
                {group.groupSize} {CONSTANTS.LABELS.USERS_Lower}
              </span>
              <span className="text-muted-foreground/40">•</span>
              <span>
                Created{" "}
                {group.createdAt
                  ? new Date(group.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </DialogDescription>
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
                  ? "bg-red-500"
                  : "bg-gradient-to-r from-primary via-primary/90 to-primary/80"
              }`}
              style={{ width: `${Math.min(100, capacityPercentage)}%` }}
            />
          </div>
        </div>

        {/* Destinations */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-muted/10 border border-border/10">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">
            <MapPin className="w-3 h-3" />
            Destinations
          </div>
          <p className="text-sm font-medium text-foreground">
            {group.destinations?.length
              ? group.destinations.join(", ")
              : "—"}
          </p>
        </div>

        {/* Gender Distribution */}
        <div className="rounded-xl bg-muted/5 border border-border/10 p-3 space-y-2.5">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">
            {CONSTANTS.LABELS.GENDER_DIST}
          </span>
          <div className="flex items-center gap-1.5">
            {renderGenderBar("Male")}
            {renderGenderBar("Female")}
          </div>
        </div>

        {/* Group Members List */}
        <div className="space-y-2.5 pt-2 border-t border-border/10">
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block">
            {CONSTANTS.LABELS.MEMBERS} ({members.length})
          </span>
          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-6 text-primary/80">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : members.length > 0 ? (
              members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/10 transition-colors border border-transparent hover:border-border/5"
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${
                      member.gender === CONSTANTS.GENDER.MALE
                        ? "bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/10 text-blue-600"
                        : "bg-gradient-to-br from-pink-500/10 to-pink-500/5 border-pink-500/10 text-pink-600"
                    }`}
                  >
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {member.name}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
                      <span className="bg-muted/30 px-1.5 py-0.5 rounded-md border border-border/20 text-foreground/80">
                        {member.flightNumber}
                      </span>
                      <span>•</span>
                      <span className="truncate">{member.destination}</span>
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
        </div>

        {/* Action Button */}
        <div className="pt-1">
          <button
            disabled={isFull}
            className={`w-full group relative overflow-hidden rounded-xl px-4 py-2.5 transition-all
              ${
                isFull
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 active:scale-[0.99]"
              }`}
            onClick={() => {
              console.log(CONSTANTS.LOGS.JOIN_CLICKED, group.name);
            }}
          >
            {!isFull && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
            <span className="relative flex items-center justify-center gap-2 font-bold text-sm tracking-wide">
              {isFull ? CONSTANTS.LABELS.GROUP_FULL : CONSTANTS.LABELS.JOIN}
              {!isFull && (
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
