import { pool } from "./db";

export interface IBrandingStorage {
  getOrganizationBranding(tenantId: number): Promise<any>;
  updateOrganizationBranding(tenantId: number, brandingData: any): Promise<any>;
  createOrganizationBranding(brandingData: any): Promise<any>;
}

export class BrandingStorage implements IBrandingStorage {
  async getOrganizationBranding(tenantId: number): Promise<any> {
    try {
      const query = `
        SELECT 
          id,
          tenant_id as "tenantId",
          organization_name as "organizationName",
          organization_slogan as "organizationSlogan",
          logo_url as "logoUrl",
          favicon_url as "faviconUrl",
          primary_email as "primaryEmail",
          support_email as "supportEmail",
          primary_phone as "primaryPhone",
          secondary_phone as "secondaryPhone",
          website,
          street_address as "streetAddress",
          city,
          state,
          country,
          postal_code as "postalCode",
          primary_color as "primaryColor",
          secondary_color as "secondaryColor",
          accent_color as "accentColor",
          background_color as "backgroundColor",
          text_color as "textColor",
          facebook_url as "facebookUrl",
          twitter_url as "twitterUrl",
          linkedin_url as "linkedinUrl",
          instagram_url as "instagramUrl",
          business_registration_number as "businessRegistrationNumber",
          tax_id as "taxId",
          established_year as "establishedYear",
          is_active as "isActive"
        FROM organization_branding 
        WHERE tenant_id = $1 AND is_active = true
        LIMIT 1
      `;

      const result = await pool.query(query, [tenantId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching organization branding:', error);
      return null;
    }
  }

  async updateOrganizationBranding(tenantId: number, brandingData: any): Promise<any> {
    try {
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      // Build dynamic update query
      const fieldMappings = {
        organizationName: 'organization_name',
        organizationSlogan: 'organization_slogan',
        logoUrl: 'logo_url',
        faviconUrl: 'favicon_url',
        primaryEmail: 'primary_email',
        supportEmail: 'support_email',
        primaryPhone: 'primary_phone',
        secondaryPhone: 'secondary_phone',
        website: 'website',
        streetAddress: 'street_address',
        city: 'city',
        state: 'state',
        country: 'country',
        postalCode: 'postal_code',
        primaryColor: 'primary_color',
        secondaryColor: 'secondary_color',
        accentColor: 'accent_color',
        backgroundColor: 'background_color',
        textColor: 'text_color',
        facebookUrl: 'facebook_url',
        twitterUrl: 'twitter_url',
        linkedinUrl: 'linkedin_url',
        instagramUrl: 'instagram_url',
        businessRegistrationNumber: 'business_registration_number',
        taxId: 'tax_id',
        establishedYear: 'established_year'
      };

      for (const [camelCase, snake_case] of Object.entries(fieldMappings)) {
        if (brandingData[camelCase] !== undefined) {
          updateFields.push(`${snake_case} = $${paramIndex}`);
          values.push(brandingData[camelCase]);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(tenantId);

      const query = `
        UPDATE organization_branding 
        SET ${updateFields.join(', ')}
        WHERE tenant_id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating organization branding:', error);
      throw error;
    }
  }

  async createOrganizationBranding(brandingData: any): Promise<any> {
    try {
      const query = `
        INSERT INTO organization_branding (
          tenant_id, organization_name, organization_slogan,
          logo_url, favicon_url, primary_email, support_email,
          primary_phone, secondary_phone, website,
          street_address, city, state, country, postal_code,
          primary_color, secondary_color, accent_color,
          background_color, text_color,
          facebook_url, twitter_url, linkedin_url, instagram_url,
          business_registration_number, tax_id, established_year
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
        RETURNING *
      `;

      const values = [
        brandingData.tenantId,
        brandingData.organizationName,
        brandingData.organizationSlogan,
        brandingData.logoUrl,
        brandingData.faviconUrl,
        brandingData.primaryEmail,
        brandingData.supportEmail,
        brandingData.primaryPhone,
        brandingData.secondaryPhone,
        brandingData.website,
        brandingData.streetAddress,
        brandingData.city,
        brandingData.state,
        brandingData.country,
        brandingData.postalCode,
        brandingData.primaryColor || '#8BC34A',
        brandingData.secondaryColor || '#2196F3',
        brandingData.accentColor || '#1565C0',
        brandingData.backgroundColor || '#FFFFFF',
        brandingData.textColor || '#2C3E50',
        brandingData.facebookUrl,
        brandingData.twitterUrl,
        brandingData.linkedinUrl,
        brandingData.instagramUrl,
        brandingData.businessRegistrationNumber,
        brandingData.taxId,
        brandingData.establishedYear
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating organization branding:', error);
      throw error;
    }
  }
}

export const brandingStorage = new BrandingStorage();