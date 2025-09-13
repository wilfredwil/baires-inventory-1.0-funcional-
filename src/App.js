// src/App.js - PARTE 1: IMPORTS Y ESTADOS
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

// Local imports
import { auth, db } from './firebase';
import AppLayout from './components/AppLayout';
import MessagingSystem from './components/MessagingSystem';
import InventoryItemForm from './components/InventoryItemForm';
import AdvancedUserManagement from './components/AdvancedUserManagement';
import ProviderManagement from './components/ProviderManagement';
import KitchenInventory from './components/KitchenInventory';
import SeparatedShiftManagement from './components/SeparatedShiftManagement';
import UserProfile from './components/UserProfile';
import EmployeeDirectory from './components/EmployeeDirectory';
import DashboardWidgets from './components/DashboardWidgets';
import PublicScheduleViewer from './components/PublicScheduleViewer';
import CreateUserComponent from './components/CreateUserComponent';
import BarInventory from './components/BarInventory';
import LoginForm from './components/LoginForm'; // NUEVO IMPORT

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

  // Estados de login - SIMPLIFICADOS
  const [loginLoading, setLoginLoading] = useState(false);
  // Eliminamos: loginEmail y loginPassword (ahora los maneja LoginForm)

  // Estados de perfil
  const [showProfileModal, setShowProfileModal] = useState(false);

   // Efectos principales
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('onAuthStateChanged ejecutado:', user?.email);
      
      if (user) {
        try {
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log('Datos del usuario desde Firestore:', userData);
            setUserRole(userData.role || 'employee');
          } else {
            console.log('Usuario no encontrado en Firestore, creando entrada...');
            await addDoc(collection(db, 'users'), {
              uid: user.uid,
              email: user.email,
              role: 'employee',
              active: true,
              created_at: new Date()
            });
            setUserRole('employee');
          }
          setUser(user);
        } catch (error) {
          console.error('Error verificando usuario:', error);
          setError('Error verificando permisos de usuario');
        }
      } else {
        setUser(null);
        setUserRole('employee');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Función de login - MODIFICADA PARA USAR CON LoginForm
  const handleLogin = async (email, password) => {
    setLoginLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Usuario logueado:', userCredential.user);
    } catch (error) {
      console.error('Error en login:', error);
      let errorMessage = 'Error al iniciar sesión';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Usuario deshabilitado';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Intenta más tarde';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales inválidas';
          break;
        default:
          errorMessage = 'Error al iniciar sesión: ' + error.message;
      }
      
      setError(errorMessage);
    }
    
    setLoginLoading(false);
  };

  // Función de logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('dashboard');
      console.log('Usuario deslogueado');
    } catch (error) {
      console.error('Error en logout:', error);
      setError('Error al cerrar sesión');
    }
  };

  // Limpiar mensajes
  const clearError = () => setError('');
  const clearSuccess = () => setSuccess('');

  // Si está cargando
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Cargando...</span>
        </Spinner>
      </div>
    );
  }

  // Si no hay usuario, mostrar login - SIMPLIFICADO
  if (!user) {
    return (
      <LoginForm 
        onLogin={handleLogin}
        loading={loginLoading}
        error={error}
      />
    );
  }

  // Render de la aplicación principal
  const renderCurrentView = () => {
    switch (currentView) {
      case 'bar-inventory':
        return (
          <BarInventory
            user={user}
            userRole={userRole}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'kitchen-inventory':
        return (
          <KitchenInventory
            user={user}
            userRole={userRole}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'users':
        return (
          <AdvancedUserManagement
            currentUser={user}
            userRole={userRole}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'providers':
        return (
          <ProviderManagement
            user={user}
            userRole={userRole}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'shifts':
        return (
          <SeparatedShiftManagement
            user={user}
            userRole={userRole}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'messaging':
        return (
          <MessagingSystem
            user={user}
            userRole={userRole}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'employee-directory':
        return (
          <EmployeeDirectory
            user={user}
            userRole={userRole}
            onBack={() => setCurrentView('dashboard')}
          />
        );
      
      case 'public-schedule':
        return (
          <PublicScheduleViewer onBack={() => setCurrentView('dashboard')} />
        );
      
      default:
        return (
          <DashboardWidgets
            user={user}
            userRole={userRole}
            onNavigate={setCurrentView}
          />
        );
    }
  };

  return (
    <AppLayout
      user={user}
      userRole={userRole}
      currentView={currentView}
      onNavigate={setCurrentView}
      onLogout={handleLogout}
      error={error}
      success={success}
      onClearError={clearError}
      onClearSuccess={clearSuccess}
    >
      {renderCurrentView()}
    </AppLayout>
  );
}

export default App;