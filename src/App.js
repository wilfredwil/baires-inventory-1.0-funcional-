// src/App.js - PARTE ACTUALIZADA PARA MANEJAR HORARIOS
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
import ShiftManagement from './components/ShiftManagement';
import UserProfile from './components/UserProfile';
import EmployeeDirectory from './components/EmployeeDirectory';
import DashboardWidgets from './components/DashboardWidgets';
import PublicScheduleViewer from './components/PublicScheduleViewer';
import CreateUserComponent from './components/CreateUserComponent';
import BarInventory from './components/BarInventory';
import LoginForm from './components/LoginForm';
import TaskManager from './components/TaskManager';
import EmployeeTasks from './components/EmployeeTasks';

// Styles
import './styles/improvements.css';
import './styles/shifts.css';
import 'bootstrap/dist/css/bootstrap.min.css';

// AGREGAR ESTAS FUNCIONES AL INICIO DEL COMPONENTE
const generateUserAvatar = (user, size = 40) => {
  const name = user?.displayName || user?.email?.split('@')[0] || 'Usuario';
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  const colors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
  ];
  
  const colorIndex = name.length % colors.length;
  const backgroundColor = colors[colorIndex];
  
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${backgroundColor}"/>
      <text x="${size/2}" y="${size/2 + size/6}" text-anchor="middle" fill="white" 
            font-family="Arial, sans-serif" font-size="${size/3}" font-weight="bold">${initials}</text>
    </svg>
  `;
  
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const getUserImageSrc = () => {
  if (user?.photoURL) {
    return user.photoURL;
  }
  return generateUserAvatar(user, 40);
};

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
  const [viewScheduleId, setViewScheduleId] = useState(null);

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
  const [loginLoading, setLoginLoading] = useState(false);

  // Estados de perfil
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Detectar si la URL tiene un horario para mostrar
  useEffect(() => {
    const checkUrlForSchedule = () => {
      const urlParts = window.location.pathname.split('/');
      if (urlParts.includes('schedule') && urlParts.includes('view')) {
        const index = urlParts.indexOf('view');
        const scheduleId = urlParts[index + 1];
        if (scheduleId) {
          setViewScheduleId(scheduleId);
          setCurrentView('public-schedule');
        }
      }
    };

    checkUrlForSchedule();
  }, []);

  // Efectos principales
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('onAuthStateChanged ejecutado:', firebaseUser?.email);
      
      if (firebaseUser) {
        try {
          // Obtener información adicional del usuario desde Firestore
          const userDoc = await getDocs(
            query(collection(db, 'users'), where('email', '==', firebaseUser.email))
          );
          
          let userData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            role: 'employee'
          };

          if (!userDoc.empty) {
            const userDocData = userDoc.docs[0].data();
            userData = {
              ...userData,
              ...userDocData
            };
          }
          
          setUser(userData);
          setUserRole(userData.role || 'employee');
          console.log('Usuario logueado correctamente:', userData);
        } catch (error) {
          console.error('Error cargando datos del usuario:', error);
          setError('Error cargando información del usuario');
        }
      } else {
        setUser(null);
        setUserRole('employee');
        console.log('Usuario no autenticado');
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Funciones de autenticación
  const handleLogin = async (email, password) => {
    setLoginLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login exitoso:', userCredential.user.email);
      setSuccess('¡Bienvenido!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error en login:', err);
      let errorMessage = 'Error en el login';
      
      switch (err.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Intenta más tarde.';
          break;
        case 'auth/network-request-failed':
          errorMessage = 'Error de conexión. Verifica tu internet.';
          break;
        default:
          errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentView('dashboard');
      setViewScheduleId(null);
      setError('');
      setSuccess('');
      console.log('Logout exitoso');
    } catch (err) {
      console.error('Error en logout:', err);
      setError('Error al cerrar sesión');
    }
  };

  // Funciones de navegación
  const navigateToScheduleView = (scheduleId) => {
    setViewScheduleId(scheduleId);
    setCurrentView('public-schedule');
  };

  // Funciones de notificaciones
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

  // Si no hay usuario, mostrar login
  if (!user) {
    return (
      <LoginForm 
        onLogin={handleLogin}
        loading={loginLoading}
        error={error}
      />
    );
  }

  // Renderizado de vistas
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
          <ShiftManagement 
            onBack={() => setCurrentView('dashboard')}
            user={user}
            userRole={userRole}
            onNavigateToScheduleView={navigateToScheduleView}
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
      show={true}
      onHide={() => setCurrentView('dashboard')}
      user={user}
      userRole={userRole}
    />
  );
      
      case 'public-schedule':
        return (
           <PublicScheduleViewer 
            scheduleId={viewScheduleId} 
            user={user}          // ← Agregar esta línea
            userRole={userRole}  // ← Agregar esta línea
            onBack={() => {
              setCurrentView('dashboard');
              setViewScheduleId(null);
              // Limpiar la URL si llegaron por enlace directo
              if (window.location.pathname.includes('/schedule/view/')) {
                window.history.pushState({}, '', '/');
              }
            }} 
          />
        );
      
      case 'personal':
  return (
    <UserProfile
      show={true}
      onHide={() => setCurrentView('dashboard')}
      user={user}
      userRole={userRole}
      currentUserData={{
        id: user.uid,
        email: user.email,
        displayName: user.displayName,
        ...user
      }}
      onProfileUpdate={(updatedUser) => {
        setUser(updatedUser);
        if (onProfileUpdate) onProfileUpdate(updatedUser);
      }}
    />
  );
      case 'task-manager':
  return (
    <TaskManager 
      onBack={() => setCurrentView('dashboard')}
      user={user}
      userRole={userRole}
    />
  );

case 'my-tasks':
  return (
    <EmployeeTasks 
      user={user}
      onBack={() => setCurrentView('dashboard')}
    />
  );
      default:
        return (
          <DashboardWidgets
            user={user}
            userRole={userRole}
            onNavigate={setCurrentView}
            onNavigateToScheduleView={navigateToScheduleView}
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