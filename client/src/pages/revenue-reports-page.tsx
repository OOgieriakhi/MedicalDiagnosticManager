import { useAuth } from "@/hooks/use-auth";
import { RevenueReports } from "@/components/revenue-reports";

export default function RevenueReportsPage() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Revenue Reports & Analytics</h1>
        <p className="text-muted-foreground">
          Comprehensive financial reporting and analysis tools for revenue tracking
        </p>
      </div>
      
      <RevenueReports branchId={user?.branchId} />
    </div>
  );
}