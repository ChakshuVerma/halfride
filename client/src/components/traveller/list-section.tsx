import { type ReactNode } from "react"
import { ScrollArea } from "../ui/scroll-area"
import { Loader2 } from "lucide-react"

// Reusable list section component for travellers and groups
interface ListSectionProps {
  title: string
  subtitle: string
  count: number
  emptyMessage: string
  animation: "left" | "right"
  children: ReactNode
  loading?: boolean
}

const TEXTS = {
  RESULT: "result",
  SUFFIX_S: "s",
  LOADING: "Fetching your co-travellers...",
}

function ListSection({ title, subtitle, count, emptyMessage, animation, children, loading }: ListSectionProps) {
  const animationName = animation === "left" ? "slideInFromLeft" : "slideInFromRight"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] py-12 text-muted-foreground/60 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-primary/60" />
        <span className="text-xs sm:text-sm font-medium animate-pulse">{TEXTS.LOADING}</span>
      </div>
    )
  }

  return (
    <div
      className="group relative border rounded-xl sm:rounded-2xl bg-muted/10 border-border/20 overflow-hidden shadow-sm backdrop-blur-sm transition-all duration-300"
      style={{ animation: `${animationName} 0.6s cubic-bezier(0.16, 1, 0.3, 1)` }}
    >
      {/* Header Section - Sticky & Glassy */}
      <div className="sticky top-0 z-20 px-3 sm:px-6 py-4 sm:py-5 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4 border-b border-border/10 bg-white/50 dark:bg-black/20 backdrop-blur-md transition-all duration-300">
        <div className="flex flex-col gap-0.5 w-full">
          <h3 className="text-lg sm:text-xl font-bold text-foreground tracking-tight leading-none">
            {title}
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">
            {subtitle}
          </p>
        </div>

        {/* Dynamic Badge */}
        <div className="inline-flex items-center justify-center px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-background/50 border border-border/40 text-[10px] sm:text-xs font-bold text-muted-foreground shadow-xs whitespace-nowrap self-start xs:self-center">
          {count} {TEXTS.RESULT}{count === 1 ? "" : TEXTS.SUFFIX_S}
        </div>
      </div>

      {/* List Container - Improved mobile scrolling */}
      <div className="relative h-[65vh] sm:h-[480px] lg:h-[520px] w-full">
        <ScrollArea className="h-full">
          <div className="p-2 sm:p-5 pb-16 sm:pb-5 space-y-3 sm:space-y-4">
            {count === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 sm:py-20 text-center">
                <p className="text-sm text-muted-foreground/50 font-medium italic">
                  {emptyMessage}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:gap-4 pb-2">
                {children}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

export default ListSection