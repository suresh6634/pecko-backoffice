import prisma from '../lib/prisma.js'
import { parseRfqWorkbook } from './rfqParser.js'

// Parse an RFQ workbook buffer and replace the stored snapshot wholesale.
// Shared by the manual upload / Power Automate webhook and the scheduled Graph sync.
export async function saveRfqSnapshot(buffer, source) {
  const { rows, stats } = await parseRfqWorkbook(buffer)
  const syncedAt = new Date()

  await prisma.$transaction([
    prisma.rfqProject.deleteMany({}),
    prisma.rfqProject.createMany({
      data: rows.map(r => ({
        rowNumber: r.rowNumber,
        projectId: r.projectId,
        customer: r.customer,
        linkSource: r.linkSource,
        pic: r.pic,
        projectType: r.projectType,
        notes: r.notes,
        rfqDueDateRaw: r.rfqDueDateRaw,
        rfqDueDate: r.rfqDueDate,
        rfqReceivedDateRaw: r.rfqReceivedDateRaw,
        sofeaDateRaw: r.sofeaDateRaw,
        submissionDateRaw: r.submissionDateRaw,
        status: r.status,
        syncedAt,
      })),
    }),
    prisma.rfqSync.create({
      data: {
        syncedAt,
        source,
        total: stats.total,
        completed: stats.completed,
        pendingReview: stats.pendingReview,
        other: stats.other,
        none: stats.none,
      },
    }),
  ])

  return { stats, syncedAt }
}
