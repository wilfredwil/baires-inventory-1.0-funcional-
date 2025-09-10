// src/components/ItemForm.js - Versión mejorada
import React, { useState, useEffect } from 'react';
import { 
  Form, 
  Button, 
  Row, 
  Col, 
  Alert, 
  InputGroup,
  Modal,
  Badge
} from 'react-bootstrap';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp,
  getDocs,
  query,
  where 
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  FaPlus, 
  FaWineBottle, 
  FaUtensils, 
  FaTruck,
  FaSave,
  FaTimes 
} from 'react-icons/fa';

const ItemForm = ({ 
  editingItem, 
  onSuccess, 
  onCancel, 
  currentUser, 
  userRole,
  providers,
  inventoryType = 'bar',
  canEditAllFields = false 
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    marca: '',
    tipo: '',
    stock: '',
    unidad: '',
    umbral_low: '',
    precio: '',
    proveedor_id: '',
    tipo_inventario: inventoryType
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showProviderForm, setShowProviderForm] = useState(false);
  const [newProvider, setNewProvider] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    tipo: inventoryType
  });

  // Filtrar proveedores por tipo de inventario
  const filteredProviders = providers.filter(provider => 
    provider.tipo === inventoryType
  );

  // Opciones según el tipo de inventario
  const getTypeOptions = () => {
    if (inventoryType === 'bar') {
      return [
        'Whisky', 'Ron', 'Vodka', 'Gin', 'Tequila', 'Licor', 
        'Cerveza', 'Vino', 'Champagne', 'Aperitivo', 'Sin Alcohol', 'Mixers'
      ];
    } else {
      return [
        'Carnes', 'Pescados', 'Verduras', 'Lácteos', 'Cereales',
        'Condimentos', 'Aceites', 'Conservas', 'Panadería', 'Congelados',
        'Frutas', 'Hierbas', 'Especias'
      ];
    }
  };

  const getUnitOptions = () => {
    if (inventoryType === 'bar') {
      return ['ml', 'L', 'oz', 'botellas', 'latas', 'cajas'];
    } else {
      return ['kg', 'g', 'L', 'ml', 'unidades', 'paquetes', 'cajas', 'latas'];
    }
  };

  useEffect(() => {
    if (editingItem) {
      setFormData({
        nombre: editingItem.nombre || '',
        marca: editingItem.marca || '',
        tipo: editingItem.tipo || '',
        stock: editingItem.stock || '',
        unidad: editingItem.unidad || '',
        umbral_low: editingItem.umbral_low || '',
        precio: editingItem.precio || '',
        proveedor_id: editingItem.proveedor_id || '',
        tipo_inventario: editingItem.tipo_inventario || inventoryType
      });
    } else {
      setFormData(prev => ({
        ...prev,
        tipo_inventario: inventoryType
      }));
    }
  }, [editingItem, inventoryType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProviderInputChange = (e) => {
    const { name, value } = e.target;
    setNewProvider(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddProvider = async (e) => {
    e.preventDefault();
    
    if (!newProvider.nombre.trim()) {
      setError('El nombre del proveedor es obligatorio');
      return;
    }

    setLoading(true);
    try {
      const providerData = {
        ...newProvider,
        tipo: inventoryType, // Asegurar que el proveedor tenga el tipo correcto
        fecha_creacion: serverTimestamp(),
        creado_por: currentUser.email
      };

      const docRef = await addDoc(collection(db, 'providers'), providerData);
      
      // Actualizar el formulario para seleccionar el nuevo proveedor
      setFormData(prev => ({
        ...prev,
        proveedor_id: docRef.id
      }));

      // Limpiar el formulario de proveedor
      setNewProvider({
        nombre: '',
        contacto: '',
        telefono: '',
        email: '',
        tipo: inventoryType
      });

      setShowProviderForm(false);
      setError('');
      
      // Recargar la página para obtener el nuevo proveedor
      window.location.reload();
      
    } catch (error) {
      console.error('Error adding provider:', error);
      setError('Error al agregar el proveedor');
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.nombre.trim()) {
      setError('El nombre del producto es obligatorio');
      return;
    }

    if (!canEditAllFields && editingItem) {
      // Para usuarios con permisos limitados, solo validar stock
      if (!formData.stock || isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
        setError('Ingrese un stock válido (número mayor o igual a 0)');
        return;
      }
    } else {
      // Validaciones completas para admin/manager
      if (!formData.tipo) {
        setError('Seleccione un tipo de producto');
        return;
      }

      if (!formData.stock || isNaN(Number(formData.stock)) || Number(formData.stock) < 0) {
        setError('Ingrese un stock válido');
        return;
      }

      if (!formData.unidad) {
        setError('Seleccione una unidad');
        return;
      }

      if (!formData.umbral_low || isNaN(Number(formData.umbral_low)) || Number(formData.umbral_low) < 0) {
        setError('Ingrese un umbral mínimo válido');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const now = new Date();
      const itemData = {
        ...formData,
        stock: Number(formData.stock),
        precio: formData.precio ? Number(formData.precio) : 0,
        umbral_low: formData.umbral_low ? Number(formData.umbral_low) : 0,
        ultima_actualizacion: now,
        actualizado_por: currentUser.email,
        tipo_inventario: inventoryType // Asegurar que se guarde el tipo correcto
      };

      let historialData = {
        item_nombre: formData.nombre,
        usuario: currentUser.email,
        fecha: serverTimestamp(),
        tipo_inventario: inventoryType
      };

      if (editingItem) {
        // Actualizar item existente
        const itemRef = doc(db, 'inventario', editingItem.id);
        
        if (!canEditAllFields) {
          // Solo actualizar stock para usuarios limitados
          const limitedUpdate = {
            stock: Number(formData.stock),
            ultima_actualizacion: now,
            actualizado_por: currentUser.email
          };
          await updateDoc(itemRef, limitedUpdate);
          
          historialData = {
            ...historialData,
            tipo: 'actualizacion_stock',
            stock_anterior: editingItem.stock,
            stock_nuevo: formData.stock,
            detalles: `Stock actualizado de ${editingItem.stock} a ${formData.stock} ${editingItem.unidad}`
          };
        } else {
          // Actualización completa para admin/manager
          await updateDoc(itemRef, itemData);
          
          historialData = {
            ...historialData,
            tipo: 'actualizacion',
            detalles: `Producto actualizado en inventario de ${inventoryType}`
          };
        }
      } else {
        // Crear nuevo item
        itemData.fecha_creacion = now;
        itemData.creado_por = currentUser.email;
        
        await addDoc(collection(db, 'inventario'), itemData);
        
        historialData = {
          ...historialData,
          tipo: 'creacion',
          detalles: `Nuevo producto agregado al inventario de ${inventoryType}`
        };
      }

      // Registrar en historial
      await addDoc(collection(db, 'historial'), historialData);

      onSuccess();
    } catch (error) {
      console.error('Error saving item:', error);
      setError('Error al guardar el producto');
    }
    
    setLoading(false);
  };

  return (
    <div>
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        {/* Header del formulario */}
        <div className="mb-4">
          <div className="d-flex align-items-center mb-2">
            {inventoryType === 'bar' ? (
              <FaWineBottle className="me-2 text-primary" />
            ) : (
              <FaUtensils className="me-2 text-success" />
            )}
            <h5 className="mb-0">
              {editingItem ? 'Editar Producto' : 'Nuevo Producto'} - 
              <Badge bg={inventoryType === 'bar' ? 'primary' : 'success'} className="ms-2">
                {inventoryType === 'bar' ? 'Bar' : 'Cocina'}
              </Badge>
            </h5>
          </div>
          
          {!canEditAllFields && editingItem && (
            <Alert variant="info" className="mb-3">
              <small>
                Solo puedes actualizar el stock de este producto.
                Para modificar otros campos, contacta al administrador.
              </small>
            </Alert>
          )}
        </div>

        <Row>
          {/* Información básica */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Nombre del Producto *</Form.Label>
              <Form.Control
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ej: Whisky Jack Daniels"
                disabled={!canEditAllFields && editingItem}
                required
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Marca</Form.Label>
              <Form.Control
                type="text"
                name="marca"
                value={formData.marca}
                onChange={handleInputChange}
                placeholder="Ej: Jack Daniels"
                disabled={!canEditAllFields && editingItem}
              />
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Tipo *</Form.Label>
              <Form.Select
                name="tipo"
                value={formData.tipo}
                onChange={handleInputChange}
                disabled={!canEditAllFields && editingItem}
                required
              >
                <option value="">Seleccionar tipo</option>
                {getTypeOptions().map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Proveedor</Form.Label>
              <InputGroup>
                <Form.Select
                  name="proveedor_id"
                  value={formData.proveedor_id}
                  onChange={handleInputChange}
                  disabled={!canEditAllFields && editingItem}
                >
                  <option value="">Sin proveedor</option>
                  {filteredProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.nombre}
                    </option>
                  ))}
                </Form.Select>
                {canEditAllFields && (
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowProviderForm(true)}
                    disabled={loading}
                  >
                    <FaPlus />
                  </Button>
                )}
              </InputGroup>
              <Form.Text className="text-muted">
                Proveedores disponibles para {inventoryType === 'bar' ? 'bar' : 'cocina'}
              </Form.Text>
            </Form.Group>
          </Col>

          {/* Stock y unidades */}
          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Stock Actual *</Form.Label>
              <Form.Control
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                required
              />
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Unidad *</Form.Label>
              <Form.Select
                name="unidad"
                value={formData.unidad}
                onChange={handleInputChange}
                disabled={!canEditAllFields && editingItem}
                required
              >
                <option value="">Seleccionar unidad</option>
                {getUnitOptions().map((unidad) => (
                  <option key={unidad} value={unidad}>{unidad}</option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>

          <Col md={4}>
            <Form.Group className="mb-3">
              <Form.Label>Umbral Mínimo *</Form.Label>
              <Form.Control
                type="number"
                name="umbral_low"
                value={formData.umbral_low}
                onChange={handleInputChange}
                placeholder="0"
                min="0"
                step="0.01"
                disabled={!canEditAllFields && editingItem}
                required
              />
              <Form.Text className="text-muted">
                Alerta cuando el stock baje de este nivel
              </Form.Text>
            </Form.Group>
          </Col>

          {/* Precio */}
          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Precio Unitario (opcional)</Form.Label>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="number"
                  name="precio"
                  value={formData.precio}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  disabled={!canEditAllFields && editingItem}
                />
              </InputGroup>
            </Form.Group>
          </Col>

          <Col md={6}>
            <Form.Group className="mb-3">
              <Form.Label>Valor Total del Stock</Form.Label>
              <InputGroup>
                <InputGroup.Text>$</InputGroup.Text>
                <Form.Control
                  type="text"
                  value={
                    formData.stock && formData.precio 
                      ? (Number(formData.stock) * Number(formData.precio)).toLocaleString()
                      : '0'
                  }
                  disabled
                  className="bg-light"
                />
              </InputGroup>
              <Form.Text className="text-muted">
                Calculado automáticamente
              </Form.Text>
            </Form.Group>
          </Col>
        </Row>

        {/* Información adicional para productos existentes */}
        {editingItem && (
          <Row className="mt-3">
            <Col md={12}>
              <div className="bg-light p-3 rounded">
                <h6 className="mb-2">Información del Producto</h6>
                <Row>
                  <Col md={4}>
                    <small className="text-muted">Creado por:</small><br/>
                    <small>{editingItem.creado_por || 'N/A'}</small>
                  </Col>
                  <Col md={4}>
                    <small className="text-muted">Fecha de creación:</small><br/>
                    <small>
                      {editingItem.fecha_creacion?.toDate ? 
                        editingItem.fecha_creacion.toDate().toLocaleDateString() : 
                        'N/A'
                      }
                    </small>
                  </Col>
                  <Col md={4}>
                    <small className="text-muted">Última actualización:</small><br/>
                    <small>
                      {editingItem.ultima_actualizacion?.toDate ? 
                        editingItem.ultima_actualizacion.toDate().toLocaleDateString() : 
                        'N/A'
                      }
                    </small>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        )}

        {/* Botones */}
        <div className="d-flex justify-content-end gap-2 mt-4">
          <Button 
            variant="secondary" 
            onClick={onCancel}
            disabled={loading}
          >
            <FaTimes className="me-1" />
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Guardando...
              </>
            ) : (
              <>
                <FaSave className="me-1" />
                {editingItem ? 'Actualizar' : 'Guardar'}
              </>
            )}
          </Button>
        </div>
      </Form>

      {/* Modal para agregar proveedor */}
      <Modal 
        show={showProviderForm} 
        onHide={() => setShowProviderForm(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTruck className="me-2" />
            Nuevo Proveedor - {inventoryType === 'bar' ? 'Bar' : 'Cocina'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleAddProvider}>
          <Modal.Body>
            <Alert variant="info" className="mb-3">
              <small>
                Este proveedor será creado específicamente para el inventario de {' '}
                <strong>{inventoryType === 'bar' ? 'bar' : 'cocina'}</strong>.
              </small>
            </Alert>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre del Proveedor *</Form.Label>
                  <Form.Control
                    type="text"
                    name="nombre"
                    value={newProvider.nombre}
                    onChange={handleProviderInputChange}
                    placeholder="Ej: Distribuidora Los Andes"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Persona de Contacto</Form.Label>
                  <Form.Control
                    type="text"
                    name="contacto"
                    value={newProvider.contacto}
                    onChange={handleProviderInputChange}
                    placeholder="Ej: Juan Pérez"
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Teléfono</Form.Label>
                  <Form.Control
                    type="tel"
                    name="telefono"
                    value={newProvider.telefono}
                    onChange={handleProviderInputChange}
                    placeholder="Ej: +54 11 1234-5678"
                  />
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={newProvider.email}
                    onChange={handleProviderInputChange}
                    placeholder="Ej: ventas@distribuidora.com"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowProviderForm(false)}
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
                  <span className="spinner-border spinner-border-sm me-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <FaPlus className="me-1" />
                  Agregar Proveedor
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
};

export default ItemForm;