import prisma from '../lib/prisma.js'
import { parseCompanies } from '../lib/companies.js'

// Gate a route to a company. Admins are cross-company and always allowed. Reads the
// user's current companies from the DB so changes apply immediately and pre-existing
// tokens still work.
export function requireCompany(company) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'ADMIN') return next()
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { companies: true },
      })
      if (parseCompanies(user?.companies).includes(company)) return next()
      return res.status(403).json({ error: 'Not authorized for this company feature' })
    } catch (err) { next(err) }
  }
}
