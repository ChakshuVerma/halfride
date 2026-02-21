import { useEffect, useState, useMemo } from "react";
import { DialogHeader, DialogTitle } from "../ui/dialog";
import {
  Plane,
  User,
  Clock,
  Info,
  XCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { Traveller } from "./types";
import {
  useFlightTrackerApi,
  type FlightArrivalInfo,
} from "@/hooks/useFlightTrackerApi";
import { calculateWaitText } from "./utils";
import { cn } from "@/lib/utils";
import {
  useConnectionApi,
  ConnectionResponseAction,
} from "@/hooks/useConnectionApi";

const CONSTANTS = {
  STATUS_KEYWORDS: {
    CANCELLED: "cancelled",
    NOT_YET_STARTED: "not yet started",
  },
  TIMING_CATEGORIES: {
    EARLY: "early",
    LATE: "late",
    ON_TIME: "on_time",
  },
  MESSAGES: {
    TRACKING_UNAVAILABLE: "Live tracking unavailable",
    SYNCING: "Retrieving Flight Data...",
    RETRY: "Retry Connection",
    SYNCED: "Live",
    AGO: "ago",
    TERM_PREFIX: "T",
    TERM_UNKNOWN: "--",
    GATE_PREFIX: "G",
    GATE_TBD: "TBD",
    BELT: "Belt",
    INTERESTS: "Vibes & Interests",
    CONNECT: "Connect with",
  },
  COLORS: {
    CANCELLED: {
      text: "text-red-600",
      bg: "bg-red-50",
      border: "border-red-100",
    },
    LANDED: {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    NOT_STARTED: {
      text: "text-zinc-500",
      bg: "bg-zinc-100",
      border: "border-zinc-200",
    },
    EARLY: {
      text: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-100",
    },
    LATE: {
      text: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-100",
    },
    DEFAULT: {
      text: "text-zinc-900",
      bg: "bg-zinc-50",
      border: "border-zinc-200",
    },
  },
};

type TravellerModalProps = {
  traveller: Traveller;
  isUserInGroup?: boolean;
  /** Called after successfully accepting or rejecting a connection request. Use to refetch list and/or close modal. */
  onConnectionResponded?: () => void;
};

// ... existing code ...

const getStatusStyles = (info?: FlightArrivalInfo) => {
  const status = info?.statusShort?.toLowerCase() || "";

  if (status.includes(CONSTANTS.STATUS_KEYWORDS.CANCELLED)) {
    return {
      ...CONSTANTS.COLORS.CANCELLED,
      icon: <XCircle className="w-3.5 h-3.5" />,
    };
  }

  if (info?.isLanded) {
    return {
      ...CONSTANTS.COLORS.LANDED,
      icon: <CheckCircle2 className="w-3.5 h-3.5" />,
    };
  }

  if (status.includes(CONSTANTS.STATUS_KEYWORDS.NOT_YET_STARTED)) {
    return {
      ...CONSTANTS.COLORS.NOT_STARTED,
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  }

  if (info?.timingCategory === CONSTANTS.TIMING_CATEGORIES.EARLY) {
    return {
      ...CONSTANTS.COLORS.EARLY,
      icon: <Plane className="w-3.5 h-3.5" />,
    };
  }

  if (info?.timingCategory === CONSTANTS.TIMING_CATEGORIES.LATE) {
    return {
      ...CONSTANTS.COLORS.LATE,
      icon: <Clock className="w-3.5 h-3.5" />,
    };
  }

  return {
    ...CONSTANTS.COLORS.DEFAULT,
    icon: <Plane className="w-3.5 h-3.5" />,
  };
};

export function TravellerModal({
  traveller,
  isUserInGroup,
  onConnectionResponded,
}: TravellerModalProps) {
  const { fetchFlightTrackerByFlightNumber, loading: apiLoading } =
    useFlightTrackerApi();
  const [flightInfo, setFlightInfo] = useState<FlightArrivalInfo | undefined>(
    undefined,
  );
  const [flightError, setFlightError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const isLoading = apiLoading || (!flightInfo && !flightError);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchArrivalInfo = async () => {
    try {
      setFlightError(null);
      const dateToUse =
        traveller.flightDepartureTime || traveller.flightDateTime;
      const info = await fetchFlightTrackerByFlightNumber(
        traveller.flightNumber,
        dateToUse,
      );
      setFlightInfo(info);
    } catch {
      setFlightError(CONSTANTS.MESSAGES.TRACKING_UNAVAILABLE);
    }
  };

  useEffect(() => {
    void fetchArrivalInfo();
  }, [traveller.id]);

  const s = useMemo(() => getStatusStyles(flightInfo), [flightInfo]);

  const {
    requestConnection,
    respondToConnection,
    loading: connectionLoading,
    error: connectionError,
  } = useConnectionApi();
  const [connectionSent, setConnectionSent] = useState(
    traveller.connectionStatus === "REQUEST_SENT",
  );
  const [connectionResponded, setConnectionResponded] = useState<
    "accepted" | "rejected" | null
  >(null);

  const handleConnect = async () => {
    if (!traveller.flightCarrier || !traveller.flightNumberRaw) {
      console.error("Missing flight details for connection");
      return;
    }

    const response = await requestConnection({
      travellerUid: traveller.id,
      flightCarrier: traveller.flightCarrier,
      flightNumber: traveller.flightNumberRaw,
    });

    if (response.ok) {
      setConnectionSent(true);
    }
  };

  const handleRespondToConnection = async (
    action: typeof ConnectionResponseAction.ACCEPT | typeof ConnectionResponseAction.REJECT,
  ) => {
    const response = await respondToConnection({
      requesterUserId: traveller.id,
      action,
    });

    if (response.ok) {
      setConnectionResponded(action === ConnectionResponseAction.ACCEPT ? "accepted" : "rejected");
      onConnectionResponded?.();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white text-zinc-900 selection:bg-zinc-100">
      {/* 1. Header Section */}
      <DialogHeader className="px-6 pt-6 pb-2 space-y-0">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center border border-zinc-200 text-zinc-400">
              <User className="w-8 h-8" strokeWidth={1.5} />
            </div>
            {/* Online Indicator */}
            <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-zinc-900 border-2 border-white"></span>
            </span>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900 truncate">
              {traveller.name}
            </DialogTitle>
            <p className="text-sm text-zinc-500 font-medium">
              @{traveller.username || "traveller"}
            </p>

            {/* Quick Badges */}
            <div className="flex items-center gap-2 mt-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 text-white text-[11px] font-bold uppercase tracking-wider">
                <Plane className="w-3 h-3" />
                {traveller.flightNumber}
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600 text-[11px] font-bold uppercase tracking-wider border border-zinc-200">
                Term {traveller.terminal}
              </div>
            </div>
          </div>
        </div>
      </DialogHeader>

      {/* 2. Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">
        {/* FLIGHT BOARD SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pl-1">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">
              Live Flight Status
            </h4>
            {flightInfo?.airlineName && (
              <span className="text-[10px] font-semibold text-zinc-400">
                {flightInfo.airlineName}
              </span>
            )}
          </div>

          <div className="relative w-full rounded-[1.5rem] border border-zinc-200 overflow-hidden shadow-sm bg-zinc-50/50">
            {isLoading ? (
              <div className="min-h-[200px] flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-300" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 animate-pulse">
                  {CONSTANTS.MESSAGES.SYNCING}
                </span>
              </div>
            ) : flightError ? (
              <div className="min-h-[200px] flex flex-col items-center justify-center gap-3 text-center p-6">
                <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center">
                  <Info className="w-5 h-5 text-zinc-400" />
                </div>
                <p className="text-sm font-medium text-zinc-500">
                  {flightError}
                </p>
                <button
                  onClick={fetchArrivalInfo}
                  className="text-xs font-bold text-zinc-900 underline hover:no-underline"
                >
                  {CONSTANTS.MESSAGES.RETRY}
                </button>
              </div>
            ) : (
              flightInfo && (
                <div className="flex flex-col animate-in fade-in duration-500">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-100 bg-white">
                    <div
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                        s.bg,
                        s.text,
                      )}
                    >
                      {s.icon}
                      {/* Show statusShort (e.g. Landed) or timingLabel (e.g. 10m Early) */}
                      {flightInfo.statusShort}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                        {CONSTANTS.MESSAGES.SYNCED}{" "}
                        {Math.floor((now - flightInfo.lastUpdatedAt) / 60000)}m{" "}
                        {CONSTANTS.MESSAGES.AGO}
                      </span>
                    </div>
                  </div>

                  {/* Route Visual */}
                  <div className="px-6 py-6 bg-white">
                    <div className="flex items-center justify-between gap-4">
                      {/* Origin */}
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Departure
                        </span>
                        <span className="text-2xl font-black text-zinc-900 leading-none">
                          {flightInfo.originCode || "---"}
                        </span>
                      </div>

                      {/* Path */}
                      <div className="flex-1 flex flex-col items-center px-4">
                        <div className="w-full relative h-[2px] bg-zinc-100 rounded-full">
                          <div
                            className={cn(
                              "absolute top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white border border-zinc-200 transition-all duration-1000",
                              flightInfo.isLanded
                                ? "left-[100%] -translate-x-full"
                                : "left-1/2 -translate-x-1/2",
                            )}
                          >
                            <Plane className="w-3.5 h-3.5 text-zinc-400 rotate-90" />
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mt-2">
                          {flightInfo.airlineName || "Direct Flight"}
                        </span>
                      </div>

                      {/* Destination */}
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Arrival
                        </span>
                        <span className="text-2xl font-black text-zinc-900 leading-none">
                          {flightInfo.destCode || "---"}
                        </span>
                        {/* Use etaLocal or arrivalTimeLocal */}
                        <span className={cn("text-xs font-bold mt-1", s.text)}>
                          {flightInfo.etaLocal ||
                            flightInfo.arrivalTimeLocal ||
                            "--:--"}
                        </span>
                      </div>
                    </div>

                    {/* Timing Context Label (e.g. "10 mins late") */}
                    {flightInfo.timingLabel && (
                      <div className="mt-4 text-center">
                        <span
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md bg-zinc-50 border border-zinc-100",
                            s.text,
                          )}
                        >
                          {flightInfo.timingLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details Grid */}
                  <div
                    className={cn(
                      "grid divide-x divide-zinc-100 bg-zinc-50/50 border-t border-zinc-100",
                      flightInfo.gate ? "grid-cols-2" : "grid-cols-1",
                    )}
                  >
                    <div className="flex flex-col items-center justify-center p-3 text-center">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                        Terminal
                      </span>
                      <span className="text-sm font-black text-zinc-900">
                        {flightInfo.terminal
                          ? `${CONSTANTS.MESSAGES.TERM_PREFIX}${flightInfo.terminal}`
                          : "--"}
                      </span>
                    </div>

                    {flightInfo.gate && (
                      <div className="flex flex-col items-center justify-center p-3 text-center">
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                          Gate
                        </span>
                        <span className="text-sm font-black text-zinc-900">
                          {`${CONSTANTS.MESSAGES.GATE_PREFIX}${flightInfo.gate}`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* STATS SECTION */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Distance
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-zinc-900">
                {traveller.distanceFromUserKm?.toFixed(1)}
              </span>
              <span className="text-xs font-bold text-zinc-400">km away</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-zinc-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Wait Time
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span
                className={cn(
                  "text-2xl font-black",
                  calculateWaitText(traveller.flightDateTime) === "Landed"
                    ? "text-emerald-600"
                    : "text-zinc-900",
                )}
              >
                {calculateWaitText(traveller.flightDateTime)}
              </span>
            </div>
          </div>
        </div>

        {/* INTERESTS SECTION */}
        {traveller.tags && traveller.tags.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-1 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              {CONSTANTS.MESSAGES.INTERESTS}
            </h4>
            <div className="flex flex-wrap gap-2">
              {traveller.tags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-zinc-200 text-xs font-semibold text-zinc-600 shadow-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {connectionError && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm font-medium">
            {connectionError}
          </div>
        )}
      </div>

      {/* 3. Footer Action */}
      {!isUserInGroup && (
        <div className="p-6 pt-2 border-t border-zinc-100 bg-white">
          {traveller.connectionStatus === "REQUEST_RECEIVED" &&
          !connectionResponded ? (
            <div className="flex gap-3">
              <button
                onClick={() => handleRespondToConnection(ConnectionResponseAction.REJECT)}
                disabled={connectionLoading}
                className={cn(
                  "flex-1 h-12 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 border-2 border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300 transition-all active:scale-[0.98]",
                  connectionLoading && "opacity-60 cursor-not-allowed",
                )}
              >
                {connectionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reject"
                )}
              </button>
              <button
                onClick={() => handleRespondToConnection(ConnectionResponseAction.ACCEPT)}
                disabled={connectionLoading}
                className={cn(
                  "flex-1 h-12 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 bg-emerald-500 text-white shadow-emerald-500/20 shadow-xl hover:bg-emerald-600 transition-all hover:scale-[1.01] active:scale-[0.98]",
                  connectionLoading && "opacity-60 cursor-not-allowed",
                )}
              >
                {connectionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Accept <CheckCircle2 className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          ) : connectionResponded === "accepted" ? (
            <div className="w-full h-12 rounded-xl bg-emerald-500 text-white text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              Connected <CheckCircle2 className="w-4 h-4" />
            </div>
          ) : connectionResponded === "rejected" ? (
            <div className="w-full h-12 rounded-xl bg-zinc-100 text-zinc-600 text-sm font-bold uppercase tracking-widest flex items-center justify-center">
              Request declined
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={
                connectionLoading ||
                connectionSent ||
                traveller.connectionStatus === "REQUEST_SENT"
              }
              className={cn(
                "w-full h-12 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl transition-all hover:scale-[1.01] active:scale-[0.98]",
                connectionSent || traveller.connectionStatus === "REQUEST_SENT"
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-zinc-900 hover:bg-black text-white shadow-zinc-900/10",
                (connectionLoading ||
                  connectionSent ||
                  traveller.connectionStatus === "REQUEST_SENT") &&
                  "cursor-not-allowed opacity-80",
              )}
            >
              {connectionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : connectionSent ||
                traveller.connectionStatus === "REQUEST_SENT" ? (
                <>
                  Request Sent <CheckCircle2 className="w-4 h-4" />
                </>
              ) : (
                <>
                  {CONSTANTS.MESSAGES.CONNECT} {traveller.name.split(" ")[0]}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
//   );
// }
