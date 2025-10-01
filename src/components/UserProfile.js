// src/components/UserProfile.js - Versión Corregida Completa
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
  ProgressBar,
  InputGroup,
  OverlayTrigger,
  Tooltip,
  Container
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
  FaUpload,
  FaEnvelope,
  FaHome,
  FaUserTie,
  FaStar,
  FaTrophy,
  FaChartLine,
  FaEye,
  FaEyeSlash,
  FaCamera as FaCameraIcon,
  FaCheck,
  FaExclamationTriangle
} from 'react-icons/fa';
import { 
  doc, 
  updateDoc, 
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { 
  updatePassword, 
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';
import { db, storage, auth } from '../firebase'; // CORRECCIÓN: Agregado auth

const UserProfile = ({ show, onHide, user, userRole, currentUserData, onProfileUpdate }) => {
  // Estados principales
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Estados del perfil
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    email: '',
    phone: '',
    birthDate: '',
    profileImage: '',
    bio: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Argentina'
    },
    emergencyContact: {
      name: '',
      phone: '',
      relationship: ''
    },
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
    skills: [],
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
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // Estados para estadísticas
  const [userStats, setUserStats] = useState({
    totalShifts: 0,
    hoursWorked: 0,
    lateDays: 0,
    rating: 0,
    monthlyHours: 0,
    punctualityScore: 0,
    completedTasks: 0
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
      console.log('Cargando estadísticas para usuario:', currentUserData);
      
      // Buscar turnos del usuario
      const employee_id = currentUserData.uid || currentUserData.id;
      console.log('Buscando turnos para employee_id:', employee_id);
      
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('employee_id', '==', employee_id)
      );
      
      const shiftsSnapshot = await getDocs(shiftsQuery);
      console.log('Turnos encontrados:', shiftsSnapshot.size);
      
      const shifts = shiftsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Calcular estadísticas básicas
      const stats = {
        totalShifts: shifts.length,
        hoursWorked: shifts.reduce((total, shift) => {
          if (shift.hours) return total + shift.hours;
          return total;
        }, 0),
        lateDays: shifts.filter(shift => shift.late === true).length,
        rating: 4.2, // Por defecto
        monthlyHours: 0, // Se calculará
        punctualityScore: 85, // Por defecto
        completedTasks: shifts.filter(shift => shift.completed === true).length
      };
      
      setUserStats(stats);
    } catch (err) {
      console.error('Error loading user stats:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const keys = name.split('.');
    
    if (keys.length === 1) {
      setProfileData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    } else if (keys.length === 2) {
      setProfileData(prev => ({
        ...prev,
        [keys[0]]: {
          ...prev[keys[0]],
          [keys[1]]: type === 'checkbox' ? checked : value
        }
      }));
    } else if (keys.length === 3) {
      setProfileData(prev => ({
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
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      // Eliminar imagen anterior si existe
      if (profileData.profileImage) {
        try {
          const oldImageRef = ref(storage, profileData.profileImage);
          await deleteObject(oldImageRef);
        } catch (deleteError) {
          console.log('No se pudo eliminar imagen anterior:', deleteError);
        }
      }

      // Subir nueva imagen
      const imageRef = ref(storage, `profile-images/${user.uid}/${Date.now()}-${file.name}`);
      await uploadBytes(imageRef, file);
      const imageUrl = await getDownloadURL(imageRef);

      setProfileData(prev => ({
        ...prev,
        profileImage: imageUrl
      }));

      setSuccess('Imagen actualizada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError('Error al subir la imagen');
    }
    setUploadingImage(false);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');

    try {
      // Validaciones básicas
      if (!profileData.firstName || !profileData.lastName) {
        setError('Nombre y apellido son obligatorios');
        setLoading(false);
        return;
      }

      if (profileData.email && !/\S+@\S+\.\S+/.test(profileData.email)) {
        setError('Formato de email inválido');
        setLoading(false);
        return;
      }

      if (profileData.phone && !/^[\d\s\-\(\)]+$/.test(profileData.phone)) {
        setError('Formato de teléfono inválido');
        setLoading(false);
        return;
      }

      await updateDoc(doc(db, 'users', currentUserData.id), {
        ...profileData,
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      });

      setSuccess('Perfil actualizado exitosamente');
      setIsEditing(false);
      
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

  // FUNCIÓN CORREGIDA: handleChangePassword
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
    setError('');
    
    try {
      // CORRECCIÓN: Usar auth.currentUser en lugar de user
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No hay usuario autenticado');
      }

      // Crear credencial con el email del usuario actual de Firebase Auth
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        passwordData.currentPassword
      );

      // Reautenticar con el usuario de Firebase Auth
      await reauthenticateWithCredential(currentUser, credential);
      
      // Actualizar contraseña
      await updatePassword(currentUser, passwordData.newPassword);

      // Limpiar formulario
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setSuccess('Contraseña actualizada exitosamente');
      setTimeout(() => setSuccess(''), 3000);
      
    } catch (err) {
      console.error('Error changing password:', err);
      
      let errorMessage = 'Error al cambiar la contraseña';
      
      switch (err.code) {
        case 'auth/wrong-password':
          errorMessage = 'La contraseña actual es incorrecta';
          break;
        case 'auth/weak-password':
          errorMessage = 'La nueva contraseña es muy débil';
          break;
        case 'auth/requires-recent-login':
          errorMessage = 'Debes iniciar sesión nuevamente para cambiar tu contraseña';
          break;
        case 'auth/user-mismatch':
          errorMessage = 'Error de autenticación del usuario';
          break;
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales inválidas';
          break;
        default:
          errorMessage = `Error: ${err.message}`;
          break;
      }
      
      setError(errorMessage);
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

  const getRoleConfig = (role) => {
    const roleConfigs = {
      admin: { icon: FaShieldAlt, color: 'danger', label: 'Administrador' },
      manager: { icon: FaUserTie, color: 'primary', label: 'Gerente' },
      bartender: { icon: FaUser, color: 'success', label: 'Bartender' },
      cocinero: { icon: FaUser, color: 'info', label: 'Cocinero' },
      employee: { icon: FaUser, color: 'secondary', label: 'Empleado' }
    };
    return roleConfigs[role] || roleConfigs.employee;
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUser className="me-2" />
          Perfil de Usuario
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
          {/* TAB OVERVIEW */}
          <Tab eventKey="overview" title={<><FaUser className="me-1" />General</>}>
            <Row>
              <Col md={4}>
                <Card className="text-center">
                  <Card.Body>
                    <div className="position-relative mb-3">
                      <Image
                        src={profileData.profileImage || 'https://via.placeholder.com/150'}
                        roundedCircle
                        width="150"
                        height="150"
                        className="mb-3"
                      />
                      {canEditProfile() && (
                        <div className="position-absolute bottom-0 end-0">
                          <Button
                            variant="primary"
                            size="sm"
                            className="rounded-circle"
                            onClick={() => document.getElementById('imageInput').click()}
                            disabled={uploadingImage}
                          >
                            {uploadingImage ? <Spinner size="sm" /> : <FaCamera />}
                          </Button>
                          <input
                            id="imageInput"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            style={{ display: 'none' }}
                          />
                        </div>
                      )}
                    </div>

                    <h5>{profileData.firstName} {profileData.lastName}</h5>
                    <Badge bg={getRoleConfig(currentUserData?.role).color} className="mb-2">
                      {getRoleConfig(currentUserData?.role).label}
                    </Badge>
                    <p className="text-muted">{profileData.workInfo.position}</p>

                    <ProgressBar 
                      now={getProfileCompleteness()} 
                      label={`${getProfileCompleteness()}% completo`}
                      className="mb-3"
                    />

                    {canEditProfile() && (
                      <Button
                        variant={isEditing ? "success" : "outline-primary"}
                        onClick={isEditing ? handleSaveProfile : () => setIsEditing(true)}
                        disabled={loading}
                      >
                        {loading ? <Spinner size="sm" /> : isEditing ? <><FaSave className="me-1" />Guardar</> : <><FaEdit className="me-1" />Editar</>}
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              </Col>

              <Col md={8}>
                <Card>
                  <Card.Header>
                    <h6><FaUser className="me-2" />Información Personal</h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Nombre</Form.Label>
                          <Form.Control
                            type="text"
                            name="firstName"
                            value={profileData.firstName}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Apellido</Form.Label>
                          <Form.Control
                            type="text"
                            name="lastName"
                            value={profileData.lastName}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Row>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label><FaEnvelope className="me-1" />Email</Form.Label>
                          <Form.Control
                            type="email"
                            name="email"
                            value={profileData.email}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label><FaPhone className="me-1" />Teléfono</Form.Label>
                          <Form.Control
                            type="tel"
                            name="phone"
                            value={profileData.phone}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mb-3">
                      <Form.Label>Biografía</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="bio"
                        value={profileData.bio}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Cuéntanos sobre ti..."
                      />
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          {/* TAB TRABAJO */}
          <Tab eventKey="work" title={<><FaBriefcase className="me-1" />Trabajo</>}>
            <Card>
              <Card.Header>
                <h6><FaBriefcase className="me-2" />Información Laboral</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>ID de Empleado</Form.Label>
                      <Form.Control
                        type="text"
                        name="workInfo.employeeId"
                        value={profileData.workInfo.employeeId}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Posición</Form.Label>
                      <Form.Control
                        type="text"
                        name="workInfo.position"
                        value={profileData.workInfo.position}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Departamento</Form.Label>
                      <Form.Select
                        name="workInfo.department"
                        value={profileData.workInfo.department}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      >
                        <option value="">Seleccionar...</option>
                        <option value="bar">Bar</option>
                        <option value="cocina">Cocina</option>
                        <option value="administracion">Administración</option>
                        <option value="servicio">Servicio</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Fecha de Inicio</Form.Label>
                      <Form.Control
                        type="date"
                        name="workInfo.startDate"
                        value={profileData.workInfo.startDate}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label>Horario de Trabajo</Form.Label>
                      <Form.Control
                        type="text"
                        name="workInfo.workSchedule"
                        value={profileData.workInfo.workSchedule}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Ej: Lunes a Viernes 9:00-17:00"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>

          {/* TAB CONTACTO */}
          <Tab eventKey="contact" title={<><FaMapMarkerAlt className="me-1" />Contacto</>}>
            <Row>
              <Col md={6}>
                <Card className="mb-3">
                  <Card.Header>
                    <h6><FaHome className="me-2" />Dirección</h6>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Calle</Form.Label>
                      <Form.Control
                        type="text"
                        name="address.street"
                        value={profileData.address.street}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </Form.Group>

                    <Row>
                      <Col md={8}>
                        <Form.Group className="mb-3">
                          <Form.Label>Ciudad</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.city"
                            value={profileData.address.city}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                      <Col md={4}>
                        <Form.Group className="mb-3">
                          <Form.Label>Código Postal</Form.Label>
                          <Form.Control
                            type="text"
                            name="address.zipCode"
                            value={profileData.address.zipCode}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                          />
                        </Form.Group>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={6}>
                <Card>
                  <Card.Header>
                    <h6><FaPhone className="me-2" />Contacto de Emergencia</h6>
                  </Card.Header>
                  <Card.Body>
                    <Form.Group className="mb-3">
                      <Form.Label>Nombre</Form.Label>
                      <Form.Control
                        type="text"
                        name="emergencyContact.name"
                        value={profileData.emergencyContact.name}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Teléfono</Form.Label>
                      <Form.Control
                        type="tel"
                        name="emergencyContact.phone"
                        value={profileData.emergencyContact.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Parentesco</Form.Label>
                      <Form.Select
                        name="emergencyContact.relationship"
                        value={profileData.emergencyContact.relationship}
                        onChange={handleInputChange}
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
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>

          {/* TAB SEGURIDAD */}
          <Tab eventKey="security" title={<><FaKey className="me-1" />Seguridad</>}>
            <Card>
              <Card.Header>
                <h6><FaKey className="me-2" />Cambiar Contraseña</h6>
              </Card.Header>
              <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Contraseña Actual</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPasswords.current ? "text" : "password"}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Nueva Contraseña</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPasswords.new ? "text" : "password"}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Confirmar Nueva Contraseña</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPasswords.confirm ? "text" : "password"}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    <Button
                      variant="warning"
                      onClick={handleChangePassword}
                      disabled={loading}
                    >
                      {loading ? <Spinner size="sm" /> : <><FaKey className="me-1" />Cambiar Contraseña</>}
                    </Button>
                  </Col>
                  <Col md={6}>
                    <Alert variant="info">
                      <h6><FaExclamationTriangle className="me-2" />Requisitos de Contraseña</h6>
                      <ul className="mb-0">
                        <li>Mínimo 6 caracteres</li>
                        <li>Combina letras y números</li>
                        <li>Incluye caracteres especiales</li>
                        <li>No uses información personal</li>
                      </ul>
                    </Alert>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Tab>

          {/* TAB ESTADÍSTICAS */}
          <Tab eventKey="stats" title={<><FaChartLine className="me-1" />Estadísticas</>}>
            <Row>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <FaClock className="text-primary mb-2" size={24} />
                    <h4>{userStats.totalShifts}</h4>
                    <small className="text-muted">Turnos Totales</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <FaCalendarAlt className="text-success mb-2" size={24} />
                    <h4>{userStats.hoursWorked}h</h4>
                    <small className="text-muted">Horas Trabajadas</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <FaTrophy className="text-warning mb-2" size={24} />
                    <h4>{userStats.rating}/5</h4>
                    <small className="text-muted">Calificación</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="text-center">
                  <Card.Body>
                    <FaCheck className="text-info mb-2" size={24} />
                    <h4>{userStats.punctualityScore}%</h4>
                    <small className="text-muted">Puntualidad</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Tab>
        </Tabs>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cerrar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default UserProfile;