import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { Bell, Languages, Moon, Sun, ChevronDown, LogOut, Settings, UserRound, } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from '../../lib/i18n.jsx';
import NotificationPanel from '../notifications/NotificationPanel';
import { apiRequest } from '../../lib/api';

export default function AppNavbar({
  role = "user",
  user,
  onSignOut,
  signingOut = false,
  onNavigate,
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { language, setLanguage, t } = useLanguage();
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && theme === "dark";

  function toggleTheme() {
    setTheme(isDark ? "light" : "dark");
  }

  
  const refreshUnreadCount = useCallback(async () => {
    if (role !== "admin") return;

    try {
      const { count } = await apiRequest(
        "/api/notifications/unread-count",
      );
      setUnreadCount(count);
    } catch (error) {
      console.error(
        "Could not refresh notification count:",
        error.message,
      );
    }
  }, [role]);

  useEffect(() => {
    if (role !== "admin") {
      setUnreadCount(0);
      return undefined;
    }

    refreshUnreadCount();

    const intervalId = window.setInterval(
      refreshUnreadCount,
      10000,
    );

    window.addEventListener(
      "codesentinel-notifications-updated",
      refreshUnreadCount,
    );

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(
        "codesentinel-notifications-updated",
        refreshUnreadCount,
      );
    };
  }, [role, refreshUnreadCount]);

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
        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Choose language"
            title="Choose language"
            className="size-10 rounded-full"
            onClick={() => setLanguageOpen((open) => !open)}
          >
            <Languages className="size-5" />
          </Button>

          {languageOpen && (
            <div className="absolute right-0 top-12 z-50 w-40 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setLanguage("en");
                  setLanguageOpen(false);
                }}
              >
                English {language === "en" ? "✓" : ""}
              </button>

              <button
                type="button"
                className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  setLanguage("hi");
                  setLanguageOpen(false);
                }}
              >
                हिन्दी {language === "hi" ? "✓" : ""}
              </button>
            </div>
          )}
        </div>

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

        {role === 'admin' && (
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t('notifications')}
              title={t('notifications')}
              className="relative size-10 rounded-full"
              onClick={() => {
                setNotificationOpen((open) => !open);
                setLanguageOpen(false);
              }}
            >
              <Bell className="size-5" />

              {unreadCount > 0 && (
                <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            {notificationOpen && (
              <NotificationPanel
                onClose={() => {
                  setNotificationOpen(false);
                  refreshUnreadCount();
                }}
              />
            )}
          </div>
        )}

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
                {(user?.name || user?.email || role).slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <span className="hidden max-w-36 truncate text-sm sm:inline">
              {user?.name || user?.email || role}
            </span>

            <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <span className="block">{user?.name || "My Account"}</span>
              {user?.email && (
                <span className="mt-1 block max-w-44 truncate text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
              )}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={() => {
                setNotificationOpen(false);
                setLanguageOpen(false);
                onNavigate?.("/profile");
              }}
            >
              <UserRound className="mr-2 size-4" />
              {t("profile")}
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => {
                setNotificationOpen(false);
                setLanguageOpen(false);
                onNavigate?.("/settings");
              }}
            >
              <Settings className="mr-2 size-4" />
              {t("settings")}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              disabled={signingOut}
              onClick={() => onSignOut?.()}
            >
              <LogOut className="mr-2 size-4" />
              {signingOut ? t("signingOut") : t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
