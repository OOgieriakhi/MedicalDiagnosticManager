import { createContext, ReactNode, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "../lib/queryClient";

type BrandingTheme = {
  organizationName: string;
  organizationSlogan?: string;
  logoUrl?: string;
  primaryEmail?: string;
  supportEmail?: string;
  primaryPhone?: string;
  secondaryPhone?: string;
  website?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
};

type BrandingContextType = {
  branding: BrandingTheme | null;
  isLoading: boolean;
  error: Error | null;
  applyTheme: (theme: BrandingTheme) => void;
};

const defaultBranding: BrandingTheme = {
  organizationName: "Orient Medical Diagnostic Centre",
  organizationSlogan: "Your Health, Our Priority",
  primaryEmail: "info@orientmedicaldiagnosis.com",
  primaryPhone: "08023448284",
  website: "www.orientmedicaldiagnosis.com",
  streetAddress: "60 Ramat Park, Beside Big Joe Motors",
  city: "Lagos",
  state: "Lagos State",
  country: "Nigeria",
  primaryColor: "#8BC34A",
  secondaryColor: "#2196F3",
  accentColor: "#1565C0",
  backgroundColor: "#FFFFFF",
  textColor: "#2C3E50"
};

export const BrandingContext = createContext<BrandingContextType | null>(null);

export function BrandingProvider({ children }: { children: ReactNode }) {
  const {
    data: branding,
    error,
    isLoading,
  } = useQuery<BrandingTheme | undefined, Error>({
    queryKey: ["/api/organization-branding"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Apply CSS custom properties for dynamic theming
  const applyTheme = (theme: BrandingTheme) => {
    const root = document.documentElement;
    
    // Convert hex colors to HSL values for better CSS variable support
    const hexToHsl = (hex: string) => {
      if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
        return { h: 0, s: 0, l: 50 }; // Return neutral values for invalid hex
      }
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Apply theme colors as CSS custom properties
    root.style.setProperty('--primary', hexToHsl(theme.primaryColor));
    root.style.setProperty('--secondary', hexToHsl(theme.secondaryColor));
    root.style.setProperty('--accent', hexToHsl(theme.accentColor));
    root.style.setProperty('--background', hexToHsl(theme.backgroundColor));
    root.style.setProperty('--foreground', hexToHsl(theme.textColor));
    
    // Update document title
    document.title = `${theme.organizationName} - ERP System`;
    
    // Update favicon if provided
    if (theme.logoUrl) {
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
      if (favicon) {
        favicon.href = theme.logoUrl;
      }
    }
  };

  // Apply theme when branding data is loaded
  useEffect(() => {
    const activeTheme = branding || defaultBranding;
    applyTheme(activeTheme);
  }, [branding]);

  return (
    <BrandingContext.Provider
      value={{
        branding: branding || defaultBranding,
        isLoading,
        error,
        applyTheme,
      }}
    >
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (!context) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}