import fs from 'fs'
import { parse } from 'csv-parse'

export function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const output = []
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true, skip_empty_lines: true }))
      .on('data', (row) => output.push(row))
      .on('error', (err) => reject(err))
      .on('end', () => resolve(output))
  })
}