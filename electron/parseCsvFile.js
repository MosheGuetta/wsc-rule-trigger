import fs from 'fs'
import { parse } from 'csv-parse/sync'

export async function parseCsvFile(filePath) {
  const data = fs.readFileSync(filePath, 'utf-8')
  return parse(data, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })
}
