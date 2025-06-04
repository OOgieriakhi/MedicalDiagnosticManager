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
  MessageCircle, 
  Mail, 
  FileText, 
  Send, 
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Bell
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function NotificationCenter() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPatient, setSelectedPatient] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  const [testResults, setTestResults] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  // Fetch patient tests for notifications
  const { data: patientTests = [] } = useQuery({
    queryKey: ["/api/patient-tests", user?.branchId],
    enabled: !!user?.branchId,
  });

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ["/api/patients", user?.branchId],
    enabled: !!user?.branchId,
  });

  // Update test status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ patientTestId, status }: { patientTestId: number, status: string }) => {
      const response = await apiRequest("POST", "/api/notifications/test-status", {
        patientTestId,
        status
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Test status updated and notifications sent to patient.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send test results mutation
  const sendResultsMutation = useMutation({
    mutationFn: async ({ patientTestId, results }: { patientTestId: number, results: string }) => {
      const response = await apiRequest("POST", "/api/notifications/test-results", {
        patientTestId,
        results
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Results Sent",
        description: "Test results sent via WhatsApp and email with PDF attachment.",
      });
      setTestResults("");
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Failed to send results. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async ({ patientId, appointmentDate }: { patientId: number, appointmentDate: string }) => {
      const response = await apiRequest("POST", "/api/notifications/appointment-reminder", {
        patientId,
        appointmentDate
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reminder Sent",
        description: "Appointment reminder sent via WhatsApp and email.",
      });
      setReminderDate("");
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusUpdate = (patientTestId: number, status: string) => {
    updateStatusMutation.mutate({ patientTestId, status });
  };

  const handleSendResults = () => {
    if (!selectedTest || !testResults) {
      toast({
        title: "Missing Information",
        description: "Please select a test and enter results.",
        variant: "destructive",
      });
      return;
    }

    sendResultsMutation.mutate({ 
      patientTestId: parseInt(selectedTest), 
      results: testResults 
    });
  };

  const handleSendReminder = () => {
    if (!selectedPatient || !reminderDate) {
      toast({
        title: "Missing Information",
        description: "Please select a patient and appointment date.",
        variant: "destructive",
      });
      return;
    }

    sendReminderMutation.mutate({ 
      patientId: parseInt(selectedPatient), 
      appointmentDate: reminderDate 
    });
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Notification Center</h1>
        <p className="text-slate-gray">Manage WhatsApp, email notifications and PDF report delivery</p>
      </div>

      {/* Configuration Alert */}
      <Card className="mb-6 border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">API Configuration Required</h3>
              <p className="text-sm text-amber-700 mt-1">
                To enable WhatsApp and email notifications, you need to provide:
              </p>
              <ul className="text-sm text-amber-700 mt-2 space-y-1">
                <li>• <strong>SENDGRID_API_KEY</strong> - For email delivery</li>
                <li>• <strong>WHATSAPP_ACCESS_TOKEN</strong> - For WhatsApp Business API</li>
                <li>• <strong>WHATSAPP_PHONE_NUMBER_ID</strong> - Your WhatsApp Business number</li>
                <li>• <strong>FROM_EMAIL</strong> - Your sender email address</li>
              </ul>
              <p className="text-sm text-amber-700 mt-2">
                Once configured, the system will automatically send notifications at key stages of the patient journey.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="status" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Test Status Updates</TabsTrigger>
          <TabsTrigger value="results">Send Results</TabsTrigger>
          <TabsTrigger value="reminders">Appointment Reminders</TabsTrigger>
          <TabsTrigger value="history">Notification History</TabsTrigger>
        </TabsList>

        {/* Test Status Updates */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 w-5 h-5" />
                Update Test Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-gray">
                  Update test status to automatically notify patients via WhatsApp and email
                </p>
                
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
                          Current Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-slate-gray uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patientTests.slice(0, 5).map((patientTest: any) => (
                        <tr key={patientTest.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {patientTest.patient?.firstName} {patientTest.patient?.lastName}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-900">
                            {patientTest.test?.name}
                          </td>
                          <td className="px-4 py-4">
                            <Badge 
                              className={
                                patientTest.status === "completed" ? "bg-medical-green" :
                                patientTest.status === "in_progress" ? "bg-medical-blue" :
                                patientTest.status === "scheduled" ? "bg-yellow-500" :
                                "bg-gray-500"
                              }
                            >
                              {patientTest.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(patientTest.id, "in_progress")}
                                disabled={updateStatusMutation.isPending}
                              >
                                In Progress
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(patientTest.id, "completed")}
                                disabled={updateStatusMutation.isPending}
                              >
                                Completed
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(patientTest.id, "reviewed")}
                                disabled={updateStatusMutation.isPending}
                              >
                                Reviewed
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send Results */}
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 w-5 h-5" />
                Send Test Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Test</Label>
                    <Select value={selectedTest} onValueChange={setSelectedTest}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a completed test" />
                      </SelectTrigger>
                      <SelectContent>
                        {patientTests
                          .filter((pt: any) => pt.status === "completed" || pt.status === "reviewed")
                          .map((patientTest: any) => (
                            <SelectItem key={patientTest.id} value={patientTest.id.toString()}>
                              {patientTest.patient?.firstName} {patientTest.patient?.lastName} - {patientTest.test?.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Test Results</Label>
                    <Textarea
                      value={testResults}
                      onChange={(e) => setTestResults(e.target.value)}
                      placeholder="Enter detailed test results, findings, and recommendations..."
                      rows={6}
                    />
                  </div>

                  <Button 
                    onClick={handleSendResults}
                    disabled={sendResultsMutation.isPending || !selectedTest || !testResults}
                    className="w-full bg-medical-green hover:bg-green-700"
                  >
                    <Send className="mr-2 w-4 h-4" />
                    {sendResultsMutation.isPending ? "Sending..." : "Send Results with PDF"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Delivery Method</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">WhatsApp</p>
                        <p className="text-sm text-green-700">Instant notification with download link</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">Email</p>
                        <p className="text-sm text-blue-700">Professional report with PDF attachment</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                      <Download className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="font-medium text-purple-900">PDF Report</p>
                        <p className="text-sm text-purple-700">Automatically generated for both patient and referral provider</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointment Reminders */}
        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="mr-2 w-5 h-5" />
                Send Appointment Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select Patient</Label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient: any) => (
                          <SelectItem key={patient.id} value={patient.id.toString()}>
                            {patient.firstName} {patient.lastName} - {patient.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Appointment Date & Time</Label>
                    <Input
                      type="datetime-local"
                      value={reminderDate}
                      onChange={(e) => setReminderDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>

                  <Button 
                    onClick={handleSendReminder}
                    disabled={sendReminderMutation.isPending || !selectedPatient || !reminderDate}
                    className="w-full bg-medical-blue hover:bg-blue-700"
                  >
                    <Bell className="mr-2 w-4 h-4" />
                    {sendReminderMutation.isPending ? "Sending..." : "Send Reminder"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Reminder Content</h3>
                  <div className="p-4 bg-gray-50 rounded-lg text-sm">
                    <p className="font-medium mb-2">Sample WhatsApp Message:</p>
                    <div className="bg-white p-3 rounded border-l-4 border-medical-blue">
                      <p>🔔 Appointment Reminder</p>
                      <br />
                      <p>Hi [Patient Name],</p>
                      <br />
                      <p>This is a reminder of your upcoming appointment:</p>
                      <p>📅 Tomorrow at [Time]</p>
                      <p>📍 Orient Medical Diagnostic Center</p>
                      <br />
                      <p>Please arrive 15 minutes early.</p>
                      <br />
                      <p>For questions, call: +234-XXX-XXX-XXXX</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification History */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-slate-gray">
                  Notification history will be displayed here once the system is configured with API keys.
                </p>
                
                <div className="space-y-3">
                  {/* Demo notification entries */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-medical-green" />
                      <div>
                        <p className="font-medium text-gray-900">Test results sent</p>
                        <p className="text-sm text-slate-gray">Kemi Adeyemi - Chest X-Ray</p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-gray">
                      2 hours ago
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-medical-blue" />
                      <div>
                        <p className="font-medium text-gray-900">Appointment reminder sent</p>
                        <p className="text-sm text-slate-gray">Fatima Bello - Tomorrow 10:00 AM</p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-gray">
                      1 day ago
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}