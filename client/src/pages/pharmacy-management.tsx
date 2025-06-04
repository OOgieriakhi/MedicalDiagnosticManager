import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Pill,
  Package,
  AlertTriangle,
  Clock,
  CheckCircle,
  TrendingDown,
  Calendar,
  Users,
  FileText,
  Shield,
  Thermometer,
  Eye,
  Download,
  Plus,
  Search,
  Filter,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

export default function PharmacyManagement() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("today");
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Pharmacy metrics query
  const { data: pharmacyMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/pharmacy/metrics", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await fetch(`/api/pharmacy/metrics?${params}`);
      if (!response.ok) throw new Error("Failed to fetch pharmacy metrics");
      return response.json();
    },
    enabled: !!user?.branchId,
    staleTime: 0,
  });

  // Inventory status query
  const { data: inventoryStatus } = useQuery({
    queryKey: ["/api/pharmacy/inventory", user?.branchId, selectedCategory, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (selectedCategory !== "all") params.append('category', selectedCategory);
      if (searchTerm) params.append('search', searchTerm);
      params.append('limit', '100');
      
      const response = await fetch(`/api/pharmacy/inventory?${params}`);
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  // Recent prescriptions query
  const { data: recentPrescriptions } = useQuery({
    queryKey: ["/api/pharmacy/prescriptions", user?.branchId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', '50');
      
      const response = await fetch(`/api/pharmacy/prescriptions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch prescriptions");
      return response.json();
    },
    enabled: !!user?.branchId,
    staleTime: 0,
  });

  // Expiring medications query
  const { data: expiringMedications } = useQuery({
    queryKey: ["/api/pharmacy/expiring", user?.branchId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (user?.branchId) params.append('branchId', user.branchId.toString());
      params.append('days', '30'); // Next 30 days
      
      const response = await fetch(`/api/pharmacy/expiring?${params}`);
      if (!response.ok) throw new Error("Failed to fetch expiring medications");
      return response.json();
    },
    enabled: !!user?.branchId,
  });

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
    const today = new Date();
    
    switch (range) {
      case "today":
        setStartDate(today.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "yesterday":
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        setStartDate(yesterday.toISOString().split('T')[0]);
        setEndDate(yesterday.toISOString().split('T')[0]);
        break;
      case "week":
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 7);
        setStartDate(weekStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
      case "month":
        const monthStart = new Date(today);
        monthStart.setDate(1);
        setStartDate(monthStart.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        break;
    }
  };

  const getStockStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'in-stock': return 'text-green-600';
      case 'low-stock': return 'text-yellow-600';
      case 'out-of-stock': return 'text-red-600';
      case 'expired': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getStockStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'in-stock': 'bg-green-100 text-green-800',
      'low-stock': 'bg-yellow-100 text-yellow-800',
      'out-of-stock': 'bg-red-100 text-red-800',
      'expired': 'bg-gray-100 text-gray-800'
    };
    
    return variants[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const getPrescriptionStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'verified': 'bg-blue-100 text-blue-800',
      'dispensed': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800'
    };
    
    return variants[status.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Management</h1>
            <p className="text-gray-600">Medication inventory, prescriptions, and dispensing workflow</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Sync Inventory
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Prescription
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Pharmacy Period
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Quick Range:</Label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last 7 Days</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate">From:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate">To:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label>Category:</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="antibiotics">Antibiotics</SelectItem>
                  <SelectItem value="analgesics">Analgesics</SelectItem>
                  <SelectItem value="vitamins">Vitamins</SelectItem>
                  <SelectItem value="cardiovascular">Cardiovascular</SelectItem>
                  <SelectItem value="diabetes">Diabetes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Search:</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Medication name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pharmacy Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Prescriptions</p>
                <p className="text-2xl font-bold text-blue-600">
                  {metricsLoading ? "..." : (pharmacyMetrics?.totalPrescriptions || 0)}
                </p>
                <p className="text-xs text-blue-600">
                  {pharmacyMetrics?.dispensedRate || 0}% dispensed
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {pharmacyMetrics?.lowStockItems || 0}
                </p>
                <p className="text-xs text-yellow-600">
                  {pharmacyMetrics?.outOfStockItems || 0} out of stock
                </p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Revenue Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(pharmacyMetrics?.dailyRevenue || 0)}
                </p>
                <p className="text-xs text-green-600">
                  {pharmacyMetrics?.dailyTransactions || 0} transactions
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-red-600">
                  {pharmacyMetrics?.expiringMedications || 0}
                </p>
                <p className="text-xs text-red-600">
                  Next 30 days
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="prescriptions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prescriptions">Prescriptions</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="expiring">Expiring Items</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="prescriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPrescriptions?.map((prescription: any) => (
                  <div key={prescription.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">Rx #{prescription.prescriptionNumber}</p>
                        <p className="text-sm text-gray-600">{prescription.patientName} • {prescription.doctorName}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(prescription.prescribedAt).toLocaleDateString()} at{' '}
                          {new Date(prescription.prescribedAt).toLocaleTimeString()}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-medium">Medications:</span>
                          <span className="text-xs text-gray-600">{prescription.medicationCount} items</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{formatCurrency(prescription.totalAmount)}</p>
                        <p className="text-xs text-gray-500">
                          {prescription.insuranceCovered ? 'Insurance' : 'Self-pay'}
                        </p>
                      </div>
                      <Badge className={getPrescriptionStatusBadge(prescription.status)}>
                        {prescription.status.toUpperCase()}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Medication Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {inventoryStatus?.map((medication: any) => (
                  <div key={medication.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Pill className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-medium">{medication.name}</p>
                        <p className="text-sm text-gray-600">{medication.genericName}</p>
                        <p className="text-xs text-gray-500">
                          {medication.strength} • {medication.dosageForm}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs">Batch: {medication.batchNumber}</span>
                          <span className="text-xs">Exp: {new Date(medication.expiryDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">Stock: {medication.currentStock}</p>
                        <p className="text-xs text-gray-500">Min: {medication.minimumStock}</p>
                        <p className="text-xs font-medium">{formatCurrency(medication.unitPrice)}</p>
                      </div>
                      <Badge className={getStockStatusBadge(medication.stockStatus)}>
                        {medication.stockStatus.replace('-', ' ').toUpperCase()}
                      </Badge>
                      {medication.temperatureControlled && (
                        <div className="p-1 bg-blue-100 rounded" title="Temperature Controlled">
                          <Thermometer className="w-3 h-3 text-blue-600" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expiring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Medications Expiring Soon
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expiringMedications?.map((medication: any) => (
                  <div key={medication.id} className="flex items-center justify-between p-4 border rounded-lg border-orange-200 bg-orange-50">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <AlertTriangle className="w-4 h-4 text-orange-600" />
                      </div>
                      <div>
                        <p className="font-medium">{medication.name}</p>
                        <p className="text-sm text-gray-600">Batch: {medication.batchNumber}</p>
                        <p className="text-xs text-gray-500">
                          Current Stock: {medication.currentStock} units
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">
                        Expires: {new Date(medication.expiryDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-red-600">
                        {medication.daysUntilExpiry} days remaining
                      </p>
                      <p className="text-xs text-gray-600">
                        Value: {formatCurrency(medication.stockValue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Medications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pharmacyMetrics?.topSellingMedications?.map((med: any, index: number) => (
                    <div key={med.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{med.name}</p>
                          <p className="text-sm text-gray-600">{med.quantitySold} units sold</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(med.revenue)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Drug Interaction Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Alerts Today</span>
                    <span className="font-bold text-red-600">{pharmacyMetrics?.drugInteractionAlerts?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>High Severity</span>
                    <span className="font-bold text-red-600">{pharmacyMetrics?.drugInteractionAlerts?.high || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Medium Severity</span>
                    <span className="font-bold text-yellow-600">{pharmacyMetrics?.drugInteractionAlerts?.medium || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Low Severity</span>
                    <span className="font-bold text-green-600">{pharmacyMetrics?.drugInteractionAlerts?.low || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insurance Claims</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Claims Processed</span>
                    <span className="font-bold">{pharmacyMetrics?.insuranceClaims?.processed || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Claims Approved</span>
                    <span className="font-bold text-green-600">{pharmacyMetrics?.insuranceClaims?.approved || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Claims Rejected</span>
                    <span className="font-bold text-red-600">{pharmacyMetrics?.insuranceClaims?.rejected || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Approval Rate</span>
                    <span className="font-bold text-blue-600">{pharmacyMetrics?.insuranceClaims?.approvalRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Controlled Substances</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Controlled substances monitoring</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Schedule II Dispensed</span>
                    <span className="font-bold">{pharmacyMetrics?.controlledSubstances?.scheduleII || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Schedule III-V Dispensed</span>
                    <span className="font-bold">{pharmacyMetrics?.controlledSubstances?.scheduleIII_V || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Compliance Rate</span>
                    <span className="font-bold text-green-600">{pharmacyMetrics?.controlledSubstances?.complianceRate || 0}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}