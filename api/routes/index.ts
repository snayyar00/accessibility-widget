import { Router } from 'express'

import formRoutes from './form.routes'
import reportsRoutes from './reports.routes'
import stripeRoutes from './stripe.routes'
import translationRoutes from './translation.routes'
import widgetRoutes from './widget.routes'

const router = Router()

router.use(stripeRoutes)
router.use(widgetRoutes)
router.use(translationRoutes)
router.use(reportsRoutes)
router.use(formRoutes)

export default router
