import { Response } from 'express';
import { ClientService } from '../services/client.service';
import { logger } from '../utils/logger';

export class ClientController {
  private clientService: ClientService;

  constructor() {
    this.clientService = new ClientService();
  }

  getClientById = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const client = await this.clientService.getClientById(req.pgPool, req.mongodb, id);

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      res.json(client);
    } catch (error) {
      logger.error('Get client error', error);
      res.status(500).json({ error: 'Failed to get client' });
    }
  };

  updateClient = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const client = await this.clientService.updateClient(req.mongodb, id, updates);
      res.json(client);
    } catch (error) {
      logger.error('Update client error', error);
      res.status(500).json({ error: 'Failed to update client' });
    }
  };

  getProjects = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status, page = 1, limit = 20 } = req.query;

      const projects = await this.clientService.getProjects(
        req.mongodb,
        id,
        { status, page: parseInt(page), limit: parseInt(limit) }
      );

      res.json(projects);
    } catch (error) {
      logger.error('Get projects error', error);
      res.status(500).json({ error: 'Failed to get projects' });
    }
  };

  createProject = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const projectData = req.body;

      const project = await this.clientService.createProject(req.mongodb, id, projectData);
      res.status(201).json(project);
    } catch (error) {
      logger.error('Create project error', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  };

  getBookings = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { status, startDate, endDate } = req.query;

      const bookings = await this.clientService.getBookings(
        req.pgPool,
        id,
        { status, startDate, endDate }
      );

      res.json(bookings);
    } catch (error) {
      logger.error('Get bookings error', error);
      res.status(500).json({ error: 'Failed to get bookings' });
    }
  };

  getPaymentMethods = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const methods = await this.clientService.getPaymentMethods(req.pgPool, id);
      res.json(methods);
    } catch (error) {
      logger.error('Get payment methods error', error);
      res.status(500).json({ error: 'Failed to get payment methods' });
    }
  };

  addPaymentMethod = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { paymentMethodId } = req.body;

      const method = await this.clientService.addPaymentMethod(req.pgPool, id, paymentMethodId);
      res.status(201).json(method);
    } catch (error) {
      logger.error('Add payment method error', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
  };

  removePaymentMethod = async (req: any, res: Response) => {
    try {
      const { id, methodId } = req.params;
      await this.clientService.removePaymentMethod(req.pgPool, id, methodId);
      res.json({ message: 'Payment method removed successfully' });
    } catch (error) {
      logger.error('Remove payment method error', error);
      res.status(500).json({ error: 'Failed to remove payment method' });
    }
  };

  getSpending = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const { startDate, endDate, period = '30d' } = req.query;

      const spending = await this.clientService.getSpending(
        req.pgPool,
        id,
        { startDate, endDate, period }
      );

      res.json(spending);
    } catch (error) {
      logger.error('Get spending error', error);
      res.status(500).json({ error: 'Failed to get spending' });
    }
  };

  getFavoriteWorkers = async (req: any, res: Response) => {
    try {
      const { id } = req.params;
      const favorites = await this.clientService.getFavoriteWorkers(req.mongodb, id);
      res.json(favorites);
    } catch (error) {
      logger.error('Get favorite workers error', error);
      res.status(500).json({ error: 'Failed to get favorite workers' });
    }
  };

  addFavoriteWorker = async (req: any, res: Response) => {
    try {
      const { id, workerId } = req.params;
      await this.clientService.addFavoriteWorker(req.mongodb, id, workerId);
      res.json({ message: 'Worker added to favorites' });
    } catch (error) {
      logger.error('Add favorite worker error', error);
      res.status(500).json({ error: 'Failed to add favorite worker' });
    }
  };

  removeFavoriteWorker = async (req: any, res: Response) => {
    try {
      const { id, workerId } = req.params;
      await this.clientService.removeFavoriteWorker(req.mongodb, id, workerId);
      res.json({ message: 'Worker removed from favorites' });
    } catch (error) {
      logger.error('Remove favorite worker error', error);
      res.status(500).json({ error: 'Failed to remove favorite worker' });
    }
  };
}
