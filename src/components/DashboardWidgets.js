// src/components/DashboardWidgets.js
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Button, Alert, Spinner } from 'react-bootstrap';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  getDocs 
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaUsers,
  FaComments,
  FaChartLine,
  FaBoxes,
  FaCalendarDay,
  FaBell,
  FaArrowUp,
  FaArrowDown,
  FaEye,
  FaHeart,
  FaUserClock
} from 'react-icons/fa';

const DashboardWidgets = ({ user, userRole, inventory, employees, onNavigate }) => {
  // Estados para datos en tiempo real
  const [recentMessages, setRecentMessages] = useState([]);
  const [todayShifts, setTodayShifts] = useState([]);
  const [urgentAlerts, setUrgentAlerts] = useState([]);
  const [activityFeed, setActivityFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar datos en tiempo real
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Cargar mensajes recientes
        const messagesQuery = query(
          collection(db, 'messages'),
          orderBy('created_at', 'desc'),
          limit(5)
        );
        
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
          const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRecentMessages(messages);
        });

        // Cargar turnos de hoy
        const today = new Date().toISOString().split('T')[0];
        const shiftsQuery = query(
          collection(db, 'shifts'),
          where('date', '==', today),
          orderBy('start_time')
        );

        const unsubscribeShifts = onSnapshot(shiftsQuery, (snapshot) => {
          const shifts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTodayShifts(shifts);
        });

        setLoading(false);

        return () => {
          unsubscribeMessages();
          unsubscribeShifts();
        };
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setLoading(false);
      }
    };

    if (user) {
      loadDashboardData();
    }
  }, [user]);

  // Generar alertas urgentes
  useEffect(() => {
    const alerts = [];

    // Alertas de stock bajo
    const lowStockItems = inventory.filter(item => 
      item.stock <= (item.umbral_low || 5)
    );
    
    if (lowStockItems.length > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'inventory',
        priority: 'high',
        title: 'Stock Bajo',
        message: `${lowStockItems.length} productos necesitan reposición`,
        count: lowStockItems.length,
        action: () => onNavigate('bar'),
        icon: FaBoxes,
        color: '#ef4444'
      });
    }

    // Alertas de mensajes urgentes
    const urgentMessages = recentMessages.filter(msg => 
      msg.priority === 'urgent' && !msg.read_by?.includes(user?.email)
    );
    
    if (urgentMessages.length > 0) {
      alerts.push({
        id: 'urgent-messages',
        type: 'message',
        priority: 'urgent',
        title: 'Mensajes Urgentes',
        message: `${urgentMessages.length} mensajes urgentes sin leer`,
        count: urgentMessages.length,
        action: () => onNavigate('messages'),
        icon: FaBell,
        color: '#dc2626'
      });
    }

    // Alertas de turnos próximos
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinutes = currentTime.getMinutes();
    const currentTimeString = `${currentHour.toString().padStart(2, '0')}:${currentMinutes.toString().padStart(2, '0')}`;
    
    const upcomingShifts = todayShifts.filter(shift => {
      const shiftStart = shift.start_time;
      const shiftStartHour = parseInt(shiftStart.split(':')[0]);
      const shiftStartMinutes = parseInt(shiftStart.split(':')[1]);
      const timeDiff = (shiftStartHour * 60 + shiftStartMinutes) - (currentHour * 60 + currentMinutes);
      return timeDiff > 0 && timeDiff <= 60; // Próximos 60 minutos
    });

    if (upcomingShifts.length > 0) {
      alerts.push({
        id: 'upcoming-shifts',
        type: 'shift',
        priority: 'normal',
        title: 'Turnos Próximos',
        message: `${upcomingShifts.length} turnos comienzan pronto`,
        count: upcomingShifts.length,
        action: () => onNavigate('shifts'),
        icon: FaUserClock,
        color: '#3b82f6'
      });
    }

    setUrgentAlerts(alerts);
  }, [inventory, recentMessages, todayShifts, user, onNavigate]);

  // Función para obtener estadísticas del día
  const getTodayStats = () => {
    const today = new Date();
    
    // Mensajes de hoy
    const todayMessages = recentMessages.filter(msg => {
      if (!msg.created_at) return false;
      const msgDate = msg.created_at.toDate ? msg.created_at.toDate() : new Date(msg.created_at);
      return msgDate.toDateString() === today.toDateString();
    });

    // Turnos activos ahora
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const activeShifts = todayShifts.filter(shift => {
      const startHour = parseInt(shift.start_time.split(':')[0]);
      const endHour = parseInt(shift.end_time.split(':')[0]);
      return currentHour >= startHour && currentHour < endHour;
    });

    return {
      totalShifts: todayShifts.length,
      activeShifts: activeShifts.length,
      todayMessages: todayMessages.length,
      lowStock: inventory.filter(item => item.stock <= (item.umbral_low || 5)).length,
      totalEmployees: employees.length
    };
  };

  const stats = getTodayStats();

  // Función para formatear tiempo
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Ahora mismo';
    if (diffInMinutes < 60) return `hace ${diffInMinutes} min`;
    if (diffInMinutes < 1440) return `hace ${Math.floor(diffInMinutes / 60)} h`;
    return date.toLocaleDateString('es-AR');
  };

  // Función para obtener color de prioridad
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#ea580c';
      case 'normal': return '#3b82f6';
      case 'low': return '#059669';
      default: return '#6b7280';
    }
  };

  // Función para obtener turno actual
  const getCurrentShift = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return { name: 'Mañana', period: '6:00 - 14:00', color: '#fbbf24' };
    if (hour >= 14 && hour < 22) return { name: 'Tarde', period: '14:00 - 22:00', color: '#3b82f6' };
    return { name: 'Noche', period: '22:00 - 6:00', color: '#6366f1' };
  };

  const currentShift = getCurrentShift();

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <Spinner animation="border" style={{ color: '#3b82f6' }} />
      </div>
    );
  }

  return (
    <div>
      {/* Alertas Urgentes */}
      {urgentAlerts.length > 0 && (
        <Row className="mb-4">
          <Col>
            <Alert 
              variant="warning" 
              className="border-0"
              style={{
                background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
                border: 'none',
                borderRadius: '12px'
              }}
            >
              <div className="d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-3">
                  <FaExclamationTriangle style={{ color: '#d97706', fontSize: '1.5rem' }} />
                  <div>
                    <h6 className="mb-1" style={{ color: '#92400e' }}>
                      Atención Requerida
                    </h6>
                    <p className="mb-0" style={{ color: '#a16207' }}>
                      Hay {urgentAlerts.reduce((sum, alert) => sum + alert.count, 0)} elementos que requieren tu atención
                    </p>
                  </div>
                </div>
                <div className="d-flex gap-2">
                  {urgentAlerts.map(alert => (
                    <Button
                      key={alert.id}
                      variant="outline-warning"
                      size="sm"
                      onClick={alert.action}
                      style={{ borderColor: '#d97706', color: '#d97706' }}
                    >
                      <alert.icon className="me-1" />
                      {alert.title} ({alert.count})
                    </Button>
                  ))}
                </div>
              </div>
            </Alert>
          </Col>
        </Row>
      )}

      {/* Estadísticas Rápidas */}
      <Row className="mb-4">
        <Col md={2}>
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white'
          }}>
            <Card.Body>
              <FaCalendarDay size={24} className="mb-2" />
              <h4>{stats.totalShifts}</h4>
              <small>Turnos Hoy</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #10b981, #047857)',
            color: 'white'
          }}>
            <Card.Body>
              <FaUserClock size={24} className="mb-2" />
              <h4>{stats.activeShifts}</h4>
              <small>Turnos Activos</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: 'white'
          }}>
            <Card.Body>
              <FaComments size={24} className="mb-2" />
              <h4>{stats.todayMessages}</h4>
              <small>Mensajes Hoy</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 h-100" style={{ 
            background: stats.lowStock > 0 
              ? 'linear-gradient(135deg, #ef4444, #dc2626)'
              : 'linear-gradient(135deg, #6b7280, #4b5563)',
            color: 'white'
          }}>
            <Card.Body>
              <FaBoxes size={24} className="mb-2" />
              <h4>{stats.lowStock}</h4>
              <small>Stock Bajo</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: 'white'
          }}>
            <Card.Body>
              <FaUsers size={24} className="mb-2" />
              <h4>{stats.totalEmployees}</h4>
              <small>Personal</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={2}>
          <Card className="text-center border-0 h-100" style={{ 
            background: `linear-gradient(135deg, ${currentShift.color}, ${currentShift.color}dd)`,
            color: 'white'
          }}>
            <Card.Body>
              <FaClock size={24} className="mb-2" />
              <h6 className="mb-1">{currentShift.name}</h6>
              <small>{currentShift.period}</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Widgets Principales */}
      <Row>
        {/* Mensajes Recientes */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Header 
              className="border-0 d-flex justify-content-between align-items-center"
              style={{ background: '#f8fafc' }}
            >
              <div className="d-flex align-items-center gap-2">
                <FaComments style={{ color: '#3b82f6' }} />
                <h6 className="mb-0">Mensajes Recientes</h6>
              </div>
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={() => onNavigate('messages')}
              >
                Ver todos
              </Button>
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {recentMessages.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaComments size={32} className="mb-2" />
                  <p>No hay mensajes recientes</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {recentMessages.map(message => (
                    <div 
                      key={message.id}
                      className="p-3 rounded"
                      style={{ 
                        background: message.priority === 'urgent' ? '#fef2f2' : '#f8fafc',
                        border: `1px solid ${message.priority === 'urgent' ? '#fecaca' : '#e2e8f0'}`,
                        cursor: 'pointer'
                      }}
                      onClick={() => onNavigate('messages')}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <Badge 
                            bg={message.priority === 'urgent' ? 'danger' : 'primary'}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {message.category || 'General'}
                          </Badge>
                          {message.priority === 'urgent' && (
                            <Badge bg="danger">
                              <FaBell size={10} />
                            </Badge>
                          )}
                        </div>
                        <small className="text-muted">
                          {formatTime(message.created_at)}
                        </small>
                      </div>
                      <p className="mb-2" style={{ 
                        fontSize: '0.9rem',
                        lineHeight: '1.4'
                      }}>
                        {message.content.length > 100 
                          ? message.content.substring(0, 100) + '...'
                          : message.content
                        }
                      </p>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          👤 {message.author_name}
                        </small>
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted">
                            ❤️ {message.likes?.length || 0}
                          </small>
                          <small className="text-muted">
                            👁️ {message.read_by?.length || 0}
                          </small>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Turnos de Hoy */}
        <Col lg={6} className="mb-4">
          <Card className="h-100 border-0 shadow-sm">
            <Card.Header 
              className="border-0 d-flex justify-content-between align-items-center"
              style={{ background: '#f8fafc' }}
            >
              <div className="d-flex align-items-center gap-2">
                <FaCalendarDay style={{ color: '#10b981' }} />
                <h6 className="mb-0">Turnos de Hoy</h6>
              </div>
              <Button 
                variant="outline-success" 
                size="sm"
                onClick={() => onNavigate('shifts')}
              >
                Gestionar
              </Button>
            </Card.Header>
            <Card.Body style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {todayShifts.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaCalendarDay size={32} className="mb-2" />
                  <p>No hay turnos programados para hoy</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  {todayShifts.map(shift => {
                    const currentTime = new Date();
                    const currentHour = currentTime.getHours();
                    const shiftStart = parseInt(shift.start_time.split(':')[0]);
                    const shiftEnd = parseInt(shift.end_time.split(':')[0]);
                    const isActive = currentHour >= shiftStart && currentHour < shiftEnd;
                    
                    return (
                      <div 
                        key={shift.id}
                        className="p-3 rounded"
                        style={{ 
                          background: isActive ? '#f0fdf4' : '#f8fafc',
                          border: `1px solid ${isActive ? '#bbf7d0' : '#e2e8f0'}`
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <h6 className="mb-0">{shift.employee_name}</h6>
                              {isActive && (
                                <Badge bg="success">
                                  <FaClock size={10} className="me-1" />
                                  Activo
                                </Badge>
                              )}
                            </div>
                            <p className="mb-1 text-muted" style={{ fontSize: '0.9rem' }}>
                              {shift.position} • {shift.start_time} - {shift.end_time}
                            </p>
                            {shift.notes && (
                              <p className="mb-0" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                📝 {shift.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Acciones Rápidas */}
      <Row>
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Header 
              className="border-0"
              style={{ background: '#f8fafc' }}
            >
              <h6 className="mb-0 d-flex align-items-center gap-2">
                <FaChartLine style={{ color: '#6366f1' }} />
                Acciones Rápidas
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={3}>
                  <div 
                    className="text-center p-3 rounded"
                    style={{ 
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      cursor: 'pointer'
                    }}
                    onClick={() => onNavigate('messages')}
                  >
                    <FaComments size={24} style={{ color: '#0ea5e9' }} className="mb-2" />
                    <h6>Nuevo Mensaje</h6>
                    <small className="text-muted">Comunicar con el equipo</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div 
                    className="text-center p-3 rounded"
                    style={{ 
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      cursor: 'pointer'
                    }}
                    onClick={() => onNavigate('shifts')}
                  >
                    <FaUserClock size={24} style={{ color: '#059669' }} className="mb-2" />
                    <h6>Gestionar Turnos</h6>
                    <small className="text-muted">Horarios y personal</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div 
                    className="text-center p-3 rounded"
                    style={{ 
                      background: '#fef7ff',
                      border: '1px solid #e9d5ff',
                      cursor: 'pointer'
                    }}
                    onClick={() => onNavigate('bar')}
                  >
                    <FaBoxes size={24} style={{ color: '#8b5cf6' }} className="mb-2" />
                    <h6>Ver Inventario</h6>
                    <small className="text-muted">Stock y productos</small>
                  </div>
                </Col>
                <Col md={3}>
                  <div 
                    className="text-center p-3 rounded"
                    style={{ 
                      background: '#fffbeb',
                      border: '1px solid #fed7aa',
                      cursor: 'pointer'
                    }}
                    onClick={() => onNavigate('directory')}
                  >
                    <FaUsers size={24} style={{ color: '#ea580c' }} className="mb-2" />
                    <h6>Directorio</h6>
                    <small className="text-muted">Contactos del equipo</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardWidgets;