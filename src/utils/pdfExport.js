// src/utils/pdfExport.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// FUNCIÓN CORREGIDA PARA STOCK CRÍTICO CON SECCIÓN DE IMPORTANTES
const exportCriticalStockToPDF = (inventory) => {
  try {
    console.log('=== DEBUG PDF STOCK CRITICO UNIFICADO POR CATEGORIAS ===');
    console.log('Inventario total:', inventory?.length || 0);
    
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
      throw new Error('No hay productos para exportar');
    }

    // DEBUG: Verificar algunos productos antes del filtro
    console.log('=== VERIFICANDO PRODUCTOS ANTES DEL FILTRO ===');
    inventory.slice(0, 5).forEach(item => {
      console.log(`${item.nombre}: stock=${item.stock} (${typeof item.stock}), umbral_low=${item.umbral_low} (${typeof item.umbral_low}), importante=${item.importante}`);
    });

    // FILTRO INTELIGENTE POR TIPO DE PRODUCTO - Obtener todos los productos críticos
    const criticalItems = inventory.filter(item => {
      // Convertir valores de manera más segura
      const stock = parseFloat(item.stock) || 0;
      const umbralOriginal = parseFloat(item.umbral_low) || 5;
      
      // Validar que los valores sean números válidos
      if (isNaN(stock) || isNaN(umbralOriginal)) {
        console.warn(`Valores inválidos para ${item.nombre}: stock=${item.stock}, umbral=${item.umbral_low}`);
        return false;
      }
      
      // UMBRAL INTELIGENTE POR TIPO DE PRODUCTO
      const tipo = (item.tipo || '').toLowerCase();
      const subtipo = (item.subTipo || '').toLowerCase();
      const unidad = (item.unidad || '').toLowerCase();
      
      let umbralInteligente = umbralOriginal;
      
      // Para LICORES/SPIRITS (se miden en botellas)
      if (tipo.includes('licor') || tipo.includes('spirit') || tipo.includes('whisky') ||
          tipo.includes('vodka') || tipo.includes('gin') || tipo.includes('ron') ||
          tipo.includes('tequila') || tipo.includes('cognac') || tipo.includes('brandy') ||
          unidad.includes('botella') || unidad.includes('750ml') || unidad.includes('1l')) {
        
        // Para licores importantes, usar mínimo 2 botellas
        umbralInteligente = Math.max(umbralOriginal, 2);
        
      // Para CERVEZAS (se miden en cajones/canastas)
      } else if (tipo.includes('cerveza') || tipo.includes('beer') ||
                 subtipo.includes('cerveza') || unidad.includes('cajón') || unidad.includes('canasta') ||
                 item.nombre.toLowerCase().includes('stella') ||
                 item.nombre.toLowerCase().includes('quilmes') ||
                 item.nombre.toLowerCase().includes('peroni')) {
        
        // Para cervezas, mínimo 2 cajas/cages
        umbralInteligente = Math.max(umbralOriginal, 2);
        
      // Para OTROS productos, usar umbral original pero con mínimo de 1
      } else {
        umbralInteligente = Math.max(umbralOriginal, 2);
      }
      
      const isCritical = stock <= umbralInteligente;
      
      // Debug para verificar el filtrado con nuevo umbral
      if (umbralInteligente !== umbralOriginal) {
        console.log(`${item.nombre} [${tipo}/${subtipo}]: Stock=${stock}, Umbral original=${umbralOriginal}, Umbral inteligente=${umbralInteligente}, ¿Crítico?=${isCritical}`);
      } else {
        console.log(`${item.nombre}: Stock=${stock}, Umbral=${umbralOriginal}, ¿Crítico?=${isCritical}`);
      }
      
      return isCritical;
    });

    console.log('Productos criticos totales:', criticalItems.length);

    if (criticalItems.length === 0) {
      throw new Error('No hay productos con stock critico para exportar');
    }

    // SEPARAR PRODUCTOS IMPORTANTES DE NORMALES
    const importantCritical = criticalItems.filter(item => item.importante === true);
    const normalCritical = criticalItems.filter(item => item.importante !== true);

    console.log('Productos críticos importantes:', importantCritical.length);
    console.log('Productos críticos normales:', normalCritical.length);

    // Función para agrupar productos críticos por categorías (sin importantes)
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
          stockStatus: parseFloat(item.stock) === 0 ? 'SIN_STOCK' : 'STOCK_BAJO'
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
    
    // HEADER MEJORADO CON GRADIENTE VISUAL
    // Fondo decorativo superior
    doc.setFillColor(220, 53, 69); // Rojo principal
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFillColor(240, 70, 85); // Rojo más claro
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Título principal con mejor tipografía
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE STOCK CRITICO POR CATEGORIAS', pageWidth / 2, 15, { align: 'center' });
    
    // Subtítulo
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Baires Inventory - Sistema de Gestion', pageWidth / 2, 23, { align: 'center' });
    
    // SECCIÓN DE INFORMACIÓN CON MEJOR DISEÑO
    const currentDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Caja de información
    doc.setFillColor(248, 249, 250);
    doc.rect(14, 42, pageWidth - 28, 25, 'F');
    
    doc.setDrawColor(220, 53, 69);
    doc.setLineWidth(0.5);
    doc.rect(14, 42, pageWidth - 28, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Generado el: ${currentDate}`, 18, 50);
    
    // Contar sin stock y stock bajo con valores corregidos
    const outOfStockCount = criticalItems.filter(item => parseFloat(item.stock) === 0).length;
    const lowStockCount = criticalItems.filter(item => {
      const stock = parseFloat(item.stock) || 0;
      return stock > 0 && stock <= (parseFloat(item.umbral_low) || 5);
    }).length;
    
    // Resumen principal con mejor formato
    doc.setFontSize(14);
    doc.setTextColor(220, 53, 69);
    doc.setFont(undefined, 'bold');
    doc.text(`${criticalItems.length} productos requieren atencion inmediata`, pageWidth / 2, 58, { align: 'center' });
    
    // Estadísticas en caja destacada
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text(`Sin stock: ${outOfStockCount} | Stock bajo: ${lowStockCount} | Importantes: ${importantCritical.length}`, pageWidth / 2, 78, { align: 'center' });

    let currentY = 90;

    // SECCIÓN ESPECIAL PARA PRODUCTOS IMPORTANTES - NUEVA
    if (importantCritical.length > 0) {
      // Header para productos importantes
      doc.setFillColor(255, 193, 7); // Amarillo para importantes
      doc.rect(14, currentY - 5, pageWidth - 28, 15, 'F');
      
      doc.setFontSize(14);
      doc.setTextColor(33, 37, 41);
      doc.setFont(undefined, 'bold');
      doc.text(`⭐ PRODUCTOS IMPORTANTES CRÍTICOS (${importantCritical.length}) - PRIORIDAD MÁXIMA`, pageWidth / 2, currentY + 3, { align: 'center' });
      
      currentY += 18;

      // Tabla de productos importantes - SIN COLUMNAS DE UMBRAL Y NECESARIO
      const importantTableData = importantCritical.map(item => {
        const stock = parseFloat(item.stock) || 0;
        const estado = stock === 0 ? 'SIN STOCK' : 'STOCK BAJO';
        
        return [
          item.nombre || 'N/A',
          item.marca || '-',
          item.tipo || '-',
          `${stock} ${item.unidad || 'u'}`,
          estado
        ];
      });

      autoTable(doc, {
        head: [['Producto', 'Marca', 'Tipo', 'Stock Actual', 'Estado']],
        body: importantTableData,
        startY: currentY,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: [255, 193, 7],
          textColor: [33, 37, 41],
          fontStyle: 'bold',
          fontSize: 10
        },
        columnStyles: {
          0: { cellWidth: 70 }, // Producto más ancho
          1: { cellWidth: 40 }, // Marca
          2: { cellWidth: 30 }, // Tipo
          3: { cellWidth: 30, halign: 'center' }, // Stock
          4: { cellWidth: 30, halign: 'center' } // Estado
        },
        didParseCell: function(data) {
          // Resaltar productos críticos importantes por estado
          if (data.column.index === 4) { // Columna Estado
            if (data.cell.raw === 'SIN STOCK') {
              data.cell.styles.fillColor = [220, 53, 69];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [255, 193, 7];
              data.cell.styles.textColor = [33, 37, 41];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 15;

      // Verificar si necesitamos nueva página
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
    }

    // SECCIONES POR CATEGORÍA PARA PRODUCTOS NORMALES (NO IMPORTANTES)
    if (normalCritical.length > 0) {
      const criticalByCategory = groupByCategory(normalCritical);
      const categorias = Object.keys(criticalByCategory).sort();

      // Header para productos normales críticos
      doc.setFillColor(52, 58, 64);
      doc.rect(14, currentY - 5, pageWidth - 28, 12, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(`📦 OTROS PRODUCTOS CRÍTICOS POR CATEGORÍA (${normalCritical.length})`, pageWidth / 2, currentY + 2, { align: 'center' });
      currentY += 15;

      categorias.forEach((categoria, index) => {
        const productos = criticalByCategory[categoria];
        const sinStockEnCategoria = productos.filter(p => p.stockStatus === 'SIN_STOCK').length;
        const stockBajoEnCategoria = productos.filter(p => p.stockStatus === 'STOCK_BAJO').length;
        
        // Header de categoría con diseño mejorado
        doc.setFillColor(108, 117, 125);
        doc.rect(14, currentY - 5, pageWidth - 28, 10, 'F');
        
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFont(undefined, 'bold');
        doc.text(`${categoria.toUpperCase()} (${productos.length})`, 18, currentY);
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(`Sin stock: ${sinStockEnCategoria} | Stock bajo: ${stockBajoEnCategoria}`, pageWidth - 18, currentY, { align: 'right' });
        currentY += 12;

        // Tabla con mejor diseño visual - SIN COLUMNAS DE UMBRAL Y NECESARIO
        const categoryTableData = productos.map(item => {
          const stock = parseFloat(item.stock) || 0;
          const estado = stock === 0 ? 'SIN STOCK' : 'STOCK BAJO';
          
          return [
            item.nombre || 'N/A',
            item.marca || '-',
            `${stock} ${item.unidad || 'u'}`,
            estado
          ];
        });

        autoTable(doc, {
          head: [['Producto', 'Marca', 'Stock Actual', 'Estado']],
          body: categoryTableData,
          startY: currentY,
          theme: 'grid',
          styles: {
            fontSize: 8,
            cellPadding: 3,
            lineWidth: 0.1,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [108, 117, 125],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          columnStyles: {
            0: { cellWidth: 80 }, // Producto más ancho
            1: { cellWidth: 45 }, // Marca
            2: { cellWidth: 35, halign: 'center' }, // Stock
            3: { cellWidth: 30, halign: 'center' } // Estado
          },
          didParseCell: function(data) {
            // Resaltar productos críticos por estado
            if (data.column.index === 3) { // Columna Estado
              if (data.cell.raw === 'SIN STOCK') {
                data.cell.styles.fillColor = [220, 53, 69];
                data.cell.styles.textColor = [255, 255, 255];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.fillColor = [255, 193, 7];
                data.cell.styles.textColor = [33, 37, 41];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        // Verificar si necesitamos nueva página
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        }
      });
    }

    // SECCIÓN DE RECOMENDACIONES MEJORADA
    currentY += 15;
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFillColor(255, 248, 240);
    doc.rect(14, currentY - 5, pageWidth - 28, 50, 'F');
    
    doc.setDrawColor(255, 193, 7);
    doc.setLineWidth(0.5);
    doc.rect(14, currentY - 5, pageWidth - 28, 50);
    
    doc.setFontSize(14);
    doc.setTextColor(183, 110, 0);
    doc.setFont(undefined, 'bold');
    doc.text('RECOMENDACIONES Y PLAN DE ACCIÓN:', 18, currentY + 8);
    
    currentY += 18;
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    const recommendations = [
      'PRIORIDAD MÁXIMA - PRODUCTOS IMPORTANTES:',
      '   • Contactar proveedores INMEDIATAMENTE',
      '   • Buscar proveedores alternativos de emergencia',
      '',
      'PRODUCTOS NORMALES POR CATEGORÍA:',
      '   • Revisar cada categoría por separado',
      '   • Agrupar pedidos por proveedor para optimizar costos',
      '   • Considerar transferencias entre sucursales si aplica'
    ];

    recommendations.forEach((rec, index) => {
      if (rec.includes('PRIORIDAD') || rec.includes('PRODUCTOS NORMALES')) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(40, 40, 40);
      } else {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
      }
      
      doc.text(rec, 18, currentY + (index * 4));
    });

    // FOOTER MEJORADO
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Línea decorativa superior del footer
      doc.setDrawColor(220, 53, 69);
      doc.setLineWidth(0.8);
      doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
      
      // Información del footer con mejor diseño
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      doc.text('Baires Inventory - Stock Crítico Unificado con Productos Importantes', 14, pageHeight - 15);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text('ACCIÓN INMEDIATA REQUERIDA', pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
    
    // Generar archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `stock_critico_unificado_${timestamp}.pdf`;
    
    console.log('Guardando PDF stock critico unificado por categorias:', fileName);
    doc.save(fileName);
    
    console.log('PDF de stock critico unificado generado exitosamente');
    return fileName;
    
  } catch (error) {
    console.error('Error generando PDF de stock critico:', error);
    throw new Error('Error al generar PDF de stock critico: ' + error.message);
  }
};

// PDF de productos importantes (con estrella) - FUNCIÓN COMPLETA CORREGIDA
const exportImportantProductsToPDF = (inventory) => {
  try {
    console.log('=== GENERANDO PDF DE PRODUCTOS IMPORTANTES ===');
    
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
      throw new Error('No hay productos para exportar');
    }

    // Filtrar solo productos marcados como importantes
    const importantItems = inventory.filter(item => item.importante === true);

    console.log('Productos importantes encontrados:', importantItems.length);

    if (importantItems.length === 0) {
      throw new Error('No hay productos marcados como importantes para exportar');
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // HEADER
    doc.setFillColor(255, 193, 7); // Amarillo para importantes
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(33, 37, 41);
    doc.setFont(undefined, 'bold');
    doc.text('⭐ PRODUCTOS IMPORTANTES - NUNCA PUEDEN FALTAR ⭐', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Licores críticos para operación del bar', pageWidth / 2, 25, { align: 'center' });
    
    // Información
    const currentDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Generado el: ${currentDate}`, 18, 45);
    
    // Contar críticos dentro de importantes
    const importantCritical = importantItems.filter(item => {
      const stock = parseFloat(item.stock) || 0;
      const umbral = parseFloat(item.umbral_low) || 5;
      return stock <= umbral;
    });
    
    doc.setFontSize(14);
    doc.setTextColor(220, 53, 69);
    doc.setFont(undefined, 'bold');
    doc.text(`${importantCritical.length} de ${importantItems.length} productos importantes necesitan reposición URGENTE`, pageWidth / 2, 58, { align: 'center' });

    let currentY = 70;

    // Tabla de productos importantes - PARTE QUE FALTABA EN EL CÓDIGO ORIGINAL - SIN MARCA
    const tableData = importantItems.map(item => {
      const stock = parseFloat(item.stock) || 0;
      const umbral = parseFloat(item.umbral_low) || 5;
      const necesario = Math.max(0, umbral - stock);
      const estado = stock === 0 ? 'SIN STOCK' : 
                    stock <= umbral ? 'STOCK BAJO' : 'OK';
      
      return [
        item.nombre || 'N/A',
        item.tipo || '-',
        `${stock} ${item.unidad || 'u'}`,
        umbral.toString(),
        necesario.toString(),
        estado
      ];
    });

    autoTable(doc, {
      head: [['Producto', 'Tipo', 'Stock', 'Umbral', 'Necesario', 'Estado']],
      body: tableData,
      startY: currentY,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineWidth: 0.1,
        lineColor: [200, 200, 200]
      },
      headStyles: {
        fillColor: [255, 193, 7],
        textColor: [33, 37, 41],
        fontStyle: 'bold',
        fontSize: 10
      },
      columnStyles: {
        0: { cellWidth: 60 }, // Producto reducido
        1: { cellWidth: 25 }, // Tipo
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: function(data) {
        // Resaltar productos críticos
        if (data.column.index === 5) { // Columna Estado
          if (data.cell.raw === 'SIN STOCK') {
            data.cell.styles.fillColor = [220, 53, 69];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.cell.raw === 'STOCK BAJO') {
            data.cell.styles.fillColor = [255, 193, 7];
            data.cell.styles.textColor = [33, 37, 41];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.fillColor = [40, 167, 69];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Agregar sección de recomendaciones - PARTE QUE TAMBIÉN FALTABA
    currentY = doc.lastAutoTable.finalY + 20;
    
    // Verificar si necesitamos nueva página
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    // Sección de recomendaciones
    doc.setFillColor(255, 248, 240);
    doc.rect(14, currentY - 5, pageWidth - 28, 30, 'F');
    
    doc.setDrawColor(255, 193, 7);
    doc.setLineWidth(0.5);
    doc.rect(14, currentY - 5, pageWidth - 28, 30);
    
    doc.setFontSize(12);
    doc.setTextColor(183, 110, 0);
    doc.setFont(undefined, 'bold');
    doc.text('RECOMENDACIONES PARA PRODUCTOS IMPORTANTES:', 18, currentY + 3);
    
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, 'normal');
    
    const recommendations = [
      '• Estos productos NUNCA pueden faltar en el bar',
      '• Mantener siempre stock de seguridad adicional',
      '• Contactar proveedores inmediatamente si están en rojo',
      '• Considerar tener proveedores alternativos para estos productos'
    ];

    recommendations.forEach((rec, index) => {
      doc.text(rec, 18, currentY + 10 + (index * 4));
    });

    // Footer - PARTE QUE TAMBIÉN FALTABA
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(255, 193, 7);
      doc.setLineWidth(0.8);
      doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      doc.text('Baires Inventory - Productos Importantes', 14, pageHeight - 15);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(255, 193, 7);
      doc.text('⭐ PRIORIDAD MÁXIMA ⭐', pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
    
    // Generar archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `productos_importantes_${timestamp}.pdf`;
    
    console.log('Guardando PDF productos importantes:', fileName);
    doc.save(fileName);
    
    console.log('PDF de productos importantes generado exitosamente');
    return fileName;
    
  } catch (error) {
    console.error('Error generando PDF de productos importantes:', error);
    throw new Error('Error al generar PDF de productos importantes: ' + error.message);
  }
};

// PDF organizado para órdenes de compra
const exportOrderSheetToPDF = (inventory) => {
  try {
    console.log('=== GENERANDO PDF PARA ÓRDENES DE COMPRA ===');
    
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
      throw new Error('No hay productos para exportar');
    }

    // Productos que necesitan reposición
    const needsRestock = inventory.filter(item => {
      const stock = parseFloat(item.stock) || 0;
      const umbral = parseFloat(item.umbral_low) || 5;
      return stock <= umbral;
    });

    if (needsRestock.length === 0) {
      throw new Error('No hay productos que necesiten reposición');
    }

    // Agrupar por proveedor si existe, sino por tipo
    const groupedItems = {};
    needsRestock.forEach(item => {
      let groupKey = 'Sin Proveedor';
      
      // Si tiene proveedor, usar ese
      if (item.proveedor_nombre && item.proveedor_nombre.trim()) {
        groupKey = item.proveedor_nombre.trim();
      } else if (item.tipo) {
        // Sino agrupar por tipo
        groupKey = `${item.tipo} (Por tipo)`;
      }
      
      if (!groupedItems[groupKey]) {
        groupedItems[groupKey] = [];
      }
      groupedItems[groupKey].push(item);
    });

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // HEADER
    doc.setFillColor(40, 167, 69);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('📋 LISTA DE COMPRAS - REPOSICIÓN DE STOCK', pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Organizado por proveedor para facilitar órdenes', pageWidth / 2, 25, { align: 'center' });
    
    // Información
    const currentDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    });
    
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Lista generada el: ${currentDate}`, 18, 45);
    doc.text(`Total de productos a reponer: ${needsRestock.length}`, pageWidth - 18, 45, { align: 'right' });

    let currentY = 60;

    // Procesar cada grupo
    Object.keys(groupedItems).sort().forEach((groupName, index) => {
      const productos = groupedItems[groupName];
      
      // Header del grupo
      doc.setFillColor(52, 58, 64);
      doc.rect(14, currentY - 5, pageWidth - 28, 12, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(`📦 ${groupName.toUpperCase()} (${productos.length} productos)`, 18, currentY + 2);
      currentY += 15;

      // Tabla para este grupo
      const groupTableData = productos.map(item => {
        const stock = parseFloat(item.stock) || 0;
        const umbral = parseFloat(item.umbral_low) || 5;
        const sugerido = Math.max(umbral * 2, umbral + 5); // Sugerir más cantidad
        const necesario = sugerido - stock;
        const prioridad = (item.importante === true || item.importante === "true") ? '⭐ ALTA' : 
                         stock === 0 ? 'URGENTE' : 'NORMAL';
        
        return [
          item.nombre || 'N/A',
          item.marca || '-',
          `${stock} ${item.unidad || 'u'}`,
          sugerido.toString(),
          necesario.toString(),
          prioridad
        ];
      });

      autoTable(doc, {
        head: [['Producto', 'Marca', 'Stock Actual', 'Sugerido', 'A Comprar', 'Prioridad']],
        body: groupTableData,
        startY: currentY,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: [40, 167, 69],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 35 },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 20, halign: 'center' }
        },
        didParseCell: function(data) {
          if (data.column.index === 5) {
            if (data.cell.raw.includes('⭐')) {
              data.cell.styles.fillColor = [255, 193, 7];
              data.cell.styles.textColor = [33, 37, 41];
              data.cell.styles.fontStyle = 'bold';
            } else if (data.cell.raw === 'URGENTE') {
              data.cell.styles.fillColor = [220, 53, 69];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 8;

      // Verificar si necesitamos nueva página
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    const pageHeight = doc.internal.pageSize.height;
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setDrawColor(40, 167, 69);
      doc.setLineWidth(0.8);
      doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
      
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont(undefined, 'normal');
      doc.text('Baires Inventory - Lista de Compras', 14, pageHeight - 15);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(40, 167, 69);
      doc.text('LISTA PARA PROVEEDORES', pageWidth / 2, pageHeight - 8, { align: 'center' });
    }
    
    // Generar archivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `lista_compras_${timestamp}.pdf`;
    
    doc.save(fileName);
    console.log('PDF de lista de compras generado exitosamente');
    return fileName;
    
  } catch (error) {
    console.error('Error generando PDF de lista de compras:', error);
    throw new Error('Error al generar PDF de lista de compras: ' + error.message);
  }
};

// Exportar todas las funciones
export { exportCriticalStockToPDF, exportImportantProductsToPDF, exportOrderSheetToPDF };