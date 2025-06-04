import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Stethoscope, 
  BarChart3, 
  UserPlus, 
  FlaskRound, 
  DollarSign, 
  Calculator, 
  Users, 
  FileText, 
  Shield, 
  Settings, 
  Database,
  LogOut,
  User
} from "lucide-react";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();

  const menuItems = [
    {
      section: "Main Modules",
      items: [
        { icon: BarChart3, label: "Dashboard", active: true },
        { icon: UserPlus, label: "Patient Management" },
        { icon: FlaskRound, label: "Diagnostic Tests" },
        { icon: DollarSign, label: "Financial Management" },
        { icon: Calculator, label: "Accounting" },
        { icon: Users, label: "Human Resources" },
      ]
    },
    {
      section: "Reports & Analytics",
      items: [
        { icon: FileText, label: "Reports" },
        { icon: Shield, label: "Audit Trail" },
      ]
    },
    {
      section: "System",
      items: [
        { icon: Settings, label: "Settings" },
        { icon: Database, label: "Backup & Recovery" },
      ]
    }
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-r border-gray-200 flex flex-col">
      {/* Logo and System Info */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-medical-blue rounded-lg flex items-center justify-center">
            <Stethoscope className="text-white text-lg" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Orient Medical</h2>
            <p className="text-sm text-slate-gray">Diagnostic Center</p>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-medical-green rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-green-800">System Online</span>
          </div>
          <p className="text-xs text-green-600 mt-1">Last sync: 2 minutes ago</p>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto py-6">
        {menuItems.map((section, sectionIndex) => (
          <div key={sectionIndex} className="px-6 mb-8">
            <h3 className="text-xs font-semibold text-slate-gray uppercase tracking-wide mb-3">
              {section.section}
            </h3>
            <ul className="space-y-2">
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                return (
                  <li key={itemIndex}>
                    <button className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      item.active 
                        ? "bg-medical-blue text-white font-medium" 
                        : "text-gray-700 hover:bg-gray-100"
                    }`}>
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile Section */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-slate-gray rounded-full flex items-center justify-center">
            <User className="text-white w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-slate-gray truncate">{user?.role}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="text-slate-gray hover:text-gray-900"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
