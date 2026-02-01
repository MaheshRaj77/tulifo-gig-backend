import { Db, ObjectId } from 'mongodb';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';
import axios from 'axios';
import { logger } from '../utils/logger';

export class WorkerService {
  async searchWorkers(es: ElasticsearchClient, db: Db, filters: any) {
    const must: any[] = [];

    // Skills filter
    if (filters.skills && filters.skills.length > 0) {
      must.push({
        nested: {
          path: 'skills',
          query: {
            terms: { 'skills.name.keyword': filters.skills }
          }
        }
      });
    }

    // Hourly rate range
    if (filters.minRate || filters.maxRate) {
      const rangeQuery: any = {};
      if (filters.minRate) rangeQuery.gte = filters.minRate;
      if (filters.maxRate) rangeQuery.lte = filters.maxRate;
      must.push({ range: { hourlyRate: rangeQuery } });
    }

    // Minimum rating
    if (filters.minRating) {
      must.push({ range: { averageRating: { gte: filters.minRating } } });
    }

    const response: any = await es.search({
      index: 'workers',
      body: {
        query: {
          bool: { must }
        },
        from: (filters.page - 1) * filters.limit,
        size: filters.limit,
        sort: [{ averageRating: { order: 'desc' } }]
      }
    });

    const data = response && typeof response === 'object' && response.hits ? response : response?.body || {};
    const workers = (data.hits?.hits || []).map((hit: any) => ({
      ...hit._source,
      _score: hit._score
    }));

    const total = typeof data.hits?.total === 'number' ? data.hits.total : data.hits?.total?.value || 0;
    return {
      workers,
      total,
      page: filters.page,
      pages: Math.ceil(data.hits.total.value / filters.limit)
    };
  }

  async getWorkerById(db: Db, workerId: string) {
    return await db.collection('workers').findOne({ userId: workerId });
  }

