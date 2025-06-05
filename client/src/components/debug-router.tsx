import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import { Loader2 } from "lucide-react";

export function DebugRouter() {
  const [location] = useLocation();
  const { user, isLoading, error } = useAuth();

  console.log('Debug Router - Location:', location);
  console.log('Debug Router - User:', user);
  console.log('Debug Router - IsLoading:', isLoading);
  console.log('Debug Router - Error:', error);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading Orient Medical ERP...</p>
        </div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!user) {
    return <AuthPage />;
  }

  // Show dashboard if authenticated
  return <Dashboard />;
}