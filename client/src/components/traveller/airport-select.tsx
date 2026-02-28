import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ChevronsUpDown, Plane, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Airport } from "@/hooks/useGetAirportApi";

const LABELS = {
  SELECT_PLACEHOLDER: "Select airport",
  SELECT_AIRPORT_TITLE: "Select Airport",
  SELECT_AIRPORT_DESC: "Choose your departure airport.",
  SEARCH_AIRPORT_PLACEHOLDER: "Search by city or code...",
} as const;

const MESSAGES = {
  NO_AIRPORT_FOUND: "No airport found.",
} as const;

/** Search matches airport name, code, or city. */
const filterAirports = (value: string, search: string) => {
  if (!search.trim()) return 1;
  const s = search.toLowerCase().trim();
  if (value.toLowerCase().includes(s)) return 1;
  return 0;
};

export type AirportSelectProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAirport: Airport | undefined;
  onSelectAirport: (airport: Airport) => void;
  airports: Airport[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  large?: boolean;
  children?: React.ReactNode;
};

export function AirportSelect({
  open,
  onOpenChange,
  selectedAirport,
  onSelectAirport,
  airports,
  searchInputRef,
  large = false,
  children,
}: AirportSelectProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className={cn(
              "justify-between w-full rounded-2xl border-border bg-card hover:bg-muted hover:border-border transition-all duration-300 text-foreground",
              large
                ? "h-16 text-lg px-6 shadow-xl "
                : "h-10 text-sm",
              open && "opacity-50",
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <Search
                className={cn(
                  "shrink-0 text-muted-foreground",
                  large ? "w-5 h-5" : "w-4 h-4",
                )}
              />
              <span className="truncate">
                {selectedAirport?.airportName || LABELS.SELECT_PLACEHOLDER}
              </span>
            </div>
            <ChevronsUpDown
              className={cn(
                "ml-2 shrink-0 text-muted-foreground",
                large ? "h-5 w-5" : "h-4 w-4",
              )}
            />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent
        className="p-0 overflow-hidden bg-card/95 backdrop-blur-2xl border-border shadow-2xl rounded-3xl w-[95vw] max-w-2xl gap-0"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-[70vh] sm:h-[600px]">
          <div className="px-4 pr-12 sm:pr-14 py-4 border-b border-border">
            <DialogTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-2 mb-2">
              {LABELS.SELECT_AIRPORT_TITLE}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {LABELS.SELECT_AIRPORT_DESC}
            </DialogDescription>
            <Command className="flex-1 bg-transparent" filter={filterAirports}>
              <div className="flex items-center gap-2 bg-muted px-3 rounded-xl border border-transparent focus-within:border-border focus-within:bg-card transition-all">
                <Search className="w-5 h-5 text-muted-foreground" />
                <CommandInput
                  ref={searchInputRef}
                  placeholder={LABELS.SEARCH_AIRPORT_PLACEHOLDER}
                  showIcon={false}
                  className="border-none focus:ring-0 text-lg h-12 bg-transparent w-full placeholder:text-muted-foreground text-foreground"
                />
              </div>

              <CommandList className="max-h-full p-2 mt-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-border">
                <CommandEmpty className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-muted">
                    <Plane className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <span className="text-muted-foreground font-medium">
                    {MESSAGES.NO_AIRPORT_FOUND}
                  </span>
                </CommandEmpty>
                <CommandGroup>
                  {airports.map((airport) => (
                    <CommandItem
                      key={airport.airportCode}
                      value={`${airport.airportName} ${airport.airportCode} ${airport.city ?? ""}`}
                      onSelect={() => {
                        if (
                          selectedAirport?.airportCode !== airport.airportCode
                        ) {
                          onSelectAirport(airport);
                        }
                        onOpenChange(false);
                      }}
                      className="group flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer hover:bg-muted data-[selected=true]:bg-primary data-[selected=true]:text-primary-foreground transition-all mb-1"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                            selectedAirport?.airportCode === airport.airportCode
                              ? "bg-card text-black border-transparent"
                              : "bg-card border-border group-hover:border-border group-data-[selected=true]:bg-primary group-data-[selected=true]:border-primary",
                          )}
                        >
                          <Plane className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-semibold group-data-[selected=true]:text-white">
                            {airport.airportName}
                          </span>
                          <span className="text-xs text-muted-foreground group-data-[selected=true]:text-muted-foreground">
                            {airport.city ? `${airport.city}` : "International Airport"}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-muted border border-border group-data-[selected=true]:bg-primary group-data-[selected=true]:text-primary-foreground group-data-[selected=true]:border-primary">
                        {airport.airportCode}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
