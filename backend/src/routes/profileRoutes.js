import { Router } from 'express';
import { getProfile, updateProfile, } from '../controllers/profileController.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

router.use(requireAuth);
router.get('/', getProfile);
router.patch('/', updateProfile);

export default router;
