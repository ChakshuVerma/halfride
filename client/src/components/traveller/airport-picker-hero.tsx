import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plane, Sparkles, UsersRound } from "lucide-react";
import { AirportSelect } from "./airport-select";
import type { Airport } from "@/hooks/useGetAirportApi";
import { ROUTES } from "@/constants/routes";

const HERO_SUBTITLE =
  "Select your departure airport to connect with fellow travellers and share the ride.";

type AirportPickerHeroProps = {
  selectedAirport: Airport | undefined;
  invalidAirportCode: string | null;
  airports: Airport[];
  onSelectAirport: (airport: Airport) => void;
  selectOpen: boolean;
  onSelectOpenChange: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function AirportPickerHero({
  selectedAirport,
  invalidAirportCode,
  airports,
  onSelectAirport,
  selectOpen,
  onSelectOpenChange,
  searchInputRef,
}: AirportPickerHeroProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-10 max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-700">
      {invalidAirportCode ? (
        <div className="space-y-4">
          <p className="text-muted-foreground font-medium">
            Airport &quot;{invalidAirportCode}&quot; not found.
          </p>
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.AIRPORT)}
            className="rounded-xl"
          >
            Choose another airport
          </Button>
        </div>
      ) : (
        <>
          <div className="relative group cursor-pointer">
            <div className="absolute inset-0 bg-muted rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-1000" />
            <div className="w-28 h-28 rounded-[2.5rem] bg-card border border-border shadow-2xl flex items-center justify-center relative z-10 group-hover:scale-105 transition-transform duration-500">
              <div className="w-24 h-24 rounded-[2rem] bg-primary flex items-center justify-center text-primary-foreground shadow-inner">
                <Plane className="w-12 h-12 transform -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
              </div>
            </div>
            <div className="absolute -top-4 -right-4 w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center shadow-lg animate-bounce delay-100 z-20">
              <UsersRound className="w-6 h-6 text-foreground" />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-4xl sm:text-6xl font-bold tracking-tighter text-foreground">
              Find your <br className="sm:hidden" />
              <span className="text-muted-foreground">travel buddy.</span>
            </h2>
            <p className="text-muted-foreground text-lg sm:text-xl max-w-md mx-auto leading-relaxed">
              {HERO_SUBTITLE}
            </p>
          </div>

          <div className="w-full max-w-md transform transition-all hover:scale-[1.02]">
            <AirportSelect
              open={selectOpen}
              onOpenChange={onSelectOpenChange}
              selectedAirport={selectedAirport}
              onSelectAirport={onSelectAirport}
              airports={airports}
              searchInputRef={searchInputRef}
              large
            />
            <div className="flex justify-center gap-6 mt-8 text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Safe
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Verified
              </span>
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Split Cost
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
