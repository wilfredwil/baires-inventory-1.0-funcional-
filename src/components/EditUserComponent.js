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

  // ROLES ACTUALIZADOS SEGÚN TU RESTAURANTE (IGUAL QUE CREATEUSER)
  const rolesByDepartment = {
    FOH: [
      { value: 'host', label: 'Host/Hostess' },
      { value: 'server', label: 'Mesero/a' },
      { value: 'server_senior', label: 'Mesero/a Senior' },
      { value: 'bartender', label: 'Bartender' },
      { value: 'bartender_head', label: 'Bartender Principal' },
      { value: 'runner', label: 'Runner' },
      { value: 'busser', label: 'Busser' },
      { value: 'manager', label: 'Manager' }
    ],
    BOH: [
      { value: 'dishwasher', label: 'Lavaplatos' },
      { value: 'prep_cook', label: 'Ayudante de Cocina' },
      { value: 'line_cook', label: 'Cocinero de Línea' },
      { value: 'cook', label: 'Cocinero/a' },
      { value: 'sous_chef', label: 'Sous Chef' },
      { value: 'chef', label: 'Chef/Manager de Cocina' }
    ],
    ADMIN: [
      { value: 'admin', label: 'Administrador del Sistema' }
    ]
  };

  // FUNCIÓN PARA OBTENER COLORES POR POSICIÓN (IGUAL QUE CREATEUSER)
  const getPositionColor = (role) => {
    const colors = {
      // FOH
      'host': '#3498db',
      'server': '#27ae60',
      'server_senior': '#229954',
      'bartender': '#9b59b6',
      'bartender_head': '#8e44ad',
      'runner': '#1abc9c',
      'busser': '#16a085',
      'manager': '#e67e22',
      
      // BOH
      'dishwasher': '#95a5a6',
      'prep_cook': '#e74c3c',
      'line_cook': '#c0392b',
      'cook': '#d35400',
      'sous_chef': '#e67e22',
      'chef': '#f39c12',
      
      // ADMIN
      'admin': '#2c3e50'
    };
    return colors[role] || '#95a5a6';
  };

  // PERMISOS ACTUALIZADOS PARA NUEVOS ROLES (IGUAL QUE CREATEUSER)
  const getPermissionsByRole = (role) => {
    const permissionsMap = {
      // FOH roles
      'host': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'server': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'server_senior': {
        canAccessPOS: true,
        canManageInventory: false,
        canViewReports: true,
        canManageStaff: false
      },
      'bartender': {
        canAccessPOS: true,
        canManageInventory: true,
        canViewReports: false,
        canManageStaff: false
      },
      'bartender_head': {
        canAccessPOS: true,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: false
      },
      'runner': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'busser': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'manager': {
        canAccessPOS: true,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: true
      },

      // BOH roles
      'dishwasher': {
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
      'line_cook': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'cook': {
        canAccessPOS: false,
        canManageInventory: false,
        canViewReports: false,
        canManageStaff: false
      },
      'sous_chef': {
        canAccessPOS: false,
        canManageInventory: true,
        canViewReports: false,
        canManageStaff: false
      },
      'chef': {
        canAccessPOS: false,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: true
      },

      // ADMIN
      'admin': {
        canAccessPOS: true,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: true
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

  // Cargar datos del usuario a editar
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
          hourlyRate: userToEdit.workInfo?.hourlyRate || '',
          startDate: userToEdit.workInfo?.startDate || '',
          schedule: {
            hoursPerWeek: userToEdit.workInfo?.schedule?.hoursPerWeek || '',
            workDays: userToEdit.workInfo?.schedule?.workDays || []
          }
        },
        permissions: {
          canAccessPOS: userToEdit.permissions?.canAccessPOS || false,
          canManageInventory: userToEdit.permissions?.canManageInventory || false,
          canViewReports: userToEdit.permissions?.canViewReports || false,
          canManageStaff: userToEdit.permissions?.canManageStaff || false
        },
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
      setErrors({});
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
${formData.permissions.canAccessPOS ? '✓ Acceso al POS' : '✗ Sin acceso al POS'}
${formData.permissions.canManageInventory ? '✓ Gestionar inventario' : '✗ Sin gestión de inventario'}
${formData.permissions.canViewReports ? '✓ Ver reportes' : '✗ Sin acceso a reportes'}
${formData.permissions.canManageStaff ? '✓ Gestionar personal' : '✗ Sin gestión de personal'}

📅 Los cambios se reflejarán en los próximos horarios.`;

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

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUser className="me-2" />
          Editar Personal FOH/BOH
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Alert variant="info" className="mb-4">
            <strong>Editando: {userToEdit?.displayName || 'Usuario'}</strong><br/>
            Los permisos se actualizan automáticamente según el rol seleccionado
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
                      placeholder="email@restaurante.com"
                      disabled
                      className="bg-light"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      El email no se puede modificar
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
                      Salario por Hora (USD)
                    </Form.Label>
                    <Form.Control
                      type="number"
                      name="workInfo.hourlyRate"
                      value={formData.workInfo.hourlyRate}
                      onChange={handleInputChange}
                      placeholder="15.00"
                      min="0"
                      step="0.25"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      <FaClock className="me-2" />
                      Fecha de Inicio
                    </Form.Label>
                    <Form.Control
                      type="date"
                      name="workInfo.startDate"
                      value={formData.workInfo.startDate}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Días de trabajo */}
              <Form.Group className="mb-3">
                <Form.Label>Días Disponibles para Trabajar</Form.Label>
                <div className="d-flex flex-wrap gap-2">
                  {weekDays.map(day => (
                    <Form.Check
                      key={day.value}
                      type="checkbox"
                      id={`editWorkDay-${day.value}`}
                      label={day.label}
                      checked={formData.workInfo.schedule.workDays.includes(day.value)}
                      onChange={() => handleWorkDaysChange(day.value)}
                      className="me-3"
                    />
                  ))}
                </div>
              </Form.Group>

              {/* Estado del empleado */}
              <Form.Group className="mb-3">
                <Form.Label>Estado del Empleado</Form.Label>
                <Form.Select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                  <option value="suspended">Suspendido</option>
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Información de Emergencia */}
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
                      placeholder="Nombre del contacto"
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
                      placeholder="+1 (555) 987-6543"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Relación</Form.Label>
                    <Form.Control
                      type="text"
                      name="personalInfo.emergencyContact.relationship"
                      value={formData.personalInfo.emergencyContact.relationship}
                      onChange={handleInputChange}
                      placeholder="Madre, Padre, Esposo/a, etc."
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Resumen de permisos */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Permisos Asignados</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <Badge bg={formData.permissions.canAccessPOS ? 'success' : 'secondary'} className="me-2">
                      {formData.permissions.canAccessPOS ? '✓' : '✗'}
                    </Badge>
                    Acceso al POS
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <Badge bg={formData.permissions.canViewReports ? 'success' : 'secondary'} className="me-2">
                      {formData.permissions.canViewReports ? '✓' : '✗'}
                    </Badge>
                    Ver Reportes
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center mb-2">
                    <Badge bg={formData.permissions.canManageInventory ? 'success' : 'secondary'} className="me-2">
                      {formData.permissions.canManageInventory ? '✓' : '✗'}
                    </Badge>
                    Gestionar Inventario
                  </div>
                  <div className="d-flex align-items-center mb-2">
                    <Badge bg={formData.permissions.canManageStaff ? 'success' : 'secondary'} className="me-2">
                      {formData.permissions.canManageStaff ? '✓' : '✗'}
                    </Badge>
                    Gestionar Personal
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
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