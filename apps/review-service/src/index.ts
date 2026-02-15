import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Pool } from 'pg';

config();

const app = express();
const PORT = process.env.PORT || 3014;
const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    await pgPool.query('SELECT 1');
    dbStatus = 'connected';
  } catch (error_) {
    // DB may be temporarily unavailable — service is still running
  }
  res.json({ status: 'healthy', service: 'review-service', database: dbStatus });
});

// Create review
app.post('/api/v1/reviews', async (req, res) => {
  const { bookingId, reviewerId, revieweeId, rating, comment, category } = req.body;

  // Validation
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  try {
    const result = await pgPool.query(
      `INSERT INTO reviews (booking_id, reviewer_id, reviewee_id, rating, comment, category)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [bookingId, reviewerId, revieweeId, rating, comment, category]
    );

    // Update user average rating
    await pgPool.query(
      `UPDATE user_profiles 
       SET average_rating = (
         SELECT AVG(rating)::DECIMAL(3,2) FROM reviews WHERE reviewee_id = $1
       ),
       total_reviews = (
         SELECT COUNT(*) FROM reviews WHERE reviewee_id = $1
       )
       WHERE user_id = $1`,
      [revieweeId]
    );

    // Check for badge achievements
    await checkBadgeAchievements(revieweeId);

    res.status(201).json(result.rows[0]);
  } catch (error_) {
    console.error('Create review error:', error_);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// Get reviews for a user
app.get('/api/v1/reviews/user/:userId', async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;

  try {
    const result = await pgPool.query(
      `SELECT r.*, u.username as reviewer_name, u.avatar_url as reviewer_avatar
       FROM reviews r
       LEFT JOIN user_profiles u ON r.reviewer_id = u.user_id
       WHERE r.reviewee_id = $1 
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.params.userId, limit, offset]
    );

    const countResult = await pgPool.query(
      'SELECT COUNT(*) as total FROM reviews WHERE reviewee_id = $1',
      [req.params.userId]
    );

    res.json({
      reviews: result.rows,
      total: Number.parseInt(countResult.rows[0].total),
      limit: Number.parseInt(limit as string),
      offset: Number.parseInt(offset as string)
    });
  } catch (error_) {
    console.error('Get reviews error:', error_);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// Get review statistics
app.get('/api/v1/reviews/stats/:userId', async (req, res) => {
  try {
    const result = await pgPool.query(
      `SELECT 
         AVG(rating)::DECIMAL(3,2) as average_rating,
         COUNT(*) as total_reviews,
         COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
         COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
         COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
         COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
         COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM reviews 
       WHERE reviewee_id = $1`,
      [req.params.userId]
    );

    res.json(result.rows[0]);
  } catch (error_) {
    console.error('Get stats error:', error_);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

// Get user badges
app.get('/api/v1/badges/:userId', async (req, res) => {
  try {
    const result = await pgPool.query(
      `SELECT * FROM user_badges WHERE user_id = $1 ORDER BY earned_at DESC`,
      [req.params.userId]
    );

    res.json(result.rows);
  } catch (error_) {
    console.error('Get reviews error:', error_);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// Check and award badges based on achievements
async function checkBadgeAchievements(userId: string) {
  try {
    const stats = await pgPool.query(
      `SELECT 
         AVG(rating)::DECIMAL(3,2) as avg_rating,
         COUNT(*) as total_reviews
       FROM reviews 
       WHERE reviewee_id = $1`,
      [userId]
    );

    const { avg_rating, total_reviews } = stats.rows[0];

    // 5-star achiever badge (10+ reviews, 5.0 avg)
    if (total_reviews >= 10 && Number.parseFloat(avg_rating) === 5) {
      await awardBadge(userId, 'five_star_achiever', '5-Star Achiever', 'Maintained 5.0 rating with 10+ reviews');
    }

    // Top performer badge (50+ reviews, 4.8+ avg)
    if (total_reviews >= 50 && Number.parseFloat(avg_rating) >= 4.8) {
      await awardBadge(userId, 'top_performer', 'Top Performer', '50+ reviews with 4.8+ average');
    }

    // Trusted professional (100+ reviews, 4.5+ avg)
    if (total_reviews >= 100 && Number.parseFloat(avg_rating) >= 4.5) {
      await awardBadge(userId, 'trusted_professional', 'Trusted Professional', '100+ reviews with excellent ratings');
    }
  } catch (error) {
    console.error('Failed to check badge achievements:', error);
  }
}

async function awardBadge(userId: string, badgeType: string, name: string, description: string) {
  try {
    // Check if badge already exists
    const existing = await pgPool.query(
      'SELECT id FROM user_badges WHERE user_id = $1 AND badge_type = $2',
      [userId, badgeType]
    );

    if (existing.rows.length === 0) {
      await pgPool.query(
        `INSERT INTO user_badges (user_id, badge_type, name, description, earned_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, badgeType, name, description]
      );
      console.log(`🏆 Awarded badge '${name}' to user ${userId}`);
    }
  } catch (error) {
    console.error('Failed to award badge:', error);
  }
}

app.listen(PORT, () => {
  console.log(`⭐ Review Service running on port ${PORT}`);
});
