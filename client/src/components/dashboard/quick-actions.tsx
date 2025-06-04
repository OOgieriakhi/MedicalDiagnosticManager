import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarPlus, FileText, Package, CreditCard } from "lucide-react";

export default function QuickActions() {
  const actions = [
    {
      icon: CalendarPlus,
      title: "Schedule Test",
      description: "Book new diagnostic test",
      color: "blue",
      bgColor: "bg-blue-50",
      iconColor: "text-medical-blue"
    },
    {
      icon: FileText,
      title: "Generate Report",
      description: "Create financial or medical report",
      color: "green",
      bgColor: "bg-green-50",
      iconColor: "text-medical-green"
    },
    {
      icon: Package,
      title: "Manage Inventory",
      description: "Check supplies and equipment",
      color: "purple",
      bgColor: "bg-purple-50",
      iconColor: "text-purple-600"
    },
    {
      icon: CreditCard,
      title: "Payroll Management",
      description: "Process employee payments",
      color: "yellow",
      bgColor: "bg-yellow-50",
      iconColor: "text-yellow-600"
    }
  ];

  return (
    <Card className="bg-white border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              className="w-full flex items-center space-x-3 p-3 text-left rounded-lg hover:bg-gray-50 transition-colors h-auto justify-start"
            >
              <div className={`w-10 h-10 ${action.bgColor} rounded-lg flex items-center justify-center`}>
                <Icon className={`${action.iconColor} w-5 h-5`} />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{action.title}</p>
                <p className="text-xs text-slate-gray">{action.description}</p>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
