import { Plane, MapPin, Loader2, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type UserListingBannerProps = {
  userDestination: string | null;
  isUserInGroup: boolean;
  userGroupId: string | null;
  userReadyToOnboard: boolean;
  initialDataFetchCompleted: boolean;
  /** True when user has an active listing at any airport (disables "Post flight" on all airports). */
  hasActiveListingAnywhere: boolean;
  joinWaitlistLabel: string;
  onOpenWaitlist: () => void;
  onVerifyAtTerminal?: () => Promise<void>;
  verifyAtTerminalLoading?: boolean;
};

export function UserListingBanner({
  userDestination,
  isUserInGroup,
  userGroupId,
  userReadyToOnboard,
  initialDataFetchCompleted,
  hasActiveListingAnywhere,
  joinWaitlistLabel,
  onOpenWaitlist,
  onVerifyAtTerminal,
  verifyAtTerminalLoading = false,
}: UserListingBannerProps) {
  if (!initialDataFetchCompleted) {
    return null;
  }

  const hasListing = !!userDestination;
  const postDisabled = hasActiveListingAnywhere && !hasListing;

  if (hasListing && !isUserInGroup) {
    return (
      <div className="inline-flex items-center gap-3 pl-4 pr-2 py-2 bg-muted text-foreground rounded-full border border-border animate-in zoom-in duration-300">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
        </div>
        <span className="text-sm font-medium">
          You are listed for{" "}
          <span className="font-bold">{userDestination}</span>
        </span>
      </div>
    );
  }

  if (hasListing && isUserInGroup) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="inline-flex items-center gap-3 pl-4 pr-6 py-2 bg-muted text-foreground rounded-full border border-border animate-in zoom-in duration-300">
          <div className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </div>
          <span className="text-sm font-medium">
            You are listed for{" "}
            <span className="font-bold">{userDestination}</span>
          </span>
        </div>
        {userGroupId &&
          onVerifyAtTerminal &&
          (userReadyToOnboard ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400 border border-green-500/30">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">Ready to onboard</span>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onVerifyAtTerminal}
              disabled={verifyAtTerminalLoading}
              className="rounded-full gap-2"
            >
              {verifyAtTerminalLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              Verify I&apos;m at terminal
            </Button>
          ))}
      </div>
    );
  }
  const disabledMessage =
    "You already have an active listing. Complete or remove it before posting a new one.";

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <Button
          onClick={onOpenWaitlist}
          disabled={postDisabled}
          className="h-12 px-8 rounded-full font-bold shadow-xl hover:-translate-y-0.5 transition-all bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-60 disabled:pointer-events-none disabled:hover:translate-y-0"
        >
          <Plane className="w-4 h-4 mr-2" />
          {joinWaitlistLabel}
        </Button>
        {postDisabled && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full shrink-0 border-border bg-muted text-foreground hover:bg-muted/80"
                aria-label="Why is this disabled?"
              >
                <Info className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              side="top"
              align="center"
              sideOffset={8}
              alignOffset={0}
              collisionPadding={16}
              className="w-[min(20rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] rounded-xl border-amber-500/20 bg-amber-50 dark:bg-amber-950/50 dark:border-amber-500/30 p-3 sm:p-4 shadow-lg"
            >
              <div className="flex gap-2 sm:gap-3">
                <div className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-xs sm:text-sm font-medium leading-relaxed text-amber-900 dark:text-amber-100 min-w-0">
                  {disabledMessage}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}
