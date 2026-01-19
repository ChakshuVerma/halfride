import { useState } from "react"
import type { ComponentType, SVGProps } from "react"
import type { Country } from "react-phone-number-input"
import { getCountries, getCountryCallingCode } from "react-phone-number-input"
import en from "react-phone-number-input/locale/en"
import * as Flags from "country-flag-icons/react/3x2"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "../ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../ui/popover"
import { ScrollArea } from "../ui/scroll-area"
import { cn } from "../../lib/utils"

type FlagComponent = ComponentType<SVGProps<SVGSVGElement>>
const FLAGS_MAP = Flags as unknown as Record<string, FlagComponent>

interface CountrySelectProps {
  country: Country
  setCountry: (country: Country) => void
  disabled?: boolean
}

export function CountrySelect({ country, setCountry, disabled = false }: CountrySelectProps) {
  const [open, setOpen] = useState(false)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        if (disabled) return
        setOpen(next)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-12 w-[110px] flex-none justify-between rounded-l-xl rounded-r-none border-r border-border/50 bg-muted/30 hover:bg-muted/50 hover:text-foreground/80 pl-3 pr-2 font-normal"
        >
          {(() => {
            const Flag = FLAGS_MAP[country]
            return <Flag className="w-5 h-4 shrink-0 rounded-[2px]" aria-label={country} />
          })()}
          <span className="text-base font-semibold text-muted-foreground">
            +{getCountryCallingCode(country)}
          </span>
          <ChevronsUpDown className="ml-0.5 h-3 w-3 shrink-0 opacity-50 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" side="bottom">
        <Command>
          <CommandInput placeholder="Search country..." />
          <CommandList className="max-h-[250px]">
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              <ScrollArea className="h-full">
                {getCountries().map((countryCode) => {
                  const Flag = FLAGS_MAP[countryCode]
                  return (
                    <CommandItem
                      key={countryCode}
                      value={`${en[countryCode]} +${getCountryCallingCode(countryCode)}`}
                      onSelect={() => {
                        setCountry(countryCode)
                        setOpen(false)
                      }}
                    >
                      <Flag className="mr-2 w-5 h-4 rounded-[2px]" aria-label={countryCode} />
                      <span>{en[countryCode]}</span>
                      <span className="ml-auto text-muted-foreground">
                        +{getCountryCallingCode(countryCode)}
                      </span>
                      <Check
                        className={cn(
                          "ml-2 h-4 w-4",
                          country === countryCode ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </ScrollArea>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
