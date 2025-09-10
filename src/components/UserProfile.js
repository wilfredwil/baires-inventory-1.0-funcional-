// src/components/UserProfile.js
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
  Tabs,
  Tab,
  ListGroup,
  ProgressBar
} from 'react-bootstrap';
import { 
  FaUser, 
  FaEdit, 
  FaSave, 
  FaTimes, 
  FaCamera, 
  FaPhone, 
  FaMapMarkerAlt,
  FaBriefcase,
  FaCalendarAlt,
  FaClock,
  FaAward,
  FaShieldAlt,
  FaBell,
  FaKey,
  FaUpload
} from 'react-icons/fa';
import { 
  doc, 
  updateDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit
} from 'firebase/firestore';
import { 
  updatePassword, 
  updateEmail,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { db, storage, auth } from '../firebase';

const UserProfile = ({ show, onHide, user, userRole, currentUserData, onProfileUpdate }) => {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  // Estados del perfil
  const [profileData, setProfileData] = useState({
    // Información personal
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    birthDate: '',
    profileImage: '',
    
    // Información de contacto
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Argentina'
    },
    
    // Contacto de emergencia
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
    
    // Información laboral
    workInfo: {
      employeeId: '',
      position: '',
      department: '',
      startDate: '',
      salary: '',
      workSchedule: '',
      manager: '',
      status: 'active'
    },
    
    // Información adicional
    skills: [],
    certifications: [],
    languages: [],
    notes: '',
    
    // Configuraciones
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
    }
  });

  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Estados para estadísticas
  const [userStats, setUserStats] = useState({
    totalShifts: 0,
    hoursWorked: 0,
    lateDays: 0,
    rating: 0
  });

  // Cargar datos del usuario
  useEffect(() => {
    if (show && currentUserData) {
      loadUserProfile();
      loadUserStats();
    }
  }, [show, currentUserData]);

  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', currentUserData.id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setProfileData(prevData => ({
          ...prevData,
          ...userData,
          email: userData.email || user.email,
          // Asegurar que existen las estructuras anidadas
          address: { ...prevData.address, ...(userData.address || {}) },
          emergencyContact: { ...prevData.emergencyContact, ...(userData.emergencyContact || {}) },
          workInfo: { ...prevData.workInfo, ...(userData.workInfo || {}) },
          preferences: {
            ...prevData.preferences,
            ...(userData.preferences || {}),
            notifications: {
              ...prevData.preferences.notifications,
              ...(userData.preferences?.notifications || {})
            },
            privacy: {
              ...prevData.preferences.privacy,
              ...(userData.preferences?.privacy || {})
            }
          }
        }));
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Error al cargar el perfil');
    }
    setLoading(false);
  };

  const loadUserStats = async () => {
    try {
      // Cargar estadísticas de turnos
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('employee_id', '==', user.email),
        orderBy('date', 'desc')
      );
      const shiftsSnapshot = await getDocs(shiftsQuery);
      
      let totalHours = 0;
      shiftsSnapshot.docs.forEach(doc => {
        const shift = doc.data();
        if (shift.start_time && shift.end_time) {
          const start = new Date(`2000-01-01 ${shift.start_time}`);
          const end = new Date(`2000-01-01 ${shift.end_time}`);
          if (end < start) end.setDate(end.getDate() + 1);
          totalHours += (end - start) / (1000 * 60 * 60);
        }
      });

      setUserStats({
        totalShifts: shiftsSnapshot.docs.length,
        hoursWorked: totalHours,
        lateDays: 0, // Implementar lógica de tardanzas
        rating: 4.5 // Implementar sistema de evaluaciones
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const handleInputChange = (e, section = null) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    if (section) {
      setProfileData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: newValue
        }
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        [name]: newValue
      }));
    }
  };

  const handleNestedInputChange = (e, section, subsection = null) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;

    if (subsection) {
      setProfileData(prev => ({
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
      setProfileData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: newValue
        }
      }));
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar archivo
    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      setError('La imagen no puede ser mayor a 5MB');
      return;
    }

    setLoading(true);
    try {
      // Eliminar imagen anterior si existe
      if (profileData.profileImage) {
        try {
          const oldImageRef = ref(storage, profileData.profileImage);
          await deleteObject(oldImageRef);
        } catch (err) {
          console.log('No se pudo eliminar la imagen anterior:', err);
        }
      }

      // Subir nueva imagen
      const imageRef = ref(storage, `profiles/${user.uid}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(imageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      setProfileData(prev => ({
        ...prev,
        profileImage: downloadURL
      }));

      setSuccess('Imagen de perfil actualizada');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Error al subir la imagen');
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validaciones básicas
      if (!profileData.firstName.trim() || !profileData.lastName.trim()) {
        setError('El nombre y apellido son obligatorios');
        setLoading(false);
        return;
      }

      if (profileData.phone && !/^\+?[\d\s\-\(\)]+$/.test(profileData.phone)) {
        setError('Formato de teléfono inválido');
        setLoading(false);
        return;
      }

      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', currentUserData.id), {
        ...profileData,
        updatedAt: new Date(),
        updatedBy: user.email
      });

      setSuccess('Perfil actualizado exitosamente');
      setIsEditing(false);
      
      // Notificar al componente padre
      if (onProfileUpdate) {
        onProfileUpdate(profileData);
      }
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Error al guardar el perfil');
    }
    setLoading(false);
  };

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      setError('Todos los campos de contraseña son obligatorios');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);

      // Cambiar contraseña
      await updatePassword(user, passwordData.newPassword);

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setSuccess('Contraseña actualizada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error changing password:', err);
      if (err.code === 'auth/wrong-password') {
        setError('La contraseña actual es incorrecta');
      } else {
        setError('Error al cambiar la contraseña');
      }
    }
    setLoading(false);
  };

  const canEditProfile = () => {
    return user.email === currentUserData?.email || userRole === 'admin';
  };

  const getProfileCompleteness = () => {
    const fields = [
      profileData.firstName,
      profileData.lastName,
      profileData.phone,
      profileData.address.street,
      profileData.address.city,
      profileData.emergencyContact.name,
      profileData.emergencyContact.phone,
      profileData.workInfo.position,
      profileData.workInfo.startDate
    ];
    
    const filledFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUser className="me-2" />
          Perfil de Usuario
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {loading && (
          <div className="text-center p-3">
            <Spinner animation="border" />
            <p className="mt-2">Cargando...</p>
          </div>
        )}

        {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

        {/* Header del perfil */}
        <Card className="mb-4 border-0 shadow-sm">
          <Card.Body>
            <Row>
              <Col md={3} className="text-center">
                <div className="position-relative d-inline-block">
                  <Image
                    src={profileData.profileImage || '/api/placeholder/150/150'}
                    roundedCircle
                    width={120}
                    height={120}
                    style={{ objectFit: 'cover', border: '3px solid #dee2e6' }}
                  />
                  {canEditProfile() && isEditing && (
                    <div className="position-absolute bottom-0 end-0">
                      <label htmlFor="profile-image-upload" className="btn btn-primary btn-sm rounded-circle">
                        <FaCamera />
                      </label>
                      <input
                        id="profile-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        style={{ display: 'none' }}
                      />
                    </div>
                  )}
                </div>
                
                <h5 className="mt-3 mb-1">
                  {profileData.displayName || `${profileData.firstName} ${profileData.lastName}`}
                </h5>
                <Badge bg={
                  userRole === 'admin' ? 'danger' :
                  userRole === 'manager' ? 'primary' :
                  userRole === 'bartender' ? 'success' : 'warning'
                }>
                  {userRole === 'admin' ? 'Administrador' :
                   userRole === 'manager' ? 'Gerente' :
                   userRole === 'bartender' ? 'Bartender' : 'Mesero'}
                </Badge>
              </Col>

              <Col md={6}>
                <h6>Completitud del Perfil</h6>
                <ProgressBar 
                  now={getProfileCompleteness()} 
                  label={`${getProfileCompleteness()}%`}
                  variant={getProfileCompleteness() > 80 ? 'success' : 
                          getProfileCompleteness() > 50 ? 'warning' : 'danger'}
                  className="mb-3"
                />

                <Row>
                  <Col sm={6}>
                    <small className="text-muted">Email:</small>
                    <p className="mb-1">{profileData.email}</p>
                  </Col>
                  <Col sm={6}>
                    <small className="text-muted">Teléfono:</small>
                    <p className="mb-1">{profileData.phone || 'No especificado'}</p>
                  </Col>
                  <Col sm={6}>
                    <small className="text-muted">Posición:</small>
                    <p className="mb-1">{profileData.workInfo.position || 'No especificado'}</p>
                  </Col>
                  <Col sm={6}>
                    <small className="text-muted">Inicio:</small>
                    <p className="mb-1">{profileData.workInfo.startDate || 'No especificado'}</p>
                  </Col>
                </Row>
              </Col>

              <Col md={3}>
                <h6>Estadísticas</h6>
                <ListGroup variant="flush">
                  <ListGroup.Item className="d-flex justify-content-between px-0">
                    <small>Turnos totales:</small>
                    <Badge bg="primary">{userStats.totalShifts}</Badge>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between px-0">
                    <small>Horas trabajadas:</small>
                    <Badge bg="success">{userStats.hoursWorked.toFixed(1)}h</Badge>
                  </ListGroup.Item>
                  <ListGroup.Item className="d-flex justify-content-between px-0">
                    <small>Evaluación:</small>
                    <Badge bg="warning">⭐ {userStats.rating}</Badge>
                  </ListGroup.Item>
                </ListGroup>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Botones de acción */}
        {canEditProfile() && (
          <div className="d-flex gap-2 mb-4">
            {!isEditing ? (
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                <FaEdit className="me-2" />
                Editar Perfil
              </Button>
            ) : (
              <>
                <Button variant="success" onClick={handleSaveProfile} disabled={loading}>
                  <FaSave className="me-2" />
                  Guardar Cambios
                </Button>
                <Button variant="secondary" onClick={() => setIsEditing(false)}>
                  <FaTimes className="me-2" />
                  Cancelar
                </Button>
              </>
            )}
          </div>
        )}

        {/* Tabs de información */}
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
          <Tab eventKey="personal" title="Información Personal">
            <Card className="border-0">
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre *</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={profileData.firstName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
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
                        value={profileData.lastName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre a mostrar</Form.Label>
                      <Form.Control
                        type="text"
                        name="displayName"
                        value={profileData.displayName}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Cómo quieres que te vean otros"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fecha de Nacimiento</Form.Label>
                      <Form.Control
                        type="date"
                        name="birthDate"
                        value={profileData.birthDate}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>
                        <FaPhone className="me-1" />
                        Teléfono
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={profileData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="+54 11 1234-5678"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={profileData.email}
                        disabled
                        className="bg-light"
                      />
                      <Form.Text className="text-muted">
                        El email no se puede cambiar desde aquí
                      </Form.Text>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>

          <Tab eventKey="contact" title="Contacto y Dirección">
            <Card className="border-0">
              <Card.Body>
                <h6 className="mb-3">
                  <FaMapMarkerAlt className="me-2" />
                  Dirección
                </h6>
                <Row>
                  <Col md={8}>
                    <Form.Group className="mb-3">
                      <Form.Label>Dirección</Form.Label>
                      <Form.Control
                        type="text"
                        name="street"
                        value={profileData.address.street}
                        onChange={(e) => handleInputChange(e, 'address')}
                        disabled={!isEditing}
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
                        value={profileData.address.zipCode}
                        onChange={(e) => handleInputChange(e, 'address')}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Ciudad</Form.Label>
                      <Form.Control
                        type="text"
                        name="city"
                        value={profileData.address.city}
                        onChange={(e) => handleInputChange(e, 'address')}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Provincia/Estado</Form.Label>
                      <Form.Control
                        type="text"
                        name="state"
                        value={profileData.address.state}
                        onChange={(e) => handleInputChange(e, 'address')}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <hr className="my-4" />

                <h6 className="mb-3">Contacto de Emergencia</h6>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre</Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={profileData.emergencyContact.name}
                        onChange={(e) => handleInputChange(e, 'emergencyContact')}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Teléfono</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        value={profileData.emergencyContact.phone}
                        onChange={(e) => handleInputChange(e, 'emergencyContact')}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Relación</Form.Label>
                      <Form.Select
                        name="relationship"
                        value={profileData.emergencyContact.relationship}
                        onChange={(e) => handleInputChange(e, 'emergencyContact')}
                        disabled={!isEditing}
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
          </Tab>

          <Tab eventKey="work" title="Información Laboral">
            <Card className="border-0">
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>ID de Empleado</Form.Label>
                      <Form.Control
                        type="text"
                        name="employeeId"
                        value={profileData.workInfo.employeeId}
                        onChange={(e) => handleInputChange(e, 'workInfo')}
                        disabled={!isEditing || userRole !== 'admin'}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Posición</Form.Label>
                      <Form.Select
                        name="position"
                        value={profileData.workInfo.position}
                        onChange={(e) => handleInputChange(e, 'workInfo')}
                        disabled={!isEditing || userRole !== 'admin'}
                      >
                        <option value="">Seleccionar posición...</option>
                        <option value="Bartender">Bartender</option>
                        <option value="Mesero">Mesero</option>
                        <option value="Cocinero">Cocinero</option>
                        <option value="Ayudante de Cocina">Ayudante de Cocina</option>
                        <option value="Host/Hostess">Host/Hostess</option>
                        <option value="Gerente">Gerente</option>
                        <option value="Limpieza">Limpieza</option>
                        <option value="Seguridad">Seguridad</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Departamento</Form.Label>
                      <Form.Select
                        name="department"
                        value={profileData.workInfo.department}
                        onChange={(e) => handleInputChange(e, 'workInfo')}
                        disabled={!isEditing || userRole !== 'admin'}
                      >
                        <option value="">Seleccionar departamento...</option>
                        <option value="Cocina">Cocina</option>
                        <option value="Bar">Bar</option>
                        <option value="Salón">Salón</option>
                        <option value="Administración">Administración</option>
                        <option value="Limpieza">Limpieza</option>
                        <option value="Seguridad">Seguridad</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fecha de Inicio</Form.Label>
                      <Form.Control
                        type="date"
                        name="startDate"
                        value={profileData.workInfo.startDate}
                        onChange={(e) => handleInputChange(e, 'workInfo')}
                        disabled={!isEditing || userRole !== 'admin'}
                      />
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
                        value={profileData.workInfo.workSchedule}
                        onChange={(e) => handleInputChange(e, 'workInfo')}
                        disabled={!isEditing}
                        placeholder="Ej: Lunes a Viernes 9:00-17:00"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Supervisor/Manager</Form.Label>
                      <Form.Control
                        type="text"
                        name="manager"
                        value={profileData.workInfo.manager}
                        onChange={(e) => handleInputChange(e, 'workInfo')}
                        disabled={!isEditing || userRole !== 'admin'}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                {userRole === 'admin' && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Salario</Form.Label>
                        <Form.Control
                          type="number"
                          name="salary"
                          value={profileData.workInfo.salary}
                          onChange={(e) => handleInputChange(e, 'workInfo')}
                          disabled={!isEditing}
                          placeholder="Salario mensual"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Estado</Form.Label>
                        <Form.Select
                          name="status"
                          value={profileData.workInfo.status}
                          onChange={(e) => handleInputChange(e, 'workInfo')}
                          disabled={!isEditing}
                        >
                          <option value="active">Activo</option>
                          <option value="inactive">Inactivo</option>
                          <option value="vacation">En Vacaciones</option>
                          <option value="sick">Licencia Médica</option>
                          <option value="suspended">Suspendido</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </Card.Body>
            </Card>
          </Tab>

          <Tab eventKey="skills" title="Habilidades y Certificaciones">
            <Card className="border-0">
              <Card.Body>
                <h6 className="mb-3">
                  <FaAward className="me-2" />
                  Habilidades
                </h6>
                <Form.Group className="mb-4">
                  <Form.Label>Habilidades (separadas por comas)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="skills"
                    value={Array.isArray(profileData.skills) ? profileData.skills.join(', ') : ''}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    disabled={!isEditing}
                    placeholder="Ej: Servicio al cliente, Mixología, Cocina italiana, Manejo de caja"
                  />
                </Form.Group>

                <h6 className="mb-3">Certificaciones</h6>
                <Form.Group className="mb-4">
                  <Form.Label>Certificaciones (separadas por comas)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="certifications"
                    value={Array.isArray(profileData.certifications) ? profileData.certifications.join(', ') : ''}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      certifications: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    disabled={!isEditing}
                    placeholder="Ej: Manipulación de Alimentos, Primeros Auxilios, Sommelier Nivel 1"
                  />
                </Form.Group>

                <h6 className="mb-3">Idiomas</h6>
                <Form.Group className="mb-4">
                  <Form.Label>Idiomas (separados por comas)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    name="languages"
                    value={Array.isArray(profileData.languages) ? profileData.languages.join(', ') : ''}
                    onChange={(e) => setProfileData(prev => ({
                      ...prev,
                      languages: e.target.value.split(',').map(s => s.trim()).filter(s => s)
                    }))}
                    disabled={!isEditing}
                    placeholder="Ej: Español (Nativo), Inglés (Intermedio), Italiano (Básico)"
                  />
                </Form.Group>

                <h6 className="mb-3">Notas Adicionales</h6>
                <Form.Group className="mb-3">
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="notes"
                    value={profileData.notes}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="Información adicional, logros, objetivos, etc."
                  />
                </Form.Group>
              </Card.Body>
            </Card>
          </Tab>

          <Tab eventKey="security" title="Seguridad y Privacidad">
            <Card className="border-0">
              <Card.Body>
                <h6 className="mb-3">
                  <FaKey className="me-2" />
                  Cambiar Contraseña
                </h6>
                {canEditProfile() && user.email === currentUserData?.email && (
                  <Row className="mb-4">
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Contraseña Actual</Form.Label>
                        <Form.Control
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            currentPassword: e.target.value
                          }))}
                          placeholder="Contraseña actual"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Nueva Contraseña</Form.Label>
                        <Form.Control
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            newPassword: e.target.value
                          }))}
                          placeholder="Nueva contraseña"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Confirmar Contraseña</Form.Label>
                        <Form.Control
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({
                            ...prev,
                            confirmPassword: e.target.value
                          }))}
                          placeholder="Confirmar contraseña"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Button 
                        variant="warning" 
                        onClick={handleChangePassword}
                        disabled={loading}
                      >
                        <FaKey className="me-2" />
                        Cambiar Contraseña
                      </Button>
                    </Col>
                  </Row>
                )}

                <hr className="my-4" />

                <h6 className="mb-3">
                  <FaBell className="me-2" />
                  Preferencias de Notificaciones
                </h6>
                <Row className="mb-4">
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="email-notifications"
                      label="Notificaciones por email"
                      checked={profileData.preferences.notifications.email}
                      onChange={(e) => handleNestedInputChange(e, 'preferences', 'notifications')}
                      name="email"
                      disabled={!isEditing}
                    />
                    <Form.Check
                      type="switch"
                      id="push-notifications"
                      label="Notificaciones push"
                      checked={profileData.preferences.notifications.push}
                      onChange={(e) => handleNestedInputChange(e, 'preferences', 'notifications')}
                      name="push"
                      disabled={!isEditing}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="schedule-notifications"
                      label="Notificaciones de horarios"
                      checked={profileData.preferences.notifications.schedule}
                      onChange={(e) => handleNestedInputChange(e, 'preferences', 'notifications')}
                      name="schedule"
                      disabled={!isEditing}
                    />
                    <Form.Check
                      type="switch"
                      id="announcements-notifications"
                      label="Anuncios y comunicados"
                      checked={profileData.preferences.notifications.announcements}
                      onChange={(e) => handleNestedInputChange(e, 'preferences', 'notifications')}
                      name="announcements"
                      disabled={!isEditing}
                    />
                  </Col>
                </Row>

                <hr className="my-4" />

                <h6 className="mb-3">
                  <FaShieldAlt className="me-2" />
                  Configuración de Privacidad
                </h6>
                <Row>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="show-phone"
                      label="Mostrar teléfono a compañeros"
                      checked={profileData.preferences.privacy.showPhone}
                      onChange={(e) => handleNestedInputChange(e, 'preferences', 'privacy')}
                      name="showPhone"
                      disabled={!isEditing}
                    />
                    <Form.Check
                      type="switch"
                      id="show-address"
                      label="Mostrar dirección a managers"
                      checked={profileData.preferences.privacy.showAddress}
                      onChange={(e) => handleNestedInputChange(e, 'preferences', 'privacy')}
                      name="showAddress"
                      disabled={!isEditing}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Idioma de la interfaz</Form.Label>
                      <Form.Select
                        name="language"
                        value={profileData.preferences.language}
                        onChange={(e) => handleInputChange(e, 'preferences')}
                        disabled={!isEditing}
                      >
                        <option value="es">Español</option>
                        <option value="en">English</option>
                        <option value="pt">Português</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
        {canEditProfile() && isEditing && (
          <Button variant="primary" onClick={handleSaveProfile} disabled={loading}>
            {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaSave className="me-2" />}
            Guardar Cambios
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default UserProfile;