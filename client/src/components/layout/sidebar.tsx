import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { 
  Stethoscope, 
  BarChart3, 
  UserPlus, 
  FlaskRound, 
  DollarSign, 
  Calculator,
  Wallet,
  Users, 
  FileText, 
  Shield, 
  Settings, 
  Database,
  LogOut,
  User,
  ClipboardList,
  MessageCircle,
  Award,
  Activity,
  Eye,
  Pill,
  Building,
  Monitor,
  Waves,
  Heart,
  Receipt
} from "lucide-react";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  const menuItems = [
    {
      section: "Main Modules",
      items: [
        { icon: BarChart3, label: "Dashboard", path: "/", active: location === "/" },
        { icon: ClipboardList, label: "Patient Intake", path: "/patient-intake", active: location === "/patient-intake" },
        { icon: UserPlus, label: "Patient Management", path: "/patient-management", active: location === "/patient-management" },
        { icon: FlaskRound, label: "Diagnostic Tests", path: "/diagnostic-tests", active: location === "/diagnostic-tests" },
        { icon: Receipt, label: "Invoices & Billing", path: "/invoice-management", active: location === "/invoice-management" },
        { icon: DollarSign, label: "Financial Management", path: "/financial-management", active: location === "/financial-management" },
        { icon: MessageCircle, label: "Notifications", path: "/notifications", active: location === "/notifications" },
        { icon: Award, label: "Staff Recognition", path: "/staff-recognition", active: location === "/staff-recognition" },
      ]
    },
    {
      section: "Service Units",
      items: [
        { icon: Activity, label: "Laboratory Management", path: "/laboratory-management", active: location === "/laboratory-management" },
        { icon: Eye, label: "Radiology Management", path: "/radiology-management", active: location === "/radiology-management" },
        { icon: Waves, label: "Ultrasound Dashboard", path: "/ultrasound-dashboard", active: location === "/ultrasound-dashboard" },
        { icon: Heart, label: "Cardiology Unit", path: "/cardiology-unit", active: location === "/cardiology-unit" },
        { icon: Pill, label: "Pharmacy Management", path: "/pharmacy-management", active: location === "/pharmacy-management" },
        { icon: Building, label: "Administrative Management", path: "/administrative-management", active: location === "/administrative-management" },
        { icon: DollarSign, label: "Financial Management", path: "/financial-management", active: location === "/financial-management" },
        { icon: FileText, label: "Purchase Orders", path: "/purchase-orders", active: location === "/purchase-orders" },
        { icon: Wallet, label: "Petty Cash", path: "/petty-cash", active: location === "/petty-cash" },
      ]
    },
    {
      section: "Administration",
      items: [
        { icon: Calculator, label: "Accounting", path: "/accounting", active: location === "/accounting" },
        { icon: Users, label: "Human Resources", path: "/hr", active: location === "/hr" },
      ]
    },
    {
      section: "Reports & Analytics",
      items: [
        { icon: FileText, label: "Reports", path: "/reports", active: location === "/reports" },
        { icon: Shield, label: "Audit Trail", path: "/audit", active: location === "/audit" },
      ]
    },
    {
      section: "System",
      items: [
        { icon: Settings, label: "Settings", path: "/settings", active: location === "/settings" },
        { icon: Database, label: "Backup & Recovery", path: "/backup", active: location === "/backup" },
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
                    <Link href={item.path}>
                      <button className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left ${
                        item.active 
                          ? "bg-medical-blue text-white font-medium" 
                          : "text-gray-700 hover:bg-gray-100"
                      }`}>
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    </Link>
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
