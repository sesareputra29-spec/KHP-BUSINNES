import * as XLSX from 'xlsx';

/**
 * Export data array to an Excel file (.xlsx)
 */
export const exportToExcel = (
  filename: string,
  sheetName: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) => {
  const data = [headers, ...rows];
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths based on maximum content length
  const colWidths = headers.map((header, colIndex) => {
    let maxLength = header.length;
    for (const row of rows) {
      const cellValue = row[colIndex];
      if (cellValue !== undefined && cellValue !== null) {
        const strLen = String(cellValue).length;
        if (strLen > maxLength) {
          maxLength = strLen;
        }
      }
    }
    return { wch: Math.min(Math.max(maxLength + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));

  const cleanFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, cleanFilename, { bookType: 'xlsx' });
};

/**
 * Download a blank/sample template file in .xlsx format for import
 */
export const downloadExcelTemplate = (
  filename: string,
  sheetName: string,
  headers: string[],
  sampleRows: (string | number | null | undefined)[][]
) => {
  exportToExcel(filename, sheetName, headers, sampleRows);
};

/**
 * Read uploaded .xlsx or .xls file and return array of rows
 */
export const readExcelFile = (file: File): Promise<any[][]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!buffer) {
          throw new Error('Gagal membaca file');
        }
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file spreadsheet'));
    };

    reader.readAsArrayBuffer(file);
  });
};
