import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useFlightTrackerApi } from "@/hooks/useFlightTrackerApi"
import { Loader2, Plane, Calendar, MapPin, CheckCircle2, ArrowRight } from "lucide-react"

interface JoinWaitlistModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function JoinWaitlistModal({ open, onOpenChange }: JoinWaitlistModalProps) {
  const { createFlightTracker } = useFlightTrackerApi()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const carrierInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      // Small timeout to ensure DialogContent is mounted and animation started
      const timer = setTimeout(() => {
        carrierInputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  const [formData, setFormData] = useState({
    carrier: "",
    flightNumber: "",
    date: "",
    destination: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (!formData.carrier || !formData.flightNumber || !formData.date || !formData.destination) {
        throw new Error("Please fill in all fields")
      }

      // Parse date
      const dateObj = new Date(formData.date)
      if (isNaN(dateObj.getTime())) {
        throw new Error("Invalid date")
      }

      await createFlightTracker({
        carrier: formData.carrier,
        flightNumber: formData.flightNumber,
        year: dateObj.getFullYear(),
        month: dateObj.getMonth() + 1,
        day: dateObj.getDate(),
        destination: formData.destination
      })

      setSuccess(true)
      setTimeout(() => {
        onOpenChange(false)
        setSuccess(false)
        setFormData({ carrier: "", flightNumber: "", date: "", destination: "" })
      }, 2000)

    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden p-0 gap-0 rounded-3xl border-0 bg-card/95 backdrop-blur-xl shadow-2xl">
        
        {/* Header Section with Gradient */}
        <div className="relative p-6 sm:p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-pink-500/10" />
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Plane className="w-24 h-24 text-primary rotate-12" />
          </div>
          
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight flex flex-col gap-1">
              <span className="text-primary/60 text-sm font-bold uppercase tracking-widest">Flight Tracker</span>
              <span>Join the Waitlist</span>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/80 font-medium pt-2">
              Track your flight and get notified about updates instantly.
            </DialogDescription>
          </DialogHeader>
        </div>

        {success ? (
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Successfully Joined!</h3>
            <p className="text-muted-foreground text-sm max-w-[200px]">
              You're now tracking flight {formData.carrier} {formData.flightNumber}. Have a safe trip!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {/* Carrier Input */}
                <div className="space-y-2 col-span-1">
                  <Label htmlFor="carrier" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 pl-1">
                    Carrier
                  </Label>
                  <Input
                    id="carrier"
                    ref={carrierInputRef}
                    placeholder="AA"
                    className="h-12 bg-muted/5 border-muted-foreground/10 hover:border-muted-foreground/20 focus:border-primary/30 focus:bg-background transition-all rounded-xl font-medium text-center uppercase"
                    value={formData.carrier}
                    onChange={(e) => setFormData(prev => ({ ...prev, carrier: e.target.value.toUpperCase().slice(0, 3) }))}
                    disabled={loading}
                    required
                    maxLength={3}
                  />
                </div>

                {/* Flight Number Input */}
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="flightNumber" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 pl-1">
                    Flight No.
                  </Label>
                  <div className="relative group">
                    <Plane className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <Input
                      id="flightNumber"
                      placeholder="1234"
                      className="pl-9 h-12 bg-muted/5 border-muted-foreground/10 hover:border-muted-foreground/20 focus:border-primary/30 focus:bg-background transition-all rounded-xl font-medium"
                      value={formData.flightNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, flightNumber: e.target.value }))}
                      disabled={loading}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 pl-1">
                  Flight Date
                </Label>
                <div className="relative group">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="date"
                    type="date"
                    className="pl-9 h-12 bg-muted/5 border-muted-foreground/10 hover:border-muted-foreground/20 focus:border-primary/30 focus:bg-background transition-all rounded-xl font-medium"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Destination Input */}
              <div className="space-y-2">
                <Label htmlFor="destination" className="text-xs font-bold uppercase tracking-wider text-muted-foreground/70 pl-1">
                  Destination
                </Label>
                <div className="relative group">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input
                    id="destination"
                    placeholder="Where are you headed?"
                    className="pl-9 h-12 bg-muted/5 border-muted-foreground/10 hover:border-muted-foreground/20 focus:border-primary/30 focus:bg-background transition-all rounded-xl font-medium"
                    value={formData.destination}
                    onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="text-[11px] font-bold text-rose-500 bg-rose-500/10 px-3 py-2 rounded-lg text-center uppercase tracking-wide animate-in slide-in-from-top-1">
                {error}
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button 
                type="submit" 
                className="w-full h-12 text-sm font-bold uppercase tracking-widest rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    Join Waitlist 
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
