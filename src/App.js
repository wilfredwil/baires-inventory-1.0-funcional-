import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, limit, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from './firebase';
import { downloadCSV } from './utils/downloadCSV';
import { exportInventoryToPDF, exportLowStockToPDF } from './utils/pdfExport';
import { useUserRole } from './hooks/useUserRole';
import InventoryItemForm from './components/InventoryItemForm';
import ProviderManagement from './components/ProviderManagement';
import UserManagement from './components/UserManagement';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav, Button, Row, Col, Card, Form, Modal, Collapse, Alert, Dropdown, Badge } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import { FaPlus, FaDownload, FaFilePdf, FaUsers, FaBuilding, FaFilter, FaEdit, FaHome, FaWineGlass, FaUtensils, FaConciergeBell, FaCalendarAlt, FaChartBar } from 'react-icons/fa';
import logo from './logo.png';

ChartJS.register(ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement);

const SplashScreen = () => (
  <div className="text-center" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#FFFFFF', position: 'relative' }}>
    <img src={logo} alt="Baires Inventory Logo" style={{ maxWidth: '300px', maxHeight: '300px', animation: 'fadeIn 2s' }} />
    <div style={{ position: 'absolute', bottom: '20px', color: '#87CEEB', fontFamily: 'Raleway, sans-serif', fontSize: '18px', textShadow: '0 0 5px #87CEEB' }}>
      Beta Privada para Baires
    </div>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Raleway&family=Roboto&display=swap');
      @import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css");
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      body {
        font-family: 'Roboto', sans-serif;
        background: #F5F5F5;
        color: #333333;
        overflow-x: hidden;
      }
      h1, h2, h3, h4, h5, h6 {
        font-family: 'Raleway', sans-serif;
      }
      .glass {
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(135, 206, 235, 0.3);
        border-radius: 15px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      }
      .hover-3d {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .hover-3d:hover {
        transform: perspective(1000px) rotateX(5deg) rotateY(5deg) translateZ(10px);
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      }
      .low-stock {
        border: 2px solid #FF6B6B;
      }
      .critical-stock {
        border: 2px solid #DC3545;
        animation: pulse 2s infinite;
      }
      .navbar-toggler {
        border-color: #87CEEB !important;
        background-color: rgba(255, 255, 255, 0.3) !important;
      }
      .navbar-toggler-icon {
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='%23000000' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e") !important;
      }
      .chat-button {
        z-index: 1000 !important;
      }
      .admin-badge {
        background: linear-gradient(45deg, #FF6B6B, #4ECDC4);
        color: white;
        font-weight: bold;
      }
      .manager-badge {
        background: linear-gradient(45deg, #45B7D1, #96CEB4);
        color: white;
        font-weight: bold;
      }
      .module-card {
        transition: all 0.3s ease;
        cursor: pointer;
        background: linear-gradient(135deg, var(--module-color), var(--module-color-dark));
        border: none;
        color: white;
        min-height: 200px;
      }
      .module-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.2);
      }
    `}</style>
  </div>
);

// Componente Dashboard Principal
const MainDashboard = ({ 
  inventory, 
  providers, 
  historial, 
  notes, 
  user, 
  userRole, 
  onNavigateToModule 
}) => {
  // Módulos del sistema
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
      stats: 'Próximamente',
      available: false
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
      id: 'staff',
      title: 'Personal / Horarios',
      icon: FaCalendarAlt,
      description: 'Gestión de turnos y personal',
      color: '#10B981',
      colorDark: '#059669',
      stats: 'Próximamente',
      available: false
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
    <div>
      {/* Header del Dashboard */}
      <div className="text-center mb-5">
        <h1 style={{ 
          fontFamily: 'Raleway, sans-serif', 
          fontSize: '2.5rem', 
          color: '#333333',
          textShadow: '0 0 10px rgba(135, 206, 235, 0.3)'
        }}>
          Baires Restaurant
        </h1>
        <p className="lead text-muted">Panel de Control Principal</p>
      </div>

      {/* Solo Módulos */}
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
                    cursor: module.available ? 'pointer' : 'not-allowed'
                  }}
                  onClick={() => module.available && onNavigateToModule(module.id)}
                >
                  <Card.Body className="d-flex flex-column justify-content-between">
                    <div>
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <IconComponent size={40} />
                        <Badge bg="light" text="dark" className="opacity-75">
                          {module.stats}
                        </Badge>
                      </div>
                      <h5 className="mb-2">{module.title}</h5>
                      <p className="small opacity-90 mb-0">{module.description}</p>
                    </div>
                    {!module.available && (
                      <div className="mt-3">
                        <Badge bg="warning" text="dark">
                          Próximamente
                        </Badge>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard');
  const [inventory, setInventory] = useState([]);
  const [providers, setProviders] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [licorFilter, setLicorFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadNotes, setUnreadNotes] = useState(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [openCard, setOpenCard] = useState(null);

  const { userRole, userProfile, loading: roleLoading, isAdmin, canEditAllFields, canManageUsers, canManageProviders } = useUserRole(user);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const splashTimer = setTimeout(() => {
          setShowSplash(false);
          fetchInventory();
          fetchProviders();
          fetchHistorial();
          fetchNotes();
        }, 3000);
        return () => clearTimeout(splashTimer);
      } else {
        setShowSplash(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (user && notes.length > 0) {
      const userNotes = notes.filter(note => note.usuario !== user.email);
      const unread = new Set(userNotes.map(note => note.id));
      setUnreadNotes(unread);
      if (unread.size > 0 && !showChat) setShowChat(true);
    }
  }, [notes, user, showChat]);

  const fetchInventory = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'inventario'));
      const items = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const stock = Number(data.stock) || 0;
        const umbral_low = Number(data.umbral_low) || 0;
        return { id: doc.id, ...data, stock, umbral_low };
      });
      setInventory(items);
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Error al cargar el inventario');
    }
  };

  const fetchProviders = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'providers'));
      const providersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProviders(providersData);
    } catch (err) {
      console.error('Error fetching providers:', err);
    }
  };

  const fetchHistorial = async () => {
    try {
      const q = query(collection(db, 'historial'), orderBy('fecha', 'desc'), limit(100));
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistorial(logs);
    } catch (err) {
      console.error('Error fetching historial:', err);
    }
  };

  const fetchNotes = async () => {
    try {
      const q = query(collection(db, 'notas'), orderBy('fecha', 'desc'), limit(50));
      const querySnapshot = await getDocs(q);
      const notesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotes(notesData);
    } catch (err) {
      console.error('Error fetching notes:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setShowLoginModal(false);
      setSuccess('Sesión iniciada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error en login: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('dashboard');
      setSuccess('Sesión cerrada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error en logout:', err);
    }
  };

  const handleNavigateToModule = (moduleId) => {
    if (moduleId === 'bar') {
      setCurrentView('bar');
    } else if (moduleId === 'users' && userRole === 'admin') {
      setShowUserModal(true);
    } else {
      setError(`El módulo ${moduleId} estará disponible próximamente`);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSearchTerm('');
    setLicorFilter('');
    setShowLowStockOnly(false);
  };

  const handleDownloadCSV = () => {
    const dataToExport = filteredInventory.map(item => ({
      Nombre: item.nombre,
      Marca: item.marca || 'N/A',
      Tipo: item.tipo,
      SubTipo: item.subTipo || 'N/A',
      Origen: item.origen || 'N/A',
      Stock: item.stock,
      Umbral: item.umbral_low,
      Precio: item.precio || 0,
      Proveedor: getProviderName(item.proveedor_id),
      Estado: Number(item.stock) <= Number(item.umbral_low) ? 'STOCK BAJO' : 'OK'
    }));
    downloadCSV(dataToExport);
    setSuccess('CSV descargado correctamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDownloadPDF = () => {
    const filters = {
      search: searchTerm,
      lowStock: showLowStockOnly,
      tipo: licorFilter
    };
    exportInventoryToPDF(filteredInventory, filters);
    setSuccess('PDF generado correctamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleLowStockPDF = () => {
    const lowStockItems = inventory.filter(item => 
      Number(item.stock) <= Number(item.umbral_low)
    ).map(item => ({
      ...item,
      proveedor_nombre: getProviderName(item.proveedor_id)
    }));
    
    if (lowStockItems.length === 0) {
      setError('No hay productos con stock bajo para exportar');
      setTimeout(() => setError(''), 3000);
      return;
    }
    
    exportLowStockToPDF(lowStockItems);
    setSuccess('Reporte de stock bajo generado');
    setTimeout(() => setSuccess(''), 3000);
  };

  const getProviderName = (providerId) => {
    const provider = providers.find(p => p.id === providerId);
    return provider ? provider.nombre : 'Sin proveedor';
  };

  const sendLowStockEmail = async () => {
    const recipientEmail = prompt('Por favor, ingrese el correo del destinatario:', '');
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      setError('Por favor, ingrese un correo válido.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const functions = getFunctions();
      const sendEmail = httpsCallable(functions, 'sendLowStockEmail');
      const lowStockItems = inventory.filter(item => Number(item.stock) <= Number(item.umbral_low));
      
      if (lowStockItems.length === 0) {
        setError('No hay productos con stock bajo para notificar');
        setTimeout(() => setError(''), 3000);
        return;
      }

      await sendEmail({
        inventory: lowStockItems,
        recipientEmail: recipientEmail,
        fromEmail: user.email
      });
      setSuccess('Email enviado con éxito a ' + recipientEmail);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error enviando email:', err);
      setError('Error enviando email: ' + err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) {
      setError('Por favor, ingrese un mensaje.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    try {
      await addDoc(collection(db, 'notas'), {
        texto: newNote,
        usuario: user.email,
        fecha: serverTimestamp()
      });
      setNewNote('');
      fetchNotes();
      setSuccess('Mensaje enviado');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Error al enviar el mensaje');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleMarkAsRead = (noteId) => {
    setUnreadNotes(prev => {
      const newUnread = new Set(prev);
      newUnread.delete(noteId);
      return newUnread;
    });
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleFormSuccess = () => {
    fetchInventory();
    fetchHistorial();
    setEditingItem(null);
    setShowAddForm(false);
    setSuccess('Operación completada exitosamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredInventory = inventory.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      item.nombre.toLowerCase().includes(searchLower) ||
      (item.marca && item.marca.toLowerCase().includes(searchLower)) ||
      (item.tipo && item.tipo.toLowerCase().includes(searchLower));
    
    const matchesLowStock = !showLowStockOnly || 
      (Number(item.stock) <= Number(item.umbral_low));
    
    const matchesTypeFilter = !licorFilter || item.tipo === licorFilter;
    
    return matchesSearch && matchesLowStock && matchesTypeFilter;
  });

  const inventoryStats = {
    total: inventory.length,
    lowStock: inventory.filter(item => Number(item.stock) <= Number(item.umbral_low)).length,
    criticalStock: inventory.filter(item => Number(item.stock) === 0).length,
    totalValue: inventory.reduce((sum, item) => sum + (Number(item.stock) * Number(item.precio || 0)), 0)
  };

  const lowStockData = {
    labels: ['Stock Bajo', 'Stock Saludable'],
    datasets: [
      {
        data: [inventoryStats.lowStock, inventoryStats.total - inventoryStats.lowStock],
        backgroundColor: ['rgba(255, 107, 107, 0.8)', '#87CEEB'],
        borderColor: ['#FF6B6B', '#87CEEB'],
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  const getRoleDisplay = () => {
    if (!userRole) return null;
    
    const roleNames = {
      admin: 'Administrador',
      manager: 'Gerente',
      bartender: 'Bartender',
      waiter: 'Mesero'
    };

    const badgeClass = userRole === 'admin' ? 'admin-badge' : 
                      userRole === 'manager' ? 'manager-badge' : 
                      'bg-secondary';

    return (
      <Badge className={badgeClass} style={{ fontSize: '0.75em' }}>
        {roleNames[userRole] || userRole}
      </Badge>
    );
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  if (roleLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="container" style={{ background: '#F5F5F5', color: '#333333', minHeight: '100vh', padding: '20px', position: 'relative', overflow: 'hidden' }}>
        {/* Alertas globales */}
        {error && (
          <Alert variant="danger" className="position-fixed" style={{ top: '20px', right: '20px', zIndex: 9999 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" className="position-fixed" style={{ top: '20px', right: '20px', zIndex: 9999 }}>
            {success}
          </Alert>
        )}

        <Navbar bg="transparent" variant="dark" expand="lg" className="mb-4 rounded glass">
          <Navbar.Brand onClick={handleBackToDashboard} style={{ 
            fontFamily: 'Raleway, sans-serif', 
            fontSize: '28px', 
            color: '#333333', 
            textShadow: '0 0 2px #87CEEB',
            cursor: 'pointer'
          }}>
            <FaHome className="me-2" />
            Baires Restaurant
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link onClick={handleBackToDashboard} style={{ color: '#333333', fontSize: '16px' }}>
                <FaHome className="me-1" />
                Dashboard
              </Nav.Link>
              {currentView === 'bar' && (
                <Nav.Link as={Link} to="/historial" style={{ color: '#333333', fontSize: '16px' }}>
                  Historial
                </Nav.Link>
              )}
            </Nav>
            <Nav>
              {user && (
                <>
                  <Navbar.Text className="me-3" style={{ color: '#333333' }}>
                    {user.email} {getRoleDisplay()}
                  </Navbar.Text>
                  {canManageUsers && (
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={() => setShowUserModal(true)}
                      className="me-2"
                    >
                      <FaUsers /> Usuarios
                    </Button>
                  )}
                  {canManageProviders && (
                    <Button 
                      variant="outline-info" 
                      size="sm" 
                      onClick={() => setShowProviderModal(true)}
                      className="me-2"
                    >
                      <FaBuilding /> Proveedores
                    </Button>
                  )}
                  <Button variant="outline-primary" onClick={handleLogout} className="hover-3d">
                    Logout
                  </Button>
                </>
              )}
              {!user && (
                <Button variant="outline-primary" onClick={() => setShowLoginModal(true)} className="hover-3d">
                  Login
                </Button>
              )}
            </Nav>
          </Navbar.Collapse>
        </Navbar>

        {/* Contenido principal */}
        {currentView === 'dashboard' ? (
          <MainDashboard
            inventory={inventory}
            providers={providers}
            historial={historial}
            notes={notes}
            user={user}
            userRole={userRole}
            onNavigateToModule={handleNavigateToModule}
          />
        ) : currentView === 'bar' ? (
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
                      <i className="bi bi-arrow-left me-2"></i>
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
                  <Button 
                    variant="primary" 
                    onClick={() => setShowAddForm(true)}
                    style={{ background: '#F59E0B', borderColor: '#F59E0B' }}
                  >
                    <FaPlus className="me-2" />
                    {canEditAllFields ? 'Agregar Producto' : 'Ver Producto'}
                  </Button>
                </div>

                {/* Estadísticas con gradientes */}
                <Row className="mb-4">
                  <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}>
                      <Card.Body className="text-center">
                        <i className="bi bi-box-seam" style={{ fontSize: '2.5rem', opacity: 0.8 }}></i>
                        <h2 className="mb-1 fw-bold">{inventoryStats.total}</h2>
                        <p className="mb-0 opacity-90">Productos</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ 
                      background: inventoryStats.lowStock > 0 
                        ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)'
                        : 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                      color: 'white'
                    }}>
                      <Card.Body className="text-center">
                        <h2 className="mb-1 fw-bold">{inventoryStats.lowStock}</h2>
                        <p className="mb-0 opacity-90">Stock Bajo</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ 
                      background: inventoryStats.criticalStock > 0
                        ? 'linear-gradient(135deg, #FF6B6B 0%, #DC3545 100%)'
                        : 'linear-gradient(135deg, #96CEB4 0%, #4ECDC4 100%)',
                      color: 'white'
                    }}>
                      <Card.Body className="text-center">
                        <i className="bi bi-x-circle" style={{ fontSize: '2.5rem', opacity: 0.8 }}></i>
                        <h2 className="mb-1 fw-bold">{inventoryStats.criticalStock}</h2>
                        <p className="mb-0 opacity-90">Sin Stock</p>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={3}>
                    <Card className="border-0 shadow-sm h-100" style={{ 
                      background: 'linear-gradient(135deg, #ffa726 0%, #ff7043 100%)',
                      color: 'white'
                    }}>
                      <Card.Body className="text-center">
                        <i className="bi bi-currency-dollar" style={{ fontSize: '2.5rem', opacity: 0.8 }}></i>
                        <h2 className="mb-1 fw-bold" style={{ fontSize: '1.5rem' }}>
                          ${inventoryStats.totalValue.toLocaleString('es-AR')}
                        </h2>
                        <p className="mb-0 opacity-90">Valor Total</p>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Panel de controles modernizado */}
                <Card className="border-0 shadow-sm mb-4">
                  <Card.Body>
                    <Row className="align-items-center">
                      <Col md={6}>
                        <div className="position-relative">
                          <i className="bi bi-search position-absolute" style={{ 
                            left: '15px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            color: '#6c757d'
                          }}></i>
                          <Form.Control
                            type="text"
                            placeholder="Buscar productos, marcas o tipos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ 
                              paddingLeft: '45px',
                              borderRadius: '25px',
                              height: '50px'
                            }}
                          />
                        </div>
                      </Col>
                      <Col md={6}>
                        <div className="d-flex gap-2 justify-content-end">
                          <Button
                            variant={showLowStockOnly ? 'warning' : 'outline-warning'}
                            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
                          >
                            <FaFilter className="me-2" />
                            {showLowStockOnly ? 'Ver Todo' : 'Stock Bajo'}
                          </Button>
                          
                          <Dropdown>
                            <Dropdown.Toggle variant="outline-secondary">
                              <i className="bi bi-funnel me-2"></i>
                              Tipo
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={() => setLicorFilter('')}>
                                Todos
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={() => setLicorFilter('licor')}>
                                Licores
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => setLicorFilter('vino')}>
                                Vinos
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => setLicorFilter('cerveza')}>
                                Cervezas
                              </Dropdown.Item>
                              <Dropdown.Item onClick={() => setLicorFilter('otros')}>
                                Otros
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>

                          <Dropdown>
                            <Dropdown.Toggle variant="outline-primary">
                              <FaDownload className="me-2" />
                              Exportar
                            </Dropdown.Toggle>
                            <Dropdown.Menu>
                              <Dropdown.Item onClick={handleDownloadCSV}>
                                Exportar CSV
                              </Dropdown.Item>
                              <Dropdown.Item onClick={handleDownloadPDF}>
                                Exportar PDF
                              </Dropdown.Item>
                              <Dropdown.Divider />
                              <Dropdown.Item onClick={handleLowStockPDF}>
                                Reporte Stock Bajo
                              </Dropdown.Item>
                              <Dropdown.Item onClick={sendLowStockEmail}>
                                Enviar Pedido
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>

                {/* Grid de productos rediseñado */}
                <Row>
                  {filteredInventory.length === 0 ? (
                    <Col>
                      <Card className="border-0 shadow-sm text-center py-5">
                        <Card.Body>
                          <i className="bi bi-search" style={{ fontSize: '4rem', color: '#e9ecef' }}></i>
                          <h4 className="text-muted mb-3">No se encontraron productos</h4>
                          <p className="text-muted">
                            {searchTerm ? 'Intenta con otros términos' : 'No hay productos que coincidan'}
                          </p>
                        </Card.Body>
                      </Card>
                    </Col>
                  ) : (
                    filteredInventory.map(item => {
                      const isLowStock = Number(item.stock) <= Number(item.umbral_low);
                      const isCriticalStock = Number(item.stock) === 0;
                      const stockPercentage = Math.min((item.stock / (item.umbral_low * 2)) * 100, 100);

                      return (
                        <Col key={item.id} md={6} lg={4} xl={3} className="mb-4">
                          <Card className="border-0 shadow-sm h-100">
                            <Card.Body>
                              <div className="d-flex justify-content-between align-items-start mb-3">
                                <h6 className="fw-bold mb-0">{item.nombre}</h6>
                                {(isCriticalStock || isLowStock) && (
                                  <Badge bg={isCriticalStock ? 'danger' : 'warning'} className="ms-2">
                                    {isCriticalStock ? 'SIN STOCK' : 'BAJO'}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="mb-3">
                                <Badge bg="light" text="dark" className="text-capitalize mb-2">
                                  {item.tipo}
                                </Badge>
                                {item.precio && (
                                  <div className="text-success fw-bold">
                                    ${Number(item.precio).toFixed(2)}
                                  </div>
                                )}
                              </div>

                              <div className="mb-3">
                                <div className="d-flex justify-content-between mb-1">
                                  <small>Stock: {Number(item.stock).toFixed(1)}</small>
                                  <small>Umbral: {Number(item.umbral_low).toFixed(1)}</small>
                                </div>
                                <div style={{ 
                                  background: '#f8f9fa', 
                                  height: '6px', 
                                  borderRadius: '3px',
                                  overflow: 'hidden'
                                }}>
                                  <div style={{ 
                                    width: `${Math.max(stockPercentage, 5)}%`,
                                    height: '100%', 
                                    background: isCriticalStock ? '#dc3545' : isLowStock ? '#ffc107' : '#28a745',
                                    borderRadius: '3px'
                                  }}></div>
                                </div>
                              </div>

                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                className="w-100"
                              >
                                <FaEdit className="me-1" />
                                {canEditAllFields ? 'Editar' : 'Ver'}
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      );
                    })
                  )}
                </Row>

                {/* Gráficos */}
                {inventory.length > 0 && (
                  <Row className="mt-5">
                    <Col md={6}>
                      <Card className="border-0 shadow-sm">
                        <Card.Header>
                          <h6>Estado del Inventario</h6>
                        </Card.Header>
                        <Card.Body>
                          <Pie data={lowStockData} />
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={6}>
                      <Card className="border-0 shadow-sm">
                        <Card.Header>
                          <h6>Resumen por Categoría</h6>
                        </Card.Header>
                        <Card.Body>
                          {['licor', 'vino', 'cerveza', 'otros'].map(tipo => {
                            const count = inventory.filter(item => item.tipo === tipo).length;
                            if (count === 0) return null;
                            return (
                              <div key={tipo} className="d-flex justify-content-between mb-2">
                                <span className="text-capitalize">{tipo}</span>
                                <Badge bg="primary">{count}</Badge>
                              </div>
                            );
                          })}
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                )}
              </div>
            } />

            <Route path="/historial" element={
              <div>
                <Button onClick={handleBackToDashboard} className="mb-3">
                  Volver al Dashboard
                </Button>
                <h2>Historial de Movimientos</h2>
              </div>
            } />
          </Routes>
        ) : null}

        {/* Chat button */}
        {user && (
          <Button
            className="position-fixed"
            style={{ 
              bottom: '20px', 
              right: '20px', 
              borderRadius: '50%',
              width: '60px',
              height: '60px',
              background: '#87CEEB'
            }}
            onClick={toggleChat}
          >
            <i className="bi bi-chat-fill"></i>
            {unreadNotes.size > 0 && (
              <Badge bg="danger" className="position-absolute" style={{ top: '-5px', right: '-5px' }}>
                {unreadNotes.size}
              </Badge>
            )}
          </Button>
        )}

        {/* Chat Modal */}
        <Modal show={showChat} onHide={() => setShowChat(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Chat Interno</Modal.Title>
          </Modal.Header>
          <Modal.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notes.length === 0 ? (
              <div className="text-center text-muted">
                <p>No hay mensajes aún</p>
              </div>
            ) : (
              notes.map(note => (
                <div key={note.id} className="mb-3 p-3 rounded bg-light">
                  <div className="d-flex justify-content-between">
                    <strong>{note.usuario.split('@')[0]}</strong>
                    <small className="text-muted">
                      {note.fecha?.toDate().toLocaleString('es-AR')}
                    </small>
                  </div>
                  <p className="mb-0">{note.texto}</p>
                </div>
              ))
            )}
          </Modal.Body>
          <Modal.Footer>
            <Form onSubmit={addNote} className="w-100">
              <div className="d-flex gap-2">
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Escribe un mensaje..."
                />
                <Button type="submit" disabled={!newNote.trim()}>
                  Enviar
                </Button>
              </div>
            </Form>
          </Modal.Footer>
        </Modal>

        {/* Login Modal */}
        <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Iniciar Sesión</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleLogin}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowLoginModal(false)}>
                Cancelar
              </Button>
              <Button variant="primary" type="submit">
                Iniciar Sesión
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Modales de gestión */}
        <InventoryItemForm
          show={showAddForm}
          onHide={() => {
            setShowAddForm(false);
            setEditingItem(null);
          }}
          item={editingItem}
          userRole={userRole}
          user={user}
          onSuccess={handleFormSuccess}
          providers={providers}
        />

        <ProviderManagement
          show={showProviderModal}
          onHide={() => setShowProviderModal(false)}
          user={user}
          userRole={userRole}
        />

        <UserManagement
          show={showUserModal}
          onHide={() => setShowUserModal(false)}
          user={user}
          userRole={userRole}
        />

        {/* Footer */}
        <footer className="text-center mt-5 py-3">
          <small>&copy; 2025 Wilfred Del Pozo Diaz. Todos los derechos reservados.</small>
        </footer>
      </div>
    </Router>
  );
}

export default App;