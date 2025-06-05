import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Users, 
  UserPlus, 
  Calendar, 
  CreditCard, 
  Award, 
  TrendingUp, 
  Building,
  Briefcase,
  Clock,
  DollarSign,
  Home,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageNotification } from "@/components/message-notification";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const employeeSchema = z.object({
  tenantId: z.number(),
  branchId: z.number(),
  employeeId: z.string().min(1, "Employee ID is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  middleName: z.string().optional(),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(1, "Phone is required"),
  dateOfBirth: z.date(),
  gender: z.enum(["male", "female", "other"]),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]),
  address: z.string().min(1, "Address is required"),
  emergencyContactName: z.string().min(1, "Emergency contact is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  taxId: z.string().optional(),
  pensionId: z.string().optional(),
  hireDate: z.date(),
  employmentStatus: z.enum(["active", "terminated", "suspended"]).default("active"),
});

const departmentSchema = z.object({
  tenantId: z.number(),
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional(),
  parentDepartmentId: z.number().optional(),
  managerId: z.number().optional(),
});

const positionSchema = z.object({
  tenantId: z.number(),
  title: z.string().min(1, "Position title is required"),
  description: z.string().optional(),
  departmentId: z.number(),
  baseSalary: z.number().min(0),
  isActive: z.boolean().default(true),
});

