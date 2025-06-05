import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MessageNotification } from "@/components/message-notification";
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2,
  TestTube,
  FileText,
  Settings,
  Database,
  Target,
  Activity,
  AlertTriangle,
  CheckCircle,
  Upload,
  Download
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ReferenceRange {
  id: number;
  testId: number;
  parameterName: string;
  parameterCode: string;
  unit: string;
  normalRangeMin: number | null;
  normalRangeMax: number | null;
  normalRangeText: string | null;
  category: string;
  displayOrder: number;
  testName?: string;
}

export default function ReferenceRanges() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRange, setEditingRange] = useState<ReferenceRange | null>(null);
  const [newRange, setNewRange] = useState({
    testId: "",
    parameterName: "",
    parameterCode: "",
    unit: "",
    normalRangeMin: "",
    normalRangeMax: "",
    normalRangeText: "",
    category: "",
    displayOrder: ""
  });

  // Fetch test categories for selection
  const { data: testCategories = [] } = useQuery({
    queryKey: ["/api/test-categories"],
    queryFn: async () => {
      const response = await fetch("/api/test-categories");
      if (!response.ok) throw new Error("Failed to fetch test categories");
      return response.json();
    },
  });

  // Fetch reference ranges
  const { data: referenceRanges = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/reference-ranges"],
    queryFn: async () => {
      const response = await fetch("/api/reference-ranges");
      if (!response.ok) throw new Error("Failed to fetch reference ranges");
      return response.json();
    },
  });

  // Create reference range mutation
  const createRangeMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/reference-ranges", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-ranges"] });
      toast({
        title: "Reference Range Created",
        description: "New reference range has been added successfully.",
      });
      setShowAddDialog(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reference range",
        variant: "destructive",
      });
    },
  });

  // Update reference range mutation
  const updateRangeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PUT", `/api/reference-ranges/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-ranges"] });
      toast({
        title: "Reference Range Updated",
        description: "Reference range has been updated successfully.",
      });
      setEditingRange(null);
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reference range",
        variant: "destructive",
      });
    },
  });

  // Delete reference range mutation
  const deleteRangeMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/reference-ranges/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reference-ranges"] });
      toast({
        title: "Reference Range Deleted",
        description: "Reference range has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reference range",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewRange({
      testId: "",
      parameterName: "",
      parameterCode: "",
      unit: "",
      normalRangeMin: "",
      normalRangeMax: "",
      normalRangeText: "",
      category: "",
      displayOrder: ""
    });
  };

  const handleEdit = (range: ReferenceRange) => {
    setEditingRange(range);
    setNewRange({
      testId: range.testId.toString(),
      parameterName: range.parameterName,
      parameterCode: range.parameterCode,
      unit: range.unit,
      normalRangeMin: range.normalRangeMin?.toString() || "",
      normalRangeMax: range.normalRangeMax?.toString() || "",
      normalRangeText: range.normalRangeText || "",
      category: range.category,
      displayOrder: range.displayOrder.toString()
    });
    setShowAddDialog(true);
  };

  const handleSubmit = () => {
    const data = {
      testId: parseInt(newRange.testId),
      parameterName: newRange.parameterName,
      parameterCode: newRange.parameterCode,
      unit: newRange.unit,
      normalRangeMin: newRange.normalRangeMin ? parseFloat(newRange.normalRangeMin) : null,
      normalRangeMax: newRange.normalRangeMax ? parseFloat(newRange.normalRangeMax) : null,
      normalRangeText: newRange.normalRangeText || null,
      category: newRange.category,
      displayOrder: parseInt(newRange.displayOrder) || 1
    };

    if (editingRange) {
      updateRangeMutation.mutate({ id: editingRange.id, data });
    } else {
      createRangeMutation.mutate(data);
    }
  };

  const filteredRanges = referenceRanges.filter((range: ReferenceRange) => {
    const matchesSearch = 
      range.parameterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      range.parameterCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      range.testName?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    
    const matchesCategory = selectedCategory === "all" || range.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(referenceRanges.map((range: ReferenceRange) => range.category)));

  return (
    <div className="space-y-6">
      <MessageNotification />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reference Ranges Management</h1>
          <p className="text-gray-600 mt-2">Manage laboratory test reference ranges and normal values</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Reference Range
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by parameter name, code, or test..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reference Ranges Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reference Ranges ({filteredRanges.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading reference ranges...</div>
          ) : filteredRanges.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No reference ranges found matching your criteria.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test</TableHead>
                  <TableHead>Parameter</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Normal Range</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRanges.map((range: ReferenceRange) => (
                  <TableRow key={range.id}>
                    <TableCell className="font-medium">
                      {range.testName || `Test ID: ${range.testId}`}
                    </TableCell>
                    <TableCell>{range.parameterName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{range.parameterCode}</Badge>
                    </TableCell>
                    <TableCell>
                      {range.normalRangeMin !== null && range.normalRangeMax !== null ? (
                        <span className="text-green-600">
                          {range.normalRangeMin} - {range.normalRangeMax}
                        </span>
                      ) : range.normalRangeText ? (
                        <span className="text-blue-600">{range.normalRangeText}</span>
                      ) : (
                        <span className="text-gray-400">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>{range.unit}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{range.category}</Badge>
                    </TableCell>
                    <TableCell>{range.displayOrder}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(range)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRangeMutation.mutate(range.id)}
                          disabled={deleteRangeMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => {
        setShowAddDialog(open);
        if (!open) {
          setEditingRange(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingRange ? "Edit Reference Range" : "Add Reference Range"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="testId">Test</Label>
              <Select value={newRange.testId} onValueChange={(value) => setNewRange(prev => ({ ...prev, testId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select test" />
                </SelectTrigger>
                <SelectContent>
                  {testCategories.map((test: any) => (
                    <SelectItem key={test.id} value={test.id.toString()}>
                      {test.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={newRange.category}
                onChange={(e) => setNewRange(prev => ({ ...prev, category: e.target.value }))}
                placeholder="e.g., hematology, chemistry"
              />
            </div>

            <div>
              <Label htmlFor="parameterName">Parameter Name</Label>
              <Input
                id="parameterName"
                value={newRange.parameterName}
                onChange={(e) => setNewRange(prev => ({ ...prev, parameterName: e.target.value }))}
                placeholder="e.g., White Blood Cells"
              />
            </div>

            <div>
              <Label htmlFor="parameterCode">Parameter Code</Label>
              <Input
                id="parameterCode"
                value={newRange.parameterCode}
                onChange={(e) => setNewRange(prev => ({ ...prev, parameterCode: e.target.value }))}
                placeholder="e.g., WBC"
              />
            </div>

            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                value={newRange.unit}
                onChange={(e) => setNewRange(prev => ({ ...prev, unit: e.target.value }))}
                placeholder="e.g., ×10³/μL, g/dL"
              />
            </div>

            <div>
              <Label htmlFor="displayOrder">Display Order</Label>
              <Input
                id="displayOrder"
                type="number"
                value={newRange.displayOrder}
                onChange={(e) => setNewRange(prev => ({ ...prev, displayOrder: e.target.value }))}
                placeholder="1"
              />
            </div>

            <div>
              <Label htmlFor="normalRangeMin">Normal Range Min</Label>
              <Input
                id="normalRangeMin"
                type="number"
                step="0.01"
                value={newRange.normalRangeMin}
                onChange={(e) => setNewRange(prev => ({ ...prev, normalRangeMin: e.target.value }))}
                placeholder="e.g., 4.0"
              />
            </div>

            <div>
              <Label htmlFor="normalRangeMax">Normal Range Max</Label>
              <Input
                id="normalRangeMax"
                type="number"
                step="0.01"
                value={newRange.normalRangeMax}
                onChange={(e) => setNewRange(prev => ({ ...prev, normalRangeMax: e.target.value }))}
                placeholder="e.g., 11.0"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="normalRangeText">Normal Range Text (Alternative)</Label>
              <Textarea
                id="normalRangeText"
                value={newRange.normalRangeText}
                onChange={(e) => setNewRange(prev => ({ ...prev, normalRangeText: e.target.value }))}
                placeholder="Use for non-numeric ranges like 'Negative' or 'Reactive'"
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createRangeMutation.isPending || updateRangeMutation.isPending}
            >
              {editingRange ? "Update" : "Create"} Reference Range
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}