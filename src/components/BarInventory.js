// src/components/BarInventory.js - CORREGIDO para evitar error de índice
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

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, ChartTooltip,
  Legend, ArcElement, PointElement, LineElement
);

const BarInventory = ({ onBack, user, userRole }) => {
  // Estados principales
  const [inventory, setInventory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de vista
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showMetrics, setShowMetrics] = useState(true);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('nombre');
  const [sortOrder, setSortOrder] = useState('asc');

  // Categorías de bebidas
  const categories = [
    { value: 'all', label: 'Todas las bebidas', icon: FaWineGlass, color: '#6c757d' },
    { value: 'whisky', label: 'Whisky', icon: FaGlassWhiskey, color: '#8B4513' },
    { value: 'vodka', label: 'Vodka', icon: FaWineBottle, color: '#E6E6FA' },
    { value: 'ron', label: 'Ron', icon: FaWineBottle, color: '#CD853F' },
    { value: 'gin', label: 'Gin', icon: FaWineBottle, color: '#98FB98' },
    { value: 'tequila', label: 'Tequila', icon: FaWineBottle, color: '#DAA520' },
    { value: 'cerveza', label: 'Cerveza', icon: FaBeer, color: '#FFD700' },
    { value: 'vino', label: 'Vino', icon: FaWineGlass, color: '#800080' },
    { value: 'licor', label: 'Licores', icon: FaCocktail, color: '#FF69B4' },
    { value: 'mixers', label: 'Mixers', icon: FaCocktail, color: '#20B2AA' }
  ];

  // Cargar datos del inventario - CORREGIDO
  useEffect(() => {
    if (!user) return;

    // CAMBIO: Usar solo el filtro where para tipo_inventario, sin orderBy para evitar índice compuesto
    const unsubscribeInventory = onSnapshot(
      query(
        collection(db, 'inventario'),
        where('tipo_inventario', '==', 'bar')
        // REMOVIDO: orderBy('nombre') para evitar error de índice
      ),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Ordenar en el cliente en lugar de en la consulta
        const sortedItems = items.sort((a, b) => {
          const aName = (a.nombre || '').toLowerCase();
          const bName = (b.nombre || '').toLowerCase();
          return aName.localeCompare(bName);
        });
        
        setInventory(sortedItems);
        setLoading(false);
        setError(''); // Limpiar error si la carga es exitosa
      },
      (error) => {
        console.error('Error cargando inventario del bar:', error);
        setError('Error cargando inventario del bar. Verifica la conexión a Firebase.');
        setLoading(false);
        
        // Si hay error, mostrar los datos cacheados si existen
        setInventory([]);
      }
    );

    const unsubscribeProviders = onSnapshot(
      query(collection(db, 'providers')), // Sin orderBy para evitar problemas
      (snapshot) => {
        const providerData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Filtrar y ordenar en el cliente
        const filteredProviders = providerData
          .filter(p => p.tipo === 'bar' || p.tipo === 'ambos')
          .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
          
        setProviders(filteredProviders);
      },
      (error) => {
        console.error('Error cargando proveedores:', error);
        // No mostrar error para proveedores ya que no es crítico
      }
    );

    return () => {
      unsubscribeInventory();
      unsubscribeProviders();
    };
  }, [user]);

  // Filtrar y ordenar inventario
  const filteredInventory = inventory
    .filter(item => {
      const matchesSearch = item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.marca?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || 
                             item.tipo?.toLowerCase() === categoryFilter;
      const matchesStock = stockFilter === 'all' ||
                          (stockFilter === 'low' && item.stock <= (item.umbral_low || 5)) ||
                          (stockFilter === 'normal' && item.stock > (item.umbral_low || 5));
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
      count: inventory.filter(item => item.tipo?.toLowerCase() === cat.value).length,
      value: inventory
        .filter(item => item.tipo?.toLowerCase() === cat.value)
        .reduce((sum, item) => sum + ((item.precio_venta || 0) * (item.stock || 0)), 0)
    })).sort((a, b) => b.count - a.count).slice(0, 5)
  };

  // Datos para gráficos
  const chartData = {
    categories: {
      labels: metrics.topCategories.map(cat => cat.label),
      datasets: [{
        data: metrics.topCategories.map(cat => cat.count),
        backgroundColor: metrics.topCategories.map(cat => cat.color),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    stockLevels: {
      labels: ['Stock Normal', 'Stock Bajo', 'Sin Stock'],
      datasets: [{
        data: [
          inventory.filter(item => item.stock > (item.umbral_low || 5)).length,
          inventory.filter(item => item.stock <= (item.umbral_low || 5) && item.stock > 0).length,
          inventory.filter(item => item.stock === 0).length
        ],
        backgroundColor: ['#28a745', '#ffc107', '#dc3545'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    valueByCategory: {
      labels: metrics.topCategories.map(cat => cat.label),
      datasets: [{
        label: 'Valor en Stock ($)',
        data: metrics.topCategories.map(cat => cat.value),
        backgroundColor: metrics.topCategories.map(cat => cat.color + '80'),
        borderColor: metrics.topCategories.map(cat => cat.color),
        borderWidth: 2
      }]
    }
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
      
      // Registrar en historial
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

  const handleItemSuccess = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setSuccess(editingItem ? 'Producto actualizado correctamente' : 'Producto agregado correctamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Funciones de exportación y utilidad
  const exportToCSV = () => {
    const headers = ['Nombre', 'Marca', 'Tipo', 'Stock', 'Unidad', 'Umbral Bajo', 'Precio', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filteredInventory.map(item => [
        item.nombre,
        item.marca || '',
        item.tipo || '',
        item.stock || 0,
        item.unidad || '',
        item.umbral_low || 0,
        item.precio || 0,
        item.stock <= (item.umbral_low || 5) ? 'Stock Bajo' : 'Normal'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventario-bar-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  const getCategoryIcon = (tipo) => {
    const category = categories.find(cat => cat.value === tipo?.toLowerCase());
    const IconComponent = category?.icon || FaWineGlass;
    return <IconComponent style={{ color: category?.color }} />;
  };

  // Renderización condicional para loading y error
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
              <Button
                variant="outline-primary"
                onClick={exportToCSV}
                disabled={filteredInventory.length === 0}
              >
                <FaDownload /> Exportar
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
                        {getCategoryIcon(item.tipo)}
                        <span className="ms-2">{item.nombre}</span>
                      </h6>
                      <p className="text-muted small mb-2">
                        {item.marca} • {item.tipo}
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

                  <div className="d-flex justify-content-end gap-1">
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
                    </td>
                    <td>{item.marca}</td>
                    <td>{item.tipo}{item.subTipo && ` (${item.subTipo})`}</td>
                    <td>{item.stock} {item.unidad}</td>
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
            
            {/* Información de debug */}
            <div className="mt-3 p-3 bg-light rounded">
              <small className="text-muted">
                <strong>Debug:</strong><br/>
                Total en inventario: {inventory.length}<br/>
                Filtros: búsqueda="{searchTerm}", categoría="{categoryFilter}", stock="{stockFilter}"<br/>
                Productos después de filtros: {filteredInventory.length}<br/>
                Usuario: {user?.email}<br/>
                Loading: {loading ? 'Sí' : 'No'}<br/>
                Error: {error || 'Ninguno'}
              </small>
              
              <div className="mt-2">
                <Button
                  variant="outline-success"
                  size="sm"
                  className="me-2"
                  onClick={loadInventoryData}
                  disabled={loading}
                >
                  {loading ? '🔄 Cargando...' : '🔄 Cargar Productos Manualmente'}
                </Button>
                
                <Button
                  variant="outline-info"
                  size="sm"
                  onClick={async () => {
                    console.log('🔬 TEST: Verificando conexión a Firebase...');
                    try {
                      const snapshot = await getDocs(collection(db, 'inventario'));
                      console.log('🔬 TEST: Documentos encontrados:', snapshot.size);
                      
                      const barTypes = ['licor', 'whisky', 'vodka', 'ron', 'gin', 'tequila', 'cerveza', 'vino', 'champagne', 'mixers'];
                      let barCount = 0;
                      
                      snapshot.docs.forEach(doc => {
                        const data = doc.data();
                        const itemType = (data.tipo || '').toLowerCase();
                        const itemSubType = (data.subTipo || '').toLowerCase();
                        const isBarItem = barTypes.includes(itemType) || barTypes.includes(itemSubType);
                        
                        if (isBarItem) barCount++;
                        
                        console.log('🔬 TEST:', data.nombre, '| Tipo:', data.tipo, '| SubTipo:', data.subTipo, '| Es del bar:', isBarItem);
                      });
                      
                      console.log('🔬 TEST: Total productos del bar:', barCount);
                      alert(`Encontrados ${snapshot.size} productos, ${barCount} son del bar`);
                    } catch (error) {
                      console.error('🔬 TEST ERROR:', error);
                      alert('Error: ' + error.message);
                    }
                  }}
                >
                  🔍 Test Manual de Base de Datos
                </Button>
              </div>
            </div>
            
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