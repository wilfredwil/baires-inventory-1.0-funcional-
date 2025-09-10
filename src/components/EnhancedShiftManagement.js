// src/components/EnhancedShiftManagement.js
import React, { useState, useEffect } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Badge,
  Alert,
  Modal,
  Table,
  Dropdown,
  InputGroup,
  Spinner,
  Tab,
  Tabs,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  FaCalendarAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaExchangeAlt,
  FaClock,
  FaUserCheck,
  FaUserTimes,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaCalendarWeek,
  FaCalendarDay,
  FaUsers,
  FaBell,
  FaFilter,
  FaDownload,
  FaUserClock,
  FaClipboardCheck,
  FaCog
} from 'react-icons/fa';

const EnhancedShiftManagement = ({ user, userRole, onBack }) => {
  // Estados principales
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de vistas
  const [currentView, setCurrentView] = useState('calendar');
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [calendarView, setCalendarView] = useState('week'); // 'week' o 'month'

  // Estados de modales
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState(null);

  // Estados de formularios
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    employee_name: '',
    position: '',
    date: '',
    start_time: '',
    end_time: '',
    notes: '',
    status: 'scheduled'
  });

  const [swapForm, setSwapForm] = useState({
    requesting_shift_id: '',
    target_shift_id: '',
    reason: '',
    target_employee_id: ''
  });

  // Estados de filtros
  const [filters, setFilters] = useState({
    employee: '',
    position: '',
    status: '',
    week: new Date()
  });

  // Cargar datos en tiempo real
  useEffect(() => {
    const unsubscribeShifts = onSnapshot(
      query(collection(db, 'shifts'), orderBy('date', 'asc')),
      (snapshot) => {
        const shiftsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setShifts(shiftsData);
      }
    );

    const unsubscribeEmployees = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const employeesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(emp => emp.active !== false);
        setEmployees(employeesData);
      }
    );

    const unsubscribeSwaps = onSnapshot(
      query(collection(db, 'shift_swaps'), orderBy('created_at', 'desc')),
      (snapshot) => {
        const swapsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSwapRequests(swapsData);
      }
    );

    setLoading(false);

    return () => {
      unsubscribeShifts();
      unsubscribeEmployees();
      unsubscribeSwaps();
    };
  }, []);

  // Posiciones disponibles
  const positions = [
    'Bartender',
    'Mesero',
    'Cocinero',
    'Ayudante de Cocina',
    'Host/Hostess',
    'Gerente de Turno',
    'Limpieza',
    'Seguridad'
  ];

  // Estados de turno
  const shiftStatuses = [
    { value: 'scheduled', label: 'Programado', color: 'primary' },
    { value: 'in_progress', label: 'En Progreso', color: 'warning' },
    { value: 'completed', label: 'Completado', color: 'success' },
    { value: 'cancelled', label: 'Cancelado', color: 'danger' },
    { value: 'no_show', label: 'No se presentó', color: 'dark' }
  ];

  // Funciones auxiliares
  const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay()); // Comenzar en domingo
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getShiftsByDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date === dateStr);
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId || emp.email === employeeId);
    return employee ? (employee.name || employee.displayName || employee.email.split('@')[0]) : 'Empleado no encontrado';
  };

  const getShiftColor = (shift) => {
    const hour = parseInt(shift.start_time.split(':')[0]);
    if (hour >= 6 && hour < 14) return '#3b82f6'; // Mañana - Azul
    if (hour >= 14 && hour < 22) return '#f59e0b'; // Tarde - Naranja
    return '#6366f1'; // Noche - Morado
  };

  const isCurrentShift = (shift) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinutes;
    
    if (shift.date !== today) return false;
    
    const startHour = parseInt(shift.start_time.split(':')[0]);
    const startMinutes = parseInt(shift.start_time.split(':')[1]);
    const startTime = startHour * 60 + startMinutes;
    
    const endHour = parseInt(shift.end_time.split(':')[0]);
    const endMinutes = parseInt(shift.end_time.split(':')[1]);
    let endTime = endHour * 60 + endMinutes;
    
    // Manejar turnos que cruzan medianoche
    if (endTime < startTime) endTime += 24 * 60;
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  // Handlers
  const handleCreateShift = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const employee = employees.find(emp => emp.id === shiftForm.employee_id);
      
      await addDoc(collection(db, 'shifts'), {
        ...shiftForm,
        employee_name: employee ? (employee.name || employee.displayName || employee.email.split('@')[0]) : '',
        created_at: serverTimestamp(),
        created_by: user.email,
        status: 'scheduled'
      });

      setSuccess('Turno creado exitosamente');
      setShowShiftModal(false);
      resetShiftForm();
    } catch (error) {
      console.error('Error creating shift:', error);
      setError('Error al crear el turno');
    }
  };

  const handleUpdateShift = async (shiftId, updates) => {
    try {
      await updateDoc(doc(db, 'shifts', shiftId), {
        ...updates,
        updated_at: serverTimestamp(),
        updated_by: user.email
      });
      setSuccess('Turno actualizado exitosamente');
    } catch (error) {
      console.error('Error updating shift:', error);
      setError('Error al actualizar el turno');
    }
  };

  const handleCheckIn = async (shift) => {
    await handleUpdateShift(shift.id, {
      status: 'in_progress',
      actual_start_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      checked_in: true,
      check_in_time: serverTimestamp()
    });
  };

  const handleCheckOut = async (shift) => {
    await handleUpdateShift(shift.id, {
      status: 'completed',
      actual_end_time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      checked_out: true,
      check_out_time: serverTimestamp()
    });
  };

  const handleRequestSwap = async () => {
    if (!swapForm.requesting_shift_id || !swapForm.target_shift_id) {
      setError('Selecciona ambos turnos para el intercambio');
      return;
    }

    try {
      await addDoc(collection(db, 'shift_swaps'), {
        ...swapForm,
        status: 'pending',
        requester_id: user.email,
        created_at: serverTimestamp()
      });

      setSuccess('Solicitud de intercambio enviada');
      setShowSwapModal(false);
      resetSwapForm();
    } catch (error) {
      console.error('Error requesting swap:', error);
      setError('Error al solicitar intercambio');
    }
  };

  const resetShiftForm = () => {
    setShiftForm({
      employee_id: '',
      employee_name: '',
      position: '',
      date: '',
      start_time: '',
      end_time: '',
      notes: '',
      status: 'scheduled'
    });
  };

  const resetSwapForm = () => {
    setSwapForm({
      requesting_shift_id: '',
      target_shift_id: '',
      reason: '',
      target_employee_id: ''
    });
  };

  // Componente de Calendario Semanal
  const WeeklyCalendar = () => {
    const weekDates = getWeekDates(selectedWeek);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 pb-0">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
              <FaCalendarWeek className="me-2" />
              Calendario Semanal
            </h5>
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  const prevWeek = new Date(selectedWeek);
                  prevWeek.setDate(prevWeek.getDate() - 7);
                  setSelectedWeek(prevWeek);
                }}
              >
                <FaChevronLeft />
              </Button>
              <span className="mx-2 fw-medium">
                {weekDates[0].toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })} - {' '}
                {weekDates[6].toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => {
                  const nextWeek = new Date(selectedWeek);
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setSelectedWeek(nextWeek);
                }}
              >
                <FaChevronRight />
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table className="mb-0" style={{ minWidth: '800px' }}>
              <thead className="bg-light">
                <tr>
                  {weekDates.map((date, index) => (
                    <th key={index} className="text-center p-3 border-end">
                      <div className="fw-bold">{dayNames[index]}</div>
                      <div className="text-muted small">
                        {date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '400px' }}>
                  {weekDates.map((date, index) => {
                    const dayShifts = getShiftsByDate(date);
                    const isToday = date.toDateString() === new Date().toDateString();
                    
                    return (
                      <td 
                        key={index} 
                        className="align-top p-2 border-end"
                        style={{ 
                          background: isToday ? '#f0f9ff' : 'white',
                          minHeight: '400px'
                        }}
                      >
                        <div className="d-flex flex-column gap-2" style={{ minHeight: '380px' }}>
                          {dayShifts.map(shift => {
                            const isCurrent = isCurrentShift(shift);
                            const statusConfig = shiftStatuses.find(s => s.value === shift.status);
                            
                            return (
                              <OverlayTrigger
                                key={shift.id}
                                placement="top"
                                overlay={
                                  <Tooltip>
                                    <strong>{shift.employee_name}</strong><br />
                                    {shift.position}<br />
                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}<br />
                                    {shift.notes && `Notas: ${shift.notes}`}
                                  </Tooltip>
                                }
                              >
                                <div
                                  className="p-2 rounded cursor-pointer small"
                                  style={{
                                    background: isCurrent 
                                      ? 'linear-gradient(135deg, #10b981, #059669)'
                                      : getShiftColor(shift),
                                    color: 'white',
                                    cursor: 'pointer',
                                    border: isCurrent ? '2px solid #047857' : 'none',
                                    position: 'relative',
                                    boxShadow: isCurrent ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                  onClick={() => {
                                    setSelectedShift(shift);
                                    setShowAttendanceModal(true);
                                  }}
                                >
                                  {isCurrent && (
                                    <div style={{
                                      position: 'absolute',
                                      top: '2px',
                                      right: '2px',
                                      width: '8px',
                                      height: '8px',
                                      background: '#fbbf24',
                                      borderRadius: '50%',
                                      animation: 'pulse 2s infinite'
                                    }} />
                                  )}
                                  <div className="fw-bold" style={{ fontSize: '0.75rem' }}>
                                    {shift.employee_name}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                    {shift.position}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                  </div>
                                  <div className="mt-1">
                                    <Badge 
                                      bg={statusConfig?.color || 'secondary'}
                                      style={{ fontSize: '0.6rem' }}
                                    >
                                      {statusConfig?.label || shift.status}
                                    </Badge>
                                  </div>
                                </div>
                              </OverlayTrigger>
                            );
                          })}
                          
                          {/* Botón para agregar turno */}
                          {(userRole === 'admin' || userRole === 'manager') && (
                            <button
                              className="btn btn-outline-primary btn-sm mt-auto"
                              style={{ fontSize: '0.7rem' }}
                              onClick={() => {
                                setShiftForm(prev => ({
                                  ...prev,
                                  date: date.toISOString().split('T')[0]
                                }));
                                setShowShiftModal(true);
                              }}
                            >
                              <FaPlus /> Agregar
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  };

  // Componente de Lista de Turnos
  const ShiftsList = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayShifts = shifts.filter(shift => shift.date === today);
    const upcomingShifts = shifts.filter(shift => shift.date > today);

    return (
      <Row>
        <Col lg={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-primary text-white">
              <h6 className="mb-0">
                <FaCalendarDay className="me-2" />
                Turnos de Hoy ({todayShifts.length})
              </h6>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {todayShifts.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaCalendarDay size={32} className="mb-2" />
                  <p>No hay turnos programados para hoy</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {todayShifts.map(shift => {
                    const isCurrent = isCurrentShift(shift);
                    const statusConfig = shiftStatuses.find(s => s.value === shift.status);
                    
                    return (
                      <div
                        key={shift.id}
                        className={`p-3 rounded border ${isCurrent ? 'border-success bg-light' : 'border-light'}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          setSelectedShift(shift);
                          setShowAttendanceModal(true);
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <h6 className="mb-1">
                              {shift.employee_name}
                              {isCurrent && (
                                <Badge bg="success" className="ms-2">
                                  <FaClock /> En progreso
                                </Badge>
                              )}
                            </h6>
                            <p className="mb-1 text-muted">
                              {shift.position} • {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </p>
                            {shift.notes && (
                              <p className="mb-0 small text-muted">📝 {shift.notes}</p>
                            )}
                          </div>
                          <Badge bg={statusConfig?.color || 'secondary'}>
                            {statusConfig?.label || shift.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">
                <FaUserClock className="me-2" />
                Próximos Turnos
              </h6>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {upcomingShifts.slice(0, 10).map(shift => {
                const statusConfig = shiftStatuses.find(s => s.value === shift.status);
                
                return (
                  <div
                    key={shift.id}
                    className="p-3 rounded border border-light mb-2"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedShift(shift);
                      setShowAttendanceModal(true);
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6 className="mb-1">{shift.employee_name}</h6>
                        <p className="mb-1 text-muted">
                          {shift.position} • {new Date(shift.date).toLocaleDateString('es-AR')}
                        </p>
                        <p className="mb-0 small text-muted">
                          {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                        </p>
                      </div>
                      <Badge bg={statusConfig?.color || 'secondary'}>
                        {statusConfig?.label || shift.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" style={{ color: '#10b981' }} />
          <p className="mt-3">Cargando gestión de turnos...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid style={{ padding: '30px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2 style={{ color: '#1e293b', fontFamily: 'Raleway, sans-serif' }}>
                <FaCalendarAlt className="me-3" style={{ color: '#10b981' }} />
                Gestión de Turnos Avanzada
              </h2>
              <p className="text-muted mb-0">Sistema completo de horarios, asistencia e intercambios</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={onBack}>
                ← Volver al Dashboard
              </Button>
              {(userRole === 'admin' || userRole === 'manager') && (
                <Button 
                  variant="success" 
                  onClick={() => setShowShiftModal(true)}
                  style={{ background: '#10b981', borderColor: '#10b981' }}
                >
                  <FaPlus className="me-2" />
                  Nuevo Turno
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-3">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess('')} className="mb-3">
          {success}
        </Alert>
      )}

      {/* Estadísticas Rápidas */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#10b981', color: 'white' }}>
            <Card.Body>
              <h3>{shifts.filter(s => s.date === new Date().toISOString().split('T')[0]).length}</h3>
              <small>Turnos Hoy</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#3b82f6', color: 'white' }}>
            <Card.Body>
              <h3>{shifts.filter(s => s.status === 'in_progress').length}</h3>
              <small>En Progreso</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#f59e0b', color: 'white' }}>
            <Card.Body>
              <h3>{swapRequests.filter(s => s.status === 'pending').length}</h3>
              <small>Intercambios Pendientes</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#8b5cf6', color: 'white' }}>
            <Card.Body>
              <h3>{employees.length}</h3>
              <small>Personal Activo</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Navegación por Tabs */}
      <Tabs activeKey={currentView} onSelect={(k) => setCurrentView(k)} className="mb-4">
        <Tab eventKey="calendar" title={<><FaCalendarWeek className="me-1" />Calendario Semanal</>}>
          <WeeklyCalendar />
        </Tab>
        
        <Tab eventKey="list" title={<><FaCalendarDay className="me-1" />Lista de Turnos</>}>
          <ShiftsList />
        </Tab>
        
        <Tab eventKey="swaps" title={<><FaExchangeAlt className="me-1" />Intercambios</>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-warning text-white">
              <h6 className="mb-0">Solicitudes de Intercambio</h6>
            </Card.Header>
            <Card.Body>
              {swapRequests.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <FaExchangeAlt size={32} className="mb-2" />
                  <p>No hay solicitudes de intercambio</p>
                </div>
              ) : (
                swapRequests.map(swap => (
                  <div key={swap.id} className="border-bottom pb-3 mb-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h6>{swap.requester_id}</h6>
                        <p className="text-muted small">Razón: {swap.reason}</p>
                      </div>
                      <Badge bg={swap.status === 'pending' ? 'warning' : 'success'}>
                        {swap.status}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </Card.Body>
          </Card>
        </Tab>
        
        <Tab eventKey="attendance" title={<><FaUserCheck className="me-1" />Asistencia</>}>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-info text-white">
              <h6 className="mb-0">Control de Asistencia</h6>
            </Card.Header>
            <Card.Body>
              <div className="text-center text-muted py-4">
                <FaUserCheck size={32} className="mb-2" />
                <p>Funcionalidad de asistencia en desarrollo</p>
              </div>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modal Crear/Editar Turno */}
      <Modal show={showShiftModal} onHide={() => setShowShiftModal(false)} size="lg" centered>
        <Form onSubmit={handleCreateShift}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Empleado *</Form.Label>
                  <Form.Select
                    name="employee_id"
                    value={shiftForm.employee_id}
                    onChange={(e) => {
                      const selectedEmployee = employees.find(emp => emp.id === e.target.value);
                      setShiftForm(prev => ({
                        ...prev,
                        employee_id: e.target.value,
                        employee_name: selectedEmployee ? 
                          (selectedEmployee.name || selectedEmployee.displayName || selectedEmployee.email.split('@')[0]) : ''
                      }));
                    }}
                    required
                  >
                    <option value="">Seleccionar empleado...</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name || employee.displayName || employee.email.split('@')[0]} - {employee.role}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Posición *</Form.Label>
                  <Form.Select
                    name="position"
                    value={shiftForm.position}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, position: e.target.value }))}
                    required
                  >
                    <option value="">Seleccionar posición...</option>
                    {positions.map(position => (
                      <option key={position} value={position}>{position}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha *</Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={shiftForm.date}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora Inicio *</Form.Label>
                  <Form.Control
                    type="time"
                    name="start_time"
                    value={shiftForm.start_time}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, start_time: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora Fin *</Form.Label>
                  <Form.Control
                    type="time"
                    name="end_time"
                    value={shiftForm.end_time}
                    onChange={(e) => setShiftForm(prev => ({ ...prev, end_time: e.target.value }))}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notas del Turno</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={shiftForm.notes}
                onChange={(e) => setShiftForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Instrucciones especiales, tareas específicas, etc."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
              Cancelar
            </Button>
            <Button variant="success" type="submit">
              <FaCheckCircle className="me-2" />
              Crear Turno
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de Asistencia/Detalles del Turno */}
      <Modal show={showAttendanceModal} onHide={() => setShowAttendanceModal(false)} size="lg" centered>
        {selectedShift && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>
                <FaUserCheck className="me-2" />
                Detalles del Turno
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Row>
                <Col md={6}>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="text-muted mb-3">Información del Turno</h6>
                      <div className="mb-2">
                        <strong>Empleado:</strong> {selectedShift.employee_name}
                      </div>
                      <div className="mb-2">
                        <strong>Posición:</strong> {selectedShift.position}
                      </div>
                      <div className="mb-2">
                        <strong>Fecha:</strong> {new Date(selectedShift.date).toLocaleDateString('es-AR')}
                      </div>
                      <div className="mb-2">
                        <strong>Horario:</strong> {formatTime(selectedShift.start_time)} - {formatTime(selectedShift.end_time)}
                      </div>
                      <div className="mb-2">
                        <strong>Estado:</strong>{' '}
                        <Badge bg={shiftStatuses.find(s => s.value === selectedShift.status)?.color || 'secondary'}>
                          {shiftStatuses.find(s => s.value === selectedShift.status)?.label || selectedShift.status}
                        </Badge>
                      </div>
                      {selectedShift.notes && (
                        <div className="mb-2">
                          <strong>Notas:</strong> {selectedShift.notes}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={6}>
                  <Card className="border-0 bg-light">
                    <Card.Body>
                      <h6 className="text-muted mb-3">Control de Asistencia</h6>
                      
                      {selectedShift.status === 'scheduled' && (
                        <div className="d-grid gap-2">
                          <Button
                            variant="success"
                            onClick={() => handleCheckIn(selectedShift)}
                            disabled={!isCurrentShift(selectedShift)}
                          >
                            <FaUserCheck className="me-2" />
                            {isCurrentShift(selectedShift) ? 'Marcar Entrada' : 'Fuera de horario'}
                          </Button>
                        </div>
                      )}

                      {selectedShift.status === 'in_progress' && (
                        <div className="d-grid gap-2">
                          <Alert variant="success" className="mb-2">
                            <FaCheckCircle className="me-2" />
                            Turno en progreso
                          </Alert>
                          <Button
                            variant="warning"
                            onClick={() => handleCheckOut(selectedShift)}
                          >
                            <FaUserTimes className="me-2" />
                            Marcar Salida
                          </Button>
                        </div>
                      )}

                      {selectedShift.status === 'completed' && (
                        <Alert variant="info">
                          <FaCheckCircle className="me-2" />
                          Turno completado
                          {selectedShift.actual_start_time && (
                            <div className="mt-2 small">
                              <strong>Entrada:</strong> {formatTime(selectedShift.actual_start_time)}<br />
                              <strong>Salida:</strong> {formatTime(selectedShift.actual_end_time)}
                            </div>
                          )}
                        </Alert>
                      )}

                      {/* Acciones adicionales */}
                      <div className="mt-3">
                        <h6 className="text-muted mb-2">Acciones</h6>
                        <div className="d-grid gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => {
                              setSwapForm(prev => ({
                                ...prev,
                                requesting_shift_id: selectedShift.id
                              }));
                              setShowSwapModal(true);
                              setShowAttendanceModal(false);
                            }}
                          >
                            <FaExchangeAlt className="me-2" />
                            Solicitar Intercambio
                          </Button>
                          
                          {(userRole === 'admin' || userRole === 'manager') && (
                            <Dropdown>
                              <Dropdown.Toggle variant="outline-secondary" size="sm">
                                <FaCog className="me-2" />
                                Administrar
                              </Dropdown.Toggle>
                              <Dropdown.Menu>
                                <Dropdown.Item
                                  onClick={() => handleUpdateShift(selectedShift.id, { status: 'cancelled' })}
                                >
                                  <FaTimesCircle className="me-2" />
                                  Cancelar Turno
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() => handleUpdateShift(selectedShift.id, { status: 'no_show' })}
                                >
                                  <FaUserTimes className="me-2" />
                                  Marcar como No Show
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown>
                          )}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowAttendanceModal(false)}>
                Cerrar
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>

      {/* Modal de Solicitud de Intercambio */}
      <Modal show={showSwapModal} onHide={() => setShowSwapModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExchangeAlt className="me-2" />
            Solicitar Intercambio
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Turno a intercambiar</Form.Label>
              <Form.Select
                value={swapForm.requesting_shift_id}
                onChange={(e) => setSwapForm(prev => ({ ...prev, requesting_shift_id: e.target.value }))}
              >
                <option value="">Seleccionar mi turno...</option>
                {shifts
                  .filter(shift => shift.employee_id === user.email && shift.status === 'scheduled')
                  .map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {new Date(shift.date).toLocaleDateString('es-AR')} - {formatTime(shift.start_time)} ({shift.position})
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Turno deseado</Form.Label>
              <Form.Select
                value={swapForm.target_shift_id}
                onChange={(e) => setSwapForm(prev => ({ ...prev, target_shift_id: e.target.value }))}
              >
                <option value="">Seleccionar turno objetivo...</option>
                {shifts
                  .filter(shift => 
                    shift.employee_id !== user.email && 
                    shift.status === 'scheduled' &&
                    shift.id !== swapForm.requesting_shift_id
                  )
                  .map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {new Date(shift.date).toLocaleDateString('es-AR')} - {formatTime(shift.start_time)} - {shift.employee_name} ({shift.position})
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Razón del intercambio</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={swapForm.reason}
                onChange={(e) => setSwapForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Explica por qué necesitas hacer este intercambio..."
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSwapModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleRequestSwap}>
            <FaExchangeAlt className="me-2" />
            Enviar Solicitud
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Estilos adicionales */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .table th {
          font-weight: 600;
          color: #374151;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .table td {
          border-color: #f3f4f6;
        }
      `}</style>
    </Container>
  );
};

export default EnhancedShiftManagement;