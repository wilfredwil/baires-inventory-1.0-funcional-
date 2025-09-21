// src/components/BarInventory.js - VERSIÓN COMPLETA CON REPORTE LOW STOCK POR PROVEEDOR
import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Modal, Alert, Badge,
  Table, InputGroup, Dropdown, ProgressBar, OverlayTrigger, Tooltip, Spinner
} from 'react-bootstrap';
import {
  FaWineGlass, FaPlus, FaSearch, FaFilter, FaDownload, FaChartBar,
  FaExclamationTriangle, FaArrowUp, FaArrowDown, FaEye, FaEdit,
  FaTrash, FaTh, FaList, FaSort, FaSortUp, FaSortDown, FaWineBottle,
  FaBeer, FaCocktail, FaGlassWhiskey, FaBoxes, FaDollarSign,
  FaArrowLeft, FaSync, FaBolt, FaSortAmountUp, FaSortAmountDown
} from 'react-icons/fa';
import {
  collection, onSnapshot, query, orderBy, where, updateDoc, doc,
  deleteDoc, addDoc, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { Pie, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title,
  Tooltip as ChartTooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';
import InventoryItemForm from './InventoryItemForm';
import { exportCriticalStockToPDF, exportImportantProductsToPDF, exportOrderSheetToPDF } from '../utils/pdfExport';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, ChartTooltip,
  Legend, ArcElement, PointElement, LineElement
);

const BarInventory = ({ onBack, user, userRole }) => {
  console.log('🚀 BarInventory component iniciado con:', { user: user?.email, userRole });

  // Estados principales
  const [inventory, setInventory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de vista
  const [viewMode, setViewMode] = useState('cards');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Estados de modales
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Categorías de productos del bar
  const categories = [
    { value: 'all', label: 'Todas las categorías', icon: FaWineGlass, color: '#6c757d' },
    { value: 'licor', label: 'Licores', icon: FaGlassWhiskey, color: '#dc3545' },
    { value: 'vino', label: 'Vinos', icon: FaWineBottle, color: '#6f42c1' },
    { value: 'cerveza', label: 'Cervezas', icon: FaBeer, color: '#fd7e14' },
    { value: 'cocktail', label: 'Ingredientes de Cóctel', icon: FaCocktail, color: '#20c997' },
    { value: 'whisky', label: 'Whiskys', icon: FaGlassWhiskey, color: '#8B4513' },
    { value: 'vodka', label: 'Vodkas', icon: FaGlassWhiskey, color: '#007bff' },
    { value: 'gin', label: 'Gins', icon: FaGlassWhiskey, color: '#28a745' },
    { value: 'ron', label: 'Rones', icon: FaGlassWhiskey, color: '#ffc107' },
    { value: 'tequila', label: 'Tequilas', icon: FaGlassWhiskey, color: '#17a2b8' },
    { value: 'champagne', label: 'Champagne/Espumante', icon: FaWineBottle, color: '#e83e8c' },
    { value: 'aperitivo', label: 'Aperitivos', icon: FaCocktail, color: '#fd7e14' }
  ];

  // Hook para cargar datos
  useEffect(() => {
    console.log('🔍 useEffect ejecutado - User:', user?.email);
    
    if (!user?.email) {
      console.log('❌ No hay usuario, no se puede cargar inventario');
      setLoading(false);
      return;
    }

    console.log('🔄 Cargando inventario del bar automáticamente...');

    // Intentar cargar todos los productos primero si no hay productos con tipo_inventario
    const inventoryQuery = query(collection(db, 'inventario'));

    const unsubscribeInventory = onSnapshot(
      inventoryQuery,
      (snapshot) => {
        console.log('📦 Documentos encontrados:', snapshot.docs.length);
        
        const allInventoryData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrar productos del bar de manera más flexible
        const barInventoryData = allInventoryData.filter(item => {
          const tipoInventario = (item.tipo_inventario || '').toLowerCase().trim();
          const tipo = (item.tipo || '').toLowerCase();
          
          // Incluir si tiene tipo_inventario = 'bar' O si es un tipo típico de bar
          return tipoInventario === 'bar' || 
                 tipo.includes('licor') || 
                 tipo.includes('vino') || 
                 tipo.includes('cerveza') || 
                 tipo.includes('whisky') || 
                 tipo.includes('vodka') || 
                 tipo.includes('gin') || 
                 tipo.includes('ron') || 
                 tipo.includes('tequila') ||
                 item.subTipo?.toLowerCase().includes('whisky') ||
                 item.subTipo?.toLowerCase().includes('vodka') ||
                 item.subTipo?.toLowerCase().includes('gin') ||
                 item.subTipo?.toLowerCase().includes('bourbon') ||
                 item.subTipo?.toLowerCase().includes('champagne');
        });
        
        console.log('🍺 Productos del bar encontrados:', barInventoryData.length);
        console.log('📋 Tipos encontrados:', [...new Set(allInventoryData.map(item => item.tipo))]);
        
        setInventory(barInventoryData);
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error cargando inventario:', error);
        setError('Error cargando inventario del bar');
        setLoading(false);
      }
    );

    // Cargar proveedores - USANDO CAMPO 'empresa' CORRECTO
    console.log('🔍 INICIANDO carga de proveedores con getDocs()...');
    
    const loadProviders = async () => {
      try {
        const providersRef = collection(db, 'providers');
        const q = query(providersRef, orderBy('empresa'));  // ← CAMBIO: usar 'empresa' no 'nombre'
        const snapshot = await getDocs(q);
        
        console.log('🏢 PROVEEDORES - Documentos encontrados:', snapshot.docs.length);
        
        const providersData = snapshot.docs.map(doc => {
          const data = { id: doc.id, ...doc.data() };
          console.log('🏢 Proveedor encontrado:', data);
          return data;
        });
        
        console.log('🏢 PROVEEDORES RAW:', providersData);
        
        const filteredProviders = providersData.filter(provider => {
          const hasName = provider.empresa && provider.empresa.trim() !== '';  // ← CAMBIO: usar 'empresa' no 'nombre'
          console.log(`🔍 Filtrando proveedor ${provider.id}: empresa="${provider.empresa}", pasa filtro=${hasName}`);
          return hasName;
        }).sort((a, b) => (a.empresa || '').localeCompare(b.empresa || ''));  // ← CAMBIO: usar 'empresa' no 'nombre'
        
        console.log('🏢 PROVEEDORES FILTRADOS:', filteredProviders);
        console.log(`✅ Estableciendo ${filteredProviders.length} proveedores en el estado`);
        
        setProviders(filteredProviders);
      } catch (error) {
        console.error('❌ ERROR cargando proveedores:', error);
        console.error('❌ Código de error:', error.code);
        console.error('❌ Mensaje de error:', error.message);
      }
    };

    // Cargar proveedores una vez
    loadProviders();

    // Auto-cargar después de un pequeño delay
    const timer = setTimeout(() => {
      console.log('🔍 Iniciando carga automática tras delay');
      // Ya se está cargando automáticamente con onSnapshot
    }, 100);

    return () => {
      unsubscribeInventory();
      clearTimeout(timer);
    };
  }, [user]);

  // Función para generar PDFs
  const generatePDF = (type, filterValue = null) => {
    console.log('DEBUG - generatePDF llamado con type:', type, 'filterValue:', filterValue);
    
    let itemsToInclude = [];
    let reportTitle = '';
    let reportSubtitle = '';

    console.log('DEBUG - Antes del switch, type:', type);
    
    switch (type) {
      case 'complete':
        itemsToInclude = inventory;
        reportTitle = 'Reporte Completo de Inventario del Bar';
        reportSubtitle = `${inventory.length} productos agrupados por categoría`;
        break;
      
      case 'low-stock':
        itemsToInclude = inventory.filter(item => item.stock <= (item.umbral_low || 5) && item.stock > 0);
        reportTitle = 'Reporte de Stock Bajo';
        reportSubtitle = `${itemsToInclude.length} productos con stock bajo`;
        break;
      
      case 'out-of-stock':
        itemsToInclude = inventory.filter(item => item.stock === 0);
        reportTitle = 'Reporte de Productos Sin Stock';
        reportSubtitle = `${itemsToInclude.length} productos agotados`;
        break;
      
      case 'critical-stock':
        // Usar la nueva función para stock crítico que combina sin stock y stock bajo
        exportCriticalStockToPDF(inventory);
        return; // Salir aquí ya que la nueva función maneja todo
      
      case 'important-products':
        console.log('DEBUG - Ejecutando caso important-products');
        try {
          exportImportantProductsToPDF(inventory);
          console.log('DEBUG - PDF de productos importantes generado exitosamente');
        } catch (error) {
          console.error('Error generando PDF de productos importantes:', error);
          alert('Error al generar PDF de productos importantes: ' + error.message);
        }
        return; // Salir aquí ya que la función maneja todo

      case 'order-sheet':
        console.log('DEBUG - Ejecutando caso order-sheet');
        try {
          exportOrderSheetToPDF(inventory);
          console.log('DEBUG - PDF de lista de compras generado exitosamente');
        } catch (error) {
          console.error('Error generando PDF de lista de compras:', error);
          alert('Error al generar PDF de lista de compras: ' + error.message);
        }
        return; // Salir aquí ya que la función maneja todo
      
      case 'category':
        itemsToInclude = inventory.filter(item => 
          (item.tipo?.toLowerCase() === filterValue) || 
          (item.subTipo?.toLowerCase() === filterValue)
        );
        const categoryInfo = categories.find(cat => cat.value === filterValue);
        reportTitle = `Reporte de ${categoryInfo?.label || filterValue}`;
        reportSubtitle = `${itemsToInclude.length} productos en esta categoría`;
        break;
      
      case 'provider':
        if (filterValue === 'sin-proveedor') {
          itemsToInclude = inventory.filter(item => !item.proveedor_id || item.proveedor_id.trim() === '');
          reportTitle = 'Reporte por Productos Sin Proveedor Asignado';
          reportSubtitle = `${itemsToInclude.length} productos sin proveedor`;
        } else {
          itemsToInclude = inventory.filter(item => item.proveedor_id === filterValue);
          const providerInfo = providers.find(p => p.id === filterValue);
          reportTitle = `Reporte por Proveedor: ${providerInfo?.empresa || providerInfo?.nombre || 'Proveedor'}`;
          reportSubtitle = `${itemsToInclude.length} productos - Orden de compra sugerida`;
        }
        break;
    }

    if (itemsToInclude.length === 0) {
      alert('No hay productos para incluir en este reporte.');
      return;
    }

    // Generar HTML para el reporte
    const currentDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let tableContent = '';
    
    // Agrupar por categoría para reporte completo
    if (type === 'complete') {
      const groupedByCategory = {};
      itemsToInclude.forEach(item => {
        const category = item.tipo || 'Sin categoría';
        if (!groupedByCategory[category]) {
          groupedByCategory[category] = [];
        }
        groupedByCategory[category].push(item);
      });

      Object.keys(groupedByCategory).forEach(category => {
        tableContent += `
          <tr style="background: #f8f9fa;">
            <td colspan="7" style="font-weight: bold; font-size: 1.1em; padding: 15px; color: #495057;">
              📦 ${category.toUpperCase()} (${groupedByCategory[category].length} productos)
            </td>
          </tr>
        `;
        
        groupedByCategory[category].forEach(item => {
          const stockClass = item.stock === 0 ? 'stock-out' : 
                           item.stock <= (item.umbral_low || 5) ? 'stock-low' : 'stock-normal';
          const stockStatus = item.stock === 0 ? 'Sin Stock' : 
                            item.stock <= (item.umbral_low || 5) ? 'Stock Bajo' : 'Normal';
          
          tableContent += `
            <tr>
              <td style="padding-left: 20px;"><strong>${item.nombre}</strong></td>
              <td>${item.marca || '-'}</td>
              <td>${item.subTipo ? item.subTipo : '-'}</td>
              <td class="${stockClass}"><strong>${item.stock || 0} ${item.unidad || ''}</strong></td>
              <td>${item.umbral_low || 5}</td>
              <td>$${(item.precio || 0).toLocaleString()}</td>
              <td class="${stockClass}"><strong>${stockStatus}</strong></td>
            </tr>
          `;
        });
        
        // Espacio entre grupos
        tableContent += `<tr><td colspan="7" style="height: 10px; border: none;"></td></tr>`;
      });
    } else {
      // Mostrar normal sin agrupar
      itemsToInclude.forEach(item => {
        const stockClass = item.stock === 0 ? 'stock-out' : 
                         item.stock <= (item.umbral_low || 5) ? 'stock-low' : 'stock-normal';
        const stockStatus = item.stock === 0 ? 'Sin Stock' : 
                          item.stock <= (item.umbral_low || 5) ? 'Stock Bajo' : 'Normal';
        
        tableContent += `
          <tr>
            <td><strong>${item.nombre}</strong></td>
            <td>${item.marca || '-'}</td>
            <td>${item.tipo}${item.subTipo ? ` (${item.subTipo})` : ''}</td>
            <td class="${stockClass}"><strong>${item.stock || 0} ${item.unidad || ''}</strong></td>
            <td>${item.umbral_low || 5}</td>
            <td>$${(item.precio || 0).toLocaleString()}</td>
            <td class="${stockClass}"><strong>${stockStatus}</strong></td>
          </tr>
        `;
      });
    }

    // Agregar información adicional para reportes de proveedor
    let providerInfo = '';
    if (type === 'provider') {
      if (filterValue === 'sin-proveedor') {
        providerInfo = `
          <div style="background: #f8f9fa; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #dc3545;">
            <h3 style="margin: 0 0 10px 0; color: #dc3545;">📦 Productos Sin Proveedor</h3>
            <p><strong>Categoría:</strong> Productos sin proveedor asignado</p>
            <p><strong>Nota:</strong> Estos productos necesitan que se les asigne un proveedor para futuras órdenes de compra.</p>
            <p style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 4px; color: #856404;">
              ⚠️ <strong>Acción requerida:</strong> Asignar proveedores a estos productos para mejorar la gestión de inventario.
            </p>
          </div>
        `;
      } else {
        const provider = providers.find(p => p.id === filterValue);
        if (provider) {
          providerInfo = `
            <div style="background: #f8f9fa; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
              <h3 style="margin: 0 0 10px 0; color: #007bff;">📞 Información del Proveedor</h3>
              <p><strong>Empresa:</strong> ${provider.empresa || provider.nombre}</p>
              ${provider.contacto ? `<p><strong>Contacto:</strong> ${provider.contacto}</p>` : ''}
              ${provider.telefono ? `<p><strong>Teléfono:</strong> ${provider.telefono}</p>` : ''}
              ${provider.email ? `<p><strong>Email:</strong> ${provider.email}</p>` : ''}
              <p style="margin-top: 15px; padding: 10px; background: #e3f2fd; border-radius: 4px; color: #1976d2;">
                💡 <strong>Sugerencia:</strong> Este reporte puede ser usado como base para generar una orden de compra.
              </p>
            </div>
          `;
        }
      }
    }

    const htmlContent = `
      <html>
      <head>
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; background: #343a40; color: white; padding: 20px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #343a40; color: white; padding: 12px; text-align: left; }
          td { padding: 10px; border-bottom: 1px solid #dee2e6; }
          .stock-out { color: #dc3545; font-weight: bold; }
          .stock-low { color: #ffc107; font-weight: bold; }
          .stock-normal { color: #28a745; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${reportTitle}</h1>
          <p>${reportSubtitle}</p>
          <small>Generado el ${currentDate}</small>
        </div>
        
        ${providerInfo}
        
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Marca</th>
              <th>Tipo</th>
              <th>Stock</th>
              <th>Umbral</th>
              <th>Precio</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            ${tableContent}
          </tbody>
        </table>
      </body>
      </html>
    `;

    // Generar PDF con jsPDF en lugar de HTML
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    let currentY = 20;

    // Header
    doc.setFillColor(52, 58, 64);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.setFont(undefined, 'bold');
    doc.text(reportTitle, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(reportSubtitle, pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generado el: ${currentDate}`, 15, 45);
    
    currentY = 60;

    // Información adicional si es reporte de proveedor
    if (type === 'provider') {
      if (filterValue === 'sin-proveedor') {
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('📦 Productos Sin Proveedor Asignado', 15, currentY);
        currentY += 10;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.text('Estos productos necesitan que se les asigne un proveedor.', 15, currentY);
        currentY += 15;
      } else {
        const provider = providers.find(p => p.id === filterValue);
        if (provider) {
          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'bold');
          doc.text('📞 Información del Proveedor', 15, currentY);
          currentY += 10;
          
          doc.setFont(undefined, 'normal');
          doc.setFontSize(10);
          doc.text(`Empresa: ${provider.empresa || provider.nombre}`, 15, currentY);
          currentY += 8;
          
          if (provider.contacto) {
            doc.text(`Contacto: ${provider.contacto}`, 15, currentY);
            currentY += 8;
          }
          if (provider.telefono) {
            doc.text(`Teléfono: ${provider.telefono}`, 15, currentY);
            currentY += 8;
          }
          if (provider.email) {
            doc.text(`Email: ${provider.email}`, 15, currentY);
            currentY += 8;
          }
          currentY += 10;
        }
      }
    }

    // Preparar datos para la tabla principal
    let tableData;
    if (type === 'complete') {
      // Agrupar por categoría para reporte completo
      const groupedByCategory = {};
      itemsToInclude.forEach(item => {
        const category = item.tipo || 'Sin categoría';
        if (!groupedByCategory[category]) {
          groupedByCategory[category] = [];
        }
        groupedByCategory[category].push(item);
      });

      tableData = [];
      Object.keys(groupedByCategory).forEach(category => {
        // Header de categoría
        tableData.push([{
          content: `📦 ${category.toUpperCase()} (${groupedByCategory[category].length} productos)`,
          colSpan: 7,
          styles: { fillColor: [248, 249, 250], textColor: [73, 80, 87], fontStyle: 'bold' }
        }]);
        
        // Productos de la categoría
        groupedByCategory[category].forEach(item => {
          const stockStatus = item.stock === 0 ? 'Sin Stock' : 
                            item.stock <= (item.umbral_low || 5) ? 'Stock Bajo' : 'Normal';
          tableData.push([
            item.nombre || 'Sin nombre',
            item.marca || '-',
            item.subTipo || '-',
            `${item.stock || 0} ${item.unidad || ''}`,
            `${item.umbral_low || 5}`,
            `${(item.precio || 0).toLocaleString()}`,
            stockStatus
          ]);
        });
      });
    } else {
      // Tabla normal sin agrupar
      tableData = itemsToInclude.map(item => {
        const stockStatus = item.stock === 0 ? 'Sin Stock' : 
                          item.stock <= (item.umbral_low || 5) ? 'Stock Bajo' : 'Normal';
        return [
          item.nombre || 'Sin nombre',
          item.marca || '-',
          `${item.tipo}${item.subTipo ? ` (${item.subTipo})` : ''}`,
          `${item.stock || 0} ${item.unidad || ''}`,
          `${item.umbral_low || 5}`,
          `${(item.precio || 0).toLocaleString()}`,
          stockStatus
        ];
      });
    }

    // Generar tabla
    doc.autoTable({
      startY: currentY,
      head: [['Producto', 'Marca', 'Tipo', 'Stock', 'Umbral', 'Precio', 'Estado']],
      body: tableData,
      theme: 'grid',
      headStyles: { 
        fillColor: [52, 58, 64],
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 25 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 25, halign: 'center' }
      },
      didParseCell: function(data) {
        // Colorear filas según el estado del stock
        if (data.column.index === 6) { // Columna Estado
          if (data.cell.text[0] === 'Sin Stock') {
            data.cell.styles.fillColor = [220, 53, 69];
            data.cell.styles.textColor = [255, 255, 255];
          } else if (data.cell.text[0] === 'Stock Bajo') {
            data.cell.styles.fillColor = [255, 193, 7];
            data.cell.styles.textColor = [33, 37, 41];
          }
        }
      }
    });

    // Descargar el PDF
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fileName = `${reportTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.pdf`;
    
    doc.save(fileName);
  };

  // NUEVA FUNCIÓN: Reporte de proveedor con low stock agrupado por categorías
  const generateProviderLowStockReport = (providerId) => {
    console.log('DEBUG - Generando reporte de low stock para proveedor:', providerId);
    
    let providerLowStockItems;
    
    if (providerId === 'sin-proveedor') {
      // Filtrar productos sin proveedor que tengan low stock
      providerLowStockItems = inventory.filter(item => {
        const hasNoProvider = !item.proveedor_id || item.proveedor_id.trim() === '';
        const hasLowStock = item.stock <= (item.umbral_low || 5) && item.stock >= 0;
        return hasNoProvider && hasLowStock;
      });
    } else {
      // Filtrar productos del proveedor que tengan low stock
      providerLowStockItems = inventory.filter(item => {
        const isFromProvider = item.proveedor_id === providerId;
        const hasLowStock = item.stock <= (item.umbral_low || 5) && item.stock >= 0;
        return isFromProvider && hasLowStock;
      });
    }

    if (providerLowStockItems.length === 0) {
      const providerText = providerId === 'sin-proveedor' ? 'Los productos sin proveedor no tienen' : 'Este proveedor no tiene';
      alert(`${providerText} productos con stock bajo.`);
      return;
    }

    // Agrupar por categorías principales
    const groupedItems = {
      vinos: [],
      licores: [],
      otros: []
    };

    providerLowStockItems.forEach(item => {
      const tipo = (item.tipo || '').toLowerCase();
      const subTipo = (item.subTipo || '').toLowerCase();
      
      if (tipo.includes('vino') || subTipo.includes('vino')) {
        groupedItems.vinos.push(item);
      } else if (tipo.includes('licor') || tipo.includes('whisky') || tipo.includes('vodka') || 
                 tipo.includes('gin') || tipo.includes('ron') || tipo.includes('tequila') ||
                 subTipo.includes('whisky') || subTipo.includes('vodka') || subTipo.includes('gin') ||
                 subTipo.includes('bourbon') || subTipo.includes('cognac')) {
        groupedItems.licores.push(item);
      } else {
        groupedItems.otros.push(item);
      }
    });

    // Obtener información del proveedor
    let providerName;
    let providerContactInfo = '';
    
    if (providerId === 'sin-proveedor') {
      providerName = 'Productos Sin Proveedor Asignado';
      providerContactInfo = `
        <div class="provider-info">
          <h3>📦 Información</h3>
          <p><strong>Categoría:</strong> Productos sin proveedor asignado</p>
          <p><strong>Nota:</strong> Estos productos necesitan que se les asigne un proveedor para futuras órdenes de compra.</p>
        </div>
      `;
    } else {
      const providerInfo = providers.find(p => p.id === providerId);
      providerName = providerInfo?.empresa || providerInfo?.nombre || 'Proveedor';
      providerContactInfo = `
        <div class="provider-info">
          <h3>📞 Información del Proveedor</h3>
          <p><strong>Empresa:</strong> ${providerName}</p>
          ${providerInfo?.contacto ? `<p><strong>Contacto:</strong> ${providerInfo.contacto}</p>` : ''}
          ${providerInfo?.telefono ? `<p><strong>Teléfono:</strong> ${providerInfo.telefono}</p>` : ''}
          ${providerInfo?.email ? `<p><strong>Email:</strong> ${providerInfo.email}</p>` : ''}
        </div>
      `;
    }

    // Crear el HTML para el reporte
    const currentDate = new Date().toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    let htmlContent = `
      <html>
      <head>
        <title>Reporte Low Stock - ${providerName}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            background: white;
          }
          .header { 
            text-align: center; 
            background: #dc3545; 
            color: white; 
            padding: 20px; 
            margin-bottom: 30px;
            border-radius: 8px;
          }
          .provider-info { 
            background: #f8f9fa; 
            padding: 15px; 
            margin-bottom: 25px; 
            border-radius: 8px; 
            border-left: 4px solid #007bff;
          }
          .category-section { 
            margin-bottom: 30px; 
            page-break-inside: avoid;
          }
          .category-header { 
            color: white; 
            padding: 12px; 
            font-size: 18px; 
            font-weight: bold; 
            border-radius: 6px;
            margin-bottom: 15px;
          }
          .vinos-header { background: #6f42c1; }
          .licores-header { background: #fd7e14; }
          .otros-header { background: #6c757d; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th { 
            background: #343a40; 
            color: white; 
            padding: 12px; 
            text-align: left; 
            font-weight: bold;
          }
          td { 
            padding: 10px; 
            border-bottom: 1px solid #dee2e6;
          }
          tr:hover { background: #f8f9fa; }
          .stock-critical { color: #dc3545; font-weight: bold; }
          .stock-low { color: #ffc107; font-weight: bold; }
          .summary { 
            background: #e9ecef; 
            padding: 15px; 
            border-radius: 6px; 
            margin-top: 20px;
          }
          .no-products { 
            text-align: center; 
            color: #6c757d; 
            font-style: italic; 
            padding: 20px;
          }
          @media print {
            body { margin: 0; }
            .category-section { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚨 REPORTE DE STOCK BAJO POR PROVEEDOR</h1>
          <h2>${providerName}</h2>
          <p>Productos agrupados por categorías - Generado el ${currentDate}</p>
        </div>

        <div class="provider-info">
          <h3>📞 Información del Proveedor</h3>
          <p><strong>Empresa:</strong> ${providerName}</p>
          ${providerInfo?.contacto ? `<p><strong>Contacto:</strong> ${providerInfo.contacto}</p>` : ''}
          ${providerInfo?.telefono ? `<p><strong>Teléfono:</strong> ${providerInfo.telefono}</p>` : ''}
          ${providerInfo?.email ? `<p><strong>Email:</strong> ${providerInfo.email}</p>` : ''}
        </div>
    `;

    // Función helper para crear tabla de productos
    const createProductTable = (items, categoryName) => {
      if (items.length === 0) {
        return `<div class="no-products">No hay ${categoryName.toLowerCase()} con stock bajo</div>`;
      }

      let tableHtml = `
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Marca</th>
              <th>Tipo</th>
              <th>Stock Actual</th>
              <th>Umbral</th>
              <th>Estado</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody>
      `;

      items.forEach(item => {
        const stockClass = item.stock === 0 ? 'stock-critical' : 'stock-low';
        const stockStatus = item.stock === 0 ? 'SIN STOCK' : 'STOCK BAJO';
        
        tableHtml += `
          <tr>
            <td><strong>${item.nombre}</strong></td>
            <td>${item.marca || '-'}</td>
            <td>${item.subTipo || item.tipo || '-'}</td>
            <td class="${stockClass}">${item.stock || 0} ${item.unidad || ''}</td>
            <td>${item.umbral_low || 5}</td>
            <td class="${stockClass}"><strong>${stockStatus}</strong></td>
            <td>$${(item.precio || 0).toLocaleString()}</td>
          </tr>
        `;
      });

      tableHtml += `</tbody></table>`;
      return tableHtml;
    };

    // Agregar secciones por categoría
    if (groupedItems.vinos.length > 0) {
      htmlContent += `
        <div class="category-section">
          <div class="category-header vinos-header">🍷 VINOS (${groupedItems.vinos.length} productos)</div>
          ${createProductTable(groupedItems.vinos, 'vinos')}
        </div>
      `;
    }

    if (groupedItems.licores.length > 0) {
      htmlContent += `
        <div class="category-section">
          <div class="category-header licores-header">🥃 LICORES (${groupedItems.licores.length} productos)</div>
          ${createProductTable(groupedItems.licores, 'licores')}
        </div>
      `;
    }

    if (groupedItems.otros.length > 0) {
      htmlContent += `
        <div class="category-section">
          <div class="category-header otros-header">🍺 OTROS PRODUCTOS (${groupedItems.otros.length} productos)</div>
          ${createProductTable(groupedItems.otros, 'otros productos')}
        </div>
      `;
    }

    // Resumen final
    const totalProducts = providerLowStockItems.length;
    const totalValue = providerLowStockItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.stock || 0)), 0);
    const sinStock = providerLowStockItems.filter(item => item.stock === 0).length;

    htmlContent += `
      <div class="summary">
        <h3>📊 Resumen del Reporte</h3>
        <p><strong>Total de productos con stock bajo:</strong> ${totalProducts}</p>
        <p><strong>Productos sin stock:</strong> ${sinStock}</p>
        <p><strong>Productos con stock bajo:</strong> ${totalProducts - sinStock}</p>
        <p><strong>Valor total del inventario actual:</strong> $${totalValue.toLocaleString()}</p>
        <hr>
        <p><strong>Distribución por categorías:</strong></p>
        <ul>
          ${groupedItems.vinos.length > 0 ? `<li>Vinos: ${groupedItems.vinos.length} productos</li>` : ''}
          ${groupedItems.licores.length > 0 ? `<li>Licores: ${groupedItems.licores.length} productos</li>` : ''}
          ${groupedItems.otros.length > 0 ? `<li>Otros: ${groupedItems.otros.length} productos</li>` : ''}
        </ul>
      </div>
      </body>
      </html>
    `;

    // Abrir ventana de impresión
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Filtrar y ordenar inventario
  const filteredInventory = inventory
    .filter(item => {
      const matchesSearch = item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.marca?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const itemType = (item.tipo || '').toLowerCase();
      const itemSubType = (item.subTipo || '').toLowerCase();
      const matchesCategory = categoryFilter === 'all' || 
                             itemType === categoryFilter ||
                             itemSubType === categoryFilter;
                             
      const matchesStock = stockFilter === 'all' ||
                          (stockFilter === 'low' && item.stock <= (item.umbral_low || 5) && item.stock > 0) ||
                          (stockFilter === 'normal' && item.stock > (item.umbral_low || 5)) ||
                          (stockFilter === 'out' && item.stock === 0) ||
                          (stockFilter === 'important' && item.importante === true);
      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Calcular métricas
  const metrics = {
    totalProducts: inventory.length,
    totalValue: inventory.reduce((sum, item) => sum + ((item.precio_venta || 0) * (item.stock || 0)), 0),
    lowStock: inventory.filter(item => item.stock <= (item.umbral_low || 5)).length,
    outOfStock: inventory.filter(item => item.stock === 0).length,
    averageStock: inventory.length ? inventory.reduce((sum, item) => sum + (item.stock || 0), 0) / inventory.length : 0,
    topCategories: categories.slice(1).map(cat => ({
      ...cat,
      count: inventory.filter(item => (item.tipo?.toLowerCase() === cat.value) || (item.subTipo?.toLowerCase() === cat.value)).length,
      value: inventory
        .filter(item => (item.tipo?.toLowerCase() === cat.value) || (item.subTipo?.toLowerCase() === cat.value))
        .reduce((sum, item) => sum + ((item.precio_venta || 0) * (item.stock || 0)), 0)
    })).sort((a, b) => b.count - a.count).slice(0, 5)
  };

  // Funciones de manejo
  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`¿Estás seguro de eliminar "${item.nombre}"?`)) return;

    try {
      await deleteDoc(doc(db, 'inventario', item.id));
      
      await addDoc(collection(db, 'historial'), {
        item_nombre: item.nombre,
        usuario: user.email,
        tipo: 'eliminacion',
        fecha: serverTimestamp(),
        detalles: `Producto eliminado del inventario del bar`,
        tipo_inventario: 'bar'
      });

      setSuccess(`"${item.nombre}" eliminado correctamente`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error eliminando producto:', error);
      setError('Error al eliminar el producto');
      setTimeout(() => setError(''), 3000);
    }
  };

  // FUNCIÓN CORREGIDA - Cambiar parseInt por parseFloat
  const handleQuickStockUpdate = async (item, newStock) => {
    try {
      await updateDoc(doc(db, 'inventario', item.id), {
        stock: newStock,
        updated_at: serverTimestamp()
      });
      setSuccess(`Stock de ${item.nombre} actualizado a ${newStock}`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Error:', error);
      setError('Error actualizando stock');
      setTimeout(() => setError(''), 3000);
    }
  };

  // NUEVA FUNCIÓN - Toggle producto importante
  const handleToggleImportante = async (item) => {
    try {
      await updateDoc(doc(db, 'inventario', item.id), {
        importante: !item.importante,
        updated_at: serverTimestamp()
      });
      
      await addDoc(collection(db, 'historial'), {
        item_nombre: item.nombre,
        usuario: user.email,
        tipo: 'marca_importante',
        fecha: serverTimestamp(),
        detalles: `Producto ${!item.importante ? 'marcado como' : 'removido de'} importante`,
        tipo_inventario: 'bar'
      });

      setSuccess(`${item.nombre} ${!item.importante ? 'marcado como' : 'removido de'} importante`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Error:', error);
      setError('Error actualizando producto importante');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleItemSuccess = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setSuccess(editingItem ? 'Producto actualizado correctamente' : 'Producto agregado correctamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getStockBadge = (item) => {
    if (item.stock === 0) {
      return <Badge bg="danger">Sin Stock</Badge>;
    } else if (item.stock <= (item.umbral_low || 5)) {
      return <Badge bg="warning">Stock Bajo</Badge>;
    } else {
      return <Badge bg="success">Normal</Badge>;
    }
  };

  const getCategoryIcon = (item) => {
    const mainType = (item.tipo || '').toLowerCase();
    const subType = (item.subTipo || '').toLowerCase();
    
    const typeToCheck = categories.find(cat => cat.value === subType) ? subType : mainType;
    
    const category = categories.find(cat => cat.value === typeToCheck);
    const IconComponent = category?.icon || FaWineGlass;
    return <IconComponent style={{ color: category?.color }} />;
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status" variant="primary" />
          <p className="mt-2">Cargando inventario del bar...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-3">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-secondary" 
                onClick={onBack}
                className="me-3"
              >
                <FaArrowLeft /> Volver
              </Button>
              <div>
                <h2 className="mb-0">
                  <FaWineGlass className="me-2 text-primary" />
                  Inventario del Bar
                </h2>
                <small className="text-muted">
                  Gestiona las bebidas y productos del bar
                </small>
              </div>
            </div>
            <div className="d-flex gap-2">
              <Dropdown>
                <Dropdown.Toggle variant="outline-danger" disabled={inventory.length === 0}>
                  📄 Reportes PDF
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Header>Reportes Generales</Dropdown.Header>
                  <Dropdown.Item onClick={() => generatePDF('complete')}>
                    📊 Reporte Completo (Agrupado)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => generatePDF('critical-stock')}>
                    🚨 Stock Crítico (Sin Stock + Stock Bajo)
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Header>Reportes Especiales</Dropdown.Header>
                  <Dropdown.Item onClick={() => generatePDF('important-products')}>
                    ⭐ Productos Importantes (Solo con estrella)
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => generatePDF('order-sheet')}>
                    📋 Lista de Compras (Organizada por proveedor)
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Header>Por Categorías</Dropdown.Header>
                  {categories.slice(1).map(cat => {
                    const count = inventory.filter(item => 
                      (item.tipo?.toLowerCase() === cat.value) || 
                      (item.subTipo?.toLowerCase() === cat.value)
                    ).length;
                    return count > 0 ? (
                      <Dropdown.Item key={cat.value} onClick={() => generatePDF('category', cat.value)}>
                        <cat.icon className="me-2" style={{ color: cat.color }} />
                        {cat.label} ({count})
                      </Dropdown.Item>
                    ) : null;
                  })}
                  <Dropdown.Divider />
                  <Dropdown.Header>Por Proveedores</Dropdown.Header>
                  {/* Opción para productos sin proveedor */}
                  {(() => {
                    const sinProveedorCount = inventory.filter(item => !item.proveedor_id || item.proveedor_id.trim() === '').length;
                    const sinProveedorLowStockCount = inventory.filter(item => 
                      (!item.proveedor_id || item.proveedor_id.trim() === '') && 
                      item.stock <= (item.umbral_low || 5) && 
                      item.stock >= 0
                    ).length;
                    
                    return sinProveedorCount > 0 ? (
                      <React.Fragment>
                        <Dropdown.Item onClick={() => generatePDF('provider', 'sin-proveedor')}>
                          📦 Sin Proveedor - Todos ({sinProveedorCount})
                        </Dropdown.Item>
                        {sinProveedorLowStockCount > 0 && (
                          <Dropdown.Item 
                            onClick={() => generateProviderLowStockReport('sin-proveedor')}
                            style={{ paddingLeft: '25px', fontSize: '0.9em', color: '#dc3545' }}
                          >
                            🚨 Sin Proveedor - Solo Low Stock ({sinProveedorLowStockCount})
                          </Dropdown.Item>
                        )}
                        <Dropdown.Divider />
                      </React.Fragment>
                    ) : null;
                  })()}
                  {providers.slice(0, 10).map(provider => {
                    const totalCount = inventory.filter(item => item.proveedor_id === provider.id).length;
                    const lowStockCount = inventory.filter(item => 
                      item.proveedor_id === provider.id && 
                      item.stock <= (item.umbral_low || 5) && 
                      item.stock >= 0
                    ).length;
                    
                    const providerName = provider.empresa || provider.nombre;
                    
                    return totalCount > 0 ? (
                      <React.Fragment key={provider.id}>
                        <Dropdown.Item onClick={() => generatePDF('provider', provider.id)}>
                          📦 {providerName} - Todos ({totalCount})
                        </Dropdown.Item>
                        {lowStockCount > 0 && (
                          <Dropdown.Item 
                            onClick={() => generateProviderLowStockReport(provider.id)}
                            style={{ paddingLeft: '25px', fontSize: '0.9em', color: '#dc3545' }}
                          >
                            🚨 {providerName} - Solo Low Stock ({lowStockCount})
                          </Dropdown.Item>
                        )}
                      </React.Fragment>
                    ) : null;
                  })}
                </Dropdown.Menu>
              </Dropdown>
              
              <Button 
                variant="outline-primary" 
                onClick={() => setShowAnalytics(!showAnalytics)}
              >
                <FaChartBar /> Analytics
              </Button>
              
              {(userRole === 'admin' || userRole === 'manager') && (
                <Button variant="primary" onClick={handleAddItem}>
                  <FaPlus /> Agregar Producto
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert variant="success" className="mb-3">
          {success}
        </Alert>
      )}

      {/* Métricas */}
      {showAnalytics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h4 className="text-primary">{metrics.totalProducts}</h4>
                <small className="text-muted">Total Productos</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h4 className="text-success">${metrics.totalValue.toLocaleString()}</h4>
                <small className="text-muted">Valor Total</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h4 className="text-warning">{metrics.lowStock}</h4>
                <small className="text-muted">Stock Bajo</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center">
              <Card.Body>
                <h4 className="text-danger">{metrics.outOfStock}</h4>
                <small className="text-muted">Sin Stock</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Controles de filtro y búsqueda */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Buscar por nombre o marca..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={2}>
              <Form.Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value)}
              >
                <option value="all">Todos los stocks</option>
                <option value="normal">Stock normal</option>
                <option value="low">Stock bajo</option>
                <option value="out">Sin stock</option>
                <option value="important">Productos importantes</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="nombre">Nombre</option>
                <option value="marca">Marca</option>
                <option value="tipo">Tipo</option>
                <option value="stock">Stock</option>
                <option value="precio">Precio</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <div className="d-flex gap-1">
                <Button
                  variant={viewMode === 'cards' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('cards')}
                >
                  <FaTh />
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'outline-primary'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  <FaList />
                </Button>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <FaSortUp /> : <FaSortDown />}
                </Button>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Lista de productos */}
      {viewMode === 'cards' ? (
        <Row>
          {filteredInventory.map(item => (
            <Col key={item.id} md={6} lg={4} xl={3} className="mb-3">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <Card.Title className="h6">
                      {item.nombre}
                      {item.importante && (
                        <Badge bg="warning" className="ms-2">⭐</Badge>
                      )}
                    </Card.Title>
                    {getCategoryIcon(item)}
                  </div>
                  
                  <Card.Text className="text-muted small">
                    <strong>Marca:</strong> {item.marca || 'N/A'}<br />
                    <strong>Tipo:</strong> {item.tipo}{item.subTipo && ` (${item.subTipo})`}<br />
                    <strong>Precio:</strong> ${(item.precio || 0).toLocaleString()}
                  </Card.Text>

                  <div className="mb-2">
                    <small className="text-muted">Stock actual</small>
                    <ProgressBar 
                      now={Math.min(100, (item.stock / (item.umbral_low * 2 || 10)) * 100)}
                      variant={item.stock === 0 ? 'danger' : 
                              item.stock <= (item.umbral_low || 5) ? 'warning' : 'success'}
                      label={`${item.stock || 0}${item.unidad ? ` ${item.unidad}` : ''}`}
                    />
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <small>Umbral: {item.umbral_low || 5}</small>
                    {getStockBadge(item)}
                  </div>

                  {/* CUADRADITO EDITABLE DE STOCK EN CARDS */}
                  <div className="mb-2">
                    <small className="text-muted d-block mb-1">Stock actual:</small>
                    <InputGroup size="sm" style={{ maxWidth: '120px' }}>
                      <Form.Control
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={item.stock || 0}
                        style={{ fontSize: '0.875rem', fontWeight: 'bold' }}
                        onBlur={(e) => {
                          const newStock = parseFloat(e.target.value) || 0;
                          if (newStock !== (item.stock || 0)) {
                            handleQuickStockUpdate(item, newStock);
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            const newStock = parseFloat(e.target.value) || 0;
                            if (newStock !== (item.stock || 0)) {
                              handleQuickStockUpdate(item, newStock);
                            }
                            e.target.blur();
                          }
                        }}
                      />
                      <InputGroup.Text style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                        {item.unidad || 'u'}
                      </InputGroup.Text>
                    </InputGroup>
                  </div>

                  <div className="d-flex gap-1">
                    <OverlayTrigger
                      placement="top"
                      overlay={<Tooltip>{item.importante ? 'Producto importante' : 'Marcar como importante'}</Tooltip>}
                    >
                      <Button
                        variant={item.importante ? "warning" : "outline-warning"}
                        size="sm"
                        onClick={() => handleToggleImportante(item)}
                      >
                        ⭐
                      </Button>
                    </OverlayTrigger>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEditItem(item)}
                    >
                      <FaEdit />
                    </Button>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteItem(item)}
                      >
                        <FaTrash />
                      </Button>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card>
          <Card.Body className="p-0">
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca</th>
                  <th>Tipo</th>
                  <th>Stock</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => (
                  <tr key={item.id}>
                    <td>
                      {getCategoryIcon(item)}
                      <span className="ms-2">{item.nombre}</span>
                      {item.importante && (
                        <Badge bg="warning" size="sm" className="ms-2">⭐</Badge>
                      )}
                    </td>
                    <td>{item.marca || '-'}</td>
                    <td>{item.tipo}{item.subTipo && ` (${item.subTipo})`}</td>
                    <td>
                      <InputGroup size="sm" style={{ maxWidth: '120px' }}>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={item.stock || 0}
                          style={{ fontSize: '0.875rem' }}
                          onBlur={(e) => {
                            const newStock = parseFloat(e.target.value) || 0;
                            if (newStock !== (item.stock || 0)) {
                              handleQuickStockUpdate(item, newStock);
                            }
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              const newStock = parseFloat(e.target.value) || 0;
                              if (newStock !== (item.stock || 0)) {
                                handleQuickStockUpdate(item, newStock);
                              }
                              e.target.blur();
                            }
                          }}
                        />
                        <InputGroup.Text style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>
                          {item.unidad || 'u'}
                        </InputGroup.Text>
                      </InputGroup>
                    </td>
                    <td>${(item.precio || 0).toLocaleString()}</td>
                    <td>{getStockBadge(item)}</td>
                    <td>
                      <div className="d-flex gap-1">
                        <OverlayTrigger
                          placement="top"
                          overlay={<Tooltip>{item.importante ? 'Producto importante' : 'Marcar como importante'}</Tooltip>}
                        >
                          <Button
                            variant={item.importante ? "warning" : "outline-warning"}
                            size="sm"
                            onClick={() => handleToggleImportante(item)}
                          >
                            ⭐
                          </Button>
                        </OverlayTrigger>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEditItem(item)}
                        >
                          <FaEdit />
                        </Button>
                        {(userRole === 'admin' || userRole === 'manager') && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteItem(item)}
                          >
                            <FaTrash />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Modal para agregar/editar items */}
      <InventoryItemForm
        show={showItemModal}
        onHide={() => setShowItemModal(false)}
        item={editingItem}
        onSuccess={handleItemSuccess}
        user={user}
        userRole={userRole}
        providers={providers}
      />
    </Container>
  );
};

export default BarInventory;