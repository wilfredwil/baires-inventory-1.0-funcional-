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

  // ROLES ACTUALIZADOS SEGÚN TU RESTAURANTE - CON FOOD RUNNER
  const rolesByDepartment = {
    FOH: [
      { value: 'host', label: 'Host/Hostess' },
      { value: 'server', label: 'Mesero/a' },
      { value: 'server_senior', label: 'Mesero/a Senior' },
      { value: 'bartender', label: 'Bartender' },
      { value: 'bartender_head', label: 'Bartender Principal' },
      { value: 'runner', label: 'Runner' },
      { value: 'food_runner', label: 'Food Runner' }, // NUEVO!
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

  // FUNCIÓN PARA OBTENER COLORES POR POSICIÓN - CON FOOD RUNNER
  const getPositionColor = (role) => {
    const colors = {
      // FOH
      'host': '#3498db',
      'server': '#27ae60',
      'server_senior': '#229954',
      'bartender': '#9b59b6',
      'bartender_head': '#8e44ad',
      'runner': '#1abc9c',
      'food_runner': '#17a2b8', // NUEVO COLOR!
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

  // PERMISOS ACTUALIZADOS PARA NUEVOS ROLES - CON FOOD RUNNER
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
      'food_runner': { // NUEVOS PERMISOS!
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
        canViewReports: true,
        canManageStaff: false
      },
      'chef': {
        canAccessPOS: false,
        canManageInventory: true,
        canViewReports: true,
        canManageStaff: true
      },
      
      // ADMIN roles
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

  // Generar ID de empleado único
  const generateEmployeeId = () => {
    const prefix = formData.workInfo.department || 'EMP';
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  };

  // Manejar cambios en inputs
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [section, field] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [field]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Auto-asignar permisos cuando cambia el rol
    if (name === 'role') {
      const permissions = getPermissionsByRole(value);
      setFormData(prev => ({
        ...prev,
        permissions
      }));
    }

    // Limpiar errores cuando el usuario corrige
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Manejar cambios en inputs anidados
  const handleNestedInputChange = (e, section, subsection = null) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    if (subsection) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [name]: newValue
          }
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: newValue
        }
      }));
    }
  };

  // Validar formulario
  const validateForm = () => {
    const newErrors = {};

    // Validaciones básicas
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'El nombre es obligatorio';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'El apellido es obligatorio';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'El email no es válido';
    }

    if (!formData.password || formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!formData.role) {
      newErrors.role = 'Debe seleccionar un rol';
    }

    if (!formData.workInfo.department) {
      newErrors['workInfo.department'] = 'Debe seleccionar un departamento';
    }

    if (formData.phone && !/^\+?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono no es válido';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Crear usuario
  const handleCreateUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const newUser = userCredential.user;

      // Generar ID de empleado si no existe
      const employeeId = formData.workInfo.employeeId || generateEmployeeId();

      // Preparar datos para Firestore
      const userData = {
        uid: newUser.uid,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        phone: formData.phone || '',
        role: formData.role,
        workInfo: {
          ...formData.workInfo,
          employeeId
        },
        permissions: formData.permissions,
        personalInfo: formData.personalInfo,
        status: 'active',
        createdAt: serverTimestamp(),
        createdBy: currentUser.email
      };

      // Guardar en Firestore
      await addDoc(collection(db, 'users'), userData);

      // Resetear formulario
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

      onSuccess(`Usuario ${formData.firstName} ${formData.lastName} creado exitosamente`);
      onHide();

    } catch (error) {
      console.error('Error creating user:', error);
      let errorMessage = 'Error al crear el usuario';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este email ya está registrado';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es muy débil';
          break;
        case 'auth/invalid-email':
          errorMessage = 'El email no es válido';
          break;
        default:
          errorMessage = error.message;
      }
      
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUser className="me-2" />
          Crear Nuevo Usuario
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleCreateUser}>
        <Modal.Body>
          {/* Información Personal */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">
                <FaUser className="me-2" />
                Información Personal
              </h6>
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
                      placeholder="email@ejemplo.com"
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
                      isInvalid={!!errors.phone}
                      placeholder="+1 234 567 8900"
                    />
                    <Form.Control.Feedback type="invalid">
                      {errors.phone}
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label>Contraseña Temporal *</Form.Label>
                <InputGroup>
                  <Form.Control
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    isInvalid={!!errors.password}
                    placeholder="Mínimo 6 caracteres"
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </Button>
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </InputGroup>
                <Form.Text className="text-muted">
                  El empleado podrá cambiar esta contraseña en su primer acceso
                </Form.Text>
              </Form.Group>
            </Card.Body>
          </Card>

          {/* Información Laboral */}
          <Card className="mb-4">
            <Card.Header>
              <h6 className="mb-0">
                <FaBuilding className="me-2" />
                Información Laboral
              </h6>
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
                      Salario por Hora
                    </Form.Label>
                    <InputGroup>
                      <InputGroup.Text>$</InputGroup.Text>
                      <Form.Control
                        type="number"
                        step="0.50"
                        name="workInfo.hourlyRate"
                        value={formData.workInfo.hourlyRate}
                        onChange={handleInputChange}
                        placeholder="15.00"
                      />
                    </InputGroup>
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
            </Card.Body>
          </Card>

          {/* Información de Contacto de Emergencia */}
          <Card>
            <Card.Header>
              <h6 className="mb-0">Contacto de Emergencia</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Nombre</Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      value={formData.personalInfo.emergencyContact.name}
                      onChange={(e) => handleNestedInputChange(e, 'personalInfo', 'emergencyContact')}
                      placeholder="Nombre del contacto"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Teléfono</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={formData.personalInfo.emergencyContact.phone}
                      onChange={(e) => handleNestedInputChange(e, 'personalInfo', 'emergencyContact')}
                      placeholder="+1 234 567 8900"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Relación</Form.Label>
                    <Form.Select
                      name="relationship"
                      value={formData.personalInfo.emergencyContact.relationship}
                      onChange={(e) => handleNestedInputChange(e, 'personalInfo', 'emergencyContact')}
                    >
                      <option value="">Seleccionar...</option>
                      <option value="padre">Padre</option>
                      <option value="madre">Madre</option>
                      <option value="conyuge">Cónyuge</option>
                      <option value="hermano">Hermano/a</option>
                      <option value="hijo">Hijo/a</option>
                      <option value="amigo">Amigo/a</option>
                      <option value="otro">Otro</option>
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
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Creando...' : 'Crear Usuario'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateUserComponent;