import { pgTable, serial, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organization Branding Configuration
export const organizationBranding = pgTable("organization_branding", {
  id: serial("id").primaryKey(),
  tenantId: serial("tenant_id").notNull(),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  organizationSlogan: varchar("organization_slogan", { length: 500 }),
  logoUrl: varchar("logo_url", { length: 500 }),
  faviconUrl: varchar("favicon_url", { length: 500 }),
  
  // Contact Information
  primaryEmail: varchar("primary_email", { length: 255 }),
  supportEmail: varchar("support_email", { length: 255 }),
  primaryPhone: varchar("primary_phone", { length: 50 }),
  secondaryPhone: varchar("secondary_phone", { length: 50 }),
  website: varchar("website", { length: 255 }),
  
  // Address Information
  streetAddress: text("street_address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  country: varchar("country", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  
  // Color Theme Configuration
  primaryColor: varchar("primary_color", { length: 7 }).default("#8BC34A"), // Green
  secondaryColor: varchar("secondary_color", { length: 7 }).default("#2196F3"), // Blue
  accentColor: varchar("accent_color", { length: 7 }).default("#1565C0"), // Navy Blue
  backgroundColor: varchar("background_color", { length: 7 }).default("#FFFFFF"),
  textColor: varchar("text_color", { length: 7 }).default("#2C3E50"),
  
  // Social Media & Online Presence
  facebookUrl: varchar("facebook_url", { length: 255 }),
  twitterUrl: varchar("twitter_url", { length: 255 }),
  linkedinUrl: varchar("linkedin_url", { length: 255 }),
  instagramUrl: varchar("instagram_url", { length: 255 }),
  
  // Business Information
  businessRegistrationNumber: varchar("business_registration_number", { length: 100 }),
  taxId: varchar("tax_id", { length: 100 }),
  establishedYear: varchar("established_year", { length: 4 }),
  
  // System Configuration
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertOrganizationBrandingSchema = createInsertSchema(organizationBranding).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type OrganizationBranding = typeof organizationBranding.$inferSelect;
export type InsertOrganizationBranding = z.infer<typeof insertOrganizationBrandingSchema>;