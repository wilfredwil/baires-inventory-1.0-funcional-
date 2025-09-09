// components/UserManagement.js
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Table, Alert, Spinner, Badge } from 'react-bootstrap';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../firebase';
import { FaEdit, FaTrash, FaPlus, FaUsers, FaUserShield, FaUser } from 'react-icons/fa';

const UserManagement = ({ user, userRole, show, onHide }) => {
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados del formulario
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'bartender',
    active: true,
    password: ''
  });

  // Validaciones
  const [formErrors, setFormErrors] = useState({});

  const roleOptions = [
    { value: 'admin', label: 'Administrador', icon: FaUserShield, color: 'danger' },
    { value: 'manager', label: 'Gerente', icon: FaUser, color: 'warning' },
    { value: 'bartender', label: 'Bartender', icon: FaUser, color: 'info' },
    { value: 'waiter', label: 'Mesero', icon: FaUser, color: 'secondary' }
  ];

  useEffect(() => {
    if (show) {
      fetchUsers();
    }
  }, [show]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('name'));
      const snapshot = await getDocs(q);
      const usersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
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
    setFormErrors({});
    setEditingUser(null);
  };

  const validateForm = () => {
    const errors = {};

    // Validar email
    if (!formData.email.trim()) {
      errors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Formato de email inválido';
    } else if (!editingUser && users.some(u => u.email === formData.email)) {
      errors.email = 'Este email ya está registrado';
    }

    // Validar nombre
    if (!formData.name.trim()) {
      errors.name = 'El nombre es obligatorio';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    }

    // Validar contraseña (solo para nuevos usuarios)
    if (!editingUser) {
      if (!formData.password) {
        errors.password = 'La contraseña es obligatoria';
      } else if (formData.password.length < 6) {
        errors.password = 'La contraseña debe tener al menos 6 caracteres';
      }
    }

    // Validar rol
    if (!formData.role) {
      errors.role = 'Debe seleccionar un rol';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpiar error del campo cuando el usuario empiece a escribir
    if (formErrors[name]) {
      setFormErrors(prev => ({
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
    setError('');
    setSuccess('');

    try {
      const userData = {
        email: formData.email.trim().toLowerCase(),
        name: formData.name.trim(),
        role: formData.role,
        active: formData.active,
        updatedAt: new Date(),
        updatedBy: user.email
      };

      if (editingUser) {
        // Actualizar usuario existente
        await updateDoc(doc(db, 'users', editingUser.id), userData);
        setSuccess('Usuario actualizado exitosamente');
      } else {
        // Crear nuevo usuario
        userData.createdAt = new Date();
        userData.createdBy = user.email;
        
        // Crear usuario en Authentication y Firestore
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
          // Usar el email como documento ID en Firestore
          await addDoc(collection(db, 'users'), userData);
          setSuccess('Usuario creado exitosamente');
        } catch (authError) {
          if (authError.code === 'auth/email-already-in-use') {
            // Si el usuario ya existe en Auth, solo agregar a Firestore
            await addDoc(collection(db, 'users'), userData);
            setSuccess('Usuario agregado al sistema');
          } else {
            throw authError;
          }
        }
      }

      setShowUserModal(false);
      resetForm();
      fetchUsers();
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving user:', error);
      setError(error.message || 'Error al guardar el usuario');
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
      password: '' // No mostrar contraseña existente
    });
    setShowUserModal(true);
  };

  const handleDelete = async (userData) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar al usuario "${userData.name}"?`)) {
      return;
    }

    if (userData.email === user.email) {
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

  const handleAddNew = () => {
    resetForm();
    setShowUserModal(true);
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
    if (targetUser.email === user.email) return false; // No puede editarse a sí mismo
    return true;
  };

  if (userRole !== 'admin') {
    return (
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>Acceso Restringido</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Solo los administradores pueden gestionar usuarios.
          </Alert>
        </Modal.Body>
      </Modal>
    );
  }

  return (
    <>
      {/* Modal Principal de Gestión de Usuarios */}
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUsers className="me-2" />
            Gestión de Usuarios
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}

          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6>Lista de Usuarios del Sistema</h6>
            <Button 
              variant="primary" 
              onClick={handleAddNew}
              disabled={loading}
            >
              <FaPlus className="me-1" />
              Nuevo Usuario
            </Button>
          </div>

          {loading && !users.length ? (
            <div className="text-center p-3">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Cargando...</span>
              </Spinner>
            </div>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  users.map(userData => (
                    <tr key={userData.id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div 
                            className="rounded-circle me-2 d-flex align-items-center justify-content-center"
                            style={{ 
                              width: '32px', 
                              height: '32px', 
                              background: '#87CEEB', 
                              color: 'white',
                              fontSize: '14px',
                              fontWeight: 'bold'
                            }}
                          >
                            {(userData.name || userData.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong>{userData.name || 'Sin nombre'}</strong>
                            {userData.email === user.email && (
                              <Badge bg="info" className="ms-1" style={{ fontSize: '0.7em' }}>
                                Tú
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{userData.email}</code>
                      </td>
                      <td>
                        {getRoleBadge(userData.role)}
                      </td>
                      <td>
                        <Badge bg={userData.active !== false ? 'success' : 'secondary'}>
                          {userData.active !== false ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </td>
                      <td>
                        {userData.createdAt ? (
                          <small>
                            {userData.createdAt.toDate ? 
                              userData.createdAt.toDate().toLocaleDateString('es-AR') :
                              new Date(userData.createdAt).toLocaleDateString('es-AR')
                            }
                            <br />
                            <span className="text-muted">
                              por {userData.createdBy || 'Sistema'}
                            </span>
                          </small>
                        ) : (
                          <small className="text-muted">No disponible</small>
                        )}
                      </td>
                      <td>
                        {canManageUser(userData) ? (
                          <>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(userData)}
                              className="me-1"
                              disabled={loading}
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(userData)}
                              disabled={loading}
                            >
                              <FaTrash />
                            </Button>
                          </>
                        ) : (
                          <small className="text-muted">
                            {userData.email === user.email ? 'No puedes editarte' : 'Sin permisos'}
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
          <div className="mt-3 p-3 bg-light rounded">
            <h6>Información sobre Roles:</h6>
            <ul className="mb-0 small">
              <li><strong>Administrador:</strong> Acceso total al sistema, puede gestionar usuarios y proveedores</li>
              <li><strong>Gerente:</strong> Puede editar todos los campos del inventario</li>
              <li><strong>Bartender:</strong> Solo puede actualizar el stock de los productos</li>
              <li><strong>Mesero:</strong> Acceso limitado, solo visualización</li>
            </ul>
          </div>
        </Modal.Body>
      </Modal>

      {/* Modal para Crear/Editar Usuario */}
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Email *</Form.Label>
              <Form.Control
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="usuario@ejemplo.com"
                disabled={!!editingUser} // No permitir cambiar email al editar
                isInvalid={!!formErrors.email}
                required
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.email}
              </Form.Control.Feedback>
              {editingUser && (
                <Form.Text className="text-muted">
                  El email no se puede modificar una vez creado el usuario
                </Form.Text>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Nombre Completo *</Form.Label>
              <Form.Control
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ej: Juan Pérez"
                maxLength="100"
                isInvalid={!!formErrors.name}
                required
              />
              <Form.Control.Feedback type="invalid">
                {formErrors.name}
              </Form.Control.Feedback>
            </Form.Group>

            {!editingUser && (
              <Form.Group className="mb-3">
                <Form.Label>Contraseña *</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Mínimo 6 caracteres"
                  minLength="6"
                  isInvalid={!!formErrors.password}
                  required
                />
                <Form.Control.Feedback type="invalid">
                  {formErrors.password}
                </Form.Control.Feedback>
                <Form.Text className="text-muted">
                  La contraseña debe tener al menos 6 caracteres
                </Form.Text>
              </Form.Group>
            )}

            <Form.Group className="mb-3">
              <Form.Label>Rol *</Form.Label>
              <Form.Select
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                isInvalid={!!formErrors.role}
                required
              >
                {roleOptions.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Form.Select>
              <Form.Control.Feedback type="invalid">
                {formErrors.role}
              </Form.Control.Feedback>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="active"
                checked={formData.active}
                onChange={handleInputChange}
                label="Usuario activo"
              />
              <Form.Text className="text-muted">
                Los usuarios inactivos no pueden acceder al sistema
              </Form.Text>
            </Form.Group>

            {editingUser && (
              <Alert variant="info">
                <strong>Nota:</strong> Para cambiar la contraseña del usuario, 
                deberá usar la función "Olvidé mi contraseña" en el login.
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowUserModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              type="submit"
              disabled={loading}
            >
              {loading && <Spinner as="span" animation="border" size="sm" className="me-2" />}
              {editingUser ? 'Actualizar' : 'Crear'} Usuario
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default UserManagement;