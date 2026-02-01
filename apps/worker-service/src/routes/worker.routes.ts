import { Router } from 'express';
import { WorkerController } from '../controllers/worker.controller';

const router: any = Router();
const controller = new WorkerController();

// Worker profile routes
router.get('/', controller.searchWorkers);
router.get('/:id', controller.getWorkerById);
router.put('/:id', controller.updateWorker);

// Skills management
router.post('/:id/skills', controller.addSkill);
router.delete('/:id/skills/:skillId', controller.removeSkill);

// Portfolio management
router.post('/:id/portfolio', controller.addPortfolioItem);
router.delete('/:id/portfolio/:itemId', controller.removePortfolioItem);

// Availability management
router.get('/:id/availability', controller.getAvailability);
router.post('/:id/availability', controller.addAvailability);
router.delete('/:id/availability/:slotId', controller.removeAvailability);

// External profile syncing
router.post('/:id/sync-external', controller.syncExternalProfile);

// Analytics
router.get('/:id/analytics', controller.getAnalytics);
router.get('/:id/earnings', controller.getEarnings);

export default router;
