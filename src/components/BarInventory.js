// src/components/BarInventory.js - VERSIÓN COMPLETA CON CORRECCIONES
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
import { exportCriticalStockToPDF } from '../utils/pdfExport';

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

    // Cargar proveedores
    const providersQuery = query(
      collection(db, 'proveedores'),
      orderBy('nombre', 'asc')
    );

    const unsubscribeProviders = onSnapshot(
      providersQuery,
      (snapshot) => {
        const providersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const filteredProviders = providersData.filter(provider => 
          provider.nombre && provider.nombre.trim() !== ''
        ).sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
          
        setProviders(filteredProviders);
      },
      (error) => {
        console.error('Error cargando proveedores:', error);
      }
    );

    // Auto-cargar después de un pequeño delay
    const timer = setTimeout(() => {
      console.log('🔍 Iniciando carga automática tras delay');
      // Ya se está cargando automáticamente con onSnapshot
    }, 100);

    return () => {
      unsubscribeInventory();
      unsubscribeProviders();
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
        itemsToInclude = inventory.filter(item => item.proveedor_id === filterValue);
        const providerInfo = providers.find(p => p.id === filterValue);
        reportTitle = `Reporte por Proveedor: ${providerInfo?.nombre || 'Proveedor'}`;
        reportSubtitle = `${itemsToInclude.length} productos - Orden de compra sugerida`;
        break;
    }

    if (itemsToInclude.length === 0) {
      alert('No hay productos para incluir en este reporte.');
      return;
    }

    // Función para agrupar productos
    const groupItems = (items, groupBy) => {
      const grouped = {};
      items.forEach(item => {
        let groupKey;
        if (groupBy === 'category') {
          groupKey = item.tipo || 'Sin Categoría';
        } else if (groupBy === 'provider') {
          const provider = providers.find(p => p.id === item.proveedor_id);
          groupKey = provider?.nombre || 'Sin Proveedor';
        }
        
        if (!grouped[groupKey]) {
          grouped[groupKey] = [];
        }
        grouped[groupKey].push(item);
      });
      
      // Ordenar cada grupo alfabéticamente
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      });
      
      return grouped;
    };

    // Determinar si agrupar y cómo
    let groupedItems = null;
    let shouldGroup = false;
    
    if (type === 'complete' || type === 'low-stock' || type === 'out-of-stock') {
      groupedItems = groupItems(itemsToInclude, 'category');
      shouldGroup = true;
    }

    const printWindow = window.open('', '_blank');
    const currentDate = new Date().toLocaleDateString('es-ES');
    const currentTime = new Date().toLocaleTimeString('es-ES');

    const totalValue = itemsToInclude.reduce((sum, item) => sum + ((item.precio || 0) * (item.stock || 0)), 0);
    const lowStockCount = itemsToInclude.filter(item => item.stock <= (item.umbral_low || 5) && item.stock > 0).length;
    const outOfStockCount = itemsToInclude.filter(item => item.stock === 0).length;

    // Generar contenido de la tabla
    let tableContent = '';
    
    if (shouldGroup && groupedItems) {
      // Mostrar agrupado por categorías
      const sortedGroups = Object.keys(groupedItems).sort();
      
      sortedGroups.forEach(groupName => {
        const groupItems = groupedItems[groupName];
        const groupTotal = groupItems.reduce((sum, item) => sum + ((item.precio || 0) * (item.stock || 0)), 0);
        
        // Header del grupo
        tableContent += `
          <tr style="background-color: #007bff; color: white;">
            <td colspan="7" style="font-weight: bold; font-size: 14px; padding: 12px 8px;">
              🍷 ${groupName.toUpperCase()} (${groupItems.length} productos - $${groupTotal.toLocaleString()})
            </td>
          </tr>
        `;
        
        // Productos del grupo
        groupItems.forEach(item => {
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
      const provider = providers.find(p => p.id === filterValue);
      if (provider) {
        providerInfo = `
          <div style="background: #f8f9fa; padding: 20px; margin-bottom: 20px; border-radius: 8px; border-left: 4px solid #007bff;">
            <h3 style="margin: 0 0 10px 0; color: #007bff;">📞 Información del Proveedor</h3>
            <p><strong>Empresa:</strong> ${provider.nombre}</p>
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.4;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #007bff;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            margin: 0;
            color: #007bff;
            font-size: 28px;
          }
          .header h2 {
            margin: 10px 0 0 0;
            color: #6c757d;
            font-weight: normal;
            font-size: 16px;
          }
          .summary {
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            text-align: center;
          }
          .summary-item h4 {
            margin: 0 0 5px 0;
            font-size: 24px;
          }
          .summary-item p {
            margin: 0;
            opacity: 0.9;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          th {
            background: #007bff;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
          }
          td {
            padding: 10px 8px;
            border-bottom: 1px solid #dee2e6;
          }
          tr:nth-child(even) {
            background-color: #f8f9fa;
          }
          tr:hover {
            background-color: #e3f2fd;
          }
          .stock-out {
            background-color: #ffebee;
            color: #c62828;
            font-weight: bold;
          }
          .stock-low {
            background-color: #fff3e0;
            color: #ef6c00;
            font-weight: bold;
          }
          .stock-normal {
            color: #2e7d32;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6c757d;
            border-top: 1px solid #dee2e6;
            padding-top: 20px;
          }
          @media print {
            body { margin: 10px; }
            .summary { break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍷 ${reportTitle}</h1>
          <h2>${reportSubtitle}</h2>
          <p style="margin: 10px 0 0 0; color: #6c757d;">
            Generado el ${currentDate} a las ${currentTime} | Usuario: ${user.email}
          </p>
        </div>

        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <h4>${itemsToInclude.length}</h4>
              <p>Total Productos</p>
            </div>
            <div class="summary-item">
              <h4>${totalValue.toLocaleString()}</h4>
              <p>Valor Total Stock</p>
            </div>
            <div class="summary-item">
              <h4>${lowStockCount}</h4>
              <p>Stock Bajo</p>
            </div>
            <div class="summary-item">
              <h4>${outOfStockCount}</h4>
              <p>Sin Stock</p>
            </div>
            <div class="summary-item">
              <h4>⭐ ${importantCount}</h4>
              <p>Productos Importantes</p>
            </div>
          </div>
        </div>

        ${providerInfo}

        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Marca</th>
              <th>Categoría</th>
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

        <div class="footer">
          <p><strong>Baires Inventory - Sistema de Gestión</strong></p>
          <p>Reporte generado automáticamente • Para uso interno únicamente</p>
        </div>
      </body>
      </html>
    `;

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
                  {providers.slice(0, 10).map(provider => {
                    const count = inventory.filter(item => item.proveedor_id === provider.id).length;
                    return count > 0 ? (
                      <Dropdown.Item key={provider.id} onClick={() => generatePDF('provider', provider.id)}>
                        📦 {provider.nombre} ({count})
                      </Dropdown.Item>
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
                      size="sm"
                      className="mt-2"
                    />
                  </div>

                  <div className="d-flex justify-content-between">
                    <InputGroup size="sm" style={{ maxWidth: '100px' }}>
                      <Form.Control
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={item.stock || 0}
                        onBlur={(e) => {
                          const newStock = parseFloat(e.target.value) || 0;
                          if (newStock !== item.stock) {
                            handleQuickStockUpdate(item, newStock);
                          }
                        }}
                      />
                    </InputGroup>
                    
                    <div className="d-flex gap-1">
                      <OverlayTrigger
                        placement="top"
                        overlay={<Tooltip>{item.importante ? 'Producto importante' : 'Marcar como importante'}</Tooltip>}
                      >
                        <Button
                          variant={item.importante ? "warning" : "outline-warning"}
                          size="sm"
                          onClick={() => handleToggleImportante(item)}
                          className="me-1"
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
                  </div>

                  <div className="mt-2">
                    {getStockBadge(item)}
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
                    <td>{item.marca}</td>
                    <td>{item.tipo}{item.subTipo && ` (${item.subTipo})`}</td>
                    <td>
                      <InputGroup size="sm" style={{ maxWidth: '100px' }}>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={item.stock || 0}
                          onBlur={(e) => {
                            const newStock = parseFloat(e.target.value) || 0;
                            if (newStock !== item.stock) {
                              handleQuickStockUpdate(item, newStock);
                            }
                          }}
                        />
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
        inventoryType="bar"
      />
    </Container>
  );
};

export default BarInventory;