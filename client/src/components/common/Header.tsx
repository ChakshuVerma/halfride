import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings, ChevronDown } from "lucide-react"; // Added icons for visual fullness
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "./NotificationBell";
import { useState } from "react";
import { cn } from "@/lib/utils";

const HEADER_CONSTANTS = {
  BRAND: "HalfRide",
  MENU: {
    PROFILE: "Profile",
    SETTINGS: "Settings",
    LOGOUT: "Log out",
  },
  ERRORS: {
    LOGOUT_FAILED: "Logout failed",
  },
};

export function Header() {
  const { user, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error(HEADER_CONSTANTS.ERRORS.LOGOUT_FAILED, error);
    }
  };

  if (!user) return null;

  // Helper for display name
  const fullName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ""}`
    : user.username;

  // Helper for initials
  const initials = userProfile?.firstName
    ? userProfile.firstName.charAt(0).toUpperCase()
    : user.username.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between mx-auto md:px-6 px-4">
        {/* --- Left: Brand / Logo --- */}
        <div
          className="flex items-center gap-2.5 cursor-pointer group select-none"
          onClick={() => navigate("/dashboard")}
        >
          {/* Logo Icon */}
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/25 group-hover:shadow-md">
            <span className="text-primary-foreground font-bold text-lg leading-none">
              {HEADER_CONSTANTS.BRAND.charAt(0)}
            </span>
            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-black/10 dark:ring-white/10" />
          </div>
          {/* Logo Text */}
          <span className="font-bold text-lg tracking-tight text-foreground transition-opacity group-hover:opacity-90">
            {HEADER_CONSTANTS.BRAND}
          </span>
        </div>

        {/* --- Right: Actions --- */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Notification Bell */}
          <NotificationBell />

          {/* Divider (Hidden on mobile) */}
          <div className="hidden sm:block h-6 w-px bg-border/60" />

          {/* Profile Menu */}
          <Popover open={isProfileOpen} onOpenChange={setIsProfileOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "relative h-10 rounded-full pl-2 pr-4 gap-2 hover:bg-secondary/50 transition-all",
                  "focus-visible:ring-2 focus-visible:ring-primary/20",
                  isProfileOpen && "bg-secondary/50",
                )}
              >
                {/* Avatar Circle */}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs ring-2 ring-background shadow-sm">
                  {initials}
                </div>

                {/* Name (Hidden on very small screens) */}
                <span className="hidden md:flex flex-col items-start text-sm">
                  <span className="font-medium leading-none truncate max-w-[100px]">
                    {userProfile?.firstName || user.username}
                  </span>
                </span>

                <ChevronDown
                  className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform duration-200 ml-1 hidden md:block",
                    isProfileOpen && "rotate-180",
                  )}
                />
              </Button>
            </PopoverTrigger>

            <PopoverContent
              align="end"
              className="w-64 p-1 shadow-xl border-border/50"
              sideOffset={8}
            >
              {/* Popover Header: User Info */}
              <div className="flex items-center gap-3 p-3 mb-1 bg-muted/40 rounded-md border border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border border-border text-primary font-bold shadow-sm">
                  {initials}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {fullName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate font-normal">
                    {user.username}
                  </p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="flex flex-col gap-1 px-1">
                {/* Visual Placeholders for "Pro" feel - buttons don't need to do anything yet */}
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                >
                  <User className="mr-2 h-4 w-4 opacity-70" />
                  {HEADER_CONSTANTS.MENU.PROFILE}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 px-2 text-sm font-normal text-muted-foreground hover:text-foreground"
                >
                  <Settings className="mr-2 h-4 w-4 opacity-70" />
                  {HEADER_CONSTANTS.MENU.SETTINGS}
                </Button>
              </div>

              <div className="h-px bg-border/50 my-1 mx-2" />

              {/* Logout */}
              <div className="px-1 pb-1">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-9 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {HEADER_CONSTANTS.MENU.LOGOUT}
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
