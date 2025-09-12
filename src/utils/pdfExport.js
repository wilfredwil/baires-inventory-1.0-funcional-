// src/utils/pdfExport.js
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
    
    const outOfStockItems = inventory.filter(item => Number(item.stock) === 0).length;
    const totalValue = inventory.reduce((sum, item) => {
      return sum + ((Number(item.precio) || 0) * (Number(item.stock) || 0));
    }, 0);
    
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('Resumen del Inventario', 14, filterY + 10);
    
    doc.setFontSize(10);
    doc.setTextColor(60);
    doc.text(`Total de productos: ${totalItems}`, 14, filterY + 20);
    doc.text(`Productos con stock bajo: ${lowStockItems}`, 14, filterY + 28);
    doc.text(`Productos sin stock: ${outOfStockItems}`, 14, filterY + 36);
    doc.text(`Valor total estimado: $${totalValue.toLocaleString()}`, 14, filterY + 44);
    
    // Preparar datos para la tabla
    const tableData = inventory.map((item, index) => {
      try {
        const stock = Number(item.stock) || 0;
        const precio = Number(item.precio) || 0;
        const umbral = Number(item.umbral_low) || 0;
        
        const stockStatus = stock === 0 ? 'Sin Stock' : 
                          stock <= umbral ? 'Stock Bajo' : 'Normal';
        
        return [
          item.nombre || 'Sin nombre',
          item.marca || '-',
          item.tipo || '-',
          `${stock.toFixed(2)} ${item.unidad || ''}`,
          `$${precio.toLocaleString()}`,
          stockStatus,
          item.proveedor_nombre || 'Sin proveedor'
        ];
      } catch (itemError) {
        console.error('Error procesando item:', item, itemError);
        return ['Error en datos', '-', '-', '0', '$0', 'Error', 'Error'];
      }
    });

    console.log('Datos preparados para tabla:', tableData.length, 'filas');
    
    // Crear tabla principal
    try {
      autoTable(doc, {
        head: [['Producto', 'Marca', 'Tipo', 'Stock', 'Precio', 'Estado', 'Proveedor']],
        body: tableData,
        startY: filterY + 55,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [52, 152, 219],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 30 },
          1: { halign: 'left', cellWidth: 25 },
          2: { halign: 'center', cellWidth: 20 },
          3: { halign: 'center', cellWidth: 20 },
          4: { halign: 'right', cellWidth: 20 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'left', cellWidth: 25 }
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        didParseCell: (data) => {
          try {
            if (data.column.index === 5 && data.cell.raw) {
              const status = data.cell.raw.toString();
              if (status === 'Sin Stock') {
                data.cell.styles.fillColor = [231, 76, 60];
                data.cell.styles.textColor = [255, 255, 255];
              } else if (status === 'Stock Bajo') {
                data.cell.styles.fillColor = [241, 196, 15];
                data.cell.styles.textColor = [0, 0, 0];
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
    doc.text('ALERTA DE STOCK BAJO', pageWidth / 2, 20, { align: 'center' });
    
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
    doc.text(`${lowStockItems.length} productos requieren reposición urgente`, pageWidth / 2, 50, { align: 'center' });
    
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
    fontSize: 8,
    cellPadding: 3
  },
  headStyles: {
    fillColor: [255, 107, 107],
    textColor: [255, 255, 255],
    fontStyle: 'bold'
  },
  columnStyles: {
    0: { halign: 'left', cellWidth: 35 },
    1: { halign: 'center', cellWidth: 20 },
    2: { halign: 'center', cellWidth: 18 },
    3: { halign: 'center', cellWidth: 18 },
    4: { halign: 'center', cellWidth: 18 },
    5: { halign: 'left', cellWidth: 30 }
  },
  margin: { left: 10, right: 10 },
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

// NUEVA FUNCIÓN: Stock Crítico unificado por categorías
export const exportCriticalStockToPDF = (inventory) => {
  try {
    console.log('=== DEBUG PDF STOCK CRÍTICO UNIFICADO POR CATEGORÍAS ===');
    console.log('Inventario total:', inventory?.length || 0);
    
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
      throw new Error('No hay productos para exportar');
    }

    // Obtener todos los productos críticos (sin stock + stock bajo)
    const criticalItems = inventory.filter(item => {
      const stock = Number(item.stock) || 0;
      const umbral = Number(item.umbral_low) || 5;
      return stock <= umbral; // Incluye tanto sin stock (0) como stock bajo
    });

    console.log('Productos críticos totales:', criticalItems.length);

    if (criticalItems.length === 0) {
      throw new Error('No hay productos con stock crítico para exportar');
    }

    // Función para agrupar TODOS los productos críticos por categorías
    const groupByCategory = (items) => {
      const grouped = {};
      items.forEach(item => {
        const categoria = item.tipo || 'Sin Categoria';
        if (!grouped[categoria]) {
          grouped[categoria] = [];
        }
        
        // Agregar información del estado del stock
        const itemWithStatus = {
          ...item,
          stockStatus: Number(item.stock) === 0 ? 'SIN_STOCK' : 'STOCK_BAJO'
        };
        
        grouped[categoria].push(itemWithStatus);
      });
      
      // Ordenar productos dentro de cada categoría: primero sin stock, luego stock bajo, alfabético
      Object.keys(grouped).forEach(categoria => {
        grouped[categoria].sort((a, b) => {
          // Primero por estado (sin stock primero)
          if (a.stockStatus !== b.stockStatus) {
            return a.stockStatus === 'SIN_STOCK' ? -1 : 1;
          }
          // Luego alfabéticamente
          return (a.nombre || '').localeCompare(b.nombre || '');
        });
      });
      
      return grouped;
    };

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Header principal
    doc.setFontSize(20);
    doc.setTextColor(180, 0, 0);
    doc.text('REPORTE DE STOCK CRITICO POR CATEGORIAS', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(14);
    doc.setTextColor(40);
    doc.text('Baires Inventory', pageWidth / 2, 30, { align: 'center' });
    
    // Fecha y resumen
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
    
    // Contar sin stock y stock bajo
    const outOfStockCount = criticalItems.filter(item => Number(item.stock) === 0).length;
    const lowStockCount = criticalItems.filter(item => {
      const stock = Number(item.stock) || 0;
      return stock > 0 && stock <= (Number(item.umbral_low) || 5);
    }).length;
    
    // Resumen de la situación
    doc.setFontSize(12);
    doc.setTextColor(180, 0, 0);
    doc.text(`${criticalItems.length} productos requieren atencion inmediata`, pageWidth / 2, 50, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(220, 20, 60);
    doc.text(`Sin stock: ${outOfStockCount} productos`, 20, 60);
    doc.text(`Stock bajo: ${lowStockCount} productos`, 20, 70);

    let currentY = 85;

    // Agrupar todos los productos críticos por categoría
    const criticalByCategory = groupByCategory(criticalItems);
    const categorias = Object.keys(criticalByCategory).sort();

    // GENERAR UNA SECCIÓN POR CATEGORÍA
    categorias.forEach((categoria, index) => {
      const productos = criticalByCategory[categoria];
      const sinStockEnCategoria = productos.filter(p => p.stockStatus === 'SIN_STOCK').length;
      const stockBajoEnCategoria = productos.filter(p => p.stockStatus === 'STOCK_BAJO').length;
      
      // Header de categoría
      doc.setFontSize(14);
      doc.setTextColor(40, 40, 40);
      doc.text(`${categoria.toUpperCase()} (${productos.length} productos criticos)`, 14, currentY);
      
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(`Sin stock: ${sinStockEnCategoria} | Stock bajo: ${stockBajoEnCategoria}`, 14, currentY + 8);
      currentY += 18;

      // Tabla unificada para esta categoría con TODOS los productos críticos
      const categoryTableData = productos.map(item => {
        const stock = Number(item.stock) || 0;
        const umbral = Number(item.umbral_low) || 5;
        const necesario = Math.max(0, umbral - stock);
        const estado = stock === 0 ? 'SIN STOCK' : 'STOCK BAJO';
        
        return [
          item.nombre || 'Sin nombre',
          item.marca || '-',
          stock.toString(),
          umbral.toString(),
          necesario.toString(),
          estado,
          item.proveedor_nombre || 'Sin proveedor'
        ];
      });

      autoTable(doc, {
        head: [['Producto', 'Marca', 'Stock', 'Umbral', 'Necesario', 'Estado', 'Proveedor']],
        body: categoryTableData,
        startY: currentY,
        styles: {
          fontSize: 8,
          cellPadding: 2
        },
        headStyles: {
          fillColor: [60, 60, 60],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 35 },
          1: { halign: 'left', cellWidth: 20 },
          2: { halign: 'center', cellWidth: 15 },
          3: { halign: 'center', cellWidth: 15 },
          4: { halign: 'center', cellWidth: 15 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'left', cellWidth: 25 }
        },
        margin: { left: 10, right: 10 },
        alternateRowStyles: {
          fillColor: [248, 248, 248]
        },
        // Función para colorear las filas según el estado
        didParseCell: (data) => {
          if (data.column.index === 5) { // Columna "Estado"
            const estado = data.cell.raw;
            if (estado === 'SIN STOCK') {
              data.cell.styles.fillColor = [220, 20, 60]; // Rojo intenso
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            } else if (estado === 'STOCK BAJO') {
              data.cell.styles.fillColor = [255, 140, 0]; // Naranja
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          
          // También colorear la columna de stock para mayor claridad visual
          if (data.column.index === 2) { // Columna "Stock"
            const stock = parseFloat(data.cell.raw) || 0;
            if (stock === 0) {
              data.cell.styles.fillColor = [255, 235, 235]; // Fondo rojo claro
              data.cell.styles.textColor = [220, 20, 60]; // Texto rojo
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [255, 248, 220]; // Fondo naranja claro
              data.cell.styles.textColor = [255, 140, 0]; // Texto naranja
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 15;
      
      // Verificar si necesitamos nueva página para la siguiente categoría
      if (index < categorias.length - 1 && currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
    });

    // LEYENDA DE COLORES
    if (currentY > 230) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('LEYENDA DE COLORES', 14, currentY);
    currentY += 10;

    // Crear mini-tabla para la leyenda
    autoTable(doc, {
      head: [['Estado', 'Descripcion', 'Accion Requerida']],
      body: [
        ['SIN STOCK', 'Producto completamente agotado', 'URGENTE - Reposicion inmediata'],
        ['STOCK BAJO', 'Stock por debajo del umbral minimo', 'ALTA - Programar reposicion 48h']
      ],
      startY: currentY,
      styles: {
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [100, 100, 100],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'left', cellWidth: 60 },
        2: { halign: 'left', cellWidth: 60 }
      },
      didParseCell: (data) => {
        if (data.column.index === 0) { // Columna "Estado"
          const estado = data.cell.raw;
          if (estado === 'SIN STOCK') {
            data.cell.styles.fillColor = [220, 20, 60];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else if (estado === 'STOCK BAJO') {
            data.cell.styles.fillColor = [255, 140, 0];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // RECOMENDACIONES
    doc.setFontSize(12);
    doc.setTextColor(40);
    doc.text('PLAN DE ACCION POR CATEGORIAS', 14, currentY);
    currentY += 10;

    doc.setFontSize(10);
    doc.setTextColor(60);
    
    const recommendations = [
      'ESTRATEGIA POR CATEGORIAS:',
      '   • Revisar cada categoria por separado para mejor organizacion',
      '   • Priorizar categorias con mas productos SIN STOCK',
      '   • Contactar proveedores agrupando pedidos por categoria',
      '',
      'ACCIONES INMEDIATAS:',
      '   • Productos SIN STOCK: Contacto urgente con proveedores',
      '   • Productos STOCK BAJO: Programar reposicion en 48 horas',
      '   • Considerar transferencias entre sucursales si aplica'
    ];

    recommendations.forEach((rec, index) => {
      if (rec.endsWith(':')) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(40);
      } else {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80);
      }
      
      doc.text(rec, 14, currentY + (index * 6));
    });

    // Footer en todas las páginas
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      
      doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
      doc.text('Baires Inventory - Stock Critico Unificado por Categorias', 14, pageHeight - 15);
      doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
      doc.text('ACCION INMEDIATA REQUERIDA', pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
    // Generar nombre del archivo con timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `stock_critico_unificado_${timestamp}.pdf`;
    
    console.log('Guardando PDF stock crítico unificado por categorías:', fileName);
    doc.save(fileName);
    
    console.log('PDF de stock crítico unificado generado exitosamente');
    return fileName;
    
  } catch (error) {
    console.error('Error generando PDF de stock crítico:', error);
    throw new Error('Error al generar PDF de stock crítico: ' + error.message);
  }
};