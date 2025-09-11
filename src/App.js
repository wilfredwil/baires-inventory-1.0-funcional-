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
        // Cargar rol del usuario
        try {
          const userDoc = await getDocs(query(
            collection(db, 'users'), 
            where('email', '==', user.email)
          ));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            setUserRole(userData.role || 'employee');
          }
        } catch (error) {
          console.error('Error loading user role:', error);
        }
      } else {
        setUser(null);
        setUserRole('employee');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Cargar datos del inventario
  useEffect(() => {
    if (!user) return;

    const unsubscribeInventory = onSnapshot(
      query(collection(db, 'inventory'), orderBy('nombre')),
      (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInventory(items);
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
      'employee': 'Empleado'
    };

    const badgeClass = userRole === 'admin' ? 'admin-badge' : 
                      userRole === 'manager' ? 'manager-badge' : 'secondary';

    return (
      <Badge className={badgeClass} style={{ fontSize: '0.75rem' }}>
        {roleNames[userRole] || userRole}
      </Badge>
    );
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
        stats: `${users.length} empleados`,
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
      <Container fluid>
        <Row className="mb-4">
          <Col>
            <h2>Dashboard Principal</h2>
            <p className="text-muted">Sistema de gestión integral para Baires</p>
          </Col>
        </Row>

        {/* Widgets del Dashboard */}
        <DashboardWidgets 
          inventory={inventory}
          users={users}
          userRole={userRole}
        />

        {/* Módulos principales */}
        <Row className="g-4">
          {modules.map(module => (
            <Col key={module.id} lg={4} md={6}>
              <Card 
                className={`h-100 module-card ${!module.available ? 'disabled-module' : ''}`}
                style={{
                  background: module.available 
                    ? `linear-gradient(135deg, ${module.color} 0%, ${module.colorDark} 100%)`
                    : '#f8f9fa',
                  cursor: module.available ? 'pointer' : 'not-allowed',
                  border: 'none',
                  color: module.available ? 'white' : '#6c757d'
                }}
                onClick={() => module.available && handleNavigation(module.id)}
              >
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <module.icon size={48} className={module.available ? 'text-white' : 'text-muted'} />
                    {module.adminOnly && (
                      <Badge bg="warning" text="dark">Admin</Badge>
                    )}
                  </div>
                  
                  <h5 className="mb-2">{module.title}</h5>
                  <p className="mb-3 small opacity-75">{module.description}</p>
                  
                  <div className="mt-auto">
                    <small className="opacity-75">{module.stats}</small>
                    {!module.available && (
                      <div className="mt-2">
                        <Badge bg="secondary">Próximamente</Badge>
                      </div>
                    )}
                  </div>
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
                  <option value="all">Todas las categorías</option>
                  <option value="cerveza">Cerveza</option>
                  <option value="vino">Vino</option>
                  <option value="spirits">Spirits</option>
                  <option value="sin_alcohol">Sin Alcohol</option>
                </Form.Select>
              </Col>
            </Row>

            {/* Tabla de inventario */}
            <Card>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Stock</th>
                      <th>Precio</th>
                      <th>Proveedor</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory
                      .filter(item => {
                        const matchesSearch = item.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchesCategory = filterCategory === 'all' || item.categoria === filterCategory;
                        return matchesSearch && matchesCategory;
                      })
                      .map(item => (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.nombre}</strong>
                            {item.marca && <div className="small text-muted">{item.marca}</div>}
                          </td>
                          <td>
                            <Badge bg="secondary">{item.categoria}</Badge>
                          </td>
                          <td>
                            <span className={item.stock <= (item.umbral_low || 5) ? 'text-danger' : ''}>
                              {item.stock} {item.unidad}
                            </span>
                          </td>
                          <td>${item.precio_venta}</td>
                          <td>{item.proveedor}</td>
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
                                setEditingItem(item);
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
              </Card.Body>
            </Card>
          </div>
        );

      case 'kitchen':
        return (
          <KitchenInventory 
            onBack={handleBackToDashboard}
            userRole={userRole}
          />
        );

      case 'users':
        if (userRole !== 'admin') {
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
                    providers={providers}
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