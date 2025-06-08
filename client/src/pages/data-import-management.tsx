import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { 
  Upload, 
  Download, 
  Users, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  Database,
  Home,
  RefreshCw,
  Eye,
  Activity,
  BarChart3
} from "lucide-react";

interface ImportSummary {
  total_patients: number;
  total_tests: number;
  total_inventory_items: number;
  total_transactions: number;
  total_purchase_orders: number;
  total_expense_transactions: number;
}

interface ImportResult {
  success: boolean;
  message: string;
  recordsProcessed: number;
  totalRecords: number;
  errors: string[];
}

export default function DataImportManagement() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [importData, setImportData] = useState("");
  const [importType, setImportType] = useState("patients");
  const [validationResult, setValidationResult] = useState<any>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current data summary
  const { data: summary, isLoading: summaryLoading } = useQuery<ImportSummary>({
    queryKey: ["/api/data-import/summary"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async ({ data, type }: { data: any[], type: string }) => {
      const response = await apiRequest("POST", "/api/data-import/validate", { data, type });
      return response.json();
    },
    onSuccess: (result) => {
      setValidationResult(result);
      if (result.valid) {
        toast({
          title: "Validation Successful",
          description: `${result.recordCount} records ready for import`,
        });
      } else {
        toast({
          title: "Validation Errors Found",
          description: `${result.errors.length} errors detected`,
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Validation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import patients mutation
  const importPatientsMutation = useMutation({
    mutationFn: async (patientsData: any[]) => {
      const response = await apiRequest("POST", "/api/data-import/patients", { patientsData });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportProgress(100);
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/data-import/summary"] });
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.recordsProcessed}/${result.totalRecords} records imported`,
          variant: "destructive",
        });
      }
      setImportData("");
      setValidationResult(null);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      setImportProgress(0);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Import financial transactions mutation
  const importTransactionsMutation = useMutation({
    mutationFn: async (transactionsData: any[]) => {
      const response = await apiRequest("POST", "/api/data-import/financial-transactions", { transactionsData });
      return response.json();
    },
    onSuccess: (result: ImportResult) => {
      setImportProgress(100);
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["/api/data-import/summary"] });
      
      if (result.success) {
        toast({
          title: "Import Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `${result.recordsProcessed}/${result.totalRecords} records imported`,
          variant: "destructive",
        });
      }
      setImportData("");
      setValidationResult(null);
    },
    onError: (error: any) => {
      setIsProcessing(false);
      setImportProgress(0);
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleValidateData = () => {
    if (!importData.trim()) {
      toast({
        title: "No Data",
        description: "Please enter data to validate",
        variant: "destructive",
      });
      return;
    }

    try {
      const parsedData = JSON.parse(importData);
      if (!Array.isArray(parsedData)) {
        throw new Error("Data must be an array");
      }
      validateMutation.mutate({ data: parsedData, type: importType });
    } catch (error) {
      toast({
        title: "Invalid JSON",
        description: "Please enter valid JSON data",
        variant: "destructive",
      });
    }
  };

  const handleImportData = () => {
    if (!validationResult?.valid) {
      toast({
        title: "Validation Required",
        description: "Please validate data before importing",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setImportProgress(25);

    try {
      const parsedData = JSON.parse(importData);
      
      // Simulate progress
      setTimeout(() => setImportProgress(50), 500);
      setTimeout(() => setImportProgress(75), 1000);

      if (importType === "patients") {
        importPatientsMutation.mutate(parsedData);
      } else if (importType === "financial") {
        importTransactionsMutation.mutate(parsedData);
      }
    } catch (error) {
      setIsProcessing(false);
      setImportProgress(0);
      toast({
        title: "Import Failed",
        description: "Invalid data format",
        variant: "destructive",
      });
    }
  };

  const getSampleData = (type: string) => {
    switch (type) {
      case "patients":
        return JSON.stringify([
          {
            firstName: "John",
            lastName: "Doe",
            email: "john.doe@email.com",
            phone: "+234-803-123-4567",
            dateOfBirth: "1985-06-15",
            gender: "male",
            address: "123 Main Street, Lagos",
            emergencyContact: "Jane Doe - +234-803-765-4321",
            medicalHistory: "Hypertension",
            referralSource: "Dr. Smith Clinic"
          }
        ], null, 2);
      case "financial":
        return JSON.stringify([
          {
            type: "income",
            category: "patient_services",
            amount: 25000,
            description: "Laboratory test - Full Blood Count",
            transactionDate: "2025-06-01",
            paymentMethod: "cash",
            referenceNumber: "TXN-2025-001",
            status: "completed"
          }
        ], null, 2);
      default:
        return "";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8 text-blue-600" />
            Historical Data Import Center
          </h1>
          <p className="text-gray-600 mt-1">Load historical data from Orient Medical Diagnostic Centre</p>
        </div>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Home
            </Button>
          </Link>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/data-import/summary"] })}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Current Data Summary */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Patients</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary.total_patients}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tests</CardTitle>
              <Activity className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.total_tests}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <DollarSign className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{summary.total_transactions}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory</CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{summary.total_inventory_items}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenses</CardTitle>
              <FileText className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{summary.total_expense_transactions}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
              <FileText className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">{summary.total_purchase_orders}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Import Interface */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="import">Import Data</TabsTrigger>
          <TabsTrigger value="history">Import History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Data Import Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Supported Data Types</h3>
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-blue-600">Patient Records</Badge>
                    <Badge variant="outline" className="text-green-600">Financial Transactions</Badge>
                    <Badge variant="outline" className="text-purple-600">Laboratory Tests</Badge>
                    <Badge variant="outline" className="text-orange-600">Inventory Items</Badge>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">Import Process</h3>
                  <ol className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                      Select data type to import
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                      Paste JSON data or use sample format
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                      Validate data structure and integrity
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                      Import data into system
                    </li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import Historical Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Data Type Selection */}
              <div>
                <label className="text-sm font-medium mb-2 block">Data Type</label>
                <div className="flex gap-2">
                  <Button
                    variant={importType === "patients" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportType("patients")}
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Patients
                  </Button>
                  <Button
                    variant={importType === "financial" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setImportType("financial")}
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Financial
                  </Button>
                </div>
              </div>

              {/* Sample Data Button */}
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">JSON Data</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setImportData(getSampleData(importType))}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Load Sample
                </Button>
              </div>

              {/* Data Input */}
              <Textarea
                placeholder="Paste your JSON data here..."
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />

              {/* Validation Results */}
              {validationResult && (
                <Alert className={validationResult.valid ? "border-green-500" : "border-red-500"}>
                  {validationResult.valid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  )}
                  <AlertTitle>
                    {validationResult.valid ? "Validation Successful" : "Validation Errors"}
                  </AlertTitle>
                  <AlertDescription>
                    {validationResult.valid ? (
                      `${validationResult.recordCount} records ready for import`
                    ) : (
                      <div className="space-y-1">
                        <p>{validationResult.errors.length} errors found:</p>
                        <ul className="list-disc list-inside text-sm">
                          {validationResult.errors.slice(0, 5).map((error: string, index: number) => (
                            <li key={index}>{error}</li>
                          ))}
                          {validationResult.errors.length > 5 && (
                            <li>... and {validationResult.errors.length - 5} more errors</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {/* Import Progress */}
              {isProcessing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Importing data...</span>
                  </div>
                  <Progress value={importProgress} className="w-full" />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleValidateData}
                  disabled={!importData.trim() || validateMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {validateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Validate Data
                </Button>
                <Button
                  onClick={handleImportData}
                  disabled={!validationResult?.valid || isProcessing}
                  className="flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Import Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import History</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Import History</AlertTitle>
                <AlertDescription>
                  Import history tracking will be available in the next update. Current data summary is shown above.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}