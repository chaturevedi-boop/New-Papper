// Minimal CSV helpers shared by every export (billing report, reports tab, annual summary)
// and by the customer bulk-import flow. Written by hand rather than pulling in a parser
// dependency: the format we read and write is small and fully under our control.

export function csvEscape(value: string | number): string {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvEscape).join(',')];
  rows.forEach(row => lines.push(row.map(csvEscape).join(',')));
  return lines.join('\n');
}

// Splits CSV text into rows of fields, honouring quoted fields that themselves contain
// commas, newlines, or escaped ("") quotes.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  // Normalise line endings so CRLF files from Excel parse the same as LF ones
  const input = text.replace(/\r\n?/g, '\n');

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') inQuotes = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  // Flush whatever is still buffered when the file doesn't end in a newline
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter(r => r.some(cell => cell.trim() !== ''));
}
