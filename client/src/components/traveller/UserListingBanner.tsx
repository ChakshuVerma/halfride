import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

type UserListingBannerProps = {
  userDestination: string | null;
  isUserInGroup: boolean;
  initialDataFetchCompleted: boolean;
  joinWaitlistLabel: string;
  onOpenWaitlist: () => void;
};

export function UserListingBanner({
  userDestination,
  isUserInGroup,
  initialDataFetchCompleted,
  joinWaitlistLabel,
  onOpenWaitlist,
}: UserListingBannerProps) {
  if (!initialDataFetchCompleted) {
    return null;
  }

  const hasListing = !!userDestination;

  if (hasListing && !isUserInGroup) {
    return (
      <div className="inline-flex items-center gap-3 pl-4 pr-2 py-2 bg-zinc-50 text-zinc-900 rounded-full border border-zinc-200 animate-in zoom-in duration-300">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900" />
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
      <div className="inline-flex items-center gap-3 pl-4 pr-6 py-2 bg-zinc-50 text-zinc-900 rounded-full border border-zinc-200 animate-in zoom-in duration-300">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-900" />
        </div>
        <span className="text-sm font-medium">
          You are listed for{" "}
          <span className="font-bold">{userDestination}</span>
        </span>
      </div>
    );
  }

  return (
    <Button
      onClick={onOpenWaitlist}
      className="h-12 px-8 rounded-full font-bold shadow-xl shadow-zinc-300/40 hover:shadow-zinc-300/60 hover:-translate-y-0.5 transition-all bg-zinc-900 hover:bg-black text-white"
    >
      <Plane className="w-4 h-4 mr-2" />
      {joinWaitlistLabel}
    </Button>
  );
}

