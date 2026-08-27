/** Escapes a single CSV field per RFC 4180 — wraps in quotes and doubles any
 * embedded quotes whenever the value contains a comma, quote, or newline. */
function escapeCsvField(value: unknown): string {
  const str = value == null ? '' : String(value)
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`
  return str
}

/** Builds a CSV string from an array of flat row objects, using the given
 * column order and header labels, then triggers a browser download. Opening
 * in Excel works directly — a UTF-8 BOM is prepended so Arabic text renders
 * correctly instead of as mojibake. */
export function downloadCsv<T extends Record<string, unknown>>(
  filename: string,
  rows: T[],
  columns: { key: keyof T; label: string }[],
) {
  const header = columns.map((c) => escapeCsvField(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => escapeCsvField(row[c.key])).join(',')).join('\r\n')
  const csv = `${header}\r\n${body}`

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
