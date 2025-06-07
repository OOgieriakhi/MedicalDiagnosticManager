import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Upload, FileText, Users, TestTube, DollarSign, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface MigrationStats {
  patients: number;
  tests: number;
  financial: number;
  errors: string[];
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
}

export default function DataMigration() {
  const [migrationStats, setMigrationStats] = useState<MigrationStats>({
    patients: 0,
    tests: 0,
    financial: 0,
    errors: [],
    status: 'idle'
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
    
    if (files.length > 0) {
      toast({
        title: "Files Selected",
        description: `${files.length} file(s) ready for upload`,
      });
    }
  };

  const validateFiles = (files: File[]): boolean => {
    const allowedTypes = ['.csv', '.xlsx', '.xls', '.accdb', '.mdb'];
    const maxSize = 50 * 1024 * 1024; // 50MB
    
    for (const file of files) {
      if (file.size > maxSize) {
        toast({
          title: "File Too Large",
          description: `${file.name} exceeds 50MB limit`,
          variant: "destructive",
        });
        return false;
      }
      
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedTypes.includes(extension)) {
        toast({
          title: "Invalid File Type",
          description: `${file.name} is not a supported format`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const uploadFiles = async () => {
    if (!selectedFiles.length) {
      toast({
        title: "No Files Selected",
        description: "Please select files to upload",
        variant: "destructive",
      });
      return;
    }

    if (!validateFiles(selectedFiles)) {
      return;
    }

    setMigrationStats(prev => ({ ...prev, status: 'uploading' }));
    setUploadProgress(0);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file, index) => {
        formData.append(`file_${index}`, file);
      });

      // Upload files with progress tracking
      const response = await fetch('/api/migrate-data', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setMigrationStats(prev => ({ ...prev, status: 'processing' }));
      
      // Start processing the uploaded files
      const result = await response.json();
      
      setMigrationStats({
        patients: result.patients || 0,
        tests: result.tests || 0,
        financial: result.financial || 0,
        errors: result.errors || [],
        status: 'completed'
      });

      setUploadProgress(100);
      
      toast({
        title: "Migration Completed",
        description: `Successfully migrated ${result.patients} patients, ${result.tests} tests, and ${result.financial} financial records`,
      });

    } catch (error) {
      console.error('Migration error:', error);
      setMigrationStats(prev => ({ 
        ...prev, 
        status: 'error',
        errors: [...prev.errors, error instanceof Error ? error.message : 'Unknown error']
      }));
      
      toast({
        title: "Migration Failed",
        description: "An error occurred during migration. Please check the logs.",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = async (templateType: string) => {
    try {
      const response = await apiRequest('GET', `/api/migration-templates/${templateType}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${templateType}_template.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Template Downloaded",
        description: `${templateType} template downloaded successfully`,
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download template",
        variant: "destructive",
      });
    }
  };

  const resetMigration = () => {
    setMigrationStats({
      patients: 0,
      tests: 0,
      financial: 0,
      errors: [],
      status: 'idle'
    });
    setUploadProgress(0);
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Data Migration Center</h1>
        <p className="text-muted-foreground mt-2">
          Import your existing data from Access database or CSV files into the ERP system
        </p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Upload Data</TabsTrigger>
          <TabsTrigger value="templates">Download Templates</TabsTrigger>
          <TabsTrigger value="status">Migration Status</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Upload your Access database files (.accdb, .mdb) or CSV exports
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="files">Select Files</Label>
                <Input
                  ref={fileInputRef}
                  id="files"
                  type="file"
                  multiple
                  accept=".csv,.xlsx,.xls,.accdb,.mdb"
                  onChange={handleFileSelect}
                  disabled={migrationStats.status === 'uploading' || migrationStats.status === 'processing'}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Files:</Label>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                      </div>
                      <Badge variant="secondary">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {migrationStats.status === 'uploading' || migrationStats.status === 'processing' ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground">
                    {migrationStats.status === 'uploading' ? 'Uploading files...' : 'Processing data...'}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    onClick={uploadFiles}
                    disabled={selectedFiles.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Start Migration
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={resetMigration}
                    disabled={selectedFiles.length === 0}
                  >
                    Reset
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Migration Guidelines</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Supported File Types</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Microsoft Access (.accdb, .mdb)</li>
                    <li>• CSV files (.csv)</li>
                    <li>• Excel files (.xlsx, .xls)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Data Requirements</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Patient records with names and contact info</li>
                    <li>• Test results with dates and values</li>
                    <li>• Financial records with amounts and dates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Download Templates
              </CardTitle>
              <CardDescription>
                Download CSV templates to format your data correctly before import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold">Patients Template</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Format for patient demographic and contact information
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => downloadTemplate('patients')}
                      className="w-full"
                    >
                      Download
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TestTube className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold">Tests Template</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Format for diagnostic tests and laboratory results
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => downloadTemplate('tests')}
                      className="w-full"
                    >
                      Download
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-5 w-5 text-orange-600" />
                      <h3 className="font-semibold">Financial Template</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Format for payment records and financial transactions
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => downloadTemplate('financial')}
                      className="w-full"
                    >
                      Download
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {migrationStats.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : migrationStats.status === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                ) : (
                  <FileText className="h-5 w-5" />
                )}
                Migration Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{migrationStats.patients}</div>
                  <div className="text-sm text-muted-foreground">Patients Migrated</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{migrationStats.tests}</div>
                  <div className="text-sm text-muted-foreground">Tests Migrated</div>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{migrationStats.financial}</div>
                  <div className="text-sm text-muted-foreground">Financial Records</div>
                </div>
              </div>

              {migrationStats.status === 'completed' && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Migration completed successfully! Your data has been imported into the ERP system.
                  </AlertDescription>
                </Alert>
              )}

              {migrationStats.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-semibold mb-2">Migration Errors ({migrationStats.errors.length}):</div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {migrationStats.errors.map((error, index) => (
                        <div key={index} className="text-sm">• {error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {migrationStats.status === 'idle' && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Ready to begin data migration. Upload your files to get started.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}