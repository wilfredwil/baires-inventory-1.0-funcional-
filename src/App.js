// src/App.js - VERSIÓN CORREGIDA CON INVENTARIO Y PERMISOS FUNCIONANDO
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
import MessagingSystem from './components/MessagingSystem';
import InventoryItemForm from './components/InventoryItemForm';
import AdvancedUserManagement from './components/AdvancedUserManagement';
import ProviderManagement from './components/ProviderManagement';
import KitchenInventory from './components/KitchenInventory';
import EnhancedShiftManagement from './components/EnhancedShiftManagement';
import UserProfile from './components/UserProfile';
import EmployeeDirectory from './components/EmployeeDirectory';
import DashboardWidgets from './components/DashboardWidgets';
import PublicScheduleViewer from './components/PublicScheduleViewer';

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
  const [showUserModal, setShowUserModal] = useState(false);

  // Estados de filtros
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // Estados de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados de perfil
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Efectos principales
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        // Cargar rol del usuario con mejor manejo de errores
        try {
          const userQuery = query(
            collection(db, 'users'), 
            where('email', '==', user.email)
          );
          const userDoc = await getDocs(userQuery);
          
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
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
        setUser(null);
        setUserRole('employee');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // CORREGIDO: Cargar datos del inventario desde la colección correcta
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
      'cocinero': 'Cocinero'
    };

    const badgeClass = userRole === 'admin' ? 'admin-badge' : 
                      userRole === 'manager' ? 'manager-badge' : 'secondary';

    return (
      <Badge className={badgeClass} style={{ fontSize: '0.75rem' }}>
        {roleNames[userRole] || userRole}
      </Badge>
    );
  };

  // Función para verificar permisos de módulos
  const canAccessModule = (moduleId) => {
    switch (moduleId) {
      case 'users':
        return userRole === 'admin';
      case 'bar':
        return ['admin', 'manager', 'bartender'].includes(userRole);
      case 'kitchen':
        return ['admin', 'manager', 'cocinero'].includes(userRole);
      case 'shifts':
        return ['admin', 'manager'].includes(userRole);
      case 'directory':
        return true; // Todos pueden ver el directorio
      case 'reports':
        return ['admin', 'manager'].includes(userRole);
      default:
        return true;
    }
  };

  // Función para obtener notificaciones
  const getNotifications = () => {
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
        description: 'Ver y gestionar información de empleados',
        color: '#8B5CF6',
        colorDark: '#7C3AED',
        stats: `${users.length} empleados`,
        available: canAccessModule('personal')
      },
      {
        id: 'users',
        title: 'Gestión de Usuarios',
        icon: FaCog,
        description: 'Administrar usuarios y permisos del sistema',
        color: '#DC2626',
        colorDark: '#B91C1C',
        stats: 'Solo Admin',
        available: canAccessModule('users'),
        adminOnly: true
      },
      {
        id: 'shifts',
        title: 'Horarios / Turnos',
        icon: FaCalendarAlt,
        description: 'Gestión de turnos y horarios de trabajo',
        color: '#10B981',
        colorDark: '#059669',
        stats: 'Calendario',
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
        description: 'Análisis y reportes del restaurante',
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

        {/* Debug de permisos - Solo para admin */}
        {userRole === 'admin' && (
          <Row className="mb-4">
            <Col>
              <Alert variant="info">
                <strong>Debug Admin:</strong> Rol actual: {userRole} | 
                Productos en inventario: {inventory.length} | 
                Usuario: {user?.email}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Widgets del Dashboard */}
        <DashboardWidgets 
          inventory={inventory}
          users={users}
          userRole={userRole}
        />

        {/* Módulos disponibles para el usuario */}
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
  const Login = () => (
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
                      placeholder="tu@email.com"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="••••••••"
                    />
                  </Form.Group>

                  <Button 
                    type="submit" 
                    variant="primary" 
                    className="w-100"
                    disabled={loginLoading}
                  >
                    {loginLoading ? <Spinner animation="border" size="sm" /> : 'Ingresar'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );

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
      
      case 'shifts':
        return (
          <div className="shift-management">
            <EnhancedShiftManagement 
              user={user}
              userRole={userRole}
              onBack={handleBackToDashboard}
            />
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

        // Filtrar productos del bar
        const barProducts = inventory.filter(item => 
          item.tipo === 'licor' || 
          item.tipo === 'cerveza' || 
          item.tipo === 'vino' || 
          item.tipo === 'aperitivo' ||
          item.tipo === 'digestivo'
        );

        return (
          <div>
            {/* Header del módulo bar */}
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

            {/* Debug para admin */}
            {userRole === 'admin' && (
              <Alert variant="info" className="mb-4">
                <strong>Debug:</strong> Total inventario: {inventory.length} | 
                Productos bar: {barProducts.length} | 
                Filtro: {filterCategory} | 
                Búsqueda: "{searchTerm}"
              </Alert>
            )}

            {/* Filtros y búsqueda */}
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

            {/* Tabla de inventario */}
            <Card>
              <Card.Body>
                {barProducts.length === 0 ? (
                  <Alert variant="warning">
                    <h5>No hay productos de bar</h5>
                    <p>No se encontraron productos del bar en el inventario.</p>
                    {userRole === 'admin' && (
                      <p><small>Como admin, puedes agregar productos haciendo clic en "Agregar Producto".</small></p>
                    )}
                  </Alert>
                ) : (
                  <Table responsive hover>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Tipo</th>
                        <th>Subtipo</th>
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
                          const matchesSearch = item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                              item.marca?.toLowerCase().includes(searchTerm.toLowerCase());
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
                              <Badge bg="outline-secondary">{item.subTipo || 'Sin subtipo'}</Badge>
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
          <AdvancedUserManagement 
            onBack={handleBackToDashboard}
            currentUser={user}
            userRole={userRole}
          />
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

      default:
        return <MainDashboard />;
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  // Render principal con Router
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Ruta pública para ver horarios */}
          <Route 
            path="/schedule/view/:scheduleId" 
            element={<PublicScheduleViewer />} 
          />
          
          {/* Ruta principal de la aplicación */}
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
                  >
                    {renderCurrentView()}
                  </AppLayout>
                )}

                {/* Modales */}
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

                {/* Modal de confirmación de eliminación */}
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