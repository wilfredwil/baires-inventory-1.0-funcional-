// src/components/BarInventory.js - VERSIÓN COMPLETA CON DROPDOWN PDF
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
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showMetrics, setShowMetrics] = useState(true);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortOrder, setSortOrder] = useState('asc');

  // Categorías estáticas - incluye variaciones comunes
  const categories = [
    { value: 'all', label: 'Todas las bebidas', icon: FaWineGlass, color: '#6c757d' },
    { value: 'whiskey', label: 'Whiskey', icon: FaGlassWhiskey, color: '#8B4513' },
    { value: 'whisky', label: 'Whisky', icon: FaGlassWhiskey, color: '#8B4513' },
    { value: 'vodka', label: 'Vodka', icon: FaWineBottle, color: '#E6E6FA' },
    { value: 'ron', label: 'Ron', icon: FaWineBottle, color: '#CD853F' },
    { value: 'gin', label: 'Gin', icon: FaWineBottle, color: '#98FB98' },
    { value: 'tequila', label: 'Tequila', icon: FaWineBottle, color: '#DAA520' },
    { value: 'cerveza', label: 'Cerveza', icon: FaBeer, color: '#FFD700' },
    { value: 'vino', label: 'Vino', icon: FaWineGlass, color: '#800080' },
    { value: 'licor', label: 'Licores', icon: FaCocktail, color: '#FF69B4' },
    { value: 'mixers', label: 'Mixers', icon: FaCocktail, color: '#20B2AA' },
    { value: 'champagne', label: 'Champagne', icon: FaWineGlass, color: '#FFD700' },
    { value: 'aperitivo', label: 'Aperitivo', icon: FaCocktail, color: '#FFA500' },
  ];
  

  // Función para generar PDFs usando window.print con agrupación
