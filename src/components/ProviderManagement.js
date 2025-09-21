// src/components/ProviderManagement.js - VERSIÓN ACTUALIZADA CON MÚLTIPLES CONTACTOS
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
  FaMapMarkerAlt, FaUser, FaCheckCircle, FaTimesCircle, FaSearch, FaTimes
} from 'react-icons/fa';

const ProviderManagement = ({ user, userRole, onBack }) => {
  const [providers, setProviders] = useState([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Estados del formulario actualizado
  const [formData, setFormData] = useState({
    empresa: '',
    contactos: [{ nombre: '', email: '', telefono: '', especialidad: '', esPreferido: false }],
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
      const q = query(providersRef, orderBy('empresa'));
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
      empresa: '',
      contactos: [{ nombre: '', email: '', telefono: '', especialidad: '', esPreferido: false }],
      direccion: '',
      activo: true
    });
    setFormErrors({});
    setEditingProvider(null);
  };

  const validateForm = () => {
    const errors = {};

    // Ahora ningún campo es obligatorio según tu solicitud
    // Solo validamos formatos si se proporcionan datos

    // Validar emails de contactos (solo si se proporcionan)
    formData.contactos.forEach((contacto, index) => {
      if (contacto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.email)) {
        errors[`contacto_email_${index}`] = 'Formato de email inválido';
      }
      if (contacto.telefono && !/^\+?[\d\s\-\(\)]+$/.test(contacto.telefono)) {
        errors[`contacto_telefono_${index}`] = 'Formato de teléfono inválido';
      }
    });

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

  const handleContactoChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      contactos: prev.contactos.map((contacto, i) => 
        i === index ? { ...contacto, [field]: value } : contacto
      )
    }));

    // Limpiar errores del contacto
    const errorKey = `contacto_${field}_${index}`;
    if (formErrors[errorKey]) {
      setFormErrors(prev => ({
        ...prev,
        [errorKey]: ''
      }));
    }
  };

  const agregarContacto = () => {
    setFormData(prev => ({
      ...prev,
      contactos: [...prev.contactos, { nombre: '', email: '', telefono: '', especialidad: '', esPreferido: false }]
    }));
  };

  const eliminarContacto = (index) => {
    if (formData.contactos.length > 1) {
      setFormData(prev => ({
        ...prev,
        contactos: prev.contactos.filter((_, i) => i !== index)
      }));
    }
  };

  const marcarComoPreferido = (index) => {
    setFormData(prev => ({
      ...prev,
      contactos: prev.contactos.map((contacto, i) => ({
        ...contacto,
        esPreferido: i === index
      }))
    }));
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
        empresa: formData.empresa.trim(),
        contactos: formData.contactos.filter(c => c.nombre.trim() || c.email.trim() || c.telefono.trim()),
        direccion: formData.direccion.trim(),
        activo: formData.activo,
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
    
    // Migrar datos antiguos al nuevo formato si es necesario
    let contactos = [];
    if (provider.contactos && Array.isArray(provider.contactos)) {
      contactos = provider.contactos.map(c => ({
        ...c,
        especialidad: c.especialidad || '' // Asegurar que tenga especialidad
      }));
    } else if (provider.contacto || provider.email || provider.telefono) {
      // Migrar formato antiguo
      contactos = [{
        nombre: provider.contacto || '',
        email: provider.email || '',
        telefono: provider.telefono || '',
        especialidad: provider.tipoProveedor || '',
        esPreferido: true
      }];
    }
    
    if (contactos.length === 0) {
      contactos = [{ nombre: '', email: '', telefono: '', especialidad: '', esPreferido: false }];
    }

    setFormData({
      empresa: provider.empresa || provider.nombre || '',
      contactos: contactos,
      direccion: provider.direccion || '',
      activo: provider.activo !== false
    });
    setShowProviderModal(true);
  };

  const handleDelete = async (provider) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el proveedor "${provider.empresa || provider.nombre}"?`)) {
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

  // Filtrar proveedores por búsqueda (adaptado al nuevo formato)
  const filteredProviders = providers.filter(provider => {
    const empresa = provider.empresa || provider.nombre || '';
    
    // Buscar en contactos (nombre, email y especialidad)
    const contactMatch = provider.contactos ? 
      provider.contactos.some(c => 
        c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.especialidad?.toLowerCase().includes(searchTerm.toLowerCase())
      ) : 
      (provider.contacto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       provider.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       provider.tipoProveedor?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return empresa.toLowerCase().includes(searchTerm.toLowerCase()) || contactMatch;
  });

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
              <h4 className="text-info">
                {providers.reduce((count, p) => {
                  const vinoContacts = p.contactos ? 
                    p.contactos.filter(c => c.especialidad?.toLowerCase().includes('vino')).length :
                    (p.tipoProveedor?.toLowerCase().includes('vino') ? 1 : 0);
                  return count + vinoContacts;
                }, 0)}
              </h4>
              <small className="text-muted">Contactos de Vino</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center">
            <Card.Body>
              <h4 className="text-warning">
                {providers.reduce((count, p) => {
                  const licorContacts = p.contactos ? 
                    p.contactos.filter(c => c.especialidad?.toLowerCase().includes('licor')).length :
                    (p.tipoProveedor?.toLowerCase().includes('licor') ? 1 : 0);
                  return count + licorContacts;
                }, 0)}
              </h4>
              <small className="text-muted">Contactos de Licor</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Barra de búsqueda */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <div className="position-relative">
                  <FaSearch 
                    className="position-absolute text-muted" 
                    style={{ 
                      top: '50%', 
                      left: '12px', 
                      transform: 'translateY(-50%)', 
                      zIndex: 5 
                    }} 
                  />
                  <Form.Control
                    type="text"
                    placeholder="Buscar por empresa, contacto o especialidad..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ paddingLeft: '40px' }}
                  />
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Tabla de proveedores */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">
            Lista de Proveedores ({filteredProviders.length})
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" />
              <p className="mt-2">Cargando proveedores...</p>
            </div>
          ) : (
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Empresa</th>
                  <th>Contactos</th>
                  <th>Dirección</th>
                  <th>Estado</th>
                  <th width="120">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredProviders.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center p-4">
                      {searchTerm ? 'No se encontraron proveedores que coincidan con la búsqueda' : 'No hay proveedores registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredProviders.map(provider => {
                    // Compatibilidad con formato antiguo
                    const empresa = provider.empresa || provider.nombre || 'Sin nombre';
                    const contactos = provider.contactos || (provider.contacto ? [{
                      nombre: provider.contacto,
                      email: provider.email,
                      telefono: provider.telefono,
                      especialidad: provider.tipoProveedor || '',
                      esPreferido: true
                    }] : []);
                    const contactoPreferido = contactos.find(c => c.esPreferido) || contactos[0];

                    return (
                      <tr key={provider.id}>
                        <td>
                          <strong>{empresa}</strong>
                        </td>
                        <td>
                          {contactos.length > 0 ? (
                            <div>
                              {contactoPreferido && (
                                <div className="mb-1">
                                  <div className="d-flex align-items-center gap-2 mb-1">
                                    <strong>{contactoPreferido.nombre}</strong>
                                    {contactoPreferido.esPreferido && (
                                      <Badge bg="success" style={{fontSize: '0.6em'}}>
                                        Preferido
                                      </Badge>
                                    )}
                                    {contactoPreferido.especialidad && (
                                      <Badge bg="info" style={{fontSize: '0.6em'}}>
                                        {contactoPreferido.especialidad}
                                      </Badge>
                                    )}
                                  </div>
                                  <small className="text-muted">
                                    {contactoPreferido.email && (
                                      <><FaEnvelope className="me-1" />{contactoPreferido.email}<br /></>
                                    )}
                                    {contactoPreferido.telefono && (
                                      <><FaPhone className="me-1" />{contactoPreferido.telefono}</>
                                    )}
                                  </small>
                                </div>
                              )}
                              {contactos.length > 1 && (
                                <small className="text-muted">
                                  +{contactos.length - 1} contacto{contactos.length - 1 !== 1 ? 's' : ''} más
                                </small>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted">Sin contactos</span>
                          )}
                        </td>
                        <td>
                          {provider.direccion ? (
                            <small>
                              <FaMapMarkerAlt className="me-1 text-muted" />
                              {provider.direccion}
                            </small>
                          ) : (
                            <span className="text-muted">Sin dirección</span>
                          )}
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
                    );
                  })
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
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre de la Empresa</Form.Label>
                  <Form.Control
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleInputChange}
                    placeholder="Ej: Empire Distribuidora"
                    maxLength="100"
                  />
                  <Form.Text className="text-muted">
                    Nombre de la empresa proveedora
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            {/* Sección de Contactos */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <Form.Label className="mb-0">Contactos</Form.Label>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={agregarContacto}
                  type="button"
                >
                  <FaPlus className="me-1" />
                  Agregar Contacto
                </Button>
              </div>

              {formData.contactos.map((contacto, index) => (
                <Card key={index} className="mb-2" style={{ backgroundColor: '#f8f9fa' }}>
                  <Card.Body className="py-3">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="mb-0">Contacto {index + 1}</h6>
                      <div className="d-flex gap-2">
                        {!contacto.esPreferido && (
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => marcarComoPreferido(index)}
                            type="button"
                          >
                            Marcar como Preferido
                          </Button>
                        )}
                        {contacto.esPreferido && (
                          <Badge bg="success">Contacto Preferido</Badge>
                        )}
                        {formData.contactos.length > 1 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => eliminarContacto(index)}
                            type="button"
                          >
                            <FaTimes />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Row>
                      <Col md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label>Nombre</Form.Label>
                          <Form.Control
                            type="text"
                            value={contacto.nombre}
                            onChange={(e) => handleContactoChange(index, 'nombre', e.target.value)}
                            placeholder="Nombre del contacto"
                            maxLength="100"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label>Email</Form.Label>
                          <Form.Control
                            type="email"
                            value={contacto.email}
                            onChange={(e) => handleContactoChange(index, 'email', e.target.value)}
                            placeholder="email@ejemplo.com"
                            isInvalid={!!formErrors[`contacto_email_${index}`]}
                          />
                          <Form.Control.Feedback type="invalid">
                            {formErrors[`contacto_email_${index}`]}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label>Teléfono</Form.Label>
                          <Form.Control
                            type="text"
                            value={contacto.telefono}
                            onChange={(e) => handleContactoChange(index, 'telefono', e.target.value)}
                            placeholder="+1234567890"
                            isInvalid={!!formErrors[`contacto_telefono_${index}`]}
                          />
                          <Form.Control.Feedback type="invalid">
                            {formErrors[`contacto_telefono_${index}`]}
                          </Form.Control.Feedback>
                        </Form.Group>
                      </Col>
                      <Col md={3}>
                        <Form.Group className="mb-2">
                          <Form.Label>Especialidad</Form.Label>
                          <Form.Select
                            value={contacto.especialidad}
                            onChange={(e) => handleContactoChange(index, 'especialidad', e.target.value)}
                          >
                            <option value="">Seleccionar...</option>
                            <option value="vino">Vino</option>
                            <option value="licor">Licor</option>
                            <option value="vino y licor">Vino y Licor</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              ))}
            </div>

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