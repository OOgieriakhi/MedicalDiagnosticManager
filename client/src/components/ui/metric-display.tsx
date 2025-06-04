import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricDisplayProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
}

export function MetricDisplay({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  className,
  variant = "default",
  size = "md"
}: MetricDisplayProps) {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    if (change > 0) return TrendingUp;
    if (change < 0) return TrendingDown;
    return Minus;
  };

  const getTrendColor = () => {
    if (change === undefined) return "text-gray-500";
    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-500";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-l-4 border-l-green-500 bg-green-50/50";
      case "warning":
        return "border-l-4 border-l-yellow-500 bg-yellow-50/50";
      case "danger":
        return "border-l-4 border-l-red-500 bg-red-50/50";
      default:
        return "border-l-4 border-l-blue-500 bg-blue-50/50";
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return "p-4";
      case "lg":
        return "p-8";
      default:
        return "p-6";
    }
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card className={cn(
      "transition-all duration-300 hover:shadow-md border-0 shadow-sm",
      getVariantStyles(),
      className
    )}>
      <CardContent className={getSizeStyles()}>
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className={cn(
              "font-medium text-gray-600",
              size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"
            )}>
              {title}
            </p>
            <p className={cn(
              "font-bold text-gray-900",
              size === "sm" ? "text-lg" : size === "lg" ? "text-4xl" : "text-2xl"
            )}>
              {value}
            </p>
            {change !== undefined && (
              <div className={cn("flex items-center space-x-1", getTrendColor())}>
                {TrendIcon && <TrendIcon className="w-4 h-4" />}
                <span className={cn(
                  "font-medium",
                  size === "sm" ? "text-xs" : "text-sm"
                )}>
                  {Math.abs(change)}%
                  {changeLabel && ` ${changeLabel}`}
                </span>
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn(
              "p-3 rounded-full bg-white/80 text-gray-700",
              size === "sm" ? "p-2" : size === "lg" ? "p-4" : "p-3"
            )}>
              <Icon className={cn(
                size === "sm" ? "w-4 h-4" : size === "lg" ? "w-8 h-8" : "w-6 h-6"
              )} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}