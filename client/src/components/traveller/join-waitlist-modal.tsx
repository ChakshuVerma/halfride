import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useFlightTrackerApi } from "@/hooks/useFlightTrackerApi";
import {
  Loader2,
  Plane,
  Calendar,
  CheckCircle2,
  ArrowRight,
  X,
} from "lucide-react";
import DestinationSearch from "./destination-search";

const MODAL_CONTENT = {
  HEADER: {
    LABEL: "Flight Tracker",
    TITLE: "Join the Waitlist",
    DESCRIPTION: "Enter your flight details to receive real-time updates.",
  },
  FORM: {
    LABELS: {
      DESTINATION: "Destination",
      CARRIER: "Carrier",
      FLIGHT_NO: "Flight No.",
      TERMINAL: "Terminal",
      DEPARTURE_DATE: "Departure Date",
    },
    PLACEHOLDERS: {
      CARRIER: "AA",
      FLIGHT_NO: "1234",
      TERMINAL: "Select Terminal",
    },
    BUTTONS: {
      JOINING: "Joining...",
      JOIN_WAITLIST: "Join Waitlist",
    },
    ERRORS: {
      FILL_ALL: "Please fill in all fields",
      INVALID_DATE: "Invalid date",
      UNEXPECTED: "An unexpected error occurred",
    },
  },
  SUCCESS: {
    TITLE: "You're on the list!",
    TRACKING_PREFIX: "Tracking flight",
    BUTTON: "Close",
  },
} as const;

interface JoinWaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  terminals: { id: string; name: string }[];
}

export function JoinWaitlistModal({
  open,
  onOpenChange,
  terminals,
}: JoinWaitlistModalProps) {
  const { createFlightTracker } = useFlightTrackerApi();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    carrier: "",
    flightNumber: "",
    date: "",
    destination: "",
    terminal: "",
  });

  // Removed useEffect for focus

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (
        !formData.carrier ||
        !formData.flightNumber ||
        !formData.date ||
        !formData.destination
      ) {
        throw new Error(MODAL_CONTENT.FORM.ERRORS.FILL_ALL);
      }

      const dateObj = new Date(formData.date);
      if (isNaN(dateObj.getTime()))
        throw new Error(MODAL_CONTENT.FORM.ERRORS.INVALID_DATE);

      await createFlightTracker({
        carrier: formData.carrier,
        flightNumber: formData.flightNumber,
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1,
        day: dateObj.getDate(),
        destination: formData.destination,
      });

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setFormData({
          carrier: "",
          flightNumber: "",
          date: "",
          destination: "",
          terminal: "",
        });
      }, 2500);
    } catch (err: any) {
      setError(err.message || MODAL_CONTENT.FORM.ERRORS.UNEXPECTED);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl sm:rounded-3xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl custom-scrollbar [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header */}
        <div className="relative p-6 px-8 border-b border-border/40 pb-6 overflow-hidden">
          {/* Close Button - Explicitly placed in header for visibility */}
          <DialogClose className="absolute right-6 top-6 rounded-full p-2 bg-background/50 hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all z-50 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="w-4 h-4" />
            <span className="sr-only">Close</span>
          </DialogClose>

          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <DialogHeader className="relative z-10 text-left space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <div className="p-2 rounded-xl bg-primary/10">
                <Plane className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {MODAL_CONTENT.HEADER.LABEL}
              </span>
            </div>
            <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
              {MODAL_CONTENT.HEADER.TITLE}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              {MODAL_CONTENT.HEADER.DESCRIPTION}
            </DialogDescription>
          </DialogHeader>
        </div>

        {success ? (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center ring-8 ring-emerald-500/5">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-foreground">
                {MODAL_CONTENT.SUCCESS.TITLE}
              </h3>
              <p className="text-muted-foreground text-sm">
                {MODAL_CONTENT.SUCCESS.TRACKING_PREFIX}{" "}
                <span className="font-semibold text-foreground">
                  {formData.carrier} {formData.flightNumber}
                </span>
              </p>
            </div>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="rounded-xl w-full"
            >
              {MODAL_CONTENT.SUCCESS.BUTTON}
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="p-6 px-8 space-y-6 relative overflow-visible"
          >
            <div className="space-y-4">
              {/* Destination */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground ml-1">
                  {MODAL_CONTENT.FORM.LABELS.DESTINATION}
                </Label>
                <DestinationSearch
                  onLocationSelected={(location: any) => {
                    setFormData((prev) => ({
                      ...prev,
                      destination: location.address,
                    }));
                  }}
                />
              </div>

              {/* Terminal Selection */}
              {terminals.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">
                    {MODAL_CONTENT.FORM.LABELS.TERMINAL}
                  </Label>
                  <Select
                    value={formData.terminal}
                    onValueChange={(val) =>
                      setFormData((prev) => ({ ...prev, terminal: val }))
                    }
                  >
                    <SelectTrigger className="h-11 rounded-xl bg-background border-input ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2">
                      <SelectValue
                        placeholder={MODAL_CONTENT.FORM.PLACEHOLDERS.TERMINAL}
                      />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-border shadow-xl">
                      {terminals.map((terminal) => (
                        <SelectItem
                          key={terminal.id}
                          value={terminal.id}
                          className="rounded-lg cursor-pointer"
                        >
                          {terminal.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Carrier & Flight */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1 space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">
                    {MODAL_CONTENT.FORM.LABELS.CARRIER}
                  </Label>
                  <Input
                    placeholder={MODAL_CONTENT.FORM.PLACEHOLDERS.CARRIER}
                    className="h-11 rounded-xl font-medium text-center uppercase tracking-wide placeholder:font-normal"
                    value={formData.carrier}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        carrier: e.target.value.toUpperCase().slice(0, 3),
                      }))
                    }
                    disabled={loading}
                    required
                    maxLength={3}
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground ml-1">
                    {MODAL_CONTENT.FORM.LABELS.FLIGHT_NO}
                  </Label>
                  <Input
                    placeholder={MODAL_CONTENT.FORM.PLACEHOLDERS.FLIGHT_NO}
                    className="h-11 rounded-xl font-medium"
                    value={formData.flightNumber}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        flightNumber: e.target.value,
                      }))
                    }
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground ml-1">
                  {MODAL_CONTENT.FORM.LABELS.DEPARTURE_DATE}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
                  <Input
                    type="date"
                    className="pl-10 h-11 rounded-xl font-medium"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, date: e.target.value }))
                    }
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm font-medium flex items-center gap-2">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                className="w-full h-12 rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading
                  ? MODAL_CONTENT.FORM.BUTTONS.JOINING
                  : MODAL_CONTENT.FORM.BUTTONS.JOIN_WAITLIST}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
