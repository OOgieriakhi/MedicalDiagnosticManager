import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { BrandingProvider } from "./lib/branding-context";
import { ErrorBoundary } from "./components/error-boundary";
import { DebugRouter } from "./components/debug-router";
function Router() {
  return <DebugRouter />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrandingProvider>
          <ThemeProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Router />
              </TooltipProvider>
            </AuthProvider>
          </ThemeProvider>
        </BrandingProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
