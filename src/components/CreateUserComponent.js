import React, { useState } from 'react';
import { Modal, Form, Button, Row, Col, Alert, InputGroup, Card } from 'react-bootstrap';
import { FaUser, FaEye, FaEyeSlash, FaBuilding, FaIdCard, FaClock, FaMoneyBillWave } from 'react-icons/fa';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';

const CreateUserComponent = ({ show, onHide, onSuccess, onError, currentUser }) => {
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
      canAccessPOS: true,
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
    password: ''
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // ROLES ACTUALIZADOS SEGÚN TU RESTAURANTE
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

  // FUNCIÓN PARA OBTENER COLORES POR POSICIÓN (NUEVA)
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

  // PERMISOS ACTUALIZADOS PARA NUEVOS ROLES
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

  // Generar ID de empleado
  const generateEmployeeId = () => {
    const year = new Date().getFullYear();
    const dept = formData.workInfo.department;
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${dept}${year}${random}`;
  };

  // Generar contraseña temporal
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

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

  // Manejar cambio de días de trabajo
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
    if (!formData.password) newErrors.password = 'Contraseña requerida';

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
      // Generar ID de empleado si no existe
      const employeeId = formData.workInfo.employeeId || generateEmployeeId();
      
      // Crear usuario en Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Preparar datos del usuario
      const userData = {
        uid: userCredential.user.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone,
        role: formData.role,
        workInfo: {
          ...formData.workInfo,
          employeeId,
          startDate: formData.workInfo.startDate || new Date().toISOString().split('T')[0]
        },
        permissions: formData.permissions,
        personalInfo: formData.personalInfo,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'system',
        updatedAt: serverTimestamp(),
        status: 'active'
      };

      // Guardar en Firestore
      await addDoc(collection(db, 'users'), userData);

      // Mensaje de éxito
      const successMessage = `
✅ USUARIO CREADO EXITOSAMENTE

📋 INFORMACIÓN DEL NUEVO EMPLEADO:
• Nombre: ${formData.firstName} ${formData.lastName}
• Email: ${formData.email}
• ID Empleado: ${employeeId}
• Departamento: ${formData.workInfo.department}
• Rol: ${formData.role}
• Salario: $${formData.workInfo.hourlyRate}/hora USD

🔐 CREDENCIALES DE ACCESO:
• Email: ${formData.email}
• Contraseña temporal: ${formData.password}

⚠️ IMPORTANTE: 
- Envía estas credenciales al empleado de forma segura
- El empleado debe cambiar su contraseña en el primer acceso
- Guarda esta información para tus registros`;

      if (onSuccess) {
        onSuccess(successMessage);
      }

      // Reset formulario
      setFormData({
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
          canAccessPOS: true,
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
        password: ''
      });

      onHide();

    } catch (error) {
      console.error('Error creando usuario:', error);
      if (onError) {
        onError(`Error al crear usuario: ${error.message}`);
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
          Crear Nuevo Personal FOH/BOH
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <Alert variant="info" className="mb-4">
            <strong>Formulario Optimizado FOH/BOH</strong><br/>
            Salario por hora en USD • Permisos automáticos según rol • Sin campos redundantes
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
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.email}
                    </Form.Control.Feedback>
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
                      ✅ Permisos se asignan automáticamente según el rol
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
                    <InputGroup>
                      <Form.Control
                        type="text"
                        name="workInfo.employeeId"
                        value={formData.workInfo.employeeId}
                        onChange={handleInputChange}
                        placeholder="Se generará automáticamente"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          workInfo: {
                            ...prev.workInfo,
                            employeeId: generateEmployeeId()
                          }
                        }))}
                      >
                        Generar
                      </Button>
                    </InputGroup>
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
                      id={`workDay-${day.value}`}
                      label={day.label}
                      checked={formData.workInfo.schedule.workDays.includes(day.value)}
                      onChange={() => handleWorkDaysChange(day.value)}
                      className="me-3"
                    />
                  ))}
                </div>
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

          {/* Contraseña */}
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">Credenciales de Acceso</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contraseña Temporal *</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        isInvalid={!!errors.password}
                        placeholder="Contraseña temporal para el empleado"
                      />
                      <Button
                        variant="outline-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </Button>
                      <Button
                        variant="outline-success"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          password: generatePassword()
                        }))}
                      >
                        Generar
                      </Button>
                    </InputGroup>
                    <Form.Control.Feedback type="invalid">
                      {errors.password}
                    </Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      El empleado deberá cambiar esta contraseña en su primer acceso.
                    </Form.Text>
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
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Creando Usuario...' : 'Crear Usuario FOH/BOH'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateUserComponent;