
import Navbar from "./Navbar";
import Sider from "./Sider";

export default function DashboardLayout({
  role = "user",
  user,
  onSignOut,
  signingOut = false,
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
        <Sider role={role} />

        <main className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
