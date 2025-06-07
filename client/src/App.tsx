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
import PatientBilling from "@/pages/patient-billing";
import DailyTransactionViewer from "@/pages/daily-transaction-viewer";
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
import CardiologyDashboard from "@/pages/cardiology-dashboard";
import ComprehensiveFinancial from "@/pages/comprehensive-financial";
import PatientJourney from "@/pages/patient-journey";
import CashiersModule from "@/pages/cashiers-module";
import PurchaseOrders from "@/pages/purchase-orders";
import PettyCash from "@/pages/petty-cash";
import InventoryManagement from "@/pages/inventory-management";
import InventoryDashboard from "@/pages/inventory-dashboard";
import TestConsumptionManagement from "@/pages/test-consumption-management";
import TrainingSimulation from "@/pages/training-simulation";
import HumanResources from "@/pages/human-resources";
import RoleManagement from "@/pages/role-management";
import SecurityAudit from "@/pages/security-audit";
import CEODashboard from "@/pages/ceo-dashboard";
import FinanceDirectorDashboard from "@/pages/finance-director-dashboard";
import GEDDashboard from "@/pages/ged-dashboard";
import MarketingManagement from "@/pages/marketing-management";
import BrandingManagement from "@/pages/branding-management";
import QualityAssurance from "@/pages/quality-assurance";
import ReferenceRanges from "@/pages/reference-ranges";
import ReportDesigner from "@/pages/report-designer";
import PredictiveRecommendations from "@/pages/predictive-recommendations";
import WaitingRoomQueue from "@/pages/waiting-room-queue";
import AccountingDashboard from "@/pages/accounting-dashboard";
import RoleBasedDashboard from "@/pages/role-based-dashboard";
import SidebarDashboard from "@/pages/sidebar-dashboard";
import ApprovalTracking from "@/pages/approval-tracking";
import AccountantDashboard from "@/pages/accountant-dashboard";
import CashierDashboard from "@/pages/cashier-dashboard";
import GoodsReceipt from "@/pages/goods-receipt";
import InvoiceMatching from "@/pages/invoice-matching";
import PaymentOrders from "@/pages/payment-orders";
import PurchaseOrderApprovals from "@/pages/purchase-order-approvals";
import TransactionVerificationDashboard from "@/pages/transaction-verification-dashboard";
import BankDepositRecording from "@/pages/bank-deposit-recording";
import { RevenueForecastingPage } from "@/pages/revenue-forecasting-page";
import EnhancedForecastingPage from "@/pages/enhanced-forecasting-page";
import ChartOfAccounts from "@/pages/chart-of-accounts";
import BankReconciliation from "@/pages/bank-reconciliation";
import GeneralLedger from "@/pages/general-ledger";
import TrialBalance from "@/pages/trial-balance";
import AccountsPayable from "@/pages/accounts-payable";
import AccountsReceivable from "@/pages/accounts-receivable";
import CashFlow from "@/pages/cash-flow";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={() => <SidebarDashboard />} />
      <ProtectedRoute path="/dashboard" component={Dashboard} />
      <ProtectedRoute path="/patient-intake" component={PatientIntake} />
      <ProtectedRoute path="/patient-management" component={PatientManagement} />
      <ProtectedRoute path="/patients" component={PatientManagement} />
      <ProtectedRoute path="/patient-billing" component={PatientBilling} />
      <ProtectedRoute path="/daily-transactions" component={DailyTransactionViewer} />
      <ProtectedRoute path="/financial-management" component={FinancialManagement} />
      <ProtectedRoute path="/invoice-management" component={InvoiceManagement} />
      <ProtectedRoute path="/notifications" component={NotificationCenter} />
      <ProtectedRoute path="/staff-recognition" component={StaffRecognition} />
      <ProtectedRoute path="/laboratory-management" component={LaboratoryManagement} />
      <ProtectedRoute path="/radiology-management" component={RadiologyManagement} />
      <ProtectedRoute path="/ultrasound-unit" component={UltrasoundUnit} />
      <ProtectedRoute path="/ultrasound-dashboard" component={UltrasoundDashboard} />
      <ProtectedRoute path="/cardiology-unit" component={CardiologyUnit} />
      <ProtectedRoute path="/cardiology-dashboard" component={CardiologyDashboard} />
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
      <ProtectedRoute path="/finance-director-dashboard" component={FinanceDirectorDashboard} />
      <ProtectedRoute path="/ged-dashboard" component={GEDDashboard} />
      <ProtectedRoute path="/marketing" component={MarketingManagement} />
      <ProtectedRoute path="/branding-management" component={BrandingManagement} />
      <ProtectedRoute path="/quality-assurance" component={QualityAssurance} />
      <ProtectedRoute path="/reference-ranges" component={ReferenceRanges} />
      <ProtectedRoute path="/report-designer" component={ReportDesigner} />
      <ProtectedRoute path="/predictive-recommendations" component={PredictiveRecommendations} />
      <ProtectedRoute path="/waiting-room-queue" component={WaitingRoomQueue} />
      <ProtectedRoute path="/accounting-dashboard" component={AccountingDashboard} />
      <ProtectedRoute path="/approval-tracking" component={ApprovalTracking} />
      <ProtectedRoute path="/accountant-dashboard" component={AccountantDashboard} />
      <ProtectedRoute path="/cashier-dashboard" component={CashierDashboard} />
      <ProtectedRoute path="/inventory-dashboard" component={InventoryDashboard} />
      <ProtectedRoute path="/goods-receipt" component={GoodsReceipt} />
      <ProtectedRoute path="/invoice-matching" component={InvoiceMatching} />
      <ProtectedRoute path="/payment-orders" component={PaymentOrders} />
      <ProtectedRoute path="/purchase-order-approvals" component={PurchaseOrderApprovals} />
      <ProtectedRoute path="/transaction-verification" component={TransactionVerificationDashboard} />
      <ProtectedRoute path="/bank-deposit-recording" component={BankDepositRecording} />
      <ProtectedRoute path="/revenue-forecasting" component={RevenueForecastingPage} />
      <ProtectedRoute path="/enhanced-forecasting" component={EnhancedForecastingPage} />
      <ProtectedRoute path="/chart-of-accounts" component={ChartOfAccounts} />
      <ProtectedRoute path="/bank-reconciliation" component={BankReconciliation} />
      <ProtectedRoute path="/general-ledger" component={GeneralLedger} />
      <ProtectedRoute path="/trial-balance" component={TrialBalance} />
      <ProtectedRoute path="/accounts-payable" component={AccountsPayable} />
      <ProtectedRoute path="/accounts-receivable" component={AccountsReceivable} />
      <ProtectedRoute path="/cash-flow" component={CashFlow} />
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
