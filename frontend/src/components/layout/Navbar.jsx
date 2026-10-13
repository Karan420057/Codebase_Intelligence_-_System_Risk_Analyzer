
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Bell,
  Languages,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  Settings,
  UserRound,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export default function AppNavbar({ role = "user" }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  const profileTriggerClass = buttonVariants({
    variant: "ghost",
    className: "h-10 gap-2 rounded-full px-1.5 sm:px-2",
  });

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <span className="text-sm font-bold">CI</span>
        </div>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold sm:text-base">
            Codebase Intelligence
          </h1>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Software Risk Analysis Platform
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Language options"
          title="Language settings"
          className="size-10 rounded-full"
          onClick={() => {
            // Connect language selection when localization is added.
          }}
        >
          <Languages className="size-5" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={
            isDark ? "Switch to Light Mode" : "Switch to Dark Mode"
          }
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          onClick={toggleTheme}
          className="size-10 rounded-full transition-colors hover:bg-accent"
        >
          {isDark ? (
            <Sun className="size-5" />
          ) : (
            <Moon className="size-5" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          title="Notifications"
          className="size-10 rounded-full"
          onClick={() => {
            // Connect notifications when implemented.
          }}
        >
          <Bell className="size-5" />
        </Button>

        <Separator
          orientation="vertical"
          className="mx-1 hidden h-7 sm:block"
        />

        <DropdownMenu>
          <DropdownMenuTrigger
            className={profileTriggerClass}
            aria-label="Open profile menu"
          >
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {role === "admin" ? "A" : "U"}
              </AvatarFallback>
            </Avatar>

            <span className="hidden text-sm capitalize sm:inline">
              {role}
            </span>

            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              {role === "admin" ? "Administrator" : "My Account"}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <UserRound className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                // Connect to your authentication logout handler.
              }}
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
