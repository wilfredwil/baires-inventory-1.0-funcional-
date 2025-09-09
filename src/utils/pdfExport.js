// utils/pdfExport.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportInventoryToPDF = (inventory, filters = {}) => {
  const doc = new jsPDF();
  
  // Configuración del documento
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text('Baires Inventory', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(16);
  doc.text('Reporte de Inventario', pageWidth / 2, 30, { align: 'center' });
  
  // Fecha y hora del reporte
  doc.setFontSize(10);
  doc.setTextColor(100);
  const currentDate = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generado el: ${currentDate}`, pageWidth / 2, 40, { align: 'center' });
  
  // Filtros aplicados
  if (Object.keys(filters).length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(60);
    let filterText = 'Filtros aplicados: ';
    if (filters.tipo) filterText += `Tipo: ${filters.tipo}, `;
    if (filters.lowStock) filterText += 'Solo stock bajo, ';
    if (filters.search) filterText += `Búsqueda: "${filters.search}", `;
    
    doc.text(filterText.slice(0, -2), 14, 50);
  }
  
  // Resumen estadístico
  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(item => 
    Number(item.stock) <= Number(item.umbral_low)
  ).length;
  const totalValue = inventory.reduce((sum, item) => 
    sum + (Number(item.stock) * Number(item.precio || 0)), 0
  );
  
  const startY = filters.length > 0 ? 60 : 55;
  
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Resumen:', 14, startY);
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  doc.text(`Total de ítems: ${totalItems}`, 14, startY + 10);
  doc.text(`Ítems con stock bajo: ${lowStockItems}`, 14, startY + 20);
  doc.text(`Valor total estimado: $${totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 14, startY + 30);
  
  // Preparar datos para la tabla
  const tableData = inventory.map(item => {
    const isLowStock = Number(item.stock) <= Number(item.umbral_low);
    return [
      item.nombre || 'Sin nombre',
      item.tipo || 'N/A',
      item.marca || 'N/A',
      Number(item.stock).toFixed(2),
      Number(item.umbral_low).toFixed(2),
      item.precio ? `$${Number(item.precio).toFixed(2)}` : 'N/A',
      isLowStock ? '⚠️ BAJO' : '✓ OK'
    ];
  });
  
  // Configuración de la tabla
  const tableColumns = [
    { header: 'Nombre', dataKey: 'nombre' },
    { header: 'Tipo', dataKey: 'tipo' },
    { header: 'Marca', dataKey: 'marca' },
    { header: 'Stock', dataKey: 'stock' },
    { header: 'Umbral', dataKey: 'umbral' },
    { header: 'Precio', dataKey: 'precio' },
    { header: 'Estado', dataKey: 'estado' }
  ];
  
  // Generar tabla
  doc.autoTable({
    head: [['Nombre', 'Tipo', 'Marca', 'Stock', 'Umbral', 'Precio', 'Estado']],
    body: tableData,
    startY: startY + 45,
    styles: {
      fontSize: 8,
      cellPadding: 3,
      overflow: 'linebreak',
      halign: 'center'
    },
    headStyles: {
      fillColor: [135, 206, 235], // Color azul claro
      textColor: [40, 40, 40],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 35 }, // Nombre
      1: { halign: 'center', cellWidth: 20 }, // Tipo
      2: { halign: 'left', cellWidth: 25 }, // Marca
      3: { halign: 'center', cellWidth: 18 }, // Stock
      4: { halign: 'center', cellWidth: 18 }, // Umbral
      5: { halign: 'right', cellWidth: 20 }, // Precio
      6: { halign: 'center', cellWidth: 25 } // Estado
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },
    didParseCell: function(data) {
      // Resaltar filas con stock bajo
      if (data.row.index >= 0) {
        const stockValue = Number(tableData[data.row.index][3]);
        const umbralValue = Number(tableData[data.row.index][4]);
        
        if (stockValue <= umbralValue) {
          data.cell.styles.fillColor = [255, 235, 235]; // Fondo rojo claro
          data.cell.styles.textColor = [180, 0, 0]; // Texto rojo
        }
      }
    },
    margin: { top: 10, left: 14, right: 14 },
    pageBreak: 'auto',
    showHead: 'everyPage'
  });
  
  // Footer en cada página
  const addFooter = () => {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      
      // Línea separadora
      doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
      
      // Información del footer
      doc.text('Baires Inventory - Sistema de Gestión', 14, pageHeight - 15);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
      doc.text('Generado automáticamente', pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
  };
  
  addFooter();
  
  // Generar nombre del archivo
  const fileName = `inventario_baires_${new Date().toISOString().split('T')[0]}.pdf`;
  
  // Descargar el PDF
  doc.save(fileName);
  
  return fileName;
};

