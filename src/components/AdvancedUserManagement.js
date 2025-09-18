// src/components/AdvancedUserManagement.js - SISTEMA COMPLETO DE USUARIOS CON DEPARTAMENTOS Y PERMISOS
import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Modal, Alert, Badge, 
  Table, Spinner, InputGroup, OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { 
  FaUsers, FaPlus, FaEdit, FaTrash, FaSearch, FaFilter,
  FaEye, FaUserPlus, FaUserCog, FaUserShield, FaCalendarAlt,
  FaClock, FaMapMarkerAlt, FaPhone, FaEnvelope, FaIdCard,
  FaBriefcase, FaKey, FaSortAlphaDown, FaSortAlphaUp,
  FaFileExport, FaUserCheck, FaUserTimes, FaExclamationTriangle,
  FaArrowLeft, FaCog, FaEyeSlash, FaWineGlass, FaUtensils, FaCrown
} from 'react-icons/fa';
import { 
  collection, onSnapshot, doc, updateDoc, orderBy, query, addDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';

const AdvancedUserManagement = ({ onBack, currentUser, userRole }) => {
  // Estados principales
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de vista
  const [currentView, setCurrentView] = useState('list');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState('asc');

  // CONFIGURACIÓN COMPLETA DE DEPARTAMENTOS Y ROLES
  const departmentConfig = {
    FOH: {
      name: 'Front of House',
      icon: FaWineGlass,
      color: '#8b5cf6',
      roles: {
        host: {
          name: 'Host/Hostess',
          description: 'Recibe y acomoda a los clientes',
          permissions: {
            canAccessPOS: false,
            canViewReports: false,
            canManageInventory: false,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: true,
            canAccessFOH: true,
            canAccessBOH: false
          },
          salaryRange: { min: 15, max: 20 }
        },
        server: {
          name: 'Mesero/Server',
          description: 'Atiende mesas y toma órdenes',
          permissions: {
            canAccessPOS: true,
            canViewReports: false,
            canManageInventory: false,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: true,
            canAccessBOH: false
          },
          salaryRange: { min: 18, max: 25 }
        },
        bartender: {
          name: 'Bartender',
          description: 'Prepara bebidas y maneja el bar',
          permissions: {
            canAccessPOS: true,
            canViewReports: true,
            canManageInventory: true,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: true,
            canAccessBOH: false,
            canManageBarInventory: true
          },
          salaryRange: { min: 22, max: 35 }
        },
         runner: {
      name: 'Runner',
      description: 'Entrega comida a las mesas',
      permissions: {
        canAccessPOS: false,
        canViewReports: false,
        canManageInventory: false,
        canManageStaff: false,
        canViewSchedule: true,
        canManageReservations: false,
        canAccessFOH: true,
        canAccessBOH: false
      },
      salaryRange: { min: 15, max: 20 }
    },
        busser: {
          name: 'Busser',
          description: 'Limpia mesas y asiste a meseros',
          permissions: {
            canAccessPOS: false,
            canViewReports: false,
            canManageInventory: false,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: true,
            canAccessBOH: false
          },
          salaryRange: { min: 14, max: 18 }
        }
      }
    },
    BOH: {
      name: 'Back of House',
      icon: FaUtensils,
      color: '#ea580c',
      roles: {
        chef: {
          name: 'Chef Ejecutivo',
          description: 'Supervisa toda la cocina',
          permissions: {
            canAccessPOS: false,
            canViewReports: true,
            canManageInventory: true,
            canManageStaff: true,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: false,
            canAccessBOH: true,
            canManageKitchenInventory: true,
            canManageMenu: true
          },
          salaryRange: { min: 45, max: 70 }
        },
        suchef: {
          name: 'Sous Chef',
          description: 'Asistente del chef ejecutivo',
          permissions: {
            canAccessPOS: false,
            canViewReports: true,
            canManageInventory: true,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: false,
            canAccessBOH: true,
            canManageKitchenInventory: true,
            canManageMenu: false
          },
          salaryRange: { min: 35, max: 50 }
        },
        dishwasher: {
          name: 'Lavaplatos',
          description: 'Lava platos y mantiene limpieza',
          permissions: {
            canAccessPOS: false,
            canViewReports: false,
            canManageInventory: false,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: false,
            canAccessBOH: true
          },
          salaryRange: { min: 14, max: 18 }
        },
        prep: {
          name: 'Prep Cook',
          description: 'Prepara ingredientes y mise en place',
          permissions: {
            canAccessPOS: false,
            canViewReports: false,
            canManageInventory: false,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: false,
            canAccessBOH: true,
            canManageKitchenInventory: false
          },
          salaryRange: { min: 16, max: 22 }
        },
        lineprep: {
          name: 'Line Cook',
          description: 'Cocina durante el servicio',
          permissions: {
            canAccessPOS: false,
            canViewReports: false,
            canManageInventory: false,
            canManageStaff: false,
            canViewSchedule: true,
            canManageReservations: false,
            canAccessFOH: false,
            canAccessBOH: true,
            canManageKitchenInventory: false
          },
          salaryRange: { min: 18, max: 25 }
        }
      }
    },
    ADMIN: {
      name: 'Administración',
      icon: FaCrown,
      color: '#ef4444',
      roles: {
        admin: {
          name: 'Administrador',
          description: 'Acceso completo al sistema',
          permissions: {
            canAccessPOS: true,
            canViewReports: true,
            canManageInventory: true,
            canManageStaff: true,
            canViewSchedule: true,
            canManageReservations: true,
            canAccessFOH: true,
            canAccessBOH: true,
            canManageBarInventory: true,
            canManageKitchenInventory: true,
            canManageMenu: true,
            canManageUsers: true,
            canManageProviders: true,
            canExportData: true
          },
          salaryRange: { min: 50, max: 100 }
        },
        manager: {
          name: 'Manager',
          description: 'Gestiona operaciones diarias',
          permissions: {
            canAccessPOS: true,
            canViewReports: true,
            canManageInventory: true,
            canManageStaff: true,
            canViewSchedule: true,
            canManageReservations: true,
            canAccessFOH: true,
            canAccessBOH: true,
            canManageBarInventory: true,
            canManageKitchenInventory: true,
            canManageMenu: false,
            canManageUsers: false,
            canManageProviders: true,
            canExportData: true
          },
          salaryRange: { min: 35, max: 60 }
        }
      }
    }
  };

  // Estado del formulario por pasos
  const [formStep, setFormStep] = useState(1); // 1: Departamento, 2: Rol, 3: Datos personales, 4: Confirmación
  const [newUserForm, setNewUserForm] = useState({
    // Paso 1: Departamento
    department: '',
    
    // Paso 2: Rol
    role: '',
    
    // Paso 3: Datos personales
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    
    // Datos de trabajo (se generan automáticamente)
    workInfo: {
      employeeId: '',
      salary: '',
      startDate: '',
      status: 'active',
      schedule: {
        workDays: [],
        startTime: '09:00',
        endTime: '17:00'
      }
    },
    
    // Permisos (se asignan automáticamente)
    permissions: {},
    
    // Contraseña temporal (se genera automáticamente)
    temporaryPassword: '',
    active: true
  });

  const [showPassword, setShowPassword] = useState(false);

  // Cargar usuarios
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), orderBy('firstName')),
      (snapshot) => {
        const userData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(userData);
        setFilteredUsers(userData);
      },
      (error) => {
        console.error('Error cargando usuarios:', error);
        setError('Error cargando usuarios');
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...users];

    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (departmentFilter) {
      filtered = filtered.filter(user => user.workInfo?.department === departmentFilter);
    }

    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.active !== false);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => user.active === false);
      }
    }

    filtered.sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, departmentFilter, statusFilter, sortBy, sortOrder]);

  // Funciones utilitarias
  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const generateEmployeeId = () => {
    return `EMP${Date.now().toString().slice(-6)}`;
  };

  // Manejar selección de departamento
  const handleDepartmentSelect = (dept) => {
    setNewUserForm(prev => ({
      ...prev,
      department: dept,
      role: '', // Reset rol cuando cambio departamento
      permissions: {}
    }));
    setFormStep(2);
  };

  // Manejar selección de rol
  const handleRoleSelect = (roleKey) => {
    const selectedRole = departmentConfig[newUserForm.department].roles[roleKey];
    setNewUserForm(prev => ({
      ...prev,
      role: roleKey,
      permissions: selectedRole.permissions
    }));
    setFormStep(3);
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;

    setNewUserForm(prev => ({
      ...prev,
      [name]: inputValue
    }));
  };

  // Crear usuario completo
  const handleCreateUser = async () => {
    setLoading(true);
    setError('');

    try {
      // Validar campos obligatorios
      if (!newUserForm.firstName || !newUserForm.lastName || !newUserForm.email) {
        throw new Error('Nombre, apellido y email son obligatorios');
      }

      // Generar datos automáticos
      const temporaryPassword = generateTemporaryPassword();
      const employeeId = generateEmployeeId();
      const displayName = `${newUserForm.firstName} ${newUserForm.lastName}`;

      // Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserForm.email,
        temporaryPassword
      );

      // Preparar datos completos del usuario
      const userData = {
        uid: userCredential.user.uid,
        email: newUserForm.email,
        firstName: newUserForm.firstName,
        lastName: newUserForm.lastName,
        displayName: displayName,
        phone: newUserForm.phone || '',
        address: newUserForm.address || '',
        role: newUserForm.role,
        active: true,
        workInfo: {
          ...newUserForm.workInfo,
          department: newUserForm.department,
          employeeId: employeeId,
          startDate: new Date().toISOString().split('T')[0]
        },
        permissions: newUserForm.permissions,
        createdAt: serverTimestamp(),
        createdBy: currentUser?.email || 'system',
        updatedAt: serverTimestamp()
      };

      // Guardar en Firestore
      await addDoc(collection(db, 'users'), userData);

      // Obtener configuración del rol para el mensaje
      const roleConfig = departmentConfig[newUserForm.department].roles[newUserForm.role];

      // Mensaje de éxito detallado
      setSuccess(`✅ USUARIO CREADO EXITOSAMENTE

👤 ${newUserForm.firstName} ${newUserForm.lastName}
📧 Email: ${newUserForm.email}
🔑 Contraseña temporal: ${temporaryPassword}
🏢 Departamento: ${departmentConfig[newUserForm.department].name}
👔 Puesto: ${roleConfig.name}
🆔 ID Empleado: ${employeeId}

🔐 PERMISOS ASIGNADOS:
${Object.entries(newUserForm.permissions)
  .filter(([key, value]) => value === true)
  .map(([key, value]) => `✓ ${key.replace(/([A-Z])/g, ' $1').toLowerCase()}`)
  .join('\n')}

⚠️ IMPORTANTE: 
- Proporciona las credenciales de forma segura al empleado
- El usuario debe cambiar la contraseña en su primer acceso
- Los permisos están configurados automáticamente según su rol`);

          // Reset formulario
    setNewUserForm({
      department: '',
      role: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      workInfo: {
        employeeId: '',
        startDate: '',
        status: 'active',
        schedule: {
          workDays: [],
          startTime: '09:00',
          endTime: '17:00'
        }
      },
      permissions: {},
      temporaryPassword: '',
      active: true
    });

    setFormStep(1);
    setCurrentView('list');
    setTimeout(() => setSuccess(''), 25000); // 25 segundos para leer todo

  } catch (error) {
    console.error('Error creando usuario:', error);
    
    let errorMessage = 'Error desconocido';
    if (error.code === 'permission-denied') {
      errorMessage = 'No tienes permisos para crear usuarios. Contacta al administrador.';
    } else if (error.code === 'failed-precondition') {
      errorMessage = 'Error de configuración en Firestore. Verifica las reglas de seguridad.';
    } else {
      errorMessage = error.message;
    }
    
    setError(errorMessage);
    setTimeout(() => setError(''), 5000);
  } finally {
    setLoading(false);
  }
};
  // Función para obtener el color del badge por rol
  const getRoleBadgeColor = (role) => {
    // FOH roles
    if (['host', 'server', 'bartender', 'runner', 'busser'].includes(role)) return 'primary';
    // BOH roles
    if (['chef', 'suchef', 'dishwasher', 'prep', 'lineprep'].includes(role)) return 'warning';
    // Admin roles
    if (['admin', 'manager'].includes(role)) return 'danger';
    return 'secondary';
  };

  // Función para obtener el nombre completo del rol
  const getRoleDisplayName = (role, department) => {
    if (departmentConfig[department] && departmentConfig[department].roles[role]) {
      return departmentConfig[department].roles[role].name;
    }
    return role;
  };

  // Renderizar paso del formulario
  const renderFormStep = () => {
    switch (formStep) {
      case 1: // Selección de Departamento
        return (
          <div>
            <h4 className="mb-4">Paso 1: Selecciona el Departamento</h4>
            <Row>
              {Object.entries(departmentConfig).map(([key, dept]) => {
                const IconComponent = dept.icon;
                return (
                  <Col md={4} key={key} className="mb-3">
                    <Card 
                      className="h-100 text-center cursor-pointer border-2"
                      style={{ 
                        borderColor: newUserForm.department === key ? dept.color : '#dee2e6',
                        cursor: 'pointer'
                      }}
                      onClick={() => handleDepartmentSelect(key)}
                    >
                      <Card.Body className="d-flex flex-column align-items-center">
                        <IconComponent 
                          size={48} 
                          style={{ color: dept.color }} 
                          className="mb-3"
                        />
                        <h5>{dept.name}</h5>
                        <small className="text-muted">
                          {Object.keys(dept.roles).length} roles disponibles
                        </small>
                      </Card.Body>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        );

      case 2: // Selección de Rol
        const selectedDept = departmentConfig[newUserForm.department];
        return (
          <div>
            <div className="d-flex align-items-center mb-4">
              <Button variant="link" className="p-0 me-3" onClick={() => setFormStep(1)}>
                <FaArrowLeft />
              </Button>
              <h4 className="mb-0">Paso 2: Selecciona el Puesto en {selectedDept.name}</h4>
            </div>
            <Row>
              {Object.entries(selectedDept.roles).map(([roleKey, roleData]) => (
                <Col md={6} key={roleKey} className="mb-3">
                  <Card 
                    className="h-100 cursor-pointer border-2"
                    style={{ 
                      borderColor: newUserForm.role === roleKey ? selectedDept.color : '#dee2e6',
                      cursor: 'pointer'
                    }}
                    onClick={() => handleRoleSelect(roleKey)}
                  >
                    <Card.Body>
                      <h6 className="text-primary">{roleData.name}</h6>
                      <p className="small text-muted mb-3">{roleData.description}</p>
                      <div>
                        <small className="fw-bold">Permisos principales:</small>
                        <ul className="small mt-1 mb-0">
                          {Object.entries(roleData.permissions)
                            .filter(([key, value]) => value === true)
                            .slice(0, 3)
                            .map(([key, value]) => (
                              <li key={key}>
                                {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                              </li>
                            ))}
                          {Object.entries(roleData.permissions).filter(([k, v]) => v === true).length > 3 && (
                            <li className="text-muted">Y más...</li>
                          )}
                        </ul>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        );

      case 3: // Datos Personales
  const selectedRole = departmentConfig[newUserForm.department].roles[newUserForm.role];
  return (
    <div>
      <div className="d-flex align-items-center mb-4">
        <Button variant="link" className="p-0 me-3" onClick={() => setFormStep(2)}>
          <FaArrowLeft />
        </Button>
        <h4 className="mb-0">Paso 3: Datos del Empleado</h4>
      </div>

      {/* Resumen de selección */}
      <Alert variant="info" className="mb-4">
        <strong>Puesto seleccionado:</strong> {selectedRole.name} - {departmentConfig[newUserForm.department].name}
      </Alert>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Nombre *</Form.Label>
            <Form.Control
              type="text"
              name="firstName"
              value={newUserForm.firstName}
              onChange={handleInputChange}
              required
              placeholder="Nombre del empleado"
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Apellido *</Form.Label>
            <Form.Control
              type="text"
              name="lastName"
              value={newUserForm.lastName}
              onChange={handleInputChange}
              required
              placeholder="Apellido del empleado"
            />
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
              value={newUserForm.email}
              onChange={handleInputChange}
              required
              placeholder="email@ejemplo.com"
            />
            <Form.Text className="text-muted">
              Se usará para acceder al sistema
            </Form.Text>
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>Teléfono</Form.Label>
            <Form.Control
              type="tel"
              name="phone"
              value={newUserForm.phone}
              onChange={handleInputChange}
              placeholder="+1 (555) 123-4567"
            />
          </Form.Group>
        </Col>
      </Row>

      {/* DÍAS DISPONIBLES PARA TRABAJAR */}
      <Form.Group className="mb-4">
        <Form.Label>Días Disponibles para Trabajar</Form.Label>
        <Form.Text className="d-block mb-2 text-muted">
          Selecciona los días que el empleado puede trabajar (para programación de horarios)
        </Form.Text>
        <div className="d-flex flex-wrap gap-2">
          {[
            { key: 'monday', label: 'Lunes' },
            { key: 'tuesday', label: 'Martes' },
            { key: 'wednesday', label: 'Miércoles' },
            { key: 'thursday', label: 'Jueves' },
            { key: 'friday', label: 'Viernes' },
            { key: 'saturday', label: 'Sábado' },
            { key: 'sunday', label: 'Domingo' }
          ].map((day) => (
            <Form.Check
              key={day.key}
              type="checkbox"
              id={`day-${day.key}`}
              label={day.label}
              checked={newUserForm.workInfo.schedule.workDays.includes(day.key)}
              onChange={(e) => {
                const isChecked = e.target.checked;
                const currentDays = newUserForm.workInfo.schedule.workDays;
                
                let newDays;
                if (isChecked) {
                  newDays = [...currentDays, day.key];
                } else {
                  newDays = currentDays.filter(d => d !== day.key);
                }
                
                setNewUserForm(prev => ({
                  ...prev,
                  workInfo: {
                    ...prev.workInfo,
                    schedule: {
                      ...prev.workInfo.schedule,
                      workDays: newDays
                    }
                  }
                }));
              }}
            />
          ))}
        </div>
        {newUserForm.workInfo.schedule.workDays.length === 0 && (
          <Form.Text className="text-warning">
            ⚠️ Selecciona al menos un día para poder programar horarios
          </Form.Text>
        )}
      </Form.Group>

      <div className="d-flex justify-content-between">
        <Button variant="secondary" onClick={() => setFormStep(2)}>
          Anterior
        </Button>
        <Button 
          variant="success" 
          onClick={() => setFormStep(4)}
          disabled={!newUserForm.firstName || !newUserForm.lastName || !newUserForm.email}
        >
          Revisar y Crear
        </Button>
      </div>
    </div>
  );

// FUNCIÓN DE CREAR USUARIO - COMPLETAMENTE SIN FIREBASE AUTH
const handleCreateUser = async () => {
  setLoading(true);
  setError('');

  try {
    // Validar campos obligatorios
    if (!newUserForm.firstName || !newUserForm.lastName || !newUserForm.email) {
      throw new Error('Nombre, apellido y email son obligatorios');
    }

    if (newUserForm.workInfo.schedule.workDays.length === 0) {
      throw new Error('Debes seleccionar al menos un día disponible para trabajar');
    }

    // Verificar si el email ya existe
    const existingUsersQuery = query(
      collection(db, 'users'), 
      where('email', '==', newUserForm.email)
    );
    const existingUsers = await getDocs(existingUsersQuery);
    
    if (!existingUsers.empty) {
      throw new Error('Este email ya está registrado');
    }

    // Generar datos automáticos
    const temporaryPassword = generateTemporaryPassword();
    const employeeId = generateEmployeeId();
    const displayName = `${newUserForm.firstName} ${newUserForm.lastName}`;

    // CREAR USUARIO SOLO EN FIRESTORE (SIN FIREBASE AUTH)
    const userData = {
      // Información personal (mínima)
      email: newUserForm.email,
      firstName: newUserForm.firstName,
      lastName: newUserForm.lastName,
      displayName: displayName,
      phone: newUserForm.phone || '',
      
      // Información de trabajo
      role: newUserForm.role,
      active: true,
      workInfo: {
        department: newUserForm.department,
        employeeId: employeeId,
        startDate: new Date().toISOString().split('T')[0],
        status: 'active',
        schedule: {
          workDays: newUserForm.workInfo.schedule.workDays,
          startTime: '09:00',
          endTime: '17:00'
        }
      },
      
      // Permisos del sistema
      permissions: newUserForm.permissions,
      
      // Credenciales temporales
      temporaryPassword: temporaryPassword,
      mustChangePassword: true,
      authCreated: false, // No está en Firebase Auth todavía
      
      // Metadata
      createdAt: serverTimestamp(),
      createdBy: currentUser?.email || 'system',
      updatedAt: serverTimestamp()
    };

    // Guardar en Firestore
    const docRef = await addDoc(collection(db, 'users'), userData);
    console.log('Usuario creado en Firestore con ID:', docRef.id);

    // Obtener configuración del rol para el mensaje
    const roleConfig = departmentConfig[newUserForm.department].roles[newUserForm.role];

    // Mensaje de éxito detallado
    setSuccess(`✅ EMPLEADO CREADO EXITOSAMENTE

👤 ${displayName}
📧 Email: ${newUserForm.email}
📱 Teléfono: ${newUserForm.phone || 'No proporcionado'}
🆔 ID Empleado: ${employeeId}

🏢 INFORMACIÓN LABORAL:
• Departamento: ${departmentConfig[newUserForm.department].name}
• Puesto: ${roleConfig.name}
• Días disponibles: ${newUserForm.workInfo.schedule.workDays.map(day => {
  const dayNames = {
    monday: 'Lun', tuesday: 'Mar', wednesday: 'Mié', 
    thursday: 'Jue', friday: 'Vie', saturday: 'Sáb', sunday: 'Dom'
  };
  return dayNames[day];
}).join(', ')}

🔐 CREDENCIALES DE ACCESO:
• Email: ${newUserForm.email}
• Contraseña temporal: ${temporaryPassword}

⚠️ IMPORTANTE: 
• El empleado aparecerá inmediatamente en la lista
• Al hacer su primer login se creará su cuenta de acceso
• Debe cambiar su contraseña en el primer acceso
• Los días disponibles se usarán para programar horarios
• Proporciona estas credenciales de forma segura

📋 INSTRUCCIONES PARA EL EMPLEADO:
1. Ir a la página de login del sistema
2. Usar email: ${newUserForm.email}
3. Usar contraseña: ${temporaryPassword}
4. Cambiar contraseña cuando el sistema lo solicite`);

    // Reset formulario
    setNewUserForm({
      department: '',
      role: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      workInfo: {
        employeeId: '',
        startDate: '',
        status: 'active',
        schedule: {
          workDays: [],
          startTime: '09:00',
          endTime: '17:00'
        }
      },
      permissions: {},
      temporaryPassword: '',
      active: true
    });

    setFormStep(1);
    setCurrentView('list');
    setTimeout(() => setSuccess(''), 30000); // 30 segundos para leer todo

  } catch (error) {
    console.error('Error creando usuario:', error);
    setError(error.message || 'Error al crear el usuario');
    setTimeout(() => setError(''), 5000);
  } finally {
    setLoading(false);
  }
};

      case 4: // Confirmación
        const finalRole = departmentConfig[newUserForm.department].roles[newUserForm.role];
        return (
          <div>
            <div className="d-flex align-items-center mb-4">
              <Button variant="link" className="p-0 me-3" onClick={() => setFormStep(3)}>
                <FaArrowLeft />
              </Button>
              <h4 className="mb-0">Paso 4: Confirmar y Crear Usuario</h4>
            </div>

            <Card className="mb-4">
              <Card.Header>
                <h5>Resumen del Nuevo Usuario</h5>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <h6>Información Personal:</h6>
                    <ul>
                      <li><strong>Nombre:</strong> {newUserForm.firstName} {newUserForm.lastName}</li>
                      <li><strong>Email:</strong> {newUserForm.email}</li>
                      <li><strong>Teléfono:</strong> {newUserForm.phone || 'No proporcionado'}</li>
                      <li><strong>Dirección:</strong> {newUserForm.address || 'No proporcionada'}</li>
                    </ul>
                  </Col>
                  <Col md={6}>
                    <h6>Información Laboral:</h6>
                    <ul>
                      <li><strong>Departamento:</strong> {departmentConfig[newUserForm.department].name}</li>
                      <li><strong>Puesto:</strong> {finalRole.name}</li>
                      <li><strong>Descripción:</strong> {finalRole.description}</li>
                    </ul>
                  </Col>
                </Row>

                <h6 className="mt-3">Permisos del Sistema:</h6>
                <Row>
                  {Object.entries(newUserForm.permissions)
                    .filter(([key, value]) => value === true)
                    .map(([key, value]) => (
                      <Col md={6} key={key}>
                        <small>✓ {key.replace(/([A-Z])/g, ' $1').toLowerCase()}</small>
                      </Col>
                    ))}
                </Row>
              </Card.Body>
            </Card>

            <div className="d-flex justify-content-between">
              <Button variant="secondary" onClick={() => setFormStep(3)}>
                Anterior
              </Button>
              <Button 
                variant="success" 
                onClick={handleCreateUser}
                disabled={loading}
                size="lg"
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creando Usuario...
                  </>
                ) : (
                  <>
                    <FaUserPlus className="me-2" />
                    Crear Usuario
                  </>
                )}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // RENDER PRINCIPAL
  if (currentView === 'add') {
    return (
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Button 
                  variant="link" 
                  onClick={() => {
                    setCurrentView('list');
                    setFormStep(1);
                    // Reset form
                    setNewUserForm({
                      department: '',
                      role: '',
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      address: '',
                      workInfo: {
                        employeeId: '',
                        startDate: '',
                        status: 'active',
                        schedule: {
                          workDays: [],
                          startTime: '09:00',
                          endTime: '17:00'
                        }
                      },
                      permissions: {},
                      temporaryPassword: '',
                      active: true
                    });
                  }}
                  className="p-0 mb-2"
                >
                  <FaArrowLeft className="me-2" />
                  Volver a la lista
                </Button>
                <h2>
                  <FaUserPlus className="me-2" />
                  Crear Nuevo Usuario
                </h2>
                <p className="text-muted">
                  Sistema de creación por pasos con asignación automática de permisos
                </p>
              </div>
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
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{success}</pre>
          </Alert>
        )}

        {/* Indicador de progreso */}
        <Card className="mb-4">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className={`badge ${formStep >= 1 ? 'bg-success' : 'bg-secondary'}`}>1. Departamento</span>
              <span className={`badge ${formStep >= 2 ? 'bg-success' : 'bg-secondary'}`}>2. Puesto</span>
              <span className={`badge ${formStep >= 3 ? 'bg-success' : 'bg-secondary'}`}>3. Datos Personales</span>
              <span className={`badge ${formStep >= 4 ? 'bg-success' : 'bg-secondary'}`}>4. Confirmación</span>
            </div>
            <div className="progress">
              <div 
                className="progress-bar" 
                role="progressbar" 
                style={{ width: `${(formStep / 4) * 100}%` }}
              ></div>
            </div>
          </Card.Body>
        </Card>

        {/* Formulario por pasos */}
        <Card>
          <Card.Body>
            {renderFormStep()}
          </Card.Body>
        </Card>
      </Container>
    );
  }

  // VISTA DE LISTA DE USUARIOS
  return (
    <Container fluid>
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <FaUsers className="me-2" />
                Gestión de Personal
              </h2>
              <p className="text-muted">
                Sistema completo de gestión de usuarios con roles y permisos
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => setCurrentView('add')}
              disabled={loading}
            >
              <FaPlus className="me-2" />
              Nuevo Usuario
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
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{success}</pre>
        </Alert>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Buscar</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Buscar por nombre o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Departamento</Form.Label>
                <Form.Select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="FOH">Front of House</option>
                  <option value="BOH">Back of House</option>
                  <option value="ADMIN">Administración</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2}>
              <Form.Group>
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Lista de usuarios */}
      <Card>
        <Card.Body>
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" />
              <p className="mt-2">Cargando usuarios...</p>
            </div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Email</th>
                  <th>Departamento</th>
                  <th>Puesto</th>
                  <th>Estado</th>
                  <th>ID Empleado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(userData => (
                  <tr key={userData.id}>
                    <td>
                      <div>
                        <div className="fw-bold">
                          {userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Sin nombre'}
                        </div>
                        <small className="text-muted">{userData.phone}</small>
                      </div>
                    </td>
                    <td>{userData.email}</td>
                    <td>
                      <Badge bg="secondary">
                        {userData.workInfo?.department || 'No asignado'}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={getRoleBadgeColor(userData.role)}>
                        {getRoleDisplayName(userData.role, userData.workInfo?.department)}
                      </Badge>
                    </td>
                    <td>
                      <Badge bg={userData.active !== false ? 'success' : 'danger'}>
                        {userData.active !== false ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td>
                      <code>{userData.workInfo?.employeeId || 'No asignado'}</code>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <OverlayTrigger overlay={<Tooltip>{userData.active !== false ? 'Desactivar' : 'Activar'}</Tooltip>}>
                          <Button
                            variant={userData.active !== false ? 'outline-warning' : 'outline-success'}
                            size="sm"
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'users', userData.id), {
                                  active: !userData.active
                                });
                                setSuccess(`Usuario ${userData.active ? 'desactivado' : 'activado'} exitosamente`);
                                setTimeout(() => setSuccess(''), 3000);
                              } catch (error) {
                                setError('Error actualizando usuario');
                                setTimeout(() => setError(''), 3000);
                              }
                            }}
                            disabled={userData.email === currentUser.email}
                          >
                            {userData.active !== false ? <FaUserTimes /> : <FaUserCheck />}
                          </Button>
                        </OverlayTrigger>

                        {userRole === 'admin' && userData.email !== currentUser.email && (
                          <OverlayTrigger overlay={<Tooltip>Eliminar usuario</Tooltip>}>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={async () => {
                                if (window.confirm(`¿Estás seguro de eliminar a ${userData.displayName}?`)) {
                                  try {
                                    await deleteDoc(doc(db, 'users', userData.id));
                                    setSuccess('Usuario eliminado exitosamente');
                                    setTimeout(() => setSuccess(''), 3000);
                                  } catch (error) {
                                    setError('Error eliminando usuario');
                                    setTimeout(() => setError(''), 3000);
                                  }
                                }
                              }}
                              disabled={loading}
                            >
                              <FaTrash />
                            </Button>
                          </OverlayTrigger>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AdvancedUserManagement;