import { pgTable, serial, text, varchar, timestamp, integer, boolean, json, decimal, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Website Content Management
export const websitePages = pgTable("website_pages", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  title: varchar("title", { length: 500 }).notNull(),
  metaDescription: text("meta_description"),
  content: json("content"),
  template: varchar("template", { length: 100 }).notNull(),
  isPublished: boolean("is_published").notNull().default(false),
  publishedAt: timestamp("published_at"),
  seoKeywords: text("seo_keywords"),
  ogImage: text("og_image"),
  canonicalUrl: text("canonical_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdBy: integer("created_by").notNull(),
  tenantId: integer("tenant_id").notNull()
});

// Website Navigation Management
export const websiteMenus = pgTable("website_menus", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  items: json("items"), // Array of menu items with nested structure
  location: varchar("location", { length: 100 }).notNull(), // header, footer, sidebar
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Website Settings & Configuration
export const websiteSettings = pgTable("website_settings", {
  id: serial("id").primaryKey(),
  siteName: varchar("site_name", { length: 255 }).notNull(),
  siteDescription: text("site_description"),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  address: text("address"),
  socialMedia: json("social_media"), // Facebook, Twitter, LinkedIn, etc.
  theme: varchar("theme", { length: 100 }).notNull().default("professional"),
  logo: text("logo"),
  favicon: text("favicon"),
  analyticsCode: text("analytics_code"),
  customCss: text("custom_css"),
  customJs: text("custom_js"),
  maintenanceMode: boolean("maintenance_mode").notNull().default(false),
  tenantId: integer("tenant_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Blog/News Management
export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImage: text("featured_image"),
  authorId: integer("author_id").notNull(),
  categoryId: integer("category_id"),
  tags: json("tags"), // Array of tag strings
  status: varchar("status", { length: 50 }).notNull().default("draft"),
  publishedAt: timestamp("published_at"),
  metaDescription: text("meta_description"),
  seoKeywords: text("seo_keywords"),
  readingTime: integer("reading_time"), // in minutes
  viewCount: integer("view_count").notNull().default(0),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Blog Categories
export const blogCategories = pgTable("blog_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color code
  sortOrder: integer("sort_order").notNull().default(0),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Services & Pricing
export const websiteServices = pgTable("website_services", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  icon: varchar("icon", { length: 100 }),
  image: text("image"),
  price: decimal("price", { precision: 10, scale: 2 }),
  duration: varchar("duration", { length: 100 }), // "30 minutes", "1 hour", etc.
  category: varchar("category", { length: 100 }),
  isPopular: boolean("is_popular").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  requirements: json("requirements"), // Array of preparation requirements
  benefits: json("benefits"), // Array of service benefits
  sortOrder: integer("sort_order").notNull().default(0),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Contact Form Submissions
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 500 }),
  message: text("message").notNull(),
  type: varchar("type", { length: 100 }).notNull().default("general"), // general, appointment, inquiry
  status: varchar("status", { length: 50 }).notNull().default("new"),
  respondedAt: timestamp("responded_at"),
  respondedBy: integer("responded_by"),
  response: text("response"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Website Analytics & Performance
export const websiteAnalytics = pgTable("website_analytics", {
  id: serial("id").primaryKey(),
  pageUrl: text("page_url").notNull(),
  pageTitle: varchar("page_title", { length: 500 }),
  visitorId: uuid("visitor_id").notNull(),
  sessionId: uuid("session_id").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  referrer: text("referrer"),
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  device: varchar("device", { length: 100 }),
  browser: varchar("browser", { length: 100 }),
  operatingSystem: varchar("operating_system", { length: 100 }),
  screenResolution: varchar("screen_resolution", { length: 50 }),
  timeOnPage: integer("time_on_page"), // in seconds
  exitPage: boolean("exit_page").notNull().default(false),
  tenantId: integer("tenant_id").notNull(),
  visitedAt: timestamp("visited_at").notNull().defaultNow()
});

// SEO & Marketing
export const seoPages = pgTable("seo_pages", {
  id: serial("id").primaryKey(),
  pageUrl: text("page_url").notNull(),
  title: varchar("title", { length: 500 }),
  metaDescription: text("meta_description"),
  keywords: text("keywords"),
  canonicalUrl: text("canonical_url"),
  ogTitle: varchar("og_title", { length: 500 }),
  ogDescription: text("og_description"),
  ogImage: text("og_image"),
  twitterTitle: varchar("twitter_title", { length: 500 }),
  twitterDescription: text("twitter_description"),
  twitterImage: text("twitter_image"),
  structuredData: json("structured_data"),
  robots: varchar("robots", { length: 100 }).notNull().default("index, follow"),
  lastModified: timestamp("last_modified"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Website Testimonials
export const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  patientName: varchar("patient_name", { length: 255 }).notNull(),
  patientImage: text("patient_image"),
  content: text("content").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  service: varchar("service", { length: 255 }),
  isApproved: boolean("is_approved").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  approvedBy: integer("approved_by"),
  approvedAt: timestamp("approved_at"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// FAQ Management
export const faqs = pgTable("faqs", {
  id: serial("id").primaryKey(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 100 }),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  viewCount: integer("view_count").notNull().default(0),
  helpful: integer("helpful").notNull().default(0),
  notHelpful: integer("not_helpful").notNull().default(0),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Website Events & Announcements
export const websiteEvents = pgTable("website_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  location: varchar("location", { length: 255 }),
  eventType: varchar("event_type", { length: 100 }).notNull(), // health_screening, seminar, workshop
  capacity: integer("capacity"),
  registrationRequired: boolean("registration_required").notNull().default(false),
  registrationDeadline: timestamp("registration_deadline"),
  price: decimal("price", { precision: 10, scale: 2 }),
  image: text("image"),
  status: varchar("status", { length: 50 }).notNull().default("upcoming"),
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
});

// Newsletter Subscriptions
export const newsletterSubscriptions = pgTable("newsletter_subscriptions", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  preferences: json("preferences"), // Array of subscription preferences
  confirmationToken: varchar("confirmation_token", { length: 255 }),
  confirmedAt: timestamp("confirmed_at"),
  unsubscribedAt: timestamp("unsubscribed_at"),
  unsubscribeToken: varchar("unsubscribe_token", { length: 255 }),
  source: varchar("source", { length: 100 }), // website, event, referral
  tenantId: integer("tenant_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow()
});

// Insert Schemas
export const insertWebsitePageSchema = createInsertSchema(websitePages);
export const insertWebsiteMenuSchema = createInsertSchema(websiteMenus);
export const insertWebsiteSettingsSchema = createInsertSchema(websiteSettings);
export const insertBlogPostSchema = createInsertSchema(blogPosts);
export const insertBlogCategorySchema = createInsertSchema(blogCategories);
export const insertWebsiteServiceSchema = createInsertSchema(websiteServices);
export const insertContactSubmissionSchema = createInsertSchema(contactSubmissions);
export const insertWebsiteAnalyticsSchema = createInsertSchema(websiteAnalytics);
export const insertSeoPageSchema = createInsertSchema(seoPages);
export const insertTestimonialSchema = createInsertSchema(testimonials);
export const insertFaqSchema = createInsertSchema(faqs);
export const insertWebsiteEventSchema = createInsertSchema(websiteEvents);
export const insertNewsletterSubscriptionSchema = createInsertSchema(newsletterSubscriptions);

// Type Definitions
export type WebsitePage = typeof websitePages.$inferSelect;
export type InsertWebsitePage = z.infer<typeof insertWebsitePageSchema>;
export type WebsiteMenu = typeof websiteMenus.$inferSelect;
export type InsertWebsiteMenu = z.infer<typeof insertWebsiteMenuSchema>;
export type WebsiteSettings = typeof websiteSettings.$inferSelect;
export type InsertWebsiteSettings = z.infer<typeof insertWebsiteSettingsSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type InsertBlogCategory = z.infer<typeof insertBlogCategorySchema>;
export type WebsiteService = typeof websiteServices.$inferSelect;
export type InsertWebsiteService = z.infer<typeof insertWebsiteServiceSchema>;
export type ContactSubmission = typeof contactSubmissions.$inferSelect;
export type InsertContactSubmission = z.infer<typeof insertContactSubmissionSchema>;
export type WebsiteAnalytics = typeof websiteAnalytics.$inferSelect;
export type InsertWebsiteAnalytics = z.infer<typeof insertWebsiteAnalyticsSchema>;
export type SeoPage = typeof seoPages.$inferSelect;
export type InsertSeoPage = z.infer<typeof insertSeoPageSchema>;
export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Faq = typeof faqs.$inferSelect;
export type InsertFaq = z.infer<typeof insertFaqSchema>;
export type WebsiteEvent = typeof websiteEvents.$inferSelect;
export type InsertWebsiteEvent = z.infer<typeof insertWebsiteEventSchema>;
export type NewsletterSubscription = typeof newsletterSubscriptions.$inferSelect;
export type InsertNewsletterSubscription = z.infer<typeof insertNewsletterSubscriptionSchema>;