  async updateWorker(db: Db, es: ElasticsearchClient, workerId: string, updates: any) {
    const result = await db.collection('workers').findOneAndUpdate(
      { userId: workerId },
      { 
        $set: { 
          ...updates,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );

    // Update Elasticsearch
    if (result && result.value) {
      await this.indexWorkerInElasticsearch(es, result.value);
    }

    return result?.value || null;
  }

  async addSkill(db: Db, workerId: string, skill: any) {
    const skillWithId = {
      ...skill,
      skillId: new ObjectId(),
      addedAt: new Date()
    };

    await db.collection('workers').updateOne(
      { userId: workerId },
      { $push: { 'workerProfile.skills': skillWithId } }
    );

    return skillWithId;
  }

  async removeSkill(db: Db, workerId: string, skillId: string) {
    await db.collection('workers').updateOne(
      { userId: workerId },
      { $pull: { 'workerProfile.skills': { skillId: new ObjectId(skillId) } } as any }
    );
  }

  async addPortfolioItem(db: Db, workerId: string, portfolioItem: any) {
    const itemWithId = {
      ...portfolioItem,
      projectId: new ObjectId(),
      addedAt: new Date()
    };

    await db.collection('workers').updateOne(
      { userId: workerId },
      { $push: { 'workerProfile.portfolio': itemWithId } }
    );

    return itemWithId;
  }

  async removePortfolioItem(db: Db, workerId: string, itemId: string) {
    await db.collection('workers').updateOne(
      { userId: workerId },
      { $pull: { 'workerProfile.portfolio': { projectId: new ObjectId(itemId) } } as any }
    );
  }

  async getAvailability(db: Db, workerId: string, startDate?: string, endDate?: string) {
    const query: any = { workerId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    return await db.collection('availability_slots')
      .find(query)
      .sort({ date: 1 })
      .toArray();
  }

  async addAvailability(db: Db, workerId: string, slot: any) {
    const slotWithId = {
      ...slot,
      _id: new ObjectId(),
      workerId,
      status: 'available',
      createdAt: new Date()
    };

    await db.collection('availability_slots').insertOne(slotWithId);
    return slotWithId;
  }

  async removeAvailability(db: Db, workerId: string, slotId: string) {
    await db.collection('availability_slots').deleteOne({
      _id: new ObjectId(slotId),
      workerId
    });
  }

  async syncExternalProfile(db: Db, workerId: string, platform: string, username: string) {
    let profileData: any = {};

    try {
      switch (platform.toLowerCase()) {
        case 'github':
          profileData = await this.fetchGitHubProfile(username);
          break;
        case 'leetcode':
          profileData = await this.fetchLeetCodeProfile(username);
          break;
        case 'hackerrank':
          profileData = await this.fetchHackerRankProfile(username);
          break;
        default:
          throw new Error('Unsupported platform');
      }

      // Update worker profile with external data
      await db.collection('workers').updateOne(
        { userId: workerId },
        {
          $set: {
            [`workerProfile.externalProfiles.${platform.toLowerCase()}`]: {
              ...profileData,
              username,
              lastSynced: new Date(),
              verified: true
            }
          }
        }
      );

      return profileData;
    } catch (error) {
      logger.error(`Failed to sync ${platform} profile`, error);
      throw error;
    }
  }

  private async fetchGitHubProfile(username: string) {
    const response = await axios.get(`https://api.github.com/users/${username}`);
    const repos = await axios.get(response.data.repos_url);

    return {
      profileUrl: response.data.html_url,
      repositories: response.data.public_repos,
      followers: response.data.followers,
      following: response.data.following,
      bio: response.data.bio,
      location: response.data.location,
      topLanguages: this.extractTopLanguages(repos.data)
    };
  }

  private async fetchLeetCodeProfile(username: string) {
    // LeetCode doesn't have official API, use GraphQL endpoint
    const query = `
      query getUserProfile($username: String!) {
        matchedUser(username: $username) {
          username
          submitStats {
            acSubmissionNum {
              difficulty
              count
            }
          }
          profile {
            ranking
            reputation
          }
        }
      }
    `;

    const response = await axios.post('https://leetcode.com/graphql', {
      query,
      variables: { username }
    });

    const data = response.data.data.matchedUser;

    return {
      ranking: data.profile.ranking,
      problemsSolved: data.submitStats.acSubmissionNum.reduce((sum: number, item: any) => sum + item.count, 0),
      reputation: data.profile.reputation
    };
  }

  private async fetchHackerRankProfile(username: string) {
    // HackerRank scraping or API if available
    // This is a placeholder - actual implementation would require web scraping
    return {
      username,
      stars: 0,
      badges: [],
      certifications: []
    };
  }

  private extractTopLanguages(repos: any[]): string[] {
    const languageCounts: any = {};

    repos.forEach(repo => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });

    return Object.entries(languageCounts)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 5)
      .map((entry: any) => entry[0]);
  }

  async getAnalytics(db: Db, workerId: string, period: string = '30d') {
    // Calculate analytics based on bookings and sessions
    const daysAgo = Number.parseInt(period.replace('d', ''));
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    // This would typically aggregate data from bookings collection
    // Placeholder implementation
    return {
      period,
      totalBookings: 0,
      totalEarnings: 0,
      averageRating: 0,
      hoursWorked: 0,
      responseRate: 0
    };
  }

  async getEarnings(db: Db, workerId: string, startDate?: string, endDate?: string) {
    // Query bookings and calculate earnings
    // Placeholder implementation
    return {
      totalEarnings: 0,
      currency: 'USD',
      breakdown: {
        completed: 0,
        pending: 0,
        withdrawn: 0
      },
      period: { startDate, endDate }
    };
  }

  private async indexWorkerInElasticsearch(es: ElasticsearchClient, worker: any) {
    try {
      await es.index({
        index: 'workers',
        id: worker.userId,
        body: {
          userId: worker.userId,
          title: worker.workerProfile?.title,
          tagline: worker.workerProfile?.tagline,
          hourlyRate: worker.workerProfile?.hourlyRate,
          currency: worker.workerProfile?.currency,
          averageRating: worker.workerProfile?.statistics?.averageRating || 0,
          totalReviews: worker.workerProfile?.statistics?.totalReviews || 0,
          skills: worker.workerProfile?.skills || [],
          verifiedProfiles: Object.keys(worker.workerProfile?.externalProfiles || {})
        }
      });
    } catch (error) {
      logger.error('Failed to index worker in Elasticsearch', error);
    }
  }
}
