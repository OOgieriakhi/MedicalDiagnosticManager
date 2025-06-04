import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  FlaskRound, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Edit,
  Calendar,
  User,
  Microscope
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function TestManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatientTest, setSelectedPatientTest] = useState<any>(null);
  const [testResults, setTestResults] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // Fetch patient tests for current branch
  const { data: patientTests = [] } = useQuery({
    queryKey: ["/api/patient-tests", user?.branchId],
    enabled: !!user?.branchId,
  });

  // Update test status mutation
  const updateTestMutation = useMutation({
    mutationFn: async ({ patientTestId, status, results }: { patientTestId: number, status: string, results?: string }) => {
      if (results) {
        // Update results
        const response = await apiRequest("PATCH", `/api/patient-tests/${patientTestId}`, {
          results,
          status: "completed"
        });
        return response.json();
      } else {
        // Update status only
        const response = await apiRequest("PATCH", `/api/patient-tests/${patientTestId}`, {
          status
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patient-tests"] });
      toast({
        title: "Test Updated",
        description: "Test status has been updated successfully.",
      });
      setSelectedPatientTest(null);
      setTestResults("");
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update test. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      scheduled: { color: "bg-blue-500", label: "Scheduled" },
      in_progress: { color: "bg-yellow-500", label: "In Progress" },
      completed: { color: "bg-green-500", label: "Completed" },
      reviewed: { color: "bg-purple-500", label: "Reviewed" },
      delivered: { color: "bg-gray-500", label: "Delivered" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: "bg-gray-400", label: status };
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Calendar className="w-4 h-4 text-blue-500" />;
      case "in_progress":
        return <Microscope className="w-4 h-4 text-yellow-500" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "reviewed":
        return <Eye className="w-4 h-4 text-purple-500" />;
      case "delivered":
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleStatusUpdate = (patientTestId: number, status: string) => {
    updateTestMutation.mutate({ patientTestId, status });
  };

  const handleResultsSubmit = () => {
    if (!selectedPatientTest || !testResults.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter test results.",
        variant: "destructive",
      });
      return;
    }

    updateTestMutation.mutate({ 
      patientTestId: selectedPatientTest.id, 
      status: "completed",
      results: testResults 
    });
  };

  // Group tests by status for better organization
  const testsByStatus = patientTests.reduce((acc: any, test: any) => {
    const status = test.status || "scheduled";
    if (!acc[status]) acc[status] = [];
    acc[status].push(test);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Test Management</h1>
        <p className="text-slate-gray">Manage diagnostic tests, update results, and track progress</p>
      </div>

      <Tabs defaultValue="queue" className="space-y-6">
        <TabsList>
          <TabsTrigger value="queue">Test Queue</TabsTrigger>
          <TabsTrigger value="results">Enter Results</TabsTrigger>
          <TabsTrigger value="completed">Completed Tests</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Test Queue */}
        <TabsContent value="queue">
          <div className="grid gap-6">
            {Object.entries(testsByStatus).map(([status, tests]: [string, any]) => (
              <Card key={status}>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    {getStatusIcon(status)}
                    <span className="ml-2 capitalize">{status.replace('_', ' ')} Tests</span>
                    <Badge variant="outline" className="ml-2">{tests.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                            Patient
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                            Test
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                            Scheduled
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                            Priority
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {tests.map((patientTest: any) => (
                          <tr key={patientTest.id} className="hover:bg-gray-50">
                            <td className="px-4 py-4">
                              <div className="flex items-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <User className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    {patientTest.patient?.firstName} {patientTest.patient?.lastName}
                                  </div>
                                  <div className="text-sm text-slate-gray">
                                    ID: {patientTest.patient?.patientId}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="text-sm font-medium text-gray-900">
                                {patientTest.test?.name}
                              </div>
                              <div className="text-sm text-slate-gray">
                                Code: {patientTest.test?.code}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-gray-900">
                              {new Date(patientTest.scheduledAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-4">
                              <Badge variant={patientTest.urgent ? "destructive" : "outline"}>
                                {patientTest.urgent ? "Urgent" : "Normal"}
                              </Badge>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex space-x-2">
                                {status === "scheduled" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusUpdate(patientTest.id, "in_progress")}
                                    disabled={updateTestMutation.isPending}
                                  >
                                    Start Test
                                  </Button>
                                )}
                                {status === "in_progress" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedPatientTest(patientTest)}
                                  >
                                    Enter Results
                                  </Button>
                                )}
                                {status === "completed" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleStatusUpdate(patientTest.id, "reviewed")}
                                    disabled={updateTestMutation.isPending}
                                  >
                                    Mark Reviewed
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Enter Results */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 w-5 h-5" />
                Enter Test Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedPatientTest ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h3 className="font-medium text-gray-900 mb-2">Test Information</h3>
                      <div className="space-y-2 text-sm">
                        <p><strong>Patient:</strong> {selectedPatientTest.patient?.firstName} {selectedPatientTest.patient?.lastName}</p>
                        <p><strong>Test:</strong> {selectedPatientTest.test?.name}</p>
                        <p><strong>Test Code:</strong> {selectedPatientTest.test?.code}</p>
                        <p><strong>Scheduled:</strong> {new Date(selectedPatientTest.scheduledAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="results">Test Results *</Label>
                      <Textarea
                        id="results"
                        value={testResults}
                        onChange={(e) => setTestResults(e.target.value)}
                        placeholder="Enter detailed test results, findings, measurements, and interpretations..."
                        rows={12}
                        className="font-mono"
                      />
                    </div>

                    <div className="flex space-x-3">
                      <Button 
                        onClick={handleResultsSubmit}
                        disabled={updateTestMutation.isPending || !testResults.trim()}
                        className="bg-medical-green hover:bg-green-700"
                      >
                        {updateTestMutation.isPending ? "Saving..." : "Save Results"}
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setSelectedPatientTest(null);
                          setTestResults("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Result Guidelines</h3>
                    <div className="space-y-3 text-sm">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <h4 className="font-medium text-blue-900">Blood Tests</h4>
                        <p className="text-blue-700">Include reference ranges, abnormal values, and clinical significance</p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg">
                        <h4 className="font-medium text-green-900">Imaging</h4>
                        <p className="text-green-700">Describe findings, measurements, and radiological impressions</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg">
                        <h4 className="font-medium text-purple-900">Microbiology</h4>
                        <p className="text-purple-700">Report organism identification, sensitivity, and recommendations</p>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-900">Important</h4>
                          <p className="text-sm text-yellow-700">
                            Results will be automatically sent to patients and referring providers once saved.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FlaskRound className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Selected</h3>
                  <p className="text-slate-gray">
                    Select a test from the Test Queue to enter results
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Completed Tests */}
        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Recently Completed Tests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                        Patient
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                        Test
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                        Completed
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {patientTests
                      .filter((pt: any) => pt.status === "completed" || pt.status === "reviewed" || pt.status === "delivered")
                      .slice(0, 10)
                      .map((patientTest: any) => (
                        <tr key={patientTest.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patientTest.patient?.firstName} {patientTest.patient?.lastName}
                            </div>
                            <div className="text-sm text-slate-gray">
                              {patientTest.patient?.patientId}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {patientTest.test?.name}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {new Date(patientTest.updatedAt || patientTest.scheduledAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4">
                            {getStatusBadge(patientTest.status)}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="outline">
                                <Edit className="w-3 h-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-gray text-sm font-medium">Tests Today</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {patientTests.filter((pt: any) => 
                        new Date(pt.scheduledAt).toDateString() === new Date().toDateString()
                      ).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FlaskRound className="text-blue-600 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-gray text-sm font-medium">Pending Results</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {patientTests.filter((pt: any) => pt.status === "in_progress").length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                    <Clock className="text-yellow-600 w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-gray text-sm font-medium">Completed Today</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {patientTests.filter((pt: any) => 
                        pt.status === "completed" && 
                        new Date(pt.updatedAt || pt.scheduledAt).toDateString() === new Date().toDateString()
                      ).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="text-green-600 w-6 h-6" />
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