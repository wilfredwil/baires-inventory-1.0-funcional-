// src/App.js - VERSIÓN COMPLETA CON ESTRUCTURA FOH/BOH CORREGIDA Y HORARIOS SEPARADOS
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Navbar, 
  Nav, 
  Card, 
  Button, 
  Form, 
  Row, 
  Col, 
  Modal, 
  Alert, 
  Badge, 
  Table, 
  Spinner, 
  InputGroup,
  Dropdown
} from 'react-bootstrap';
import { 
  FaWineGlass, 
  FaUtensils, 
  FaConciergeBell, 
  FaUsers, 
  FaCalendarAlt, 
  FaChartBar,
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaFilter,
  FaExclamationTriangle,
  FaBuilding,
  FaDownload,
  FaEnvelope,
  FaEye,
  FaCog,
  FaArrowLeft,
  FaUser,
  FaDatabase,
  FaSignOutAlt,
  FaTachometerAlt,
  FaClipboardList,
  FaTruck,
  FaClock,
  FaComments
} from 'react-icons/fa';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

// Firebase imports
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  serverTimestamp,
  getDocs,
  where,
  setDoc
} from 'firebase/firestore';
import { 
  getFunctions, 
  httpsCallable 
} from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Local imports - CORREGIDO: ../firebase a ./firebase
import { auth, db } from './firebase';
import AppLayout from './components/AppLayout';
import MessagingSystem from './components/MessagingSystem';
import InventoryItemForm from './components/InventoryItemForm';
import AdvancedUserManagement from './components/AdvancedUserManagement';
import ProviderManagement from './components/ProviderManagement';
import KitchenInventory from './components/KitchenInventory';
import SeparatedShiftManagement from './components/SeparatedShiftManagement'; // CAMBIO: Importar el nuevo componente
import UserProfile from './components/UserProfile';
import EmployeeDirectory from './components/EmployeeDirectory';
import DashboardWidgets from './components/DashboardWidgets';
import PublicScheduleViewer from './components/PublicScheduleViewer';
import CreateUserComponent from './components/CreateUserComponent';
import BarInventory from './components/BarInventory';

