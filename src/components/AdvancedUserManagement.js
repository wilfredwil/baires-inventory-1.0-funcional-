// src/components/AdvancedUserManagement.js
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Card, 
  Button, 
  Form, 
  Row, 
  Col, 
  Alert, 
  Badge, 
  Image, 
  Spinner,
  InputGroup,
  Table,
  Nav,
  Tab,
  Tabs,
  Dropdown,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { 
  FaUsers, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaFilter,
  FaEye,
  FaUserPlus,
  FaUserCog,
  FaUserShield,
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaIdCard,
  FaBriefcase,
  FaKey,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaFileExport,
  FaUserCheck,
  FaUserTimes,
  FaExclamationTriangle
} from 'react-icons/fa';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  orderBy,
  onSnapshot,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { db, auth } from '../firebase';
import UserProfile from './UserProfile';

const AdvancedUserManagement = ({ show, onHide, user, userRole }) => {
  // Estados principales
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de vista
  const [currentView, setCurrentView] = useState('list'); // 'list', 'add', 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState('asc');

  // Estados del formulario de nuevo usuario
  const [newUserForm, setNewUserForm] = useState({
    // Información básica
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    birthDate: '',
    
    // Información laboral
    role: 'waiter',
    workInfo: {
      employeeId: '',
      position: '',
      department: '',
      startDate: new Date().toISOString().split('T')[0],
      salary: '',
      workSchedule: '',
      manager: '',
      status: 'active'
    },
    
    // Dirección
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Argentina'
    },
    
    // Configuraciones iniciales
    preferences: {
      notifications: {
        email: true,
        push: true,
        sms: false,
        schedule: true,
        announcements: true
      },
      privacy: {
        showPhone: true,
        showAddress: false,
        showSalary: false
      },
      language: 'es',
      timezone: 'America/Argentina/Buenos_Aires'
    },
    
    // Estado
    active: true,
    
    // Contraseña temporal
    temporaryPassword: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Cargar usuarios
  useEffect(() => {
    if (show) {
      const usersQuery = query(
        collection(db, 'users'),
        orderBy('firstName', 'asc')
      );

      const unsubscribe = onSnapshot(usersQuery, 
        (snapshot) => {
          const userData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsers(userData);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading users:', error);
          setError('Error al cargar los usuarios');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [show]);

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...users];

    // Filtro de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.firstName?.toLowerCase().includes(search) ||
        user.lastName?.toLowerCase().includes(search) ||
        user.displayName?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search) ||
        user.workInfo?.employeeId?.toLowerCase().includes(search)
      );
    }

    // Filtro por rol
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtro por estado
    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.active !== false && user.workInfo?.status === 'active');
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => user.active === false || user.workInfo?.status !== 'active');
      } else {
        filtered = filtered.filter(user => user.workInfo?.status === statusFilter);
      }
    }

    // Filtro por departamento
    if (departmentFilter) {
      filtered = filtered.filter(user => user.workInfo?.department === departmentFilter);
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortBy) {
        case 'firstName':
          aValue = a.firstName || '';
          bValue = b.firstName || '';
          break;
        case 'lastName':
          aValue = a.lastName || '';
          bValue = b.lastName || '';
          break;
        case 'email':
          aValue = a.email || '';
          bValue = b.email || '';
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'department':
          aValue = a.workInfo?.department || '';
          bValue = b.workInfo?.department || '';
          break;
        case 'startDate':
          aValue = a.workInfo?.startDate || '';
          bValue = b.workInfo?.startDate || '';
          break;
        default:
          aValue = a.firstName || '';
          bValue = b.firstName || '';
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter, statusFilter, departmentFilter, sortBy, sortOrder]);

  // Funciones auxiliares
  const getUniqueValues = (field, subfield = null) => {
    const values = users.map(user => {
      if (subfield) {
        return user[field]?.[subfield];
      }
      return user[field];
    }).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'manager': return 'primary';
      case 'bartender': return 'success';
      case 'waiter': return 'warning';
      default: return 'secondary';
    }
  };

  const getRoleText = (role) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'bartender': return 'Bartender';
      case 'waiter': return 'Mesero';
      default: return role;
    }
  };

  const getStatusColor = (user) => {
    if (user.active === false) return 'secondary';
    switch (user.workInfo?.status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'vacation': return 'info';
      case 'sick': return 'warning';
      case 'suspended': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (user) => {
    if (user.active === false) return 'Inactivo';
    switch (user.workInfo?.status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'vacation': return 'Vacaciones';
      case 'sick': return 'Licencia';
      case 'suspended': return 'Suspendido';
      default: return 'No definido';
    }
  };

  // Manejo del formulario
  const handleInputChange = (e, section = null, subsection = null) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    if (section && subsection) {
      setNewUserForm(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [name]: newValue
          }
        }
      }));
    } else if (section) {
      setNewUserForm(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: newValue
        }
      }));
    } else {
      setNewUserForm(prev => ({
        ...prev,
        [name]: newValue
      }));
    }

    // Limpiar errores
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Generar ID de empleado automático
  const generateEmployeeId = () => {
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `EMP${year}${randomNum}`;
  };

  // Generar contraseña temporal
  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Validar formulario
  const validateForm = () => {
    const errors = {};

    if (!newUserForm.firstName.trim()) {
      errors.firstName = 'El nombre es obligatorio';
    }

    if (!newUserForm.lastName.trim()) {
      errors.lastName = 'El apellido es obligatorio';
    }

    if (!newUserForm.email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUserForm.email)) {
      errors.email = 'Formato de email inválido';
    } else if (users.some(u => u.email === newUserForm.email && u.id !== selectedUser?.id)) {
      errors.email = 'Este email ya está en uso';
    }

    if (newUserForm.phone && !/^\+?[\d\s\-\(\)]+$/.test(newUserForm.phone)) {
      errors.phone = 'Formato de teléfono inválido';
    }

    if (!newUserForm.role) {
      errors.role = 'El rol es obligatorio';
    }

    if (!newUserForm.workInfo.position.trim()) {
      errors.position = 'La posición es obligatoria';
    }

    if (!newUserForm.workInfo.department.trim()) {
      errors.department = 'El departamento es obligatorio';
    }

    if (newUserForm.workInfo.salary && isNaN(newUserForm.workInfo.salary)) {
      errors.salary = 'El salario debe ser un número válido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Crear nuevo usuario
  const handleCreateUser = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Generar datos automáticos si no están presentes
      if (!newUserForm.workInfo.employeeId) {
        newUserForm.workInfo.employeeId = generateEmployeeId();
      }

      if (!newUserForm.temporaryPassword) {
        newUserForm.temporaryPassword = generateTemporaryPassword();
      }

      if (!newUserForm.displayName) {
        newUserForm.displayName = `${newUserForm.firstName} ${newUserForm.lastName}`;
      }

      // Crear usuario en Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        newUserForm.email, 
        newUserForm.temporaryPassword
      );

      // Crear documento en Firestore
      const userData = {
        ...newUserForm,
        uid: userCredential.user.uid,
        createdAt: serverTimestamp(),
        createdBy: user.email,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      };

      // Quitar la contraseña temporal del documento
      delete userData.temporaryPassword;

      await addDoc(collection(db, 'users'), userData);

      setSuccess(`Usuario creado exitosamente. Contraseña temporal: ${newUserForm.temporaryPassword}`);
      
      // Resetear formulario
      setNewUserForm({
        firstName: '',
        lastName: '',
        displayName: '',
        email: '',
        phone: '',
        birthDate: '',
        role: 'waiter',
        workInfo: {
          employeeId: '',
          position: '',
          department: '',
          startDate: new Date().toISOString().split('T')[0],
          salary: '',
          workSchedule: '',
          manager: '',
          status: 'active'
        },
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'Argentina'
        },
        preferences: {
          notifications: {
            email: true,
            push: true,
            sms: false,
            schedule: true,
            announcements: true
          },
          privacy: {
            showPhone: true,
            showAddress: false,
            showSalary: false
          },
          language: 'es',
          timezone: 'America/Argentina/Buenos_Aires'
        },
        active: true,
        temporaryPassword: ''
      });

      setCurrentView('list');
      setTimeout(() => setSuccess(''), 10000);
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Error al crear el usuario: ' + err.message);
    }
    setLoading(false);
  };

  // Actualizar usuario
  const handleUpdateUser = async (userId, updates) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      });
      setSuccess('Usuario actualizado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Error al actualizar el usuario');
    }
    setLoading(false);
  };

  // Desactivar/activar usuario
  const handleToggleUserStatus = async (user) => {
    const newStatus = !user.active;
    await handleUpdateUser(user.id, { active: newStatus });
  };

  // Cambiar rol de usuario
  const handleChangeUserRole = async (userId, newRole) => {
    if (window.confirm(`¿Estás seguro de cambiar el rol a ${getRoleText(newRole)}?`)) {
      await handleUpdateUser(userId, { role: newRole });
    }
  };

  // Resetear contraseña
  const handleResetPassword = async (userEmail) => {
    if (window.confirm(`¿Enviar email de reset de contraseña a ${userEmail}?`)) {
      try {
        await sendPasswordResetEmail(auth, userEmail);
        setSuccess(`Email de reset enviado a ${userEmail}`);
        setTimeout(() => setSuccess(''), 5000);
      } catch (err) {
        console.error('Error sending reset email:', err);
        setError('Error al enviar email de reset');
      }
    }
  };

  // Eliminar usuario
  const handleDeleteUser = async (userId, userEmail) => {
    if (userEmail === user.email) {
      setError('No puedes eliminar tu propia cuenta');
      return;
    }

    if (window.confirm('¿Estás seguro? Esta acción no se puede deshacer.')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setSuccess('Usuario eliminado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error deleting user:', err);
        setError('Error al eliminar el usuario');
      }
    }
  };

  // Ver perfil completo
  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowUserProfile(true);
  };

  // Exportar usuarios
  const handleExportUsers = () => {
    const csvData = filteredUsers.map(user => ({
      'ID Empleado': user.workInfo?.employeeId || '',
      'Nombre': user.firstName || '',
      'Apellido': user.lastName || '',
      'Email': user.email || '',
      'Teléfono': user.phone || '',
      'Rol': getRoleText(user.role),
      'Posición': user.workInfo?.position || '',
      'Departamento': user.workInfo?.department || '',
      'Fecha Inicio': user.workInfo?.startDate || '',
      'Estado': getStatusText(user),
      'Salario': user.workInfo?.salary || '',
      'Ciudad': user.address?.city || '',
      'Activo': user.active !== false ? 'Sí' : 'No'
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_baires_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccess('Lista de usuarios exportada exitosamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUserShield className="me-2" />
            Gestión Avanzada de Usuarios
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
          {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

          <Tabs activeKey={currentView} onSelect={(k) => setCurrentView(k)} className="mb-4">
            {/* TAB DE LISTA DE USUARIOS */}
            <Tab eventKey="list" title={<><FaUsers className="me-1" />Lista de Usuarios</>}>
              {/* Controles superiores */}
              <Row className="mb-4">
                <Col md={8}>
                  <Row>
                    <Col md={4}>
                      <InputGroup>
                        <InputGroup.Text><FaSearch /></InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder="Buscar usuarios..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </InputGroup>
                    </Col>
                    <Col md={2}>
                      <Form.Select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <option value="">Todos los roles</option>
                        <option value="admin">Administradores</option>
                        <option value="manager">Gerentes</option>
                        <option value="bartender">Bartenders</option>
                        <option value="waiter">Meseros</option>
                      </Form.Select>
                    </Col>
                    <Col md={3}>
                      <Form.Select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                      >
                        <option value="">Todos los departamentos</option>
                        {getUniqueValues('workInfo', 'department').map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={3}>
                      <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">Todos los estados</option>
                        <option value="active">Activos</option>
                        <option value="inactive">Inactivos</option>
                        <option value="vacation">Vacaciones</option>
                        <option value="sick">Licencia</option>
                        <option value="suspended">Suspendidos</option>
                      </Form.Select>
                    </Col>
                  </Row>
                </Col>
                <Col md={4}>
                  <div className="d-flex gap-2 justify-content-end">
                    <Button variant="outline-success" onClick={handleExportUsers}>
                      <FaFileExport className="me-1" />
                      Exportar
                    </Button>
                    <Button variant="primary" onClick={() => setCurrentView('add')}>
                      <FaUserPlus className="me-1" />
                      Nuevo Usuario
                    </Button>
                  </div>
                </Col>
              </Row>

              {/* Tabla de usuarios */}
              {loading ? (
                <div className="text-center p-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Cargando usuarios...</p>
                </div>
              ) : (
                <Table striped hover responsive>
                  <thead>
                    <tr>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('firstName')}>
                        Nombre {sortBy === 'firstName' && (sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />)}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('email')}>
                        Email {sortBy === 'email' && (sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />)}
                      </th>
                      <th style={{ cursor: 'pointer' }} onClick={() => handleSort('role')}>
                        Rol {sortBy === 'role' && (sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />)}
                      </th>
                      <th>Posición</th>
                      <th>Departamento</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(userData => (
                      <tr key={userData.id}>
                        <td>
                          <div className="d-flex align-items-center">
                            <Image
                              src={userData.profileImage || '/api/placeholder/40/40'}
                              roundedCircle
                              width={40}
                              height={40}
                              className="me-3"
                              style={{ objectFit: 'cover' }}
                            />
                            <div>
                              <div className="fw-bold">
                                {userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Sin nombre'}
                              </div>
                              <small className="text-muted">{userData.workInfo?.employeeId}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div>{userData.email}</div>
                          {userData.phone && (
                            <small className="text-muted d-block">
                              <FaPhone className="me-1" />
                              {userData.phone}
                            </small>
                          )}
                        </td>
                        <td>
                          <Dropdown>
                            <Dropdown.Toggle
                              variant={getRoleColor(userData.role)}
                              size="sm"
                              disabled={userData.email === user.email || userRole !== 'admin'}
                            >
                              {getRoleText(userData.role)}
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => handleChangeUserRole(userData.id, 'admin')}>
                                Administrador
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleChangeUserRole(userData.id, 'manager')}>
                                Gerente
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleChangeUserRole(userData.id, 'bartender')}>
                                Bartender
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleChangeUserRole(userData.id, 'waiter')}>
                                Mesero
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </td>
                        <td>{userData.workInfo?.position || '-'}</td>
                        <td>{userData.workInfo?.department || '-'}</td>
                        <td>
                          <Badge bg={getStatusColor(userData)}>
                            {getStatusText(userData)}
                          </Badge>
                        </td>
                        <td>
                          <div className="d-flex gap-1">
                            <OverlayTrigger overlay={<Tooltip>Ver perfil completo</Tooltip>}>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleViewProfile(userData)}
                              >
                                <FaEye />
                              </Button>
                            </OverlayTrigger>
                            
                            <OverlayTrigger overlay={<Tooltip>Reset contraseña</Tooltip>}>
                              <Button
                                variant="outline-warning"
                                size="sm"
                                onClick={() => handleResetPassword(userData.email)}
                              >
                                <FaKey />
                              </Button>
                            </OverlayTrigger>

                            <OverlayTrigger overlay={<Tooltip>{userData.active !== false ? 'Desactivar' : 'Activar'}</Tooltip>}>
                              <Button
                                variant={userData.active !== false ? 'outline-danger' : 'outline-success'}
                                size="sm"
                                onClick={() => handleToggleUserStatus(userData)}
                                disabled={userData.email === user.email}
                              >
                                {userData.active !== false ? <FaUserTimes /> : <FaUserCheck />}
                              </Button>
                            </OverlayTrigger>

                            {userRole === 'admin' && userData.email !== user.email && (
                              <OverlayTrigger overlay={<Tooltip>Eliminar usuario</Tooltip>}>
                                <Button
                                  variant="outline-danger"
                                  size="sm"
                                  onClick={() => handleDeleteUser(userData.id, userData.email)}
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

              <div className="d-flex justify-content-between align-items-center mt-3">
                <Badge bg="secondary">
                  Mostrando {filteredUsers.length} de {users.length} usuarios
                </Badge>
              </div>
            </Tab>

            {/* TAB DE AGREGAR USUARIO */}
            <Tab eventKey="add" title={<><FaUserPlus className="me-1" />Nuevo Usuario</>}>
              <Form>
                <Row>
                  {/* Información Personal */}
                  <Col md={6}>
                    <Card className="mb-4">
                      <Card.Header>
                        <h6 className="mb-0">Información Personal</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Nombre *</Form.Label>
                              <Form.Control
                                type="text"
                                name="firstName"
                                value={newUserForm.firstName}
                                onChange={handleInputChange}
                                isInvalid={!!formErrors.firstName}
                                placeholder="Nombre"
                              />
                              <Form.Control.Feedback type="invalid">
                                {formErrors.firstName}
                              </Form.Control.Feedback>
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
                                isInvalid={!!formErrors.lastName}
                                placeholder="Apellido"
                              />
                              <Form.Control.Feedback type="invalid">
                                {formErrors.lastName}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Nombre a mostrar</Form.Label>
                          <Form.Control
                            type="text"
                            name="displayName"
                            value={newUserForm.displayName}
                            onChange={handleInputChange}
                            placeholder="Se generará automáticamente si se deja vacío"
                          />
                        </Form.Group>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Email *</Form.Label>
                              <Form.Control
                                type="email"
                                name="email"
                                value={newUserForm.email}
                                onChange={handleInputChange}
                                isInvalid={!!formErrors.email}
                                placeholder="usuario@ejemplo.com"
                              />
                              <Form.Control.Feedback type="invalid">
                                {formErrors.email}
                              </Form.Control.Feedback>
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
                                isInvalid={!!formErrors.phone}
                                placeholder="+54 11 1234-5678"
                              />
                              <Form.Control.Feedback type="invalid">
                                {formErrors.phone}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mb-3">
                          <Form.Label>Fecha de Nacimiento</Form.Label>
                          <Form.Control
                            type="date"
                            name="birthDate"
                            value={newUserForm.birthDate}
                            onChange={handleInputChange}
                          />
                        </Form.Group>
                      </Card.Body>
                    </Card>
                  </Col>

                  {/* Información Laboral */}
                  <Col md={6}>
                    <Card className="mb-4">
                      <Card.Header>
                        <h6 className="mb-0">Información Laboral</h6>
                      </Card.Header>
                      <Card.Body>
                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Rol *</Form.Label>
                              <Form.Select
                                name="role"
                                value={newUserForm.role}
                                onChange={handleInputChange}
                                isInvalid={!!formErrors.role}
                              >
                                <option value="">Seleccionar rol...</option>
                                <option value="admin">Administrador</option>
                                <option value="manager">Gerente</option>
                                <option value="bartender">Bartender</option>
                                <option value="waiter">Mesero</option>
                              </Form.Select>
                              <Form.Control.Feedback type="invalid">
                                {formErrors.role}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>ID Empleado</Form.Label>
                              <InputGroup>
                                <Form.Control
                                  type="text"
                                  name="employeeId"
                                  value={newUserForm.workInfo.employeeId}
                                  onChange={(e) => handleInputChange(e, 'workInfo')}
                                  placeholder="Se generará automáticamente"
                                />
                                <Button 
                                  variant="outline-secondary" 
                                  onClick={() => setNewUserForm(prev => ({
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
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Posición *</Form.Label>
                              <Form.Select
                                name="position"
                                value={newUserForm.workInfo.position}
                                onChange={(e) => handleInputChange(e, 'workInfo')}
                                isInvalid={!!formErrors.position}
                              >
                                <option value="">Seleccionar posición...</option>
                                <option value="Bartender">Bartender</option>
                                <option value="Mesero">Mesero</option>
                                <option value="Cocinero">Cocinero</option>
                                <option value="Ayudante de Cocina">Ayudante de Cocina</option>
                                <option value="Host/Hostess">Host/Hostess</option>
                                <option value="Gerente">Gerente</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Limpieza">Limpieza</option>
                                <option value="Seguridad">Seguridad</option>
                              </Form.Select>
                              <Form.Control.Feedback type="invalid">
                                {formErrors.position}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Departamento *</Form.Label>
                              <Form.Select
                                name="department"
                                value={newUserForm.workInfo.department}
                                onChange={(e) => handleInputChange(e, 'workInfo')}
                                isInvalid={!!formErrors.department}
                              >
                                <option value="">Seleccionar departamento...</option>
                                <option value="Cocina">Cocina</option>
                                <option value="Bar">Bar</option>
                                <option value="Salón">Salón</option>
                                <option value="Administración">Administración</option>
                                <option value="Limpieza">Limpieza</option>
                                <option value="Seguridad">Seguridad</option>
                              </Form.Select>
                              <Form.Control.Feedback type="invalid">
                                {formErrors.department}
                              </Form.Control.Feedback>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Fecha de Inicio</Form.Label>
                              <Form.Control
                                type="date"
                                name="startDate"
                                value={newUserForm.workInfo.startDate}
                                onChange={(e) => handleInputChange(e, 'workInfo')}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Salario Mensual</Form.Label>
                              <InputGroup>
                                <InputGroup.Text>$</InputGroup.Text>
                                <Form.Control
                                  type="number"
                                  name="salary"
                                  value={newUserForm.workInfo.salary}
                                  onChange={(e) => handleInputChange(e, 'workInfo')}
                                  isInvalid={!!formErrors.salary}
                                  placeholder="0"
                                />
                                <Form.Control.Feedback type="invalid">
                                  {formErrors.salary}
                                </Form.Control.Feedback>
                              </InputGroup>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Row>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Horario de Trabajo</Form.Label>
                              <Form.Control
                                type="text"
                                name="workSchedule"
                                value={newUserForm.workInfo.workSchedule}
                                onChange={(e) => handleInputChange(e, 'workInfo')}
                                placeholder="Ej: Lunes a Viernes 9:00-17:00"
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group className="mb-3">
                              <Form.Label>Manager/Supervisor</Form.Label>
                              <Form.Select
                                name="manager"
                                value={newUserForm.workInfo.manager}
                                onChange={(e) => handleInputChange(e, 'workInfo')}
                              >
                                <option value="">Sin supervisor asignado</option>
                                {users.filter(u => u.role === 'admin' || u.role === 'manager').map(manager => (
                                  <option key={manager.id} value={manager.email}>
                                    {manager.displayName || `${manager.firstName} ${manager.lastName}`}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Dirección */}
                <Card className="mb-4">
                  <Card.Header>
                    <h6 className="mb-0">Dirección</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>Dirección</Form.Label>
                          <Form.Control
                            type="text"
                            name="street"
                            value={newUserForm.address.street}
                            onChange={(e) => handleInputChange(e, 'address')}
                            placeholder="Calle y número"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Código Postal</Form.Label>
                          <Form.Control
                            type="text"
                            name="zipCode"
                            value={newUserForm.address.zipCode}
                            onChange={(e) => handleInputChange(e, 'address')}
                            placeholder="1234"
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Ciudad</Form.Label>
                          <Form.Control
                            type="text"
                            name="city"
                            value={newUserForm.address.city}
                            onChange={(e) => handleInputChange(e, 'address')}
                            placeholder="Buenos Aires"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Provincia/Estado</Form.Label>
                          <Form.Control
                            type="text"
                            name="state"
                            value={newUserForm.address.state}
                            onChange={(e) => handleInputChange(e, 'address')}
                            placeholder="Buenos Aires"
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>País</Form.Label>
                          <Form.Control
                            type="text"
                            name="country"
                            value={newUserForm.address.country}
                            onChange={(e) => handleInputChange(e, 'address')}
                            placeholder="Argentina"
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Contraseña Temporal */}
                <Card className="mb-4">
                  <Card.Header>
                    <h6 className="mb-0">Configuración de Acceso</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Contraseña Temporal</Form.Label>
                          <InputGroup>
                            <Form.Control
                              type="text"
                              name="temporaryPassword"
                              value={newUserForm.temporaryPassword}
                              onChange={handleInputChange}
                              placeholder="Se generará automáticamente"
                            />
                            <Button 
                              variant="outline-secondary" 
                              onClick={() => setNewUserForm(prev => ({
                                ...prev,
                                temporaryPassword: generateTemporaryPassword()
                              }))}
                            >
                              Generar
                            </Button>
                          </InputGroup>
                          <Form.Text className="text-muted">
                            El usuario deberá cambiarla en su primer inicio de sesión
                          </Form.Text>
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Estado del Usuario</Form.Label>
                          <Form.Select
                            name="status"
                            value={newUserForm.workInfo.status}
                            onChange={(e) => handleInputChange(e, 'workInfo')}
                          >
                            <option value="active">Activo</option>
                            <option value="inactive">Inactivo</option>
                            <option value="vacation">En Vacaciones</option>
                            <option value="sick">Licencia Médica</option>
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Check
                      type="switch"
                      id="user-active"
                      label="Usuario activo en el sistema"
                      checked={newUserForm.active}
                      onChange={(e) => setNewUserForm(prev => ({
                        ...prev,
                        active: e.target.checked
                      }))}
                    />
                  </Card.Body>
                </Card>

                <div className="d-flex justify-content-end gap-2">
                  <Button 
                    variant="secondary" 
                    onClick={() => setCurrentView('list')}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    variant="primary" 
                    onClick={handleCreateUser}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <FaUserPlus className="me-2" />
                        Crear Usuario
                      </>
                    )}
                  </Button>
                </div>
              </Form>
            </Tab>
          </Tabs>
        </Modal.Body>
      </Modal>

      {/* Modal de perfil de usuario */}
      {showUserProfile && selectedUser && (
        <UserProfile
          show={showUserProfile}
          onHide={() => setShowUserProfile(false)}
          user={user}
          userRole={userRole}
          currentUserData={selectedUser}
          onProfileUpdate={(updatedData) => {
            handleUpdateUser(selectedUser.id, updatedData);
            setSelectedUser({ ...selectedUser, ...updatedData });
          }}
        />
      )}
    </>
  );
};

export default AdvancedUserManagement;