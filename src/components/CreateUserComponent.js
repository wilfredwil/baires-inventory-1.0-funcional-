// src/components/CreateUserComponent.js
import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Form, 
  Alert, 
  Row, 
  Col, 
  Spinner 
} from 'react-bootstrap';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { FaPlus, FaUser } from 'react-icons/fa';

const CreateUserComponent = ({ show, onHide, currentUser, onSuccess, onError }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'employee',
    position: '',
    department: '',
    password: ''
  });

  // Generar contraseña temporal aleatoria
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Generar ID de empleado único
  const generateEmployeeId = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 999) + 1;
    return `EMP${year}${random.toString().padStart(3, '0')}`;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validaciones básicas
      if (!formData.firstName || !formData.lastName || !formData.email) {
        throw new Error('Los campos Nombre, Apellido y Email son obligatorios');
      }

      // Verificar si el email ya existe
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', formData.email)
      );
      const existingUsers = await getDocs(existingUserQuery);

      if (!existingUsers.empty) {
        throw new Error('Este email ya está registrado en el sistema');
      }

      // Generar datos automáticos
      const tempPassword = formData.password || generatePassword();
      const employeeId = generateEmployeeId();

      // Crear estructura completa del usuario compatible con Firebase
      const newUserData = {
        // Información personal
        firstName: formData.firstName,
        lastName: formData.lastName,
        displayName: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone || '',
        
        // Información laboral
        role: formData.role,
        workInfo: {
          employeeId: employeeId,
          position: formData.position || 'No especificado',
          department: formData.department || 'General',
          status: 'active',
          startDate: new Date().toISOString().split('T')[0],
          manager: '',
          salary: ''
        },

        // Dirección (estructura básica)
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },

        // Preferencias por defecto
        preferences: {
          language: 'es',
          timezone: 'America/Argentina/Buenos_Aires',
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
          }
        },

        // Metadata
        active: true,
        createdAt: serverTimestamp(),
        createdBy: currentUser.email,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.email,
        
        // Para registro posterior
        status: 'pending_registration',
        tempPassword: tempPassword
      };

      console.log('Creando usuario con estructura completa:', newUserData);

      // Guardar en Firestore
      const docRef = await addDoc(collection(db, 'users'), newUserData);
      
      console.log('Usuario creado exitosamente con ID:', docRef.id);

      // Mostrar mensaje de éxito
      const successMessage = `✅ Usuario creado exitosamente!

📋 INFORMACIÓN DEL NUEVO USUARIO:
• Nombre: ${formData.firstName} ${formData.lastName}
• Email: ${formData.email}
• ID Empleado: ${employeeId}
• Rol: ${formData.role}
• Contraseña temporal: ${tempPassword}

🔐 INSTRUCCIONES PARA EL EMPLEADO:
1. Ir a la página de login del sistema
2. Registrarse con el email y contraseña proporcionados
3. Una vez registrado, podrá cambiar su contraseña

⚠️ IMPORTANTE: Guarda estas credenciales y envíalas al empleado de forma segura.`;

      if (onSuccess) {
        onSuccess(successMessage);
      }

      // Limpiar formulario
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'employee',
        position: '',
        department: '',
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

  const handleGeneratePassword = () => {
    const newPassword = generatePassword();
    setFormData(prev => ({
      ...prev,
      password: newPassword
    }));
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUser className="me-2" />
          Crear Nuevo Usuario
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Alert variant="info" className="mb-4">
            <strong>Sistema mejorado sin errores de CORS</strong><br/>
            Este formulario crea usuarios directamente en Firestore con estructura completa compatible con tus datos existentes.
          </Alert>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Nombre *</Form.Label>
                <Form.Control
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  placeholder="María"
                />
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
                  required
                  placeholder="García"
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
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="maria@baires.com"
                />
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
                  placeholder="+54 11 1234-5678"
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Rol *</Form.Label>
                <Form.Select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                >
                  <option value="employee">Empleado</option>
                  <option value="bartender">Bartender</option>
                  <option value="waiter">Mesero</option>
                  <option value="cocinero">Cocinero</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Departamento</Form.Label>
                <Form.Select
                  name="department"
                  value={formData.department}
                  onChange={handleInputChange}
                >
                  <option value="">Seleccionar...</option>
                  <option value="Bar">Bar</option>
                  <option value="Cocina">Cocina</option>
                  <option value="Salón">Salón</option>
                  <option value="Administración">Administración</option>
                  <option value="Limpieza">Limpieza</option>
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
                  value={formData.position}
                  onChange={handleInputChange}
                  placeholder="Ej: Bartender Senior"
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Contraseña Temporal</Form.Label>
                <div className="d-flex">
                  <Form.Control
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Se genera automáticamente"
                  />
                  <Button 
                    variant="outline-secondary" 
                    onClick={handleGeneratePassword}
                    className="ms-2"
                  >
                    Generar
                  </Button>
                </div>
                <Form.Text className="text-muted">
                  Se genera automáticamente si se deja vacío
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Creando...
              </>
            ) : (
              <>
                <FaPlus className="me-2" />
                Crear Usuario
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateUserComponent;