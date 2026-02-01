import { Request, Response } from 'express';
import { WorkerService } from '../services/worker.service';
import { logger } from '../utils/logger';

export class WorkerController {
  private workerService: WorkerService;

  constructor() {
    this.workerService = new WorkerService();
  }

  searchWorkers = async (req: any, res: Response) => {
    try {
      const filters = {
        skills: req.query.skills?.split(','),
        minRate: req.query.minRate ? parseFloat(req.query.minRate) : undefined,
        maxRate: req.query.maxRate ? parseFloat(req.query.maxRate) : undefined,
        minRating: req.query.minRating ? parseFloat(req.query.minRating) : undefined,
        availability: req.query.availability,
        location: req.query.location,
        page: parseInt(req.query.page || '1'),
        limit: parseInt(req.query.limit || '20')
      };

      const result = await this.workerService.searchWorkers(
        req.elasticsearch,
        req.mongodb,
        filters
      );

      res.json(result);
    } catch (error) {
      logger.error('Search workers error', error);
      res.status(500).json({ error: 'Failed to search workers' });
    }
  };

  getWorkerById = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const worker = await this.workerService.getWorkerById(req.mongodb, id);

      if (!worker) {
        return res.status(404).json({ error: 'Worker not found' });
      }

      res.json(worker);
    } catch (error) {
      logger.error('Get worker error', error);
      res.status(500).json({ error: 'Failed to get worker' });
    }
  };

  updateWorker = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const worker = await this.workerService.updateWorker(
        req.mongodb,
        req.elasticsearch,
        id,
        updates
      );

      res.json(worker);
    } catch (error) {
      logger.error('Update worker error', error);
      res.status(500).json({ error: 'Failed to update worker' });
    }
  };

  addSkill = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const skill = req.body;

      const result = await this.workerService.addSkill(req.mongodb, id, skill);
      res.json(result);
    } catch (error) {
      logger.error('Add skill error', error);
      res.status(500).json({ error: 'Failed to add skill' });
    }
  };

  removeSkill = async (req: any, res: Response) => {
    try {
      const { id, skillId } = req.params;

      await this.workerService.removeSkill(req.mongodb, id, skillId);
      res.json({ message: 'Skill removed successfully' });
    } catch (error) {
      logger.error('Remove skill error', error);
      res.status(500).json({ error: 'Failed to remove skill' });
    }
  };

  addPortfolioItem = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const portfolioItem = req.body;

      const result = await this.workerService.addPortfolioItem(req.mongodb, id, portfolioItem);
      res.json(result);
    } catch (error) {
      logger.error('Add portfolio item error', error);
      res.status(500).json({ error: 'Failed to add portfolio item' });
    }
  };

  removePortfolioItem = async (req: any, res: Response) => {
    try {
      const { id, itemId } = req.params;

      await this.workerService.removePortfolioItem(req.mongodb, id, itemId);
      res.json({ message: 'Portfolio item removed successfully' });
    } catch (error) {
      logger.error('Remove portfolio item error', error);
      res.status(500).json({ error: 'Failed to remove portfolio item' });
    }
  };

  getAvailability = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const availability = await this.workerService.getAvailability(
        req.mongodb,
        id,
        startDate,
        endDate
      );

      res.json(availability);
    } catch (error) {
      logger.error('Get availability error', error);
      res.status(500).json({ error: 'Failed to get availability' });
    }
  };

  addAvailability = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const slot = req.body;

      const result = await this.workerService.addAvailability(req.mongodb, id, slot);
      res.json(result);
    } catch (error) {
      logger.error('Add availability error', error);
      res.status(500).json({ error: 'Failed to add availability' });
    }
  };

  removeAvailability = async (req: any, res: Response) => {
    try {
      const { id, slotId } = req.params;

      await this.workerService.removeAvailability(req.mongodb, id, slotId);
      res.json({ message: 'Availability removed successfully' });
    } catch (error) {
      logger.error('Remove availability error', error);
      res.status(500).json({ error: 'Failed to remove availability' });
    }
  };

  syncExternalProfile = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { platform, username } = req.body;

      const result = await this.workerService.syncExternalProfile(
        req.mongodb,
        id,
        platform,
        username
      );

      res.json(result);
    } catch (error) {
      logger.error('Sync external profile error', error);
      res.status(500).json({ error: 'Failed to sync external profile' });
    }
  };

  getAnalytics = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { period } = req.query;

      const analytics = await this.workerService.getAnalytics(req.mongodb, id, period);
      res.json(analytics);
    } catch (error) {
      logger.error('Get analytics error', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  };

  getEarnings = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const earnings = await this.workerService.getEarnings(
        req.mongodb,
        id,
        startDate,
        endDate
      );

      res.json(earnings);
    } catch (error) {
      logger.error('Get earnings error', error);
      res.status(500).json({ error: 'Failed to get earnings' });
    }
  };
}
