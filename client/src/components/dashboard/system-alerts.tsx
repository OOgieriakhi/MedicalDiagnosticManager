import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SystemAlertsProps {
  tenantId: number;
}

export default function SystemAlerts({ tenantId }: SystemAlertsProps) {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["/api/alerts", tenantId],
    enabled: !!tenantId,
  });

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
      case "warning":
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case "error":
        return {
          bg: "bg-red-50",
          border: "border-red-200",
          icon: "text-medical-red",
          title: "text-red-900",
          message: "text-red-700"
        };
      case "warning":
        return {
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          icon: "text-yellow-600",
          title: "text-yellow-900",
          message: "text-yellow-700"
        };
      default:
        return {
          bg: "bg-blue-50",
          border: "border-blue-200",
          icon: "text-blue-600",
          title: "text-blue-900",
          message: "text-blue-700"
        };
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">System Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <Skeleton className="w-4 h-4 mt-0.5" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">System Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center text-slate-gray py-4">
            <Info className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No active alerts</p>
          </div>
        ) : (
          alerts.map((alert: any) => {
            const Icon = getAlertIcon(alert.type);
            const colors = getAlertColor(alert.type);
            
            return (
              <div
                key={alert.id}
                className={`flex items-start space-x-3 p-3 ${colors.bg} border ${colors.border} rounded-lg`}
              >
                <Icon className={`${colors.icon} text-sm mt-0.5 w-4 h-4`} />
                <div>
                  <p className={`text-sm font-medium ${colors.title}`}>
                    {alert.title}
                  </p>
                  <p className={`text-xs ${colors.message} mt-1`}>
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
