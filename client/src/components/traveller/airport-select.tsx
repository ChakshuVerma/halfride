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

const filterAirports = (value: string, search: string) => {
  if (value.toLowerCase().includes(search.toLowerCase())) return 1;
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
              "justify-between w-full rounded-2xl border-zinc-200 bg-white hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-300 text-zinc-900",
              large
                ? "h-16 text-lg px-6 shadow-xl shadow-zinc-200/50"
                : "h-10 text-sm",
              open && "opacity-50",
            )}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <Search
                className={cn(
                  "shrink-0 text-zinc-400",
                  large ? "w-5 h-5" : "w-4 h-4",
                )}
              />
              <span className="truncate">
                {selectedAirport?.airportName || LABELS.SELECT_PLACEHOLDER}
              </span>
            </div>
            <ChevronsUpDown
              className={cn(
                "ml-2 shrink-0 text-zinc-400",
                large ? "h-5 w-5" : "h-4 w-4",
              )}
            />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="p-0 overflow-hidden bg-white/95 backdrop-blur-2xl border-zinc-200 shadow-2xl rounded-3xl w-[95vw] max-w-2xl gap-0">
        <div className="flex flex-col h-[70vh] sm:h-[600px]">
          <div className="px-4 py-4 border-b border-zinc-100">
            <DialogTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest pl-2 mb-2">
              {LABELS.SELECT_AIRPORT_TITLE}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {LABELS.SELECT_AIRPORT_DESC}
            </DialogDescription>
            <Command className="flex-1 bg-transparent" filter={filterAirports}>
              <div className="flex items-center gap-2 bg-zinc-100 px-3 rounded-xl border border-transparent focus-within:border-zinc-300 focus-within:bg-white transition-all">
                <Search className="w-5 h-5 text-zinc-400" />
                <CommandInput
                  ref={searchInputRef}
                  placeholder={LABELS.SEARCH_AIRPORT_PLACEHOLDER}
                  className="border-none focus:ring-0 text-lg h-12 bg-transparent w-full placeholder:text-zinc-400 text-zinc-900"
                />
              </div>

              <CommandList className="max-h-full p-2 mt-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded scrollbar-thumb-zinc-200">
                <CommandEmpty className="py-12 text-center flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-zinc-100">
                    <Plane className="w-8 h-8 text-zinc-300" />
                  </div>
                  <span className="text-zinc-500 font-medium">
                    {MESSAGES.NO_AIRPORT_FOUND}
                  </span>
                </CommandEmpty>
                <CommandGroup>
                  {airports.map((airport) => (
                    <CommandItem
                      key={airport.airportCode}
                      value={`${airport.airportName} ${airport.airportCode}`}
                      onSelect={() => {
                        if (
                          selectedAirport?.airportCode !== airport.airportCode
                        ) {
                          onSelectAirport(airport);
                        }
                        onOpenChange(false);
                      }}
                      className="group flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer hover:bg-zinc-100 data-[selected=true]:bg-zinc-900 data-[selected=true]:text-white transition-all mb-1"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center border transition-colors",
                            selectedAirport?.airportCode === airport.airportCode
                              ? "bg-white text-black border-transparent"
                              : "bg-white border-zinc-200 group-hover:border-zinc-300 group-data-[selected=true]:bg-zinc-800 group-data-[selected=true]:border-zinc-700",
                          )}
                        >
                          <Plane className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base font-semibold group-data-[selected=true]:text-white">
                            {airport.airportName}
                          </span>
                          <span className="text-xs text-zinc-500 group-data-[selected=true]:text-zinc-400">
                            International Airport
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold font-mono px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 group-data-[selected=true]:bg-zinc-800 group-data-[selected=true]:text-zinc-300 group-data-[selected=true]:border-zinc-700">
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
