import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma.js'
import { requireAuth } from '../middleware/auth.js'
import { requireAdmin } from '../middleware/adminOnly.js'
import { COMPANIES, parseCompanies, serializeCompanies } from '../lib/companies.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const companies = z.array(z.enum(COMPANIES)).optional().default([])

const createUserSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'USER']),
  companies,
})

const updateUserSchema = z.object({
  username: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'USER']),
  companies,
})

const select = { id: true, username: true, email: true, role: true, companies: true, createdAt: true }
// Parse the stored JSON string into an array for the client.
const present = u => ({ ...u, companies: parseCompanies(u.companies) })

router.get('/', async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ select, orderBy: { createdAt: 'desc' } })
    res.json(users.map(present))
  } catch (err) { next(err) }
})

router.post('/', async (req, res, next) => {
  try {
    const { username, email, password, role, companies } = createUserSchema.parse(req.body)
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.create({ data: { username, email, passwordHash, role, companies: serializeCompanies(companies) }, select })
    res.status(201).json(present(user))
  } catch (err) { next(err) }
})

router.put('/:id', async (req, res, next) => {
  try {
    const { username, email, password, role, companies } = updateUserSchema.parse(req.body)
    const data = { username, email, role, companies: serializeCompanies(companies) }
    if (password) data.passwordHash = await bcrypt.hash(password, 12)
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select })
    res.json(present(user))
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' })
    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'User not found' })
    next(err)
  }
})

export default router
