// src/components/ProviderManagement.js - VERSIÓN STANDALONE COMPLETA
import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Table, Alert, Spinner, Modal, Badge 
} from 'react-bootstrap';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FaEdit, FaTrash, FaPlus, FaBuilding, FaArrowLeft, FaPhone, FaEnvelope, 
  FaMapMarkerAlt, FaUser, FaCheckCircle, FaTimesCircle, FaSearch
} from 'react-icons/fa';

const ProviderManagement = ({ user, userRole, onBack }) => {
  const [providers, setProviders] = useState([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    activo: true
  });

  // Validaciones
  const [formErrors, setFormErrors] = useState({});

  // Cargar proveedores al montar el componente
  useEffect(() => {
    fetchProviders();
  }, []);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const providersRef = collection(db, 'providers');
      const q = query(providersRef, orderBy('nombre'));
      const snapshot = await getDocs(q);
      const providersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProviders(providersData);
      setError('');
    } catch (error) {
      console.error('Error fetching providers:', error);
      setError('Error al cargar los proveedores');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      contacto: '',
      telefono: '',
      email: '',
      direccion: '',
      activo: true
    });
    setFormErrors({});
    setEditingProvider(null);
  };

  const validateForm = () => {
    const errors = {};

    // Validar nombre (obligatorio, min 2 caracteres)
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es obligatorio';
    } else if (formData.nombre.trim().length < 2) {
      errors.nombre = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar contacto (obligatorio)
    if (!formData.contacto.trim()) {
      errors.contacto = 'El contacto es obligatorio';
    }

    // Validar teléfono (opcional pero si se proporciona debe ser válido)
    if (formData.telefono && !/^\+?[\d\s\-\(\)]+$/.test(formData.telefono)) {
      errors.telefono = 'Formato de teléfono inválido';
    }

    // Validar email (opcional pero si se proporciona debe ser válido)
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Formato de email inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const providerData = {
        ...formData,
        nombre: formData.nombre.trim(),
        contacto: formData.contacto.trim(),
        email: formData.email.trim(),
        direccion: formData.direccion.trim(),
        telefono: formData.telefono.trim(),
        updatedAt: new Date(),
        updatedBy: user.email
      };

      if (editingProvider) {
        // Actualizar proveedor existente
        await updateDoc(doc(db, 'providers', editingProvider.id), providerData);
        setSuccess('Proveedor actualizado exitosamente');
      } else {
        // Crear nuevo proveedor
        providerData.createdAt = new Date();
        providerData.createdBy = user.email;
        await addDoc(collection(db, 'providers'), providerData);
        setSuccess('Proveedor creado exitosamente');
      }

      setShowProviderModal(false);
      resetForm();
      await fetchProviders();
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving provider:', error);
      setError('Error al guardar el proveedor');
    }
    setLoading(false);
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setFormData({
      nombre: provider.nombre || '',
      contacto: provider.contacto || '',
      telefono: provider.telefono || '',
      email: provider.email || '',
      direccion: provider.direccion || '',
      activo: provider.activo !== false
    });
    setShowProviderModal(true);
  };

  const handleDelete = async (provider) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el proveedor "${provider.nombre}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'providers', provider.id));
      setSuccess('Proveedor eliminado exitosamente');
      await fetchProviders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting provider:', error);
      setError('Error al eliminar el proveedor');
    }
    setLoading(false);
  };

  const handleAddNew = () => {
    resetForm();
    setShowProviderModal(true);
  };

  // Filtrar proveedores por búsqueda
  const filteredProviders = providers.filter(provider =>
    provider.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    provider.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Verificar permisos
  if (userRole !== 'admin' && userRole !== 'manager') {
    return (
      <Container className="py-4">
        <Alert variant="warning">
          <h5>Acceso Restringido</h5>
          <p>Solo los administradores y gerentes pueden gestionar proveedores.</p>
          <Button variant="primary" onClick={onBack}>
            <FaArrowLeft className="me-2" />
            Volver al Dashboard
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header con botón de regreso */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center">
              <Button 
                variant="outline-secondary" 
                onClick={onBack}
                className="me-3"
              >
                <FaArrowLeft />
              </Button>
              <div>
                <h2 className="mb-0">
                  <FaBuilding className="me-2 text-primary" />
                  Gestión de Proveedores
                </h2>
                <p className="text-muted mb-0">
                  Administra la información de tus proveedores
                </p>
              </div>
            </div>
            <Button 
              variant="primary" 
              onClick={handleAddNew}
              disabled={loading}
            >
              <FaPlus className="me-2" />
              Nuevo Proveedor
            </Button>
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

      {/* Estadísticas rápidas */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-primary">{providers.length}</h4>
              <small className="text-muted">Total Proveedores</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-success">
                {providers.filter(p => p.activo !== false).length}
              </h4>
              <small className="text-muted">Activos</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-warning">
                {providers.filter(p => p.activo === false).length}
              </h4>
              <small className="text-muted">Inactivos</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-info">
                {providers.filter(p => p.email && p.email.trim()).length}
              </h4>
              <small className="text-muted">Con Email</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filtros y búsqueda */}
      <Row className="mb-3">
        <Col md={6}>
          <Form.Group>
            <div className="position-relative">
              <FaSearch 
                className="position-absolute" 
                style={{ 
                  left: '12px', 
                  top: '50%', 
                  transform: 'translateY(-50%)',
                  color: '#6c757d'
                }} 
              />
              <Form.Control
                type="text"
                placeholder="Buscar por nombre, contacto o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '35px' }}
              />
            </div>
          </Form.Group>
        </Col>
      </Row>

      {/* Tabla de proveedores */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Lista de Proveedores</h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading && !providers.length ? (
            <div className="text-center p-4">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
            </div>
          ) : (
            <Table striped bordered hover responsive className="mb-0">
              <thead className="table-dark">
                <tr>
                  <th>Proveedor</th>
                  <th>Contacto</th>
                  <th>Comunicación</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">
                      {searchTerm ? 
                        'No se encontraron proveedores que coincidan con la búsqueda' :
                        'No hay proveedores registrados'
                      }
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map(provider => (
                    <tr key={provider.id}>
                      <td>
                        <div>
                          <strong className="text-primary">
                            {provider.nombre}
                          </strong>
                          {provider.direccion && (
                            <div className="text-muted small mt-1">
                              <FaMapMarkerAlt className="me-1" />
                              {provider.direccion}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="d-flex align-items-center">
                          <FaUser className="me-2 text-muted" />
                          {provider.contacto}
                        </div>
                      </td>
                      <td>
                        <div>
                          {provider.telefono && (
                            <div className="mb-1">
                              <FaPhone className="me-2 text-success" />
                              <small>{provider.telefono}</small>
                            </div>
                          )}
                          {provider.email && (
                            <div>
                              <FaEnvelope className="me-2 text-info" />
                              <small>{provider.email}</small>
                            </div>
                          )}
                          {!provider.telefono && !provider.email && (
                            <span className="text-muted">Sin contacto</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {provider.activo !== false ? (
                          <Badge bg="success" className="d-flex align-items-center" style={{ width: 'fit-content' }}>
                            <FaCheckCircle className="me-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="d-flex align-items-center" style={{ width: 'fit-content' }}>
                            <FaTimesCircle className="me-1" />
                            Inactivo
                          </Badge>
                        )}
                      </td>
                      <td>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEdit(provider)}
                            disabled={loading}
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDelete(provider)}
                            disabled={loading}
                          >
                            <FaTrash />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Modal para Crear/Editar Proveedor */}
      <Modal 
        show={showProviderModal} 
        onHide={() => setShowProviderModal(false)} 
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBuilding className="me-2" />
            {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre del Proveedor *</Form.Label>
                  <Form.Control
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Ej: Distribuidora ABC"
                    maxLength="100"
                    isInvalid={!!formErrors.nombre}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.nombre}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Persona de Contacto *</Form.Label>
                  <Form.Control
                    type="text"
                    name="contacto"
                    value={formData.contacto}
                    onChange={handleInputChange}
                    placeholder="Ej: Juan Pérez"
                    maxLength="100"
                    isInvalid={!!formErrors.contacto}
                    required
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.contacto}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="Ej: +54 11 1234-5678"
                    maxLength="20"
                    isInvalid={!!formErrors.telefono}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.telefono}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Ej: contacto@empresa.com"
                    maxLength="100"
                    isInvalid={!!formErrors.email}
                  />
                  <Form.Control.Feedback type="invalid">
                    {formErrors.email}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Dirección</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                name="direccion"
                value={formData.direccion}
                onChange={handleInputChange}
                placeholder="Dirección completa del proveedor"
                maxLength="200"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="activo"
                checked={formData.activo}
                onChange={handleInputChange}
                label="Proveedor activo"
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowProviderModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    className="me-2"
                  />
                  Guardando...
                </>
              ) : (
                editingProvider ? 'Actualizar' : 'Crear Proveedor'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ProviderManagement;