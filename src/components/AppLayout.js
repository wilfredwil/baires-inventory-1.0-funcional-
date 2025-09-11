// src/components/AppLayout.js - VERSIÓN SIMPLIFICADA SIN ERRORES
import React, { useState, useEffect } from 'react';
import { Container, Alert, Button } from 'react-bootstrap';
import { 
  FaHome, 
  FaComments, 
  FaCalendarAlt, 
  FaCocktail,
  FaUtensils,
  FaUsers,
  FaTruck,
  FaChartBar,
  FaBars,
  FaBell,
  FaSignOutAlt
} from 'react-icons/fa';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const AppLayout = ({ 
  children, 
  user, 
  userRole, 
  currentView, 
  onNavigate,
  notifications = [],
  error,
  success,
  onClearError,
  onClearSuccess 
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Configuración simple del menú
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHome },
    { id: 'messages', label: 'Mensajes', icon: FaComments, badge: 3 },
    { id: 'shifts', label: 'Turnos & Horarios', icon: FaCalendarAlt },
    { id: 'bar', label: 'Bar & Bebidas', icon: FaCocktail },
    { id: 'kitchen', label: 'Cocina & Ingredientes', icon: FaUtensils },
    { id: 'personal', label: 'Personal', icon: FaUsers, adminOnly: true },
    { id: 'providers', label: 'Proveedores', icon: FaTruck },
    { id: 'directory', label: 'Directorio', icon: FaUsers },
    { id: 'reports', label: 'Reportes', icon: FaChartBar, disabled: true }
  ];

  const filteredItems = menuItems.filter(item => {
    if (item.adminOnly && userRole !== 'admin' && userRole !== 'manager') {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar simplificado */}
      <nav style={{
        width: '280px',
        backgroundColor: '#1e293b',
        color: 'white',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        zIndex: 1000
      }}>
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <h3 style={{ color: '#fbbf24', margin: 0 }}>Baires</h3>
          <small style={{ opacity: 0.7 }}>Management System</small>
        </div>

        {/* Menú */}
        <div style={{ padding: '20px 0' }}>
          {filteredItems.map(item => {
            const IconComponent = item.icon;
            const isActive = currentView === item.id;
            const isDisabled = item.disabled;
            
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (!isDisabled && onNavigate) {
                    onNavigate(item.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px 20px',
                  color: isActive ? 'white' : isDisabled ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                  borderLeft: `3px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                  backgroundColor: isActive ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease'
                }}
              >
                <IconComponent style={{ marginRight: '12px', width: '20px' }} />
                <span style={{ flex: 1 }}>
                  {item.label}
                  {isDisabled && <small style={{ opacity: 0.6 }}> (Próximamente)</small>}
                </span>
                {item.badge && !isDisabled && (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.7rem'
                  }}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Usuario y logout */}
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          right: '20px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '20px'
        }}>
          <div style={{ marginBottom: '10px', fontSize: '0.9rem' }}>
            <div>{user?.email}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'capitalize' }}>
              {userRole === 'admin' ? 'Administrador' : userRole}
            </div>
          </div>
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={handleLogout}
            style={{ width: '100%' }}
          >
            <FaSignOutAlt className="me-2" />
            Cerrar Sesión
          </Button>
        </div>
      </nav>

      {/* Contenido principal */}
      <main style={{
        flex: 1,
        marginLeft: '280px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header superior */}
        <header style={{
          backgroundColor: 'white',
          padding: '15px 30px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h5 style={{ margin: 0, textTransform: 'capitalize' }}>
              {currentView === 'dashboard' ? 'Dashboard' : 
               currentView === 'personal' ? 'Gestión de Personal' :
               currentView === 'bar' ? 'Bar & Bebidas' :
               currentView === 'kitchen' ? 'Cocina & Ingredientes' :
               currentView === 'shifts' ? 'Turnos & Horarios' :
               currentView === 'messages' ? 'Sistema de Mensajes' :
               currentView === 'providers' ? 'Proveedores' :
               currentView === 'directory' ? 'Directorio de Personal' :
               currentView}
            </h5>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Notificaciones */}
            {notifications.length > 0 && (
              <div style={{ position: 'relative' }}>
                <FaBell style={{ fontSize: '1.2rem', color: '#64748b' }} />
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {notifications.length}
                </span>
              </div>
            )}

            {/* Info del usuario */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600
              }}>
                {(user?.email)?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                  {user?.email?.split('@')[0] || 'Usuario'}
                </div>
                <div style={{ color: '#64748b', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                  {userRole === 'admin' ? 'Administrador' : userRole}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Alertas */}
        <div style={{ padding: '20px 30px 0' }}>
          {error && (
            <Alert variant="danger" dismissible onClose={onClearError}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success" dismissible onClose={onClearSuccess}>
              {success}
            </Alert>
          )}
        </div>

        {/* Contenido */}
        <div style={{ flex: 1, padding: '20px 30px' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

export default AppLayout;