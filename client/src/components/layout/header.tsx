import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, UserPlus } from "lucide-react";

interface HeaderProps {
  selectedBranchId: number;
  onBranchChange: (branchId: number) => void;
}

export default function Header({ selectedBranchId, onBranchChange }: HeaderProps) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const { data: branches = [] } = useQuery({
    queryKey: ["/api/branches", user?.tenantId],
    enabled: !!user?.tenantId,
  });

  const selectedBranch = branches.find((b: any) => b.id === selectedBranchId);

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          
          {/* Branch Selector */}
          <div className="flex items-center space-x-2">
            <Select 
              value={selectedBranchId.toString()} 
              onValueChange={(value) => onBranchChange(parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch: any) => (
                  <SelectItem key={branch.id} value={branch.id.toString()}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Quick Actions */}
          <Button className="bg-medical-blue text-white hover:bg-blue-700">
            <UserPlus className="mr-2 w-4 h-4" />
            Add Patient
          </Button>
          
          {/* Notifications */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-medical-red text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
          </div>

          {/* Sync Status */}
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-medical-green rounded-full"></div>
            <span className="text-slate-gray">All branches synced</span>
          </div>
        </div>
      </div>
    </header>
  );
}
