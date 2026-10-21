import { Router } from 'express';
import { getNotifications, getUnreadCount, markAllRead, markOneRead, } from '../controllers/notificationController.js';
import { requireAuth, requireAdmin } from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/unread-count', getUnreadCount);
router.get('/', getNotifications);
router.post('/read-all', markAllRead);
router.post('/:id/read', markOneRead);

export default router;
