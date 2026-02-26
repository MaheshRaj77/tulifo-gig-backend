import { Router } from 'express';
import { ClientController } from '../controllers/client.controller.js';

const router: any = Router();
const controller = new ClientController();

router.get('/:id', controller.getClientById);
router.put('/:id', controller.updateClient);
router.post('/:id/profile', controller.saveProfile);
router.get('/:id/projects', controller.getProjects);
router.post('/:id/projects', controller.createProject);
router.get('/:id/bookings', controller.getBookings);
router.get('/:id/payment-methods', controller.getPaymentMethods);
router.post('/:id/payment-methods', controller.addPaymentMethod);
router.delete('/:id/payment-methods/:methodId', controller.removePaymentMethod);
router.get('/:id/spending', controller.getSpending);
router.get('/:id/favorite-workers', controller.getFavoriteWorkers);
router.post('/:id/favorite-workers/:workerId', controller.addFavoriteWorker);
router.delete('/:id/favorite-workers/:workerId', controller.removeFavoriteWorker);

export default router;
