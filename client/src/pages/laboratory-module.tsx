import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, TestTube, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface Test {
  id: number;
  patientName: string;
  testName: string;
  status: 'pending' | 'in-progress' | 'completed';
  priority: 'normal' | 'urgent';
  orderDate: string;
  completedDate?: string;
}

interface TestParameter {
  id: number;
  name: string;
  value: string;
  unit: string;
  normalRange: string;
  status: 'normal' | 'high' | 'low';
}

export default function LaboratoryModule() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  
  const queryClient = useQueryClient();

  // Mock data - replace with actual API calls
  const tests: Test[] = [
    {
      id: 1,
      patientName: "John Doe",
      testName: "Complete Blood Count",
      status: "pending",
      priority: "normal",
      orderDate: "2024-06-05T10:30:00Z"
    },
    {
      id: 2,
      patientName: "Jane Smith",
      testName: "Liver Function Test",
      status: "in-progress",
      priority: "urgent",
      orderDate: "2024-06-05T09:15:00Z"
    },
    {
      id: 3,
      patientName: "Mike Johnson",
      testName: "Lipid Profile",
      status: "completed",
      priority: "normal",
      orderDate: "2024-06-05T08:00:00Z",
      completedDate: "2024-06-05T14:30:00Z"
    }
  ];

  const testParameters: TestParameter[] = [
    {
      id: 1,
      name: "Hemoglobin",
      value: "14.2",
      unit: "g/dL",
      normalRange: "12.0-15.5",
      status: "normal"
    },
    {
      id: 2,
      name: "White Blood Cell Count",
      value: "8.5",
      unit: "×10³/μL",
      normalRange: "4.0-11.0",
      status: "normal"
    },
    {
      id: 3,
      name: "Platelet Count",
      value: "450",
      unit: "×10³/μL",
      normalRange: "150-400",
      status: "high"
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in-progress':
        return <TestTube className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800';
  };

  const getParameterStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-green-600';
      case 'high':
        return 'text-red-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredTests = tests.filter(test =>
    test.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    test.testName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Laboratory Management</h1>
          <p className="text-gray-600 mt-2">Manage test orders, processing, and results</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" />
          New Test Order
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Tests</p>
                <p className="text-2xl font-bold text-yellow-600">12</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-600">8</p>
              </div>
              <TestTube className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">24</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Urgent Tests</p>
                <p className="text-2xl font-bold text-red-600">3</p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Test Queue</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="parameters">Test Parameters</TabsTrigger>
          <TabsTrigger value="quality">Quality Control</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Test Queue</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                    <Input
                      placeholder="Search tests..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTests.map((test) => (
                  <div
                    key={test.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedTest(test)}
                  >
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(test.status)}
                      <div>
                        <h3 className="font-medium">{test.patientName}</h3>
                        <p className="text-sm text-gray-600">{test.testName}</p>
                        <p className="text-xs text-gray-400">
                          Ordered: {new Date(test.orderDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getPriorityColor(test.priority)}>
                        {test.priority}
                      </Badge>
                      <Badge className={getStatusColor(test.status)}>
                        {test.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedTest ? (
                <div className="space-y-6">
                  <div className="border-b pb-4">
                    <h3 className="text-lg font-medium">{selectedTest.testName}</h3>
                    <p className="text-gray-600">Patient: {selectedTest.patientName}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <Badge className={getStatusColor(selectedTest.status)}>
                        {selectedTest.status}
                      </Badge>
                      <Badge className={getPriorityColor(selectedTest.priority)}>
                        {selectedTest.priority}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h4 className="font-medium">Test Parameters</h4>
                    {testParameters.map((param) => (
                      <div key={param.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <h5 className="font-medium">{param.name}</h5>
                          <p className="text-sm text-gray-600">Normal Range: {param.normalRange}</p>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${getParameterStatusColor(param.status)}`}>
                            {param.value} {param.unit}
                          </p>
                          <Badge className={getParameterStatusColor(param.status)}>
                            {param.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button className="bg-green-600 hover:bg-green-700">
                      Approve Results
                    </Button>
                    <Button variant="outline">
                      Request Retest
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Select a test from the queue to view results
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parameters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Parameter Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Parameter
                </Button>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testParameters.map((param) => (
                    <div key={param.id} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{param.name}</h4>
                      <p className="text-sm text-gray-600">Unit: {param.unit}</p>
                      <p className="text-sm text-gray-600">Normal Range: {param.normalRange}</p>
                      <div className="mt-2 flex space-x-2">
                        <Button size="sm" variant="outline">Edit</Button>
                        <Button size="sm" variant="outline">Delete</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quality Control</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <h4 className="font-medium text-green-600">Passed QC</h4>
                    <p className="text-2xl font-bold text-green-600">95%</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h4 className="font-medium text-yellow-600">Pending Review</h4>
                    <p className="text-2xl font-bold text-yellow-600">3%</p>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <h4 className="font-medium text-red-600">Failed QC</h4>
                    <p className="text-2xl font-bold text-red-600">2%</p>
                  </div>
                </div>
                
                <Button className="bg-blue-600 hover:bg-blue-700">
                  Run QC Check
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}