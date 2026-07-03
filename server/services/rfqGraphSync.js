import cron from 'node-cron'
import { saveRfqSnapshot } from './rfqStore.js'
import { logger } from '../lib/logger.js'

// App-only (client credentials) pull of the RFQ master file from Microsoft Graph, on a nightly schedule.
// The file lives in another user's OneDrive shared to the admin — Graph app auth reads it by its stable
// drive/item IDs regardless of sharing. IDs default to the known file but are env-overridable.
const TENANT = process.env.RFQ_GRAPH_TENANT_ID
const CLIENT_ID = process.env.RFQ_GRAPH_CLIENT_ID
const CLIENT_SECRET = process.env.RFQ_GRAPH_CLIENT_SECRET
const DRIVE_ID = process.env.RFQ_GRAPH_DRIVE_ID || 'b!7rOghi9O2UCTAbG44fGuw5Xjd8QyDi1NuZ32pN3CQBxxLhbCkvS3RLmVu0qVsnTm'
const ITEM_ID = process.env.RFQ_GRAPH_ITEM_ID || '01WP2QGENVFDTPYPX2JFEZYO3AM6QXWNS7'

export function isGraphConfigured() {
  return Boolean(TENANT && CLIENT_ID && CLIENT_SECRET)
}

async function getToken() {
  const res = await fetch(`https://login.microsoftonline.com/${TENANT}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }),
  })
  if (!res.ok) throw new Error(`Graph token request failed: ${res.status} ${await res.text()}`)
  const json = await res.json()
  return json.access_token
}

async function downloadFile(token) {
  // fetch follows the 302 to the download URL automatically.
  const res = await fetch(`https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${ITEM_ID}/content`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Graph file download failed: ${res.status} ${await res.text()}`)
  return Buffer.from(await res.arrayBuffer())
}

// Fetch the file from Graph and replace the stored snapshot. Throws on any failure so callers can report it.
export async function syncRfqFromGraph(source = 'scheduled') {
  if (!isGraphConfigured()) {
    throw new Error('Graph sync not configured (set RFQ_GRAPH_TENANT_ID / _CLIENT_ID / _CLIENT_SECRET)')
  }
  const token = await getToken()
  const buffer = await downloadFile(token)
  const { stats, syncedAt } = await saveRfqSnapshot(buffer, source)
  logger.info(`RFQ Graph sync (${source}): ${stats.total} rows, ${stats.pendingReview} pending review`)
  return { stats, syncedAt }
}

export function startRfqScheduler() {
  if (!isGraphConfigured()) {
    logger.info('RFQ nightly scheduler disabled — Graph credentials not set')
    return
  }
  // 22:00 daily. Singapore has no DST, so Asia/Singapore is stable year-round.
  cron.schedule('0 22 * * *', () => {
    syncRfqFromGraph('scheduled').catch(err => logger.error('Scheduled RFQ sync failed:', err))
  }, { timezone: 'Asia/Singapore' })
  logger.info('RFQ nightly scheduler enabled — daily 22:00 Asia/Singapore')
}
