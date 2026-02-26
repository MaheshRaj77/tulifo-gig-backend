import { Router, Request, Response, NextFunction } from 'express';
import { pool } from '../index';
import { authenticate, NotFoundError } from '../lib';

const router: Router = Router();

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
              c.projects_posted, c.verified, c.verification_status, c.created_at
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
    const userId = typeof req.user!.userId === 'string' ? parseInt(req.user!.userId) : req.user!.userId;
    if (userId !== parseInt(id)) {
      return res.status(403).json({ success: false, error: { message: 'Forbidden' } });
    }

    const {
      contactName,
      businessEmail,
      businessPhone,
      companyName,
      companySize,
      industry,
      companyDescription,
      location,
      country,
      timezone,
      budgetRange,
      preferredContractTypes,
    } = req.body;

    const result = await pool.query(
      `UPDATE client_profiles SET
        contact_name = COALESCE($1, contact_name),
        business_email = COALESCE($2, business_email),
        business_phone = COALESCE($3, business_phone),
        company_name = COALESCE($4, company_name),
        company_size = COALESCE($5, company_size),
        industry = COALESCE($6, industry),
        company_description = COALESCE($7, company_description),
        location = COALESCE($8, location),
        country = COALESCE($9, country),
        timezone = COALESCE($10, timezone),
        budget_range = COALESCE($11, budget_range),
        preferred_contract_types = COALESCE($12, preferred_contract_types),
        updated_at = NOW()
       WHERE user_id = $13
       RETURNING *`,
      [
        contactName || null,
        businessEmail || null,
        businessPhone || null,
        companyName || null,
        companySize || null,
        industry || null,
        companyDescription || null,
        location || null,
        country || null,
        timezone || null,
        budgetRange || null,
        preferredContractTypes ? JSON.stringify(preferredContractTypes) : null,
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
