// src/App.js - VERSIÓN COMPLETA Y CORREGIDA
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
  FaArrowLeft
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

// Local imports
import { auth, db } from './firebase';
import InventoryItemForm from './components/InventoryItemForm';
import UserManagement from './components/UserManagement';
import ProviderManagement from './components/ProviderManagement';
import KitchenInventory from './components/KitchenInventory';
import ShiftManagement from './components/ShiftManagement';

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
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');

  // Estados de modales
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // Estados de formularios
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [newNote, setNewNote] = useState('');

  // Estados de filtros y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [licorFilter, setLicorFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Estados de alertas
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [unreadNotes, setUnreadNotes] = useState(new Set());

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

  // Cargar datos en tiempo real
  useEffect(() => {
    if (user) {
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
        },
        (error) => {
          console.error('Error loading providers:', error);
        }
      );

      // Historial listener
      const unsubscribeHistorial = onSnapshot(
        query(collection(db, 'historial'), orderBy('fecha', 'desc')),
        (snapshot) => {
          const historialData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setHistorial(historialData);
        },
        (error) => {
          console.error('Error loading historial:', error);
        }
      );

      // Notes listener
      const unsubscribeNotes = onSnapshot(
        query(collection(db, 'notas'), orderBy('fecha', 'desc')),
        (snapshot) => {
          const notesData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setNotes(notesData);
          
          // Marcar notas como no leídas (simplificado)
          const newUnread = new Set(notesData.slice(0, 3).map(note => note.id));
          setUnreadNotes(newUnread);
        },
        (error) => {
          console.error('Error loading notes:', error);
        }
      );

      return () => {
        unsubscribeInventory();
        unsubscribeProviders();
        unsubscribeHistorial();
        unsubscribeNotes();
      };
    }
  }, [user]);

  // Funciones de autenticación
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setShowLoginModal(false);
      setSuccess('Sesión iniciada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error en login: ' + err.message);
      setTimeout(() => setError(''), 5000);
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
      setError('Error al cerrar sesión');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Funciones de navegación
  const handleNavigateToModule = (moduleId) => {
    setError('');
    setSuccess('');
    
    if (moduleId === 'bar') {
      setCurrentView('bar');
    } else if (moduleId === 'kitchen') {
      setCurrentView('kitchen');
    } else if (moduleId === 'staff') {
      setCurrentView('shifts');
    } else if (moduleId === 'users' && userRole === 'admin') {
      setShowUserModal(true);
    } else if (moduleId === 'users') {
      setError('Solo los administradores pueden gestionar usuarios');
      setTimeout(() => setError(''), 3000);
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
    setError('');
    setSuccess('');
  };

  // Funciones de inventario
  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleFormSuccess = () => {
    setEditingItem(null);
    setShowAddForm(false);
    setSuccess('Operación completada exitosamente');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Funciones de chat
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
      setSuccess('Mensaje enviado');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Error adding note:', err);
      setError('Error al enviar el mensaje');
      setTimeout(() => setError(''), 3000);
    }
  };

  const toggleChat = () => {
    setShowChat(!showChat);
  };

  // Funciones de exportación
  const handleDownloadCSV = () => {
    try {
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
        Estado: Number(item.stock) <= Number(item.umbral_low) ? 'Stock Bajo' : 'Normal'
      }));

      const csvContent = [
        Object.keys(dataToExport[0]).join(','),
        ...dataToExport.map(row => Object.values(row).map(val => 
          typeof val === 'string' && val.includes(',') ? `"${val}"` : val
        ).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventario_baires_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccess('CSV descargado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error generating CSV:', err);
      setError('Error al generar CSV');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDownloadPDF = () => {
    try {
      exportInventoryToPDF(filteredInventory, providers);
      setSuccess('PDF generado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Error al generar PDF: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Funciones auxiliares
  const getProviderName = (providerId) => {
    if (!providerId) return 'Sin proveedor';
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
      const lowStockItems = inventory.filter(item => Number(item.stock) <= Number(item.umbral_low));
      
      if (lowStockItems.length === 0) {
        setError('No hay productos con stock bajo para notificar.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      const emailData = {
        inventory: lowStockItems.map(item => ({
          id: item.id,
          nombre: item.nombre,
          tipo: item.tipo,
          stock: Number(item.stock),
          umbral_low: Number(item.umbral_low),
          diferencia: Number(item.umbral_low) - Number(item.stock),
          proveedor: getProviderName(item.proveedor_id)
        })),
        recipientEmail: recipientEmail,
        fromEmail: user.email,
        timestamp: new Date().toISOString(),
        totalItems: lowStockItems.length
      };

      const functions = getFunctions();
      const sendEmail = httpsCallable(functions, 'sendLowStockEmail');
      
      setSuccess('Enviando email... Por favor espera.');
      
      await sendEmail(emailData);
      
      setSuccess(`Email enviado exitosamente a ${recipientEmail}`);
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('Error enviando email:', err);
      let errorMessage = 'Error enviando email: ';
      
      if (err.code === 'functions/not-found') {
        errorMessage += 'Cloud Function no encontrada.';
      } else if (err.code === 'functions/permission-denied') {
        errorMessage += 'Sin permisos para ejecutar la función.';
      } else if (err.code === 'functions/internal') {
        errorMessage += 'Error interno del servidor.';
      } else {
        errorMessage += err.message || 'Error desconocido';
      }
      
      setError(errorMessage);
      setTimeout(() => setError(''), 10000);
    }
  };

  // Filtros y estadísticas
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

  // Permisos por rol
  const canEditAllFields = userRole === 'admin' || userRole === 'manager';
  const canManageUsers = userRole === 'admin';
  const canManageProviders = userRole === 'admin';

  const getRoleDisplay = () => {
    if (!userRole) return null;
    
    const roleNames = {
      admin: 'Administrador',
      manager: 'Gerente',
      bartender: 'Bartender',
      waiter: 'Mesero'
    };

    const badgeClass = userRole === 'admin' ? 'admin-badge' : 
                      userRole === 'manager' ? 'manager-badge' : 'secondary';

    return (
      <Badge className={badgeClass} style={{ fontSize: '0.75rem' }}>
        {roleNames[userRole] || userRole}
      </Badge>
    );
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
        id: 'staff',
        title: 'Personal / Horarios',
        icon: FaCalendarAlt,
        description: 'Gestión de turnos y personal estilo ShiftNotes',
        color: '#10B981',
        colorDark: '#059669',
        stats: 'ShiftNotes Style',
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
                      borderRadius: '20px',
                      border: 'none',
                      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                      color: 'white',
                      overflow: 'hidden',
                      position: 'relative',
                      minHeight: '200px'
                    }}
                    onClick={() => module.available && handleNavigateToModule(module.id)}
                  >
                    <div 
                      style={{
                        position: 'absolute',
                        top: '-20px',
                        right: '-20px',
                        width: '100px',
                        height: '100px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%'
                      }}
                    />
                    <Card.Body className="text-center position-relative" style={{ padding: '2rem' }}>
                      <IconComponent 
                        size={48} 
                        className="mb-3"
                        style={{ 
                          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))'
                        }}
                      />
                      <h5 className="mb-2" style={{ fontWeight: '700', textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}>
                        {module.title}
                      </h5>
                      <p className="mb-3" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        {module.description}
                      </p>
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

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <Spinner animation="border" role="status" style={{ color: '#10B981' }}>
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <div style={{
          minHeight: '100vh',
          background: currentView === 'dashboard' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : currentView === 'shifts'
            ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
            : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          paddingTop: '20px',
          paddingBottom: '20px'
        }}>
          <Container fluid>
            {/* Navbar */}
            <Navbar expand="lg" className="mb-4" style={{ 
              background: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(10px)',
              borderRadius: '15px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}>
              <Container>
                <Navbar.Brand href="#" style={{ 
                  fontFamily: 'Raleway, sans-serif', 
                  fontWeight: 'bold',
                  color: '#333333'
                }}>
                  Baires Restaurant
                </Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                  <Nav className="ms-auto">
                    {user && (
                      <>
                        <Nav.Item className="d-flex align-items-center me-3">
                          <span className="me-2">{user.email.split('@')[0]}</span>
                          {getRoleDisplay()}
                        </Nav.Item>
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
              </Container>
            </Navbar>

            {/* Alertas globales */}
            {error && <Alert variant="danger" className="mb-3" dismissible onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert variant="success" className="mb-3" dismissible onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Contenido principal */}
            {!user ? (
              // Vista de login cuando no hay usuario autenticado
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
            ) : currentView === 'dashboard' ? (
              // Dashboard principal
              <MainDashboard />
            ) : currentView === 'shifts' ? (
              // Módulo de horarios
              <div className="shift-management">
                <ShiftManagement 
                  user={user}
                  userRole={userRole}
                  onBack={handleBackToDashboard}
                />
              </div>
            ) : currentView === 'bar' ? (
              // Módulo de bar
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
                        {canEditAllFields && (
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

                    {/* Filtros y controles del bar */}
                    <Card className="mb-4" style={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '15px' }}>
                      <Card.Body>
                        <Row>
                          <Col md={4}>
                            <InputGroup>
                              <InputGroup.Text><FaSearch /></InputGroup.Text>
                              <Form.Control
                                type="text"
                                placeholder="Buscar productos..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                              />
                            </InputGroup>
                          </Col>
                          <Col md={3}>
                            <Form.Select
                              value={licorFilter}
                              onChange={(e) => setLicorFilter(e.target.value)}
                            >
                              <option value="">Todos los tipos</option>
                              <option value="licor">Licores</option>
                              <option value="vino">Vinos</option>
                              <option value="cerveza">Cervezas</option>
                              <option value="otros">Otros</option>
                            </Form.Select>
                          </Col>
                          <Col md={2}>
                            <Form.Check
                              type="switch"
                              id="low-stock-switch"
                              label="Solo stock bajo"
                              checked={showLowStockOnly}
                              onChange={(e) => setShowLowStockOnly(e.target.checked)}
                            />
                          </Col>
                          <Col md={3}>
                            <div className="d-flex gap-2">
                              <Button variant="outline-success" size="sm" onClick={handleDownloadCSV}>
                                <FaDownload /> CSV
                              </Button>
                              <Button variant="outline-danger" size="sm" onClick={handleDownloadPDF}>
                                <FaDownload /> PDF
                              </Button>
                              <Button variant="outline-warning" size="sm" onClick={sendLowStockEmail}>
                                <FaEnvelope /> Alertas
                              </Button>
                            </div>
                          </Col>
                        </Row>
                      </Card.Body>
                    </Card>

                    {/* Estadísticas del inventario */}
                    <Row className="mb-4">
                      <Col md={3}>
                        <Card className="text-center border-0 shadow-sm">
                          <Card.Body>
                            <h3 className="text-primary">{inventoryStats.total}</h3>
                            <p className="text-muted mb-0">Total Productos</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="text-center border-0 shadow-sm">
                          <Card.Body>
                            <h3 className="text-warning">{inventoryStats.lowStock}</h3>
                            <p className="text-muted mb-0">Stock Bajo</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="text-center border-0 shadow-sm">
                          <Card.Body>
                            <h3 className="text-danger">{inventoryStats.criticalStock}</h3>
                            <p className="text-muted mb-0">Sin Stock</p>
                          </Card.Body>
                        </Card>
                      </Col>
                      <Col md={3}>
                        <Card className="text-center border-0 shadow-sm">
                          <Card.Body>
                            <h3 className="text-success">${inventoryStats.totalValue.toFixed(2)}</h3>
                            <p className="text-muted mb-0">Valor Total</p>
                          </Card.Body>
                        </Card>
                      </Col>
                    </Row>

                    {/* Grid de productos */}
                    <Row>
                      {filteredInventory.length === 0 ? (
                        <Col>
                          <Card className="text-center p-5">
                            <Card.Body>
                              <h5>No se encontraron productos</h5>
                              <p className="text-muted">Ajusta los filtros o agrega nuevos productos al inventario</p>
                            </Card.Body>
                          </Card>
                        </Col>
                      ) : (
                        filteredInventory.map(item => {
                          const isLowStock = Number(item.stock) <= Number(item.umbral_low);
                          const isOutOfStock = Number(item.stock) === 0;
                          
                          return (
                            <Col key={item.id} lg={4} md={6} className="mb-3">
                              <Card className={`inventory-card h-100 ${isLowStock ? 'border-warning' : ''}`}>
                                <Card.Body>
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <h6 className="card-title mb-0">{item.nombre}</h6>
                                    {isOutOfStock ? (
                                      <Badge bg="danger">Sin Stock</Badge>
                                    ) : isLowStock ? (
                                      <Badge bg="warning">Stock Bajo</Badge>
                                    ) : (
                                      <Badge bg="success">Normal</Badge>
                                    )}
                                  </div>
                                  
                                  <div className="mb-2">
                                    <small className="text-muted">
                                      {item.marca && <span className="me-2"><strong>Marca:</strong> {item.marca}</span>}
                                      <span><strong>Tipo:</strong> {item.tipo}</span>
                                    </small>
                                  </div>
                                  
                                  <div className="mb-2">
                                    <div className="d-flex justify-content-between">
                                      <span><strong>Stock:</strong> {item.stock}</span>
                                      <span><strong>Umbral:</strong> {item.umbral_low}</span>
                                    </div>
                                    
                                    <div className="progress mt-1" style={{ height: '5px' }}>
                                      <div 
                                        className={`progress-bar ${isLowStock ? 'bg-warning' : 'bg-success'}`}
                                        role="progressbar" 
                                        style={{ 
                                          width: `${Math.min((Number(item.stock) / Number(item.umbral_low)) * 100, 100)}%` 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                  
                                  {item.precio && (
                                    <div className="mb-2">
                                      <small className="text-muted">
                                        <strong>Precio:</strong> ${Number(item.precio).toFixed(2)}
                                      </small>
                                    </div>
                                  )}
                                  
                                  <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-muted">
                                      {getProviderName(item.proveedor_id)}
                                    </small>
                                    <Button 
                                      variant={canEditAllFields ? "primary" : "outline-primary"}
                                      size="sm"
                                      onClick={() => handleEditItem(item)}
                                    >
                                      <FaEdit className="me-1" />
                                      {canEditAllFields ? 'Editar' : 'Ver'}
                                    </Button>
                                  </div>
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
                      <FaArrowLeft className="me-2" />
                      Volver al Dashboard
                    </Button>
                    <h2>Historial de Movimientos</h2>
                    <Card>
                      <Card.Body>
                        <Table striped hover>
                          <thead>
                            <tr>
                              <th>Fecha</th>
                              <th>Producto</th>
                              <th>Acción</th>
                              <th>Cantidad</th>
                              <th>Usuario</th>
                            </tr>
                          </thead>
                          <tbody>
                            {historial.map(entry => (
                              <tr key={entry.id}>
                                <td>{entry.fecha?.toDate().toLocaleDateString('es-AR')}</td>
                                <td>{entry.producto}</td>
                                <td>
                                  <Badge bg={entry.accion === 'agregado' ? 'success' : 
                                            entry.accion === 'editado' ? 'warning' : 'danger'}>
                                    {entry.accion}
                                  </Badge>
                                </td>
                                <td>{entry.cantidad}</td>
                                <td>{entry.usuario}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </Card.Body>
                    </Card>
                  </div>
                } />
              </Routes>

            ) : currentView === 'kitchen' ? (
              // Módulo de cocina
              <div>
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
                      <FaUtensils className="me-3" style={{ color: '#EF4444' }} />
                      Inventario de Cocina
                    </h2>
                  </div>
                </div>

                <KitchenInventory />
              </div>

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
                  background: '#87CEEB',
                  border: 'none',
                  zIndex: 1050
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
          </Container>
        </div>

        {/* Modales */}
        {/* Chat Modal */}
        <Modal show={showChat} onHide={() => setShowChat(false)} size="lg">
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
        <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
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
                  placeholder="usuario@ejemplo.com"
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Contraseña"
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

        {/* Add Item Modal */}
        {showAddForm && (
          <InventoryItemForm
            show={showAddForm}
            onHide={() => setShowAddForm(false)}
            editingItem={editingItem}
            providers={providers}
            user={user}
            userRole={userRole}
            onSuccess={handleFormSuccess}
          />
        )}

        {/* User Management Modal */}
        {showUserModal && (
          <UserManagement
            show={showUserModal}
            onHide={() => setShowUserModal(false)}
            user={user}
            userRole={userRole}
          />
        )}

        {/* Provider Management Modal */}
        {showProviderModal && (
          <ProviderManagement
            show={showProviderModal}
            onHide={() => setShowProviderModal(false)}
            user={user}
            userRole={userRole}
          />
        )}

        {/* Estilos adicionales */}
        <style jsx>{`
          .navbar-toggler-icon {
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='%23000000' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e") !important;
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
          .hover-3d {
            transition: all 0.2s ease;
          }
          .hover-3d:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          }
          .inventory-card {
            transition: all 0.2s ease;
            border-radius: 15px;
          }
          .inventory-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          }
          .shift-management {
            animation: fadeIn 0.3s ease-in;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </Router>
  );
}

export default App;