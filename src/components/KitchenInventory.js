import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Table, Badge, Alert } from 'react-bootstrap';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaExclamationTriangle, FaBox, FaFilter } from 'react-icons/fa';

const KitchenInventory = () => {
  const [items, setItems] = useState([
    {
      id: 1,
      name: 'Tomates',
      category: 'Verduras',
      quantity: 8,
      unit: 'unidades',
      location: 'Refrigerador',
      purchaseDate: '2025-09-05',
      expirationDate: '2025-09-15',
      price: 2.50,
      status: 'normal'
    },
    {
      id: 2,
      name: 'Arroz Basmati',
      category: 'Granos',
      quantity: 2,
      unit: 'kg',
      location: 'Despensa',
      purchaseDate: '2025-08-20',
      expirationDate: '2026-08-20',
      price: 4.99,
      status: 'normal'
    },
    {
      id: 3,
      name: 'Leche',
      category: 'Lácteos',
      quantity: 1,
      unit: 'litro',
      location: 'Refrigerador',
      purchaseDate: '2025-09-08',
      expirationDate: '2025-09-12',
      price: 1.85,
      status: 'warning'
    }
  ]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');

  const categories = ['Verduras', 'Frutas', 'Lácteos', 'Carnes', 'Granos', 'Condimentos', 'Bebidas', 'Congelados'];
  const locations = ['Refrigerador', 'Congelador', 'Despensa', 'Alacena'];
  const units = ['unidades', 'kg', 'g', 'litros', 'ml', 'paquetes', 'latas', 'cajas'];

  // Calcular estado del producto basado en fecha de vencimiento
  const getItemStatus = (expirationDate) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 3) return 'warning';
    return 'normal';
  };

  // CORRECCIÓN: Comentar el useEffect problemático
  // useEffect(() => {
  //   setItems(prevItems => 
  //     prevItems.map(item => ({
  //       ...item,
  //       status: getItemStatus(item.expirationDate)
  //     }))
  //   );
  // }, []);

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Verduras',
    quantity: '',
    unit: 'unidades',
    location: 'Refrigerador',
    purchaseDate: new Date().toISOString().split('T')[0],
    expirationDate: '',
    price: ''
  });

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesLocation = selectedLocation === 'all' || item.location === selectedLocation;
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const handleSubmit = () => {
    if (!newItem.name || !newItem.quantity || !newItem.expirationDate || !newItem.price) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (editingItem) {
      setItems(items.map(item => 
        item.id === editingItem.id 
          ? { ...newItem, id: editingItem.id, status: getItemStatus(newItem.expirationDate) }
          : item
      ));
      setEditingItem(null);
    } else {
      const id = Math.max(...items.map(item => item.id), 0) + 1;
      setItems([...items, { 
        ...newItem, 
        id, 
        quantity: parseFloat(newItem.quantity),
        price: parseFloat(newItem.price),
        status: getItemStatus(newItem.expirationDate)
      }]);
    }
    setNewItem({
      name: '',
      category: 'Verduras',
      quantity: '',
      unit: 'unidades',
      location: 'Refrigerador',
      purchaseDate: new Date().toISOString().split('T')[0],
      expirationDate: '',
      price: ''
    });
    setShowAddForm(false);
  };

  const handleEdit = (item) => {
    setNewItem(item);
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este producto?')) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'expired': return 'danger';
      case 'warning': return 'warning';
      default: return 'success';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'expired': return 'Vencido';
      case 'warning': return 'Por vencer';
      default: return 'Fresco';
    }
  };

  const expiredItems = items.filter(item => item.status === 'expired').length;
  const warningItems = items.filter(item => item.status === 'warning').length;
  const totalValue = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  return (
    <Container fluid style={{ backgroundColor: '#f8f9fa', minHeight: '100vh', padding: '20px' }}>
      {/* Encabezado */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e9ecef' }}>
          <h1 className="display-6 text-dark mb-2">Inventario de Cocina</h1>
          <p className="text-muted mb-0">Gestiona tu inventario con el sistema FIFO para reducir desperdicios</p>
        </Card.Header>

        {/* Resumen del inventario */}
        <Card.Body>
          <Row>
            <Col md={3} className="mb-3">
              <Card style={{ backgroundColor: '#e3f2fd', border: '1px solid #bbdefb' }}>
                <Card.Body className="text-center">
                  <div className="d-flex align-items-center justify-content-center">
                    <FaBox size={32} className="text-primary me-3" />
                    <div>
                      <p className="small text-primary fw-medium mb-1">Total Items</p>
                      <h2 className="h3 fw-bold text-primary mb-0">{items.length}</h2>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            
            <Col md={3} className="mb-3">
              <Card style={{ backgroundColor: '#e8f5e8', border: '1px solid #c8e6c9' }}>
                <Card.Body className="text-center">
                  <div className="d-flex align-items-center justify-content-center">
                    <div 
                      className="d-flex align-items-center justify-content-center me-3"
                      style={{ 
                        width: '32px', 
                        height: '32px', 
                        backgroundColor: '#4caf50', 
                        borderRadius: '50%' 
                      }}
                    >
                      <span className="text-white fw-bold">$</span>
                    </div>
                    <div>
                      <p className="small text-success fw-medium mb-1">Valor Total</p>
                      <h3 className="h4 fw-bold text-success mb-0">${totalValue.toFixed(2)}</h3>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3} className="mb-3">
              <Card style={{ backgroundColor: '#fff3e0', border: '1px solid #ffcc02' }}>
                <Card.Body className="text-center">
                  <div className="d-flex align-items-center justify-content-center">
                    <FaExclamationTriangle size={32} className="text-warning me-3" />
                    <div>
                      <p className="small text-warning fw-medium mb-1">Por Vencer</p>
                      <h3 className="h4 fw-bold text-warning mb-0">{warningItems}</h3>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>

            <Col md={3} className="mb-3">
              <Card style={{ backgroundColor: '#ffebee', border: '1px solid #ef5350' }}>
                <Card.Body className="text-center">
                  <div className="d-flex align-items-center justify-content-center">
                    <FaExclamationTriangle size={32} className="text-danger me-3" />
                    <div>
                      <p className="small text-danger fw-medium mb-1">Vencidos</p>
                      <h3 className="h4 fw-bold text-danger mb-0">{expiredItems}</h3>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Controles de búsqueda y filtros */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row className="align-items-center">
            <Col lg={6} className="mb-3 mb-lg-0">
              <div className="position-relative">
                <FaSearch 
                  className="position-absolute text-muted" 
                  style={{ 
                    left: '12px', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    zIndex: 10 
                  }} 
                />
                <Form.Control
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ 
                    paddingLeft: '40px',
                    borderRadius: '8px',
                    border: '1px solid #ced4da'
                  }}
                />
              </div>
            </Col>
            
            <Col lg={6}>
              <Row>
                <Col sm={4} className="mb-2 mb-sm-0">
                  <Form.Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ borderRadius: '8px' }}
                  >
                    <option value="all">Todas las categorías</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col sm={4} className="mb-2 mb-sm-0">
                  <Form.Select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    style={{ borderRadius: '8px' }}
                  >
                    <option value="all">Todas las ubicaciones</option>
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </Form.Select>
                </Col>

                <Col sm={4}>
                  <Button
                    variant="primary"
                    onClick={() => setShowAddForm(true)}
                    className="w-100"
                    style={{ borderRadius: '8px' }}
                  >
                    <FaPlus className="me-2" />
                    Agregar
                  </Button>
                </Col>
              </Row>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Formulario de agregar/editar */}
      {showAddForm && (
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Header style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid #e9ecef' }}>
            <h5 className="mb-0">
              {editingItem ? 'Editar Producto' : 'Agregar Nuevo Producto'}
            </h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    required
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  />
                </Form.Group>
              </Col>

              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select
                    value={newItem.category}
                    onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Cantidad *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.1"
                    required
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  />
                </Form.Group>
              </Col>

              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Unidad</Form.Label>
                  <Form.Select
                    value={newItem.unit}
                    onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Ubicación</Form.Label>
                  <Form.Select
                    value={newItem.location}
                    onChange={(e) => setNewItem({...newItem, location: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  >
                    {locations.map(loc => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Fecha de Compra</Form.Label>
                  <Form.Control
                    type="date"
                    value={newItem.purchaseDate}
                    onChange={(e) => setNewItem({...newItem, purchaseDate: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  />
                </Form.Group>
              </Col>

              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Fecha de Vencimiento *</Form.Label>
                  <Form.Control
                    type="date"
                    required
                    value={newItem.expirationDate}
                    onChange={(e) => setNewItem({...newItem, expirationDate: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  />
                </Form.Group>
              </Col>

              <Col md={6} lg={3} className="mb-3">
                <Form.Group>
                  <Form.Label>Precio por Unidad ($) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    required
                    value={newItem.price}
                    onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                    style={{ borderRadius: '6px' }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <div className="d-flex gap-2 mt-3">
              <Button
                variant="success"
                onClick={handleSubmit}
                style={{ borderRadius: '6px' }}
              >
                {editingItem ? 'Actualizar' : 'Agregar'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingItem(null);
                  setNewItem({
                    name: '',
                    category: 'Verduras',
                    quantity: '',
                    unit: 'unidades',
                    location: 'Refrigerador',
                    purchaseDate: new Date().toISOString().split('T')[0],
                    expirationDate: '',
                    price: ''
                  });
                }}
                style={{ borderRadius: '6px' }}
              >
                Cancelar
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Lista de productos */}
      <Card className="border-0 shadow-sm">
        <Card.Header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e9ecef' }}>
          <h5 className="mb-1">Productos en Inventario</h5>
          <p className="text-muted small mb-0">
            {filteredItems.length} de {items.length} productos
          </p>
        </Card.Header>

        <Card.Body className="p-0">
          {filteredItems.length === 0 ? (
            <div className="text-center py-5">
              <FaBox size={48} className="text-muted mb-3" />
              <h5 className="text-muted">No hay productos</h5>
              <p className="text-muted">
                {searchTerm || selectedCategory !== 'all' || selectedLocation !== 'all'
                  ? 'No se encontraron productos con los filtros aplicados.'
                  : 'Comienza agregando productos a tu inventario.'}
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <Table striped hover className="mb-0">
                <thead style={{ backgroundColor: '#f8f9fa' }}>
                  <tr>
                    <th className="text-uppercase small fw-medium text-muted py-3">Producto</th>
                    <th className="text-uppercase small fw-medium text-muted py-3">Cantidad</th>
                    <th className="text-uppercase small fw-medium text-muted py-3">Ubicación</th>
                    <th className="text-uppercase small fw-medium text-muted py-3">Vencimiento</th>
                    <th className="text-uppercase small fw-medium text-muted py-3">Estado</th>
                    <th className="text-uppercase small fw-medium text-muted py-3">Valor</th>
                    <th className="text-uppercase small fw-medium text-muted py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems
                    .sort((a, b) => new Date(a.expirationDate) - new Date(b.expirationDate))
                    .map((item) => (
                    <tr key={item.id} style={{ transition: 'background-color 0.15s ease' }}>
                      <td className="py-3">
                        <div>
                          <div className="fw-medium text-dark">{item.name}</div>
                          <div className="small text-muted">{item.category}</div>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className="text-dark">{item.quantity} {item.unit}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-dark">{item.location}</span>
                      </td>
                      <td className="py-3">
                        <span className="text-dark">
                          {new Date(item.expirationDate).toLocaleDateString('es-ES')}
                        </span>
                      </td>
                      <td className="py-3">
                        <Badge 
                          bg={getStatusVariant(item.status)}
                          className="px-2 py-1"
                          style={{ fontSize: '0.75rem' }}
                        >
                          {getStatusText(item.status)}
                        </Badge>
                      </td>
                      <td className="py-3">
                        <span className="text-dark fw-medium">
                          ${(item.quantity * item.price).toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="d-flex gap-1">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            style={{ borderRadius: '4px' }}
                          >
                            <FaEdit size={12} />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(item.id)}
                            style={{ borderRadius: '4px' }}
                          >
                            <FaTrash size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default KitchenInventory;