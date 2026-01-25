import { type ReactNode } from "react"
import { ScrollArea } from "../ui/scroll-area"
import { Loader2, Ghost, Sparkles } from "lucide-react"

// Reusable list section component for travellers and groups
interface ListSectionProps {
  title: string
  subtitle: string
  count: number
  emptyMessage: string
  animation: "left" | "right"
  children: ReactNode
  loading?: boolean
  icon?: ReactNode
}

const TEXTS = {
  RESULT: "result",
  SUFFIX_S: "s",
  LOADING: "Fetching your co-travellers...",
}

function ListSection({ title, subtitle, count, emptyMessage, animation, children, loading, icon }: ListSectionProps) {
  const animationName = animation === "left" ? "slideInFromLeft" : "slideInFromRight"

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] py-12 text-muted-foreground/60 gap-4 border rounded-2xl bg-white/5 border-dashed border-border/30">
        <div className="relative">
             <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
             <Loader2 className="relative w-10 h-10 animate-spin text-primary" />
        </div>
        <span className="text-sm font-medium animate-pulse tracking-wide">{TEXTS.LOADING}</span>
      </div>
    )
  }

  return (
    <div
      className="group relative border rounded-2xl sm:rounded-3xl bg-white/40 dark:bg-black/20 border-white/20 dark:border-white/5 overflow-hidden shadow-2xl shadow-black/5 backdrop-blur-xl ring-1 ring-black/5 transition-all duration-300 hover:shadow-primary/5"
      style={{ animation: `${animationName} 0.6s cubic-bezier(0.16, 1, 0.3, 1)` }}
    >
        {/* Decorative background gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Header Section - Sticky & Glassy */}
      <div className="sticky top-0 z-20 px-4 sm:px-8 py-5 sm:py-6 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-4 border-b border-border/10 bg-white/60 dark:bg-black/40 backdrop-blur-xl transition-all duration-300 supports-[backdrop-filter]:bg-white/30">
        <div className="flex items-center gap-4">
             {icon && (
                <div className="hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary shadow-inner">
                    {icon}
                </div>
             )}
            <div className="flex flex-col gap-1">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight leading-none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                {title}
            </h3>
            <p className="text-xs text-muted-foreground/80 font-medium uppercase tracking-wider">
                {subtitle}
            </p>
            </div>
        </div>

        {/* Dynamic Badge */}
        <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-white/50 dark:bg-black/50 border border-primary/10 text-xs font-bold text-foreground shadow-sm backdrop-blur-md whitespace-nowrap self-start xs:self-center group-hover:border-primary/20 transition-colors">
          <span className="text-primary mr-1.5">•</span>
          {count} {TEXTS.RESULT}{count === 1 ? "" : TEXTS.SUFFIX_S}
        </div>
      </div>

      {/* List Container - Improved mobile scrolling */}
      <div className="relative h-[65vh] sm:h-[500px] lg:h-[550px] w-full bg-gradient-to-b from-transparent to-black/5 dark:to-white/5">
        <ScrollArea className="h-full">
          <div className="p-3 sm:p-6 pb-20 sm:pb-6 space-y-4">
            {count === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] px-6 text-center relative overflow-hidden rounded-2xl border border-dashed border-border/40 bg-white/5 m-2">
                 {/* Empty State Decoration */}
                 <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                 
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                    <div className="relative bg-background/80 p-4 rounded-3xl border border-border/50 shadow-xl backdrop-blur-sm">
                        <Ghost className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-primary animate-pulse duration-1000" />
                </div>
                
                <h4 className="text-lg font-semibold text-foreground mb-2">It's a bit quiet here</h4>
                <p className="text-sm text-muted-foreground max-w-[280px] leading-relaxed">
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