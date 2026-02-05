import React, { useState, useEffect, useRef } from "react";
import { importLibrary } from "../../utils/googleMapsLoader";
import { Input } from "../ui/input";
import { Search, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const SEARCH_CONTENT = {
  PLACEHOLDER: "Search destination...",
  ERRORS: {
    INIT_SESSION: "Failed to init Google Session Token",
    AUTOCOMPLETE_FETCH: "Autocomplete fetch error:",
    PLACE_DETAILS: "Error fetching place details:",
  },
} as const;

interface DestinationSearchProps {
  onLocationSelected: (data: any) => void;
  value?: any; // The object from parent {address, placeId, coords}
  className?: string;
}

const DestinationSearch = ({
  onLocationSelected,
  value,
  className,
}: DestinationSearchProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const lastValidSelection = useRef("");
  const autocompleteSessionToken =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  // Sync internal input string with parent's object
  useEffect(() => {
    if (!value) {
      setQuery("");
      lastValidSelection.current = "";
    } else if (typeof value === "object" && value.address) {
      setQuery(value.address);
      lastValidSelection.current = value.address;
    }
  }, [value]);

  useEffect(() => {
    const init = async () => {
      try {
        const { AutocompleteSessionToken } = (await importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;
        autocompleteSessionToken.current = new AutocompleteSessionToken();
      } catch (err) {
        console.error(SEARCH_CONTENT.ERRORS.INIT_SESSION, err);
      }
    };
    init();
  }, []);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);

    if (val === "") {
      lastValidSelection.current = "";
      onLocationSelected(null); // Reset parent state to null
      setSuggestions([]);
      return;
    }

    if (val.length > 2) {
      setIsSearching(true);
      try {
        const { AutocompleteSuggestion } = (await importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;
        const request = {
          input: val,
          sessionToken: autocompleteSessionToken.current!,
          region: "in",
        };

        const { suggestions: results } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(results);
        setShowDropdown(true);
      } catch (error) {
        console.error(SEARCH_CONTENT.ERRORS.AUTOCOMPLETE_FETCH, error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleSelect = async (
    suggestion: google.maps.places.AutocompleteSuggestion,
  ) => {
    const placePrediction = suggestion.placePrediction;
    if (!placePrediction) return;

    const text = placePrediction.text.text;
    setQuery(text);
    lastValidSelection.current = text;
    setShowDropdown(false);

    try {
      const { Place, AutocompleteSessionToken } = (await importLibrary(
        "places",
      )) as google.maps.PlacesLibrary;
      const selectedPlace = new Place({ id: placePrediction.placeId });

      await selectedPlace.fetchFields({
        fields: ["location", "formattedAddress", "displayName"],
      });

      // Pass full object up, keep query as a string internally
      onLocationSelected({
        placeId: placePrediction.placeId,
        address: selectedPlace.formattedAddress || text,
        coords: {
          lat: selectedPlace.location?.lat(),
          lng: selectedPlace.location?.lng(),
        },
      });

      autocompleteSessionToken.current = new AutocompleteSessionToken();
    } catch (error) {
      console.error(SEARCH_CONTENT.ERRORS.PLACE_DETAILS, error);
    }
  };

  return (
    <div className={cn("relative w-full", className)}>
      <div className="relative group z-10">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
        <Input
          value={query} // This is always a string
          onChange={handleInputChange}
          placeholder={SEARCH_CONTENT.PLACEHOLDER}
          className="pl-10 h-12 bg-muted/5 border-border/40 hover:border-primary/30 focus:border-primary/50 focus:bg-background rounded-xl font-semibold transition-all shadow-sm"
          onFocus={() => query.length > 2 && setShowDropdown(true)}
          onBlur={() => {
            // Revert display to last selected valid address string
            setTimeout(() => {
              if (query !== lastValidSelection.current) {
                setQuery(lastValidSelection.current);
              }
            }, 200);
          }}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary/40" />
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute left-0 right-0 z-[100] mt-2 w-full bg-card/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl p-1 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-0.5 p-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(suggestion);
                  }}
                  className="w-full flex items-start gap-3 p-2.5 text-left hover:bg-primary/5 rounded-xl transition-all group"
                >
                  <div className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg bg-muted/10 group-hover:bg-primary/10 transition-colors">
                    <MapPin className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-bold text-foreground truncate">
                      {suggestion.placePrediction?.text.text.split(",")[0]}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium truncate">
                      {suggestion.placePrediction?.text.text
                        .split(",")
                        .slice(1)
                        .join(",")
                        .trim()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DestinationSearch;
