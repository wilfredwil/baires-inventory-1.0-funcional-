// src/utils/pdfExport.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// FUNCIÓN CORREGIDA PARA STOCK CRÍTICO
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
      console.log(`${item.nombre}: stock=${item.stock} (${typeof item.stock}), umbral_low=${item.umbral_low} (${typeof item.umbral_low})`);
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
      
      // Para LICORES/SPIRITS (se miden en fracciones)
      if (tipo.includes('licor') || tipo.includes('whisky') || tipo.includes('vodka') || 
          tipo.includes('gin') || tipo.includes('rum') || tipo.includes('tequila') ||
          subtipo.includes('whisky') || subtipo.includes('vodka') || subtipo.includes('gin') ||
          subtipo.includes('bourbon') || subtipo.includes('scotch') || subtipo.includes('cognac') ||
          subtipo.includes('brandy') || subtipo.includes('mezcal') || subtipo.includes('pisco')) {
        
        // Para licores, usar umbral más alto si es muy bajo
        umbralInteligente = Math.max(umbralOriginal, 1); // Cambié de 0.5 a 1
        
      // Para VINOS (se cuentan por botellas)
      } else if (tipo.includes('vino') || tipo.includes('wine') ||
                 subtipo.includes('cabernet') || subtipo.includes('malbec') || 
                 subtipo.includes('chardonnay') || subtipo.includes('sauvignon') ||
                 subtipo.includes('pinot') || subtipo.includes('merlot') || 
                 subtipo.includes('tempranillo') || subtipo.includes('rosé') ||
                 subtipo.includes('prosecco') || subtipo.includes('champagne')) {
        
        // Para vinos, mínimo 3-5 botellas
        umbralInteligente = Math.max(umbralOriginal, 3); // Cambié de 2 a 3
        
      // Para CERVEZAS (se cuentan por cajas/cages)
      } else if (tipo.includes('cerveza') || tipo.includes('beer') ||
                 subtipo.includes('lager') || subtipo.includes('ale') || subtipo.includes('ipa') ||
                 item.nombre.toLowerCase().includes('corona') || 
                 item.nombre.toLowerCase().includes('heineken') ||
                 item.nombre.toLowerCase().includes('stella') ||
                 item.nombre.toLowerCase().includes('quilmes') ||
                 item.nombre.toLowerCase().includes('peroni')) {
        
        // Para cervezas, mínimo 2 cajas/cages
        umbralInteligente = Math.max(umbralOriginal, 2); // Cambié de 1 a 2
        
      // Para OTROS productos, usar umbral original pero con mínimo de 1
      } else {
        umbralInteligente = Math.max(umbralOriginal, 2); // Cambié de 1 a 2
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
    doc.text(`Sin stock: ${outOfStockCount} productos`, 18, 78);
    doc.text(`Stock bajo: ${lowStockCount} productos`, pageWidth - 18, 78, { align: 'right' });

    let currentY = 90;

    // SECCIONES POR CATEGORÍA CON MEJOR DISEÑO
    const criticalByCategory = groupByCategory(criticalItems);
    const categorias = Object.keys(criticalByCategory).sort();

    categorias.forEach((categoria, index) => {
      const productos = criticalByCategory[categoria];
      const sinStockEnCategoria = productos.filter(p => p.stockStatus === 'SIN_STOCK').length;
      const stockBajoEnCategoria = productos.filter(p => p.stockStatus === 'STOCK_BAJO').length;
      
      // Header de categoría con diseño mejorado
      doc.setFillColor(52, 58, 64);
      doc.rect(14, currentY - 5, pageWidth - 28, 12, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, 'bold');
      doc.text(`${categoria.toUpperCase()} (${productos.length} productos criticos)`, 18, currentY + 2);
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(`Sin stock: ${sinStockEnCategoria} | Stock bajo: ${stockBajoEnCategoria}`, 18, currentY + 6);
      currentY += 15;

      // Tabla con mejor diseño visual
      const categoryTableData = productos.map(item => {
        const stock = parseFloat(item.stock) || 0;
        const umbral = parseFloat(item.umbral_low) || 5;
        const necesario = Math.max(0, umbral - stock);
        const estado = stock === 0 ? 'SIN STOCK' : 'STOCK BAJO';
        
        return [
          item.nombre || 'N/A',
          item.marca || '-',
          `${stock} ${item.unidad || 'u'}`,
          umbral.toString(),
          necesario.toString(),
          estado
        ];
      });

      // Generar tabla para esta categoría
      autoTable(doc, {
        head: [['Producto', 'Marca', 'Stock', 'Umbral', 'Necesario', 'Estado']],
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
          0: { cellWidth: 45 }, // Producto
          1: { cellWidth: 35 }, // Marca
          2: { cellWidth: 25, halign: 'center' }, // Stock
          3: { cellWidth: 20, halign: 'center' }, // Umbral
          4: { cellWidth: 25, halign: 'center' }, // Necesario
          5: { cellWidth: 30, halign: 'center' }  // Estado
        },
        didParseCell: function(data) {
          // Resaltar estado SIN STOCK
          if (data.column.index === 5 && data.cell.raw === 'SIN STOCK') {
            data.cell.styles.fillColor = [255, 193, 7];
            data.cell.styles.textColor = [33, 37, 41];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.lineWidth = 0.2;
            data.cell.styles.lineColor = [220, 165, 6];
          }
          
          // Mejorar visualización de stock
          if (data.column.index === 2) { // Columna "Stock"
            const stock = parseFloat(data.cell.raw) || 0;
            if (stock === 0) {
              data.cell.styles.fillColor = [255, 240, 245];
              data.cell.styles.textColor = [220, 53, 69];
              data.cell.styles.fontStyle = 'bold';
            } else {
              data.cell.styles.fillColor = [255, 252, 230];
              data.cell.styles.textColor = [255, 140, 0];
              data.cell.styles.fontStyle = 'bold';
            }
          }
          
          // Resaltar productos necesarios
          if (data.column.index === 4) { // Columna "Necesario"
            const necesario = parseFloat(data.cell.raw) || 0;
            if (necesario > 0) {
              data.cell.styles.textColor = [220, 53, 69];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      currentY = doc.lastAutoTable.finalY + 20;
      
      // Verificar nueva página con mejor espaciado
      if (index < categorias.length - 1 && currentY > 220) {
        doc.addPage();
        currentY = 25;
      }
    });

    // LEYENDA CON DISEÑO MODERNO
    if (currentY > 220) {
      doc.addPage();
      currentY = 25;
    }

    // Título de leyenda con fondo
    doc.setFillColor(108, 117, 125);
    doc.rect(14, currentY - 5, pageWidth - 28, 10, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('LEYENDA DE COLORES', 18, currentY);
    currentY += 12;

    // Tabla de leyenda
    autoTable(doc, {
      head: [['Color', 'Significado', 'Accion Requerida']],
      body: [
        ['Rojo (Sin Stock)', 'Producto agotado', 'Contacto URGENTE con proveedor'],
        ['Naranja (Stock Bajo)', 'Stock por debajo del umbral', 'Programar reposicion'],
        ['Amarillo (Necesario)', 'Cantidad sugerida a reponer', 'Incluir en proxima orden']
      ],
      startY: currentY,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 4
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      }
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // RECOMENDACIONES FINALES
    doc.setFontSize(12);
    doc.setTextColor(60, 60, 60);
    
    const recommendations = [
      'ESTRATEGIA POR CATEGORIAS:',
      '   • Revisar cada categoria por separado para mejor organizacion',
      '   • Priorizar categorias con mas productos SIN STOCK',
      '   • Contactar proveedores agrupando pedidos por categoria',
      '',
      'ACCIONES INMEDIATAS:',
      '   • Productos SIN STOCK: Contacto urgente con proveedores',
      '   • Productos STOCK BAJO: Programar reposicion',
      '   • Considerar transferencias entre sucursales si aplica'
    ];

    recommendations.forEach((rec, index) => {
      if (rec.includes('ESTRATEGIA') || rec.includes('ACCIONES')) {
        doc.setFont(undefined, 'bold');
        doc.setTextColor(40, 40, 40);
      } else {
        doc.setFont(undefined, 'normal');
        doc.setTextColor(80, 80, 80);
      }
      
      doc.text(rec, 18, currentY + (index * 5));
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
      doc.text('Baires Inventory - Stock Critico Unificado por Categorias', 14, pageHeight - 15);
      doc.text(`Pagina ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
      
      doc.setFont(undefined, 'bold');
      doc.setTextColor(220, 53, 69);
      doc.text('ACCION INMEDIATA REQUERIDA', pageWidth / 2, pageHeight - 8, { align: 'center' });
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

// PDF de productos importantes (con estrella)
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

    // Tabla de productos importantes
    const tableData = importantItems.map(item => {
      const stock = parseFloat(item.stock) || 0;
      const umbral = parseFloat(item.umbral_low) || 5;
      const necesario = Math.max(0, umbral - stock);
      const estado = stock === 0 ? 'SIN STOCK' : 
                    stock <= umbral ? 'STOCK BAJO' : 'OK';
      
      return [
        item.nombre || 'N/A',
        item.marca || '-',
        item.tipo || '-',
        `${stock} ${item.unidad || 'u'}`,
        umbral.toString(),
        necesario.toString(),
        estado
      ];
    });

    autoTable(doc, {
      head: [['Producto', 'Marca', 'Tipo', 'Stock', 'Umbral', 'Necesario', 'Estado']],
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
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 20, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: function(data) {
        // Resaltar productos críticos
        if (data.column.index === 6) {
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

    // Footer
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
          `${stock} ${item.unidad || 'u'}`,
          necesario.toString(),
          sugerido.toString(),
          prioridad,
          '☐' // Checkbox para marcar
        ];
      });

      autoTable(doc, {
        head: [['Producto', 'Stock Actual', 'Cantidad Mínima', 'Cantidad Sugerida', 'Prioridad', '✓']],
        body: groupTableData,
        startY: currentY,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 3,
          lineWidth: 0.1
        },
        headStyles: {
          fillColor: [108, 117, 125],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 25, halign: 'center' },
          3: { cellWidth: 30, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 15, halign: 'center' }
        },
        didParseCell: function(data) {
          if (data.column.index === 4) { // Prioridad
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

      currentY = doc.lastAutoTable.finalY + 10;
      
      // Nueva página si es necesario
      if (index < Object.keys(groupedItems).length - 1 && currentY > 220) {
        doc.addPage();
        currentY = 25;
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
      doc.text('Baires Inventory - Lista de Compras', 14, pageHeight - 15);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 15, { align: 'right' });
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