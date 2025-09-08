import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, query, orderBy, limit } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from './firebase';
import { downloadCSV } from './utils/downloadCSV';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Navbar, Nav, Button, Row, Col, Card, Form, Modal, Collapse } from 'react-bootstrap'; // Añadí Collapse
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import logo from './logo.png'; // Asegúrate de tener logo.png en src/

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
    `}</style>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ nombre: '', marca: '', tipo: 'licor', subTipo: '', origen: '', stock: 1, umbral_low: 5 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [editingStockId, setEditingStockId] = useState(null);
  const [editingStockValue, setEditingStockValue] = useState(0);
  const [licorFilter, setLicorFilter] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadNotes, setUnreadNotes] = useState(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [openCard, setOpenCard] = useState(null); // Estado para controlar las tarjetas colapsables

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const splashTimer = setTimeout(() => {
          setShowSplash(false);
          fetchInventory();
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
        console.log(`Ítem ${doc.id}: stock=${stock}, umbral_low=${umbral_low}`);
        return { id: doc.id, ...data, stock, umbral_low };
      });
      setInventory(items);
    } catch (err) {
      console.error('Error fetching inventory:', err);
    }
  };

  const fetchHistorial = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'historial'));
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
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setEmail('');
      setPassword('');
      setError(null);
      fetchInventory();
      fetchHistorial();
      fetchNotes();
      setShowLoginModal(false);
    } catch (err) {
      setError('Error en login: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Error en logout:', err);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    try {
      const dataToSave = {
        nombre: newItem.nombre,
        tipo: newItem.tipo,
        stock: newItem.stock,
        umbral_low: newItem.umbral_low,
        ultima_actualizacion: new Date()
      };
      if (newItem.tipo === 'licor') {
        dataToSave.subTipo = newItem.subTipo;
      }
      if (newItem.tipo === 'vino' || newItem.tipo === 'cerveza') {
        dataToSave.marca = newItem.marca;
      }
      if (newItem.tipo === 'vino') {
        dataToSave.origen = newItem.origen;
      }
      const docRef = await addDoc(collection(db, 'inventario'), dataToSave);
      await addDoc(collection(db, 'historial'), {
        item_id: docRef.id,
        accion: 'agregado',
        cantidad: newItem.stock,
        fecha: new Date(),
        usuario: user.email
      });
      setShowAddForm(false);
      setNewItem({ nombre: '', marca: '', tipo: 'licor', subTipo: '', origen: '', stock: 1, umbral_low: 5 });
      fetchInventory();
      fetchHistorial();
    } catch (err) {
      console.error('Error agregando item:', err);
    }
  };

  const handleUpdateStock = async (itemId, newStock) => {
    try {
      const itemRef = doc(db, 'inventario', itemId);
      const item = inventory.find(i => i.id === itemId);
      const oldStock = item.stock;
      const change = newStock - oldStock;
      await updateDoc(itemRef, { stock: newStock, ultima_actualizacion: new Date() });
      await addDoc(collection(db, 'historial'), {
        item_id: itemId,
        accion: change > 0 ? 'agregado' : 'vendido',
        cantidad: Math.abs(change),
        fecha: new Date(),
        usuario: user.email
      });
      fetchInventory();
      fetchHistorial();
      setEditingStockId(null);
    } catch (err) {
      console.error('Error actualizando stock:', err);
    }
  };

  const handleDownload = () => {
    downloadCSV(inventory.map(item => ({
      Nombre: item.nombre,
      Marca: item.marca || 'N/A',
      Tipo: item.tipo,
      Stock: item.stock,
      Umbral: item.umbral_low
    })));
  };

  const sendLowStockEmail = async () => {
    const recipientEmail = prompt('Por favor, ingrese el correo del destinatario:', '');
    if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
      alert('Por favor, ingrese un correo válido.');
      return;
    }

    try {
      const functions = getFunctions();
      const sendEmail = httpsCallable(functions, 'sendLowStockEmail');
      const lowStockItems = inventory.filter(item => Number(item.stock) <= Number(item.umbral_low));
      await sendEmail({
        inventory: lowStockItems,
        recipientEmail: recipientEmail,
        fromEmail: user.email
      });
      alert('Email enviado con éxito a ' + recipientEmail);
    } catch (err) {
      console.error('Error enviando email:', err);
      setError('Error enviando email: ' + err.message);
    }
  };

  const addNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) {
      alert('Por favor, ingrese un mensaje.');
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
    } catch (err) {
      console.error('Error adding note:', err);
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

  const setFilteredInventory = (filteredItems) => {
    setInventory(prev => filteredItems); // Actualiza el estado para filtrar
  };

  const filteredInventory = inventory.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.nombre.toLowerCase().includes(searchLower) ||
      (item.marca && item.marca.toLowerCase().includes(searchLower))
    );
  });

  // Datos para el gráfico de stock bajo
  const lowStockData = {
    labels: ['Stock Bajo', 'Stock Saludable'],
    datasets: [
      {
        data: [
          inventory.length > 0 ? inventory.filter(item => Number(item.stock) <= Number(item.umbral_low)).length : 0,
          inventory.length > 0 ? inventory.filter(item => Number(item.stock) > Number(item.umbral_low)).length : 0
        ],
        backgroundColor: ['rgba(211, 211, 211, 0.5)', '#87CEEB'],
        borderColor: '#87CEEB',
        borderWidth: 2,
        hoverOffset: 4,
      },
    ],
  };

  // Análisis de tendencias (consumo mensual basado en historial)
  const trendData = {
    labels: historial.length > 0 ? [...new Set(historial.map(log => {
      const date = log.fecha.toDate();
      return `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
    }))].sort((a, b) => {
      const [aMonth, aYear] = a.split(' ');
      const [bMonth, bYear] = b.split(' ');
      return new Date(bYear, getMonthNumber(bMonth)) - new Date(aYear, getMonthNumber(aMonth));
    }).slice(0, 6) : [],
    datasets: [
      {
        label: 'Consumo Mensual (Unidades Vendidas)',
        data: historial.length > 0 ? Object.entries(historial.reduce((acc, log) => {
          if (log.accion === 'vendido') {
            const month = log.fecha.toDate().toLocaleString('default', { month: 'short', year: 'numeric' });
            acc[month] = (acc[month] || 0) + Number(log.cantidad || 0);
          }
          return acc;
        }, {})).sort(([a], [b]) => {
          const [aMonth, aYear] = a.split(' ');
          const [bMonth, bYear] = b.split(' ');
          return new Date(bYear, getMonthNumber(bMonth)) - new Date(aYear, getMonthNumber(aMonth));
        }).slice(0, 6).map(([, value]) => value) : [],
        fill: false,
        borderColor: '#87CEEB',
        pointBackgroundColor: '#87CEEB', // Consistente con el tema
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
      },
    ],
  };

  // Función auxiliar para convertir nombre de mes a número
  const getMonthNumber = (monthName) => {
    const months = {
      'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
      'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };
    return months[monthName];
  };

  // Agrupar historial por fecha
  const groupedHistorial = historial.reduce((acc, log) => {
    const date = log.fecha.toDate().toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewItem(prev => ({ ...prev, [name]: value }));
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <Router>
      <div className="container" style={{ background: '#F5F5F5', color: '#333333', minHeight: '100vh', padding: '20px', position: 'relative', overflow: 'hidden' }}>
        <Navbar bg="transparent" variant="dark" expand="lg" className="mb-4 rounded" style={{ border: 'none', backdropFilter: 'blur(5px)', background: 'rgba(255, 255, 255, 0.2)' }}>
          <Navbar.Brand as={Link} to="/" style={{ fontFamily: 'Raleway, sans-serif', fontSize: '28px', color: '#333333', textShadow: '0 0 2px #87CEEB' }}>
            Baires Inventory
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" style={{ borderColor: '#87CEEB', backgroundColor: 'rgba(255, 255, 255, 0.5)' }} />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ml-auto">
              <Nav.Link as={Link} to="/" style={{ color: '#333333', fontSize: '16px', transition: 'color 0.3s' }}>Dashboard</Nav.Link>
              <Nav.Link as={Link} to="/historial" style={{ color: '#333333', fontSize: '16px', transition: 'color 0.3s' }}>Historial</Nav.Link>
              {user ? (
                <Button variant="outline-primary" onClick={handleLogout} className="ml-2 hover-3d" style={{ borderColor: '#87CEEB', color: '#87CEEB' }}>
                  Logout
                </Button>
              ) : (
                <Button variant="outline-primary" onClick={() => setShowLoginModal(true)} className="ml-2 hover-3d" style={{ borderColor: '#87CEEB', color: '#87CEEB' }}>
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
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '5px', cursor: 'pointer' }} onClick={() => setShowAddForm(true)}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-plus-circle" style={{ fontSize: '18px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '14px' }}>Agregar Item</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '5px', cursor: 'pointer' }} onClick={sendLowStockEmail}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-envelope" style={{ fontSize: '18px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '14px' }}>Enviar Pedido</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '5px', cursor: 'pointer' }} onClick={handleDownload}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-download" style={{ fontSize: '18px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '14px' }}>Descargar CSV</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '5px', cursor: 'pointer' }} onClick={() => setShowLowStockOnly(!showLowStockOnly)}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-filter" style={{ fontSize: '18px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '14px' }}>{showLowStockOnly ? 'Ver Todo' : 'Umbral Bajo'}</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <input
                type="text"
                className="form-control mb-3 shadow-sm glass"
                placeholder="Buscar por nombre o marca"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ borderRadius: '20px', padding: '12px', border: '1px solid #87CEEB', color: '#333333', boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.1)' }}
              />
              {showAddForm && (
                <div className="card p-4 mb-4 shadow-sm glass" style={{ borderRadius: '15px', color: '#333333' }}>
                  <h3 className="text-center mb-3" style={{ color: '#333333' }}>Agregar Nuevo Item</h3>
                  <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                      <label style={{ fontSize: '16px' }}>Nombre</label>
                      <input type="text" name="nombre" value={newItem.nombre} onChange={handleInputChange} placeholder="Ej: Maker's Mark" className="form-control" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333' }} required />
                    </div>
                    {(newItem.tipo === 'vino' || newItem.tipo === 'cerveza') && (
                      <div>
                        <label style={{ fontSize: '16px' }}>Marca</label>
                        <input type="text" name="marca" value={newItem.marca} onChange={handleInputChange} placeholder="Ej: Bodega Catena" className="form-control" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333' }} />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '16px' }}>Tipo</label>
                      <select name="tipo" value={newItem.tipo} onChange={handleInputChange} className="form-control" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333' }}>
                        <option value="licor">Licor</option>
                        <option value="vino">Vino</option>
                        <option value="cerveza">Cerveza</option>
                      </select>
                    </div>
                    {newItem.tipo === 'licor' && (
                      <div>
                        <label style={{ fontSize: '16px' }}>Sub-tipo</label>
                        <select name="subTipo" value={newItem.subTipo} onChange={handleInputChange} className="form-control" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333' }} required>
                          <option value="">Seleccione</option>
                          <option value="whiskey">Whiskey</option>
                          <option value="vodka">Vodka</option>
                          <option value="gin">Gin</option>
                          <option value="ron">Ron</option>
                          <option value="tequila">Tequila</option>
                          <option value="otro">Otro</option>
                        </select>
                      </div>
                    )}
                    {newItem.tipo === 'vino' && (
                      <div>
                        <label style={{ fontSize: '16px' }}>Origen</label>
                        <input type="text" name="origen" value={newItem.origen} onChange={handleInputChange} placeholder="Ej: Argentina" className="form-control" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333' }} required />
                      </div>
                    )}
                    <div>
                      <label style={{ fontSize: '16px' }}>Stock</label>
                      <input type="number" name="stock" value={newItem.stock} onChange={handleInputChange} min="0" step="0.25" placeholder="Ej: 0.75" className="form-control" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333' }} required />
                    </div>
                    <div>
                      <label style={{ fontSize: '16px' }}>Umbral Low</label>
                      <input type="number" name="umbral_low" value={newItem.umbral_low} onChange={handleInputChange} min="0" step="0.25" placeholder="Ej: 2.5" className="form-control" style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333' }} required />
                    </div>
                    <Button variant="primary" type="submit" className="mt-3 hover-3d" style={{ background: '#87CEEB', borderColor: '#98FF98', color: '#333333' }}>
                      Agregar
                    </Button>
                    <Button variant="secondary" onClick={() => setShowAddForm(false)} className="mt-2 hover-3d" style={{ background: 'rgba(255, 255, 255, 0.2)', borderColor: '#87CEEB', color: '#87CEEB' }}>
                      Cancelar
                    </Button>
                  </form>
                </div>
              )}
              <Row className="mb-4">
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '15px', cursor: 'pointer' }} onClick={() => { setFilteredInventory(inventory.filter(i => i.tipo === 'licor')); }}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-cup-fill" style={{ fontSize: '30px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '18px' }}>Licores</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '15px', cursor: 'pointer' }} onClick={() => { setFilteredInventory(inventory.filter(i => i.tipo === 'vino')); }}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-wine-glass-fill" style={{ fontSize: '30px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '18px' }}>Vinos</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '15px', cursor: 'pointer' }} onClick={() => { setFilteredInventory(inventory.filter(i => i.tipo === 'cerveza')); }}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-bucket" style={{ fontSize: '30px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '18px' }}>Cervezas</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={3}>
                  <Card className="glass hover-3d" style={{ borderRadius: '15px', padding: '15px', cursor: 'pointer' }} onClick={() => { /* Lógica para Tendencias */ }}>
                    <Card.Body style={{ color: '#333333', textAlign: 'center', transition: 'transform 0.3s' }}>
                      <i className="bi bi-graph-up" style={{ fontSize: '30px', color: '#87CEEB' }}></i>
                      <Card.Text style={{ fontFamily: 'Raleway, sans-serif', fontSize: '18px' }}>Tendencias</Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
              <div className="row">
                {filteredInventory
                  .filter(item => !showLowStockOnly || (Number(item.stock) || 0) <= (Number(item.umbral_low) || 0))
                  .map(item => (
                    <div key={item.id} className="col-md-4 mb-3">
                      <Card className={`shadow-sm glass hover-3d ${Number(item.stock) <= Number(item.umbral_low) ? 'low-stock' : ''}`} style={{ borderRadius: '15px', border: 'none', padding: '15px', backdropFilter: 'blur(5px)', position: 'relative' }}>
                        {Number(item.stock) <= Number(item.umbral_low) && (
                          <i className="bi bi-exclamation-circle" style={{ position: 'absolute', top: '10px', right: '10px', color: '#FF6B6B', fontSize: '20px' }}></i>
                        )}
                        <Card.Body style={{ color: '#333333' }}>
                          <Card.Title style={{ fontSize: '1.8rem', fontFamily: 'Raleway, sans-serif' }}>{item.nombre}</Card.Title>
                          {item.tipo === 'licor' && <Card.Text>Sub-tipo: {item.subTipo || 'N/A'}</Card.Text>}
                          {(item.tipo === 'vino' || item.tipo === 'cerveza') && <Card.Text>Marca: {item.marca || 'N/A'}</Card.Text>}
                          {item.tipo === 'vino' && <Card.Text>Origen: {item.origen || 'N/A'}</Card.Text>}
                          <div style={{ width: '100%', background: 'rgba(211, 211, 211, 0.5)', height: '20px', borderRadius: '10px', overflow: 'hidden' }}>
                            <div style={{ width: `${(item.stock / (item.umbral_low * 2)) * 100}%`, height: '100%', background: Number(item.stock) <= Number(item.umbral_low) ? 'rgba(211, 211, 211, 0.5)' : '#87CEEB', transition: 'width 0.5s ease', boxShadow: 'inset 0 0 5px #87CEEB' }}></div>
                          </div>
                          <Card.Text style={{ color: Number(item.stock) <= Number(item.umbral_low) ? '#FF6B6B' : '#333333' }}>Stock: {item.stock}</Card.Text>
                          <Card.Text>Umbral Low: {item.umbral_low}</Card.Text>
                          <div>
                            {editingStockId === item.id ? (
                              <div>
                                <input
                                  type="number"
                                  value={editingStockValue}
                                  onChange={(e) => setEditingStockValue(e.target.value)}
                                  min="0"
                                  step="0.25"
                                  className="form-control glass"
                                  style={{ border: '1px solid #87CEEB', color: '#333333', width: '80px', display: 'inline-block' }}
                                />
                                <Button variant="primary" size="sm" onClick={() => handleUpdateStock(item.id, editingStockValue)} className="mr-2 hover-3d" style={{ background: '#87CEEB', borderColor: '#98FF98', color: '#333333' }}>
                                  <i className="bi bi-check"></i> Guardar
                                </Button>
                              </div>
                            ) : (
                              <Button variant="outline-primary" size="sm" onClick={() => { setEditingStockId(item.id); setEditingStockValue(item.stock); }} className="hover-3d" style={{ borderColor: '#87CEEB', color: '#87CEEB' }}>
                                <i className="bi bi-pencil"></i> Editar
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
              </div>
              <div className="mt-3" style={{ maxWidth: '250px', margin: '0 auto' }}>
                <Pie data={lowStockData} options={{ animation: { duration: 1000, easing: 'easeOutQuad', animateRotate: true }, plugins: { tooltip: { backgroundColor: '#87CEEB', titleColor: '#333333', bodyColor: '#333333', borderColor: '#98FF98', caretSize: 0 } } }} />
              </div>
              <Button
                variant="primary"
                className="position-fixed chat-button"
                style={{ bottom: '20px', right: '20px', zIndex: 1000, borderRadius: '50%', width: '60px', height: '60px', padding: '0', background: '#87CEEB', border: '2px solid #87CEEB', boxShadow: '0 0 10px #87CEEB', animation: 'pulse 1.5s infinite' }}
                onClick={toggleChat}
              >
                <i className="bi bi-chat-fill" style={{ fontSize: '28px', color: '#333333' }}></i>
                {unreadNotes.size > 0 && <span className="badge" style={{ background: '#87CEEB', position: 'absolute', top: '-5px', right: '-5px', padding: '2px 6px', color: '#FFFFFF' }}>{unreadNotes.size}</span>}
              </Button>
              <Modal show={showChat} onHide={() => setShowChat(false)} className="chat-modal" style={{ position: 'fixed', top: '10%', right: '10px', width: '320px', height: '80%', background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(5px)', borderRadius: '15px', border: '1px solid #87CEEB', transition: 'transform 0.3s ease' }}>
                <Modal.Header closeButton style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#333333', borderBottom: '1px solid #87CEEB' }}>
                  <Modal.Title style={{ fontFamily: 'Raleway, sans-serif' }}>Chat Interno</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ overflowY: 'auto', maxHeight: 'calc(80vh - 150px)', background: 'rgba(255, 255, 255, 0.1)', color: '#333333' }}>
                  <ul style={{ listStyle: 'none', padding: 0 }}>
                    {notes.map(note => (
                      <li key={note.id} style={{ marginBottom: '10px', background: unreadNotes.has(note.id) ? 'rgba(135, 206, 235, 0.3)' : 'rgba(255, 255, 255, 0.2)', padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', animation: 'fadeIn 0.5s' }}>
                        <span style={{ fontSize: '20px', color: '#87CEEB', marginRight: '10px', textShadow: '0 0 2px #87CEEB' }}>{note.usuario.charAt(0)}</span>
                        <div>
                          <strong>{note.usuario}</strong>: {note.texto} <br />
                          <small style={{ color: '#666666' }}>{note.fecha?.toDate().toLocaleString()}</small>
                          {unreadNotes.has(note.id) && (
                            <Button variant="link" size="sm" onClick={() => handleMarkAsRead(note.id)} style={{ color: '#87CEEB', padding: 0, fontSize: '12px', textShadow: '0 0 2px #87CEEB' }}>
                              Marcar como leído
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </Modal.Body>
                <Modal.Footer style={{ background: 'rgba(255, 255, 255, 0.1)', borderTop: '1px solid #87CEEB' }}>
                  <Form onSubmit={addNote} style={{ width: '100%', display: 'flex', gap: '10px' }}>
                    <Form.Control
                      as="textarea"
                      rows={2}
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Escribe un mensaje..."
                      style={{ flex: 1, background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333', boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Button variant="primary" type="submit" style={{ background: '#87CEEB', borderColor: '#87CEEB', color: '#333333', animation: 'pulse 1.5s infinite' }}>
                      <i className="bi bi-send"></i>
                    </Button>
                  </Form>
                </Modal.Footer>
              </Modal>
              <Modal show={showLoginModal} onHide={() => setShowLoginModal(false)} centered style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                <Modal.Header closeButton style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#333333', borderBottom: '1px solid #87CEEB' }}>
                  <Modal.Title style={{ fontFamily: 'Raleway, sans-serif' }}>Iniciar Sesión</Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#333333' }}>
                  <Form onSubmit={handleLogin}>
                    <Form.Group className="mb-3">
                      <Form.Label>Email</Form.Label>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Ingresa tu email"
                        style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333', boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.1)'}}
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
                        style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid #87CEEB', color: '#333333', boxShadow: 'inset 0 0 5px rgba(0, 0, 0, 0.1)'}}
                        required
                      />
                    </Form.Group>
                    {error && <p className="text-danger">{error}</p>}
                    <Button variant="primary" type="submit" style={{ background: '#87CEEB', borderColor: '#87CEEB', color: '#333333', width: '100%', animation: 'pulse 1.5s infinite' }}>
                      Iniciar Sesión
                    </Button>
                  </Form>
                </Modal.Body>
              </Modal>
            </div>
          } />
          <Route path="/historial" element={
            <div>
              <h2 style={{ color: '#333333', fontFamily: 'Raleway, sans-serif', fontSize: '24px', textShadow: '0 0 5px #87CEEB' }}>Historial - Baires Inventory</h2>
              {Object.entries(groupedHistorial).map(([date, logs]) => {
                const totalMovimientos = logs.length;
                const totalUnidades = logs.reduce((sum, log) => sum + Number(log.cantidad || 0), 0);
                return (
                  <Card key={date} className="glass mb-3 hover-3d" style={{ borderRadius: '15px', padding: '10px' }}>
                    <Card.Body style={{ color: '#333333', cursor: 'pointer' }} onClick={() => setOpenCard(openCard === date ? null : date)}>
                      <Card.Title style={{ fontFamily: 'Raleway, sans-serif' }}>
                        {new Date(date).toLocaleDateString()} - {totalMovimientos} movimiento(s), {totalUnidades} unidad(es) totales
                      </Card.Title>
                    </Card.Body>
                    <Collapse in={openCard === date}>
                      <div>
                        <ul className="list-group list-group-flush">
                          {logs.map(log => (
                            <li key={log.id} className="list-group-item" style={{ background: 'rgba(255, 255, 255, 0.2)', color: '#333333', borderBottom: '1px solid #87CEEB', display: 'flex', alignItems: 'center' }}>
                              <span style={{ marginRight: '10px' }}>
                                <i className={`bi ${log.accion === 'agregado' ? 'bi-arrow-up' : 'bi-arrow-down'}`} style={{ fontSize: '16px', color: log.accion === 'agregado' ? '#98FF98' : '#FF6B6B' }}></i>
                              </span>
                              <span>{log.accion} {log.cantidad} de {log.item_id || log.item_codigo} por {log.usuario} el {new Date(log.fecha.toDate()).toLocaleTimeString()}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Collapse>
                  </Card>
                );
              })}
            </div>
          } />
        </Routes>
        <footer className="text-center mt-4 py-3" style={{ background: '#F5F5F5', color: '#666666', borderTop: '1px solid #87CEEB' }}>
          &copy; 2025 Wilfred Del Pozo Diaz. Todos los derechos reservados.
        </footer>
      </div>
    </Router>
  );
}

export default App;