export const exportLowStockToPDF = (lowStockItems) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(180, 0, 0); // Rojo para alertas
  doc.text('🚨 ALERTA DE STOCK BAJO', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text('Baires Inventory', pageWidth / 2, 30, { align: 'center' });
  
  // Fecha y urgencia
  const currentDate = new Date().toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado el: ${currentDate}`, pageWidth / 2, 40, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(180, 0, 0);
  doc.text(`⚠️ ${lowStockItems.length} productos requieren reposición urgente`, pageWidth / 2, 50, { align: 'center' });
  
  // Tabla de productos con stock bajo
  const tableData = lowStockItems.map(item => [
    item.nombre || 'Sin nombre',
    item.tipo || 'N/A',
    Number(item.stock).toFixed(2),
    Number(item.umbral_low).toFixed(2),
    (Number(item.umbral_low) - Number(item.stock)).toFixed(2),
    item.proveedor_nombre || 'Sin proveedor'
  ]);
  
  doc.autoTable({
    head: [['Producto', 'Tipo', 'Stock Actual', 'Umbral', 'Necesario', 'Proveedor']],
    body: tableData,
    startY: 60,
    styles: {
      fontSize: 9,
      cellPadding: 4
    },
    headStyles: {
      fillColor: [255, 107, 107], // Rojo claro
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'left', cellWidth: 40 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'left', cellWidth: 35 }
    },
    alternateRowStyles: {
      fillColor: [255, 245, 245]
    }
  });
  
  // Recomendaciones
  const finalY = doc.lastAutoTable.finalY + 20;
  
  doc.setFontSize(12);
  doc.setTextColor(40);
  doc.text('Recomendaciones:', 14, finalY);
  
  doc.setFontSize(10);
  doc.setTextColor(60);
  const recommendations = [
    '• Contactar proveedores inmediatamente para reposición',
    '• Priorizar productos con mayor diferencia entre stock y umbral',
    '• Considerar ajustar umbrales si hay productos recurrentemente bajos',
    '• Revisar patrones de consumo para optimizar pedidos futuros'
  ];
  
  recommendations.forEach((rec, index) => {
    doc.text(rec, 14, finalY + 10 + (index * 8));
  });
  
  const fileName = `stock_bajo_baires_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
};

export const exportHistoryToPDF = (historial, dateRange = null) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(18);
  doc.setTextColor(40);
  doc.text('Historial de Movimientos', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text('Baires Inventory', pageWidth / 2, 30, { align: 'center' });
  
  // Rango de fechas
  if (dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Período: ${dateRange.start} - ${dateRange.end}`, pageWidth / 2, 40, { align: 'center' });
  }
  
  // Preparar datos
  const tableData = historial
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
    .map(log => [
      log.fecha.toDate ? log.fecha.toDate().toLocaleDateString('es-AR') : new Date(log.fecha).toLocaleDateString('es-AR'),
      log.fecha.toDate ? log.fecha.toDate().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : new Date(log.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      log.item_nombre || log.item_id || 'N/A',
      log.accion || 'N/A',
      Number(log.cantidad || 0).toFixed(2),
      log.usuario || 'Sistema',
      log.motivo || ''
    ]);
  
  doc.autoTable({
    head: [['Fecha', 'Hora', 'Producto', 'Acción', 'Cantidad', 'Usuario', 'Motivo']],
    body: tableData,
    startY: dateRange ? 50 : 45,
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [135, 206, 235],
      textColor: [40, 40, 40],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 22 },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'left', cellWidth: 35 },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', cellWidth: 18 },
      5: { halign: 'left', cellWidth: 25 },
      6: { halign: 'left', cellWidth: 30 }
    },
    didParseCell: function(data) {
      if (data.column.index === 3 && data.row.index >= 0) {
        const accion = tableData[data.row.index][3];
        if (accion === 'vendido') {
          data.cell.styles.textColor = [180, 0, 0]; // Rojo para ventas
        } else if (accion === 'agregado') {
          data.cell.styles.textColor = [0, 120, 0]; // Verde para agregados
        }
      }
    }
  });
  
  const fileName = `historial_baires_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  return fileName;
};