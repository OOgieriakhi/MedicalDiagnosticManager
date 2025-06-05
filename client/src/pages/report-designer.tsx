import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  BarChart3, 
  Download, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Copy, 
  Eye, 
  Grid, 
  Type, 
  PieChart, 
  LineChart, 
  Table, 
  Calendar, 
  Filter, 
  Settings, 
  GripVertical, 
  Move, 
  X,
  FileText,
  Layout,
  Palette,
  Zap,
  Home,
  Image,
  Upload
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface ReportComponent {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'text' | 'header' | 'filter' | 'image';
  title: string;
  config: any;
  position: { x: number; y: number; width: number; height: number };
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'ultrasound' | 'radiology' | 'laboratory' | 'general';
  components: ReportComponent[];
  isDefault: boolean;
  createdBy: string;
  createdAt: string;
}

export default function ReportDesigner() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [designMode, setDesignMode] = useState(true);
  const [selectedComponent, setSelectedComponent] = useState<ReportComponent | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDescription, setNewTemplateDescription] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<'ultrasound' | 'radiology' | 'laboratory' | 'general'>('general');
  const canvasRef = useRef<HTMLDivElement>(null);

  // Available component types for drag-and-drop
  const componentTypes = [
    { id: 'metric', icon: BarChart3, title: 'Key Metric', description: 'Display important KPIs' },
    { id: 'chart', icon: PieChart, title: 'Chart', description: 'Pie, bar, line charts' },
    { id: 'table', icon: Table, title: 'Data Table', description: 'Tabular data display' },
    { id: 'text', icon: Type, title: 'Text Block', description: 'Custom text content' },
    { id: 'header', icon: Layout, title: 'Header', description: 'Section headers' },
    { id: 'filter', icon: Filter, title: 'Filter Panel', description: 'Interactive filters' },
    { id: 'image', icon: Image, title: 'Image Attachment', description: 'Upload and attach images' }
  ];

  // Query templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/report-templates'],
    queryFn: async () => {
      const response = await fetch('/api/report-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    }
  });

  // Auto-select first template when templates are loaded
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [templates, selectedTemplate]);

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<ReportTemplate>) => {
      const response = await fetch('/api/report-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
      toast({ title: "Template created successfully", variant: "default" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: async (templateData: ReportTemplate) => {
      const response = await fetch(`/api/report-templates/${templateData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateData)
      });
      if (!response.ok) throw new Error('Failed to update template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/report-templates'] });
      toast({ title: "Template updated successfully", variant: "default" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    }
  });

  const handleDragStart = (componentType: string) => {
    setDraggedComponent(componentType);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedComponent || !selectedTemplate || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newComponent: ReportComponent = {
      id: `${draggedComponent}-${Date.now()}`,
      type: draggedComponent as any,
      title: `New ${draggedComponent}`,
      config: getDefaultConfig(draggedComponent),
      position: { x, y, width: 300, height: 200 }
    };

    const updatedTemplate = {
      ...selectedTemplate,
      components: [...selectedTemplate.components, newComponent]
    };

    setSelectedTemplate(updatedTemplate);
    setDraggedComponent(null);
  };

  const getDefaultConfig = (type: string) => {
    switch (type) {
      case 'metric':
        return { value: 0, label: 'Metric', color: '#3b82f6', format: 'number' };
      case 'chart':
        return { chartType: 'pie', dataSource: 'ultrasound-studies', colors: ['#3b82f6', '#10b981', '#f59e0b'] };
      case 'table':
        return { columns: ['Name', 'Value', 'Status'], dataSource: 'recent-studies' };
      case 'text':
        return { content: 'Enter your text here...', fontSize: 16, color: '#374151' };
      case 'header':
        return { content: 'Section Header', fontSize: 24, color: '#111827', alignment: 'left' };
      case 'filter':
        return { filters: ['date', 'category', 'status'], orientation: 'horizontal' };
      case 'image':
        return { imageUrl: '', caption: '', width: 'auto', height: 'auto', alignment: 'center' };
      default:
        return {};
    }
  };

  const handleComponentClick = (component: ReportComponent) => {
    setSelectedComponent(component);
  };

  const updateComponentConfig = (componentId: string, newConfig: any) => {
    if (!selectedTemplate) return;

    const updatedComponents = selectedTemplate.components.map(comp =>
      comp.id === componentId ? { ...comp, config: { ...comp.config, ...newConfig } } : comp
    );

    setSelectedTemplate({
      ...selectedTemplate,
      components: updatedComponents
    });
  };

  const removeComponent = (componentId: string) => {
    if (!selectedTemplate) return;

    const updatedComponents = selectedTemplate.components.filter(comp => comp.id !== componentId);
    setSelectedTemplate({
      ...selectedTemplate,
      components: updatedComponents
    });

    if (selectedComponent?.id === componentId) {
      setSelectedComponent(null);
    }
  };

  const saveTemplate = () => {
    if (!selectedTemplate) return;

    if (typeof selectedTemplate.id === 'string' && selectedTemplate.id.startsWith('new-')) {
      // Create new template
      createTemplateMutation.mutate({
        ...selectedTemplate,
        id: undefined
      });
    } else {
      // Update existing template
      updateTemplateMutation.mutate(selectedTemplate);
    }
  };

  const createNewTemplate = () => {
    if (!newTemplateName.trim()) {
      toast({ title: "Please enter a template name", variant: "destructive" });
      return;
    }

    const newTemplate: ReportTemplate = {
      id: `new-${Date.now()}`,
      name: newTemplateName,
      description: newTemplateDescription,
      category: newTemplateCategory,
      components: [],
      isDefault: false,
      createdBy: user?.username || 'Unknown',
      createdAt: new Date().toISOString()
    };

    setSelectedTemplate(newTemplate);
    setDesignMode(true);
    setNewTemplateName('');
    setNewTemplateDescription('');
  };

  const renderComponent = (component: ReportComponent) => {
    const baseStyle = {
      position: 'absolute' as const,
      left: component.position.x,
      top: component.position.y,
      width: component.position.width,
      height: component.position.height,
      border: selectedComponent?.id === component.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
      borderRadius: '6px',
      padding: '12px',
      backgroundColor: 'white',
      cursor: designMode ? 'pointer' : 'default'
    };

    switch (component.type) {
      case 'metric':
        return (
          <div
            key={component.id}
            style={baseStyle}
            onClick={() => handleComponentClick(component)}
            className="flex flex-col justify-center items-center"
          >
            <div className="text-3xl font-bold" style={{ color: component.config.color }}>
              {component.config.value || '0'}
            </div>
            <div className="text-sm text-gray-600">{component.config.label}</div>
          </div>
        );
      
      case 'chart':
        return (
          <div
            key={component.id}
            style={baseStyle}
            onClick={() => handleComponentClick(component)}
            className="flex items-center justify-center"
          >
            <div className="text-center text-gray-500">
              <PieChart className="w-8 h-8 mx-auto mb-2" />
              <div className="text-sm">{component.config.chartType} Chart</div>
            </div>
          </div>
        );
      
      case 'table':
        return (
          <div
            key={component.id}
            style={baseStyle}
            onClick={() => handleComponentClick(component)}
          >
            <div className="text-sm font-medium mb-2">{component.title}</div>
            <div className="space-y-1">
              {component.config.columns?.map((col: string, idx: number) => (
                <div key={idx} className="flex justify-between text-xs border-b pb-1">
                  <span>{col}</span>
                  <span>Value {idx + 1}</span>
                </div>
              ))}
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div
            key={component.id}
            style={baseStyle}
            onClick={() => handleComponentClick(component)}
          >
            <div 
              style={{ 
                fontSize: component.config.fontSize, 
                color: component.config.color 
              }}
            >
              {component.config.content}
            </div>
          </div>
        );
      
      case 'header':
        return (
          <div
            key={component.id}
            style={baseStyle}
            onClick={() => handleComponentClick(component)}
          >
            <h2 
              style={{ 
                fontSize: component.config.fontSize, 
                color: component.config.color,
                textAlign: component.config.alignment 
              }}
              className="font-bold"
            >
              {component.config.content}
            </h2>
          </div>
        );
      
      case 'image':
        return (
          <div
            key={component.id}
            style={baseStyle}
            onClick={() => handleComponentClick(component)}
            className="flex items-center justify-center"
          >
            {component.config.imageUrl ? (
              <img 
                src={component.config.imageUrl} 
                alt={component.config.caption || 'Ultrasound Image'}
                className="max-w-full max-h-full object-contain rounded"
              />
            ) : (
              <div className="text-center text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-2" />
                <div className="text-sm">Click to upload image</div>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div
            key={component.id}
            style={baseStyle}
            onClick={() => handleComponentClick(component)}
            className="flex items-center justify-center text-gray-500"
          >
            <div className="text-center">
              <Settings className="w-6 h-6 mx-auto mb-1" />
              <div className="text-xs">{component.type}</div>
            </div>
          </div>
        );
    }
  };

  if (!user) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Please log in to access the report designer.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Report Designer</h1>
            <p className="text-sm text-gray-600">Create and customize report templates</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {isPreviewMode ? 'Edit' : 'Preview'}
          </Button>
          {selectedTemplate && (
            <Button onClick={saveTemplate} disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Save Template
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 border-r bg-gray-50 overflow-y-auto">
          <Tabs defaultValue="templates" className="h-full">
            <TabsList className="grid w-full grid-cols-2 m-2">
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="p-4 space-y-4">
              {/* New Template Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Create New Template</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Template Name</Label>
                    <Input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="Enter template name"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newTemplateDescription}
                      onChange={(e) => setNewTemplateDescription(e.target.value)}
                      placeholder="Template description"
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select value={newTemplateCategory} onValueChange={(value: any) => setNewTemplateCategory(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultrasound">Ultrasound</SelectItem>
                        <SelectItem value="radiology">Radiology</SelectItem>
                        <SelectItem value="laboratory">Laboratory</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={createNewTemplate} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
                  </Button>
                </CardContent>
              </Card>

              {/* Existing Templates */}
              <div className="space-y-2">
                <h3 className="font-medium text-sm">Existing Templates</h3>
                {templatesLoading ? (
                  <div className="text-center py-4 text-gray-500">Loading templates...</div>
                ) : (
                  <div className="space-y-2">
                    {templates?.map((template: ReportTemplate) => (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setDesignMode(true);
                        }}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-gray-500">{template.description}</div>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {template.category}
                              </Badge>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="components" className="p-4">
              <div className="space-y-3">
                <h3 className="font-medium text-sm">Drag Components to Canvas</h3>
                {componentTypes.map((type) => (
                  <Card 
                    key={type.id}
                    className="cursor-move hover:shadow-md transition-shadow"
                    draggable
                    onDragStart={() => handleDragStart(type.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded">
                          <type.icon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{type.title}</div>
                          <div className="text-xs text-gray-500">{type.description}</div>
                        </div>
                        <GripVertical className="w-4 h-4 text-gray-400 ml-auto" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {selectedTemplate ? (
            <>
              {/* Canvas Header */}
              <div className="flex items-center justify-between p-4 border-b bg-white">
                <div>
                  <h2 className="font-medium">{selectedTemplate.name}</h2>
                  <p className="text-sm text-gray-600">{selectedTemplate.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Design Mode</Label>
                  <Switch checked={designMode} onCheckedChange={setDesignMode} />
                </div>
              </div>

              {/* Canvas */}
              <div className="flex-1 overflow-auto bg-gray-100 p-4">
                <div 
                  ref={canvasRef}
                  className="relative bg-white rounded-lg shadow-sm min-h-[800px] w-full"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  style={{ minWidth: '1000px' }}
                >
                  {selectedTemplate.components.map(renderComponent)}
                  
                  {selectedTemplate.components.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                      <div className="text-center">
                        <Grid className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Drag components from the sidebar to start building your report</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Template Selected</h3>
                <p className="text-gray-600 mb-4">Select an existing template or create a new one to get started</p>
              </div>
            </div>
          )}
        </div>

        {/* Properties Panel */}
        {selectedComponent && (
          <div className="w-80 border-l bg-white overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Component Properties</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeComponent(selectedComponent.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={selectedComponent.title}
                    onChange={(e) => {
                      const updatedComponent = { ...selectedComponent, title: e.target.value };
                      setSelectedComponent(updatedComponent);
                      updateComponentConfig(selectedComponent.id, { title: e.target.value });
                    }}
                  />
                </div>

                {selectedComponent.type === 'metric' && (
                  <>
                    <div>
                      <Label>Value</Label>
                      <Input
                        type="number"
                        value={selectedComponent.config.value || 0}
                        onChange={(e) => updateComponentConfig(selectedComponent.id, { value: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <Label>Label</Label>
                      <Input
                        value={selectedComponent.config.label || ''}
                        onChange={(e) => updateComponentConfig(selectedComponent.id, { label: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Color</Label>
                      <Input
                        type="color"
                        value={selectedComponent.config.color || '#3b82f6'}
                        onChange={(e) => updateComponentConfig(selectedComponent.id, { color: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'text' && (
                  <>
                    <div>
                      <Label>Content</Label>
                      <Textarea
                        value={selectedComponent.config.content || ''}
                        onChange={(e) => updateComponentConfig(selectedComponent.id, { content: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Font Size</Label>
                      <Input
                        type="number"
                        value={selectedComponent.config.fontSize || 16}
                        onChange={(e) => updateComponentConfig(selectedComponent.id, { fontSize: Number(e.target.value) })}
                      />
                    </div>
                  </>
                )}

                {selectedComponent.type === 'chart' && (
                  <>
                    <div>
                      <Label>Chart Type</Label>
                      <Select 
                        value={selectedComponent.config.chartType || 'pie'} 
                        onValueChange={(value) => updateComponentConfig(selectedComponent.id, { chartType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pie">Pie Chart</SelectItem>
                          <SelectItem value="bar">Bar Chart</SelectItem>
                          <SelectItem value="line">Line Chart</SelectItem>
                          <SelectItem value="doughnut">Doughnut Chart</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data Source</Label>
                      <Select 
                        value={selectedComponent.config.dataSource || 'ultrasound-studies'} 
                        onValueChange={(value) => updateComponentConfig(selectedComponent.id, { dataSource: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ultrasound-studies">Ultrasound Studies</SelectItem>
                          <SelectItem value="radiology-studies">Radiology Studies</SelectItem>
                          <SelectItem value="lab-tests">Laboratory Tests</SelectItem>
                          <SelectItem value="equipment-status">Equipment Status</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {selectedComponent.type === 'image' && (
                  <>
                    <div>
                      <Label>Upload Image</Label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const imageUrl = event.target?.result as string;
                                updateComponentConfig(selectedComponent.id, { imageUrl, filename: file.name });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {selectedComponent.config.imageUrl && (
                          <div className="relative">
                            <img 
                              src={selectedComponent.config.imageUrl} 
                              alt="Preview" 
                              className="w-full h-32 object-cover rounded border"
                            />
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              className="absolute top-1 right-1"
                              onClick={() => updateComponentConfig(selectedComponent.id, { imageUrl: '', filename: '' })}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label>Caption</Label>
                      <Input
                        value={selectedComponent.config.caption || ''}
                        onChange={(e) => updateComponentConfig(selectedComponent.id, { caption: e.target.value })}
                        placeholder="Enter image caption"
                      />
                    </div>
                    <div>
                      <Label>Alignment</Label>
                      <Select 
                        value={selectedComponent.config.alignment || 'center'} 
                        onValueChange={(value) => updateComponentConfig(selectedComponent.id, { alignment: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="center">Center</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}