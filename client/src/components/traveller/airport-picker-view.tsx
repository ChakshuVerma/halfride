import { Card, CardContent } from "../ui/card";
import { cn } from "@/lib/utils";
import { AirportPickerHero } from "./airport-picker-hero";
import type { Airport } from "@/hooks/useGetAirportApi";

export type AirportPickerViewProps = {
  airports: Airport[];
  invalidAirportCode: string | null;
  onSelectAirport: (airport: Airport) => void;
  selectOpen: boolean;
  onSelectOpenChange: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function AirportPickerView({
  airports,
  invalidAirportCode,
  onSelectAirport,
  selectOpen,
  onSelectOpenChange,
  searchInputRef,
}: AirportPickerViewProps) {
  return (
    <div className="flex items-start sm:items-center justify-center min-h-[85vh] p-2 sm:p-6 w-full max-w-7xl mx-auto">
      <Card
        className={cn(
          "w-full border-border shadow-2xl transition-all duration-700 ease-out",
          "bg-white/70 backdrop-blur-xl",
          "rounded-[3rem] max-w-3xl border-white/40",
        )}
      >
        <CardContent className="px-3 sm:px-10 py-20 sm:py-24 transition-all duration-500">
          <AirportPickerHero
            selectedAirport={undefined}
            invalidAirportCode={invalidAirportCode}
            airports={airports}
            onSelectAirport={onSelectAirport}
            selectOpen={selectOpen}
            onSelectOpenChange={onSelectOpenChange}
            searchInputRef={searchInputRef}
          />
        </CardContent>
      </Card>
    </div>
  );
}
