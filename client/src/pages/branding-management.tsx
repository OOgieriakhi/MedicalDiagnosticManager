import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useBranding } from "@/lib/branding-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Palette, Building2, Contact, Globe, Settings, Save, Eye, Home, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function BrandingManagement() {
  const { toast } = useToast();
  const { branding, applyTheme } = useBranding();
  const [formData, setFormData] = useState({
    organizationName: branding?.organizationName || "",
    organizationSlogan: branding?.organizationSlogan || "",
    primaryEmail: branding?.primaryEmail || "",
    supportEmail: branding?.supportEmail || "",
    primaryPhone: branding?.primaryPhone || "",
    secondaryPhone: branding?.secondaryPhone || "",
    website: branding?.website || "",
    streetAddress: branding?.streetAddress || "",
    city: branding?.city || "",
    state: branding?.state || "",
    country: branding?.country || "",
    postalCode: branding?.postalCode || "",
    primaryColor: branding?.primaryColor || "#8BC34A",
    secondaryColor: branding?.secondaryColor || "#2196F3",
    accentColor: branding?.accentColor || "#1565C0",
    backgroundColor: branding?.backgroundColor || "#FFFFFF",
    textColor: branding?.textColor || "#2C3E50"
  });

  // Get current branding data
  const { data: currentBranding } = useQuery({
    queryKey: ["/api/organization-branding"],
    queryFn: async () => {
      const response = await fetch("/api/organization-branding");
      if (!response.ok) throw new Error("Failed to fetch branding");
      return response.json();
    },
  });

  // Update branding mutation
  const updateBrandingMutation = useMutation({
    mutationFn: async (brandingData: any) => {
      const response = await apiRequest("PUT", "/api/organization-branding", brandingData);
      return response.json();
    },
    onSuccess: (updatedBranding) => {
      toast({ title: "Branding updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/organization-branding"] });
      applyTheme(updatedBranding);
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update branding", 
        description: error.message, 
        variant: "destructive" 
      });
    }
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateBrandingMutation.mutate(formData);
  };

  const handlePreview = () => {
    applyTheme(formData);
    toast({ title: "Theme preview applied", description: "This is a temporary preview" });
  };

  const presetThemes = [
    {
      name: "Orient Medical (Default)",
      primaryColor: "#8BC34A",
      secondaryColor: "#2196F3",
      accentColor: "#1565C0"
    },
    {
      name: "Professional Blue",
      primaryColor: "#1976D2",
      secondaryColor: "#42A5F5",
      accentColor: "#0D47A1"
    },
    {
      name: "Medical Green",
      primaryColor: "#4CAF50",
      secondaryColor: "#81C784",
      accentColor: "#2E7D32"
    },
    {
      name: "Healthcare Purple",
      primaryColor: "#9C27B0",
      secondaryColor: "#BA68C8",
      accentColor: "#6A1B9A"
    }
  ];

  const applyPresetTheme = (preset: any) => {
    setFormData(prev => ({
      ...prev,
      primaryColor: preset.primaryColor,
      secondaryColor: preset.secondaryColor,
      accentColor: preset.accentColor
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Navigation Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
          <Link href="/financial-management">
            <Button variant="ghost" size="sm">Financial</Button>
          </Link>
          <Link href="/marketing">
            <Button variant="ghost" size="sm">Marketing</Button>
          </Link>
          <Link href="/human-resources">
            <Button variant="ghost" size="sm">HR</Button>
          </Link>
        </div>
        <div className="text-sm text-muted-foreground">
          Orient Medical Diagnostic Centre
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Organization Branding</h1>
          <p className="text-muted-foreground">
            Configure your organization's visual identity and contact information
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview} disabled={updateBrandingMutation.isPending}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={updateBrandingMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {updateBrandingMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Organization Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Basic information about your diagnostic center
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                value={formData.organizationName}
                onChange={(e) => handleInputChange("organizationName", e.target.value)}
                placeholder="Orient Medical Diagnostic Centre"
              />
            </div>
            <div>
              <Label htmlFor="organizationSlogan">Slogan/Tagline</Label>
              <Input
                id="organizationSlogan"
                value={formData.organizationSlogan}
                onChange={(e) => handleInputChange("organizationSlogan", e.target.value)}
                placeholder="Your Health, Our Priority"
              />
            </div>
            <div>
              <Label htmlFor="streetAddress">Street Address</Label>
              <Textarea
                id="streetAddress"
                value={formData.streetAddress}
                onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                placeholder="60 Ramat Park, Beside Big Joe Motors"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  placeholder="Lagos"
                />
              </div>
              <div>
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={formData.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  placeholder="Lagos State"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  placeholder="Nigeria"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                  placeholder="100001"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Contact className="w-5 h-5 mr-2" />
              Contact Information
            </CardTitle>
            <CardDescription>
              How patients and partners can reach your organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="primaryEmail">Primary Email</Label>
              <Input
                id="primaryEmail"
                type="email"
                value={formData.primaryEmail}
                onChange={(e) => handleInputChange("primaryEmail", e.target.value)}
                placeholder="info@orientmedicaldiagnosis.com"
              />
            </div>
            <div>
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={formData.supportEmail}
                onChange={(e) => handleInputChange("supportEmail", e.target.value)}
                placeholder="support@orientmedicaldiagnosis.com"
              />
            </div>
            <div>
              <Label htmlFor="primaryPhone">Primary Phone</Label>
              <Input
                id="primaryPhone"
                value={formData.primaryPhone}
                onChange={(e) => handleInputChange("primaryPhone", e.target.value)}
                placeholder="08023448284"
              />
            </div>
            <div>
              <Label htmlFor="secondaryPhone">Secondary Phone</Label>
              <Input
                id="secondaryPhone"
                value={formData.secondaryPhone}
                onChange={(e) => handleInputChange("secondaryPhone", e.target.value)}
                placeholder="+234 802 344 8285"
              />
            </div>
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => handleInputChange("website", e.target.value)}
                placeholder="www.orientmedicaldiagnosis.com"
              />
            </div>
          </CardContent>
        </Card>

        {/* Color Theme Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="w-5 h-5 mr-2" />
              Color Theme
            </CardTitle>
            <CardDescription>
              Customize your organization's color palette for a consistent brand experience
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preset Themes */}
            <div>
              <Label className="text-base font-medium">Preset Themes</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                {presetThemes.map((preset) => (
                  <Button
                    key={preset.name}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-center space-y-2"
                    onClick={() => applyPresetTheme(preset)}
                  >
                    <div className="flex space-x-1">
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: preset.primaryColor }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: preset.secondaryColor }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full border" 
                        style={{ backgroundColor: preset.accentColor }}
                      />
                    </div>
                    <span className="text-xs text-center">{preset.name}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Custom Colors */}
            <div>
              <Label className="text-base font-medium">Custom Colors</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-3">
                <div>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => handleInputChange("primaryColor", e.target.value)}
                      placeholder="#8BC34A"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => handleInputChange("secondaryColor", e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.secondaryColor}
                      onChange={(e) => handleInputChange("secondaryColor", e.target.value)}
                      placeholder="#2196F3"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="accentColor">Accent Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="accentColor"
                      type="color"
                      value={formData.accentColor}
                      onChange={(e) => handleInputChange("accentColor", e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.accentColor}
                      onChange={(e) => handleInputChange("accentColor", e.target.value)}
                      placeholder="#1565C0"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="backgroundColor">Background</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange("backgroundColor", e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.backgroundColor}
                      onChange={(e) => handleInputChange("backgroundColor", e.target.value)}
                      placeholder="#FFFFFF"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="textColor">Text Color</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={formData.textColor}
                      onChange={(e) => handleInputChange("textColor", e.target.value)}
                      className="w-16 h-10 p-1 border rounded"
                    />
                    <Input
                      value={formData.textColor}
                      onChange={(e) => handleInputChange("textColor", e.target.value)}
                      placeholder="#2C3E50"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <div>
              <Label className="text-base font-medium">Color Preview</Label>
              <div className="mt-3 p-6 border rounded-lg" style={{ 
                backgroundColor: formData.backgroundColor,
                color: formData.textColor 
              }}>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold" style={{ color: formData.primaryColor }}>
                    {formData.organizationName || "Your Organization Name"}
                  </h3>
                  <p className="text-sm" style={{ color: formData.textColor }}>
                    {formData.organizationSlogan || "Your organization slogan appears here"}
                  </p>
                  <div className="flex space-x-2">
                    <Badge style={{ backgroundColor: formData.primaryColor, color: "white" }}>
                      Primary
                    </Badge>
                    <Badge style={{ backgroundColor: formData.secondaryColor, color: "white" }}>
                      Secondary
                    </Badge>
                    <Badge style={{ backgroundColor: formData.accentColor, color: "white" }}>
                      Accent
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Branding Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Deployment Information
            </CardTitle>
            <CardDescription>
              System configuration for multi-tenant deployment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">System Status</div>
                <div className="text-lg font-semibold text-green-600">Active</div>
                <div className="text-xs text-muted-foreground">Multi-tenant ready</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Branding Status</div>
                <div className="text-lg font-semibold">
                  {currentBranding ? "Configured" : "Default"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {currentBranding ? "Custom branding active" : "Using default Orient Medical theme"}
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Deployment Ready</div>
                <div className="text-lg font-semibold text-blue-600">Yes</div>
                <div className="text-xs text-muted-foreground">Can be deployed to other centers</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}