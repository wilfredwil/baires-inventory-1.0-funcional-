// src/utils/pdfExport.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
// MEJORAS VISUALES PARA exportCriticalStockToPDF - solo cambios estéticos
// FUNCIÓN COMPLETA SIN ACENTOS - Reemplaza completamente tu exportCriticalStockToPDF

export const exportCriticalStockToPDF = (inventory) => {
  try {
    console.log('=== DEBUG PDF STOCK CRITICO UNIFICADO POR CATEGORIAS ===');
    console.log('Inventario total:', inventory?.length || 0);
    
    if (!inventory || !Array.isArray(inventory) || inventory.length === 0) {
      throw new Error('No hay productos para exportar');
    }

    // Obtener todos los productos criticos (sin stock + stock bajo)
    const criticalItems = inventory.filter(item => {
      const stock = Number(item.stock) || 0;
      const umbral = Number(item.umbral_low) || 5;
      return stock <= umbral; // Incluye tanto sin stock (0) como stock bajo
    });

    console.log('Productos criticos totales:', criticalItems.length);

    if (criticalItems.length === 0) {
      throw new Error('No hay productos con stock critico para exportar');
    }

    // Funcion para agrupar TODOS los productos criticos por categorias
    const groupByCategory = (items) => {
      const grouped = {};
      items.forEach(item => {
        const categoria = item.tipo || 'Sin Categoria';
        if (!grouped[categoria]) {
          grouped[categoria] = [];
        }
        
        // Agregar informacion del estado del stock
        const itemWithStatus = {
          ...item,
          stockStatus: Number(item.stock) === 0 ? 'SIN_STOCK' : 'STOCK_BAJO'
        };
        
        grouped[categoria].push(itemWithStatus);
      });
      
      // Ordenar productos dentro de cada categoria: primero sin stock, luego stock bajo, alfabetico
      Object.keys(grouped).forEach(categoria => {
        grouped[categoria].sort((a, b) => {
          // Primero por estado (sin stock primero)
          if (a.stockStatus !== b.stockStatus) {
            return a.stockStatus === 'SIN_STOCK' ? -1 : 1;
          }
          // Luego alfabeticamente
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
    
    doc.setFillColor(240, 70, 85); // Rojo mas claro
    doc.rect(0, 0, pageWidth, 25, 'F');
    
    // Titulo principal con mejor tipografia
    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('REPORTE DE STOCK CRITICO POR CATEGORIAS', pageWidth / 2, 15, { align: 'center' });
    
    // Subtitulo
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text('Baires Inventory - Sistema de Gestion', pageWidth / 2, 23, { align: 'center' });
    
    // SECCION DE INFORMACION CON MEJOR DISEÑO
    const currentDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Caja de informacion
    doc.setFillColor(248, 249, 250);
    doc.rect(14, 42, pageWidth - 28, 25, 'F');
    
    doc.setDrawColor(220, 53, 69);
    doc.setLineWidth(0.5);
    doc.rect(14, 42, pageWidth - 28, 25);
    
    doc.setFontSize(10);
    doc.setTextColor(108, 117, 125);
    doc.text(`Generado el: ${currentDate}`, 18, 50);
    
    // Contar sin stock y stock bajo
    const outOfStockCount = criticalItems.filter(item => Number(item.stock) === 0).length;
    const lowStockCount = criticalItems.filter(item => {
      const stock = Number(item.stock) || 0;
      return stock > 0 && stock <= (Number(item.umbral_low) || 5);
    }).length;
    
    // Resumen principal con mejor formato
    doc.setFontSize(14);
    doc.setTextColor(220, 53, 69);
    doc.setFont(undefined, 'bold');
    doc.text(`${criticalItems.length} productos requieren atencion inmediata`, pageWidth / 2, 58, { align: 'center' });
    
    // Estadisticas en caja destacada
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text(`Sin stock: ${outOfStockCount} productos`, 18, 78);
    doc.text(`Stock bajo: ${lowStockCount} productos`, pageWidth - 18, 78, { align: 'right' });

    let currentY = 90;

    // SECCIONES POR CATEGORIA CON MEJOR DISEÑO
    const criticalByCategory = groupByCategory(criticalItems);
    const categorias = Object.keys(criticalByCategory).sort();

    categorias.forEach((categoria, index) => {
      const productos = criticalByCategory[categoria];
      const sinStockEnCategoria = productos.filter(p => p.stockStatus === 'SIN_STOCK').length;
      const stockBajoEnCategoria = productos.filter(p => p.stockStatus === 'STOCK_BAJO').length;
      
      // Header de categoria con diseño mejorado
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
          cellPadding: 3,
          lineWidth: 0.1,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: [73, 80, 87],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center'
        },
        columnStyles: {
          0: { halign: 'left', cellWidth: 38, fontStyle: 'bold' },
          1: { halign: 'left', cellWidth: 22 },
          2: { halign: 'center', cellWidth: 16, fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 16 },
          4: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          5: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
          6: { halign: 'left', cellWidth: 28 }
        },
        margin: { left: 14, right: 14 },
        alternateRowStyles: {
          fillColor: [252, 252, 252]
        },
        didParseCell: (data) => {
          // Mejorar el diseño de celdas criticas
          if (data.column.index === 5) { // Columna "Estado"
            const estado = data.cell.raw;
            if (estado === 'SIN STOCK') {
              data.cell.styles.fillColor = [220, 53, 69];
              data.cell.styles.textColor = [255, 255, 255];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.lineWidth = 0.2;
              data.cell.styles.lineColor = [180, 40, 55];
            } else if (estado === 'STOCK BAJO') {
              data.cell.styles.fillColor = [255, 193, 7];
              data.cell.styles.textColor = [33, 37, 41];
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.lineWidth = 0.2;
              data.cell.styles.lineColor = [220, 165, 6];
            }
          }
          
          // Mejorar visualizacion de stock
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
      
      // Verificar nueva pagina con mejor espaciado
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

    // Titulo de leyenda con fondo
    doc.setFillColor(108, 117, 125);
    doc.rect(14, currentY - 5, pageWidth - 28, 10, 'F');
    
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text('LEYENDA DE COLORES', 18, currentY);
    currentY += 12;

    // Tabla de leyenda mejorada
    autoTable(doc, {
      head: [['Estado', 'Descripcion', 'Accion Requerida']],
      body: [
        ['SIN STOCK', 'Producto completamente agotado', 'URGENTE - Reposicion inmediata'],
        ['STOCK BAJO', 'Stock por debajo del umbral minimo', 'ALTA - Programar reposicion']
      ],
      startY: currentY,
      styles: {
        fontSize: 9,
        cellPadding: 4,
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 65 },
        2: { halign: 'left', cellWidth: 70, fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.column.index === 0) {
          const estado = data.cell.raw;
          if (estado === 'SIN STOCK') {
            data.cell.styles.fillColor = [220, 53, 69];
            data.cell.styles.textColor = [255, 255, 255];
          } else if (estado === 'STOCK BAJO') {
            data.cell.styles.fillColor = [255, 193, 7];
            data.cell.styles.textColor = [33, 37, 41];
          }
        }
        if (data.column.index === 2) { // Accion requerida
          data.cell.styles.textColor = [40, 40, 40];
        }
      }
    });

    currentY = doc.lastAutoTable.finalY + 20;

    // PLAN DE ACCION CON MEJOR DISEÑO
    doc.setFillColor(240, 248, 255);
    doc.rect(14, currentY - 5, pageWidth - 28, 50, 'F');
    
    doc.setDrawColor(52, 144, 220);
    doc.setLineWidth(0.5);
    doc.rect(14, currentY - 5, pageWidth - 28, 50);

    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'bold');
    doc.text('PLAN DE ACCION POR CATEGORIAS', 18, currentY + 2);
    currentY += 12;

    doc.setFontSize(10);
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
      
      // Linea decorativa superior del footer
      doc.setDrawColor(220, 53, 69);
      doc.setLineWidth(0.8);
      doc.line(14, pageHeight - 25, pageWidth - 14, pageHeight - 25);
      
      // Informacion del footer con mejor diseño
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