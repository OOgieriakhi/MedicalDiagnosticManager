import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./hooks/use-theme";
import { BrandingProvider } from "./lib/branding-context";
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
import RadiologyManagement from "@/pages/radiology-management";
import PharmacyManagement from "@/pages/pharmacy-management";
import AdministrativeManagement from "@/pages/administrative-management";
import UltrasoundUnit from "@/pages/ultrasound-unit";
import CardiologyUnit from "@/pages/cardiology-unit";
import UltrasoundDashboard from "@/pages/ultrasound-dashboard";
import ComprehensiveFinancial from "@/pages/comprehensive-financial";
import PatientJourney from "@/pages/patient-journey";
import CashiersModule from "@/pages/cashiers-module";
import PurchaseOrders from "@/pages/purchase-orders";
import PettyCash from "@/pages/petty-cash";
import InventoryManagement from "@/pages/inventory-management";
import TestConsumptionManagement from "@/pages/test-consumption-management";
import TrainingSimulation from "@/pages/training-simulation";
import HumanResources from "@/pages/human-resources";
import RoleManagement from "@/pages/role-management";
import SecurityAudit from "@/pages/security-audit";
import CEODashboard from "@/pages/ceo-dashboard";
import GEDDashboard from "@/pages/ged-dashboard";
import MarketingManagement from "@/pages/marketing-management";
import BrandingManagement from "@/pages/branding-management";
import QualityAssurance from "@/pages/quality-assurance";
import ReferenceRanges from "@/pages/reference-ranges";
import ReportDesigner from "@/pages/report-designer";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <Dashboard />} />
      <ProtectedRoute path="/patient-intake" component={PatientIntake} />
      <ProtectedRoute path="/patient-management" component={PatientManagement} />
      <ProtectedRoute path="/financial-management" component={FinancialManagement} />
      <ProtectedRoute path="/invoice-management" component={InvoiceManagement} />
      <ProtectedRoute path="/notifications" component={NotificationCenter} />
      <ProtectedRoute path="/staff-recognition" component={StaffRecognition} />
      <ProtectedRoute path="/laboratory-management" component={LaboratoryManagement} />
      <ProtectedRoute path="/radiology-management" component={RadiologyManagement} />
      <ProtectedRoute path="/ultrasound-unit" component={UltrasoundUnit} />
      <ProtectedRoute path="/ultrasound-dashboard" component={UltrasoundDashboard} />
      <ProtectedRoute path="/cardiology-unit" component={CardiologyUnit} />
      <ProtectedRoute path="/pharmacy-management" component={PharmacyManagement} />
      <ProtectedRoute path="/administrative-management" component={AdministrativeManagement} />
      <ProtectedRoute path="/comprehensive-financial" component={ComprehensiveFinancial} />
      <ProtectedRoute path="/patient-journey" component={PatientJourney} />
      <ProtectedRoute path="/cashiers" component={CashiersModule} />
      <ProtectedRoute path="/purchase-orders" component={PurchaseOrders} />
      <ProtectedRoute path="/petty-cash" component={PettyCash} />
      <ProtectedRoute path="/inventory-management" component={InventoryManagement} />
      <ProtectedRoute path="/test-consumption-management" component={TestConsumptionManagement} />
      <ProtectedRoute path="/training-simulation" component={TrainingSimulation} />
      <ProtectedRoute path="/human-resources" component={HumanResources} />
      <ProtectedRoute path="/role-management" component={RoleManagement} />
      <ProtectedRoute path="/security-audit" component={SecurityAudit} />
      <ProtectedRoute path="/ceo-dashboard" component={CEODashboard} />
      <ProtectedRoute path="/ged-dashboard" component={GEDDashboard} />
      <ProtectedRoute path="/marketing" component={MarketingManagement} />
      <ProtectedRoute path="/branding-management" component={BrandingManagement} />
      <ProtectedRoute path="/quality-assurance" component={QualityAssurance} />
      <ProtectedRoute path="/reference-ranges" component={ReferenceRanges} />
      <ProtectedRoute path="/report-designer" component={ReportDesigner} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
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
  );
}

export default App;
