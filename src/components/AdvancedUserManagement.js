// src/components/AdvancedUserManagement.js
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
  FaArrowLeft, FaCog
} from 'react-icons/fa';
import { 
  collection, onSnapshot, doc, updateDoc, orderBy, query
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db } from '../firebase';

const AdvancedUserManagement = ({ onBack, currentUser, userRole }) => {
  // Estados principales
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de vista
  const [currentView, setCurrentView] = useState('list'); // 'list', 'add'
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState('asc');

  // Inicializar Cloud Functions
  const functions = getFunctions();
  const createUserFunction = httpsCallable(functions, 'createUser');
  const deleteUserFunction = httpsCallable(functions, 'deleteUser');
  const updateUserRoleFunction = httpsCallable(functions, 'updateUserRole');

  // Estado del formulario
  const [newUserForm, setNewUserForm] = useState({
    email: '',
    temporaryPassword: '',
    firstName: '',
    lastName: '',
    displayName: '',
    phone: '',
    address: '',
    role: 'bartender',
    active: true,
    workInfo: {
      employeeId: '',
      department: 'FOH',
      position: '',
      salary: '',
      startDate: '',
      status: 'active',
      schedule: {
        workDays: [],
        startTime: '09:00',
        endTime: '17:00'
      }
    }
  });

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

    // Filtro de búsqueda
    if (searchTerm) {
      filtered = filtered.filter(user => 
        (user.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro por rol
    if (roleFilter) {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Filtro por departamento
    if (departmentFilter) {
      filtered = filtered.filter(user => user.workInfo?.department === departmentFilter);
    }

    // Filtro por estado
    if (statusFilter) {
      if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.active !== false);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => user.active === false);
      }
    }

    // Ordenamiento
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

  // Generar contraseña temporal
  const generateTemporaryPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Generar ID de empleado
  const generateEmployeeId = () => {
    return `EMP${Date.now().toString().slice(-6)}`;
  };

  // Manejar cambios en el formulario
  const handleInputChange = (e, section = null) => {
    const { name, value, type, checked } = e.target;
    const inputValue = type === 'checkbox' ? checked : value;

    if (section) {
      setNewUserForm(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: inputValue
        }
      }));
    } else {
      setNewUserForm(prev => ({
        ...prev,
        [name]: inputValue
      }));
    }
  };

  // Crear usuario usando Cloud Function
  const handleCreateUser = async () => {
    setLoading(true);
    setError('');

    try {
      // Generar datos automáticos si no están presentes
      if (!newUserForm.temporaryPassword) {
        newUserForm.temporaryPassword = generateTemporaryPassword();
      }

      if (!newUserForm.workInfo.employeeId) {
        newUserForm.workInfo.employeeId = generateEmployeeId();
      }

      if (!newUserForm.displayName) {
        newUserForm.displayName = `${newUserForm.firstName} ${newUserForm.lastName}`;
      }

      console.log('Llamando a Cloud Function createUser...');

      // Llamar a la Cloud Function
      const result = await createUserFunction({
        email: newUserForm.email,
        password: newUserForm.temporaryPassword,
        firstName: newUserForm.firstName,
        lastName: newUserForm.lastName,
        role: newUserForm.role,
        workInfo: newUserForm.workInfo
      });

      console.log('Resultado de Cloud Function:', result.data);

      if (result.data.success) {
        setSuccess(`✅ Usuario creado exitosamente!

📧 Email: ${newUserForm.email}
🔑 Contraseña temporal: ${newUserForm.temporaryPassword}
👤 Nombre: ${newUserForm.firstName} ${newUserForm.lastName}
🏷️ Rol: ${newUserForm.role}
🆔 ID Empleado: ${result.data.employeeId}
🏢 Departamento: ${newUserForm.workInfo.department}

⚠️ El usuario debe cambiar su contraseña en el primer login.`);

        // Limpiar formulario
        setNewUserForm({
          email: '',
          temporaryPassword: '',
          firstName: '',
          lastName: '',
          displayName: '',
          phone: '',
          address: '',
          role: 'bartender',
          active: true,
          workInfo: {
            employeeId: '',
            department: 'FOH',
            position: '',
            salary: '',
            startDate: '',
            status: 'active',
            schedule: {
              workDays: [],
              startTime: '09:00',
              endTime: '17:00'
            }
          }
        });

        setCurrentView('list');
        
        // Limpiar mensaje después de 15 segundos
        setTimeout(() => setSuccess(''), 15000);
      }

    } catch (error) {
      console.error('Error completo:', error);
      
      let errorMessage = 'Error desconocido';
      
      if (error.code === 'functions/already-exists') {
        errorMessage = 'Este email ya está registrado';
      } else if (error.code === 'functions/invalid-argument') {
        errorMessage = error.message;
      } else if (error.code === 'functions/permission-denied') {
        errorMessage = 'No tienes permisos para crear usuarios';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage = 'Debes estar autenticado';
      } else {
        errorMessage = `Error: ${error.message}`;
      }
      
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Eliminar usuario usando Cloud Function
  const handleDeleteUser = async (userId, userEmail) => {
    if (!window.confirm(`¿Estás seguro de eliminar al usuario ${userEmail}?`)) {
      return;
    }

    if (userId === currentUser.uid) {
      setError('No puedes eliminarte a ti mismo');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    try {
      const result = await deleteUserFunction({ uid: userId });
      
      if (result.data.success) {
        setSuccess('Usuario eliminado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      setError(`Error eliminando usuario: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estado de usuario
  const handleToggleUserStatus = async (userData) => {
    try {
      const newStatus = !userData.active;
      await updateDoc(doc(db, 'users', userData.id), {
        active: newStatus
      });
      setSuccess(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Error actualizando usuario');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Obtener color del badge según el rol
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'manager': return 'warning';
      case 'chef': return 'info';
      case 'bartender': return 'success';
      case 'mesero': return 'primary';
      case 'cocinero': return 'secondary';
      default: return 'light';
    }
  };

  // Obtener texto del estado
  const getStatusText = (userData) => {
    if (userData.active === false) return 'Inactivo';
    return userData.workInfo?.status || 'Activo';
  };

  // Obtener color del estado
  const getStatusColor = (userData) => {
    if (userData.active === false) return 'danger';
    switch (userData.workInfo?.status) {
      case 'active': return 'success';
      case 'vacation': return 'info';
      case 'sick': return 'warning';
      case 'inactive': return 'danger';
      default: return 'success';
    }
  };

  if (currentView === 'add') {
    return (
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <Button 
                  variant="link" 
                  onClick={() => setCurrentView('list')}
                  className="p-0 mb-2"
                >
                  <FaArrowLeft className="me-2" />
                  Volver a la lista
                </Button>
                <h2>
                  <FaUserPlus className="me-2" />
                  Crear Nuevo Usuario
                </h2>
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
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{success}</pre>
          </Alert>
        )}

        {/* Formulario */}
        <Card>
          <Card.Header>
            <h5>Información del Usuario</h5>
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
                    required
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
                  />
                </Form.Group>
              </Col>
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
                    Se generará automáticamente si está vacío
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Rol *</Form.Label>
                  <Form.Select
                    name="role"
                    value={newUserForm.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="bartender">Bartender</option>
                    <option value="mesero">Mesero</option>
                    <option value="cocinero">Cocinero</option>
                    <option value="ayudante_cocina">Ayudante de Cocina</option>
                    <option value="host">Host/Hostess</option>
                    <option value="cajero">Cajero</option>
                    <option value="manager">Manager</option>
                    <option value="chef">Chef</option>
                    {userRole === 'admin' && <option value="admin">Administrador</option>}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Departamento *</Form.Label>
                  <Form.Select
                    name="department"
                    value={newUserForm.workInfo.department}
                    onChange={(e) => handleInputChange(e, 'workInfo')}
                    required
                  >
                    <option value="FOH">Front of House (FOH)</option>
                    <option value="BOH">Back of House (BOH)</option>
                    <option value="Management">Management</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Posición</Form.Label>
                  <Form.Control
                    type="text"
                    name="position"
                    value={newUserForm.workInfo.position}
                    onChange={(e) => handleInputChange(e, 'workInfo')}
                    placeholder="Ej: Bartender Senior, Mesero de Piso"
                  />
                </Form.Group>
              </Col>
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
            </Row>

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
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container fluid>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <Button 
                variant="link" 
                onClick={onBack}
                className="p-0 mb-2"
              >
                <FaArrowLeft className="me-2" />
                Volver al Dashboard
              </Button>
              <h2>
                <FaUsers className="me-2" />
                Gestión Avanzada de Usuarios
              </h2>
              <p className="text-muted mb-0">
                Sistema profesional FOH/BOH con Cloud Functions
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => setCurrentView('add')}
            >
              <FaUserPlus className="me-2" />
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
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{success}</pre>
        </Alert>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={3}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
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
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="chef">Chef</option>
                <option value="bartender">Bartender</option>
                <option value="mesero">Mesero</option>
                <option value="cocinero">Cocinero</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">Todos los departamentos</option>
                <option value="FOH">Front of House</option>
                <option value="BOH">Back of House</option>
                <option value="Management">Management</option>
              </Form.Select>
            </Col>
            <Col md={2}>
              <Form.Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Lista de usuarios */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <FaUsers className="me-2" />
            Usuarios ({filteredUsers.length})
          </h5>
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-4">
              <Spinner animation="border" />
              <p className="mt-2">Cargando usuarios...</p>
            </div>
          ) : (
            <Table striped hover responsive>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => {
                    setSortBy('firstName');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}>
                    Nombre {sortBy === 'firstName' && (sortOrder === 'asc' ? <FaSortAlphaDown /> : <FaSortAlphaUp />)}
                  </th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Departamento</th>
                  <th>Estado</th>
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
                        <small className="text-muted">{userData.workInfo?.employeeId}</small>
                      </div>
                    </td>
                    <td>{userData.email}</td>
                    <td>
                      <Badge bg={getRoleBadgeColor(userData.role)}>
                        {userData.role}
                      </Badge>
                    </td>
                    <td>{userData.workInfo?.department || '-'}</td>
                    <td>
                      <Badge bg={getStatusColor(userData)}>
                        {getStatusText(userData)}
                      </Badge>
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <OverlayTrigger overlay={<Tooltip>{userData.active !== false ? 'Desactivar' : 'Activar'}</Tooltip>}>
                          <Button
                            variant={userData.active !== false ? 'outline-warning' : 'outline-success'}
                            size="sm"
                            onClick={() => handleToggleUserStatus(userData)}
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
                              onClick={() => handleDeleteUser(userData.id, userData.email)}
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