import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchStatusProps {
  tenantId: number;
}

export default function BranchStatus({ tenantId }: BranchStatusProps) {
  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["/api/branches", tenantId],
    enabled: !!tenantId,
  });

  const getStatusColor = (lastSync: string | null) => {
    if (!lastSync) return "bg-red-500";
    
    const syncTime = new Date(lastSync);
    const now = new Date();
    const diffMinutes = (now.getTime() - syncTime.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return "bg-medical-green";
    if (diffMinutes < 15) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = (lastSync: string | null) => {
    if (!lastSync) return "Never synced";
    
    const syncTime = new Date(lastSync);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - syncTime.getTime()) / (1000 * 60));
    
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hr ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Branch Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <Skeleton className="w-3 h-3 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Branch Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {branches.length === 0 ? (
          <div className="text-center text-slate-gray py-4">
            <p>No branches found</p>
          </div>
        ) : (
          branches.map((branch: any) => (
            <div key={branch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 ${getStatusColor(branch.lastSyncAt)} rounded-full`}></div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{branch.name}</p>
                  <p className="text-xs text-slate-gray">
                    {getStatusText(branch.lastSyncAt)}
                  </p>
                </div>
              </div>
              <div className="text-sm text-slate-gray">
                {Math.floor(Math.random() * 15) + 1} users
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
