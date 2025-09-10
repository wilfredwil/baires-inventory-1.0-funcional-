// src/components/AppLayout.js - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { Alert } from 'react-bootstrap';
import { 
  FaHome, 
  FaComments, 
  FaCalendarAlt, 
  FaTasks,
  FaCocktail,
  FaUtensils,
  FaGlassCheers,
  FaUsers,
  FaTruck,
  FaChartBar,
  FaCog,
  FaBell,
  FaEnvelope,
  FaChevronDown,
  FaSearch,
  FaBars
} from 'react-icons/fa';

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
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showNotifications, setShowNotifications] = useState(false);

  // Manejar cambio de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Configuración de navegación basada en tu estructura actual
  const navigationSections = [
    {
      title: 'Principal',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: FaHome,
          active: currentView === 'dashboard'
        },
        {
          id: 'messages',
          label: 'Mensajes',
          icon: FaComments,
          active: currentView === 'messages',
          badge: 3 // Ejemplo de mensajes no leídos
        },
        {
          id: 'shifts',
          label: 'Turnos & Horarios',
          icon: FaCalendarAlt,
          active: currentView === 'shifts'
        },
        {
          id: 'tasks',
          label: 'Tareas del Día',
          icon: FaTasks,
          active: currentView === 'tasks',
          badge: 5,
          disabled: true // Próximamente
        }
      ]
    },
    {
      title: 'Inventarios',
      items: [
        {
          id: 'bar',
          label: 'Bar & Bebidas',
          icon: FaCocktail,
          active: currentView === 'bar'
        },
        {
          id: 'kitchen',
          label: 'Cocina & Ingredientes',
          icon: FaUtensils,
          active: currentView === 'kitchen'
        },
        {
          id: 'salon',
          label: 'Salón & Menaje',
          icon: FaGlassCheers,
          active: currentView === 'salon',
          disabled: true // Próximamente
        }
      ]
    },
    {
      title: 'Gestión',
      items: [
        {
          id: 'users',
          label: 'Personal',
          icon: FaUsers,
          active: currentView === 'users',
          adminOnly: true
        },
        {
          id: 'providers',
          label: 'Proveedores',
          icon: FaTruck,
          active: currentView === 'providers'
        },
        {
          id: 'directory',
          label: 'Directorio',
          icon: FaUsers,
          active: currentView === 'directory'
        },
        {
          id: 'reports',
          label: 'Reportes',
          icon: FaChartBar,
          active: currentView === 'reports',
          disabled: true // Próximamente
        }
      ]
    }
  ];

  const getFilteredItems = (items) => {
    return items.filter(item => {
      if (item.adminOnly && userRole !== 'admin' && userRole !== 'manager') {
        return false;
      }
      return true;
    });
  };

  const handleNavigation = (itemId) => {
    if (onNavigate) {
      onNavigate(itemId);
    }
    if (windowWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
  };

  const handleMessagesClick = () => {
    handleNavigation('messages');
  };

  const sidebarStyles = {
    width: '280px',
    background: 'linear-gradient(145deg, #1e293b, #334155)',
    color: 'white',
    position: 'fixed',
    height: '100vh',
    left: (sidebarOpen || windowWidth > 768) ? 0 : '-280px',
    transition: 'left 0.3s ease',
    zIndex: 1000,
    overflowY: 'auto'
  };

  const mainContentStyles = {
    flex: 1,
    marginLeft: windowWidth > 768 ? '280px' : '0',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={sidebarStyles}>
        {/* Header del Sidebar */}
        <div style={{
          padding: '25px 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: '5px',
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: '#fbbf24' // Fallback
          }}>
            Baires
          </div>
          <div style={{
            fontSize: '0.8rem',
            opacity: 0.7,
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Management System
          </div>
        </div>

        {/* Menú de Navegación */}
        <div style={{ padding: '20px 0' }}>
          {navigationSections.map((section, sectionIndex) => (
            <div key={sectionIndex} style={{ marginBottom: '30px' }}>
              <div style={{
                padding: '0 20px 10px',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                opacity: 0.6,
                fontWeight: 600
              }}>
                {section.title}
              </div>
              
              {getFilteredItems(section.items).map((item) => {
                const IconComponent = item.icon;
                const isActive = item.active;
                const isDisabled = item.disabled;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (!isDisabled) {
                        handleNavigation(item.id);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 20px',
                      color: isActive ? 'white' : isDisabled ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      borderLeft: `3px solid ${isActive ? '#fbbf24' : 'transparent'}`,
                      background: isActive ? 'rgba(251, 191, 36, 0.2)' : 'transparent',
                      cursor: isDisabled ? 'not-allowed' : 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled && !isActive) {
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderLeftColor = '#fbbf24';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = isDisabled ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.8)';
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }
                    }}
                  >
                    <IconComponent style={{ marginRight: '12px', width: '20px' }} />
                    <span style={{ flex: 1 }}>
                      {item.label}
                      {isDisabled && (
                        <span style={{ fontSize: '0.7rem', opacity: 0.6, marginLeft: '8px' }}>
                          (Próximamente)
                        </span>
                      )}
                    </span>
                    {item.badge > 0 && !isDisabled && (
                      <span style={{
                        background: '#ef4444',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600
                      }}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      {/* Área Principal */}
      <main style={mainContentStyles}>
        {/* Header Superior */}
        <header style={{
          background: 'white',
          padding: '15px 30px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Botón de menú móvil */}
            {windowWidth <= 768 && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  color: '#64748b',
                  cursor: 'pointer'
                }}
              >
                <FaBars />
              </button>
            )}
            
            {/* Breadcrumb */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#64748b',
              fontSize: '0.9rem'
            }}>
              <FaHome />
              <span style={{ textTransform: 'capitalize' }}>
                {currentView === 'dashboard' ? 'Dashboard' : 
                 currentView === 'bar' ? 'Bar & Bebidas' :
                 currentView === 'kitchen' ? 'Cocina & Ingredientes' :
                 currentView === 'shifts' ? 'Turnos & Horarios' :
                 currentView === 'messages' ? 'Sistema de Mensajes' :
                 currentView === 'users' ? 'Gestión de Personal' :
                 currentView === 'providers' ? 'Proveedores' :
                 currentView === 'directory' ? 'Directorio de Personal' :
                 currentView}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Notificaciones */}
            <div style={{ position: 'relative' }}>
              <button 
                onClick={handleNotificationClick}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.2rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f1f5f9';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'none';
                  e.target.style.color = '#64748b';
                }}
              >
                <FaBell />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '2px',
                    right: '2px',
                    background: '#ef4444',
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
                )}
              </button>

              {/* Dropdown de Notificaciones */}
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
                  width: '300px',
                  zIndex: 1000,
                  marginTop: '8px'
                }}>
                  <div style={{
                    padding: '15px 20px',
                    borderBottom: '1px solid #e2e8f0',
                    fontWeight: 600,
                    color: '#374151'
                  }}>
                    Notificaciones
                  </div>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{
                        padding: '20px',
                        textAlign: 'center',
                        color: '#9ca3af'
                      }}>
                        No hay notificaciones
                      </div>
                    ) : (
                      notifications.map((notification, index) => (
                        <div key={index} style={{
                          padding: '12px 20px',
                          borderBottom: '1px solid #f3f4f6',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = 'white';
                        }}
                        >
                          <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px' }}>
                            {notification.message}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                            {notification.type === 'inventory' ? '📦 Inventario' : '💬 Mensaje'}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mensajes */}
            <button 
              onClick={handleMessagesClick}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                color: '#64748b',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '50%',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f1f5f9';
                e.target.style.color = '#374151';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'none';
                e.target.style.color = '#64748b';
              }}
            >
              <FaEnvelope />
              <span style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                2
              </span>
            </button>

            {/* Perfil de Usuario */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 12px',
              background: '#f8fafc',
              borderRadius: '8px',
              cursor: 'pointer'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#3b82f6',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}>
                {(user?.displayName || user?.email)?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                  {user?.displayName || user?.email?.split('@')[0] || 'Usuario'}
                </div>
                <div style={{ color: '#64748b', textTransform: 'capitalize' }}>
                  {userRole === 'admin' ? 'Administrador' :
                   userRole === 'manager' ? 'Gerente' :
                   userRole === 'bartender' ? 'Bartender' :
                   userRole === 'cocinero' ? 'Cocinero' :
                   userRole || 'Usuario'}
                </div>
              </div>
              <FaChevronDown style={{ color: '#94a3b8', fontSize: '0.8rem' }} />
            </div>
          </div>
        </header>

        {/* Contenido Principal */}
        <div style={{
          flex: 1,
          background: currentView === 'dashboard' 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : currentView === 'shifts'
            ? 'linear-gradient(135deg, #10B981, #059669)'
            : currentView === 'messages'
            ? '#f8fafc'
            : '#f8fafc',
          overflowY: 'auto'
        }}>
          {/* Alertas Globales */}
          {error && (
            <div style={{ padding: '20px 30px 0' }}>
              <Alert variant="danger" dismissible onClose={onClearError}>
                {error}
              </Alert>
            </div>
          )}
          
          {success && (
            <div style={{ padding: '20px 30px 0' }}>
              <Alert variant="success" dismissible onClose={onClearSuccess}>
                {success}
              </Alert>
            </div>
          )}

          {/* Tu contenido actual va aquí */}
          <div style={{
            animation: 'slideIn 0.3s ease'
          }}>
            {children}
          </div>
        </div>
      </main>

      {/* Overlay para móvil */}
      {sidebarOpen && windowWidth <= 768 && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999
          }}
        />
      )}

      {/* Overlay para cerrar notificaciones */}
      {showNotifications && (
        <div
          onClick={() => setShowNotifications(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'transparent',
            zIndex: 900
          }}
        />
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;