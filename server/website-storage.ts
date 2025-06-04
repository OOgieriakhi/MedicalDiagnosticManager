import { db } from "./db";
import { eq, desc, asc, and, or, like, count } from "drizzle-orm";
import * as websiteSchema from "@shared/website-schema";

export class WebsiteStorage {
  // Website Pages Management
  async getWebsitePages(tenantId: number, published = true) {
    const query = db.select().from(websiteSchema.websitePages)
      .where(and(
        eq(websiteSchema.websitePages.tenantId, tenantId),
        published ? eq(websiteSchema.websitePages.isPublished, true) : undefined
      ))
      .orderBy(desc(websiteSchema.websitePages.createdAt));
    
    return await query;
  }

  async getWebsitePageBySlug(slug: string, tenantId: number) {
    const [page] = await db.select().from(websiteSchema.websitePages)
      .where(and(
        eq(websiteSchema.websitePages.slug, slug),
        eq(websiteSchema.websitePages.tenantId, tenantId),
        eq(websiteSchema.websitePages.isPublished, true)
      ));
    return page;
  }

  async createWebsitePage(data: websiteSchema.InsertWebsitePage) {
    const [page] = await db.insert(websiteSchema.websitePages)
      .values(data)
      .returning();
    return page;
  }

  async updateWebsitePage(id: number, data: Partial<websiteSchema.InsertWebsitePage>) {
    const [page] = await db.update(websiteSchema.websitePages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(websiteSchema.websitePages.id, id))
      .returning();
    return page;
  }

  // Website Settings
  async getWebsiteSettings(tenantId: number) {
    const [settings] = await db.select().from(websiteSchema.websiteSettings)
      .where(eq(websiteSchema.websiteSettings.tenantId, tenantId));
    return settings;
  }

  async updateWebsiteSettings(tenantId: number, data: Partial<websiteSchema.InsertWebsiteSettings>) {
    const [settings] = await db.insert(websiteSchema.websiteSettings)
      .values({ ...data, tenantId })
      .onConflictDoUpdate({
        target: websiteSchema.websiteSettings.tenantId,
        set: { ...data, updatedAt: new Date() }
      })
      .returning();
    return settings;
  }

  // Website Navigation
  async getWebsiteMenus(tenantId: number, location?: string) {
    const query = db.select().from(websiteSchema.websiteMenus)
      .where(and(
        eq(websiteSchema.websiteMenus.tenantId, tenantId),
        eq(websiteSchema.websiteMenus.isActive, true),
        location ? eq(websiteSchema.websiteMenus.location, location) : undefined
      ))
      .orderBy(asc(websiteSchema.websiteMenus.sortOrder));
    
    return await query;
  }

  async createWebsiteMenu(data: websiteSchema.InsertWebsiteMenu) {
    const [menu] = await db.insert(websiteSchema.websiteMenus)
      .values(data)
      .returning();
    return menu;
  }

  // Blog Management
  async getBlogPosts(tenantId: number, categoryId?: number, limit = 10) {
    const query = db.select().from(websiteSchema.blogPosts)
      .where(and(
        eq(websiteSchema.blogPosts.tenantId, tenantId),
        eq(websiteSchema.blogPosts.status, "published"),
        categoryId ? eq(websiteSchema.blogPosts.categoryId, categoryId) : undefined
      ))
      .orderBy(desc(websiteSchema.blogPosts.publishedAt))
      .limit(limit);
    
    return await query;
  }

  async getBlogPostBySlug(slug: string, tenantId: number) {
    const [post] = await db.select().from(websiteSchema.blogPosts)
      .where(and(
        eq(websiteSchema.blogPosts.slug, slug),
        eq(websiteSchema.blogPosts.tenantId, tenantId),
        eq(websiteSchema.blogPosts.status, "published")
      ));
    
    if (post) {
      // Increment view count
      await db.update(websiteSchema.blogPosts)
        .set({ viewCount: post.viewCount + 1 })
        .where(eq(websiteSchema.blogPosts.id, post.id));
    }
    
    return post;
  }

  async createBlogPost(data: websiteSchema.InsertBlogPost) {
    const [post] = await db.insert(websiteSchema.blogPosts)
      .values(data)
      .returning();
    return post;
  }

  async getBlogCategories(tenantId: number) {
    return await db.select().from(websiteSchema.blogCategories)
      .where(eq(websiteSchema.blogCategories.tenantId, tenantId))
      .orderBy(asc(websiteSchema.blogCategories.sortOrder));
  }

  // Services Management
  async getWebsiteServices(tenantId: number, category?: string) {
    const query = db.select().from(websiteSchema.websiteServices)
      .where(and(
        eq(websiteSchema.websiteServices.tenantId, tenantId),
        eq(websiteSchema.websiteServices.isActive, true),
        category ? eq(websiteSchema.websiteServices.category, category) : undefined
      ))
      .orderBy(asc(websiteSchema.websiteServices.sortOrder));
    
    return await query;
  }

  async getWebsiteServiceBySlug(slug: string, tenantId: number) {
    const [service] = await db.select().from(websiteSchema.websiteServices)
      .where(and(
        eq(websiteSchema.websiteServices.slug, slug),
        eq(websiteSchema.websiteServices.tenantId, tenantId),
        eq(websiteSchema.websiteServices.isActive, true)
      ));
    return service;
  }

