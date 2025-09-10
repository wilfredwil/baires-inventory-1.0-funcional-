// src/App.js - VERSIÓN COMPLETA CON SISTEMA DE MENSAJES INTEGRADO
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
  FaUser
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
  onAuthStateChanged 
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
  where
} from 'firebase/firestore';
import { 
  getFunctions, 
  httpsCallable 
} from 'firebase/functions';
import { getStorage } from 'firebase/storage';

// Local imports
import { auth, db, storage } from './firebase';
import AppLayout from './components/AppLayout';
import MessagingSystem from './components/MessagingSystem'; // NUEVO IMPORT
import InventoryItemForm from './components/InventoryItemForm';
import AdvancedUserManagement from './components/AdvancedUserManagement';
import ProviderManagement from './components/ProviderManagement';
import KitchenInventory from './components/KitchenInventory';
import ShiftManagement from './components/ShiftManagement';
import UserProfile from './components/UserProfile';
import EmployeeDirectory from './components/EmployeeDirectory';

// Styles
import './styles/improvements.css';
import './styles/shifts.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// Utils
import { exportInventoryToPDF, exportLowStockToPDF } from './utils/pdfExport';

// Chart.js configuration
ChartJS.register(ArcElement, Tooltip, Legend);

function App() {
  // Estados principales
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('');
  const [inventory, setInventory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [notes, setNotes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  // Estados de modales
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showMyProfile, setShowMyProfile] = useState(false);
  const [showEmployeeDirectory, setShowEmployeeDirectory] = useState(false);

  // Estados de formularios
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newNote, setNewNote] = useState('');

  // Estados de perfil
  const [currentUserData, setCurrentUserData] = useState(null);

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [licorFilter, setLicorFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Estados de alertas
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadNotes, setUnreadNotes] = useState(new Set());

  // FUNCIÓN PARA NAVEGACIÓN (con notificaciones actualizadas)
  const handleNavigation = (viewName) => {
    setCurrentView(viewName);
    // Cerrar modales si están abiertos
    setShowAddForm(false);
    setShowUserModal(false);
    setShowProviderModal(false);
    setShowMyProfile(false);
    setShowEmployeeDirectory(false);
  };

  // Verificar autenticación
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Obtener rol del usuario
        try {
          const userDoc = await getDocs(
            query(collection(db, 'users'), where('email', '==', user.email))
          );
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            setUserRole(userData.role || 'waiter');
          } else {
            setUserRole('waiter');
          }
        } catch (err) {
          console.error('Error getting user role:', err);
          setUserRole('waiter');
        }
      } else {
        setUser(null);
        setUserRole('');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Función para cargar datos del usuario actual
  const loadCurrentUserData = async () => {
    if (!user) return;
    
    try {
      const userQuery = query(
        collection(db, 'users'), 
        where('email', '==', user.email)
      );
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        const userData = userSnapshot.docs[0].data();
        setCurrentUserData({
          id: userSnapshot.docs[0].id,
          ...userData
        });
      }
    } catch (err) {
      console.error('Error loading current user data:', err);
    }
  };

  // Cargar datos en tiempo real
  useEffect(() => {
    if (user) {
      // Cargar datos del usuario actual
      loadCurrentUserData();

      // Inventory listener
      const unsubscribeInventory = onSnapshot(
        query(collection(db, 'inventario'), orderBy('nombre')),
        (snapshot) => {
          const inventoryData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setInventory(inventoryData);
        },
        (error) => {
          console.error('Error loading inventory:', error);
          setError('Error cargando inventario');
        }
      );

      // Providers listener
      const unsubscribeProviders = onSnapshot(
        query(collection(db, 'providers'), orderBy('nombre')),
        (snapshot) => {
          const providersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setProviders(providersData);
        }
      );

      // Historial listener
      const unsubscribeHistorial = onSnapshot(
        query(collection(db, 'historial'), orderBy('timestamp', 'desc')),
        (snapshot) => {
          const historialData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHistorial(historialData);
        }
      );

      // Notes listener
      const unsubscribeNotes = onSnapshot(
        query(collection(db, 'notes'), orderBy('timestamp', 'desc')),
        (snapshot) => {
          const notesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setNotes(notesData);
        }
      );

      // Employees listener
      const unsubscribeEmployees = onSnapshot(
        collection(db, 'users'),
        (snapshot) => {
          const employeesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEmployees(employeesData);
        }
      );

      return () => {
        unsubscribeInventory();
        unsubscribeProviders();
        unsubscribeHistorial();
        unsubscribeNotes();
        unsubscribeEmployees();
      };
    }
  }, [user]);

  // Función de login
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setShowLoginModal(false);
      setEmail('');
      setPassword('');
      setSuccess('Sesión iniciada correctamente');
    } catch (err) {
      console.error('Error de login:', err);
      setError('Error de autenticación. Verifica tu email y contraseña.');
    }
    setLoading(false);
  };

  // Función de logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setSuccess('Sesión cerrada correctamente');
      setCurrentView('dashboard');
    } catch (err) {
      console.error('Error de logout:', err);
      setError('Error al cerrar sesión');
    }
  };

  // Funciones auxiliares
  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
  };

  const handleProfileUpdate = (updatedData) => {
    setCurrentUserData(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  // Función para obtener badge del rol
  const getRoleBadge = (role) => {
    const roleNames = {
      'admin': 'Administrador',
      'manager': 'Gerente', 
      'bartender': 'Bartender',
      'cocinero': 'Cocinero',
      'waiter': 'Mesero'
    };

    const badgeClass = userRole === 'admin' ? 'admin-badge' : 
                      userRole === 'manager' ? 'manager-badge' : 'secondary';

    return (
      <Badge className={badgeClass} style={{ fontSize: '0.75rem' }}>
        {roleNames[userRole] || userRole}
      </Badge>
    );
  };

  // Función para obtener notificaciones (simulada)
  const getNotifications = () => {
    // Aquí puedes agregar lógica para notificaciones reales
    // Por ahora, simulamos algunas notificaciones
    const notifications = [];
    
    // Agregar notificaciones de stock bajo
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
    
    // Agregar notificaciones de mensajes no leídos (cuando esté implementado)
    // notifications.push({
    //   type: 'message',
    //   message: 'Nuevos mensajes',
    //   count: 3
    // });
    
    return notifications;
  };

  // Componente Dashboard Principal
  const MainDashboard = () => {
    const modules = [
      {
        id: 'bar',
        title: 'Bar / Alcohol',
        icon: FaWineGlass,
        description: 'Gestión de bebidas alcohólicas y bar',
        color: '#F59E0B',
        colorDark: '#D97706',
        stats: `${inventory.length} productos`,
        available: true
      },
      {
        id: 'kitchen',
        title: 'Cocina / Ingredientes',
        icon: FaUtensils,
        description: 'Ingredientes, recetas y stock de cocina',
        color: '#EF4444',
        colorDark: '#DC2626',
        stats: 'Sistema FIFO',
        available: true
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
        id: 'users',
        title: 'Gestión de Usuarios',
        icon: FaUsers,
        description: 'Administrar usuarios y permisos del sistema',
        color: '#8B5CF6',
        colorDark: '#7C3AED',
        stats: 'Solo Admin',
        available: userRole === 'admin',
        adminOnly: true
      },
      {
        id: 'shifts',
        title: 'Personal / Horarios',
        icon: FaCalendarAlt,
        description: 'Gestión de turnos y personal estilo ShiftNotes',
        color: '#10B981',
        colorDark: '#059669',
        stats: 'ShiftNotes Style',
        available: true
      },
      {
        id: 'directory',
        title: 'Directorio de Personal',
        icon: FaUsers,
        description: 'Ver información de contacto de empleados',
        color: '#6366F1',
        colorDark: '#4F46E5',
        stats: `${employees.length} empleados`,
        available: true
      },
      {
        id: 'reports',
        title: 'Reportes / Analytics',
        icon: FaChartBar,
        description: 'Análisis y reportes del restaurante',
        color: '#6B7280',
        colorDark: '#4B5563',
        stats: 'Ver estadísticas',
        available: false
      }
    ];

    return (
      <Container fluid style={{ padding: '30px' }}>
        {/* Header del Dashboard */}
        <div className="text-center mb-5">
          <h1 style={{ 
            fontFamily: 'Raleway, sans-serif', 
            fontSize: '2.5rem', 
            color: '#FFFFFF',
            textShadow: '0 0 10px rgba(135, 206, 235, 0.3)'
          }}>
            Baires Restaurant
          </h1>
          <p className="lead" style={{ color: 'rgba(255,255,255,0.8)' }}>Panel de Control Principal</p>
        </div>

        {/* Módulos */}
        <div className="mb-5">
          <Row>
            {modules.map((module) => {
              const IconComponent = module.icon;
              return (
                <Col key={module.id} md={4} className="mb-3">
                  <Card 
                    className={`module-card h-100 ${module.available ? 'hover-3d' : ''}`}
                    style={{
                      '--module-color': module.color,
                      '--module-color-dark': module.colorDark,
                      background: `linear-gradient(135deg, ${module.color}, ${module.colorDark})`,
                      opacity: module.available ? 1 : 0.6,
                      cursor: module.available ? 'pointer' : 'not-allowed',
                      border: 'none',
                      borderRadius: '20px',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                      color: 'white',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => module.available && handleNavigation(module.id)}
                  >
                    <Card.Body className="p-4 d-flex flex-column">
                      <div className="d-flex align-items-center mb-3">
                        <IconComponent 
                          style={{ 
                            fontSize: '2.5rem', 
                            marginRight: '15px',
                            filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))'
                          }} 
                        />
                        <div>
                          <h5 className="mb-1" style={{ fontWeight: '700' }}>{module.title}</h5>
                          <p className="mb-0" style={{ 
                            fontSize: '0.9rem', 
                            opacity: 0.9,
                            lineHeight: '1.4'
                          }}>
                            {module.description}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto">
                        <Badge 
                          bg={module.available ? 'light' : 'warning'} 
                          text={module.available ? 'dark' : 'dark'}
                          style={{ 
                            fontSize: '0.8rem',
                            padding: '0.5rem 1rem',
                            borderRadius: '15px',
                            fontWeight: '600'
                          }}
                        >
                          {module.stats}
                        </Badge>
                        {module.adminOnly && userRole !== 'admin' && (
                          <div className="mt-2">
                            <small style={{ opacity: 0.8 }}>Solo Administradores</small>
                          </div>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      </Container>
    );
  };

  // Función para mostrar el nombre del usuario en el chat
  const getUserDisplayName = (userEmail) => {
    if (currentUserData?.email === userEmail) {
      return currentUserData?.displayName || 
             `${currentUserData?.firstName || ''} ${currentUserData?.lastName || ''}`.trim() || 
             userEmail.split('@')[0];
    }
    return userEmail.split('@')[0];
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status" style={{ color: '#10B981' }}>
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  // RETURN PRINCIPAL CON APPLAYOUT Y SISTEMA DE MENSAJES
  return (
    <Router>
      <div className="App">
        {!user ? (
          // Vista de login (sin cambios)
          <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Container>
              <Row className="justify-content-center">
                <Col md={6}>
                  <Card className="shadow-lg border-0" style={{ borderRadius: '20px', background: 'rgba(255, 255, 255, 0.95)' }}>
                    <Card.Body className="p-5">
                      <div className="text-center mb-4">
                        <h2 style={{ color: '#333333', fontFamily: 'Raleway, sans-serif' }}>
                          Baires Restaurant
                        </h2>
                        <p className="text-muted">Sistema de Gestión Integral</p>
                      </div>
                      <Button 
                        variant="primary" 
                        size="lg" 
                        className="w-100 mb-3"
                        onClick={() => setShowLoginModal(true)}
                        style={{ borderRadius: '15px', padding: '12px' }}
                      >
                        Iniciar Sesión
                      </Button>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Container>

            {/* Modal de Login */}
            <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
              <Modal.Header closeButton>
                <Modal.Title>Iniciar Sesión</Modal.Title>
              </Modal.Header>
              <Modal.Body>
                <Form onSubmit={handleLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="tu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="Tu contraseña"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </Form.Group>
                  <Button 
                    variant="primary" 
                    type="submit" 
                    className="w-100" 
                    disabled={loading}
                  >
                    {loading ? <Spinner animation="border" size="sm" /> : 'Ingresar'}
                  </Button>
                </Form>
              </Modal.Body>
            </Modal>
          </div>
        ) : (
          // Contenido autenticado envuelto en AppLayout
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
          >
            {/* TODAS LAS VISTAS DEL SISTEMA */}
            
            {/* Dashboard Principal */}
            {currentView === 'dashboard' && <MainDashboard />}
            
            {/* Sistema de Mensajes - NUEVA VISTA */}
            {currentView === 'messages' && (
              <MessagingSystem 
                user={user}
                userRole={userRole}
                onBack={handleBackToDashboard}
              />
            )}
            
            {/* Gestión de Turnos */}
            {currentView === 'shifts' && (
              <div className="shift-management">
                <ShiftManagement 
                  user={user}
                  userRole={userRole}
                  onBack={handleBackToDashboard}
                />
              </div>
            )}
            
            {/* Inventario de Bar */}
            {currentView === 'bar' && (
              <Routes>
                <Route path="/" element={
                  <div>
                    {/* Header del módulo bar */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <div>
                        <Button 
                          variant="link" 
                          onClick={handleBackToDashboard}
                          className="p-0 text-decoration-none mb-2"
                          style={{ color: '#87CEEB' }}
                        >
                          <FaArrowLeft className="me-2" />
                          Volver al Dashboard
                        </Button>
                        <h2 className="mb-0" style={{ 
                          color: '#333333', 
                          fontFamily: 'Raleway, sans-serif',
                          fontWeight: '600'
                        }}>
                          <FaWineGlass className="me-3" style={{ color: '#F59E0B' }} />
                          Inventario Bar
                        </h2>
                      </div>
                      <div className="d-flex gap-2">
                        {(userRole === 'admin' || userRole === 'manager' || userRole === 'bartender') && (
                          <Button 
                            variant="primary" 
                            onClick={() => setShowAddForm(true)}
                            style={{ background: '#F59E0B', borderColor: '#F59E0B' }}
                          >
                            <FaPlus className="me-2" />
                            Agregar Producto
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Aquí iría el resto del contenido del bar */}
                    {/* Mantener todo tu código actual del inventario */}
                  </div>
                } />
              </Routes>
            )}
            
            {/* Inventario de Cocina */}
            {currentView === 'kitchen' && (
              <KitchenInventory 
                user={user}
                userRole={userRole}
                onBack={handleBackToDashboard}
              />
            )}

            {/* Gestión de Usuarios (Solo Admin) */}
            {currentView === 'users' && userRole === 'admin' && (
              <div>
                <AdvancedUserManagement
                  show={true}
                  onHide={handleBackToDashboard}
                  user={user}
                  userRole={userRole}
                />
              </div>
            )}

            {/* Directorio de Personal */}
            {currentView === 'directory' && (
              <EmployeeDirectory
                show={true}
                onHide={handleBackToDashboard}
                user={user}
                userRole={userRole}
              />
            )}

            {/* Gestión de Proveedores */}
            {currentView === 'providers' && (
              <ProviderManagement
                show={true}
                onHide={handleBackToDashboard}
                user={user}
                userRole={userRole}
              />
            )}

            {/* TODOS LOS MODALES MANTIENEN SU POSICIÓN ACTUAL */}
            {showAddForm && (
              <InventoryItemForm
                show={showAddForm}
                onHide={() => setShowAddForm(false)}
                onSave={() => {
                  setShowAddForm(false);
                  setSuccess('Producto agregado exitosamente');
                }}
                editingItem={editingItem}
                setEditingItem={setEditingItem}
                user={user}
                userRole={userRole}
                providers={providers}
              />
            )}

            {showUserModal && (
              <AdvancedUserManagement
                show={showUserModal}
                onHide={() => setShowUserModal(false)}
                user={user}
                userRole={userRole}
              />
            )}

            {showProviderModal && (
              <ProviderManagement
                show={showProviderModal}
                onHide={() => setShowProviderModal(false)}
                user={user}
                userRole={userRole}
              />
            )}

            {showMyProfile && currentUserData && (
              <UserProfile
                show={showMyProfile}
                onHide={() => setShowMyProfile(false)}
                user={user}
                userRole={userRole}
                currentUserData={currentUserData}
                onProfileUpdate={handleProfileUpdate}
              />
            )}

            <EmployeeDirectory
              show={showEmployeeDirectory}
              onHide={() => setShowEmployeeDirectory(false)}
              user={user}
              userRole={userRole}
            />
          </AppLayout>
        )}

        {/* Estilos adicionales */}
        <style jsx>{`
          .navbar-toggler-icon {
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='%23000000' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e") !important;
          }
          
          .module-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .module-card.hover-3d:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4) !important;
          }
          
          .admin-badge {
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
          }
          
          .manager-badge {
            background: linear-gradient(135deg, #2563eb, #1d4ed8);
            color: white;
          }
        `}</style>
      </div>
    </Router>
  );
}

export default App;