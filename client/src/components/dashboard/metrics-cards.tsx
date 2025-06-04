import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, FlaskRound, DollarSign, Users, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsCardsProps {
  branchId: number;
}

export default function MetricsCards({ branchId }: MetricsCardsProps) {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/dashboard/metrics", branchId],
    enabled: !!branchId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const metricCards = [
    {
      title: "Today's Patients",
      value: metrics?.todayPatients || 0,
      change: "+12%",
      changeText: "from yesterday",
      icon: UserPlus,
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-medical-blue"
    },
    {
      title: "Pending Tests",
      value: metrics?.pendingTests || 0,
      change: "45 min",
      changeText: "avg wait",
      icon: Clock,
      color: "yellow",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600"
    },
    {
      title: "Today's Revenue",
      value: `₦${(metrics?.todayRevenue || 0).toLocaleString()}`,
      change: "+8.2%",
      changeText: "from yesterday",
      icon: DollarSign,
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-medical-green"
    },
    {
      title: "Active Staff",
      value: metrics?.activeStaff || 0,
      change: "42 total",
      changeText: "employees",
      icon: Users,
      color: "purple",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card key={index} className="bg-white border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-gray text-sm font-medium">{metric.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  <p className="text-medical-green text-sm mt-1">
                    {metric.color === "green" && <TrendingUp className="inline w-3 h-3 mr-1" />}
                    {metric.color === "yellow" && <Clock className="inline w-3 h-3 mr-1" />}
                    {metric.color === "blue" && <TrendingUp className="inline w-3 h-3 mr-1" />}
                    <span className={
                      metric.color === "green" ? "text-medical-green" :
                      metric.color === "yellow" ? "text-yellow-600" :
                      metric.color === "blue" ? "text-medical-green" :
                      "text-slate-gray"
                    }>
                      {metric.change}
                    </span> {metric.changeText}
                  </p>
                </div>
                <div className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}>
                  <Icon className={`${metric.iconColor} text-xl w-6 h-6`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
