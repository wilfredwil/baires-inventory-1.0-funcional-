import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert, InputGroup, Card, Badge } from 'react-bootstrap';
import { FaUser, FaBuilding, FaIdCard, FaClock, FaMoneyBillWave, FaSave } from 'react-icons/fa';
import { updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const EditUserComponent = ({ show, onHide, onSuccess, onError, currentUser, userToEdit }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'server',
    workInfo: {
      department: 'FOH',
      employeeId: '',
      hourlyRate: '',
      startDate: '',
      schedule: {
        hoursPerWeek: '',
        workDays: []
      }
    },
    permissions: {
      canAccessPOS: false,
      canManageInventory: false,
      canViewReports: false,
      canManageStaff: false
    },
    personalInfo: {
      emergencyContact: {
        name: '',
        phone: '',
        relationship: ''
      },
      address: '',
      birthDate: ''
    },
    status: 'active'
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Definir roles según departamento
  const rolesByDepartment = {
    FOH: [
      { value: 'server', label: 'Mesero/a' },
      { value: 'host', label: 'Host/Hostess' },
      { value: 'bartender', label: 'Bartender' },
      { value: 'waiter', label: 'Camarero/a Senior' },
      { value: 'cashier', label: 'Cajero/a' },
      { value: 'floor_manager', label: 'Supervisor de Sala' }
    ],
    BOH: [
      { value: 'chef', label: 'Chef' },
      { value: 'sous_chef', label: 'Sous Chef' },
      { value: 'cook', label: 'Cocinero/a' },
      { value: 'prep_cook', label: 'Ayudante de Cocina' },
      { value: 'dishwasher', label: 'Lavaplatos' },
      { value: 'kitchen_manager', label: 'Jefe de Cocina' }
    ],
    ADMIN: [
      { value: 'admin', label: 'Administrador' },
      { value: 'manager', label: 'Gerente General' },
      { value: 'assistant_manager', label: 'Subgerente' },
      { value: 'supervisor', label: 'Supervisor' }
    ]
  };

  // Lógica de permisos automática según rol
  const getPermissionsByRole = (role) => {
    const permissionsMap = {
      // ADMIN - Acceso completo
      'admin': {
        canAccessPOS: true,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: true
      },
      'manager': {
        canAccessPOS: true,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: true
      },
      'assistant_manager': {
        canAccessPOS: true,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: false
      },
      'supervisor': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: true,
        canManageStaff: false
      },

      // FOH - Acceso según responsabilidades
      'floor_manager': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: true,
        canManageStaff: false
      },
      'bartender': {
        canAccessPOS: true,
        canManageInventory: true, // Para gestionar inventario de bar
        canViewReports: false,
        canManageStaff: false
      },
      'server': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'waiter': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'host': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'cashier': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },

      // BOH - Acceso según jerarquía
      'chef': {
        canAccessPOS: false,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: false
      },
      'sous_chef': {
        canAccessPOS: false,
        canManageInventory: true,
        canViewReports: false,
        canManageStaff: false
      },
      'kitchen_manager': {
        canAccessPOS: false,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: false
      },
      'cook': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'prep_cook': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'dishwasher': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      }
    };

    return permissionsMap[role] || {
      canAccessPOS: false,
      canManageInventory: false,
      canViewReports: false,
      canManageStaff: false
    };
  };

  // Días de la semana
  const weekDays = [
    { value: 'monday', label: 'Lunes' },
    { value: 'tuesday', label: 'Martes' },
    { value: 'wednesday', label: 'Miércoles' },
    { value: 'thursday', label: 'Jueves' },
    { value: 'friday', label: 'Viernes' },
    { value: 'saturday', label: 'Sábado' },
    { value: 'sunday', label: 'Domingo' }
  ];

  // Cargar datos del usuario cuando se abre el modal
  useEffect(() => {
    if (userToEdit && show) {
      setFormData({
        firstName: userToEdit.firstName || '',
        lastName: userToEdit.lastName || '',
        email: userToEdit.email || '',
        phone: userToEdit.phone || '',
        role: userToEdit.role || 'server',
        workInfo: {
          department: userToEdit.workInfo?.department || 'FOH',
          employeeId: userToEdit.workInfo?.employeeId || '',
          hourlyRate: userToEdit.workInfo?.hourlyRate || userToEdit.workInfo?.salary || '',
          startDate: userToEdit.workInfo?.startDate || '',
          schedule: {
            hoursPerWeek: userToEdit.workInfo?.schedule?.hoursPerWeek || '',
            workDays: userToEdit.workInfo?.schedule?.workDays || []
          }
        },
        permissions: userToEdit.permissions || getPermissionsByRole(userToEdit.role || 'server'),
        personalInfo: {
          emergencyContact: {
            name: userToEdit.personalInfo?.emergencyContact?.name || '',
            phone: userToEdit.personalInfo?.emergencyContact?.phone || '',
            relationship: userToEdit.personalInfo?.emergencyContact?.relationship || ''
          },
          address: userToEdit.personalInfo?.address || '',
          birthDate: userToEdit.personalInfo?.birthDate || ''
        },
        status: userToEdit.status || 'active'
      });
    }
  }, [userToEdit, show]);

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const keys = name.split('.');

    if (keys.length === 1) {
      const newValue = type === 'checkbox' ? checked : value;
      
      setFormData(prev => {
        const updated = {
          ...prev,
          [name]: newValue
        };
        
        // Si cambió el rol, actualizar permisos automáticamente
        if (name === 'role') {
          updated.permissions = getPermissionsByRole(value);
        }
        
        return updated;
      });
    } else if (keys.length === 2) {
      setFormData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (keys.length === 3) {
      setFormData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: {
            ...prev[keys[0]][keys[1]],
            [keys[2]]: type === 'checkbox' ? checked : value
          }
        }
      }));
    }

    // Limpiar errores
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Manejar cambio de días de disponibilidad
  const handleWorkDaysChange = (day) => {
    setFormData(prev => ({
      ...prev,
      workInfo: {
        ...prev.workInfo,
        schedule: {
          ...prev.workInfo.schedule,
          workDays: prev.workInfo.schedule.workDays.includes(day)
            ? prev.workInfo.schedule.workDays.filter(d => d !== day)
            : [...prev.workInfo.schedule.workDays, day]
        }
      }
    }));
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'Nombre requerido';
    if (!formData.lastName.trim()) newErrors.lastName = 'Apellido requerido';
    if (!formData.email.trim()) newErrors.email = 'Email requerido';
    if (!formData.role) newErrors.role = 'Rol requerido';
    if (!formData.workInfo.department) newErrors['workInfo.department'] = 'Departamento requerido';

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enviar formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Preparar datos actualizados
      const updateData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        role: formData.role,
        workInfo: formData.workInfo,
        permissions: formData.permissions,
        personalInfo: formData.personalInfo,
        status: formData.status,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser?.email || 'system'
      };

      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', userToEdit.id), updateData);

      // Mensaje de éxito
      const successMessage = `
✅ USUARIO ACTUALIZADO EXITOSAMENTE

📋 INFORMACIÓN ACTUALIZADA:
• Nombre: ${formData.firstName} ${formData.lastName}
• Email: ${formData.email}
• ID Empleado: ${formData.workInfo.employeeId}
• Departamento: ${formData.workInfo.department}
• Rol: ${formData.role}
• Salario: $${formData.workInfo.hourlyRate}/hora USD
• Días de Disponibilidad: ${formData.workInfo.schedule.workDays.length} días seleccionados

🔐 PERMISOS ACTUALIZADOS:
${formData.permissions.canAccessPOS ? '✅' : '❌'} Acceso al POS
${formData.permissions.canManageInventory ? '✅' : '❌'} Gestión de Inventario
${formData.permissions.canViewReports ? '✅' : '❌'} Ver Reportes
${formData.permissions.canManageStaff ? '✅' : '❌'} Gestión de Personal`;

      if (onSuccess) {
        onSuccess(successMessage);
      }

      onHide();

    } catch (error) {
      console.error('Error actualizando usuario:', error);
      if (onError) {
        onError(`Error al actualizar usuario: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!userToEdit) return null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUser className="me-2" />
          Editar Personal FOH/BOH - {userToEdit.displayName || userToEdit.email}
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Alert variant="info" className="mb-4">
            <strong>Editando Usuario:</strong> Los cambios en el rol actualizarán automáticamente los permisos del sistema.
            <br/>
            <Badge bg="secondary" className="mt-1">ID: {userToEdit.workInfo?.employeeId || 'Sin asignar'}</Badge>
          </Alert>

          {/* Información Personal */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Información Personal</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre *</Form.Label>
                    <Form.Control
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      isInvalid={!!errors.firstName}
                      placeholder="Nombre del empleado"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.firstName}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Apellido *</Form.Label>
                    <Form.Control
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      isInvalid={!!errors.lastName}
                      placeholder="Apellido del empleado"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.lastName}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email *</Form.Label>
                    <Form.Control
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      isInvalid={!!errors.email}
                      disabled // No permitir cambiar email
                      className="bg-light"
                    />
                    <Form.Text className="text-muted">
                      El email no se puede cambiar después de la creación
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Teléfono</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Fecha de Nacimiento</Form.Label>
                    <Form.Control
                      type="date"
                      name="personalInfo.birthDate"
                      value={formData.personalInfo.birthDate}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Dirección</Form.Label>
                    <Form.Control
                      type="text"
                      name="personalInfo.address"
                      value={formData.personalInfo.address}
                      onChange={handleInputChange}
                      placeholder="Dirección completa"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Información Laboral */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">
                <FaBuilding className="me-2" />
                Información Laboral
              </h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Departamento *</Form.Label>
                    <Form.Select
                      name="workInfo.department"
                      value={formData.workInfo.department}
                      onChange={handleInputChange}
                      isInvalid={!!errors['workInfo.department']}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="FOH">FOH - Front of House</option>
                      <option value="BOH">BOH - Back of House</option>
                      <option value="ADMIN">ADMIN - Administración</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors['workInfo.department']}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Rol *</Form.Label>
                    <Form.Select
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      isInvalid={!!errors.role}
                    >
                      <option value="">Seleccionar...</option>
                      {formData.workInfo.department && 
                        rolesByDepartment[formData.workInfo.department]?.map(role => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))
                      }
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      {errors.role}
                    </Form.Control.Feedback>
                    <Form.Text className="text-success">
                      ✅ Permisos se actualizan automáticamente
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <FaIdCard className="me-2" />
                      ID Empleado
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="workInfo.employeeId"
                      value={formData.workInfo.employeeId}
                      onChange={handleInputChange}
                      disabled
                      className="bg-light"
                    />
                    <Form.Text className="text-muted">
                      El ID de empleado no se puede modificar
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <FaMoneyBillWave className="me-2" />
                      Salario por Hora
                    </Form.Label>
                    <InputGroup>
                      <InputGroup.Text>$</InputGroup.Text>
                      <Form.Control
                        type="number"
                        name="workInfo.hourlyRate"
                        value={formData.workInfo.hourlyRate}
                        onChange={handleInputChange}
                        placeholder="15.00"
                        step="0.25"
                        min="7.25"
                      />
                      <InputGroup.Text>USD</InputGroup.Text>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Salario mínimo federal: $7.25/hora
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Estado del Empleado</Form.Label>
                    <Form.Select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="vacation">En Vacaciones</option>
                      <option value="sick">Licencia Médica</option>
                      <option value="terminated">Despedido</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <FaClock className="me-2" />
                      Horas por Semana
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="workInfo.schedule.hoursPerWeek"
                      value={formData.workInfo.schedule.hoursPerWeek}
                      onChange={handleInputChange}
                      placeholder="40"
                      min="1"
                      max="48"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Días de Disponibilidad</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                      {weekDays.map(day => (
                        <Form.Check
                          key={day.value}
                          type="checkbox"
                          id={`edit-day-${day.value}`}
                          label={day.label}
                          checked={formData.workInfo.schedule.workDays.includes(day.value)}
                          onChange={() => handleWorkDaysChange(day.value)}
                          className="me-3"
                        />
                      ))}
                    </div>
                    <Form.Text className="text-success">
                      ⚡ Se usará para mostrar disponibilidad en horarios
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Permisos Automáticos */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Permisos del Sistema (Automáticos)</h5>
            </Card.Header>
            <Card.Body>
              <Alert variant="warning" className="mb-3">
                <strong>🔄 Actualización Automática:</strong> Los permisos se actualizan automáticamente al cambiar el rol del empleado.
              </Alert>
              <Row>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <Form.Check
                      type="checkbox"
                      checked={formData.permissions.canAccessPOS}
                      disabled
                      readOnly
                    />
                    <span className={`ms-2 ${formData.permissions.canAccessPOS ? 'text-success fw-bold' : 'text-muted'}`}>
                      {formData.permissions.canAccessPOS ? '✅' : '❌'} Acceso al Sistema POS
                    </span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <Form.Check
                      type="checkbox"
                      checked={formData.permissions.canManageInventory}
                      disabled
                      readOnly
                    />
                    <span className={`ms-2 ${formData.permissions.canManageInventory ? 'text-success fw-bold' : 'text-muted'}`}>
                      {formData.permissions.canManageInventory ? '✅' : '❌'} Gestionar Inventario
                    </span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <Form.Check
                      type="checkbox"
                      checked={formData.permissions.canViewReports}
                      disabled
                      readOnly
                    />
                    <span className={`ms-2 ${formData.permissions.canViewReports ? 'text-success fw-bold' : 'text-muted'}`}>
                      {formData.permissions.canViewReports ? '✅' : '❌'} Ver Reportes
                    </span>
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <Form.Check
                      type="checkbox"
                      checked={formData.permissions.canManageStaff}
                      disabled
                      readOnly
                    />
                    <span className={`ms-2 ${formData.permissions.canManageStaff ? 'text-success fw-bold' : 'text-muted'}`}>
                      {formData.permissions.canManageStaff ? '✅' : '❌'} Gestionar Personal
                    </span>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Contacto de Emergencia */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Contacto de Emergencia</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre</Form.Label>
                    <Form.Control
                      type="text"
                      name="personalInfo.emergencyContact.name"
                      value={formData.personalInfo.emergencyContact.name}
                      onChange={handleInputChange}
                      placeholder="Nombre completo"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Teléfono</Form.Label>
                    <Form.Control
                      type="tel"
                      name="personalInfo.emergencyContact.phone"
                      value={formData.personalInfo.emergencyContact.phone}
                      onChange={handleInputChange}
                      placeholder="+1 (555) 123-4567"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Relación</Form.Label>
                    <Form.Select
                      name="personalInfo.emergencyContact.relationship"
                      value={formData.personalInfo.emergencyContact.relationship}
                      onChange={handleInputChange}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="spouse">Cónyuge</option>
                      <option value="parent">Padre/Madre</option>
                      <option value="sibling">Hermano/a</option>
                      <option value="friend">Amigo/a</option>
                      <option value="other">Otro</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="success" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Guardando...
              </>
            ) : (
              <>
                <FaSave className="me-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditUserComponent;