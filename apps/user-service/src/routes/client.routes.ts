import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { pool } from '../index';
import { authenticate, NotFoundError } from '../lib';

const router: Router = Router();

// ─── Zod Validation Schema ────────────────────────────────────────
const clientProfileUpdateSchema = z.object({
  clientType: z.enum(['individual', 'business']).optional(),
  contactName: z.string().min(2).optional().or(z.literal('')),
  businessEmail: z.string().email().optional().or(z.literal('')),
  businessPhone: z.string().min(5).optional().or(z.literal('')),
  companyName: z.string().min(2).optional().or(z.literal('')),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  industry: z.string().min(2).optional().or(z.literal('')),
  companyDescription: z.string().max(500).optional().or(z.literal('')),
  location: z.string().min(2).optional(),
  country: z.string().min(2).optional(),
  timezone: z.string().min(2).optional(),
  budgetRange: z.enum(['<$5k', '$5k-$10k', '$10k-$25k', '$25k-$50k', '$50k+']).optional(),
  preferredContractTypes: z.array(z.string()).optional(),
});

// Get client profile (supports both individual and business)
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT u.id, u.first_name, u.last_name, u.avatar_url,
              c.client_type,
              c.contact_name, c.business_email, c.business_phone,
              c.company_name, c.company_size, c.industry, c.company_description,
              c.location, c.country, c.timezone, c.budget_range,
              c.preferred_contract_types,
              c.projects_posted, u.is_verified as verified, c.verification_status, c.created_at
       FROM users u
       JOIN client_profiles c ON u.id = c.user_id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Client');
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        firstName: row.first_name,
        lastName: row.last_name,
        avatarUrl: row.avatar_url,
        clientType: row.client_type,
        contactName: row.contact_name,
        businessEmail: row.business_email,
        businessPhone: row.business_phone,
        companyName: row.company_name,
        companySize: row.company_size,
        industry: row.industry,
        companyDescription: row.company_description,
        location: row.location,
        country: row.country,
        timezone: row.timezone,
        budgetRange: row.budget_range,
        preferredContractTypes: row.preferred_contract_types,
        projectsPosted: row.projects_posted,
        verified: row.verified,
        verificationStatus: row.verification_status,
        createdAt: row.created_at
      }
    });
  } catch (error) {
    next(error);
  }
});

// Update client profile (supports both individual and business)
router.put('/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Authorization: compare as strings (UUIDs)
    if (req.user!.userId !== id) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    // Validate input with Zod
    const data = clientProfileUpdateSchema.parse(req.body);

    const result = await pool.query(
      `UPDATE client_profiles SET
        client_type = COALESCE($1, client_type),
        contact_name = COALESCE($2, contact_name),
        business_email = COALESCE($3, business_email),
        business_phone = COALESCE($4, business_phone),
        company_name = COALESCE($5, company_name),
        company_size = COALESCE($6, company_size),
        industry = COALESCE($7, industry),
        company_description = COALESCE($8, company_description),
        location = COALESCE($9, location),
        country = COALESCE($10, country),
        timezone = COALESCE($11, timezone),
        budget_range = COALESCE($12, budget_range),
        preferred_contract_types = COALESCE($13, preferred_contract_types),
        updated_at = NOW()
       WHERE user_id = $14
       RETURNING *`,
      [
        data.clientType || null,
        data.contactName || null,
        data.businessEmail || null,
        data.businessPhone || null,
        data.companyName || null,
        data.companySize || null,
        data.industry || null,
        data.companyDescription || null,
        data.location || null,
        data.country || null,
        data.timezone || null,
        data.budgetRange || null,
        data.preferredContractTypes ? JSON.stringify(data.preferredContractTypes) : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Client profile');
    }

    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        id: row.id,
        userId: row.user_id,
        clientType: row.client_type,
        contactName: row.contact_name,
        businessEmail: row.business_email,
        businessPhone: row.business_phone,
        companyName: row.company_name,
        companySize: row.company_size,
        industry: row.industry,
        companyDescription: row.company_description,
        location: row.location,
        country: row.country,
        timezone: row.timezone,
        budgetRange: row.budget_range,
        preferredContractTypes: row.preferred_contract_types,
        projectsPosted: row.projects_posted,
        verified: row.verified,
        verificationStatus: row.verification_status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

