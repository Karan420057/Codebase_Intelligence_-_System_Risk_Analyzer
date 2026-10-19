
import Navbar from "./Navbar";
import Sider from "./Sider";

export default function DashboardLayout({
  role = "user",
  user,
  onSignOut,
  signingOut = false,
  currentPath,
  repositories = [],
  onNavigate,
  children,
}) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Navbar
        role={role}
        user={user}
        onSignOut={onSignOut}
        signingOut={signingOut}
      />

      <div className="flex">
        <Sider
          role={role}
          currentPath={currentPath}
          repositories={repositories}
          onNavigate={onNavigate}
        />

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
