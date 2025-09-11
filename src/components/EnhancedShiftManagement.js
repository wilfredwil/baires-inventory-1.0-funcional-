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
  FaCog,
  FaArrowLeft,
  FaUser
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

  // Estados de modales
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  // Estados de formularios
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    date: '',
    start_time: '',
    end_time: '',
    position: '',
    notes: '',
    status: 'scheduled'
  });

  const [swapForm, setSwapForm] = useState({
    original_shift_id: '',
    requested_employee_id: '',
    reason: ''
  });

  // Efectos
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    // Cargar turnos
    const unsubscribeShifts = onSnapshot(
      query(collection(db, 'shifts'), orderBy('date', 'desc')),
      (snapshot) => {
        const shiftsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setShifts(shiftsData);
      },
      (error) => {
        console.error('Error cargando turnos:', error);
        setError('Error cargando los turnos');
      }
    );

    // Cargar empleados
    const unsubscribeEmployees = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const employeesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeesData);
      },
      (error) => {
        console.error('Error cargando empleados:', error);
        setError('Error cargando empleados');
      }
    );

    // Cargar solicitudes de intercambio
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
  }, [user]);

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
        created_by: user.email
      });

      setSuccess('Turno creado exitosamente');
      setShowShiftModal(false);
      setShiftForm({
        employee_id: '',
        date: '',
        start_time: '',
        end_time: '',
        position: '',
        notes: '',
        status: 'scheduled'
      });
    } catch (error) {
      console.error('Error creando turno:', error);
      setError('Error al crear el turno');
    }
  };

  const handleUpdateShift = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await updateDoc(doc(db, 'shifts', editingShift.id), {
        ...shiftForm,
        updated_at: serverTimestamp(),
        updated_by: user.email
      });

      setSuccess('Turno actualizado exitosamente');
      setShowShiftModal(false);
      setEditingShift(null);
      setShiftForm({
        employee_id: '',
        date: '',
        start_time: '',
        end_time: '',
        position: '',
        notes: '',
        status: 'scheduled'
      });
    } catch (error) {
      console.error('Error actualizando turno:', error);
      setError('Error al actualizar el turno');
    }
  };

  const handleDeleteShift = async (shiftId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este turno?')) return;
    
    try {
      await deleteDoc(doc(db, 'shifts', shiftId));
      setSuccess('Turno eliminado exitosamente');
    } catch (error) {
      console.error('Error eliminando turno:', error);
      setError('Error al eliminar el turno');
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      employee_id: shift.employee_id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      position: shift.position,
      notes: shift.notes || '',
      status: shift.status
    });
    setShowShiftModal(true);
  };

  // Componente del Calendario Semanal
  const WeeklyCalendar = () => {
    const weekDates = getWeekDates(selectedWeek);
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    return (
      <Card className="border-0 shadow-sm">
        <Card.Header className="bg-white border-0 py-3">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Calendario Semanal</h5>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedWeek);
                  newDate.setDate(newDate.getDate() - 7);
                  setSelectedWeek(newDate);
                }}
              >
                <FaChevronLeft />
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setSelectedWeek(new Date())}
              >
                Hoy
              </Button>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => {
                  const newDate = new Date(selectedWeek);
                  newDate.setDate(newDate.getDate() + 7);
                  setSelectedWeek(newDate);
                }}
              >
                <FaChevronRight />
              </Button>
            </div>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="table-responsive">
            <Table bordered hover className="mb-0">
              <thead className="table-light">
                <tr>
                  {dayNames.map((day, index) => {
                    const date = weekDates[index];
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <th key={index} className={`text-center ${isToday ? 'bg-primary text-white' : ''}`}>
                        <div>{day}</div>
                        <div className="small">{date.getDate()}/{date.getMonth() + 1}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '300px' }}>
                  {weekDates.map((date, index) => {
                    const dayShifts = getShiftsByDate(date);
                    return (
                      <td key={index} className="align-top p-2" style={{ width: '14.28%' }}>
                        <div className="d-flex flex-column gap-1" style={{ minHeight: '260px' }}>
                          {dayShifts.map(shift => {
                            const statusConfig = shiftStatuses.find(s => s.value === shift.status);
                            return (
                              <OverlayTrigger
                                key={shift.id}
                                placement="top"
                                overlay={
                                  <Tooltip>
                                    <strong>{getEmployeeName(shift.employee_id)}</strong><br/>
                                    {shift.position}<br/>
                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                    {shift.notes && <><br/><em>{shift.notes}</em></>}
                                  </Tooltip>
                                }
                              >
                                <div
                                  className="p-1 rounded text-white cursor-pointer"
                                  style={{ 
                                    backgroundColor: getShiftColor(shift),
                                    fontSize: '0.7rem',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleEditShift(shift)}
                                >
                                  <div className="fw-bold">
                                    {getEmployeeName(shift.employee_id)}
                                  </div>
                                  <div style={{ fontSize: '0.6rem', opacity: 0.9 }}>
                                    {shift.position}
                                  </div>
                                  <div style={{ fontSize: '0.6rem', opacity: 0.9 }}>
                                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                  </div>
                                  <div className="mt-1">
                                    <Badge 
                                      bg={statusConfig?.color || 'secondary'}
                                      style={{ fontSize: '0.5rem' }}
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
    const upcomingShifts = shifts.filter(shift => shift.date > today).slice(0, 10);

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
                <p className="text-muted text-center py-3">
                  No hay turnos programados para hoy
                </p>
              ) : (
                todayShifts.map(shift => {
                  const statusConfig = shiftStatuses.find(s => s.value === shift.status);
                  return (
                    <div key={shift.id} className="border-bottom py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{getEmployeeName(shift.employee_id)}</h6>
                          <p className="mb-1 text-muted small">
                            {shift.position} • {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                          </p>
                          {shift.notes && (
                            <p className="mb-1 small">{shift.notes}</p>
                          )}
                        </div>
                        <div className="text-end">
                          <Badge bg={statusConfig?.color || 'secondary'} className="mb-2">
                            {statusConfig?.label || shift.status}
                          </Badge>
                          {(userRole === 'admin' || userRole === 'manager') && (
                            <div>
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="me-1"
                                onClick={() => handleEditShift(shift)}
                              >
                                <FaEdit />
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleDeleteShift(shift.id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6}>
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">
                <FaCalendarWeek className="me-2" />
                Próximos Turnos ({upcomingShifts.length})
              </h6>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {upcomingShifts.length === 0 ? (
                <p className="text-muted text-center py-3">
                  No hay turnos próximos programados
                </p>
              ) : (
                upcomingShifts.map(shift => {
                  const statusConfig = shiftStatuses.find(s => s.value === shift.status);
                  const shiftDate = new Date(shift.date);
                  return (
                    <div key={shift.id} className="border-bottom py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{getEmployeeName(shift.employee_id)}</h6>
                          <p className="mb-1 text-muted small">
                            {shiftDate.toLocaleDateString('es-ES', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short' 
                            })} • {shift.position}
                          </p>
                          <p className="mb-1 small">
                            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                          </p>
                        </div>
                        <div className="text-end">
                          <Badge bg={statusConfig?.color || 'secondary'} className="mb-2">
                            {statusConfig?.label || shift.status}
                          </Badge>
                          {(userRole === 'admin' || userRole === 'manager') && (
                            <div>
                              <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="me-1"
                                onClick={() => handleEditShift(shift)}
                              >
                                <FaEdit />
                              </Button>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleDeleteShift(shift.id)}
                              >
                                <FaTrash />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    );
  };

  // Modal de Turno
  const ShiftModal = () => (
    <Modal show={showShiftModal} onHide={() => {
      setShowShiftModal(false);
      setEditingShift(null);
      setShiftForm({
        employee_id: '',
        date: '',
        start_time: '',
        end_time: '',
        position: '',
        notes: '',
        status: 'scheduled'
      });
    }} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          {editingShift ? 'Editar Turno' : 'Crear Nuevo Turno'}
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={editingShift ? handleUpdateShift : handleCreateShift}>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Empleado *</Form.Label>
                <Form.Select
                  value={shiftForm.employee_id}
                  onChange={(e) => setShiftForm(prev => ({...prev, employee_id: e.target.value}))}
                  required
                >
                  <option value="">Seleccionar empleado...</option>
                  {employees.map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name || employee.displayName || employee.email.split('@')[0]}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Fecha *</Form.Label>
                <Form.Control
                  type="date"
                  value={shiftForm.date}
                  onChange={(e) => setShiftForm(prev => ({...prev, date: e.target.value}))}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Hora de Inicio *</Form.Label>
                <Form.Control
                  type="time"
                  value={shiftForm.start_time}
                  onChange={(e) => setShiftForm(prev => ({...prev, start_time: e.target.value}))}
                  required
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Hora de Fin *</Form.Label>
                <Form.Control
                  type="time"
                  value={shiftForm.end_time}
                  onChange={(e) => setShiftForm(prev => ({...prev, end_time: e.target.value}))}
                  required
                />
              </Form.Group>
            </Col>
          </Row>

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Posición *</Form.Label>
                <Form.Select
                  value={shiftForm.position}
                  onChange={(e) => setShiftForm(prev => ({...prev, position: e.target.value}))}
                  required
                >
                  <option value="">Seleccionar posición...</option>
                  {positions.map(position => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>Estado</Form.Label>
                <Form.Select
                  value={shiftForm.status}
                  onChange={(e) => setShiftForm(prev => ({...prev, status: e.target.value}))}
                >
                  {shiftStatuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <Form.Label>Notas</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={shiftForm.notes}
              onChange={(e) => setShiftForm(prev => ({...prev, notes: e.target.value}))}
              placeholder="Notas adicionales sobre el turno..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowShiftModal(false);
            setEditingShift(null);
          }}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            {editingShift ? 'Actualizar Turno' : 'Crear Turno'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );

  // Loading state
  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <Spinner animation="border" variant="primary" />
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
              <Button 
                variant="link" 
                onClick={onBack}
                className="p-0 mb-2"
              >
                <FaArrowLeft className="me-2" />
                Volver al Dashboard
              </Button>
              <h2 style={{ color: '#1e293b', fontFamily: 'Raleway, sans-serif' }}>
                <FaCalendarAlt className="me-3" style={{ color: '#10b981' }} />
                Gestión de Turnos
              </h2>
              <p className="text-muted mb-0">Sistema completo de horarios y personal</p>
            </div>
            <div className="d-flex gap-2">
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
              <p className="mb-0">Turnos Hoy</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#3b82f6', color: 'white' }}>
            <Card.Body>
              <h3>{employees.length}</h3>
              <p className="mb-0">Empleados</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#f59e0b', color: 'white' }}>
            <Card.Body>
              <h3>{shifts.filter(s => s.status === 'in_progress').length}</h3>
              <p className="mb-0">En Progreso</p>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#8b5cf6', color: 'white' }}>
            <Card.Body>
              <h3>{swapRequests.filter(s => s.status === 'pending').length}</h3>
              <p className="mb-0">Intercambios Pendientes</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs de navegación */}
      <Tabs
        activeKey={currentView}
        onSelect={(k) => setCurrentView(k)}
        className="mb-4"
      >
        <Tab eventKey="calendar" title={
          <span><FaCalendarWeek className="me-2" />Calendario</span>
        }>
          <WeeklyCalendar />
        </Tab>
        
        <Tab eventKey="shifts" title={
          <span><FaClipboardCheck className="me-2" />Lista de Turnos</span>
        }>
          <ShiftsList />
        </Tab>

        <Tab eventKey="employees" title={
          <span><FaUsers className="me-2" />Empleados</span>
        }>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <h5 className="mb-0">Lista de Empleados</h5>
            </Card.Header>
            <Card.Body>
              {employees.length === 0 ? (
                <Alert variant="info">
                  <h6>No hay empleados registrados</h6>
                  <p className="mb-0">Los empleados aparecerán automáticamente cuando se registren en el sistema.</p>
                </Alert>
              ) : (
                <div className="row">
                  {employees.map(employee => {
                    const employeeShifts = shifts.filter(s => 
                      s.employee_id === employee.id && 
                      s.date >= new Date().toISOString().split('T')[0]
                    );
                    
                    return (
                      <div key={employee.id} className="col-md-6 col-lg-4 mb-3">
                        <Card className="h-100">
                          <Card.Body>
                            <div className="d-flex align-items-center mb-2">
                              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center me-3" 
                                   style={{ width: '40px', height: '40px' }}>
                                <FaUser className="text-white" />
                              </div>
                              <div>
                                <h6 className="mb-0">
                                  {employee.name || employee.displayName || employee.email.split('@')[0]}
                                </h6>
                                <small className="text-muted">{employee.email}</small>
                              </div>
                            </div>
                            
                            <div className="mb-2">
                              <Badge bg="secondary" className="me-1">
                                {employee.role || 'employee'}
                              </Badge>
                              {employee.active !== false && (
                                <Badge bg="success">Activo</Badge>
                              )}
                            </div>
                            
                            <p className="small text-muted mb-2">
                              <strong>Próximos turnos:</strong> {employeeShifts.length}
                            </p>
                            
                            {employeeShifts.slice(0, 2).map(shift => (
                              <div key={shift.id} className="small mb-1">
                                <Badge bg="outline-primary" className="me-1">
                                  {new Date(shift.date).toLocaleDateString('es-ES', { 
                                    day: 'numeric', 
                                    month: 'short' 
                                  })}
                                </Badge>
                                {shift.position} • {formatTime(shift.start_time)}
                              </div>
                            ))}
                          </Card.Body>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="swaps" title={
          <span>
            <FaExchangeAlt className="me-2" />
            Intercambios
            {swapRequests.filter(s => s.status === 'pending').length > 0 && (
              <Badge bg="danger" className="ms-1">
                {swapRequests.filter(s => s.status === 'pending').length}
              </Badge>
            )}
          </span>
        }>
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-white border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Solicitudes de Intercambio</h5>
                <Button 
                  variant="outline-primary" 
                  onClick={() => setShowSwapModal(true)}
                >
                  <FaPlus className="me-2" />
                  Nueva Solicitud
                </Button>
              </div>
            </Card.Header>
            <Card.Body>
              {swapRequests.length === 0 ? (
                <Alert variant="info">
                  <h6>No hay solicitudes de intercambio</h6>
                  <p className="mb-0">Las solicitudes de intercambio aparecerán aquí cuando los empleados las generen.</p>
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table hover>
                    <thead>
                      <tr>
                        <th>Turno Original</th>
                        <th>Empleado Solicitante</th>
                        <th>Empleado Objetivo</th>
                        <th>Razón</th>
                        <th>Estado</th>
                        <th>Fecha</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {swapRequests.map(swap => {
                        const originalShift = shifts.find(s => s.id === swap.original_shift_id);
                        return (
                          <tr key={swap.id}>
                            <td>
                              {originalShift ? (
                                <div>
                                  <strong>{originalShift.position}</strong>
                                  <br />
                                  <small className="text-muted">
                                    {new Date(originalShift.date).toLocaleDateString()} • 
                                    {formatTime(originalShift.start_time)} - {formatTime(originalShift.end_time)}
                                  </small>
                                </div>
                              ) : (
                                <span className="text-muted">Turno no encontrado</span>
                              )}
                            </td>
                            <td>{getEmployeeName(swap.requesting_employee_id)}</td>
                            <td>{getEmployeeName(swap.requested_employee_id)}</td>
                            <td>
                              <small>{swap.reason || 'Sin razón especificada'}</small>
                            </td>
                            <td>
                              <Badge bg={
                                swap.status === 'pending' ? 'warning' :
                                swap.status === 'approved' ? 'success' :
                                swap.status === 'rejected' ? 'danger' : 'secondary'
                              }>
                                {swap.status === 'pending' ? 'Pendiente' :
                                 swap.status === 'approved' ? 'Aprobado' :
                                 swap.status === 'rejected' ? 'Rechazado' : swap.status}
                              </Badge>
                            </td>
                            <td>
                              <small>
                                {swap.created_at?.toDate ? 
                                  swap.created_at.toDate().toLocaleDateString() : 
                                  'Fecha no disponible'
                                }
                              </small>
                            </td>
                            <td>
                              {swap.status === 'pending' && (userRole === 'admin' || userRole === 'manager') && (
                                <div className="d-flex gap-1">
                                  <Button 
                                    variant="outline-success" 
                                    size="sm"
                                    onClick={() => {
                                      // TODO: Implementar aprobación de intercambio
                                      console.log('Aprobar intercambio:', swap.id);
                                    }}
                                  >
                                    <FaCheckCircle />
                                  </Button>
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => {
                                      // TODO: Implementar rechazo de intercambio
                                      console.log('Rechazar intercambio:', swap.id);
                                    }}
                                  >
                                    <FaTimesCircle />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                </div>
              )}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modal de Turno */}
      <ShiftModal />

      {/* Modal de Intercambio de Turno */}
      <Modal show={showSwapModal} onHide={() => setShowSwapModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Solicitud de Intercambio</Modal.Title>
        </Modal.Header>
        <Form onSubmit={async (e) => {
          e.preventDefault();
          try {
            await addDoc(collection(db, 'shift_swaps'), {
              ...swapForm,
              requesting_employee_id: user.uid,
              status: 'pending',
              created_at: serverTimestamp()
            });
            setSuccess('Solicitud de intercambio enviada');
            setShowSwapModal(false);
            setSwapForm({
              original_shift_id: '',
              requested_employee_id: '',
              reason: ''
            });
          } catch (error) {
            setError('Error al enviar solicitud de intercambio');
          }
        }}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Turno a Intercambiar</Form.Label>
              <Form.Select
                value={swapForm.original_shift_id}
                onChange={(e) => setSwapForm(prev => ({...prev, original_shift_id: e.target.value}))}
                required
              >
                <option value="">Seleccionar turno...</option>
                {shifts
                  .filter(shift => 
                    shift.employee_id === user.uid && 
                    shift.date >= new Date().toISOString().split('T')[0] &&
                    shift.status === 'scheduled'
                  )
                  .map(shift => (
                    <option key={shift.id} value={shift.id}>
                      {shift.position} - {new Date(shift.date).toLocaleDateString()} - 
                      {formatTime(shift.start_time)} a {formatTime(shift.end_time)}
                    </option>
                  ))
                }
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Empleado con quien intercambiar</Form.Label>
              <Form.Select
                value={swapForm.requested_employee_id}
                onChange={(e) => setSwapForm(prev => ({...prev, requested_employee_id: e.target.value}))}
                required
              >
                <option value="">Seleccionar empleado...</option>
                {employees
                  .filter(emp => emp.id !== user.uid)
                  .map(employee => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name || employee.displayName || employee.email.split('@')[0]}
                    </option>
                  ))
                }
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Razón del intercambio</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={swapForm.reason}
                onChange={(e) => setSwapForm(prev => ({...prev, reason: e.target.value}))}
                placeholder="Explica por qué necesitas hacer este intercambio..."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowSwapModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Enviar Solicitud
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default EnhancedShiftManagement;