// Styles
import './styles/improvements.css';
import './styles/shifts.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Chart.js setup
ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  // Estados principales
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('employee');
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados para inventario
  const [inventory, setInventory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [users, setUsers] = useState([]);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Estados de modales
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Estados de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados de perfil
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Efectos principales
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('onAuthStateChanged ejecutado:', user ? 'Usuario autenticado' : 'Usuario no autenticado');
      
      if (user) {
        console.log('Usuario autenticado:', user.email, user.uid);
        setUser(user);
        
        // Cargar rol del usuario con mejor manejo de errores
        try {
          // Buscar por UID y también por email como fallback
          let userData = null;
          
          // Primero intentar por UID
          try {
            const userDocByUID = await getDocs(query(
              collection(db, 'users'), 
              where('uid', '==', user.uid)
            ));
            
            if (!userDocByUID.empty) {
              userData = userDocByUID.docs[0].data();
              console.log('Usuario encontrado por UID:', userData);
            }
          } catch (uidError) {
            console.log('Error buscando por UID:', uidError);
          }
          
          // Si no se encuentra por UID, buscar por email
          if (!userData) {
            const userDocByEmail = await getDocs(query(
              collection(db, 'users'), 
              where('email', '==', user.email)
            ));
            
            if (!userDocByEmail.empty) {
              userData = userDocByEmail.docs[0].data();
              console.log('Usuario encontrado por email:', userData);
            }
          }
          
          if (userData) {
            const role = userData.role || 'employee';
            setUserRole(role);
            console.log('Rol del usuario cargado:', role);
          } else {
            console.log('No se encontró documento de usuario, usando rol por defecto');
            setUserRole('employee');
          }
        } catch (error) {
          console.error('Error loading user role:', error);
          setUserRole('employee');
        }
      } else {
        console.log('No hay usuario autenticado, ejecutando createDefaultAdmin...');
        setUser(null);
        setUserRole('employee');
        
        // Crear usuario admin por defecto solo cuando NO hay usuario autenticado
        await createDefaultAdmin();
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Crear usuario admin por defecto
  const createDefaultAdmin = async () => {
    try {
      console.log('Verificando si existe usuario admin...');
      
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const usersSnapshot = await getDocs(usersQuery);
      
      console.log('Usuarios admin encontrados:', usersSnapshot.size);
      
      if (usersSnapshot.empty) {
        console.log('No se encontró usuario admin, creando uno por defecto...');
        
        try {
          console.log('Creando usuario en Firebase Authentication...');
          
          // PASO 1: Crear usuario en Firebase Authentication
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            'admin@baires.com', 
            'admin123456'  // Contraseña por defecto - CÁMBIALA DESPUÉS
          );
          
          console.log('Usuario admin creado en Authentication:', userCredential.user.uid);
          
          // PASO 2: Crear documento en Firestore usando el UID como documento ID
          console.log('Creando documento en Firestore...');
          const defaultAdminRef = doc(db, 'users', userCredential.user.uid);
          await setDoc(defaultAdminRef, {
            email: 'admin@baires.com',
            name: 'Administrador',
            role: 'admin',
            createdAt: serverTimestamp(),
            isActive: true,
            uid: userCredential.user.uid
          });
          
          console.log('Documento admin creado en Firestore');
          
          // Mostrar información importante
          console.log('USUARIO ADMIN CREADO EXITOSAMENTE');
          console.log('Email: admin@baires.com');
          console.log('Contraseña: admin123456');
          console.log('IMPORTANTE: Cambia esta contraseña después del primer login');
          
          // Desloguear inmediatamente para evitar autenticación automática
          await signOut(auth);
          console.log('Usuario deslogueado, listo para login manual');
          
        } catch (authError) {
          console.error('Error en createUserWithEmailAndPassword:', authError);
          
          if (authError.code === 'auth/email-already-in-use') {
            console.log('El email admin ya existe en Authentication');
            console.log('Verificando si necesita documento en Firestore...');
            
            // Buscar si ya existe documento para este email
            const existingUserQuery = query(
              collection(db, 'users'), 
              where('email', '==', 'admin@baires.com')
            );
            const existingUserSnapshot = await getDocs(existingUserQuery);
            
            if (existingUserSnapshot.empty) {
              console.log('Creando documento en Firestore para usuario existente...');
              // Crear documento usando email como ID para compatibilidad
              const defaultAdminRef = doc(db, 'users', 'admin@baires.com');
              await setDoc(defaultAdminRef, {
                email: 'admin@baires.com',
                name: 'Administrador',
                role: 'admin',
                createdAt: serverTimestamp(),
                isActive: true
              });
              console.log('Documento creado para usuario existente');
            } else {
              console.log('Usuario admin ya tiene documento en Firestore');
            }
            
            console.log('Usa: admin@baires.com / admin123456 para login');
          } else {
            throw authError;
          }
        }
      } else {
        console.log('Usuario admin ya existe');
        usersSnapshot.forEach(doc => {
          console.log('Admin encontrado:', doc.data());
        });
        console.log('Usa las credenciales existentes para login');
      }
    } catch (error) {
      console.error('Error fatal creando admin por defecto:', error);
      console.error('Detalles del error:', error.message);
      console.error('Código del error:', error.code);
    }
  };

  // Cargar datos del inventario desde la colección correcta
  useEffect(() => {
    if (!user) return;

    // Usar 'inventario' en lugar de 'inventory'
    const unsubscribeInventory = onSnapshot(
      query(collection(db, 'inventario'), orderBy('nombre')),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInventory(items);
        console.log('Inventario cargado:', items.length, 'productos');
      },
      (error) => {
        console.error('Error cargando inventario:', error);
        setError('Error cargando el inventario');
      }
    );

    const unsubscribeProviders = onSnapshot(
      collection(db, 'providers'),
      (snapshot) => {
        const providersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProviders(providersList);
      }
    );

    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const usersList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUsers(usersList);
      }
    );

    return () => {
      unsubscribeInventory();
      unsubscribeProviders();
      unsubscribeUsers();
    };
  }, [user]);

  // Funciones de manejo
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      console.error('Login error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Email o contraseña incorrectos');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Credenciales inválidas. Verifica tu email y contraseña.');
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('dashboard');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Error al cerrar sesión');
    }
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
    setError('');
    setSuccess('');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  // Función para obtener rol con badge
  const getRoleBadge = () => {
    const roleNames = {
      'admin': 'Administrador',
      'manager': 'Gerente',
      'employee': 'Empleado',
      'bartender': 'Bartender',
      'cocinero': 'Cocinero',
      'waiter': 'Mesero',
      'server': 'Server',
      'chef': 'Chef',
      'sous_chef': 'Sous Chef',
      'line_cook': 'Line Cook',
      'prep_cook': 'Prep Cook',
      'dishwasher': 'Dishwasher',
      'busser': 'Busser',
      'runner': 'Food Runner',
      'expo': 'Expo',
      'barback': 'Barback',
      'host': 'Host'
    };

    const badgeClass = userRole === 'admin' ? 'admin-badge' : 
                      userRole === 'manager' ? 'manager-badge' : 'secondary';

    return (
      <Badge className={badgeClass} style={{ fontSize: '0.75rem' }}>
        {roleNames[userRole] || userRole}
      </Badge>
    );
  };

  // CAMBIO: Función para verificar permisos de módulos actualizada
  const canAccessModule = (moduleId) => {
    switch (moduleId) {
      case 'users':
        return userRole === 'admin';
      case 'personal':
        return ['admin', 'manager'].includes(userRole);
      case 'bar':
        return ['admin', 'manager', 'bartender', 'barback'].includes(userRole);
      case 'kitchen':
        return ['admin', 'manager', 'chef', 'sous_chef', 'line_cook', 'prep_cook'].includes(userRole);
      case 'shifts':
        return ['admin', 'manager', 'chef'].includes(userRole); // CAMBIO: Agregado 'chef'
      case 'directory':
        return true;
      case 'reports':
        return ['admin', 'manager'].includes(userRole);
      case 'messages':
        return true;
      default:
        return true;
    }
  };

  // Función para obtener notificaciones
  const getNotifications = () => {
    const notifications = [];
    
    const lowStock = inventory.filter(item => 
      item.stock <= (item.umbral_low || 5)
    );
    
    if (lowStock.length > 0) {
      notifications.push({
        type: 'inventory',
        message: `${lowStock.length} productos con stock bajo`,
        count: lowStock.length
      });
    }
    
    return notifications;
  };

  // Función para obtener proveedores filtrados por tipo
  const getFilteredProviders = (tipo) => {
    return providers.filter(provider => 
      !provider.tipo || provider.tipo === tipo || provider.tipo === 'ambos'
    );
  };
  
  // Componente Dashboard Principal
  const MainDashboard = () => {
    const availableModules = [
      {
        id: 'bar',
        title: 'Bar / Alcohol',
        icon: FaWineGlass,
        description: 'Gestión de bebidas alcohólicas y bar',
        color: '#F59E0B',
        colorDark: '#D97706',
        stats: `${inventory.filter(item => item.tipo === 'licor' || item.tipo === 'cerveza' || item.tipo === 'vino').length} productos`,
        available: canAccessModule('bar')
      },
      {
        id: 'kitchen',
        title: 'Cocina / Ingredientes',
        icon: FaUtensils,
        description: 'Ingredientes, recetas y stock de cocina',
        color: '#EF4444',
        colorDark: '#DC2626',
        stats: 'Sistema FIFO',
        available: canAccessModule('kitchen')
      },
      {
        id: 'salon',
        title: 'Salón / Menaje',
        icon: FaConciergeBell,
        description: 'Platos, cubiertos, cristalería y menaje',
        color: '#3B82F6',
        colorDark: '#2563EB',
        stats: 'Próximamente',
        available: false
      },
      {
        id: 'personal',
        title: 'Personal',
        icon: FaUsers,
        description: 'Ver y gestionar información de empleados FOH/BOH',
        color: '#8B5CF6',
        colorDark: '#7C3AED',
        stats: `${users.length} empleados`,
        available: canAccessModule('personal')
      },
      {
        id: 'users',
        title: 'Gestión de Usuarios',
        icon: FaCog,
        description: 'Sistema completo de administración de usuarios con estructura FOH/BOH',
        color: '#DC2626',
        colorDark: '#B91C1C',
        stats: 'Formulario Completo',
        available: canAccessModule('users'),
        adminOnly: true
      },
      {
        id: 'shifts',
        title: 'Horarios / Turnos',
        icon: FaCalendarAlt,
        description: 'Sistema separado FOH (Manager) y BOH (Chef)', // CAMBIO: Nueva descripción
        color: '#10B981',
        colorDark: '#059669',
        stats: 'Horarios Separados', // CAMBIO: Nueva estadística
        available: canAccessModule('shifts')
      },
      {
        id: 'directory',
        title: 'Directorio de Personal',
        icon: FaUser,
        description: 'Ver información de contacto de empleados',
        color: '#6366F1',
        colorDark: '#4F46E5',
        stats: `${users.length} empleados`,
        available: canAccessModule('directory')
      },
      {
        id: 'reports',
        title: 'Reportes / Analytics',
        icon: FaChartBar,
        description: 'Análisis y reportes del restaurante por departamento',
        color: '#6B7280',
        colorDark: '#4B5563',
        stats: 'Ver estadísticas',
        available: canAccessModule('reports')
      }
    ].filter(module => module.available);

    return (
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <h2>Dashboard Principal</h2>
            <p className="text-muted">
              Sistema de gestión integral para Baires - {getRoleBadge()}
            </p>
          </Col>
        </Row>

        <DashboardWidgets 
          inventory={inventory}
          users={users}
          userRole={userRole}
        />

        <Row className="mb-4">
          <Col>
            <h4>Módulos Disponibles</h4>
          </Col>
        </Row>

        <Row>
          {availableModules.map(module => (
            <Col md={6} lg={4} key={module.id} className="mb-4">
              <Card 
                className="h-100 module-card cursor-pointer"
                onClick={() => module.available && handleNavigation(module.id)}
                style={{
                  cursor: module.available ? 'pointer' : 'not-allowed',
                  opacity: module.available ? 1 : 0.6,
                  borderLeft: `4px solid ${module.color}`,
                  transition: 'transform 0.2s ease-in-out'
                }}
                onMouseEnter={(e) => {
                  if (module.available) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex align-items-center mb-3">
                    <div 
                      className="p-2 rounded me-3"
                      style={{ backgroundColor: `${module.color}20` }}
                    >
                      <module.icon 
                        size={24} 
                        style={{ color: module.color }}
                      />
                    </div>
                    <div>
                      <h6 className="mb-1">{module.title}</h6>
                      <small className="text-muted">{module.stats}</small>
                    </div>
                  </div>
                  
                  <p className="text-muted small mb-0">
                    {module.description}
                  </p>

                  {module.adminOnly && (
                    <Badge bg="warning" className="mt-2 align-self-start">
                      Solo Administradores
                    </Badge>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    );
  };

  // Componente de Login
  const Login = () => {
    // Estado para mostrar/ocultar el botón de crear admin
    const [showCreateAdmin, setShowCreateAdmin] = useState(false);
    const [adminCreating, setAdminCreating] = useState(false);

    // Función manual para crear admin
    const createAdminManually = async () => {
      setAdminCreating(true);
      console.log('Creando usuario admin manualmente...');
      
      try {
        // Crear usuario en Firebase Authentication
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          'admin@baires.com', 
          'admin123456'
        );
        
        console.log('Usuario creado en Auth:', userCredential.user.uid);
        
        // Crear documento en Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email: 'admin@baires.com',
          name: 'Administrador',
          role: 'admin',
          createdAt: serverTimestamp(),
          isActive: true,
          uid: userCredential.user.uid
        });
        
        console.log('Documento creado en Firestore');
        
        // Desloguear inmediatamente
        await signOut(auth);
        
        alert('Usuario admin creado exitosamente!\nEmail: admin@baires.com\nContraseña: admin123456');
        setShowCreateAdmin(false);
        
      } catch (error) {
        console.error('Error:', error);
        if (error.code === 'auth/email-already-in-use') {
          alert('El email ya existe. Usa: admin@baires.com / admin123456');
        } else {
          alert('Error: ' + error.message);
        }
      } finally {
        setAdminCreating(false);
      }
    };

    return (
      <div className="login-container">
        <Container>
          <Row className="justify-content-center align-items-center min-vh-100">
            <Col md={6} lg={4}>
              <Card className="shadow-lg">
                <Card.Body className="p-5">
                  <div className="text-center mb-4">
                    <FaWineGlass size={48} className="text-primary mb-3" />
                    <h2>Baires Inventory</h2>
                    <p className="text-muted">Sistema de gestión integral</p>
                  </div>

                  {error && <Alert variant="danger">{error}</Alert>}

                  <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        required
                        placeholder="admin@baires.com"
                      />
                    </Form.Group>

                    <Form.Group className="mb-4">
                      <Form.Label>Contraseña</Form.Label>
                      <Form.Control
                        type="password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                        placeholder="admin123456"
                      />
                    </Form.Group>

                    <Button 
                      type="submit" 
                      variant="primary" 
                      className="w-100 mb-3"
                      disabled={loginLoading}
                    >
                      {loginLoading ? <Spinner animation="border" size="sm" /> : 'Ingresar'}
                    </Button>
                  </Form>

                  {/* BOTÓN DE EMERGENCIA PARA CREAR ADMIN */}
                  <div className="text-center">
                    <small className="text-muted d-block mb-2">
                      ¿No tienes credenciales de admin?
                    </small>
                    
                    {!showCreateAdmin ? (
                      <Button 
                        variant="outline-warning" 
                        size="sm"
                        onClick={() => setShowCreateAdmin(true)}
                      >
                        Crear Usuario Admin
                      </Button>
                    ) : (
                      <div>
                        <Alert variant="warning" className="small">
                          <strong>¡Atención!</strong> Esto creará un usuario admin por defecto.
                          <br />Email: admin@baires.com
                          <br />Contraseña: admin123456
                        </Alert>
                        <Button 
                          variant="success" 
                          size="sm" 
                          className="me-2"
                          onClick={createAdminManually}
                          disabled={adminCreating}
                        >
                          {adminCreating ? <Spinner size="sm" /> : 'Crear Admin'}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setShowCreateAdmin(false)}
                        >
                          Cancelar
                        </Button>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    );
  };

  // Función para renderizar la vista actual
  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return <MainDashboard />;
      
      case 'messages':
        return (
          <MessagingSystem 
            user={user}
            userRole={userRole}
            onBack={handleBackToDashboard}
          />
        );
      
      // CAMBIO: Caso actualizado para usar SeparatedShiftManagement
      case 'shifts':
        return (
          <SeparatedShiftManagement 
            user={user}
            userRole={userRole}
            onBack={handleBackToDashboard}
          />
        );
      
      case 'personal':
        if (!canAccessModule('personal')) {
          return (
            <Alert variant="warning">
              <h4>Acceso Restringido</h4>
              <p>No tienes permisos para acceder al módulo de personal.</p>
              <Button variant="secondary" onClick={handleBackToDashboard}>
                Volver al Dashboard
              </Button>
            </Alert>
          );
        }
        
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <Button 
                  variant="link" 
                  onClick={handleBackToDashboard}
                  className="p-0 mb-2"
                >
                  <FaArrowLeft className="me-2" />
                  Volver al Dashboard
                </Button>
                <h2>
                  <FaUsers className="me-2" />
                  Gestión de Personal FOH/BOH
                </h2>
                <p className="text-muted mb-0">Administración de empleados Front of House y Back of House</p>
              </div>
              <div className="d-flex gap-2">
                {userRole === 'admin' && (
                  <Button 
                    variant="success" 
                    onClick={() => setShowCreateUserModal(true)}
                  >
                    <FaPlus className="me-1" />
                    Crear Usuario FOH/BOH
                  </Button>
                )}
                <Button 
                  variant="primary" 
                  onClick={() => handleNavigation('users')}
                >
                  <FaCog className="me-1" />
                  Gestión Avanzada
                </Button>
              </div>
            </div>

            <Alert variant="success" className="mb-4">
              <h5><FaDatabase className="me-2" />Sistema FOH/BOH Funcionando</h5>
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Total empleados:</strong> {users.length}
                </div>
                <div className="col-md-3">
                  <strong>FOH:</strong> {users.filter(u => u.workInfo?.department === 'FOH').length}
                </div>
                <div className="col-md-3">
                  <strong>BOH:</strong> {users.filter(u => u.workInfo?.department === 'BOH').length}
                </div>
                <div className="col-md-3">
                  <strong>Usuario actual:</strong> {user?.email}
                </div>
              </div>
            </Alert>

            <Row>
              {users.length === 0 ? (
                <Col>
                  <Alert variant="warning">
                    <h5><FaUsers className="me-2" />No hay empleados registrados</h5>
                    <p>Los empleados aparecerán organizados por departamentos FOH/BOH cuando se registren.</p>
                    {userRole === 'admin' && (
                      <div className="mt-3">
                        <Button 
                          variant="primary" 
                          onClick={() => setShowCreateUserModal(true)}
                        >
                          <FaPlus className="me-2" />
                          Crear Primer Empleado
                        </Button>
                      </div>
                    )}
                  </Alert>
                </Col>
              ) : (
                users.map((employee, index) => {
                  const roleNames = {
                    // FOH Roles
                    'server': 'Server/Mesero',
                    'busser': 'Busser',
                    'runner': 'Food Runner',
                    'expo': 'Expo',
                    'barback': 'Barback',
                    'bartender': 'Bartender',
                    'host': 'Host/Hostess',
                    
                    // BOH Roles
                    'chef': 'Chef Ejecutivo',
                    'sous_chef': 'Sous Chef',
                    'line_cook': 'Line Cook',
                    'prep_cook': 'Prep Cook',
                    'dishwasher': 'Dishwasher',
                    
                    // Admin Roles
                    'manager': 'Gerente',
                    'admin': 'Administrador',
                    
                    // Legacy roles (mantener compatibilidad)
                    'cocinero': 'Cocinero',
                    'waiter': 'Mesero',
                    'employee': 'Empleado'
                  };

                  const getRoleColor = (role) => {
                    // FOH roles - colores cálidos
                    if (['server', 'busser', 'runner', 'host', 'waiter'].includes(role)) return 'warning';
                    if (['bartender', 'barback'].includes(role)) return 'success';
                    if (['expo'].includes(role)) return 'info';
                    
                    // BOH roles - colores fríos
                    if (['chef', 'sous_chef'].includes(role)) return 'primary';
                    if (['line_cook', 'prep_cook', 'cocinero'].includes(role)) return 'info';
                    if (['dishwasher'].includes(role)) return 'secondary';
                    
                    // Admin roles
                    if (role === 'admin') return 'danger';
                    if (role === 'manager') return 'primary';
                    
                    return 'secondary';
                  };

                  return (
                    <Col md={6} lg={4} key={employee.id || index} className="mb-4">
                      <Card className="h-100 shadow-sm">
                        <Card.Body>
                          <div className="d-flex align-items-center mb-3">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center me-3"
                              style={{ 
                                width: '50px', 
                                height: '50px',
                                backgroundColor: `var(--bs-${getRoleColor(employee.role)})`,
                                color: 'white'
                              }}
                            >
                              <FaUser size={20} />
                            </div>
                            <div>
                              <h6 className="mb-1">
                                {employee.firstName && employee.lastName ? 
                                  `${employee.firstName} ${employee.lastName}` :
                                  employee.name || employee.displayName || employee.email?.split('@')[0] || 'Sin nombre'}
                              </h6>
                              <small className="text-muted">{employee.email || 'Sin email'}</small>
                            </div>
                          </div>
                          
                          <div className="mb-3">
                            <Badge 
                              bg={getRoleColor(employee.role)} 
                              className="me-2"
                            >
                              {roleNames[employee.role] || employee.role || 'Sin rol'}
                            </Badge>
                            
                            {/* Badge de departamento - lógica inline */}
                            <Badge 
                              bg={
                                employee.workInfo?.department === 'FOH' ? 'warning' :
                                employee.workInfo?.department === 'BOH' ? 'info' :
                                employee.workInfo?.department === 'ADMIN' ? 'primary' :
                                'secondary'
                              } 
                              className="me-2" 
                              title={
                                employee.workInfo?.department === 'FOH' ? 'Front of House' :
                                employee.workInfo?.department === 'BOH' ? 'Back of House' :
                                employee.workInfo?.department === 'ADMIN' ? 'Administración' :
                                employee.workInfo?.department || 'No especificado'
                              }
                            >
                              {employee.workInfo?.department || 'N/A'}
                            </Badge>
                            
                            {employee.status === 'pending_registration' ? (
                              <Badge bg="warning">Pendiente Registro</Badge>
                            ) : employee.active !== false ? (
                              <Badge bg="success">Activo</Badge>
                            ) : (
                              <Badge bg="secondary">Inactivo</Badge>
                            )}
                          </div>

                          <div className="small text-muted mb-2">
                            <div><strong>Email:</strong> {employee.email || 'No disponible'}</div>
                            {employee.phone && (
                              <div><strong>Teléfono:</strong> {employee.phone}</div>
                            )}
                            {employee.workInfo?.employeeId && (
                              <div><strong>ID:</strong> {employee.workInfo.employeeId}</div>
                            )}
                            {employee.workInfo?.departmentFull && (
                              <div><strong>Departamento:</strong> {employee.workInfo.departmentFull}</div>
                            )}
                            {employee.created_at && (
                              <div>
                                <strong>Registrado:</strong> {
                                  employee.created_at.toDate ? 
                                    employee.created_at.toDate().toLocaleDateString() :
                                    'Fecha no disponible'
                                }
                              </div>
                            )}
                            {employee.status === 'pending_registration' && (
                              <div className="text-warning">
                                <strong>Estado:</strong> Debe completar registro
                              </div>
                            )}
                          </div>

                          <div className="d-flex justify-content-between align-items-center">
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => {
                                alert(`Detalles de ${employee.firstName || employee.name || employee.email}: ${JSON.stringify(employee, null, 2)}`);
                              }}
                            >
                              <FaEye className="me-1" />
                              Ver Detalles
                            </Button>
                            
                            {userRole === 'admin' && (
                              <Button 
                                variant="outline-secondary" 
                                size="sm"
                                onClick={() => {
                                  alert('Editar usuario - En construcción');
                                }}
                              >
                                <FaEdit className="me-1" />
                                Editar
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })
              )}
            </Row>

            {users.length > 0 && (
              <Row className="mt-4">
                <Col>
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">
                        <FaChartBar className="me-2" />
                        Estadísticas de Personal FOH/BOH
                      </h5>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={2} className="text-center">
                          <h3 className="text-primary">{users.length}</h3>
                          <p className="mb-0">Total Empleados</p>
                        </Col>
                        <Col md={2} className="text-center">
                          <h3 className="text-warning">
                            {users.filter(u => u.workInfo?.department === 'FOH').length}
                          </h3>
                          <p className="mb-0">FOH</p>
                        </Col>
                        <Col md={2} className="text-center">
                          <h3 className="text-info">
                            {users.filter(u => u.workInfo?.department === 'BOH').length}
                          </h3>
                          <p className="mb-0">BOH</p>
                        </Col>
                        <Col md={2} className="text-center">
                          <h3 className="text-primary">
                            {users.filter(u => u.workInfo?.department === 'ADMIN').length}
                          </h3>
                          <p className="mb-0">Admin</p>
                        </Col>
                        <Col md={2} className="text-center">
                          <h3 className="text-success">
                            {users.filter(u => u.active !== false && u.status !== 'pending_registration').length}
                          </h3>
                          <p className="mb-0">Activos</p>
                        </Col>
                        <Col md={2} className="text-center">
                          <h3 className="text-warning">
                            {users.filter(u => u.status === 'pending_registration').length}
                          </h3>
                          <p className="mb-0">Pendientes</p>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </div>
        );
      
      case 'bar':
  if (!canAccessModule('bar')) {
    return (
      <Alert variant="warning">
        <h4>Acceso Restringido</h4>
        <p>No tienes permisos para acceder al módulo de bar.</p>
        <Button variant="secondary" onClick={handleBackToDashboard}>
          Volver al Dashboard
        </Button>
      </Alert>
    );
  }
  return (
    <BarInventory 
      onBack={handleBackToDashboard}
      user={user}
      userRole={userRole}
    />
  );

        const barProducts = inventory.filter(item => 
          item.tipo === 'licor' || 
          item.tipo === 'cerveza' || 
          item.tipo === 'vino' || 
          item.tipo === 'aperitivo' ||
          item.tipo === 'digestivo'
        );

        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <Button 
                  variant="link" 
                  onClick={handleBackToDashboard}
                  className="p-0 mb-2"
                >
                  <FaArrowLeft className="me-2" />
                  Volver al Dashboard
                </Button>
                <h2>
                  <FaWineGlass className="me-2" />
                  Gestión de Bar
                </h2>
                <p className="text-muted mb-0">Control de bebidas alcohólicas y no alcohólicas</p>
              </div>
              <div>
                {(userRole === 'admin' || userRole === 'manager') && (
                  <Button variant="primary" onClick={() => setShowItemModal(true)}>
                    <FaPlus className="me-1" />
                    Agregar Producto
                  </Button>
                )}
              </div>
            </div>

            <Row className="mb-4">
              <Col md={6}>
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
              </Col>
              <Col md={3}>
                <Form.Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">Todos los tipos</option>
                  <option value="licor">Licor</option>
                  <option value="cerveza">Cerveza</option>
                  <option value="vino">Vino</option>
                  <option value="aperitivo">Aperitivo</option>
                  <option value="digestivo">Digestivo</option>
                </Form.Select>
              </Col>
            </Row>

            <Card>
              <Card.Body>
                {barProducts.length === 0 ? (
                  <Alert variant="warning">
                    <h5>No hay productos de bar</h5>
                    <p>No se encontraron productos del bar en el inventario.</p>
                  </Alert>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Stock</th>
                        <th>Precio</th>
                        <th>Proveedor</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {barProducts
                        .filter(item => {
                          const matchesSearch = item.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
                          const matchesCategory = filterCategory === 'all' || item.tipo === filterCategory;
                          return matchesSearch && matchesCategory;
                        })
                        .map(item => (
                          <tr key={item.id}>
                            <td>
                              <strong>{item.nombre}</strong>
                              {item.marca && <div className="small text-muted">{item.marca}</div>}
                            </td>
                            <td>
                              <Badge bg="secondary">{item.tipo || 'Sin tipo'}</Badge>
                            </td>
                            <td>
                              <span className={item.stock <= (item.umbral_low || 5) ? 'text-danger' : ''}>
                                {item.stock} {item.unidad || 'und'}
                              </span>
                            </td>
                            <td>${item.precio_venta || 0}</td>
                            <td>{item.proveedor || 'Sin proveedor'}</td>
                            <td>
                              {item.stock <= (item.umbral_low || 5) ? (
                                <Badge bg="danger">Stock Bajo</Badge>
                              ) : (
                                <Badge bg="success">Disponible</Badge>
                              )}
                            </td>
                            <td>
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="me-1"
                                onClick={() => {
                                  setEditingItem({...item, inventoryType: 'bar'});
                                  setShowItemModal(true);
                                }}
                              >
                                <FaEdit />
                              </Button>
                              {(userRole === 'admin') && (
                                <Button 
                                  variant="outline-danger" 
                                  size="sm"
                                  onClick={() => {
                                    setItemToDelete(item);
                                    setShowDeleteConfirm(true);
                                  }}
                                >
                                  <FaTrash />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
            </Card>
          </div>
        );

      case 'kitchen':
        if (!canAccessModule('kitchen')) {
          return (
            <Alert variant="warning">
              <h4>Acceso Restringido</h4>
              <p>No tienes permisos para acceder al módulo de cocina.</p>
              <Button variant="secondary" onClick={handleBackToDashboard}>
                Volver al Dashboard
              </Button>
            </Alert>
          );
        }
        return (
          <KitchenInventory 
            onBack={handleBackToDashboard}
            userRole={userRole}
          />
        );

      case 'users':
        if (!canAccessModule('users')) {
          return (
            <Alert variant="warning">
              <h4>Acceso Restringido</h4>
              <p>Solo los administradores pueden acceder a la gestión de usuarios.</p>
              <Button variant="secondary" onClick={handleBackToDashboard}>
                Volver al Dashboard
              </Button>
            </Alert>
          );
        }
        return (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <Button 
                  variant="link" 
                  onClick={handleBackToDashboard}
                  className="p-0 mb-2"
                >
                  <FaArrowLeft className="me-2" />
                  Volver al Dashboard
                </Button>
                <h2>
                  <FaCog className="me-2" />
                  Gestión de Usuarios Avanzada FOH/BOH
                </h2>
                <p className="text-muted mb-0">
                  Administración completa de usuarios con estructura Front of House / Back of House
                </p>
              </div>
            </div>

            <Alert variant="info" className="mb-4">
              <h5>Sistema de Gestión FOH/BOH Profesional</h5>
              <p className="mb-2">
                Este módulo permite crear usuarios con la estructura organizacional completa del restaurante:
                Front of House (FOH) y Back of House (BOH) con todos los roles específicos.
              </p>
              <ul className="mb-0">
                <li>Formulario completo con roles específicos por departamento</li>
                <li>Compatible con la estructura existente en Firebase</li>
                <li>Generación automática de ID de empleado</li>
                <li>Organización profesional FOH/BOH</li>
                <li>Facilita la gestión de horarios por departamento</li>
              </ul>
            </Alert>

            <AdvancedUserManagement 
              onBack={handleBackToDashboard}
              currentUser={user}
              userRole={userRole}
            />
          </div>
        );

      case 'providers':
        return (
          <ProviderManagement 
            onBack={handleBackToDashboard}
            userRole={userRole}
          />
        );

      case 'directory':
        return (
          <EmployeeDirectory 
            onBack={handleBackToDashboard}
            currentUser={user}
          />
        );

      case 'reports':
        if (!canAccessModule('reports')) {
          return (
            <Alert variant="warning">
              <h4>Acceso Restringido</h4>
              <p>No tienes permisos para acceder a los reportes.</p>
              <Button variant="secondary" onClick={handleBackToDashboard}>
                Volver al Dashboard
              </Button>
            </Alert>
          );
        }
        return (
          <Alert variant="info">
            <h4>Módulo de Reportes FOH/BOH</h4>
            <p>Esta sección está en desarrollo. Pronto tendrás acceso a análisis detallados y reportes organizados por departamentos Front of House y Back of House.</p>
            <Button variant="secondary" onClick={handleBackToDashboard}>
              Volver al Dashboard
            </Button>
          </Alert>
        );

      default:
        return <MainDashboard />;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/schedule/view/:scheduleId" 
            element={<PublicScheduleViewer />} 
          />
          
          <Route 
            path="/*" 
            element={
              <div>
                {!user ? (
                  <Login />
                ) : (
                  <AppLayout
                    user={user}
                    userRole={userRole}
                    currentView={currentView}
                    onNavigate={handleNavigation}
                    notifications={getNotifications()}
                    error={error}
                    success={success}
                    onClearError={() => setError('')}
                    onClearSuccess={() => setSuccess('')}
                    onLogout={handleLogout}
                  >
                    {renderCurrentView()}
                  </AppLayout>
                )}

                {/* MODAL PARA CREAR USUARIO FOH/BOH */}
                {showCreateUserModal && (
                  <CreateUserComponent
                    show={showCreateUserModal}
                    onHide={() => setShowCreateUserModal(false)}
                    currentUser={user}
                    onSuccess={(message) => {
                      setSuccess(message);
                      setTimeout(() => setSuccess(''), 10000);
                    }}
                    onError={(message) => {
                      setError(message);
                      setTimeout(() => setError(''), 5000);
                    }}
                  />
                )}

                {showItemModal && (
                  <InventoryItemForm
                    show={showItemModal}
                    onHide={() => {
                      setShowItemModal(false);
                      setEditingItem(null);
                    }}
                    editingItem={editingItem}
                    providers={getFilteredProviders(editingItem?.inventoryType || 'bar')}
                    inventoryType={editingItem?.inventoryType || 'bar'}
                    userRole={userRole}
                    onSuccess={(message) => {
                      setSuccess(message);
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                    onError={(message) => {
                      setError(message);
                      setTimeout(() => setError(''), 3000);
                    }}
                  />
                )}

                {showProfileModal && (
                  <UserProfile
                    show={showProfileModal}
                    onHide={() => setShowProfileModal(false)}
                    user={user}
                    onSuccess={(message) => {
                      setSuccess(message);
                      setTimeout(() => setSuccess(''), 3000);
                    }}
                    onError={(message) => {
                      setError(message);
                      setTimeout(() => setError(''), 3000);
                    }}
                  />
                )}

                <Modal show={showDeleteConfirm} onHide={() => setShowDeleteConfirm(false)}>
                  <Modal.Header closeButton>
                    <Modal.Title>Confirmar Eliminación</Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    ¿Estás seguro de que quieres eliminar "{itemToDelete?.nombre}"?
                    Esta acción no se puede deshacer.
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      variant="danger" 
                      onClick={async () => {
                        try {
                          await deleteDoc(doc(db, 'inventario', itemToDelete.id));
                          setSuccess('Producto eliminado exitosamente');
                          setTimeout(() => setSuccess(''), 3000);
                        } catch (error) {
                          setError('Error al eliminar el producto');
                          setTimeout(() => setError(''), 3000);
                        }
                        setShowDeleteConfirm(false);
                        setItemToDelete(null);
                      }}
                    >
                      Eliminar
                    </Button>
                  </Modal.Footer>
                </Modal>
              </div>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;