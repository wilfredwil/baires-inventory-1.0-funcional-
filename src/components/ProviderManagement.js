// ProviderManagement.js - Componente para gestión de proveedores
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Alert, Spinner } from 'react-bootstrap';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { FaEdit, FaTrash, FaPlus, FaBuilding } from 'react-icons/fa';

const ProviderManagement = ({ user, userRole, show, onHide }) => {
  const [providers, setProviders] = useState([]);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados del formulario
  const [formData, setFormData] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    direccion: '',
    productos: [],
    activo: true
  });

  // Validaciones
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (show) {
      fetchProviders();
    }
  }, [show]);

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
      productos: [],
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
      fetchProviders();
      
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
      productos: provider.productos || [],
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
      fetchProviders();
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

  if (userRole !== 'admin') {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Acceso Restringido</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Solo los administradores pueden gestionar proveedores.
          </Alert>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <>
      {/* Modal Principal de Gestión de Proveedores */}
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBuilding className="me-2" />
            Gestión de Proveedores
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6>Lista de Proveedores</h6>
            <Button 
              variant="primary" 
              onClick={handleAddNew}
              disabled={loading}
            >
              <FaPlus className="me-1" />
              Nuevo Proveedor
            </Button>
          </div>

          {loading && !providers.length ? (
            <div className="text-center p-3">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Contacto</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No hay proveedores registrados
                    </td>
                  </tr>
                ) : (
                  providers.map(provider => (
                    <tr key={provider.id}>
                      <td>
                        <strong>{provider.nombre}</strong>
                        {provider.direccion && (
                          <div className="text-muted small">{provider.direccion}</div>
                        )}
                      </td>
                      <td>{provider.contacto}</td>
                      <td>{provider.telefono || '-'}</td>
                      <td>{provider.email || '-'}</td>
                      <td>
                        <span className={`badge ${provider.activo !== false ? 'bg-success' : 'bg-secondary'}`}>
                          {provider.activo !== false ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleEdit(provider)}
                          className="me-1"
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal para Crear/Editar Proveedor */}
      <Modal show={showProviderModal} onHide={() => setShowProviderModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingProvider ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
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

            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="contacto@proveedor.com"
                maxLength="100"
                isInvalid={!!formErrors.email}
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.email}
              </Form.Control.Feedback>
            </Form.Group>

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
              {loading && <Spinner as="span" animation="border" size="sm" className="me-2" />}
              {editingProvider ? 'Actualizar' : 'Crear'} Proveedor
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default ProviderManagement;