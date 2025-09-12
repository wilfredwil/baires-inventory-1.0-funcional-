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
  FaArrowLeft, FaSync, FaBolt, FaTrendingUp, FaTrendingDown
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

  // Cargar datos
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
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2
      }]
    }
  };

  // Handlers
  const handleQuickStockUpdate = async (item, newStock) => {
    try {
      await updateDoc(doc(db, 'inventario', item.id), {
        stock: newStock,
        ultima_actualizacion: serverTimestamp(),
        actualizado_por: user.email
      });
      
      setSuccess(`Stock de ${item.nombre} actualizado a ${newStock}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error actualizando stock');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`¿Eliminar ${item.nombre} del inventario?`)) return;

    try {
      await deleteDoc(doc(db, 'inventario', item.id));
      setSuccess(`${item.nombre} eliminado del inventario`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error eliminando producto');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getStockStatus = (item) => {
    const stock = item.stock || 0;
    const threshold = item.umbral_low || 5;
    
    if (stock === 0) return { status: 'critical', color: '#dc3545', label: 'Sin Stock' };
    if (stock <= threshold) return { status: 'low', color: '#ffc107', label: 'Stock Bajo' };
    return { status: 'normal', color: '#28a745', label: 'Normal' };
  };

  const ProductCard = ({ item }) => {
    const stockStatus = getStockStatus(item);
    const category = categories.find(cat => cat.value === item.tipo?.toLowerCase()) || categories[0];
    
    return (
      <Card className="h-100 shadow-sm border-0 product-card" style={{ borderRadius: '15px' }}>
        <div 
          className="position-absolute w-100" 
          style={{ 
            top: 0, 
            height: '4px', 
            background: `linear-gradient(90deg, ${category.color}, ${category.color}99)`,
            borderRadius: '15px 15px 0 0'
          }} 
        />
        
        <Card.Body className="p-3">
          <div className="d-flex justify-content-between align-items-start mb-2">
            <div className="flex-grow-1">
              <h6 className="card-title mb-1 fw-bold">{item.nombre}</h6>
              {item.marca && <small className="text-muted">{item.marca}</small>}
            </div>
            <div className="d-flex align-items-center gap-2">
              <div 
                className="rounded-circle" 
                style={{ 
                  width: '12px', 
                  height: '12px', 
                  backgroundColor: stockStatus.color,
                  boxShadow: stockStatus.status === 'critical' ? `0 0 10px ${stockStatus.color}` : 'none'
                }} 
              />
              <category.icon style={{ color: category.color, fontSize: '1.1rem' }} />
            </div>
          </div>

          <div className="mb-3">
            <Badge bg="light" text="dark" className="me-2">
              {item.tipo || 'Sin categoría'}
            </Badge>
            <Badge bg={stockStatus.status === 'critical' ? 'danger' : 
                      stockStatus.status === 'low' ? 'warning' : 'success'}>
              {stockStatus.label}
            </Badge>
          </div>

          <div className="row g-2 mb-3">
            <div className="col-6">
              <small className="text-muted d-block">Stock</small>
              <div className="d-flex align-items-center">
                <strong className={`me-2 ${stockStatus.status === 'critical' ? 'text-danger' : ''}`}>
                  {item.stock || 0}
                </strong>
                <small className="text-muted">{item.unidad || 'und'}</small>
              </div>
            </div>
            <div className="col-6">
              <small className="text-muted d-block">Precio</small>
              <strong className="text-success">${item.precio_venta || 0}</strong>
            </div>
          </div>

          <div className="mb-3">
            <small className="text-muted">Umbral mínimo: {item.umbral_low || 5}</small>
            <ProgressBar 
              now={Math.min((item.stock / (item.umbral_low * 2 || 10)) * 100, 100)}
              variant={stockStatus.status === 'critical' ? 'danger' : 
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
              <Button 
                variant="primary"
                onClick={() => {
                  setEditingItem(null);
                  setShowItemModal(true);
                }}
              >
                <FaPlus className="me-2" />
                Nuevo Producto
              </Button>
            </div>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Métricas Dashboard */}
      {showMetrics && (
        <Row className="mb-4">
          {/* Métricas principales */}
          <Col lg={8}>
            <Row className="g-3 mb-4">
              <Col md={3}>
                <Card className="text-center border-0 shadow-sm h-100">
                  <Card.Body className="py-3">
                    <FaBoxes className="text-primary mb-2" size={24} />
                    <h4 className="mb-1 text-primary">{metrics.totalProducts}</h4>
                    <small className="text-muted">Total Productos</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-0 shadow-sm h-100">
                  <Card.Body className="py-3">
                    <FaDollarSign className="text-success mb-2" size={24} />
                    <h4 className="mb-1 text-success">${metrics.totalValue.toLocaleString()}</h4>
                    <small className="text-muted">Valor Total</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-0 shadow-sm h-100">
                  <Card.Body className="py-3">
                    <FaExclamationTriangle className="text-warning mb-2" size={24} />
                    <h4 className="mb-1 text-warning">{metrics.lowStock}</h4>
                    <small className="text-muted">Stock Bajo</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center border-0 shadow-sm h-100">
                  <Card.Body className="py-3">
                    <FaBolt className="text-danger mb-2" size={24} />
                    <h4 className="mb-1 text-danger">{metrics.outOfStock}</h4>
                    <small className="text-muted">Sin Stock</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Gráficos */}
            <Row className="g-3">
              <Col md={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-transparent border-0">
                    <h6 className="mb-0">Distribución por Categoría</h6>
                  </Card.Header>
                  <Card.Body>
                    <Pie 
                      data={chartData.categories}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12 }
                          }
                        }
                      }}
                      height={200}
                    />
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card className="border-0 shadow-sm h-100">
                  <Card.Header className="bg-transparent border-0">
                    <h6 className="mb-0">Estado del Stock</h6>
                  </Card.Header>
                  <Card.Body>
                    <Pie 
                      data={chartData.stockLevels}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { boxWidth: 12 }
                          }
                        }
                      }}
                      height={200}
                    />
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>

          {/* Panel lateral de métricas */}
          <Col lg={4}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-transparent border-0">
                <h6 className="mb-0">Top Categorías</h6>
              </Card.Header>
              <Card.Body className="p-0">
                <div className="list-group list-group-flush">
                  {metrics.topCategories.slice(0, 5).map((category, index) => (
                    <div key={category.value} className="list-group-item border-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <category.icon 
                            style={{ color: category.color, marginRight: '10px' }} 
                            size={16}
                          />
                          <small>{category.label}</small>
                        </div>
                        <div className="text-end">
                          <Badge bg="light" text="dark">{category.count}</Badge>
                          <div style={{ fontSize: '0.75rem', color: '#6c757d' }}>
                            ${category.value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Filtros y controles */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="py-3">
              <Row className="g-3 align-items-center">
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text>
                      <FaSearch />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Buscar productos..."
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
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
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
                  <Dropdown>
                    <Dropdown.Toggle variant="outline-secondary" size="sm">
                      <FaSort className="me-1" />
                      Ordenar
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => { setSortBy('nombre'); setSortOrder('asc'); }}>
                        <FaSortUp className="me-2" />Nombre A-Z
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => { setSortBy('nombre'); setSortOrder('desc'); }}>
                        <FaSortDown className="me-2" />Nombre Z-A
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => { setSortBy('stock'); setSortOrder('asc'); }}>
                        <FaTrendingDown className="me-2" />Stock Menor
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => { setSortBy('stock'); setSortOrder('desc'); }}>
                        <FaTrendingUp className="me-2" />Stock Mayor
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>
                <Col md={2}>
                  <div className="d-flex gap-1">
                    <Button
                      variant={viewMode === 'cards' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                    >
                      <FaTh />
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                    >
                      <FaList />
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Inventario */}
      {filteredInventory.length === 0 ? (
        <Card className="text-center py-5 border-0 shadow-sm">
          <Card.Body>
            <FaWineGlass size={48} className="text-muted mb-3" />
            <h5>No hay productos</h5>
            <p className="text-muted">
              {searchTerm || categoryFilter !== 'all' || stockFilter !== 'all' 
                ? 'No se encontraron productos con los filtros aplicados.'
                : 'Comienza agregando productos al inventario del bar.'}
            </p>
            <Button 
              variant="primary"
              onClick={() => {
                setEditingItem(null);
                setShowItemModal(true);
              }}
            >
              <FaPlus className="me-2" />
              Agregar Primer Producto
            </Button>
          </Card.Body>
        </Card>
      ) : viewMode === 'cards' ? (
        <Row className="g-3">
          {filteredInventory.map(item => (
            <Col key={item.id} lg={3} md={4} sm={6}>
              <ProductCard item={item} />
            </Col>
          ))}
        </Row>
      ) : (
        <Card className="border-0 shadow-sm">
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="bg-light">
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Stock</th>
                  <th>Precio</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredInventory.map(item => {
                  const stockStatus = getStockStatus(item);
                  return (
                    <tr key={item.id}>
                      <td>
                        <div>
                          <strong>{item.nombre}</strong>
                          {item.marca && <div className="small text-muted">{item.marca}</div>}
                        </div>
                      </td>
                      <td>
                        <Badge bg="light" text="dark">{item.tipo || 'Sin categoría'}</Badge>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <Form.Control
                            type="number"
                            size="sm"
                            style={{ width: '80px' }}
                            defaultValue={item.stock || 0}
                            onBlur={(e) => {
                              const newStock = parseInt(e.target.value) || 0;
                              if (newStock !== item.stock) {
                                handleQuickStockUpdate(item, newStock);
                              }
                            }}
                          />
                          <span className="ms-2 small text-muted">{item.unidad || 'und'}</span>
                        </div>
                      </td>
                      <td>${item.precio_venta || 0}</td>
                      <td>
                        <Badge bg={stockStatus.status === 'critical' ? 'danger' : 
                                   stockStatus.status === 'low' ? 'warning' : 'success'}>
                          {stockStatus.label}
                        </Badge>
                      </td>
                      <td>
                        <div className="d-flex gap-1">
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

      {/* Modal para agregar/editar producto */}
      <Modal show={showItemModal} onHide={() => setShowItemModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaWineGlass className="me-2" />
            {editingItem ? 'Editar' : 'Nuevo'} Producto del Bar
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <InventoryItemForm
            editingItem={editingItem}
            inventoryType="bar"
            providers={providers}
            currentUser={user}
            userRole={userRole}
            onSuccess={() => {
              setShowItemModal(false);
              setEditingItem(null);
              setSuccess(editingItem ? 'Producto actualizado' : 'Producto agregado');
              setTimeout(() => setSuccess(''), 3000);
            }}
            onCancel={() => setShowItemModal(false)}
          />
        </Modal.Body>
      </Modal>

      <style jsx>{`
        .product-card {
          transition: all 0.3s ease;
        }
        .product-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.15) !important;
        }
        .list-group-item:hover {
          background-color: #f8f9fa;
        }
      `}</style>
    </Container>
  );
};

export default BarInventory;