  async createWebsiteService(data: websiteSchema.InsertWebsiteService) {
    const [service] = await db.insert(websiteSchema.websiteServices)
      .values(data)
      .returning();
    return service;
  }

  // Contact Form Management
  async createContactSubmission(data: websiteSchema.InsertContactSubmission) {
    const [submission] = await db.insert(websiteSchema.contactSubmissions)
      .values(data)
      .returning();
    return submission;
  }

  async getContactSubmissions(tenantId: number, status?: string, limit = 50) {
    const query = db.select().from(websiteSchema.contactSubmissions)
      .where(and(
        eq(websiteSchema.contactSubmissions.tenantId, tenantId),
        status ? eq(websiteSchema.contactSubmissions.status, status) : undefined
      ))
      .orderBy(desc(websiteSchema.contactSubmissions.createdAt))
      .limit(limit);
    
    return await query;
  }

  // Testimonials
  async getTestimonials(tenantId: number, featured = false, limit = 10) {
    const query = db.select().from(websiteSchema.testimonials)
      .where(and(
        eq(websiteSchema.testimonials.tenantId, tenantId),
        eq(websiteSchema.testimonials.isApproved, true),
        featured ? eq(websiteSchema.testimonials.isFeatured, true) : undefined
      ))
      .orderBy(desc(websiteSchema.testimonials.createdAt))
      .limit(limit);
    
    return await query;
  }

  async createTestimonial(data: websiteSchema.InsertTestimonial) {
    const [testimonial] = await db.insert(websiteSchema.testimonials)
      .values(data)
      .returning();
    return testimonial;
  }

  // FAQ Management
  async getFaqs(tenantId: number, category?: string) {
    const query = db.select().from(websiteSchema.faqs)
      .where(and(
        eq(websiteSchema.faqs.tenantId, tenantId),
        eq(websiteSchema.faqs.isActive, true),
        category ? eq(websiteSchema.faqs.category, category) : undefined
      ))
      .orderBy(asc(websiteSchema.faqs.sortOrder));
    
    return await query;
  }

  async createFaq(data: websiteSchema.InsertFaq) {
    const [faq] = await db.insert(websiteSchema.faqs)
      .values(data)
      .returning();
    return faq;
  }

  // Website Events
  async getWebsiteEvents(tenantId: number, status = "upcoming", limit = 10) {
    const query = db.select().from(websiteSchema.websiteEvents)
      .where(and(
        eq(websiteSchema.websiteEvents.tenantId, tenantId),
        eq(websiteSchema.websiteEvents.status, status)
      ))
      .orderBy(asc(websiteSchema.websiteEvents.startDate))
      .limit(limit);
    
    return await query;
  }

  async createWebsiteEvent(data: websiteSchema.InsertWebsiteEvent) {
    const [event] = await db.insert(websiteSchema.websiteEvents)
      .values(data)
      .returning();
    return event;
  }

  // Newsletter Management
  async createNewsletterSubscription(data: websiteSchema.InsertNewsletterSubscription) {
    const [subscription] = await db.insert(websiteSchema.newsletterSubscriptions)
      .values(data)
      .returning();
    return subscription;
  }

  async getNewsletterSubscriptions(tenantId: number, status = "active") {
    return await db.select().from(websiteSchema.newsletterSubscriptions)
      .where(and(
        eq(websiteSchema.newsletterSubscriptions.tenantId, tenantId),
        eq(websiteSchema.newsletterSubscriptions.status, status)
      ))
      .orderBy(desc(websiteSchema.newsletterSubscriptions.createdAt));
  }

  // Analytics
  async recordPageVisit(data: websiteSchema.InsertWebsiteAnalytics) {
    const [visit] = await db.insert(websiteSchema.websiteAnalytics)
      .values(data)
      .returning();
    return visit;
  }

  async getWebsiteAnalytics(tenantId: number, startDate: Date, endDate: Date) {
    const pageViews = await db.select({
      pageUrl: websiteSchema.websiteAnalytics.pageUrl,
      views: count()
    })
    .from(websiteSchema.websiteAnalytics)
    .where(and(
      eq(websiteSchema.websiteAnalytics.tenantId, tenantId),
      and(
        gte(websiteSchema.websiteAnalytics.visitedAt, startDate),
        lte(websiteSchema.websiteAnalytics.visitedAt, endDate)
      )
    ))
    .groupBy(websiteSchema.websiteAnalytics.pageUrl)
    .orderBy(desc(count()));

    return { pageViews };
  }

  // SEO Management
  async getSeoPage(pageUrl: string, tenantId: number) {
    const [seoPage] = await db.select().from(websiteSchema.seoPages)
      .where(and(
        eq(websiteSchema.seoPages.pageUrl, pageUrl),
        eq(websiteSchema.seoPages.tenantId, tenantId)
      ));
    return seoPage;
  }

  async createOrUpdateSeoPage(data: websiteSchema.InsertSeoPage) {
    const [seoPage] = await db.insert(websiteSchema.seoPages)
      .values(data)
      .onConflictDoUpdate({
        target: [websiteSchema.seoPages.pageUrl, websiteSchema.seoPages.tenantId],
        set: { ...data, updatedAt: new Date() }
      })
      .returning();
    return seoPage;
  }
}

export const websiteStorage = new WebsiteStorage();