const payrollSchema = z.object({
  tenantId: z.number(),
  branchId: z.number(),
  periodName: z.string().min(1, "Period name is required"),
  startDate: z.date(),
  endDate: z.date(),
  payDate: z.date(),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;
type DepartmentFormData = z.infer<typeof departmentSchema>;
type PositionFormData = z.infer<typeof positionSchema>;
type PayrollFormData = z.infer<typeof payrollSchema>;

export default function HumanResources() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  // Queries
  const { data: employees } = useQuery({
    queryKey: ["/api/hr/employees"],
    queryFn: () => apiRequest("GET", "/api/hr/employees").then(res => res.json()),
  });

  const { data: departments } = useQuery({
    queryKey: ["/api/hr/departments"],
    queryFn: () => apiRequest("GET", "/api/hr/departments").then(res => res.json()),
  });

  const { data: positions } = useQuery({
    queryKey: ["/api/hr/positions"],
    queryFn: () => apiRequest("GET", "/api/hr/positions").then(res => res.json()),
  });

  const { data: payrollPeriods } = useQuery({
    queryKey: ["/api/hr/payroll-periods"],
    queryFn: () => apiRequest("GET", "/api/hr/payroll-periods").then(res => res.json()),
  });

  const { data: hrMetrics } = useQuery({
    queryKey: ["/api/hr/metrics"],
    queryFn: () => apiRequest("GET", "/api/hr/metrics").then(res => res.json()),
  });

  // Mutations
  const createEmployeeMutation = useMutation({
    mutationFn: (data: EmployeeFormData) =>
      apiRequest("POST", "/api/hr/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/employees"] });
      toast({ title: "Employee created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create employee", variant: "destructive" });
    },
  });

  const createDepartmentMutation = useMutation({
    mutationFn: (data: DepartmentFormData) =>
      apiRequest("POST", "/api/hr/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/departments"] });
      toast({ title: "Department created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create department", variant: "destructive" });
    },
  });

  const createPositionMutation = useMutation({
    mutationFn: (data: PositionFormData) =>
      apiRequest("POST", "/api/hr/positions", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/positions"] });
      toast({ title: "Position created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create position", variant: "destructive" });
    },
  });

  const createPayrollMutation = useMutation({
    mutationFn: (data: PayrollFormData) =>
      apiRequest("POST", "/api/hr/payroll-periods", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hr/payroll-periods"] });
      toast({ title: "Payroll period created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create payroll period", variant: "destructive" });
    },
  });

  // Forms
  const employeeForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      tenantId: 1,
      branchId: 1,
      employeeId: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      gender: "male",
      maritalStatus: "single",
      address: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      employmentStatus: "active",
    },
  });

  const departmentForm = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      tenantId: 1,
      name: "",
      description: "",
    },
  });

  const positionForm = useForm<PositionFormData>({
    resolver: zodResolver(positionSchema),
    defaultValues: {
      tenantId: 1,
      title: "",
      description: "",
      departmentId: 1,
      baseSalary: 0,
      isActive: true,
    },
  });

  const payrollForm = useForm<PayrollFormData>({
    resolver: zodResolver(payrollSchema),
    defaultValues: {
      tenantId: 1,
      branchId: 1,
      periodName: "",
    },
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Human Resources</h1>
            <p className="text-muted-foreground">
              Manage employees, departments, payroll, and HR operations
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <MessageNotification />
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Employee</DialogTitle>
                <DialogDescription>
                  Create a new employee record with complete information.
                </DialogDescription>
              </DialogHeader>
              <Form {...employeeForm}>
                <form
                  onSubmit={employeeForm.handleSubmit((data) =>
                    createEmployeeMutation.mutate(data)
                  )}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="employeeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employee ID</FormLabel>
                          <FormControl>
                            <Input placeholder="EMP001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="john.doe@company.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+234 xxx xxx xxxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="dateOfBirth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="maritalStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marital Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="divorced">Divorced</SelectItem>
                              <SelectItem value="widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={employeeForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Full address..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="emergencyContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Jane Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="emergencyContactPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Emergency Contact Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="+234 xxx xxx xxxx" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department/Unit</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Laboratory">Laboratory</SelectItem>
                              <SelectItem value="Radiology">Radiology</SelectItem>
                              <SelectItem value="Administration">Administration</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="Human Resources">Human Resources</SelectItem>
                              <SelectItem value="IT Support">IT Support</SelectItem>
                              <SelectItem value="Customer Service">Customer Service</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="position"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Designation/Position</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select position" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Lab Technician">Lab Technician</SelectItem>
                              <SelectItem value="Senior Lab Technician">Senior Lab Technician</SelectItem>
                              <SelectItem value="Radiologist">Radiologist</SelectItem>
                              <SelectItem value="Radiographer">Radiographer</SelectItem>
                              <SelectItem value="Administrative Assistant">Administrative Assistant</SelectItem>
                              <SelectItem value="Manager">Manager</SelectItem>
                              <SelectItem value="Accountant">Accountant</SelectItem>
                              <SelectItem value="HR Officer">HR Officer</SelectItem>
                              <SelectItem value="IT Specialist">IT Specialist</SelectItem>
                              <SelectItem value="Customer Service Representative">Customer Service Representative</SelectItem>
                              <SelectItem value="Medical Director">Medical Director</SelectItem>
                              <SelectItem value="Operations Manager">Operations Manager</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={employeeForm.control}
                      name="salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salary (NGN)</FormLabel>
                          <FormControl>
                            <Input placeholder="150000" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={employeeForm.control}
                      name="hireDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hire Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={createEmployeeMutation.isPending}
                    className="w-full"
                  >
                    Create Employee
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building className="h-4 w-4 mr-2" />
                Add Department
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Department</DialogTitle>
                <DialogDescription>
                  Add a new department to organize employees.
                </DialogDescription>
              </DialogHeader>
              <Form {...departmentForm}>
                <form
                  onSubmit={departmentForm.handleSubmit((data) =>
                    createDepartmentMutation.mutate(data)
                  )}
                  className="space-y-4"
                >
                  <FormField
                    control={departmentForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Department Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Laboratory Services" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={departmentForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Department description..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    disabled={createDepartmentMutation.isPending}
                    className="w-full"
                  >
                    Create Department
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departments?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Organizational units
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Positions</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Available roles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Payroll</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₦{hrMetrics?.monthlyPayroll?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current period total
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* New Hires */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Hires</CardTitle>
                <CardDescription>New employees this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees?.slice(0, 5).map((employee: any) => (
                    <div key={employee.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{employee.first_name} {employee.last_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {employee.department_name || "No department"}
                        </p>
                      </div>
                      <Badge variant="default">New</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Department Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Department Overview</CardTitle>
                <CardDescription>Employee distribution</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments?.map((department: any) => (
                    <div key={department.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{department.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {department.employee_count || 0} employees
                        </p>
                      </div>
                      <Badge variant="outline">
                        {department.employee_count || 0}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>HR Metrics</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Employee Turnover</span>
                    <span className="font-semibold">2.5%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Tenure</span>
                    <span className="font-semibold">3.2 years</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Attendance Rate</span>
                    <span className="font-semibold">96.8%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Training Hours</span>
                    <span className="font-semibold">24/month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>
                Complete list of all employees and their details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map((employee: any) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-mono">{employee.employee_id}</TableCell>
                      <TableCell className="font-medium">
                        {employee.first_name} {employee.last_name}
                      </TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>{employee.department_name || "-"}</TableCell>
                      <TableCell>
                        {new Date(employee.hire_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={employee.employment_status === 'active' ? 'default' : 'secondary'}
                        >
                          {employee.employment_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Departments</CardTitle>
              <CardDescription>
                Organizational structure and department management
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments?.map((department: any) => (
                    <TableRow key={department.id}>
                      <TableCell className="font-medium">{department.name}</TableCell>
                      <TableCell>{department.description || "-"}</TableCell>
                      <TableCell>{department.manager_name || "Not assigned"}</TableCell>
                      <TableCell>{department.employee_count || 0}</TableCell>
                      <TableCell>
                        {new Date(department.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Position Management</h3>
              <p className="text-muted-foreground">Define roles and salary structures</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Briefcase className="h-4 w-4 mr-2" />
                  Add Position
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Position</DialogTitle>
                  <DialogDescription>
                    Define a new position with salary information.
                  </DialogDescription>
                </DialogHeader>
                <Form {...positionForm}>
                  <form
                    onSubmit={positionForm.handleSubmit((data) =>
                      createPositionMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={positionForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Position Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Senior Laboratory Technician" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={positionForm.control}
                      name="departmentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            defaultValue={field.value?.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {departments?.map((department: any) => (
                                <SelectItem key={department.id} value={department.id.toString()}>
                                  {department.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={positionForm.control}
                      name="baseSalary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Salary (₦)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="150000"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={positionForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Position responsibilities and requirements..."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={createPositionMutation.isPending}
                      className="w-full"
                    >
                      Create Position
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {positions?.map((position: any) => (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">{position.title}</TableCell>
                      <TableCell>{position.department_name}</TableCell>
                      <TableCell>₦{position.base_salary?.toLocaleString()}</TableCell>
                      <TableCell>{position.employee_count || 0}</TableCell>
                      <TableCell>
                        <Badge variant={position.is_active ? 'default' : 'secondary'}>
                          {position.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Payroll Management</h3>
              <p className="text-muted-foreground">Process employee salaries and benefits</p>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <Calendar className="h-4 w-4 mr-2" />
                  Create Payroll Period
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Payroll Period</DialogTitle>
                  <DialogDescription>
                    Set up a new payroll processing period.
                  </DialogDescription>
                </DialogHeader>
                <Form {...payrollForm}>
                  <form
                    onSubmit={payrollForm.handleSubmit((data) =>
                      createPayrollMutation.mutate(data)
                    )}
                    className="space-y-4"
                  >
                    <FormField
                      control={payrollForm.control}
                      name="periodName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Period Name</FormLabel>
                          <FormControl>
                            <Input placeholder="January 2024" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={payrollForm.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Start Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={payrollForm.control}
                        name="endDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>End Date</FormLabel>
                            <FormControl>
                              <Input 
                                type="date" 
                                {...field}
                                value={field.value ? field.value.toISOString().split('T')[0] : ''}
                                onChange={(e) => field.onChange(new Date(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={payrollForm.control}
                      name="payDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pay Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              value={field.value ? field.value.toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(new Date(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      disabled={createPayrollMutation.isPending}
                      className="w-full"
                    >
                      Create Payroll Period
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Total Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPeriods?.map((period: any) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.period_name}</TableCell>
                      <TableCell>{new Date(period.start_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(period.end_date).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(period.pay_date).toLocaleDateString()}</TableCell>
                      <TableCell>₦{period.total_net_pay?.toLocaleString() || "0"}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            period.status === 'paid' ? 'default' : 
                            period.status === 'processed' ? 'secondary' : 'outline'
                          }
                        >
                          {period.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Process
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Top Performers
                </CardTitle>
                <CardDescription>
                  Outstanding employees this quarter
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Dr. Sarah Johnson</p>
                      <p className="text-sm text-muted-foreground">Radiology Department</p>
                    </div>
                    <Badge variant="default">98% Rating</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">John Smith</p>
                      <p className="text-sm text-muted-foreground">Laboratory Services</p>
                    </div>
                    <Badge variant="default">96% Rating</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Mary Williams</p>
                      <p className="text-sm text-muted-foreground">Administration</p>
                    </div>
                    <Badge variant="default">95% Rating</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>
                  Overall performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Average Performance</span>
                    <span className="font-semibold">87%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Goal Achievement</span>
                    <span className="font-semibold">92%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Training Completion</span>
                    <span className="font-semibold">85%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Employee Satisfaction</span>
                    <span className="font-semibold">4.2/5</span>
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