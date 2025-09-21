// src/components/InventoryItemForm.js - CORREGIDO PARA MOSTRAR SIEMPRE EL CAMPO PROVEEDOR
// ⚠️ IMPORTANTE: Este es el archivo que usa BarInventory, NO ItemForm.js
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const InventoryItemForm = ({ 
  show, 
  onHide, 
  item = null, 
  userRole, 
  user, 
  onSuccess,
  providers = [] 
}) => {
  const [formData, setFormData] = useState({
    nombre: '',
    marca: '',
    tipo: 'licor',
    subTipo: '',
    origen: '',
    stock: 0,
    umbral_low: 5,
    proveedor_id: '',
    precio: 0,
    descripcion: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isEditing = !!item;
  const canEditAllFields = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    if (item) {
      setFormData({
        nombre: item.nombre || '',
        marca: item.marca || '',
        tipo: item.tipo || 'licor',
        subTipo: item.subTipo || '',
        origen: item.origen || '',
        stock: item.stock !== undefined ? parseFloat(item.stock) || 0 : 0,
        umbral_low: item.umbral_low !== undefined ? parseFloat(item.umbral_low) || 5 : 5,
        proveedor_id: item.proveedor_id || '',
        precio: item.precio !== undefined ? parseFloat(item.precio) || 0 : 0,
        descripcion: item.descripcion || ''
      });
    } else {
      // Reset form for new item
      setFormData({
        nombre: '',
        marca: '',
        tipo: 'licor',
        subTipo: '',
        origen: '',
        stock: 0,
        umbral_low: 5,
        proveedor_id: '',
        precio: 0,
        descripcion: ''
      });
    }
    setErrors({});
    setSubmitError('');
  }, [item, show]);

  const validateForm = () => {
    const newErrors = {};

    // Validaciones para campos que todos pueden editar
    const stockValue = parseFloat(formData.stock) || 0;
    if (stockValue < 0) {
      newErrors.stock = 'El stock no puede ser negativo';
    }
    if (stockValue > 10000) {
      newErrors.stock = 'El stock no puede exceder 10,000 unidades';
    }

    // Validaciones para campos que solo admin/manager pueden editar
    if (canEditAllFields) {
      if (!formData.nombre.trim()) {
        newErrors.nombre = 'El nombre es obligatorio';
      } else if (formData.nombre.length < 2) {
        newErrors.nombre = 'El nombre debe tener al menos 2 caracteres';
      } else if (formData.nombre.length > 100) {
        newErrors.nombre = 'El nombre no puede exceder 100 caracteres';
      }

      const umbralValue = parseFloat(formData.umbral_low) || 0;
      if (umbralValue < 0) {
        newErrors.umbral_low = 'El umbral no puede ser negativo';
      }
      if (umbralValue > 1000) {
        newErrors.umbral_low = 'El umbral no puede exceder 1,000 unidades';
      }

      const precioValue = parseFloat(formData.precio) || 0;
      if (precioValue < 0) {
        newErrors.precio = 'El precio no puede ser negativo';
      }
      if (precioValue > 100000) {
        newErrors.precio = 'El precio no puede exceder $100,000';
      }

      // Validaciones específicas por tipo
      if (formData.tipo === 'licor' && !formData.subTipo) {
        newErrors.subTipo = 'El sub-tipo es obligatorio para licores';
      }

      if (formData.tipo === 'vino') {
        if (!formData.marca.trim()) {
          newErrors.marca = 'La marca es obligatoria para vinos';
        }
        if (!formData.origen.trim()) {
          newErrors.origen = 'El origen es obligatorio para vinos';
        }
      }

      if (formData.tipo === 'cerveza' && !formData.marca.trim()) {
        newErrors.marca = 'La marca es obligatoria para cervezas';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    let processedValue = value;

    // Para campos numéricos, mantener como string si está vacío o en proceso de edición
    if (type === 'number') {
      if (value === '') {
        processedValue = '';
      } else {
        // Permitir números decimales
        const numValue = parseFloat(value);
        processedValue = isNaN(numValue) ? 0 : numValue;
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Limpiar errores cuando el usuario modifica el campo
    if (errors[name]) {
      setErrors(prev => ({
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
    setSubmitError('');

    try {
      const timestamp = new Date();
      const updatedBy = user.email;

      if (isEditing) {
        // Actualizar item existente
        const updateData = canEditAllFields 
          ? {
              ...formData,
              // Asegurar que los números se guarden correctamente
              stock: parseFloat(formData.stock) || 0,
              umbral_low: parseFloat(formData.umbral_low) || 5,
              precio: parseFloat(formData.precio) || 0,
              ultima_actualizacion: timestamp,
              actualizado_por: updatedBy
            }
          : {
              // Solo actualizar stock si no es admin/manager
              stock: parseFloat(formData.stock) || 0,
              ultima_actualizacion: timestamp,
              actualizado_por: updatedBy
            };

        await updateDoc(doc(db, 'inventario', item.id), updateData);

        // Registrar en historial
        const newStock = parseFloat(formData.stock) || 0;
        const oldStock = parseFloat(item.stock) || 0;
        if (newStock !== oldStock) {
          const change = newStock - oldStock;
          await addDoc(collection(db, 'historial'), {
            item_id: item.id,
            accion: change > 0 ? 'agregado' : 'vendido',
            cantidad: Math.abs(change),
            fecha: timestamp,
            usuario: updatedBy,
            motivo: canEditAllFields ? 'Edición completa' : 'Actualización de stock'
          });
        }

      } else {
        // Crear nuevo item (solo admin/manager)
        if (!canEditAllFields) {
          throw new Error('No tienes permisos para crear nuevos ítems');
        }

        const newItemData = {
          ...formData,
          // Asegurar que los números se guarden correctamente
          stock: parseFloat(formData.stock) || 0,
          umbral_low: parseFloat(formData.umbral_low) || 5,
          precio: parseFloat(formData.precio) || 0,
          creado_en: timestamp,
          creado_por: updatedBy,
          ultima_actualizacion: timestamp
        };

        const docRef = await addDoc(collection(db, 'inventario'), newItemData);

        // Registrar en historial
        await addDoc(collection(db, 'historial'), {
          item_id: docRef.id,
          accion: 'creado',
          cantidad: parseFloat(formData.stock) || 0,
          fecha: timestamp,
          usuario: updatedBy
        });
      }

      onSuccess && onSuccess();
      onHide();

    } catch (error) {
      console.error('Error saving item:', error);
      setSubmitError(error.message || 'Error al guardar el ítem');
    }

    setLoading(false);
  };

  const getFormTitle = () => {
    if (isEditing) {
      return canEditAllFields ? 'Editar Ítem' : 'Actualizar Stock';
    }
    return 'Nuevo Ítem';
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{getFormTitle()}</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {submitError && (
            <Alert variant="danger">{submitError}</Alert>
          )}

          {!canEditAllFields && (
            <Alert variant="info">
              <strong>Modo Limitado:</strong> Solo puedes actualizar el stock del ítem.
            </Alert>
          )}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre *</Form.Label>
                <Form.Control
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  disabled={!canEditAllFields}
                  isInvalid={!!errors.nombre}
                  placeholder="Ej: Whiskey Jack Daniel's"
                  maxLength="100"
                  required={canEditAllFields}
                />
                <Form.Control.Feedback type="invalid">
                  {errors.nombre}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Tipo *</Form.Label>
                <Form.Select
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                  disabled={!canEditAllFields}
                  required={canEditAllFields}
                >
                  <option value="licor">Licor</option>
                  <option value="vino">Vino</option>
                  <option value="cerveza">Cerveza</option>
                  <option value="otros">Otros</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {formData.tipo === 'licor' && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Sub-tipo *</Form.Label>
                  <Form.Select
                    name="subTipo"
                    value={formData.subTipo}
                    onChange={handleInputChange}
                    disabled={!canEditAllFields}
                    isInvalid={!!errors.subTipo}
                    required={canEditAllFields}
                  >
                    <option value="">Seleccione...</option>
                    <option value="whiskey">Whiskey</option>
                    <option value="vodka">Vodka</option>
                    <option value="gin">Gin</option>
                    <option value="ron">Ron</option>
                    <option value="tequila">Tequila</option>
                    <option value="cognac">Cognac</option>
                    <option value="licor">Licor Dulce</option>
                    <option value="otro">Otro</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.subTipo}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          )}

          {(formData.tipo === 'vino' || formData.tipo === 'cerveza') && (
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Marca *</Form.Label>
                  <Form.Control
                    type="text"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    disabled={!canEditAllFields}
                    isInvalid={!!errors.marca}
                    placeholder="Ej: Bodega Catena"
                    maxLength="50"
                    required={canEditAllFields}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.marca}
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              {formData.tipo === 'vino' && (
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Origen *</Form.Label>
                    <Form.Control
                      type="text"
                      name="origen"
                      value={formData.origen}
                      onChange={handleInputChange}
                      disabled={!canEditAllFields}
                      isInvalid={!!errors.origen}
                      placeholder="Ej: Mendoza, Argentina"
                      maxLength="50"
                      required={canEditAllFields}
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.origen}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              )}
            </Row>
          )}

          <Row>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label>Stock Actual *</Form.Label>
                <Form.Control
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleInputChange}
                  isInvalid={!!errors.stock}
                  min="0"
                  step="any"
                  placeholder="0"
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {errors.stock}
                </Form.Control.Feedback>
              </Form.Group>
            </Col>

            {canEditAllFields && (
              <>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Umbral Mínimo</Form.Label>
                    <Form.Control
                      type="number"
                      name="umbral_low"
                      value={formData.umbral_low}
                      onChange={handleInputChange}
                      isInvalid={!!errors.umbral_low}
                      min="0"
                      step="any"
                      placeholder="5"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.umbral_low}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Aviso cuando el stock baje de este número
                    </Form.Text>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Precio ($)</Form.Label>
                    <Form.Control
                      type="number"
                      name="precio"
                      value={formData.precio}
                      onChange={handleInputChange}
                      isInvalid={!!errors.precio}
                      step="any"
                      min="0"
                      placeholder="0.00"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.precio}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Precio unitario en pesos
                    </Form.Text>
                  </Form.Group>
                </Col>
              </>
            )}
          </Row>

          {/* CAMPO DE PROVEEDOR - SIEMPRE VISIBLE PARA ADMIN/MANAGER */}
          {canEditAllFields && (
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Proveedor</Form.Label>
                  <Form.Select
                    name="proveedor_id"
                    value={formData.proveedor_id}
                    onChange={handleInputChange}
                  >
                    <option value="">Sin proveedor asignado</option>
                    {providers && providers.length > 0 ? (
                      providers
                        .filter(provider => provider.activo !== false)
                        .map(provider => (
                          <option key={provider.id} value={provider.id}>
                            {provider.empresa}
                            {provider.contacto ? ` - ${provider.contacto}` : ''}
                          </option>
                        ))
                    ) : (
                      <option disabled>No hay proveedores disponibles</option>
                    )}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {providers && providers.length > 0 
                      ? `Selecciona el proveedor de este producto (${providers.length} disponibles)`
                      : 'No hay proveedores. Crea uno en Gestión de Proveedores.'
                    }
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          )}

          {canEditAllFields && (
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    maxLength="500"
                    placeholder="Descripción adicional del producto (opcional)"
                  />
                  <Form.Text className="text-muted">
                    {formData.descripcion.length}/500 caracteres
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading && <Spinner as="span" animation="border" size="sm" className="me-2" />}
            {isEditing ? 'Actualizar' : 'Crear'} {canEditAllFields ? 'Ítem' : 'Stock'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default InventoryItemForm;