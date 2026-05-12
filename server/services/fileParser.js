import { readFileSync } from 'fs'
import xlsx from 'xlsx'
import pdfParse from 'pdf-parse'
import Tesseract from 'tesseract.js'

/**
 * Parse an uploaded file into { rows, rawText }
 * rows — for xlsx files (array of arrays from sheet_to_json with header:1)
 * rawText — tab-separated row text (for all types; primary for pdf/image)
 */
export async function parseFile(filePath, mimetype) {
  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-excel'
  ) {
    return parseExcel(filePath)
  }
  if (mimetype === 'application/pdf') {
    return parsePdf(filePath)
  }
  if (mimetype === 'image/png' || mimetype === 'image/jpeg') {
    return parseImage(filePath)
  }
  throw new Error(`Unsupported MIME type: ${mimetype}`)
}

function parseExcel(filePath) {
  const workbook = xlsx.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' })
  const rawText = rows.map(row => row.join('\t')).join('\n')
  return { rows, rawText }
}

async function parsePdf(filePath) {
  const buffer = readFileSync(filePath)
  const data = await pdfParse(buffer)
  return { rows: [], rawText: data.text }
}

async function parseImage(filePath) {
  const result = await Tesseract.recognize(filePath, 'eng')
  return { rows: [], rawText: result.data.text }
}
