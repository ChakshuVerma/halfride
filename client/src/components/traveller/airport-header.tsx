import { CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Pencil } from "lucide-react";
import { AirportSelect } from "./airport-select";
import type { Airport } from "@/hooks/useGetAirportApi";

type AirportHeaderProps = {
  selectedAirport: Airport;
  airports: Airport[];
  onSelectAirport: (airport: Airport) => void;
  selectOpen: boolean;
  onSelectOpenChange: (open: boolean) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
};

export function AirportHeader({
  selectedAirport,
  airports,
  onSelectAirport,
  selectOpen,
  onSelectOpenChange,
  searchInputRef,
}: AirportHeaderProps) {
  return (
    <CardHeader className="pt-8 pb-6 px-6 sm:px-10 border-b border-zinc-100">
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 justify-between">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-white bg-zinc-900 shadow-lg shadow-zinc-200">
            <span className="text-xl sm:text-2xl font-black tracking-tighter">
              {selectedAirport.airportCode}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
              {selectedAirport.airportName}
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-zinc-500 font-medium">
              <MapPin className="w-4 h-4" />
              <span>Viewing active travellers</span>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-auto">
          <AirportSelect
            open={selectOpen}
            onOpenChange={onSelectOpenChange}
            selectedAirport={selectedAirport}
            onSelectAirport={onSelectAirport}
            airports={airports}
            searchInputRef={searchInputRef}
          >
            <Button
              variant="outline"
              className="rounded-full border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all group"
            >
              Change Airport
              <Pencil className="w-3.5 h-3.5 ml-2 text-zinc-400 group-hover:text-zinc-900 transition-colors" />
            </Button>
          </AirportSelect>
        </div>
      </div>
    </CardHeader>
  );
}