const generatePDF = (type, filterValue = null) => {
  let itemsToInclude = [];
  let reportTitle = '';
  let reportSubtitle = '';

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

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
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
              color: #007bff;
              margin: 0;
              font-size: 24px;
            }
            .header p {
              color: #666;
              margin: 5px 0 0 0;
              font-size: 14px;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .summary-card {
              background: #f8f9fa;
              padding: 15px;
              border-radius: 8px;
              text-align: center;
              border-left: 4px solid #007bff;
            }
            .summary-card h3 {
              margin: 0;
              color: #007bff;
              font-size: 18px;
            }
            .summary-card p {
              margin: 5px 0 0 0;
              color: #666;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 6px;
              text-align: left;
            }
            th {
              background-color: #007bff;
              color: white;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .stock-low { 
              color: #fd7e14; 
              font-weight: bold; 
            }
            .stock-out { 
              color: #dc3545; 
              font-weight: bold; 
            }
            .stock-normal { 
              color: #28a745; 
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 15px;
            }
            @media print {
              body { margin: 10px; }
              .summary { grid-template-columns: repeat(2, 1fr); }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🍷 ${reportTitle}</h1>
            <p>${reportSubtitle}</p>
            <p>Generado el ${currentDate} a las ${currentTime}</p>
          </div>

          ${providerInfo}

          <div class="summary">
            <div class="summary-card">
              <h3>${itemsToInclude.length}</h3>
              <p>Total Productos</p>
            </div>
            <div class="summary-card">
              <h3>$${totalValue.toLocaleString()}</h3>
              <p>Valor Total</p>
            </div>
            <div class="summary-card">
              <h3>${lowStockCount}</h3>
              <p>Stock Bajo</p>
            </div>
            <div class="summary-card">
              <h3>${outOfStockCount}</h3>
              <p>Sin Stock</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 25%;">Producto</th>
                <th style="width: 15%;">Marca</th>
                <th style="width: 15%;">Subtipo</th>
                <th style="width: 10%;">Stock</th>
                <th style="width: 10%;">Umbral</th>
                <th style="width: 10%;">Precio</th>
                <th style="width: 15%;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${tableContent}
            </tbody>
          </table>

          <div class="footer">
            <p><strong>Sistema de Inventario del Bar</strong></p>
            <p>Usuario: ${user?.email} | Fecha: ${currentDate} ${currentTime}</p>
            ${type === 'provider' ? '<p style="margin-top: 10px;"><strong>📋 Reporte de Orden de Compra</strong></p>' : ''}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Mostrar mensaje de éxito
    setSuccess(`Reporte "${reportTitle}" listo para imprimir`);
    setTimeout(() => setSuccess(''), 3000);
  };

  // Cargar datos del inventario - SIN INDICES COMPUESTOS
  useEffect(() => {
    console.log('🔍 useEffect ejecutado - User:', user?.email);
    
    if (!user?.email) {
      console.log('⚠️ Usuario no está listo aún, esperando...');
      return;
    }

    const loadData = async () => {
      console.log('🔄 Cargando inventario del bar automáticamente...');
      setLoading(true);
      setError('');
      
      try {
        const snapshot = await getDocs(collection(db, 'inventario'));
        console.log('📦 Documentos encontrados:', snapshot.size);
        
        const barTypes = ['licor', 'whisky', 'whiskey', 'vodka', 'ron', 'gin', 'tequila', 'cerveza', 'vino', 'champagne', 'mixers', 'aperitivo'];
        
        const allItems = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const barItems = allItems.filter(item => {
          const itemType = (item.tipo || '').toLowerCase();
          const itemSubType = (item.subTipo || '').toLowerCase();
          return barTypes.includes(itemType) || barTypes.includes(itemSubType);
        });
        
        console.log('🍺 Productos del bar encontrados:', barItems.length);
        
        const sortedItems = barItems.sort((a, b) => {
          const aName = (a.nombre || '').toLowerCase();
          const bName = (b.nombre || '').toLowerCase();
          return aName.localeCompare(bName);
        });
        
        setInventory(sortedItems);
        setLoading(false);
        
        if (sortedItems.length > 0) {
          setSuccess(`✅ Cargados ${sortedItems.length} productos del bar automáticamente`);
          setTimeout(() => setSuccess(''), 3000);
        }
        
      } catch (error) {
        console.error('❌ Error cargando inventario:', error);
        setError('Error cargando inventario: ' + error.message);
        setLoading(false);
        setInventory([]);
      }
    };

    const timer = setTimeout(() => {
      console.log('🔍 Iniciando carga automática tras delay');
      loadData();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [user?.email]);

  // Cargar proveedores
  useEffect(() => {
    if (!user) return;

    const unsubscribeProviders = onSnapshot(
      collection(db, 'providers'),
      (snapshot) => {
        const providerData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        const filteredProviders = providerData
          .filter(p => p.tipo === 'bar' || p.tipo === 'ambos')
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
          
        setProviders(filteredProviders);
      },
      (error) => {
        console.error('Error cargando proveedores:', error);
      }
    );

    return () => {
      unsubscribeProviders();
    };
  }, [user]);

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
                          (stockFilter === 'out' && item.stock === 0);
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
                  <Dropdown.Header>Por Categorías</Dropdown.Header>
                  {categories.slice(1).map(cat => {
                    const count = inventory.filter(item => 
                      (item.tipo?.toLowerCase() === cat.value) || 
                      (item.subTipo?.toLowerCase() === cat.value)
                    ).length;
                    if (count === 0) return null;
                    return (
                      <Dropdown.Item 
                        key={cat.value} 
                        onClick={() => generatePDF('category', cat.value)}
                      >
                        <cat.icon style={{ color: cat.color }} className="me-2" />
                        {cat.label} ({count})
                      </Dropdown.Item>
                    );
                  })}
                  <Dropdown.Divider />
                  <Dropdown.Header>Por Proveedor</Dropdown.Header>
                  {providers.map(provider => {
                    const count = inventory.filter(item => item.proveedor_id === provider.id).length;
                    if (count === 0) return null;
                    return (
                      <Dropdown.Item
                        key={provider.id}
                        onClick={() => generatePDF('provider', provider.id)}
                      >
                        🏪 {provider.nombre} ({count})
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Menu>
              </Dropdown>
              
              <Button
                variant="outline-primary"
                onClick={() => {
                  const csvContent = [
                    ['Nombre', 'Marca', 'Tipo', 'Stock', 'Precio'].join(','),
                    ...filteredInventory.map(item => [
                      item.nombre,
                      item.marca || '',
                      item.tipo || '',
                      item.stock || 0,
                      item.precio || 0
                    ].join(','))
                  ].join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `inventario-bar-${new Date().toISOString().split('T')[0]}.csv`;
                  a.click();
                }}
                disabled={filteredInventory.length === 0}
              >
                📊 CSV
              </Button>
              
              {(userRole === 'admin' || userRole === 'manager') && (
                <Button 
                  variant="primary" 
                  onClick={handleAddItem}
                >
                  <FaPlus /> Nuevo Producto
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          <FaExclamationTriangle className="me-2" />
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Métricas */}
      {showMetrics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FaBoxes className="mb-2 text-primary" size={24} />
                <h4>{metrics.totalProducts}</h4>
                <small className="text-muted">Total Productos</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FaDollarSign className="mb-2 text-success" size={24} />
                <h4>${metrics.totalValue.toLocaleString()}</h4>
                <small className="text-muted">Valor Total</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FaExclamationTriangle className="mb-2 text-warning" size={24} />
                <h4>{metrics.lowStock}</h4>
                <small className="text-muted">Stock Bajo</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="text-center h-100">
              <Card.Body>
                <FaArrowDown className="mb-2 text-danger" size={24} />
                <h4>{metrics.outOfStock}</h4>
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
            <Col key={item.id} lg={4} md={6} className="mb-3">
              <Card className={`h-100 ${item.stock <= (item.umbral_low || 5) ? 'border-warning' : ''}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">
                        {getCategoryIcon(item)}
                        <span className="ms-2">{item.nombre}</span>
                      </h6>
                      <p className="text-muted small mb-2">
                        {item.marca} • {item.tipo}{item.subTipo && ` (${item.subTipo})`}
                      </p>
                    </div>
                    {getStockBadge(item)}
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between">
                      <span>Stock:</span>
                      <strong>{item.stock} {item.unidad}</strong>
                    </div>
                    <div className="d-flex justify-content-between">
                      <span>Precio:</span>
                      <strong>${item.precio}</strong>
                    </div>
                    <ProgressBar
                      now={Math.min((item.stock / Math.max(item.umbral_low * 3, 1)) * 100, 100)}
                      variant={item.stock <= (item.umbral_low || 5) ? 'warning' : 'success'}
                      size="sm"
                      className="mt-2"
                    />
                  </div>

                  <div className="d-flex justify-content-between">
                    <InputGroup size="sm" style={{ maxWidth: '100px' }}>
                      <Form.Control
                        type="number"
                        min="0"
                        defaultValue={item.stock || 0}
                        onBlur={(e) => {
                          const newStock = parseInt(e.target.value) || 0;
                          if (newStock !== item.stock) {
                            handleQuickStockUpdate(item, newStock);
                          }
                        }}
                      />
                    </InputGroup>
                    
                    <div className="d-flex gap-1">
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
                    </td>
                    <td>{item.marca}</td>
                    <td>{item.tipo}{item.subTipo && ` (${item.subTipo})`}</td>
                    <td>
                      <InputGroup size="sm" style={{ maxWidth: '100px' }}>
                        <Form.Control
                          type="number"
                          min="0"
                          defaultValue={item.stock || 0}
                          onBlur={(e) => {
                            const newStock = parseInt(e.target.value) || 0;
                            if (newStock !== item.stock) {
                              handleQuickStockUpdate(item, newStock);
                            }
                          }}
                        />
                      </InputGroup>
                    </td>
                    <td>${item.precio}</td>
                    <td>{getStockBadge(item)}</td>
                    <td>
                      <div className="d-flex gap-1">
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

      {/* Mensaje si no hay resultados */}
      {filteredInventory.length === 0 && !loading && (
        <Card>
          <Card.Body className="text-center py-5">
            <FaWineGlass size={48} className="text-muted mb-3" />
            <h5>
              {inventory.length === 0 
                ? 'No hay productos en el inventario del bar' 
                : 'No se encontraron productos con los filtros actuales'
              }
            </h5>
            <p className="text-muted">
              {inventory.length === 0 
                ? 'Comienza agregando productos al inventario del bar'
                : searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' 
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Todos los productos están ocultos por los filtros actuales'
              }
            </p>
            
            {(userRole === 'admin' || userRole === 'manager') && inventory.length === 0 && (
              <Button variant="primary" onClick={handleAddItem} className="mt-3">
                <FaPlus /> Agregar Primer Producto del Bar
              </Button>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Modal de formulario */}
      <InventoryItemForm
        show={showItemModal}
        onHide={() => {
          setShowItemModal(false);
          setEditingItem(null);
        }}
        item={editingItem}
        userRole={userRole}
        user={user}
        onSuccess={handleItemSuccess}
        providers={providers}
      />
    </Container>
  );
};

export default BarInventory;