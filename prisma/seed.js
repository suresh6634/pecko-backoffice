const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('Admin@123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@pecko.com' },
    update: {},
    create: {
      username: 'Admin',
      email: 'admin@pecko.com',
      passwordHash,
      role: 'ADMIN',
    },
  })

  const ks = await prisma.customer.upsert({
    where: { name: 'K&S' },
    update: {},
    create: {
      name: 'K&S',
      description: `This customer sends Excel files. The columns are:
Column A = Find No., Column B = Item ID, Column C = Item Name/Description,
Column D = Revision, Column E = Quantity, Column F = Unit of Measure,
Column G = Manufacturer, Column H = Manufacturer Part Number.
Row 1 is the header. Row 2 is the parent assembly part. Row 3 onwards are child/component parts.
Extract all rows including the parent. Apply UOM conversions as provided.`,
    },
  })

  await prisma.unitOfMeasureMapping.upsert({
    where: { customerId_customerUOM: { customerId: ks.id, customerUOM: 'EA' } },
    update: {},
    create: {
      customerId: ks.id,
      customerUOM: 'EA',
      peckoUOM: 'pcs',
      conversionFactor: 1,
    },
  })

  await prisma.unitOfMeasureMapping.upsert({
    where: { customerId_customerUOM: { customerId: ks.id, customerUOM: 'IN' } },
    update: {},
    create: {
      customerId: ks.id,
      customerUOM: 'IN',
      peckoUOM: 'm',
      conversionFactor: 0.0254,
    },
  })

  console.log('Seed complete.')
  console.log(`  Admin: ${admin.email}`)
  console.log(`  Customer: ${ks.name} (${ks.id})`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
