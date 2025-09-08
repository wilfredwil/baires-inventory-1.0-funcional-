import Papa from 'papaparse';

export function downloadCSV(data) {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'inventario.csv';
  a.click();
  URL.revokeObjectURL(url);
}