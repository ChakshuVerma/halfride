import { useEffect, useState, useRef } from "react";
import { useGetAirportsApi, type Airport } from "@/hooks/useGetAirportApi";
import { useAirportFromUrl } from "@/hooks/useAirportFromUrl";
import { AirportPickerView } from "./airport-picker-view";
import { AirportTravellersDashboard } from "./airport-travellers-dashboard";
import { LoadingState } from "@/components/common/LoadingState";

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
      <LoadingState
        message={LOADING_LABEL}
        className="min-h-[50vh]"
      />
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
