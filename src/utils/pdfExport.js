// utils/pdfExport.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportInventoryToPDF = (inventory, filters = {}) => {
  try {
    console.log('=== DEBUG PDF ===');
    console.log('Iniciando exportación PDF con:', inventory?.length || 0, 'items');
    console.log('Filtros aplicados:', filters);
    
    // Validaciones iniciales
    if (!inventory || !Array.isArray(inventory)) {
      throw new Error('Datos de inventario inválidos');
    }
    
    if (inventory.length === 0) {
      throw new Error('No hay productos para exportar');
    }

    const doc = new jsPDF();
    
    // Configuración del documento
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    
    console.log('Configuración PDF - Ancho:', pageWidth, 'Alto:', pageHeight);
    
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
    let filterY = 45;
    if (Object.keys(filters).length > 0) {
      doc.setFontSize(10);
      doc.setTextColor(60);
      let filterText = 'Filtros aplicados: ';
      if (filters.tipo) filterText += `Tipo: ${filters.tipo}, `;
      if (filters.lowStock) filterText += 'Solo stock bajo, ';
      if (filters.search) filterText += `Búsqueda: "${filters.search}", `;
      
      doc.text(filterText.slice(0, -2), 14, 50);
      filterY = 55;
    }
    
    // Resumen estadístico
    const totalItems = inventory.length;
    const lowStockItems = inventory.filter(item => {
      const stock = Number(item.stock) || 0;
      const umbral = Number(item.umbral_low) || 0;
      return stock <= umbral;
    }).length;
    
    const totalValue = inventory.reduce((sum, item) => {
      const stock = Number(item.stock) || 0;
      const precio = Number(item.precio) || 0;
      return sum + (stock * precio);
    }, 0);
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Resumen:', 14, filterY + 5);
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Total de ítems: ${totalItems}`, 14, filterY + 15);
    doc.text(`Ítems con stock bajo: ${lowStockItems}`, 14, filterY + 25);
    doc.text(`Valor total estimado: $${totalValue.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`, 14, filterY + 35);
    
    // Preparar datos para la tabla
    const tableData = inventory.map(item => {
      try {
        const stock = Number(item.stock) || 0;
        const umbral = Number(item.umbral_low) || 0;
        const precio = Number(item.precio) || 0;
        const isLowStock = stock <= umbral;
        
        return [
          item.nombre || 'Sin nombre',
          item.tipo || 'N/A',
          item.marca || 'N/A',
          stock.toFixed(2),
          umbral.toFixed(2),
          precio > 0 ? `$${precio.toFixed(2)}` : 'N/A',
          isLowStock ? '⚠️ BAJO' : '✓ OK'
        ];
      } catch (itemError) {
        console.error('Error procesando item:', item, itemError);
        return [
          'Error en datos',
          'N/A',
          'N/A',
          '0.00',
          '0.00',
          'N/A',
          'ERROR'
        ];
      }
    });
    
    console.log('Datos de tabla preparados:', tableData.length, 'filas');
    
    // Generar tabla usando autoTable importado
    try {
      autoTable(doc, {
        head: [['Nombre', 'Tipo', 'Marca', 'Stock', 'Umbral', 'Precio', 'Estado']],
        body: tableData,
        startY: filterY + 45,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [135, 206, 235],
          textColor: [40, 40, 40],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 35 },
          1: { halign: 'center', cellWidth: 20 },
          2: { halign: 'left', cellWidth: 25 },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 18 },
          5: { halign: 'right', cellWidth: 20 },
          6: { halign: 'center', cellWidth: 25 }
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        didParseCell: function(data) {
          try {
            if (data.row.index >= 0 && tableData[data.row.index]) {
              const stockValue = Number(tableData[data.row.index][3]);
              const umbralValue = Number(tableData[data.row.index][4]);
              
              if (stockValue <= umbralValue) {
                data.cell.styles.fillColor = [255, 235, 235];
                data.cell.styles.textColor = [180, 0, 0];
              }
            }
          } catch (cellError) {
            console.error('Error en didParseCell:', cellError);
          }
        },
        margin: { top: 10, left: 14, right: 14 },
        pageBreak: 'auto',
        showHead: 'everyPage'
      });
      
      console.log('Tabla generada exitosamente');
    } catch (tableError) {
      console.error('Error generando tabla:', tableError);
      throw new Error('Error al crear la tabla del PDF: ' + tableError.message);
    }
    
    // Footer en cada página
    try {
      const pageCount = doc.internal.getNumberOfPages();
      
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        
        doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
        doc.text('Baires Inventory - Sistema de Gestión', 14, pageHeight - 15);
        doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
        doc.text('Generado automáticamente', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
      
      console.log('Footer agregado a', pageCount, 'páginas');
    } catch (footerError) {
      console.error('Error agregando footer:', footerError);
    }
    
    // Generar nombre del archivo
    const fileName = `inventario_baires_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Descargar el PDF
    console.log('Guardando PDF:', fileName);
    doc.save(fileName);
    
    console.log('PDF generado exitosamente');
    return fileName;
    
  } catch (error) {
    console.error('Error completo generando PDF:', error);
    console.error('Stack trace:', error.stack);
    throw new Error('Error al generar PDF: ' + error.message);
  }
};

export const exportLowStockToPDF = (lowStockItems) => {
  try {
    console.log('=== DEBUG PDF STOCK BAJO ===');
    console.log('Productos con stock bajo:', lowStockItems?.length || 0);
    
    if (!lowStockItems || !Array.isArray(lowStockItems) || lowStockItems.length === 0) {
      throw new Error('No hay productos con stock bajo para exportar');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(180, 0, 0);
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
    const tableData = lowStockItems.map(item => {
      try {
        const stock = Number(item.stock) || 0;
        const umbral = Number(item.umbral_low) || 0;
        const necesario = Math.max(0, umbral - stock);
        
        return [
          item.nombre || 'Sin nombre',
          item.tipo || 'N/A',
          stock.toFixed(2),
          umbral.toFixed(2),
          necesario.toFixed(2),
          item.proveedor_nombre || 'Sin proveedor'
        ];
      } catch (itemError) {
        console.error('Error procesando item de stock bajo:', item, itemError);
        return ['Error en datos', 'N/A', '0.00', '0.00', '0.00', 'Sin proveedor'];
      }
    });

    
   autoTable(doc, {
  head: [['Producto', 'Tipo', 'Stock', 'Umbral', 'Necesario', 'Proveedor']],
  body: tableData,
  startY: 60,
  styles: {
    fontSize: 8, // Reducir tamaño de fuente
    cellPadding: 3
  },
  headStyles: {
    fillColor: [255, 107, 107],
    textColor: [255, 255, 255],
    fontStyle: 'bold'
  },
  columnStyles: {
    0: { halign: 'left', cellWidth: 35 },   // Producto
    1: { halign: 'center', cellWidth: 20 }, // Tipo  
    2: { halign: 'center', cellWidth: 18 }, // Stock
    3: { halign: 'center', cellWidth: 18 }, // Umbral
    4: { halign: 'center', cellWidth: 18 }, // Necesario
    5: { halign: 'left', cellWidth: 30 }    // Proveedor (reducido)
  },
  margin: { left: 10, right: 10 }, // Añadir márgenes
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
    console.log('Guardando PDF stock bajo:', fileName);
    doc.save(fileName);
    
    console.log('PDF stock bajo generado exitosamente');
    return fileName;
    
  } catch (error) {
    console.error('Error generando PDF stock bajo:', error);
    throw new Error('Error al generar PDF de stock bajo: ' + error.message);
  }
};