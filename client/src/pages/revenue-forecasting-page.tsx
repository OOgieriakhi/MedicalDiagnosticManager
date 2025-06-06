import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RevenueForecasting } from "@/components/revenue-forecasting";

export function RevenueForecastingPage() {
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Revenue Forecasting</h1>
          <p className="text-muted-foreground">
            Intelligent predictive insights using machine learning for revenue forecasting
          </p>
        </div>
      </div>

      <RevenueForecasting branchId={user?.branchId} />
    </div>
  );
}