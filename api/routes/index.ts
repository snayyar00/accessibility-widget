import { Router } from 'express';
import stripeRoutes from './stripe.routes';
import widgetRoutes from './widget.routes';
import translationRoutes from './translation.routes';
import reportsRoutes from './reports.routes';
import formRoutes from './form.routes';

const router = Router();

// Mount all route modules
router.use(stripeRoutes);
router.use(widgetRoutes);
router.use(translationRoutes);
router.use(reportsRoutes);
router.use(formRoutes);

export default router;
