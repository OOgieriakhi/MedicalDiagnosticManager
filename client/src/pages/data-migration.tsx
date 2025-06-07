import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Upload, 
  Database, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download,
  FileSpreadsheet,
  ArrowRight,
  Users,
  TestTube,
  DollarSign,
  Building
} from "lucide-react";

interface TableInfo {
  name: string;
  recordCount: number;
  fields: string[];
  sampleData: any[];
  mapped: boolean;
  priority: 'high' | 'medium' | 'low' | 'skip';
}

interface MigrationStatus {
  phase: 'analyze' | 'map' | 'validate' | 'migrate' | 'complete';
  progress: number;
  currentTable: string;
  completedTables: string[];
  errors: string[];
}

export default function DataMigration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus>({
    phase: 'analyze',
    progress: 0,
    currentTable: '',
    completedTables: [],
    errors: []
  });

  const [tableAnalysis, setTableAnalysis] = useState<TableInfo[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [accessDbPath, setAccessDbPath] = useState('');
  const [tableStructure, setTableStructure] = useState('');

  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/data-migration/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Files uploaded successfully",
        description: `${data.filesProcessed} files processed`,
      });
      setMigrationStatus(prev => ({ ...prev, phase: 'map', progress: 25 }));
      queryClient.invalidateQueries({ queryKey: ['/api/data-migration/status'] });
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Table analysis mutation
  const analyzeMutation = useMutation({
    mutationFn: async (analysis: string) => {
      return apiRequest('POST', '/api/data-migration/analyze', { 
        tableStructure: analysis,
        accessDbPath 
      });
    },
    onSuccess: (data) => {
      setTableAnalysis(data.tables || []);
      setMigrationStatus(prev => ({ ...prev, phase: 'map', progress: 50 }));
      toast({
        title: "Database analysis complete",
        description: `Found ${data.tables?.length || 0} tables with ${data.totalRecords || 0} total records`,
      });
    },
  });

  // Migration execution mutation
  const migrateMutation = useMutation({
    mutationFn: async (selectedTables: string[]) => {
      return apiRequest('POST', '/api/data-migration/execute', { 
        tables: selectedTables,
        accessDbPath 
      });
    },
    onSuccess: (data) => {
      setMigrationStatus(prev => ({ 
        ...prev, 
        phase: 'complete', 
        progress: 100,
        completedTables: data.completedTables || []
      }));
      toast({
        title: "Migration completed successfully",
        description: `Migrated ${data.totalRecords || 0} records from ${data.completedTables?.length || 0} tables`,
      });
    },
  });

  const handleFileUpload = () => {
    if (!selectedFiles) return;
    
    const formData = new FormData();
    Array.from(selectedFiles).forEach(file => {
      formData.append('files', file);
    });
    
    uploadMutation.mutate(formData);
  };

  const handleTableAnalysis = () => {
    if (!tableStructure.trim()) {
      toast({
        title: "Please provide table structure",
        description: "Enter your Access database table information",
        variant: "destructive",
      });
      return;
    }
    analyzeMutation.mutate(tableStructure);
  };

  const handleMigration = () => {
    const selectedTables = tableAnalysis
      .filter(table => table.priority !== 'skip')
      .map(table => table.name);
    
    if (selectedTables.length === 0) {
      toast({
        title: "No tables selected",
        description: "Please select at least one table to migrate",
        variant: "destructive",
      });
      return;
    }
    
    migrateMutation.mutate(selectedTables);
  };

  const updateTablePriority = (tableName: string, priority: TableInfo['priority']) => {
    setTableAnalysis(prev => 
      prev.map(table => 
        table.name === tableName ? { ...table, priority } : table
      )
    );
  };

  const downloadTemplate = (templateType: string) => {
    const templates = {
      patients: `PatientID,FirstName,LastName,DateOfBirth,Gender,Phone,Email,Address,ReferralSource
1,John,Doe,1980-01-15,Male,+2348012345678,john.doe@email.com,"123 Lagos Street, Lagos",Dr. Smith
2,Jane,Smith,1975-06-22,Female,+2348087654321,jane.smith@email.com,"456 Abuja Road, Abuja",Hospital ABC`,
      
      tests: `PatientID,TestDate,TestType,Results,Amount,PaymentStatus,TechnicianName
1,2024-01-15,Blood Test,Normal,5000,Paid,Tech A
1,2024-01-15,X-Ray,Clear,15000,Paid,Tech B
2,2024-01-16,Ultrasound,Pending,12000,Pending,Tech C`,
      
      financial: `PatientID,TransactionDate,Amount,PaymentMethod,Description,Status
1,2024-01-15,20000,Cash,Blood Test + X-Ray,Completed
2,2024-01-16,12000,Card,Ultrasound,Pending`
    };

    const content = templates[templateType as keyof typeof templates];
    if (!content) return;

    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateType}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-6 w-6" />
              Data Migration Center - Orient Medical Centre
            </CardTitle>
            <CardDescription>
              Import your complete operational data from Access database to the ERP system
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Migration Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Migration Progress</CardTitle>
            <Progress value={migrationStatus.progress} className="w-full" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm">
              <span>Phase: {migrationStatus.phase.charAt(0).toUpperCase() + migrationStatus.phase.slice(1)}</span>
              <span>{migrationStatus.progress}% Complete</span>
            </div>
            {migrationStatus.currentTable && (
              <p className="text-sm text-muted-foreground mt-2">
                Currently processing: {migrationStatus.currentTable}
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="analyze" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="analyze">1. Analyze Database</TabsTrigger>
            <TabsTrigger value="upload">2. Upload Files</TabsTrigger>
            <TabsTrigger value="map">3. Map & Validate</TabsTrigger>
            <TabsTrigger value="migrate">4. Execute Migration</TabsTrigger>
          </TabsList>

          {/* Database Analysis Tab */}
          <TabsContent value="analyze" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Access Database Analysis</CardTitle>
                  <CardDescription>
                    Provide your Access database structure and table information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="accessPath">Access Database Path (Optional)</Label>
                    <Input
                      id="accessPath"
                      placeholder="C:\path\to\your\database.accdb"
                      value={accessDbPath}
                      onChange={(e) => setAccessDbPath(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tableStructure">Orient Medical Centre - Cleaned Database Analysis</Label>
                    <Textarea
                      id="tableStructure"
                      placeholder={`Enter your cleaned database table structure with priority prefixes:

A PREFIX TABLES (Patient Records - Highest Priority)
- A_PatientRegister (9,319+ records)
  - PatientID, FirstName, LastName, Phone, Address, ReferralSource
  - DEDUPLICATION: Match surname + firstname + phone for duplicates

B PREFIX TABLES (Financial Transactions - Critical)
- B_FinancialTransactions (20,771+ records)
  - TransactionID, PatientID, Amount, Date, PaymentMethod
  - ReferralID (CRITICAL: Links to referral commission tracking)

C PREFIX TABLES (Referrals - Important)
- C_ReferralProviders
  - ReferralID, ProviderName, CommissionRate, ContactInfo

NOTE: ReferralID in transactions table is essential for revenue tracking
Some patients registered multiple times - use name+phone matching`}
                      value={tableStructure}
                      onChange={(e) => setTableStructure(e.target.value)}
                      rows={15}
                    />
                  </div>
                  
                  <Button 
                    onClick={handleTableAnalysis}
                    disabled={analyzeMutation.isPending}
                    className="w-full"
                  >
                    {analyzeMutation.isPending ? "Analyzing..." : "Analyze Database Structure"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Analysis Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Run this VBA code in your Access database to get table information:
                    </AlertDescription>
                  </Alert>
                  
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono">
                    <pre>{`Sub ListTables()
    Dim db As Database
    Dim tdf As TableDef
    Set db = CurrentDb()
    
    For Each tdf In db.TableDefs
        If Left(tdf.Name, 4) <> "MSys" Then
            Debug.Print tdf.Name & " (" & _
                DCount("*", tdf.Name) & " records)"
        End If
    Next tdf
End Sub`}</pre>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Key Tables to Identify:</h4>
                    <div className="grid gap-2">
                      <Badge variant="outline" className="justify-start">
                        <Users className="h-3 w-3 mr-1" />
                        Patient Records
                      </Badge>
                      <Badge variant="outline" className="justify-start">
                        <TestTube className="h-3 w-3 mr-1" />
                        Test/Procedure Data
                      </Badge>
                      <Badge variant="outline" className="justify-start">
                        <DollarSign className="h-3 w-3 mr-1" />
                        Financial Transactions
                      </Badge>
                      <Badge variant="outline" className="justify-start">
                        <Building className="h-3 w-3 mr-1" />
                        Referral Sources
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* File Upload Tab */}
          <TabsContent value="upload" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upload Data Files</CardTitle>
                  <CardDescription>
                    Upload CSV files exported from your Access database
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="files">Select Files</Label>
                    <Input
                      id="files"
                      type="file"
                      multiple
                      accept=".csv,.xlsx,.xls,.accdb,.mdb"
                      onChange={(e) => setSelectedFiles(e.target.files)}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Supports: CSV, Excel, Access database files
                    </p>
                  </div>
                  
                  {selectedFiles && (
                    <div className="space-y-2">
                      <Label>Selected Files:</Label>
                      {Array.from(selectedFiles).map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4" />
                          <span>{file.name}</span>
                          <Badge variant="secondary">{(file.size / 1024).toFixed(1)} KB</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    onClick={handleFileUpload}
                    disabled={!selectedFiles || uploadMutation.isPending}
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploadMutation.isPending ? "Uploading..." : "Upload Files"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>CSV Templates</CardTitle>
                  <CardDescription>
                    Download templates to format your data correctly
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={() => downloadTemplate('patients')}
                    className="w-full justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Patients Template
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => downloadTemplate('tests')}
                    className="w-full justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Tests Template
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => downloadTemplate('financial')}
                    className="w-full justify-start"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Financial Template
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Mapping & Validation Tab */}
          <TabsContent value="map" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Table Mapping & Validation</CardTitle>
                <CardDescription>
                  Review and configure which tables to migrate
                </CardDescription>
              </CardHeader>
              <CardContent>
                {tableAnalysis.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table Name</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tableAnalysis.map((table) => (
                        <TableRow key={table.name}>
                          <TableCell className="font-medium">{table.name}</TableCell>
                          <TableCell>{table.recordCount}</TableCell>
                          <TableCell>
                            <select
                              value={table.priority}
                              onChange={(e) => updateTablePriority(table.name, e.target.value as TableInfo['priority'])}
                              className="border rounded px-2 py-1"
                            >
                              <option value="high">High Priority</option>
                              <option value="medium">Medium Priority</option>
                              <option value="low">Low Priority</option>
                              <option value="skip">Skip</option>
                            </select>
                          </TableCell>
                          <TableCell>
                            {table.mapped ? (
                              <Badge variant="default">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Ready
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Needs Mapping
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm">
                              Configure
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Complete the database analysis first to see available tables
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Migration Execution Tab */}
          <TabsContent value="migrate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Execute Migration</CardTitle>
                <CardDescription>
                  Start the data migration process
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {migrationStatus.phase === 'complete' ? (
                  <div className="space-y-4">
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Migration completed successfully! Your data has been imported into the ERP system.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium">Migrated Tables:</h4>
                      {migrationStatus.completedTables.map((table) => (
                        <Badge key={table} variant="default" className="mr-2">
                          {table}
                        </Badge>
                      ))}
                    </div>
                    
                    <Button 
                      onClick={() => window.location.href = '/dashboard'}
                      className="w-full"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        This will import your data into the ERP system. Please ensure you have a backup of your current data.
                      </AlertDescription>
                    </Alert>
                    
                    <Button
                      onClick={handleMigration}
                      disabled={migrateMutation.isPending || tableAnalysis.length === 0}
                      className="w-full"
                      size="lg"
                    >
                      {migrateMutation.isPending ? "Migrating Data..." : "Start Migration"}
                    </Button>
                  </div>
                )}
                
                {migrationStatus.errors.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-destructive">Migration Errors:</h4>
                    {migrationStatus.errors.map((error, index) => (
                      <Alert key={index} variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}