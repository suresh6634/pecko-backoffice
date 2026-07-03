import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { searchParts } from '../services/partSourcing.js'
import { chatAboutPart } from '../services/partChat.js'

const router = Router()
router.use(requireAuth)

const querySchema = z.object({
  q: z.string().trim().min(2, 'Enter at least 2 characters'),
  exact: z.enum(['true', 'false']).optional(),
  inStock: z.enum(['true', 'false']).optional(),
  currency: z.string().length(3).optional(),
})

// GET /api/part-sourcing/search?q=193643-1&exact=false&inStock=false&currency=USD
router.get('/search', async (req, res, next) => {
  try {
    const { q, exact, inStock, currency } = querySchema.parse(req.query)
    const result = await searchParts(q, {
      exactMatch: exact === 'true',
      inStockOnly: inStock === 'true',
      currency,
    })
    res.json(result)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

const chatSchema = z.object({
  part: z.object({
    partNumber: z.string().min(1),
    manufacturer: z.string().nullish(),
    description: z.string().nullish(),
    specifications: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  }),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(4000),
  })).min(1).max(30),
})

// POST /api/part-sourcing/chat — grounded DeepSeek chat about a specific part
router.post('/chat', async (req, res, next) => {
  try {
    const { part, messages } = chatSchema.parse(req.body)
    const result = await chatAboutPart({ part, messages })
    res.json(result)
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message })
    next(err)
  }
})

export default router
