// src/components/BarInventory.js - Sistema completo renovado
import React, { useState, useEffect } from 'react';
import {
  Container, Row, Col, Card, Button, Form, Modal, Alert, Badge,
  Table, InputGroup, Dropdown, ProgressBar, OverlayTrigger, Tooltip
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
  deleteDoc, addDoc, serverTimestamp
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

  // Cargar datos del inventario
  useEffect(() => {
    if (!user) return;

    const unsubscribeInventory = onSnapshot(
      query(
        collection(db, 'inventario'),
        where('tipo_inventario', '==', 'bar'),
        orderBy('nombre')
      ),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInventory(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error cargando inventario:', error);
        setError('Error cargando inventario del bar');
        setLoading(false);
      }
    );

    const unsubscribeProviders = onSnapshot(
      query(collection(db, 'providers'), orderBy('nombre')),
      (snapshot) => {
        const providerData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProviders(providerData.filter(p => p.tipo === 'bar' || p.tipo === 'ambos'));
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
  const handleAddProduct = () => {
    setEditingItem(null);
    setShowItemModal(true);
  };

  const handleEditProduct = (item) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const handleDeleteItem = async (item) => {
    if (window.confirm(`¿Estás seguro de eliminar "${item.nombre}"?`)) {
      try {
        await deleteDoc(doc(db, 'inventario', item.id));
        setSuccess('Producto eliminado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        console.error('Error:', error);
        setError('Error al eliminar producto');
        setTimeout(() => setError(''), 3000);
      }
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

  const getStockStatus = (item) => {
    const stock = item.stock || 0;
    const umbral = item.umbral_low || 5;
    
    if (stock === 0) {
      return { status: 'out', label: 'Sin Stock', color: 'danger', progress: 0 };
    } else if (stock <= umbral) {
      return { status: 'low', label: 'Stock Bajo', color: 'warning', progress: 25 };
    } else {
      return { status: 'normal', label: 'Stock Normal', color: 'success', progress: 100 };
    }
  };

  const renderProductCard = (item) => {
    const category = categories.find(cat => cat.value === item.tipo?.toLowerCase()) || categories[0];
    const stockStatus = getStockStatus(item);
    const totalValue = (item.precio_venta || 0) * (item.stock || 0);

    return (
      <Card key={item.id} className="h-100 shadow-sm border-0">
        <Card.Header 
          className="border-0 pb-2"
          style={{ 
            background: `linear-gradient(135deg, ${category.color}15, ${category.color}05)`,
            borderBottom: `3px solid ${category.color}`
          }}
        >
          <div className="d-flex justify-content-between align-items-center">
            <Badge 
              style={{ 
                backgroundColor: category.color + '20',
                color: category.color,
                border: `1px solid ${category.color}`
              }}
            >
              <category.icon className="me-1" size={14} />
              {category.label}
            </Badge>
            <Badge bg={stockStatus.color} className="ms-2">
              {stockStatus.label}
            </Badge>
          </div>
        </Card.Header>

        <Card.Body>
          <h6 className="fw-bold mb-1">{item.nombre}</h6>
          {item.marca && (
            <small className="text-muted d-block mb-2">{item.marca}</small>
          )}

          <div className="mb-3">
            <div className="d-flex justify-content-between mb-1">
              <small className="text-muted">Stock</small>
              <small className={`fw-bold text-${stockStatus.color}`}>
                {item.stock || 0} {item.unidad || 'und'}
              </small>
            </div>
            <ProgressBar 
              now={stockStatus.progress}
              variant={stockStatus.status === 'out' ? 
                      'danger' : 
                      stockStatus.status === 'low' ? 'warning' : 'success'}
              style={{ height: '6px' }}
            />
          </div>

          <div className="d-flex gap-1">
            <InputGroup size="sm">
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
                style={{ maxWidth: '70px' }}
              />
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => {
                  setEditingItem(item);
                  setShowItemModal(true);
                }}
              >
                <FaEdit />
              </Button>
              {userRole === 'admin' && (
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={() => handleDeleteItem(item)}
                >
                  <FaTrash />
                </Button>
              )}
            </InputGroup>
          </div>

          {item.proveedor && (
            <small className="text-muted mt-2 d-block">
              Proveedor: {providers.find(p => p.id === item.proveedor_id)?.nombre || item.proveedor}
            </small>
          )}
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <div className="spinner-border text-primary mb-3" />
        <p>Cargando inventario del bar...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button 
                variant="link" 
                onClick={onBack}
                className="p-0 mb-2"
              >
                <FaArrowLeft className="me-2" />
                Volver al Dashboard
              </Button>
              <h2 className="mb-1">
                <FaWineGlass className="me-2 text-primary" />
                Inventario del Bar
              </h2>
              <p className="text-muted mb-0">
                Gestión completa de bebidas y productos del bar
              </p>
            </div>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-secondary"
                onClick={() => setShowMetrics(!showMetrics)}
              >
                <FaChartBar className="me-2" />
                {showMetrics ? 'Ocultar' : 'Mostrar'} Métricas
              </Button>
              <Button variant="primary" onClick={handleAddProduct}>
                <FaPlus className="me-2" />
                Agregar Producto
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

      {/* Métricas */}
      {showMetrics && (
        <Row className="mb-4">
          <Col lg={8}>
            <Row>
              <Col md={3} className="mb-3">
                <Card className="text-center bg-primary text-white">
                  <Card.Body>
                    <FaBoxes size={32} className="mb-2" />
                    <h3>{metrics.totalProducts}</h3>
                    <p className="mb-0">Productos</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3} className="mb-3">
                <Card className="text-center bg-success text-white">
                  <Card.Body>
                    <FaDollarSign size={32} className="mb-2" />
                    <h3>${metrics.totalValue.toLocaleString()}</h3>
                    <p className="mb-0">Valor Total</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3} className="mb-3">
                <Card className="text-center bg-warning text-white">
                  <Card.Body>
                    <FaExclamationTriangle size={32} className="mb-2" />
                    <h3>{metrics.lowStock}</h3>
                    <p className="mb-0">Stock Bajo</p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3} className="mb-3">
                <Card className="text-center bg-info text-white">
                  <Card.Body>
                    <FaChartBar size={32} className="mb-2" />
                    <h3>{Math.round(metrics.averageStock)}</h3>
                    <p className="mb-0">Stock Promedio</p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
          <Col lg={4}>
            <Card>
              <Card.Header>
                <h6 className="mb-0">Distribución por Categoría</h6>
              </Card.Header>
              <Card.Body>
                <div style={{ height: '200px' }}>
                  <Pie 
                    data={chartData.categories}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { fontSize: 12 }
                        }
                      }
                    }}
                  />
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filtros */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <Row className="align-items-end">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Buscar</Form.Label>
                    <InputGroup>
                      <InputGroup.Text><FaSearch /></InputGroup.Text>
                      <Form.Control
                        type="text"
                        placeholder="Nombre o marca..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </InputGroup>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Categoría</Form.Label>
                    <Form.Select 
                      value={categoryFilter} 
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Stock</Form.Label>
                    <Form.Select 
                      value={stockFilter} 
                      onChange={(e) => setStockFilter(e.target.value)}
                    >
                      <option value="all">Todos</option>
                      <option value="normal">Stock Normal</option>
                      <option value="low">Stock Bajo</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Ordenar</Form.Label>
                    <Dropdown>
                      <Dropdown.Toggle variant="outline-secondary" className="w-100">
                        <FaSort className="me-1" />
                        Orden
                      </Dropdown.Toggle>
                      <Dropdown.Menu>
                        <Dropdown.Item onClick={() => { setSortBy('nombre'); setSortOrder('asc'); }}>
                          <FaSortUp className="me-2" />Nombre A-Z
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => { setSortBy('nombre'); setSortOrder('desc'); }}>
                          <FaSortDown className="me-2" />Nombre Z-A
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => { setSortBy('stock'); setSortOrder('asc'); }}>
                          <FaSortAmountDown className="me-2" />Stock Menor
                        </Dropdown.Item>
                        <Dropdown.Item onClick={() => { setSortBy('stock'); setSortOrder('desc'); }}>
                          <FaSortAmountUp className="me-2" />Stock Mayor
                        </Dropdown.Item>
                      </Dropdown.Menu>
                    </Dropdown>
                  </Form.Group>
                </Col>
                <Col md={2}>
                  <Form.Group>
                    <Form.Label>Vista</Form.Label>
                    <div className="d-flex gap-1">
                      <Button
                        variant={viewMode === 'cards' ? 'primary' : 'outline-secondary'}
                        onClick={() => setViewMode('cards')}
                        className="flex-fill"
                      >
                        <FaTh />
                      </Button>
                      <Button
                        variant={viewMode === 'table' ? 'primary' : 'outline-secondary'}
                        onClick={() => setViewMode('table')}
                        className="flex-fill"
                      >
                        <FaList />
                      </Button>
                    </div>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Contenido del inventario */}
      {filteredInventory.length === 0 ? (
        <Card className="text-center py-5">
          <Card.Body>
            <FaWineGlass size={64} className="text-muted mb-3" />
            <h4>No hay productos</h4>
            <p className="text-muted mb-4">
              {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' 
                ? 'No se encontraron productos con los filtros aplicados.'
                : 'Comienza agregando productos al inventario del bar.'}
            </p>
            <Button variant="primary" onClick={handleAddProduct}>
              <FaPlus className="me-2" />
              Agregar Primer Producto
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <>
          {viewMode === 'cards' ? (
            <Row>
              {filteredInventory.map(item => (
                <Col key={item.id} xl={3} lg={4} md={6} className="mb-4">
                  {renderProductCard(item)}
                </Col>
              ))}
            </Row>
          ) : (
            <Card>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                      <th>Stock</th>
                      <th>Precio</th>
                      <th>Valor Total</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInventory.map(item => {
                      const category = categories.find(cat => cat.value === item.tipo?.toLowerCase()) || categories[0];
                      const stockStatus = getStockStatus(item);
                      
                      return (
                        <tr key={item.id}>
                          <td>
                            <div>
                              <div className="fw-medium">{item.nombre}</div>
                              {item.marca && <small className="text-muted">{item.marca}</small>}
                            </div>
                          </td>
                          <td>
                            <Badge 
                              style={{ 
                                backgroundColor: category.color + '20',
                                color: category.color,
                                border: `1px solid ${category.color}`
                              }}
                            >
                              <category.icon className="me-1" size={12} />
                              {category.label}
                            </Badge>
                          </td>
                          <td>
                            <span className={`text-${stockStatus.color} fw-bold`}>
                              {item.stock || 0} {item.unidad || 'und'}
                            </span>
                          </td>
                          <td>${item.precio_venta || 0}</td>
                          <td>${((item.precio_venta || 0) * (item.stock || 0)).toFixed(2)}</td>
                          <td>
                            <Badge bg={stockStatus.color}>
                              {stockStatus.label}
                            </Badge>
                          </td>
                          <td>
                            <div className="d-flex gap-1">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={() => handleEditProduct(item)}
                              >
                                <FaEdit />
                              </Button>
                              {userRole === 'admin' && (
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
                      );
                    })}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Modal para agregar/editar productos */}
      <Modal show={showItemModal} onHide={() => setShowItemModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaWineGlass className="me-2" />
            {editingItem ? 'Editar Producto' : 'Agregar Producto'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InventoryItemForm
            editingItem={editingItem}
            onSuccess={() => {
              setShowItemModal(false);
              setEditingItem(null);
              setSuccess(editingItem ? 'Producto actualizado' : 'Producto agregado');
              setTimeout(() => setSuccess(''), 3000);
            }}
            onCancel={() => {
              setShowItemModal(false);
              setEditingItem(null);
            }}
            currentUser={user}
            userRole={userRole}
            providers={providers}
            inventoryType="bar"
            canEditAllFields={true}
          />
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default BarInventory;