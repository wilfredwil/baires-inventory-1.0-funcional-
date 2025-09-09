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
import { FaPlus, FaDownload, FaFilePdf, FaUsers, FaBuilding, FaFilter, FaEdit } from 'react-icons/fa';
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
    `}</style>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
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

  // Custom hook para roles
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
      setSuccess('Sesión cerrada correctamente');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error en logout:', err);
    }
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

  // Filtros aplicados
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

  // Estadísticas del inventario
  const inventoryStats = {
    total: inventory.length,
    lowStock: inventory.filter(item => Number(item.stock) <= Number(item.umbral_low)).length,
    criticalStock: inventory.filter(item => Number(item.stock) === 0).length,
    totalValue: inventory.reduce((sum, item) => sum + (Number(item.stock) * Number(item.precio || 0)), 0)
  };

  // Datos para gráficos
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
          <Navbar.Brand as={Link} to="/" style={{ fontFamily: 'Raleway, sans-serif', fontSize: '28px', color: '#333333', textShadow: '0 0 2px #87CEEB' }}>
            Baires Inventory
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={Link} to="/" style={{ color: '#333333', fontSize: '16px' }}>
                Dashboard
              </Nav.Link>
              <Nav.Link as={Link} to="/historial" style={{ color: '#333333', fontSize: '16px' }}>
                Historial
              </Nav.Link>
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

        <Routes>
          <Route path="/" element={
            <div>
              <h3 className="text-center mb-4" style={{ color: '#333333', fontFamily: 'Raleway, sans-serif', textTransform: 'uppercase', letterSpacing: '2px', fontSize: '24px', textShadow: '0 0 5px #87CEEB' }}>
                Gestión de Inventario
              </h3>

              {/* Estadísticas rápidas */}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="glass hover-3d text-center">
                    <Card.Body>
                      <h5 style={{ color: '#87CEEB' }}>{inventoryStats.total}</h5>
                      <small>Total Productos</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d text-center">
                    <Card.Body>
                      <h5 style={{ color: inventoryStats.lowStock > 0 ? '#FF6B6B' : '#28a745' }}>
                        {inventoryStats.lowStock}
                      </h5>
                      <small>Stock Bajo</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d text-center">
                    <Card.Body>
                      <h5 style={{ color: inventoryStats.criticalStock > 0 ? '#DC3545' : '#28a745' }}>
                        {inventoryStats.criticalStock}
                      </h5>
                      <small>Sin Stock</small>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d text-center">
                    <Card.Body>
                      <h5 style={{ color: '#87CEEB' }}>
                        ${inventoryStats.totalValue.toLocaleString('es-AR')}
                      </h5>
                      <small>Valor Total</small>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>

              {/* Controles principales */}
              <Row className="mb-4">
                <Col md={2}>
                  <Card className="glass hover-3d text-center" style={{ cursor: 'pointer' }} onClick={() => setShowAddForm(true)}>
                    <Card.Body>
                      <FaPlus style={{ fontSize: '24px', color: '#87CEEB' }} />
                      <Card.Text style={{ fontSize: '12px' }}>
                        {canEditAllFields ? 'Agregar Ítem' : 'Ver Ítem'}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Dropdown>
                    <Dropdown.Toggle as={Card} className="glass hover-3d text-center" style={{ cursor: 'pointer', border: 'none' }}>
                      <Card.Body>
                        <FaDownload style={{ fontSize: '24px', color: '#87CEEB' }} />
                        <Card.Text style={{ fontSize: '12px' }}>Exportar</Card.Text>
                      </Card.Body>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={handleDownloadCSV}>
                        <i className="bi bi-filetype-csv me-2"></i>Exportar CSV
                      </Dropdown.Item>
                      <Dropdown.Item onClick={handleDownloadPDF}>
                        <FaFilePdf className="me-2" />Exportar PDF
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={handleLowStockPDF}>
                        <i className="bi bi-exclamation-triangle me-2"></i>Reporte Stock Bajo
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>
                <Col md={2}>
                  <Card className="glass hover-3d text-center" style={{ cursor: 'pointer' }} onClick={sendLowStockEmail}>
                    <Card.Body>
                      <i className="bi bi-envelope" style={{ fontSize: '24px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontSize: '12px' }}>Enviar Pedido</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Card className="glass hover-3d text-center" style={{ cursor: 'pointer' }} onClick={() => setShowLowStockOnly(!showLowStockOnly)}>
                    <Card.Body>
                      <FaFilter style={{ fontSize: '24px', color: showLowStockOnly ? '#FF6B6B' : '#87CEEB' }} />
                      <Card.Text style={{ fontSize: '12px' }}>
                        {showLowStockOnly ? 'Ver Todo' : 'Stock Bajo'}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2}>
                  <Dropdown>
                    <Dropdown.Toggle as={Card} className="glass hover-3d text-center" style={{ cursor: 'pointer', border: 'none' }}>
                      <Card.Body>
                        <i className="bi bi-funnel" style={{ fontSize: '24px', color: '#87CEEB' }}></i>
                        <Card.Text style={{ fontSize: '12px' }}>Filtrar Tipo</Card.Text>
                      </Card.Body>
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item onClick={() => setLicorFilter('')}>
                        Todos los tipos
                      </Dropdown.Item>
                      <Dropdown.Divider />
                      <Dropdown.Item onClick={() => setLicorFilter('licor')}>
                        <i className="bi bi-cup-fill me-2"></i>Licores
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setLicorFilter('vino')}>
                        <i className="bi bi-wine-glass-fill me-2"></i>Vinos
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setLicorFilter('cerveza')}>
                        <i className="bi bi-bucket me-2"></i>Cervezas
                      </Dropdown.Item>
                      <Dropdown.Item onClick={() => setLicorFilter('otros')}>
                        <i className="bi bi-three-dots me-2"></i>Otros
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </Col>
              </Row>

              {/* Barra de búsqueda mejorada */}
              <Row className="mb-4">
                <Col md={8}>
                  <Form.Control
                    type="text"
                    className="glass"
                    placeholder="Buscar por nombre, marca o tipo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ borderRadius: '20px', padding: '12px 20px', border: '1px solid #87CEEB' }}
                  />
                </Col>
                <Col md={4}>
                  <div className="d-flex gap-2">
                    {searchTerm && (
                      <Button 
                        variant="outline-secondary" 
                        onClick={() => setSearchTerm('')}
                        size="sm"
                      >
                        Limpiar
                      </Button>
                    )}
                    <small className="text-muted align-self-center">
                      {filteredInventory.length} de {inventory.length} productos
                    </small>
                  </div>
                </Col>
              </Row>

              {/* Alertas de stock crítico */}
              {inventoryStats.criticalStock > 0 && (
                <Alert variant="danger" className="mb-4">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>¡Atención!</strong> {inventoryStats.criticalStock} productos sin stock requieren reposición inmediata.
                </Alert>
              )}

              {inventoryStats.lowStock > inventoryStats.criticalStock && (
                <Alert variant="warning" className="mb-4">
                  <i className="bi bi-exclamation-circle-fill me-2"></i>
                  <strong>Aviso:</strong> {inventoryStats.lowStock - inventoryStats.criticalStock} productos con stock bajo.
                </Alert>
              )}

              {/* Grid de productos */}
              <Row>
                {filteredInventory.length === 0 ? (
                  <Col>
                    <Card className="glass text-center p-4">
                      <Card.Body>
                        <i className="bi bi-search" style={{ fontSize: '48px', color: '#87CEEB' }}></i>
                        <h5 className="mt-3">No se encontraron productos</h5>
                        <p className="text-muted">
                          {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay productos que coincidan con los filtros aplicados'}
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
                      <Col key={item.id} md={4} lg={3} className="mb-3">
                        <Card 
                          className={`glass hover-3d ${isCriticalStock ? 'critical-stock' : isLowStock ? 'low-stock' : ''}`}
                          style={{ 
                            borderRadius: '15px', 
                            border: 'none', 
                            padding: '10px',
                            position: 'relative',
                            minHeight: '320px'
                          }}
                        >
                          {/* Indicadores de estado */}
                          {isCriticalStock && (
                            <Badge bg="danger" className="position-absolute" style={{ top: '10px', right: '10px' }}>
                              SIN STOCK
                            </Badge>
                          )}
                          {isLowStock && !isCriticalStock && (
                            <Badge bg="warning" className="position-absolute" style={{ top: '10px', right: '10px' }}>
                              STOCK BAJO
                            </Badge>
                          )}

                          <Card.Body style={{ color: '#333333' }}>
                            <Card.Title style={{ fontSize: '1.1rem', fontFamily: 'Raleway, sans-serif', marginBottom: '10px' }}>
                              {item.nombre}
                            </Card.Title>

                            {/* Información del producto */}
                            <div style={{ fontSize: '0.85rem', marginBottom: '15px' }}>
                              <div><strong>Tipo:</strong> {item.tipo}</div>
                              {item.tipo === 'licor' && item.subTipo && (
                                <div><strong>Sub-tipo:</strong> {item.subTipo}</div>
                              )}
                              {(item.tipo === 'vino' || item.tipo === 'cerveza') && item.marca && (
                                <div><strong>Marca:</strong> {item.marca}</div>
                              )}
                              {item.tipo === 'vino' && item.origen && (
                                <div><strong>Origen:</strong> {item.origen}</div>
                              )}
                              {item.precio && (
                                <div><strong>Precio:</strong> ${Number(item.precio).toFixed(2)}</div>
                              )}
                            </div>

                            {/* Barra de progreso del stock */}
                            <div className="mb-2">
                              <div className="d-flex justify-content-between mb-1">
                                <small>Stock: {Number(item.stock).toFixed(2)}</small>
                                <small>Umbral: {Number(item.umbral_low).toFixed(2)}</small>
                              </div>
                              <div style={{ 
                                width: '100%', 
                                background: 'rgba(211, 211, 211, 0.3)', 
                                height: '8px', 
                                borderRadius: '4px', 
                                overflow: 'hidden' 
                              }}>
                                <div style={{ 
                                  width: `${stockPercentage}%`, 
                                  height: '100%', 
                                  background: isCriticalStock ? '#DC3545' : 
                                             isLowStock ? '#FFC107' : '#28A745',
                                  transition: 'width 0.5s ease',
                                  borderRadius: '4px'
                                }}></div>
                              </div>
                            </div>

                            {/* Información del proveedor */}
                            {item.proveedor_id && (
                              <div style={{ fontSize: '0.75rem', color: '#6c757d', marginBottom: '10px' }}>
                                <i className="bi bi-building me-1"></i>
                                {getProviderName(item.proveedor_id)}
                              </div>
                            )}

                            {/* Botón de edición */}
                            <div className="d-grid gap-2">
                              <Button
                                variant={canEditAllFields ? 'primary' : 'outline-primary'}
                                size="sm"
                                onClick={() => handleEditItem(item)}
                                className="hover-3d"
                              >
                                <FaEdit className="me-1" />
                                {canEditAllFields ? 'Editar' : 'Ver/Actualizar Stock'}
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    );
                  })
                )}
              </Row>

              {/* Gráfico de estadísticas */}
              {inventory.length > 0 && (
                <Row className="mt-4">
                  <Col md={6}>
                    <Card className="glass">
                      <Card.Header>
                        <h6>Estado del Inventario</h6>
                      </Card.Header>
                      <Card.Body>
                        <div style={{ maxWidth: '300px', margin: '0 auto' }}>
                          <Pie 
                            data={lowStockData} 
                            options={{ 
                              responsive: true,
                              plugins: {
                                legend: {
                                  position: 'bottom'
                                }
                              }
                            }} 
                          />
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="glass">
                      <Card.Header>
                        <h6>Resumen por Categoría</h6>
                      </Card.Header>
                      <Card.Body>
                        {['licor', 'vino', 'cerveza', 'otros'].map(tipo => {
                          const count = inventory.filter(item => item.tipo === tipo).length;
                          const lowCount = inventory.filter(item => 
                            item.tipo === tipo && Number(item.stock) <= Number(item.umbral_low)
                          ).length;
                          
                          if (count === 0) return null;
                          
                          return (
                            <div key={tipo} className="d-flex justify-content-between align-items-center mb-2">
                              <span className="text-capitalize">
                                <i className={`bi ${
                                  tipo === 'licor' ? 'bi-cup-fill' :
                                  tipo === 'vino' ? 'bi-wine-glass-fill' :
                                  tipo === 'cerveza' ? 'bi-bucket' : 'bi-three-dots'
                                } me-2`}></i>
                                {tipo}
                              </span>
                              <div>
                                <Badge bg="primary" className="me-1">{count}</Badge>
                                {lowCount > 0 && <Badge bg="warning">{lowCount} bajo</Badge>}
                              </div>
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
              <h2 className="mb-4" style={{ color: '#333333', fontFamily: 'Raleway, sans-serif' }}>
                Historial de Movimientos
              </h2>
              
              {historial.length === 0 ? (
                <Card className="glass text-center p-4">
                  <Card.Body>
                    <i className="bi bi-clock-history" style={{ fontSize: '48px', color: '#87CEEB' }}></i>
                    <h5 className="mt-3">No hay movimientos registrados</h5>
                    <p className="text-muted">Los movimientos del inventario aparecerán aquí</p>
                  </Card.Body>
                </Card>
              ) : (
                Object.entries(
                  historial.reduce((acc, log) => {
                    const date = log.fecha.toDate().toLocaleDateString();
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(log);
                    return acc;
                  }, {})
                ).map(([date, logs]) => {
                  const totalMovimientos = logs.length;
                  const totalUnidades = logs.reduce((sum, log) => sum + Number(log.cantidad || 0), 0);
                  const ventas = logs.filter(log => log.accion === 'vendido').length;
                  const agregados = logs.filter(log => log.accion === 'agregado').length;

                  return (
                    <Card key={date} className="glass mb-3 hover-3d">
                      <Card.Header 
                        style={{ cursor: 'pointer' }} 
                        onClick={() => setOpenCard(openCard === date ? null : date)}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <h6 className="mb-0">{new Date(date).toLocaleDateString('es-AR', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}</h6>
                            <small className="text-muted">
                              {totalMovimientos} movimiento{totalMovimientos !== 1 ? 's' : ''} • 
                              {totalUnidades} unidad{totalUnidades !== 1 ? 'es' : ''}
                            </small>
                          </div>
                          <div className="d-flex gap-2">
                            {agregados > 0 && <Badge bg="success">{agregados} agregado{agregados !== 1 ? 's' : ''}</Badge>}
                            {ventas > 0 && <Badge bg="danger">{ventas} venta{ventas !== 1 ? 's' : ''}</Badge>}
                            <i className={`bi bi-chevron-${openCard === date ? 'up' : 'down'}`}></i>
                          </div>
                        </div>
                      </Card.Header>
                      <Collapse in={openCard === date}>
                        <Card.Body>
                          <div className="timeline">
                            {logs
                              .sort((a, b) => new Date(b.fecha.toDate()) - new Date(a.fecha.toDate()))
                              .map(log => (
                                <div key={log.id} className="d-flex align-items-center mb-2 p-2 rounded" style={{ background: 'rgba(255, 255, 255, 0.3)' }}>
                                  <div className="me-3">
                                    <i className={`bi ${
                                      log.accion === 'agregado' ? 'bi-arrow-up-circle text-success' :
                                      log.accion === 'vendido' ? 'bi-arrow-down-circle text-danger' :
                                      'bi-gear text-info'
                                    }`} style={{ fontSize: '1.5rem' }}></i>
                                  </div>
                                  <div className="flex-grow-1">
                                    <div className="fw-bold">
                                      {log.accion === 'agregado' ? 'Agregado' :
                                       log.accion === 'vendido' ? 'Vendido' :
                                       log.accion === 'creado' ? 'Creado' : 'Modificado'} - 
                                      {Number(log.cantidad || 0).toFixed(2)} unidades
                                    </div>
                                    <div className="text-muted small">
                                      <strong>Producto:</strong> {log.item_nombre || log.item_id} • 
                                      <strong> Usuario:</strong> {log.usuario} • 
                                      <strong> Hora:</strong> {log.fecha.toDate().toLocaleTimeString('es-AR')}
                                      {log.motivo && (
                                        <><br/><strong>Motivo:</strong> {log.motivo}</>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </Card.Body>
                      </Collapse>
                    </Card>
                  );
                })
              )}
            </div>
          } />
        </Routes>

        {/* Chat button y modal */}
        {user && (
          <>
            <Button
              variant="primary"
              className="position-fixed chat-button"
              style={{ 
                bottom: '20px', 
                right: '20px', 
                zIndex: 1000, 
                borderRadius: '50%', 
                width: '60px', 
                height: '60px', 
                padding: '0', 
                background: '#87CEEB', 
                border: '2px solid #87CEEB', 
                boxShadow: '0 0 10px #87CEEB' 
              }}
              onClick={toggleChat}
            >
              <i className="bi bi-chat-fill" style={{ fontSize: '28px', color: '#333333' }}></i>
              {unreadNotes.size > 0 && (
                <Badge 
                  bg="danger" 
                  className="position-absolute" 
                  style={{ top: '-5px', right: '-5px' }}
                >
                  {unreadNotes.size}
                </Badge>
              )}
            </Button>

            {/* Chat Modal */}
            <Modal show={showChat} onHide={() => setShowChat(false)} className="chat-modal">
              <Modal.Header closeButton className="glass">
                <Modal.Title style={{ fontFamily: 'Raleway, sans-serif' }}>
                  <i className="bi bi-chat-dots me-2"></i>Chat Interno
                </Modal.Title>
              </Modal.Header>
              <Modal.Body className="glass" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {notes.length === 0 ? (
                  <div className="text-center text-muted">
                    <i className="bi bi-chat" style={{ fontSize: '48px' }}></i>
                    <p className="mt-2">No hay mensajes aún</p>
                  </div>
                ) : (
                  <div>
                    {notes.map(note => (
                      <div key={note.id} className={`mb-3 p-3 rounded ${unreadNotes.has(note.id) ? 'bg-info bg-opacity-25' : 'bg-light bg-opacity-50'}`}>
                        <div className="d-flex align-items-start">
                          <div className="me-3">
                            <div 
                              className="rounded-circle d-flex align-items-center justify-content-center"
                              style={{ 
                                width: '40px', 
                                height: '40px', 
                                background: '#87CEEB', 
                                color: 'white',
                                fontWeight: 'bold'
                              }}
                            >
                              {note.usuario.charAt(0).toUpperCase()}
                            </div>
                          </div>
                          <div className="flex-grow-1">
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <strong>{note.usuario.split('@')[0]}</strong>
                              <small className="text-muted">
                                {note.fecha?.toDate().toLocaleString('es-AR')}
                              </small>
                            </div>
                            <p className="mb-1">{note.texto}</p>
                            {unreadNotes.has(note.id) && note.usuario !== user.email && (
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => handleMarkAsRead(note.id)}
                                className="p-0"
                                style={{ color: '#87CEEB', fontSize: '0.8rem' }}
                              >
                                Marcar como leído
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer className="glass">
                <Form onSubmit={addNote} className="w-100">
                  <div className="d-flex gap-2">
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      className="glass"
                      style={{ border: '1px solid #87CEEB', resize: 'none' }}
                    />
                    <Button 
                      variant="primary" 
                      type="submit"
                      disabled={!newNote.trim()}
                      style={{ background: '#87CEEB', borderColor: '#87CEEB' }}
                    >
                      <i className="bi bi-send"></i>
                    </Button>
                  </div>
                </Form>
              </Modal.Footer>
            </Modal>
          </>
        )}

        {/* Modales */}
        <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered>
          <Modal.Header closeButton className="glass">
            <Modal.Title style={{ fontFamily: 'Raleway, sans-serif' }}>Iniciar Sesión</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleLogin}>
            <Modal.Body className="glass">
              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Ingresa tu email"
                  className="glass"
                  style={{ border: '1px solid #87CEEB' }}
                  required
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Contraseña</Form.Label>
                <Form.Control
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="glass"
                  style={{ border: '1px solid #87CEEB' }}
                  required
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer className="glass">
              <Button variant="secondary" onClick={() => setShowLoginModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="primary" 
                type="submit"
                style={{ background: '#87CEEB', borderColor: '#87CEEB' }}
              >
                Iniciar Sesión
              </Button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* Formulario de inventario */}
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

        {/* Gestión de proveedores */}
        <ProviderManagement
          show={showProviderModal}
          onHide={() => setShowProviderModal(false)}
          user={user}
          userRole={userRole}
        />

        {/* Gestión de usuarios */}
        <UserManagement
          show={showUserModal}
          onHide={() => setShowUserModal(false)}
          user={user}
          userRole={userRole}
        />

        {/* Footer */}
        <footer className="text-center mt-5 py-3 glass" style={{ borderTop: '1px solid #87CEEB' }}>
          <div className="d-flex justify-content-between align-items-center">
            <small>&copy; 2025 Wilfred Del Pozo Diaz. Todos los derechos reservados.</small>
            <small>
              <Badge bg="info">v2.0</Badge> - Sistema mejorado con roles y validaciones
            </small>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;