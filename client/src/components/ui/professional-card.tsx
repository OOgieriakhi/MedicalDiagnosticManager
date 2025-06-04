import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface ProfessionalCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "outline";
  children?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "secondary" | "outline" | "ghost";
  };
  className?: string;
  hoverable?: boolean;
  gradient?: boolean;
}

export function ProfessionalCard({
  title,
  description,
  icon: Icon,
  badge,
  badgeVariant = "default",
  children,
  action,
  className,
  hoverable = true,
  gradient = false
}: ProfessionalCardProps) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 shadow-sm bg-white/80 backdrop-blur-sm",
      hoverable && "transition-all duration-300 hover:shadow-lg hover:scale-[1.02]",
      gradient && "bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20",
      className
    )}>
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5" />
      )}
      
      <CardHeader className="relative pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="space-y-1">
              <CardTitle className="text-lg font-semibold text-gray-900 leading-tight">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-sm text-gray-600 leading-relaxed">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          {badge && (
            <Badge variant={badgeVariant} className="font-medium">
              {badge}
            </Badge>
          )}
        </div>
      </CardHeader>

      {children && (
        <CardContent className="relative pt-0">
          {children}
        </CardContent>
      )}

      {action && (
        <CardContent className="relative pt-0 pb-4">
          <Button
            variant={action.variant || "default"}
            onClick={action.onClick}
            className="w-full"
          >
            {action.label}
          </Button>
        </CardContent>
      )}
    </Card>
  );
}