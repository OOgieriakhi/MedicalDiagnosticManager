import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Shield, Users, Settings, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DataGrid } from "@/components/ui/data-grid";
import { ProfessionalCard } from "@/components/ui/professional-card";

const createRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters"),
  description: z.string().optional(),
  level: z.number().min(1).max(10),
});

type Role = {
  id: number;
  name: string;
  description: string;
  level: number;
  isSystemRole: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Permission = {
  id: number;
  name: string;
  resource: string;
  action: string;
  description: string;
  category: string;
  isSystemPermission: boolean;
};

type RoleWithPermissions = Role & {
  permissions: Array<{
    permission: Permission;
    conditions: any;
  }>;
};

export default function RoleManagement() {
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);

  // Fetch roles
  const { data: roles = [], isLoading: rolesLoading } = useQuery<Role[]>({
    queryKey: ["/api/roles"],
  });

  // Fetch permissions
  const { data: permissions = [], isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ["/api/permissions"],
  });

  // Fetch selected role details
  const { data: roleDetails } = useQuery<RoleWithPermissions>({
    queryKey: ["/api/roles", selectedRole?.id],
    enabled: !!selectedRole?.id,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createRoleSchema>) => {
      const res = await apiRequest("POST", "/api/roles", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Role created",
        description: "New role has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error creating role",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Assign permission to role mutation
  const assignPermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: number; permissionId: number }) => {
      const res = await apiRequest("POST", `/api/roles/${roleId}/permissions/${permissionId}`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRole?.id] });
      toast({
        title: "Permission assigned",
        description: "Permission has been assigned to role successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error assigning permission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove permission from role mutation
  const removePermissionMutation = useMutation({
    mutationFn: async ({ roleId, permissionId }: { roleId: number; permissionId: number }) => {
      const res = await apiRequest("DELETE", `/api/roles/${roleId}/permissions/${permissionId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/roles", selectedRole?.id] });
      toast({
        title: "Permission removed",
        description: "Permission has been removed from role successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing permission",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof createRoleSchema>>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: "",
      description: "",
      level: 5,
    },
  });

  const onSubmit = (data: z.infer<typeof createRoleSchema>) => {
    createRoleMutation.mutate(data);
  };

  const handleAssignPermission = (permissionId: number) => {
    if (selectedRole) {
      assignPermissionMutation.mutate({
        roleId: selectedRole.id,
        permissionId,
      });
    }
  };

  const handleRemovePermission = (permissionId: number) => {
    if (selectedRole) {
      removePermissionMutation.mutate({
        roleId: selectedRole.id,
        permissionId,
      });
    }
  };

  const getPermissionCategories = () => {
    const categories = [...new Set(permissions.map(p => p.category))];
    return categories.sort();
  };

  const getPermissionsByCategory = (category: string) => {
    return permissions.filter(p => p.category === category);
  };

  const isPermissionAssigned = (permissionId: number) => {
    return roleDetails?.permissions.some(rp => rp.permission.id === permissionId) || false;
  };

  const roleColumns = [
    {
      key: "name",
      label: "Role Name",
      render: (role: Role) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{role.name}</span>
          {role.isSystemRole && (
            <Badge variant="secondary" className="text-xs">
              System
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "description",
      label: "Description",
      render: (role: Role) => (
        <span className="text-sm text-gray-600">{role.description || "No description"}</span>
      ),
    },
    {
      key: "level",
      label: "Level",
      render: (role: Role) => (
        <Badge variant={role.level <= 3 ? "destructive" : role.level <= 6 ? "default" : "secondary"}>
          Level {role.level}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (role: Role) => (
        <Badge variant={role.isActive ? "default" : "secondary"}>
          {role.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (role: Role) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedRole(role)}
        >
          Manage Permissions
        </Button>
      ),
    },
  ];

  if (rolesLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-600 mt-1">Manage user roles and permissions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Role</DialogTitle>
              <DialogDescription>
                Create a new role with specific permissions and access levels
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter role name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter role description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Access Level</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value.toString()}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select access level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">Level 1 (Highest Authority)</SelectItem>
                          <SelectItem value="2">Level 2 (Senior Management)</SelectItem>
                          <SelectItem value="3">Level 3 (Management)</SelectItem>
                          <SelectItem value="4">Level 4 (Supervisory)</SelectItem>
                          <SelectItem value="5">Level 5 (Senior Staff)</SelectItem>
                          <SelectItem value="6">Level 6 (Staff)</SelectItem>
                          <SelectItem value="7">Level 7 (Junior Staff)</SelectItem>
                          <SelectItem value="8">Level 8 (Entry Level)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Lower numbers indicate higher authority levels
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createRoleMutation.isPending}>
                    {createRoleMutation.isPending ? "Creating..." : "Create Role"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ProfessionalCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Roles</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.length}</div>
            <p className="text-xs text-muted-foreground">
              {roles.filter(r => r.isActive).length} active
            </p>
          </CardContent>
        </ProfessionalCard>

        <ProfessionalCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Roles</CardTitle>
            <Settings className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.filter(r => r.isSystemRole).length}</div>
            <p className="text-xs text-muted-foreground">
              Built-in roles
            </p>
          </CardContent>
        </ProfessionalCard>

        <ProfessionalCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custom Roles</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roles.filter(r => !r.isSystemRole).length}</div>
            <p className="text-xs text-muted-foreground">
              User-defined roles
            </p>
          </CardContent>
        </ProfessionalCard>

        <ProfessionalCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Permissions</CardTitle>
            <CheckCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{permissions.length}</div>
            <p className="text-xs text-muted-foreground">
              Available permissions
            </p>
          </CardContent>
        </ProfessionalCard>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-2">
          <ProfessionalCard>
            <CardHeader>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Manage system roles and their access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataGrid
                data={roles}
                columns={roleColumns}
                searchKeys={["name", "description"]}
                pageSize={10}
              />
            </CardContent>
          </ProfessionalCard>
        </div>

        {/* Role Details & Permissions */}
        <div>
          {selectedRole ? (
            <ProfessionalCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  {selectedRole.name}
                </CardTitle>
                <CardDescription>
                  {selectedRole.description || "No description available"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedRole.level <= 3 ? "destructive" : selectedRole.level <= 6 ? "default" : "secondary"}>
                    Level {selectedRole.level}
                  </Badge>
                  {selectedRole.isSystemRole && (
                    <Badge variant="secondary">System Role</Badge>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium">Permissions</h4>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsPermissionDialogOpen(true)}
                    >
                      Manage
                    </Button>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {roleDetails?.permissions.map(({ permission }) => (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium">{permission.name}</div>
                          <div className="text-xs text-gray-500">{permission.description}</div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemovePermission(permission.id)}
                          disabled={removePermissionMutation.isPending}
                        >
                          Remove
                        </Button>
                      </div>
                    )) || (
                      <p className="text-sm text-gray-500">No permissions assigned</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </ProfessionalCard>
          ) : (
            <ProfessionalCard>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a role to view details</p>
                </div>
              </CardContent>
            </ProfessionalCard>
          )}
        </div>
      </div>

      {/* Permission Management Dialog */}
      <Dialog open={isPermissionDialogOpen} onOpenChange={setIsPermissionDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Permissions - {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Assign or remove permissions for this role
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue={getPermissionCategories()[0]} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              {getPermissionCategories().map((category) => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {getPermissionCategories().map((category) => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {getPermissionsByCategory(category).map((permission) => {
                    const isAssigned = isPermissionAssigned(permission.id);
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            checked={isAssigned}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleAssignPermission(permission.id);
                              } else {
                                handleRemovePermission(permission.id);
                              }
                            }}
                          />
                          <div>
                            <div className="text-sm font-medium">{permission.name}</div>
                            <div className="text-xs text-gray-500">{permission.description}</div>
                            <div className="text-xs text-blue-600">{permission.resource}:{permission.action}</div>
                          </div>
                        </div>
                        {permission.isSystemPermission && (
                          <Badge variant="secondary" className="text-xs">
                            System
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
          
          <div className="flex justify-end">
            <Button onClick={() => setIsPermissionDialogOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}