import { Car } from "lucide-react";
import { cn } from "@/lib/utils";

type AppBrandProps = {
  label?: string;
  onClick?: () => void;
  className?: string;
};

const DEFAULT_LABEL = "HalfRide";

export function AppBrand({ label = DEFAULT_LABEL, onClick, className }: AppBrandProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 font-bold text-xl tracking-tight",
        onClick && "cursor-pointer",
        className,
      )}
    >
      <div className="w-9 h-9 bg-primary text-primary-foreground rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
        <Car className="w-5 h-5" />
      </div>
      <span>{label}</span>
    </Wrapper>
  );
}

