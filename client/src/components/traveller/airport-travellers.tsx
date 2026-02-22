import { useEffect, useState, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useGetAirportsApi, type Airport } from "@/hooks/useGetAirportApi";
import { useAirportFromUrl } from "@/hooks/useAirportFromUrl";
import { AirportPickerView } from "./airport-picker-view";
import { AirportTravellersDashboard } from "./airport-travellers-dashboard";

const LOADING_LABEL = "Loading...";

const AirportTravellers = () => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportsLoaded, setAirportsLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { selectedAirport, invalidAirportCode, handleSelectAirport } =
    useAirportFromUrl(airports);

  const { fetchAirports, fetchAirportsLoading } = useGetAirportsApi();

  useEffect(() => {
    const loadAirports = async () => {
      const fetched = await fetchAirports();
      fetched.sort((a, b) => a.airportName.localeCompare(b.airportName));
      setAirports(fetched);
      setAirportsLoaded(true);
    };
    void loadAirports();
  }, [fetchAirports]);

  const isLoading = !airportsLoaded || fetchAirportsLoading;

  if (isLoading)
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-900" />
        <span className="text-zinc-500 text-sm font-medium animate-pulse">
          {LOADING_LABEL}
        </span>
      </div>
    );

  if (!selectedAirport) {
    return (
      <AirportPickerView
        airports={airports}
        invalidAirportCode={invalidAirportCode}
        onSelectAirport={handleSelectAirport}
        selectOpen={open}
        onSelectOpenChange={setOpen}
        searchInputRef={searchInputRef}
      />
    );
  }

  return (
    <AirportTravellersDashboard
      selectedAirport={selectedAirport}
      airports={airports}
      onSelectAirport={handleSelectAirport}
      selectOpen={open}
      onSelectOpenChange={setOpen}
      searchInputRef={searchInputRef}
    />
  );
};

export default AirportTravellers;
