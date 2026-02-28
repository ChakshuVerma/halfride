import { Plane, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type UserListingBannerProps = {
  userDestination: string | null;
  isUserInGroup: boolean;
  userGroupId: string | null;
  userReadyToOnboard: boolean;
  initialDataFetchCompleted: boolean;
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
  joinWaitlistLabel,
  onOpenWaitlist,
  onVerifyAtTerminal,
  verifyAtTerminalLoading = false,
}: UserListingBannerProps) {
  if (!initialDataFetchCompleted) {
    return null;
  }

  const hasListing = !!userDestination;

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
        {userGroupId && onVerifyAtTerminal && (
          userReadyToOnboard ? (
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
          )
        )}
      </div>
    );
  }

  return (
    <Button
      onClick={onOpenWaitlist}
      className="h-12 px-8 rounded-full font-bold shadow-xl hover:-translate-y-0.5 transition-all bg-primary hover:bg-primary/90 text-primary-foreground"
    >
      <Plane className="w-4 h-4 mr-2" />
      {joinWaitlistLabel}
    </Button>
  );
}

