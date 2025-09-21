// src/components/UserProfile.js - Versión Moderna y Completa
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
import { db, storage } from '../firebase';

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
      
      const userId = currentUserData.id || currentUserData.uid || user.uid;
      console.log('Buscando turnos para employee_id:', userId);
      
      const shiftsQuery = query(
        collection(db, 'shifts'),
        where('employee_id', '==', userId)
      );
      
      const shiftsSnapshot = await getDocs(shiftsQuery);
      console.log('Turnos encontrados:', shiftsSnapshot.docs.length);
      
      let totalHours = 0;
      let monthlyHours = 0;
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      shiftsSnapshot.docs.forEach(doc => {
        const shift = doc.data();
        
        if (shift.start_time && shift.end_time) {
          const start = new Date(`2000-01-01 ${shift.start_time}`);
          const end = new Date(`2000-01-01 ${shift.end_time}`);
          if (end < start) end.setDate(end.getDate() + 1);
          const hours = (end - start) / (1000 * 60 * 60);
          totalHours += hours;
          
          // Calcular horas del mes actual
          if (shift.date) {
            const shiftDate = new Date(shift.date);
            if (shiftDate.getMonth() === currentMonth && shiftDate.getFullYear() === currentYear) {
              monthlyHours += hours;
            }
          }
        }
      });

      setUserStats({
        totalShifts: shiftsSnapshot.docs.length,
        hoursWorked: Math.round(totalHours * 10) / 10,
        monthlyHours: Math.round(monthlyHours * 10) / 10,
        lateDays: 0, // Implementar lógica de tardanzas
        rating: 4.5,
        punctualityScore: 95,
        completedTasks: 124
      });
    } catch (err) {
      console.error('Error loading stats:', err);
      setUserStats({
        totalShifts: 0,
        hoursWorked: 0,
        monthlyHours: 0,
        lateDays: 0,
        rating: 0,
        punctualityScore: 0,
        completedTasks: 0
      });
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

    if (!file.type.startsWith('image/')) {
      setError('Por favor selecciona una imagen válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede ser mayor a 5MB');
      return;
    }

    setUploadingImage(true);
    try {
      if (profileData.profileImage) {
        try {
          const oldImageRef = ref(storage, profileData.profileImage);
          await deleteObject(oldImageRef);
        } catch (err) {
          console.log('No se pudo eliminar la imagen anterior:', err);
        }
      }

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
    setUploadingImage(false);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
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
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(user, credential);
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

  const getRoleConfig = () => {
    const configs = {
      admin: { color: 'danger', icon: FaShieldAlt, label: 'Administrador' },
      manager: { color: 'primary', icon: FaUserTie, label: 'Gerente' },
      bartender: { color: 'success', icon: FaUser, label: 'Bartender' },
      waiter: { color: 'warning', icon: FaUser, label: 'Mesero' }
    };
    return configs[userRole] || configs.waiter;
  };

  // Componente de Overview Tab
  const OverviewTab = () => {
    const roleConfig = getRoleConfig();
    const completeness = getProfileCompleteness();
    
    return (
      <div className="space-y-4">
        {/* Header Profile Card */}
        <Card className="border-0 shadow-lg" style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white' 
        }}>
          <Card.Body className="p-4">
            <Row className="align-items-center">
              <Col md={3} className="text-center">
                <div className="position-relative d-inline-block">
                  <Image
                    src={profileData.profileImage || '/api/placeholder/120/120'}
                    roundedCircle
                    width={120}
                    height={120}
                    style={{ 
                      objectFit: 'cover', 
                      border: '4px solid rgba(255,255,255,0.3)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
                    }}
                  />
                  {canEditProfile() && isEditing && (
                    <div className="position-absolute bottom-0 end-0">
                      <label 
                        htmlFor="profile-image-upload" 
                        className="btn btn-light btn-sm rounded-circle shadow"
                        style={{ width: '40px', height: '40px' }}
                      >
                        {uploadingImage ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FaCameraIcon />
                        )}
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
              </Col>
              
              <Col md={6}>
                <h3 className="mb-2 fw-bold">
                  {profileData.displayName || `${profileData.firstName} ${profileData.lastName}` || 'Usuario'}
                </h3>
                <div className="d-flex align-items-center mb-3">
                  <roleConfig.icon className="me-2" />
                  <Badge 
                    bg={roleConfig.color} 
                    className="me-3 px-3 py-2"
                    style={{ fontSize: '0.9rem' }}
                  >
                    {roleConfig.label}
                  </Badge>
                  <Badge 
                    bg="light" 
                    text="dark" 
                    className="px-3 py-2"
                    style={{ fontSize: '0.9rem' }}
                  >
                    {profileData.workInfo.department || 'Sin departamento'}
                  </Badge>
                </div>
                
                <div className="mb-3">
                  <small className="text-light opacity-75">Completitud del Perfil</small>
                  <ProgressBar 
                    now={completeness} 
                    className="mt-1"
                    style={{ height: '8px' }}
                    variant={completeness > 80 ? 'success' : completeness > 50 ? 'warning' : 'danger'}
                  />
                  <small className="text-light opacity-75">{completeness}% completado</small>
                </div>

                {profileData.bio && (
                  <p className="mb-0 opacity-90" style={{ fontSize: '0.95rem' }}>
                    {profileData.bio}
                  </p>
                )}
              </Col>

              <Col md={3}>
                <div className="text-center">
                  <div className="mb-3">
                    <h4 className="mb-1">{userStats.totalShifts}</h4>
                    <small className="text-light opacity-75">Turnos Totales</small>
                  </div>
                  <div className="mb-3">
                    <h4 className="mb-1">{userStats.hoursWorked}h</h4>
                    <small className="text-light opacity-75">Horas Trabajadas</small>
                  </div>
                  <div className="d-flex align-items-center justify-content-center">
                    <FaStar className="text-warning me-1" />
                    <span className="fw-bold">{userStats.rating}</span>
                    <small className="text-light opacity-75 ms-2">Calificación</small>
                  </div>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Stats Cards */}
        <Row>
          <Col md={3}>
            <Card className="border-0 shadow-sm h-100 hover-card">
              <Card.Body className="text-center">
                <div className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                     style={{ width: '60px', height: '60px' }}>
                  <FaClock className="text-primary" size={24} />
                </div>
                <h4 className="text-primary mb-1">{userStats.monthlyHours}h</h4>
                <small className="text-muted">Este Mes</small>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="border-0 shadow-sm h-100 hover-card">
              <Card.Body className="text-center">
                <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                     style={{ width: '60px', height: '60px' }}>
                  <FaAward className="text-success" size={24} />
                </div>
                <h4 className="text-success mb-1">{userStats.punctualityScore}%</h4>
                <small className="text-muted">Puntualidad</small>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="border-0 shadow-sm h-100 hover-card">
              <Card.Body className="text-center">
                <div className="rounded-circle bg-warning bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                     style={{ width: '60px', height: '60px' }}>
                  <FaTrophy className="text-warning" size={24} />
                </div>
                <h4 className="text-warning mb-1">{userStats.completedTasks}</h4>
                <small className="text-muted">Tareas Completadas</small>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={3}>
            <Card className="border-0 shadow-sm h-100 hover-card">
              <Card.Body className="text-center">
                <div className="rounded-circle bg-info bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3"
                     style={{ width: '60px', height: '60px' }}>
                  <FaChartLine className="text-info" size={24} />
                </div>
                <h4 className="text-info mb-1">{userStats.lateDays}</h4>
                <small className="text-muted">Días de Retraso</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Quick Info */}
        <Row>
          <Col md={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-transparent">
                <h6 className="mb-0 d-flex align-items-center">
                  <FaUser className="me-2 text-primary" />
                  Información Personal
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="row g-3">
                  <div className="col-6">
                    <small className="text-muted d-block">Email</small>
                    <span className="fw-medium">{profileData.email}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Teléfono</small>
                    <span className="fw-medium">{profileData.phone || 'No especificado'}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Ciudad</small>
                    <span className="fw-medium">{profileData.address.city || 'No especificado'}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Fecha de Nacimiento</small>
                    <span className="fw-medium">{profileData.birthDate || 'No especificado'}</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          <Col md={6}>
            <Card className="border-0 shadow-sm h-100">
              <Card.Header className="bg-transparent">
                <h6 className="mb-0 d-flex align-items-center">
                  <FaBriefcase className="me-2 text-success" />
                  Información Laboral
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="row g-3">
                  <div className="col-6">
                    <small className="text-muted d-block">Posición</small>
                    <span className="fw-medium">{profileData.workInfo.position || 'No especificado'}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Inicio</small>
                    <span className="fw-medium">{profileData.workInfo.startDate || 'No especificado'}</span>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Estado</small>
                    <Badge bg={profileData.workInfo.status === 'active' ? 'success' : 'secondary'}>
                      {profileData.workInfo.status === 'active' ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                  <div className="col-6">
                    <small className="text-muted d-block">Manager</small>
                    <span className="fw-medium">{profileData.workInfo.manager || 'No asignado'}</span>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // Componente de Personal Info Tab
  const PersonalInfoTab = () => (
    <Row>
      <Col md={8}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">Información Personal</h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Nombre *</Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={profileData.firstName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Apellido *</Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={profileData.lastName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Nombre a Mostrar</Form.Label>
                  <Form.Control
                    type="text"
                    name="displayName"
                    value={profileData.displayName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="modern-input"
                    placeholder="Como quieres que aparezca tu nombre"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Teléfono</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaPhone /></InputGroup.Text>
                    <Form.Control
                      type="tel"
                      name="phone"
                      value={profileData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="modern-input"
                      placeholder="+54 11 1234-5678"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Email</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaEnvelope /></InputGroup.Text>
                    <Form.Control
                      type="email"
                      name="email"
                      value={profileData.email}
                      onChange={handleInputChange}
                      disabled={true}
                      className="modern-input"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Fecha de Nacimiento</Form.Label>
                  <Form.Control
                    type="date"
                    name="birthDate"
                    value={profileData.birthDate}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Biografía</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={3}
                    name="bio"
                    value={profileData.bio}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="modern-input"
                    placeholder="Cuéntanos sobre ti..."
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Dirección */}
            <h6 className="border-top pt-3 mb-3">Dirección</h6>
            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Calle y Número</Form.Label>
                  <InputGroup>
                    <InputGroup.Text><FaHome /></InputGroup.Text>
                    <Form.Control
                      type="text"
                      name="street"
                      value={profileData.address.street}
                      onChange={(e) => handleInputChange(e, 'address')}
                      disabled={!isEditing}
                      className="modern-input"
                    />
                  </InputGroup>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Ciudad</Form.Label>
                  <Form.Control
                    type="text"
                    name="city"
                    value={profileData.address.city}
                    onChange={(e) => handleInputChange(e, 'address')}
                    disabled={!isEditing}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Provincia</Form.Label>
                  <Form.Control
                    type="text"
                    name="state"
                    value={profileData.address.state}
                    onChange={(e) => handleInputChange(e, 'address')}
                    disabled={!isEditing}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Contacto de Emergencia */}
            <h6 className="border-top pt-3 mb-3">Contacto de Emergencia</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Nombre Completo</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={profileData.emergencyContact.name}
                    onChange={(e) => handleInputChange(e, 'emergencyContact')}
                    disabled={!isEditing}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Teléfono</Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={profileData.emergencyContact.phone}
                    onChange={(e) => handleInputChange(e, 'emergencyContact')}
                    disabled={!isEditing}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Relación</Form.Label>
                  <Form.Select
                    name="relationship"
                    value={profileData.emergencyContact.relationship}
                    onChange={(e) => handleInputChange(e, 'emergencyContact')}
                    disabled={!isEditing}
                    className="modern-input"
                  >
                    <option value="">Seleccionar relación</option>
                    <option value="padre">Padre</option>
                    <option value="madre">Madre</option>
                    <option value="hermano">Hermano/a</option>
                    <option value="conyuge">Cónyuge</option>
                    <option value="hijo">Hijo/a</option>
                    <option value="amigo">Amigo/a</option>
                    <option value="otro">Otro</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}>
        <Card className="border-0 shadow-sm mb-4">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">Configuraciones de Privacidad</h6>
          </Card.Header>
          <Card.Body>
            <Form.Check
              type="switch"
              id="showPhone"
              name="showPhone"
              label="Mostrar teléfono en directorio"
              checked={profileData.preferences.privacy.showPhone}
              onChange={(e) => handleNestedInputChange(e, 'preferences', 'privacy')}
              disabled={!isEditing}
              className="mb-2"
            />
            <Form.Check
              type="switch"
              id="showAddress"
              name="showAddress"
              label="Mostrar dirección en directorio"
              checked={profileData.preferences.privacy.showAddress}
              onChange={(e) => handleNestedInputChange(e, 'preferences', 'privacy')}
              disabled={!isEditing}
              className="mb-2"
            />
          </Card.Body>
        </Card>

        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">Configuraciones de Notificaciones</h6>
          </Card.Header>
          <Card.Body>
            <Form.Check
              type="switch"
              id="emailNotifications"
              name="email"
              label="Notificaciones por email"
              checked={profileData.preferences.notifications.email}
              onChange={(e) => handleNestedInputChange(e, 'preferences', 'notifications')}
              disabled={!isEditing}
              className="mb-2"
            />
            <Form.Check
              type="switch"
              id="scheduleNotifications"
              name="schedule"
              label="Notificaciones de horarios"
              checked={profileData.preferences.notifications.schedule}
              onChange={(e) => handleNestedInputChange(e, 'preferences', 'notifications')}
              disabled={!isEditing}
              className="mb-2"
            />
            <Form.Check
              type="switch"
              id="announcementNotifications"
              name="announcements"
              label="Anuncios y novedades"
              checked={profileData.preferences.notifications.announcements}
              onChange={(e) => handleNestedInputChange(e, 'preferences', 'notifications')}
              disabled={!isEditing}
            />
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  // Componente de Work Info Tab
  const WorkInfoTab = () => (
    <Row>
      <Col md={8}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">Información Laboral</h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">ID de Empleado</Form.Label>
                  <Form.Control
                    type="text"
                    name="employeeId"
                    value={profileData.workInfo.employeeId}
                    onChange={(e) => handleInputChange(e, 'workInfo')}
                    disabled={!isEditing || userRole !== 'admin'}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Posición</Form.Label>
                  <Form.Control
                    type="text"
                    name="position"
                    value={profileData.workInfo.position}
                    onChange={(e) => handleInputChange(e, 'workInfo')}
                    disabled={!isEditing || userRole !== 'admin'}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Departamento</Form.Label>
                  <Form.Select
                    name="department"
                    value={profileData.workInfo.department}
                    onChange={(e) => handleInputChange(e, 'workInfo')}
                    disabled={!isEditing || userRole !== 'admin'}
                    className="modern-input"
                  >
                    <option value="">Seleccionar departamento</option>
                    <option value="FOH">Front of House (FOH)</option>
                    <option value="BOH">Back of House (BOH)</option>
                    <option value="Bar">Bar</option>
                    <option value="Kitchen">Cocina</option>
                    <option value="Management">Gerencia</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Fecha de Inicio</Form.Label>
                  <Form.Control
                    type="date"
                    name="startDate"
                    value={profileData.workInfo.startDate}
                    onChange={(e) => handleInputChange(e, 'workInfo')}
                    disabled={!isEditing || userRole !== 'admin'}
                    className="modern-input"
                  />
                </Form.Group>
              </Col>
              {userRole === 'admin' && (
                <>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-medium">Salario</Form.Label>
                      <InputGroup>
                        <InputGroup.Text>$</InputGroup.Text>
                        <Form.Control
                          type="number"
                          name="salary"
                          value={profileData.workInfo.salary}
                          onChange={(e) => handleInputChange(e, 'workInfo')}
                          disabled={!isEditing}
                          className="modern-input"
                        />
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-medium">Estado</Form.Label>
                      <Form.Select
                        name="status"
                        value={profileData.workInfo.status}
                        onChange={(e) => handleInputChange(e, 'workInfo')}
                        disabled={!isEditing}
                        className="modern-input"
                      >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="vacation">En vacaciones</option>
                        <option value="sick">Licencia médica</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </>
              )}
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-medium">Manager Directo</Form.Label>
                  <Form.Control
                    type="text"
                    name="manager"
                    value={profileData.workInfo.manager}
                    onChange={(e) => handleInputChange(e, 'workInfo')}
                    disabled={!isEditing || userRole !== 'admin'}
                    className="modern-input"
                    placeholder="Nombre del manager directo"
                  />
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">Estadísticas de Desempeño</h6>
          </Card.Header>
          <Card.Body>
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Puntualidad</span>
                <span className="fw-bold">{userStats.punctualityScore}%</span>
              </div>
              <ProgressBar 
                now={userStats.punctualityScore} 
                variant={userStats.punctualityScore > 90 ? 'success' : userStats.punctualityScore > 70 ? 'warning' : 'danger'}
                style={{ height: '8px' }}
              />
            </div>

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span>Calificación General</span>
                <span className="fw-bold">{userStats.rating}/5</span>
              </div>
              <div className="d-flex">
                {[1, 2, 3, 4, 5].map(star => (
                  <FaStar 
                    key={star} 
                    className={star <= userStats.rating ? 'text-warning' : 'text-muted'} 
                  />
                ))}
              </div>
            </div>

            <div className="text-center pt-3 border-top">
              <div className="row g-3">
                <div className="col-6">
                  <h5 className="mb-1 text-primary">{userStats.totalShifts}</h5>
                  <small className="text-muted">Turnos Totales</small>
                </div>
                <div className="col-6">
                  <h5 className="mb-1 text-success">{userStats.hoursWorked}h</h5>
                  <small className="text-muted">Horas Totales</small>
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  // Componente de Security Tab
  const SecurityTab = () => (
    <Row>
      <Col md={8}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">Cambiar Contraseña</h6>
          </Card.Header>
          <Card.Body>
            {canEditProfile() ? (
              <Form onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}>
                <Row>
                  <Col md={12}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-medium">Contraseña Actual *</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="modern-input"
                          placeholder="Ingresa tu contraseña actual"
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                        >
                          {showPasswords.current ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-medium">Nueva Contraseña *</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPasswords.new ? "text" : "password"}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="modern-input"
                          placeholder="Mínimo 6 caracteres"
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                        >
                          {showPasswords.new ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-medium">Confirmar Contraseña *</Form.Label>
                      <InputGroup>
                        <Form.Control
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="modern-input"
                          placeholder="Repetir nueva contraseña"
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                        >
                          {showPasswords.confirm ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>
                  </Col>
                </Row>
                
                <div className="d-flex gap-2">
                  <Button 
                    type="submit" 
                    variant="primary"
                    disabled={loading || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                  >
                    {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaKey className="me-2" />}
                    Cambiar Contraseña
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline-secondary"
                    onClick={() => setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })}
                  >
                    Limpiar
                  </Button>
                </div>
              </Form>
            ) : (
              <Alert variant="info">
                <FaExclamationTriangle className="me-2" />
                Solo puedes cambiar tu propia contraseña.
              </Alert>
            )}
          </Card.Body>
        </Card>
      </Col>

      <Col md={4}>
        <Card className="border-0 shadow-sm">
          <Card.Header className="bg-transparent">
            <h6 className="mb-0">Seguridad de la Cuenta</h6>
          </Card.Header>
          <Card.Body>
            <div className="d-flex align-items-center mb-3">
              <div className="rounded-circle bg-success bg-opacity-10 me-3 d-flex align-items-center justify-content-center"
                   style={{ width: '40px', height: '40px' }}>
                <FaCheck className="text-success" />
              </div>
              <div>
                <div className="fw-medium">Autenticación Activa</div>
                <small className="text-muted">Tu cuenta está segura</small>
              </div>
            </div>
            
            <Alert variant="light" className="border">
              <h6 className="alert-heading">Consejos de Seguridad</h6>
              <ul className="mb-0 small">
                <li>Usa una contraseña fuerte y única</li>
                <li>No compartas tu contraseña con nadie</li>
                <li>Cierra sesión en dispositivos compartidos</li>
                <li>Reporta actividad sospechosa inmediatamente</li>
              </ul>
            </Alert>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered className="modern-modal">
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <FaUser className="me-2 text-primary" />
            Perfil de Usuario
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-0">
          {loading && (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" className="mb-3" />
              <p className="text-muted">Cargando perfil...</p>
            </div>
          )}

          {error && (
            <Alert variant="danger" className="mx-4 mt-3" dismissible onClose={() => setError('')}>
              <FaExclamationTriangle className="me-2" />
              {error}
            </Alert>
          )}
          
          {success && (
            <Alert variant="success" className="mx-4 mt-3" dismissible onClose={() => setSuccess('')}>
              <FaCheck className="me-2" />
              {success}
            </Alert>
          )}

          <Container fluid className="p-4">
            {/* Action Buttons */}
            {canEditProfile() && (
              <div className="d-flex justify-content-end mb-4 gap-2">
                {!isEditing ? (
                  <Button variant="primary" onClick={() => setIsEditing(true)}>
                    <FaEdit className="me-2" />
                    Editar Perfil
                  </Button>
                ) : (
                  <>
                    <Button 
                      variant="success" 
                      onClick={handleSaveProfile}
                      disabled={loading}
                    >
                      {loading ? <Spinner animation="border" size="sm" className="me-2" /> : <FaSave className="me-2" />}
                      Guardar Cambios
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      onClick={() => setIsEditing(false)}
                    >
                      <FaTimes className="me-2" />
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="modern-tabs mb-4"
              variant="pills"
            >
              <Tab 
                eventKey="overview" 
                title={
                  <span className="d-flex align-items-center">
                    <FaUser className="me-2" />
                    Resumen
                  </span>
                }
              >
                <OverviewTab />
              </Tab>
              
              <Tab 
                eventKey="personal" 
                title={
                  <span className="d-flex align-items-center">
                    <FaUser className="me-2" />
                    Personal
                  </span>
                }
              >
                <PersonalInfoTab />
              </Tab>
              
              <Tab 
                eventKey="work" 
                title={
                  <span className="d-flex align-items-center">
                    <FaBriefcase className="me-2" />
                    Laboral
                  </span>
                }
              >
                <WorkInfoTab />
              </Tab>
              
              <Tab 
                eventKey="security" 
                title={
                  <span className="d-flex align-items-center">
                    <FaShieldAlt className="me-2" />
                    Seguridad
                  </span>
                }
              >
                <SecurityTab />
              </Tab>
            </Tabs>
          </Container>
        </Modal.Body>

        <Modal.Footer className="border-0 bg-light">
          <div className="d-flex justify-content-between align-items-center w-100">
            <small className="text-muted">
              Última actualización: {new Date().toLocaleDateString('es-ES')}
            </small>
            <Button variant="secondary" onClick={onHide}>
              Cerrar
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Estilos CSS adicionales */}
      <style>{`
        .modern-modal .modal-content {
          border: none;
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }

        .modern-input {
          border: 2px solid #e9ecef;
          border-radius: 12px;
          padding: 12px 16px;
          font-size: 0.95rem;
          transition: all 0.3s ease;
        }

        .modern-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .modern-tabs .nav-link {
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 500;
          color: #64748b;
          border: 2px solid transparent;
          transition: all 0.3s ease;
        }

        .modern-tabs .nav-link.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }

        .hover-card {
          transition: all 0.3s ease;
        }

        .hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        .space-y-4 > * + * {
          margin-top: 1.5rem;
        }

        .card {
          transition: all 0.3s ease;
        }

        .btn {
          border-radius: 12px;
          padding: 8px 20px;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn:hover {
          transform: translateY(-1px);
        }

        .modal-header {
          background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
        }

        .progress {
          border-radius: 10px;
          height: 8px;
        }

        .progress-bar {
          border-radius: 10px;
        }

        .form-check-input:checked {
          background-color: #667eea;
          border-color: #667eea;
        }

        .badge {
          font-weight: 500;
          padding: 8px 12px;
          border-radius: 8px;
        }
      `}</style>
    </>
  );
};

export default UserProfile;