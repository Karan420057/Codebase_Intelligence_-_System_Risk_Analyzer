import { Router } from 'express';
import { getSettings, updateSettings, getAdminOverview, } from '../controllers/settingsController.js';
import { requireAuth, requireAdmin, } from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getSettings);
router.patch('/', updateSettings);
router.get('/admin/overview', requireAdmin, getAdminOverview);

export default router;
