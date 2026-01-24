import {type ReactNode} from "react"
import { ScrollArea } from "../ui/scroll-area"
// Reusable list section component for travellers and groups
interface ListSectionProps {
  title: string
  subtitle: string
  count: number
  emptyMessage: string
  animation: "left" | "right"
  children: ReactNode
}

function ListSection({ title, subtitle, count, emptyMessage, animation, children }: ListSectionProps) {
  const animationName = animation === "left" ? "slideInFromLeft" : "slideInFromRight"
  
  return (
    <div
      className="border rounded-2xl bg-muted/20 border-border/20 overflow-hidden shadow-lg shadow-black/5 backdrop-blur-sm"
      style={{ animation: `${animationName} 0.5s ease-out` }}
    >
      <div className="px-7 py-5 flex items-center justify-between gap-5 border-b border-border/20 bg-linear-to-r from-transparent via-muted/10 to-transparent">
        <div className="flex flex-col gap-1.5">
          <div className="text-xl font-bold text-foreground tracking-tight">{title}</div>
          <div className="text-xs text-muted-foreground/70 font-medium">{subtitle}</div>
        </div>
        <div className="text-xs font-semibold text-muted-foreground/80 px-4 py-2 rounded-xl bg-muted/40 border border-border/30 shadow-sm">
          {count} result{count === 1 ? "" : "s"}
        </div>
      </div>
      <div className="h-[480px]">
        <ScrollArea className="h-full px-5 py-5">
          <div className="space-y-4">
            {count === 0 ? (
              <p className="text-sm text-muted-foreground/70 px-6 py-16 text-center font-medium">
                {emptyMessage}
              </p>
            ) : (
              children
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
export default ListSection

