import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Edit2, Trash2, Save, X, Package, TestTube, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

interface TestConsumptionTemplate {
  id: number;
  testId: number;
  itemId: number;
  standardQuantity: string;
  consumptionType: 'direct' | 'proportional' | 'fixed';
  costCenter: string;
  isCritical: boolean;
  notes?: string;
  testName?: string;
  itemName?: string;
  itemCode?: string;
  categoryName?: string;
  unitOfMeasure?: string;
}

interface Test {
  id: number;
  name: string;
  category: string;
  categoryName: string;
}

interface InventoryItem {
  id: number;
  itemCode: string;
  name: string;
  unitOfMeasure: string;
  categoryName: string;
}

export default function TestConsumptionManagement() {
  const { toast } = useToast();
  const [selectedTest, setSelectedTest] = useState<number | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TestConsumptionTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch tests
  const { data: tests = [] } = useQuery<Test[]>({
    queryKey: ["/api/tests"],
  });

  // Fetch inventory items
  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory/items"],
  });

  // Fetch consumption templates for selected test
  const { data: templates = [], isLoading } = useQuery<TestConsumptionTemplate[]>({
    queryKey: ["/api/inventory/test-consumption-templates", selectedTest],
    enabled: !!selectedTest,
  });

  // Create/Update template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (template: Omit<TestConsumptionTemplate, 'id'>) => {
      const response = await apiRequest("POST", "/api/inventory/test-consumption-templates", template);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Consumption template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/test-consumption-templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (template: TestConsumptionTemplate) => {
      const response = await apiRequest("PUT", `/api/inventory/test-consumption-templates/${template.id}`, template);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Consumption template updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/test-consumption-templates"] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      await apiRequest("DELETE", `/api/inventory/test-consumption-templates/${templateId}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Consumption template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/test-consumption-templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (formData: FormData) => {
    const template = {
      testId: selectedTest!,
      itemId: parseInt(formData.get("itemId") as string),
      standardQuantity: formData.get("standardQuantity") as string,
      consumptionType: formData.get("consumptionType") as 'direct' | 'proportional' | 'fixed',
      costCenter: formData.get("costCenter") as string,
      isCritical: formData.get("isCritical") === "true",
      notes: formData.get("notes") as string || undefined,
    };

    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...template, id: editingTemplate.id } as TestConsumptionTemplate);
    } else {
      createTemplateMutation.mutate(template);
    }
  };

  const selectedTestName = tests.find(t => t.id === selectedTest)?.name || "Select a test";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Test Consumption Management</h1>
          <p className="text-muted-foreground">
            Configure which inventory items and quantities are consumed for each diagnostic test or procedure
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Test Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Select Test/Procedure
            </CardTitle>
            <CardDescription>
              Choose a test to manage its inventory consumption
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tests.map((test) => (
                <Button
                  key={test.id}
                  variant={selectedTest === test.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedTest(test.id)}
                >
                  <div className="text-left">
                    <div className="font-medium">{test.name}</div>
                    <div className="text-xs text-muted-foreground">{test.categoryName}</div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Consumption Templates */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Consumption Templates</CardTitle>
                <CardDescription>
                  {selectedTest ? `Items consumed for: ${selectedTestName}` : "Select a test to view consumption templates"}
                </CardDescription>
              </div>
              {selectedTest && (
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => setEditingTemplate(null)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>
                        {editingTemplate ? "Edit" : "Add"} Consumption Template
                      </DialogTitle>
                      <DialogDescription>
                        Configure which inventory item is consumed for {selectedTestName}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleSubmit(formData);
                    }} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="itemId">Inventory Item</Label>
                        <Select name="itemId" defaultValue={editingTemplate?.itemId?.toString()}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select inventory item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.map((item) => (
                              <SelectItem key={item.id} value={item.id.toString()}>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {item.itemCode} • {item.categoryName} • {item.unitOfMeasure}
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="standardQuantity">Quantity</Label>
                          <Input
                            name="standardQuantity"
                            type="number"
                            step="0.1"
                            placeholder="1.0"
                            defaultValue={editingTemplate?.standardQuantity}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="consumptionType">Type</Label>
                          <Select name="consumptionType" defaultValue={editingTemplate?.consumptionType || "direct"}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="direct">Direct</SelectItem>
                              <SelectItem value="proportional">Proportional</SelectItem>
                              <SelectItem value="fixed">Fixed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="costCenter">Cost Center</Label>
                        <Select name="costCenter" defaultValue={editingTemplate?.costCenter || "laboratory"}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="laboratory">Laboratory</SelectItem>
                            <SelectItem value="radiology">Radiology</SelectItem>
                            <SelectItem value="ultrasound">Ultrasound</SelectItem>
                            <SelectItem value="cardiology">Cardiology</SelectItem>
                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          name="isCritical" 
                          value="true"
                          defaultChecked={editingTemplate?.isCritical}
                        />
                        <Label htmlFor="isCritical" className="text-sm">
                          Critical Item (must be in stock to perform test)
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          name="notes"
                          placeholder="Additional notes about this consumption..."
                          defaultValue={editingTemplate?.notes}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button type="submit" disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
                          <Save className="h-4 w-4 mr-2" />
                          {editingTemplate ? "Update" : "Create"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsDialogOpen(false);
                            setEditingTemplate(null);
                          }}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedTest ? (
              <div className="text-center py-8 text-muted-foreground">
                <TestTube className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a test from the left panel to view and manage its consumption templates</p>
              </div>
            ) : isLoading ? (
              <div className="text-center py-8">Loading consumption templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No consumption templates configured for this test</p>
                <p className="text-sm">Click "Add Item" to configure inventory consumption</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Cost Center</TableHead>
                    <TableHead>Critical</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.itemName}</div>
                          <div className="text-xs text-muted-foreground">
                            {template.itemCode} • {template.categoryName}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {template.standardQuantity} {template.unitOfMeasure}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {template.consumptionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {template.costCenter}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {template.isCritical && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Critical
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingTemplate(template);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this consumption template?")) {
                                deleteTemplateMutation.mutate(template.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
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
      </div>
    </div>
  );
}