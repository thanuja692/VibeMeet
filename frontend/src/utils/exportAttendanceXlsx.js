const xmlEscape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;")

const columnName = (number) => {
  let result = ""
  while (number > 0) {
    const remainder = (number - 1) % 26
    result = String.fromCharCode(65 + remainder) + result
    number = Math.floor((number - 1) / 26)
  }
  return result
}

const makeSheet = (rows) => {
  const xmlRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      const ref = `${columnName(columnIndex + 1)}${rowIndex + 1}`
      if (typeof value === "number") return `<c r="${ref}"><v>${value}</v></c>`
      return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`
    }).join("")
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join("")
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${xmlRows}</sheetData></worksheet>`
}

const formatDate = (value) => value ? new Date(value).toLocaleString() : "Still in meeting"
const formatDuration = (seconds = 0) => {
  const minutes = Math.floor(seconds / 60)
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export default async function exportAttendanceXlsx(report) {
  const { default: JSZip } = await import("jszip")
  const rows = [
    ["Participant", "Email", "First joined", "Last left", "Longest session", "Joins", "Duration (minutes)"],
    ...report.sessions.map((session) => [
      session.studentName,
      session.email || "",
      formatDate(session.joinedAt),
      formatDate(session.leftAt),
      formatDuration(session.durationSeconds),
      session.joinCount || 1,
      Math.round((session.durationSeconds || 0) / 60),
    ]),
  ]

  const zip = new JSZip()
  zip.file("[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>')
  zip.folder("_rels").file(".rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>')
  zip.folder("xl").file("workbook.xml", '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Attendance" sheetId="1" r:id="rId1"/></sheets></workbook>')
  zip.folder("xl").folder("_rels").file("workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>')
  zip.folder("xl").folder("worksheets").file("sheet1.xml", makeSheet(rows))

  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const safeTitle = (report.meeting.title || "class-attendance").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-|-$/g, "")
  link.href = url
  link.download = `${safeTitle || "class-attendance"}-attendance.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
