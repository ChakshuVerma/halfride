import { useState, useEffect } from "react";
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
import { useFlightTrackerApi } from "@/hooks/useFlightTrackerApi";
import {
  Loader2,
  Plane,
  Calendar,
  CheckCircle2,
  ArrowRight,
  X,
  MapPin,
} from "lucide-react";
import DestinationSearch from "./destination-search";
import { cn } from "@/lib/utils";

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
  currentAirport: { airportName: string; airportCode: string } | undefined;
}

export function JoinWaitlistModal({
  open,
  onOpenChange,
  terminals,
  currentAirport,
}: JoinWaitlistModalProps) {
  const { createFlightTracker } = useFlightTrackerApi();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    carrier: "",
    flightNumber: "",
    date: "",
    destination: null as any, // This is now an object
    terminal: "",
  });

  useEffect(() => {
    if (open && terminals.length > 0 && !formData.terminal) {
      setFormData((prev) => ({
        ...prev,
        terminal: terminals[0].id,
      }));
    }
  }, [open, terminals, formData.terminal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (
        !formData.carrier ||
        !formData.flightNumber ||
        !formData.date ||
        !formData.destination?.placeId
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
        destination: formData.destination, // Full object sent to API
        userTerminal: formData.terminal,
        airportCode: currentAirport?.airportCode || "",
      });

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
        setFormData({
          carrier: "",
          flightNumber: "",
          date: "",
          destination: null, // Reset back to null
          terminal: terminals[0]?.id || "",
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
        className="w-[95vw] max-w-md max-h-[93vh] overflow-y-auto p-0 gap-0 rounded-2xl sm:rounded-3xl border border-border/50 bg-background/95 backdrop-blur-xl shadow-2xl custom-scrollbar [&>button]:hidden"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="relative p-6 px-8 border-b border-border/40 pb-6 overflow-hidden">
          <DialogClose className="absolute right-6 top-6 rounded-full p-2 bg-background/50 hover:bg-background/80 text-muted-foreground hover:text-foreground transition-all z-50 focus:outline-none focus:ring-2 focus:ring-ring">
            <X className="w-4 h-4" />
          </DialogClose>

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

            {currentAirport && (
              <div className="flex items-center gap-1.5 mt-1 animate-in fade-in slide-in-from-left-2">
                <div className="flex items-center gap-1.5 px-4 py-3 rounded-full bg-primary/5 border border-primary/10">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">
                    {currentAirport.airportName}
                    <span className="ml-1.5 text-primary">
                      ({currentAirport.airportCode})
                    </span>
                  </span>
                </div>
              </div>
            )}
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
                  {formData.carrier} {formData.flightNumber} to{" "}
                  {formData.destination?.address || "N/A"}
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
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">
                  {MODAL_CONTENT.FORM.LABELS.DESTINATION}
                </Label>
                <DestinationSearch
                  value={formData.destination}
                  onLocationSelected={(location: any) => {
                    setFormData((prev) => ({
                      ...prev,
                      destination: location,
                    }));
                  }}
                />
              </div>

              {terminals.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">
                    {MODAL_CONTENT.FORM.LABELS.TERMINAL}
                  </Label>
                  <div className="flex flex-wrap gap-2.5">
                    {terminals.map((terminal) => {
                      const isSelected = formData.terminal === terminal.id;
                      return (
                        <button
                          key={terminal.id}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              terminal: terminal.id,
                            }))
                          }
                          className={cn(
                            "relative px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ease-out border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-105"
                              : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-primary/30 hover:bg-secondary hover:text-foreground",
                          )}
                        >
                          {terminal.id.toLocaleUpperCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">
                    {MODAL_CONTENT.FORM.LABELS.CARRIER}
                  </Label>
                  <Input
                    placeholder={MODAL_CONTENT.FORM.PLACEHOLDERS.CARRIER}
                    className="h-12 rounded-xl font-bold text-center uppercase tracking-widest bg-secondary/30 focus:bg-background transition-colors"
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

                <div className="col-span-2 space-y-2">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">
                    {MODAL_CONTENT.FORM.LABELS.FLIGHT_NO}
                  </Label>
                  <Input
                    placeholder={MODAL_CONTENT.FORM.PLACEHOLDERS.FLIGHT_NO}
                    className="h-12 rounded-xl font-bold bg-secondary/30 focus:bg-background transition-colors"
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

              <div className="space-y-2">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80 ml-1">
                  {MODAL_CONTENT.FORM.LABELS.DEPARTURE_DATE}
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-primary pointer-events-none" />
                  <Input
                    type="date"
                    className="pl-12 h-12 rounded-xl font-medium bg-secondary/30 focus:bg-background transition-colors"
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
              <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                <span className="text-lg">⚠️</span> {error}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                className="w-full h-14 rounded-2xl text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {MODAL_CONTENT.FORM.BUTTONS.JOIN_WAITLIST}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
