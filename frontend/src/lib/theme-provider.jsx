
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey="codebase-intelligence-theme"
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
