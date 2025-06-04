import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import PatientIntake from "@/pages/patient-intake";
import PatientManagement from "@/pages/patient-management";
import FinancialManagement from "@/pages/financial-management";
import NotificationCenter from "@/pages/notification-center";
import InvoiceManagement from "@/pages/invoice-management";
import StaffRecognition from "@/pages/staff-recognition";
import LaboratoryManagement from "@/pages/laboratory-management";
import CashiersModule from "@/pages/cashiers-module";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/patient-intake" component={PatientIntake} />
      <ProtectedRoute path="/patient-management" component={PatientManagement} />
      <ProtectedRoute path="/financial-management" component={FinancialManagement} />
      <ProtectedRoute path="/invoice-management" component={InvoiceManagement} />
      <ProtectedRoute path="/notifications" component={NotificationCenter} />
      <ProtectedRoute path="/staff-recognition" component={StaffRecognition} />
      <ProtectedRoute path="/laboratory" component={LaboratoryManagement} />
      <ProtectedRoute path="/cashiers" component={CashiersModule} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
