// src/components/UserManagement.js - Versión mejorada
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Button, 
  Table, 
  Form, 
  Alert, 
  Badge, 
  Row, 
  Col,
  Card,
  Dropdown,
  InputGroup
} from 'react-bootstrap';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  orderBy 
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { 
  FaUserShield, 
  FaUserTie, 
  FaUser, 
  FaUserFriends,
  FaEdit, 
  FaTrash, 
  FaPlus,
  FaEye,
  FaEyeSlash,
  FaEnvelope,
  FaKey,
  FaSearch,
  FaFilter,
  FaSave,
  FaTimes,
  FaExclamationTriangle
} from 'react-icons/fa';

const UserManagement = ({ show, onHide, currentUser, userRole }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showInactiveUsers, setShowInactiveUsers] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'bartender',
    active: true,
    password: ''
  });

  // Definición de roles con más detalles
  const roleOptions = [
    {
      value: 'admin',
      label: 'Administrador',
      icon: FaUserShield,
      color: 'danger',
      description: 'Acceso total al sistema',
      permissions: ['Gestionar usuarios', 'Acceder a todos los inventarios', 'Eliminar productos', 'Gestionar proveedores']
    },
    {
      value: 'manager',
      label: 'Gerente',
      icon: FaUserTie,
      color: 'primary',
      description: 'Gestión completa del inventario',
      permissions: ['Editar inventario completo', 'Acceder a todos los inventarios', 'Gestionar proveedores', 'Ver reportes']
    },
    {
      value: 'bartender',
      label: 'Bartender',
      icon: FaUser,
      color: 'success',
      description: 'Acceso solo al inventario del bar',
      permissions: ['Actualizar stock del bar', 'Ver inventario del bar']
    },
    {
      value: 'cocinero',
      label: 'Cocinero',
      icon: FaUser,
      color: 'info',
      description: 'Acceso solo al inventario de cocina',
      permissions: ['Actualizar stock de cocina', 'Ver inventario de cocina']
    },
    {
      value: 'waiter',
      label: 'Mesero',
      icon: FaUserFriends,
      color: 'warning',
      description: 'Acceso limitado al salón',
      permissions: ['Ver menaje del salón', 'Acceso básico al sistema']
    }
  ];

  useEffect(() => {
    if (show) {
      fetchUsers();
    }
  }, [show]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('name'));
      const snapshot = await getDocs(q);
      const usersList = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setUsers(usersList);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Error al cargar los usuarios');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: 'bartender',
      active: true,
      password: ''
    });
    setEditingUser(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.email || !formData.name) {
      setError('Email y nombre son obligatorios');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!editingUser && !formData.password) {
      setError('La contraseña es obligatoria para nuevos usuarios');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (editingUser) {
        // Actualizar usuario existente
        const userRef = doc(db, 'users', editingUser.id);
        const updateData = {
          name: formData.name,
          role: formData.role,
          active: formData.active,
          updated_at: new Date(),
          updated_by: currentUser.email
        };

        await updateDoc(userRef, updateData);
        setSuccess('Usuario actualizado exitosamente');
      } else {
        // Crear nuevo usuario
        try {
          // Crear usuario en Firebase Auth
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            formData.email, 
            formData.password
          );

          // Guardar datos adicionales en Firestore
          await addDoc(collection(db, 'users'), {
            email: formData.email,
            name: formData.name,
            role: formData.role,
            active: formData.active,
            created_at: new Date(),
            created_by: currentUser.email,
            uid: userCredential.user.uid
          });

          setSuccess('Usuario creado exitosamente');
        } catch (authError) {
          if (authError.code === 'auth/email-already-in-use') {
            // Si el email ya existe en Auth, solo crear el documento en Firestore
            await addDoc(collection(db, 'users'), {
              email: formData.email,
              name: formData.name,
              role: formData.role,
              active: formData.active,
              created_at: new Date(),
              created_by: currentUser.email
            });
            setSuccess('Usuario vinculado exitosamente');
          } else {
            throw authError;
          }
        }
      }

      setShowUserModal(false);
      resetForm();
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving user:', error);
      let errorMessage = 'Error al guardar el usuario';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este email ya está registrado';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es demasiado débil';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'El email no es válido';
      }
      
      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
    setLoading(false);
  };

  const handleEdit = (userData) => {
    setEditingUser(userData);
    setFormData({
      email: userData.email || '',
      name: userData.name || '',
      role: userData.role || 'bartender',
      active: userData.active !== false,
      password: ''
    });
    setShowUserModal(true);
  };

  const handleDelete = async (userData) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${userData.name}"?`)) {
      return;
    }

    if (userData.email === currentUser.email) {
      setError('No puedes eliminar tu propio usuario');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    try {
      await deleteDoc(doc(db, 'users', userData.id));
      setSuccess('Usuario eliminado exitosamente');
      fetchUsers();
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Error al eliminar el usuario');
      setTimeout(() => setError(''), 3000);
    }
    setLoading(false);
  };

  const handleResetPassword = async (userEmail) => {
    if (!window.confirm(`¿Enviar email de restablecimiento de contraseña a ${userEmail}?`)) {
      return;
    }

    try {
      await sendPasswordResetEmail(auth, userEmail);
      setSuccess(`Email de restablecimiento enviado a ${userEmail}`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error sending password reset:', error);
      setError('Error al enviar el email de restablecimiento');
      setTimeout(() => setError(''), 3000);
    }
  };

  const getRoleBadge = (role) => {
    const roleInfo = roleOptions.find(r => r.value === role);
    if (!roleInfo) return <Badge bg="secondary">Desconocido</Badge>;
    
    const IconComponent = roleInfo.icon;
    return (
      <Badge bg={roleInfo.color} className="d-flex align-items-center gap-1">
        <IconComponent size={12} />
        {roleInfo.label}
      </Badge>
    );
  };

  const canManageUser = (targetUser) => {
    if (userRole !== 'admin') return false;
    if (targetUser.email === currentUser.email) return false;
    return true;
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = !searchTerm || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesActive = showInactiveUsers || user.active !== false;
    
    return matchesSearch && matchesRole && matchesActive;
  });

  const getUserStats = () => {
    const total = users.length;
    const active = users.filter(u => u.active !== false).length;
    const byRole = roleOptions.reduce((acc, role) => {
      acc[role.value] = users.filter(u => u.role === role.value).length;
      return acc;
    }, {});

    return { total, active, byRole };
  };

  if (userRole !== 'admin') {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Acceso Restringido</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="text-center">
            <FaExclamationTriangle size={48} className="mb-3 d-block mx-auto" />
            <h5>Solo los administradores pueden gestionar usuarios</h5>
            <p className="mb-0">Tu rol actual ({getRoleBadge(userRole)}) no tiene permisos para acceder a esta función.</p>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }

  const stats = getUserStats();

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUserShield className="me-2" />
            Gestión de Usuarios
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" dismissible onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" dismissible onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          {/* Estadísticas */}
          <Row className="mb-4">
            <Col md={3}>
              <Card className="text-center h-100">
                <Card.Body>
                  <h3 className="text-primary">{stats.total}</h3>
                  <small className="text-muted">Total Usuarios</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card className="text-center h-100">
                <Card.Body>
                  <h3 className="text-success">{stats.active}</h3>
                  <small className="text-muted">Usuarios Activos</small>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="h-100">
                <Card.Body>
                  <h6 className="mb-3">Usuarios por Rol</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {roleOptions.map(role => (
                      <Badge 
                        key={role.value} 
                        bg={role.color} 
                        className="d-flex align-items-center gap-1"
                      >
                        <role.icon size={12} />
                        {role.label}: {stats.byRole[role.value] || 0}
                      </Badge>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Controles */}
          <Row className="mb-3">
            <Col md={4}>
              <InputGroup>
                <InputGroup.Text>
                  <FaSearch />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Buscar usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>
            </Col>
            <Col md={3}>
              <Form.Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">Todos los roles</option>
                {roleOptions.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={3}>
              <Form.Check 
                type="switch"
                label="Mostrar inactivos"
                checked={showInactiveUsers}
                onChange={(e) => setShowInactiveUsers(e.target.checked)}
              />
            </Col>
            <Col md={2} className="text-end">
              <Button 
                variant="primary" 
                onClick={() => {
                  resetForm();
                  setShowUserModal(true);
                }}
                disabled={loading}
              >
                <FaPlus className="me-1" />
                Nuevo Usuario
              </Button>
            </Col>
          </Row>

          {/* Tabla de usuarios */}
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary mb-3" />
              <h5>Cargando usuarios...</h5>
            </div>
          ) : (
            <Table responsive hover className="align-middle">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Fecha Creación</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4">
                      <FaExclamationTriangle className="text-muted mb-2 d-block mx-auto" size={32} />
                      <p className="text-muted mb-0">
                        {users.length === 0 ? 'No hay usuarios registrados' : 'No se encontraron usuarios con los filtros aplicados'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((userData) => (
                    <tr key={userData.id}>
                      <td>
                        <div>
                          <strong>{userData.name || 'Sin nombre'}</strong>
                          {userData.email === currentUser.email && (
                            <Badge bg="info" className="ms-2">Tú</Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <code className="small">{userData.email}</code>
                      </td>
                      <td>
                        {getRoleBadge(userData.role)}
                      </td>
                      <td>
                        <Badge bg={userData.active !== false ? 'success' : 'secondary'}>
                          {userData.active !== false ? (
                            <><FaEye className="me-1" />Activo</>
                          ) : (
                            <><FaEyeSlash className="me-1" />Inactivo</>
                          )}
                        </Badge>
                      </td>
                      <td>
                        <small className="text-muted">
                          {userData.created_at?.toDate ? 
                            userData.created_at.toDate().toLocaleDateString() : 
                            'N/A'
                          }
                        </small>
                      </td>
                      <td>
                        {canManageUser(userData) ? (
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-secondary" size="sm">
                              Acciones
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => handleEdit(userData)}>
                                <FaEdit className="me-2" />
                                Editar
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => handleResetPassword(userData.email)}>
                                <FaKey className="me-2" />
                                Restablecer Contraseña
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item 
                                onClick={() => handleDelete(userData)}
                                className="text-danger"
                              >
                                <FaTrash className="me-2" />
                                Eliminar
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        ) : (
                          <small className="text-muted">
                            {userData.email === currentUser.email ? 'No puedes editarte' : 'Sin permisos'}
                          </small>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          )}

          {/* Información adicional */}
          <Card className="mt-4 bg-light">
            <Card.Header>
              <h6 className="mb-0">Información sobre Roles y Permisos</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                {roleOptions.map((role) => (
                  <Col key={role.value} md={6} lg={4} className="mb-3">
                    <div className="p-3 border rounded">
                      <div className="d-flex align-items-center mb-2">
                        <role.icon className="me-2" />
                        <strong>{role.label}</strong>
                        <Badge bg={role.color} className="ms-2">
                          {stats.byRole[role.value] || 0}
                        </Badge>
                      </div>
                      <p className="small text-muted mb-2">{role.description}</p>
                      <div className="small">
                        <strong>Permisos:</strong>
                        <ul className="mb-0 mt-1">
                          {role.permissions.map((permission, index) => (
                            <li key={index}>{permission}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card.Body>
          </Card>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para Crear/Editar Usuario */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? (
              <>
                <FaEdit className="me-2" />
                Editar Usuario
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                Nuevo Usuario
              </>
            )}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Email *</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="usuario@ejemplo.com"
                    disabled={!!editingUser}
                    required
                  />
                  {editingUser && (
                    <Form.Text className="text-muted">
                      No se puede cambiar el email de un usuario existente
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>

              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Nombre Completo *</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ej: Juan Pérez"
                    required
                  />
                </Form.Group>
              </Col>

              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label>Rol *</Form.Label>
                  <Form.Select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label} - {role.description}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>

              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <div className="mt-2">
                    <Form.Check
                      type="switch"
                      name="active"
                      label={formData.active ? "Usuario Activo" : "Usuario Inactivo"}
                      checked={formData.active}
                      onChange={handleInputChange}
                    />
                  </div>
                </Form.Group>
              </Col>

              {!editingUser && (
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Contraseña *</Form.Label>
                    <Form.Control
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Mínimo 6 caracteres"
                      required={!editingUser}
                      minLength={6}
                    />
                    <Form.Text className="text-muted">
                      La contraseña debe tener al menos 6 caracteres
                    </Form.Text>
                  </Form.Group>
                </Col>
              )}

              {editingUser && (
                <Col md={12}>
                  <Alert variant="info">
                    <FaEnvelope className="me-2" />
                    <strong>Cambio de contraseña:</strong> Para cambiar la contraseña, 
                    usa la opción "Restablecer Contraseña" en la tabla de usuarios.
                  </Alert>
                </Col>
              )}
            </Row>

            {/* Vista previa de permisos */}
            {formData.role && (
              <Card className="bg-light mt-3">
                <Card.Header>
                  <small><strong>Vista previa de permisos para este rol:</strong></small>
                </Card.Header>
                <Card.Body className="py-2">
                  {(() => {
                    const selectedRole = roleOptions.find(r => r.value === formData.role);
                    return selectedRole ? (
                      <ul className="small mb-0">
                        {selectedRole.permissions.map((permission, index) => (
                          <li key={index}>{permission}</li>
                        ))}
                      </ul>
                    ) : null;
                  })()}
                </Card.Body>
              </Card>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowUserModal(false)}
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
                  {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default UserManagement;