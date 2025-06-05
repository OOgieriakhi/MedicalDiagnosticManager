import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import MetricsCards from "@/components/dashboard/metrics-cards";
import RecentPatients from "@/components/dashboard/recent-patients";
import BranchStatus from "@/components/dashboard/branch-status";
import QuickActions from "@/components/dashboard/quick-actions";
import SystemAlerts from "@/components/dashboard/system-alerts";
import { MessageNotification } from "@/components/message-notification";

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedBranchId, setSelectedBranchId] = useState(user?.branchId || 1);

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-light-bg">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b bg-white">
          <Header 
            selectedBranchId={selectedBranchId} 
            onBranchChange={setSelectedBranchId}
          />
          <MessageNotification />
        </div>
        
        <main className="flex-1 overflow-y-auto p-6">
          <MetricsCards branchId={selectedBranchId} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            <div className="lg:col-span-2">
              <RecentPatients branchId={selectedBranchId} />
            </div>
            
            <div className="space-y-6">
              <BranchStatus tenantId={user.tenantId} />
              <QuickActions />
              <SystemAlerts tenantId={user.tenantId} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
