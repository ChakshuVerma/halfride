import { useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Airport } from "./useGetAirportApi";
import { getAirportPath } from "@/constants/routes";

/**
 * Derives selected airport and invalid code from URL param and airports list.
 * Use on pages that have /airport/:airportCode routing.
 */
export function useAirportFromUrl(airports: Airport[]) {
  const { airportCode: airportCodeParam } = useParams<{ airportCode?: string }>();
  const navigate = useNavigate();

  const selectedAirport = useMemo(() => {
    if (!airportCodeParam || airports.length === 0) return undefined;
    const code = decodeURIComponent(airportCodeParam);
    return (
      airports.find(
        (a) => a.airportCode.toUpperCase() === code.toUpperCase(),
      ) ?? undefined
    );
  }, [airportCodeParam, airports]);

  const invalidAirportCode = useMemo(() => {
    if (!airportCodeParam || airports.length === 0) return null;
    const code = decodeURIComponent(airportCodeParam);
    const found = airports.some(
      (a) => a.airportCode.toUpperCase() === code.toUpperCase(),
    );
    return found ? null : code;
  }, [airportCodeParam, airports]);

  const handleSelectAirport = useCallback(
    (airport: Airport) => {
      navigate(getAirportPath(airport.airportCode));
    },
    [navigate],
  );

  return { selectedAirport, invalidAirportCode, handleSelectAirport };
}
