import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle, Eye, Activity, Users, Clock, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DataGrid } from "@/components/ui/data-grid";
import { ProfessionalCard } from "@/components/ui/professional-card";
import { MetricDisplay } from "@/components/ui/metric-display";
import { format } from "date-fns";
import { Link } from "wouter";

type SecurityEvent = {
  id: number;
  eventType: string;
  userId: number;
  targetUserId?: number;
  resource?: string;
  action?: string;
  result: string;
  details: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  riskScore?: number;
  location?: string;
  timestamp: string;
};

type SecurityMetrics = {
  loginAttempts: Array<{ result: string; count: number }>;
  activeUsers: number;
  securityEvents: Array<{ eventType: string; count: number }>;
};

export default function SecurityAudit() {
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [eventTypeFilter, setEventTypeFilter] = useState("all");
  const [userIdFilter, setUserIdFilter] = useState("");

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

  // Fetch security audit trail
  const { data: auditTrail = [], isLoading: auditLoading } = useQuery<SecurityEvent[]>({
    queryKey: ["/api/security/audit", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      eventType: eventTypeFilter === "all" ? undefined : eventTypeFilter,
      userId: userIdFilter || undefined,
      limit: 1000
    }],
  });

  // Fetch security metrics
  const { data: metrics } = useQuery<SecurityMetrics>({
    queryKey: ["/api/security/metrics", {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    }],
  });

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
      case 'logout':
        return <Users className="h-4 w-4" />;
      case 'access_denied':
      case 'permission_denied':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'authorized_access':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'security_policy_violation':
        return <Shield className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getEventVariant = (result: string) => {
    switch (result) {
      case 'success':
        return 'default';
      case 'failure':
      case 'denied':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getRiskVariant = (riskScore?: number) => {
    if (!riskScore) return 'secondary';
    if (riskScore >= 70) return 'destructive';
    if (riskScore >= 40) return 'default';
    return 'secondary';
  };

  const auditColumns = [
    {
      key: "timestamp",
      label: "Time",
      render: (event: SecurityEvent) => (
        <div className="text-sm">
          {format(new Date(event.timestamp), "MMM dd, HH:mm:ss")}
        </div>
      ),
    },
    {
      key: "eventType",
      label: "Event",
      render: (event: SecurityEvent) => (
        <div className="flex items-center gap-2">
          {getEventIcon(event.eventType)}
          <span className="capitalize">{event.eventType.replace(/_/g, ' ')}</span>
        </div>
      ),
    },
    {
      key: "userId",
      label: "User",
      render: (event: SecurityEvent) => (
        <span className="font-mono text-sm">
          {event.userId || 'Anonymous'}
        </span>
      ),
    },
    {
      key: "resource",
      label: "Resource",
      render: (event: SecurityEvent) => (
        <span className="text-sm text-gray-600">
          {event.resource || '-'}
        </span>
      ),
    },
    {
      key: "result",
      label: "Result",
      render: (event: SecurityEvent) => (
        <Badge variant={getEventVariant(event.result)}>
          {event.result}
        </Badge>
      ),
    },
    {
      key: "riskScore",
      label: "Risk",
      render: (event: SecurityEvent) => (
        event.riskScore ? (
          <Badge variant={getRiskVariant(event.riskScore)}>
            {event.riskScore}
          </Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )
      ),
    },
    {
      key: "ipAddress",
      label: "IP Address",
      render: (event: SecurityEvent) => (
        <span className="font-mono text-xs text-gray-600">
          {event.ipAddress || '-'}
        </span>
      ),
    },
  ];

  const eventTypes = [
    "all",
    "login",
    "logout",
    "access_denied",
    "authorized_access",
    "permission_granted",
    "permission_revoked",
    "role_assigned",
    "role_revoked",
    "security_policy_violation",
    "mfa_device_added",
    "mfa_device_verified"
  ];

  const successfulLogins = metrics?.loginAttempts.find(la => la.result === 'success')?.count || 0;
  const failedLogins = metrics?.loginAttempts.find(la => la.result === 'failure')?.count || 0;
  const totalLogins = successfulLogins + failedLogins;
  const loginSuccessRate = totalLogins > 0 ? (successfulLogins / totalLogins) * 100 : 0;

  if (auditLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Security Audit</h1>
            <p className="text-gray-600 mt-1">Monitor security events and access patterns</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <ProfessionalCard>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="period">Time Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24 hours</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type === 'all' ? 'All Events' : type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="userId">User ID (optional)</Label>
              <Input
                id="userId"
                placeholder="Filter by user ID"
                value={userIdFilter}
                onChange={(e) => setUserIdFilter(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEventTypeFilter("all");
                  setUserIdFilter("");
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </ProfessionalCard>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricDisplay
          title="Active Users"
          value={metrics?.activeUsers || 0}
          subtitle="Last 24 hours"
          icon={<Users className="h-5 w-5 text-blue-600" />}
          variant="default"
        />

        <MetricDisplay
          title="Login Success Rate"
          value={`${loginSuccessRate.toFixed(1)}%`}
          subtitle={`${totalLogins} total attempts`}
          icon={<CheckCircle className="h-5 w-5 text-green-600" />}
          variant={loginSuccessRate >= 95 ? "success" : loginSuccessRate >= 85 ? "warning" : "error"}
        />

        <MetricDisplay
          title="Failed Logins"
          value={failedLogins}
          subtitle="Authentication failures"
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          variant={failedLogins === 0 ? "success" : failedLogins < 10 ? "warning" : "error"}
        />

        <MetricDisplay
          title="Security Events"
          value={auditTrail.length}
          subtitle={`Last ${selectedPeriod} days`}
          icon={<Shield className="h-5 w-5 text-purple-600" />}
          variant="default"
        />
      </div>

      {/* Main Content */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="analysis">Event Analysis</TabsTrigger>
          <TabsTrigger value="policies">Security Policies</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <ProfessionalCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Security Audit Trail
              </CardTitle>
              <CardDescription>
                Detailed log of all security-related events in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataGrid
                data={auditTrail}
                columns={auditColumns}
                searchKeys={["eventType", "resource", "ipAddress"]}
                pageSize={20}
              />
            </CardContent>
          </ProfessionalCard>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProfessionalCard>
              <CardHeader>
                <CardTitle>Event Types Distribution</CardTitle>
                <CardDescription>
                  Breakdown of security events by type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metrics?.securityEvents.map(({ eventType, count }) => (
                    <div key={eventType} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getEventIcon(eventType)}
                        <span className="text-sm capitalize">
                          {eventType.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-gray-500">No events in selected period</p>
                  )}
                </div>
              </CardContent>
            </ProfessionalCard>

            <ProfessionalCard>
              <CardHeader>
                <CardTitle>Login Analysis</CardTitle>
                <CardDescription>
                  Authentication attempt statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Successful Logins</span>
                    <span className="font-medium text-green-600">{successfulLogins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Failed Attempts</span>
                    <span className="font-medium text-red-600">{failedLogins}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Success Rate</span>
                    <Badge variant={loginSuccessRate >= 95 ? "default" : "destructive"}>
                      {loginSuccessRate.toFixed(1)}%
                    </Badge>
                  </div>
                  {failedLogins > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-sm font-medium text-red-900">
                          Security Alert
                        </span>
                      </div>
                      <p className="text-sm text-red-700 mt-1">
                        {failedLogins} failed login attempts detected. Monitor for potential security threats.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </ProfessionalCard>
          </div>
        </TabsContent>

        <TabsContent value="policies">
          <ProfessionalCard>
            <CardHeader>
              <CardTitle>Security Policy Status</CardTitle>
              <CardDescription>
                Current security policies and their enforcement status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium">Password Policy</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Strong password requirements enforced
                  </p>
                  <Badge variant="default" className="mt-2">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium">Session Policy</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Automatic session timeout after inactivity
                  </p>
                  <Badge variant="default" className="mt-2">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-purple-600" />
                    <h4 className="font-medium">Access Control</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Role-based permissions and time restrictions
                  </p>
                  <Badge variant="default" className="mt-2">Active</Badge>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-orange-600" />
                    <h4 className="font-medium">Audit Logging</h4>
                  </div>
                  <p className="text-sm text-gray-600">
                    Comprehensive security event logging
                  </p>
                  <Badge variant="default" className="mt-2">Active</Badge>
                </div>
              </div>
            </CardContent>
          </ProfessionalCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}