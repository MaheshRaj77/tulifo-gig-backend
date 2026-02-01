import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from 'dotenv';
import { Client } from '@elastic/elasticsearch';

config();

const app = express();
const PORT = process.env.PORT || 3015;
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://elasticsearch:9200'
});

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await esClient.ping();
    res.json({ status: 'healthy', service: 'search-service' });
  } catch (error_) {
    console.error('Health check error:', error_);
    res.status(503).json({ status: 'unhealthy', service: 'search-service' });
  }
});

// Helper function to build worker search query
function buildWorkerSearchQuery(params: any) {
  const { query, skills, minRate, maxRate, minRating, location, availability, categories } = params;
  const must: any[] = [];
  const filter: any[] = [];
  
  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'tagline^2', 'bio', 'skills.name^2'],
        fuzziness: 'AUTO'
      }
    });
  }
  
  if (skills && skills.length > 0) {
    must.push({
      nested: {
        path: 'skills',
        query: {
          terms: { 'skills.name.keyword': skills }
        }
      }
    });
  }
  
  if (minRate || maxRate) {
    const range: any = {};
    if (minRate) range.gte = minRate;
    if (maxRate) range.lte = maxRate;
    filter.push({ range: { hourlyRate: range } });
  }
  
  if (minRating) {
    filter.push({ range: { averageRating: { gte: minRating } } });
  }
  
  if (location) {
    must.push({
      match: { 'location.city': { query: location, fuzziness: 'AUTO' } }
    });
  }
  
  if (availability) {
    filter.push({ term: { 'availability.status': availability } });
  }
  
  if (categories && categories.length > 0) {
    filter.push({ terms: { 'categories.keyword': categories } });
  }
  
  return { must, filter };
}

// Unified worker search
app.post('/api/v1/search/workers', async (req, res) => {
  const { 
    query, 
    skills, 
    minRate, 
    maxRate, 
    minRating, 
    location,
    availability,
    categories,
    limit = 20,
    offset = 0
  } = req.body;
  
  const { must, filter } = buildWorkerSearchQuery({
    query, skills, minRate, maxRate, minRating, location, availability, categories
  });
  
  try {
    const result = await esClient.search({
      index: 'workers',
      body: {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort: [
          { _score: { order: 'desc' } },
          { averageRating: { order: 'desc' } },
          { totalProjects: { order: 'desc' } }
        ],
        from: offset,
        size: limit,
        highlight: {
          fields: {
            title: {},
            tagline: {},
            bio: {}
          }
        }
      }
    });
    
    res.json({
      workers: result.hits.hits.map((hit: any) => ({
        ...hit._source,
        _id: hit._id,
        _score: hit._score,
        highlights: hit.highlight
      })),
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value,
      limit,
      offset
    });
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Search projects
app.post('/api/v1/search/projects', async (req, res) => {
  const { 
    query, 
    status,
    minBudget,
    maxBudget,
    skills,
    limit = 20,
    offset = 0
  } = req.body;
  
  const must: any[] = [];
  const filter: any[] = [];
  
  if (query) {
    must.push({
      multi_match: {
        query,
        fields: ['title^3', 'description^2', 'requirements'],
        fuzziness: 'AUTO'
      }
    });
  }
  
  if (status) {
    filter.push({ term: { status } });
  }
  
  if (minBudget || maxBudget) {
    const range: any = {};
    if (minBudget) range.gte = minBudget;
    if (maxBudget) range.lte = maxBudget;
    filter.push({ range: { budget: range } });
  }
  
  if (skills && skills.length > 0) {
    filter.push({ terms: { 'requiredSkills.keyword': skills } });
  }
  
  try {
    const result = await esClient.search({
      index: 'projects',
      body: {
        query: {
          bool: {
            must: must.length > 0 ? must : [{ match_all: {} }],
            filter
          }
        },
        sort: [{ createdAt: { order: 'desc' } }],
        from: offset,
        size: limit
      }
    });
    
    res.json({
      projects: result.hits.hits.map((hit: any) => hit._source),
      total: typeof result.hits.total === 'number' ? result.hits.total : result.hits.total?.value,
      limit,
      offset
    });
  } catch (error) {
    console.error('Project search failed:', error);
    res.status(500).json({ error: 'Project search failed' });
  }
});

// Get search suggestions/autocomplete
app.get('/api/v1/search/suggest', async (req, res) => {
  let { q, field = 'skills' } = req.query;
  
  // Ensure q is a string
  if (Array.isArray(q)) q = q[0];
  
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }
  
  try {
    const result: any = await esClient.search({
      index: 'workers',
      suggest: {
        skill_suggest: {
          prefix: q as string,
          completion: {
            field: 'skillSuggest',
            size: 10,
            fuzzy: { fuzziness: 'AUTO' }
          }
        }
      }
    });
    
    const suggestions = result.suggest?.skill_suggest[0].options.map((opt: any) => opt.text) || [];
    res.json({ suggestions });
  } catch (error) {
    console.error('Autocomplete failed:', error);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

app.listen(PORT, () => {
  console.log(`🔍 Search Service running on port ${PORT}`);
});
