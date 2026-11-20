function cellValue(row, key) {
  const value = typeof key === 'function' ? key(row) : row[key]
  if (value === null || value === undefined || value === '') return ''
  if (value instanceof Date) return value.toLocaleDateString('en-PH')
  if (Array.isArray(value)) return value.join('; ')
  if (typeof value === 'object') return value.fullName || value.itemName || value.requestNumber || JSON.stringify(value)
  return String(value)
}

export function exportCsv(rows, columns, filename, title = '') {
  const header = columns.map((column) => `"${column.label}"`).join(',')
  const body = rows.map((row) => columns.map((column) => `"${cellValue(row, column.key).replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const content = `${title ? `"${title.replace(/"/g, '""')}"\r\n` : ''}${header}\r\n${body}`
  const blob = new Blob([`\ufeff${content}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export async function exportPdf({ title, subtitle = '', columns, rows, filename, summary = {} }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  doc.setFontSize(15)
  doc.setTextColor(13, 53, 37)
  doc.text(title, 40, 36)
  if (subtitle) {
    doc.setFontSize(9)
    doc.setTextColor(100, 115, 105)
    doc.text(subtitle, 40, 52)
  }
  const summaryText = Object.entries(summary).map(([key, value]) => `${key}: ${value}`).join('   ')
  if (summaryText) {
    doc.setFontSize(9)
    doc.setTextColor(13, 53, 37)
    doc.text(summaryText, 40, 68)
  }
  autoTable(doc, {
    head: [columns.map((column) => column.label)],
    body: rows.map((row) => columns.map((column) => cellValue(row, column.key))),
    startY: summaryText ? 80 : 64,
    styles: { fontSize: 8, cellPadding: 5, textColor: [27, 43, 35] },
    headStyles: { fillColor: [18, 71, 47], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [244, 248, 245] },
    margin: { left: 40, right: 40 },
  })
  doc.save(`${filename}.pdf`)
}

export function printReport() {
  window.print()
}
