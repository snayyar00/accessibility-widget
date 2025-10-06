import { Router } from 'express'

const router = Router()

// Shopify compliance webhook is handled directly in server.ts
// to ensure raw body access before JSON parsing middleware

export default router
