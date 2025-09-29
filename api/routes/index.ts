import { Router } from 'express'

import aiSummaryRoutes from './ai-summary.routes'
import chatRoutes from './chat.routes'
import formRoutes from './form.routes'
import monitoringRoutes from './monitoring.routes'
import proofOfEffortRoutes from './proof-of-effort.routes'
import reportsRoutes from './reports.routes'
import sitesRoutes from './sites.routes'
import stripeRoutes from './stripe.routes'
import translationRoutes from './translation.routes'
import widgetRoutes from './widget.routes'

const router = Router()

router.use(stripeRoutes)
router.use(widgetRoutes)
router.use(translationRoutes)
router.use(reportsRoutes)
router.use(formRoutes)
router.use(proofOfEffortRoutes)
router.use(chatRoutes)
router.use(monitoringRoutes)
router.use(sitesRoutes)
router.use(aiSummaryRoutes)

export default router
