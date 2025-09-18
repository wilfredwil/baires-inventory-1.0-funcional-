// src/components/ShiftManagement.js - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Modal, Badge, Alert, 
  Tabs, Tab, Spinner 
} from 'react-bootstrap';
import { 
  FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaClock, FaUsers, FaShare, 
  FaEye, FaBuilding, FaCopy, FaExclamationTriangle, FaCheckCircle,
  FaConciergeBell, FaUtensils, FaArrowLeft, FaSun, FaMoon,
  FaCalendarWeek, FaDollarSign, FaChartBar
} from 'react-icons/fa';
import { 
  collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, 
  orderBy, where, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import SchedulePublishing from './SchedulePublishing';
import '../styles/shifts.css';

// Configuración de tipos de turno - SOLO MAÑANA Y NOCHE
const SHIFT_TYPES = {
  morning: {
    name: 'Mañana',
    icon: FaSun,
    defaultStart: '11:00',
    defaultEnd: '17:00',
    color: '#ffc107',
    textColor: '#212529',
    bgClass: 'morning-shift'
  },
  night: {
    name: 'Noche', 
    icon: FaMoon,
    defaultStart: '16:30',
    defaultEnd: '23:00',
    color: '#343a40',
    textColor: '#ffffff',
    bgClass: 'night-shift'
  }
};

// Configuración de posiciones por departamento
const POSITIONS = {
  FOH: [
    { value: 'server', label: 'Mesero' },
    { value: 'bartender', label: 'Bartender' },
    { value: 'host', label: 'Anfitrión' },
    { value: 'manager', label: 'Manager' }
  ],
  BOH: [
    { value: 'chef', label: 'Chef' },
    { value: 'cook', label: 'Cocinero' },
    { value: 'dishwasher', label: 'Lavaplatos' },
    { value: 'prep', label: 'Preparador' }
  ]
};

// Helper functions
const getDayValue = (date) => {
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayMap[date.getDay()];
};

const getDayName = (dayValue) => {
  const dayMap = {
    'sunday': 'Dom', 'monday': 'Lun', 'tuesday': 'Mar',
    'wednesday': 'Mié', 'thursday': 'Jue', 'friday': 'Vie', 'saturday': 'Sáb'
  };
  return dayMap[dayValue] || dayValue;
};

const ShiftManagement = ({ user, userRole, onBack }) => {
  // Estados principales
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados de vista
  const [activeTab, setActiveTab] = useState('foh');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  
  // Estados adicionales para publicación rápida
  const [showQuickPublishModal, setShowQuickPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    week_start: '',
    week_end: '',
    title: '',
    message: '',
    notify_employees: true
  });
  
  // Estado del formulario de turno
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    date: '',
    shift_type: 'morning',
    start_time: '',
    end_time: '',
    position: '',
    department: 'FOH',
    notes: '',
    status: 'scheduled'
  });

  // Verificar permisos por departamento
  const canManageFOH = () => ['admin', 'manager'].includes(userRole);
  const canManageBOH = () => ['admin', 'chef'].includes(userRole);
  const canManageAll = () => userRole === 'admin';

  // Cargar datos en tiempo real
  useEffect(() => {
    if (!user) return;

    const unsubscribeShifts = onSnapshot(
      query(collection(db, 'shifts'), orderBy('date', 'desc')),
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
        const employeeData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(emp => emp.active !== false);
        setEmployees(employeeData);
      }
    );

    setLoading(false);
    return () => {
      unsubscribeShifts();
      unsubscribeEmployees();
    };
  }, [user]);

  // Funciones auxiliares
  const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    // Empezar el lunes
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    
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

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? 
      (employee.displayName || `${employee.firstName} ${employee.lastName}`) : 
      'Empleado no encontrado';
  };

  const getEmployeeDepartment = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.workInfo?.department || 'FOH';
  };

  const getEmployeeRole = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.role || '';
  };

  const getShiftsByDateAndType = (date, department, shiftType) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => 
      shift.date === dateStr && 
      shift.department === department &&
      shift.shift_type === shiftType
    );
  };

  const getAvailableEmployees = (department) => {
    return employees.filter(emp => 
      emp.active !== false && 
      emp.status !== 'inactive' &&
      emp.workInfo?.department === department
    );
  };

  // Handlers
  const handleShiftFormChange = (e) => {
    const { name, value } = e.target;
    let newForm = { ...shiftForm, [name]: value };

    // Auto-completar horarios según el tipo de turno
    if (name === 'shift_type') {
      const shiftType = SHIFT_TYPES[value];
      newForm.start_time = shiftType.defaultStart;
      newForm.end_time = shiftType.defaultEnd;
    }

    // Auto-completar departamento y posición del empleado
    if (name === 'employee_id') {
      const employee = employees.find(emp => emp.id === value);
      if (employee) {
        newForm.department = employee.workInfo?.department || activeTab.toUpperCase();
        
        // Auto-llenar la posición con el rol del empleado
        const employeeRole = employee.role;
        newForm.position = employeeRole || '';
        
        // Si el empleado tiene una posición específica en workInfo, usar esa
        if (employee.workInfo?.position) {
          newForm.position = employee.workInfo.position;
        }
      }
    }

    setShiftForm(newForm);
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    
    if (!shiftForm.employee_id || !shiftForm.date || !shiftForm.shift_type) {
      setError('Empleado, fecha y tipo de turno son obligatorios');
      return;
    }

    try {
      const employee = employees.find(emp => emp.id === shiftForm.employee_id);
      
      // Verificar que no haya conflictos
      const existingShifts = shifts.filter(shift => 
        shift.employee_id === shiftForm.employee_id && 
        shift.date === shiftForm.date &&
        shift.id !== editingShift?.id
      );

      if (existingShifts.length > 0) {
        setError('Este empleado ya tiene un turno asignado para este día');
        return;
      }

      const shiftData = {
        ...shiftForm,
        employee_name: employee.displayName || `${employee.firstName} ${employee.lastName}`,
        employee_role: employee.role,
        employee_department: employee.workInfo?.department,
        created_at: serverTimestamp(),
        created_by: user.email
      };

      if (editingShift) {
        await updateDoc(doc(db, 'shifts', editingShift.id), {
          ...shiftData,
          updated_at: serverTimestamp(),
          updated_by: user.email
        });
        setSuccess('Turno actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'shifts'), shiftData);
        setSuccess('Turno creado exitosamente');
      }

      setShiftForm({
        employee_id: '',
        date: '',
        shift_type: 'morning',
        start_time: '',
        end_time: '',
        position: '',
        department: activeTab.toUpperCase(),
        notes: '',
        status: 'scheduled'
      });
      setEditingShift(null);
      setShowShiftModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al procesar el turno: ' + err.message);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      employee_id: shift.employee_id,
      date: shift.date,
      shift_type: shift.shift_type || 'morning',
      start_time: shift.start_time,
      end_time: shift.end_time,
      position: shift.position || '',
      department: shift.department,
      notes: shift.notes || '',
      status: shift.status || 'scheduled'
    });
    setShowShiftModal(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno?')) {
      try {
        await deleteDoc(doc(db, 'shifts', shiftId));
        setSuccess('Turno eliminado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Error al eliminar el turno');
      }
    }
  };

  const changeWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  // Función para publicación rápida
  const handleQuickPublish = () => {
    const weekDates = getWeekDates(currentWeek);
    const weekStart = weekDates[0].toISOString().split('T')[0];
    const weekEnd = weekDates[6].toISOString().split('T')[0];
    const currentDepartment = activeTab.toUpperCase();
    
    setPublishForm({
      week_start: weekStart,
      week_end: weekEnd,
      title: `Horarios ${currentDepartment} - Semana ${weekDates[0].toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}`,
      message: `Horarios del departamento ${currentDepartment} para la semana del ${weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} al ${weekDates[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.`,
      notify_employees: true
    });
    
    setShowQuickPublishModal(true);
  };

  const handlePublishFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPublishForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitQuickPublish = async (e) => {
    e.preventDefault();
    
    try {
      const weekDates = getWeekDates(currentWeek);
      const currentDepartment = activeTab.toUpperCase();
      
      // Obtener turnos de la semana actual para este departamento
      const weekShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= weekDates[0] && 
               shiftDate <= weekDates[6] && 
               shift.department === currentDepartment;
      });

      if (weekShifts.length === 0) {
        setError('No hay turnos para publicar en esta semana');
        return;
      }

      // Calcular estadísticas
      const totalHours = weekShifts.reduce((acc, shift) => {
        const start = new Date(`2000-01-01 ${shift.start_time}`);
        const end = new Date(`2000-01-01 ${shift.end_time}`);
        if (end < start) end.setDate(end.getDate() + 1);
        return acc + (end - start) / (1000 * 60 * 60);
      }, 0);

      const stats = {
        totalShifts: weekShifts.length,
        employeesCount: new Set(weekShifts.map(shift => shift.employee_id)).size,
        totalHours: totalHours.toFixed(1),
        department: currentDepartment
      };

      const scheduleData = {
        ...publishForm,
        status: 'published',
        department: currentDepartment,
        created_by: user.email,
        created_by_name: user.displayName || user.email.split('@')[0],
        created_at: serverTimestamp(),
        shifts_included: weekShifts.map(shift => shift.id),
        stats,
        employee_responses: {},
        reminder_sent: false
      };

      // Crear el documento del horario publicado y obtener su referencia
      const docRef = await addDoc(collection(db, 'published_schedules'), scheduleData);
      const scheduleId = docRef.id; // Ahora tenemos el ID real del documento

      // Notificar empleados si está habilitado
      if (publishForm.notify_employees) {
        const employeeIds = [...new Set(weekShifts.map(shift => shift.employee_id))];
        
        for (const employeeId of employeeIds) {
          await addDoc(collection(db, 'notifications'), {
            employee_id: employeeId,
            type: 'schedule_published',
            title: 'Nuevo Horario Publicado',
            message: `Se ha publicado el horario ${currentDepartment} para la semana del ${weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`,
            schedule_id: scheduleId, // Usar el ID real del documento creado
            read: false,
            created_at: serverTimestamp()
          });
        }
      }

      setSuccess(`Horario ${currentDepartment} publicado exitosamente`);
      setShowQuickPublishModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error publishing schedule:', err);
      setError('Error al publicar el horario: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  const weekDates = getWeekDates(currentWeek);
  const currentDepartment = activeTab.toUpperCase();

  return (
    <Container fluid className="px-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center">
              {onBack && (
                <Button variant="outline-secondary" onClick={onBack} className="me-3">
                  <FaArrowLeft />
                </Button>
              )}
              <h2 className="mb-0">
                <FaCalendarWeek className="me-2" />
                Gestión de Horarios
              </h2>
            </div>
            <Button 
              variant="primary" 
              onClick={() => {
                setShiftForm({
                  ...shiftForm,
                  department: currentDepartment,
                  shift_type: 'morning',
                  start_time: SHIFT_TYPES.morning.defaultStart,
                  end_time: SHIFT_TYPES.morning.defaultEnd
                });
                setShowShiftModal(true);
              }}
            >
              <FaPlus className="me-1" />
              Nuevo Turno
            </Button>
          </div>

          {/* Alertas */}
          {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
          {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}
        </Col>
      </Row>

      {/* Tabs por departamento */}
      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        {canManageFOH() && (
          <Tab eventKey="foh" title={
            <span><FaConciergeBell className="me-1" />Front of House</span>
          } />
        )}
        
        {canManageBOH() && (
          <Tab eventKey="boh" title={
            <span><FaUtensils className="me-1" />Back of House</span>
          } />
        )}
        
        <Tab eventKey="published" title={
          <span><FaShare className="me-1" />Horarios Publicados</span>
        }>
          <SchedulePublishing 
            user={user} 
            userRole={userRole} 
            shifts={shifts}
            employees={employees}
          />
        </Tab>
      </Tabs>

      {/* Vista del horario por departamento */}
      {(activeTab === 'foh' || activeTab === 'boh') && (
        <>
          {/* Navegación de semana */}
          <Row className="mb-4">
            <Col md={8}>
              <div className="d-flex align-items-center gap-3">
                <Button variant="outline-secondary" onClick={() => changeWeek(-1)}>
                  ‹ Anterior
                </Button>
                <h4 className="mb-0">
                  {weekDates[0].toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })} - {' '}
                  {weekDates[6].toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
                </h4>
                <Button variant="outline-secondary" onClick={() => changeWeek(1)}>
                  Siguiente ›
                </Button>
                <Button variant="outline-info" onClick={() => setCurrentWeek(new Date())}>
                  Hoy
                </Button>
              </div>
            </Col>
            <Col md={4} className="text-end">
              <div className="d-flex gap-2 justify-content-end align-items-center">
                <Badge bg="info" className="me-2">
                  {currentDepartment === 'FOH' ? 'Front of House' : 'Back of House'}
                </Badge>
                {(userRole === 'admin' || userRole === 'manager') && (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={handleQuickPublish}
                    className="d-flex align-items-center"
                  >
                    <FaShare className="me-1" />
                    Publicar Semana
                  </Button>
                )}
              </div>
            </Col>
          </Row>

          {/* Calendario estilo 7shifts */}
          <Card className="schedule-card">
            <Card.Header className="schedule-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  Horarios {currentDepartment} - Semana
                </h5>
                <div className="d-flex gap-2">
                  <Badge bg="warning" className="d-flex align-items-center">
                    <FaSun className="me-1" />
                    Mañana (11:00 - 17:00)
                  </Badge>
                  <Badge bg="dark" className="d-flex align-items-center">
                    <FaMoon className="me-1" />
                    Noche (16:30 - 23:00)
                  </Badge>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="schedule-grid-7shifts">
                {/* Header de días */}
                <div className="days-header">
                  {weekDates.map(date => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    const morningShifts = getShiftsByDateAndType(date, currentDepartment, 'morning');
                    const nightShifts = getShiftsByDateAndType(date, currentDepartment, 'night');
                    
                    return (
                      <div key={date.toISOString()} className={`day-column ${isToday ? 'today' : ''}`}>
                        <div className="day-header">
                          <div className="day-name">
                            {getDayName(getDayValue(date))}
                          </div>
                          <div className="day-date">
                            {date.getDate()}/{date.getMonth() + 1}
                          </div>
                          <div className="day-stats">
                            <small className="text-muted">
                              {morningShifts.length + nightShifts.length} turnos
                            </small>
                          </div>
                        </div>

                        {/* TURNO DE MAÑANA */}
                        <div className="shift-section morning-section">
                          <div className="shift-type-header morning-header">
                            <FaSun className="me-1" />
                            Mañana
                            <Badge bg="light" text="dark" className="ms-1">
                              {morningShifts.length}
                            </Badge>
                          </div>
                          <div className="shifts-container">
                            {morningShifts.map(shift => (
                              <div
                                key={shift.id}
                                className="shift-block morning-shift"
                                onClick={() => handleEditShift(shift)}
                              >
                                <div className="employee-name">
                                  {getEmployeeName(shift.employee_id)}
                                </div>
                                <div className="shift-time">
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </div>
                                {shift.position && (
                                  <div className="shift-position">
                                    {POSITIONS[currentDepartment]?.find(p => p.value === shift.position)?.label || shift.position}
                                    {shift.position !== getEmployeeRole(shift.employee_id) && (
                                      <span className="text-muted small"> (temporal)</span>
                                    )}
                                  </div>
                                )}
                                <div className="shift-actions">
                                  <Button
                                    size="sm"
                                    variant="link"
                                    className="text-danger p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteShift(shift.id);
                                    }}
                                  >
                                    <FaTrash />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            
                            {/* Botón agregar turno mañana */}
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="add-shift-btn morning-add"
                              onClick={() => {
                                setShiftForm({
                                  employee_id: '',
                                  date: date.toISOString().split('T')[0],
                                  shift_type: 'morning',
                                  start_time: SHIFT_TYPES.morning.defaultStart,
                                  end_time: SHIFT_TYPES.morning.defaultEnd,
                                  position: '',
                                  department: currentDepartment,
                                  notes: '',
                                  status: 'scheduled'
                                });
                                setShowShiftModal(true);
                              }}
                            >
                              <FaPlus />
                            </Button>
                          </div>
                        </div>

                        {/* TURNO DE NOCHE */}
                        <div className="shift-section night-section">
                          <div className="shift-type-header night-header">
                            <FaMoon className="me-1" />
                            Noche
                            <Badge bg="light" text="dark" className="ms-1">
                              {nightShifts.length}
                            </Badge>
                          </div>
                          <div className="shifts-container">
                            {nightShifts.map(shift => (
                              <div
                                key={shift.id}
                                className="shift-block night-shift"
                                onClick={() => handleEditShift(shift)}
                              >
                                <div className="employee-name">
                                  {getEmployeeName(shift.employee_id)}
                                </div>
                                <div className="shift-time">
                                  {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                </div>
                                {shift.position && (
                                  <div className="shift-position">
                                    {POSITIONS[currentDepartment]?.find(p => p.value === shift.position)?.label || shift.position}
                                    {shift.position !== getEmployeeRole(shift.employee_id) && (
                                      <span className="text-muted small"> (temporal)</span>
                                    )}
                                  </div>
                                )}
                                <div className="shift-actions">
                                  <Button
                                    size="sm"
                                    variant="link"
                                    className="text-danger p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteShift(shift.id);
                                    }}
                                  >
                                    <FaTrash />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            
                            {/* Botón agregar turno noche */}
                            <Button
                              variant="outline-dark"
                              size="sm"
                              className="add-shift-btn night-add"
                              onClick={() => {
                                setShiftForm({
                                  employee_id: '',
                                  date: date.toISOString().split('T')[0],
                                  shift_type: 'night',
                                  start_time: SHIFT_TYPES.night.defaultStart,
                                  end_time: SHIFT_TYPES.night.defaultEnd,
                                  position: '',
                                  department: currentDepartment,
                                  notes: '',
                                  status: 'scheduled'
                                });
                                setShowShiftModal(true);
                              }}
                            >
                              <FaPlus />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card.Body>
          </Card>
        </>
      )}

      {/* Modal para crear/editar turno */}
      <Modal show={showShiftModal} onHide={() => {
        setShowShiftModal(false);
        setEditingShift(null);
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingShift ? 'Editar Turno' : 'Crear Nuevo Turno'}
            <Badge bg={activeTab === 'foh' ? 'warning' : 'info'} className="ms-2">
              {currentDepartment}
            </Badge>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleCreateShift}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Empleado *</Form.Label>
                  <Form.Select
                    value={shiftForm.employee_id}
                    onChange={handleShiftFormChange}
                    name="employee_id"
                    required
                  >
                    <option value="">Seleccionar empleado...</option>
                    {getAvailableEmployees(currentDepartment).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`} - {emp.role}
                      </option>
                    ))}
                  </Form.Select>
                  {shiftForm.employee_id && (
                    <Form.Text className="text-success">
                      ✅ Posición auto-asignada: {shiftForm.position}
                      {shiftForm.position !== employees.find(e => e.id === shiftForm.employee_id)?.role && 
                        ' (modificada para este turno)'
                      }
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha *</Form.Label>
                  <Form.Control
                    type="date"
                    value={shiftForm.date}
                    onChange={handleShiftFormChange}
                    name="date"
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Turno *</Form.Label>
                  <div className="d-flex gap-2">
                    <Button
                      variant={shiftForm.shift_type === 'morning' ? 'warning' : 'outline-warning'}
                      onClick={() => handleShiftFormChange({
                        target: { name: 'shift_type', value: 'morning' }
                      })}
                      className="flex-fill"
                    >
                      <FaSun className="me-1" />
                      Mañana
                    </Button>
                    <Button
                      variant={shiftForm.shift_type === 'night' ? 'dark' : 'outline-dark'}
                      onClick={() => handleShiftFormChange({
                        target: { name: 'shift_type', value: 'night' }
                      })}
                      className="flex-fill"
                    >
                      <FaMoon className="me-1" />
                      Noche
                    </Button>
                  </div>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora de inicio</Form.Label>
                  <Form.Control
                    type="time"
                    value={shiftForm.start_time}
                    onChange={handleShiftFormChange}
                    name="start_time"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora de fin</Form.Label>
                  <Form.Control
                    type="time"
                    value={shiftForm.end_time}
                    onChange={handleShiftFormChange}
                    name="end_time"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Posición 
                    {shiftForm.employee_id && (
                      <small className="text-muted ms-1">
                        (Puedes cambiarla para este turno)
                      </small>
                    )}
                  </Form.Label>
                  <Form.Select
                    value={shiftForm.position}
                    onChange={handleShiftFormChange}
                    name="position"
                  >
                    <option value="">Seleccionar posición...</option>
                    {POSITIONS[currentDepartment]?.map(pos => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </Form.Select>
                  {shiftForm.employee_id && shiftForm.position && (
                    <Form.Text className="text-info">
                      💼 Posición original del empleado: {
                        employees.find(e => e.id === shiftForm.employee_id)?.role || 'No especificada'
                      }
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <Form.Select
                    value={shiftForm.status}
                    onChange={handleShiftFormChange}
                    name="status"
                  >
                    <option value="scheduled">Programado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="pending">Pendiente</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={2}
                value={shiftForm.notes}
                onChange={handleShiftFormChange}
                name="notes"
                placeholder="Notas adicionales sobre el turno..."
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                <FaCheckCircle className="me-1" />
                {editingShift ? 'Actualizar' : 'Crear'} Turno
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para publicación rápida */}
      <Modal show={showQuickPublishModal} onHide={() => setShowQuickPublishModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaShare className="me-2" />
            Publicar Horario {currentDepartment}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info">
            <FaCalendarWeek className="me-2" />
            <strong>Semana seleccionada:</strong> {weekDates[0].toLocaleDateString('es-ES', { 
              weekday: 'long', day: 'numeric', month: 'long' 
            })} - {weekDates[6].toLocaleDateString('es-ES', { 
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
            })}
          </Alert>

          {/* Resumen de turnos */}
          <Card className="mb-3">
            <Card.Header>
              <h6 className="mb-0">Resumen de Turnos {currentDepartment}</h6>
            </Card.Header>
            <Card.Body>
              <Row>
                {weekDates.map(date => {
                  const morningShifts = getShiftsByDateAndType(date, currentDepartment, 'morning');
                  const nightShifts = getShiftsByDateAndType(date, currentDepartment, 'night');
                  const totalShifts = morningShifts.length + nightShifts.length;
                  
                  return (
                    <Col key={date.toISOString()} className="text-center mb-2">
                      <div className="small fw-bold">{getDayName(getDayValue(date))}</div>
                      <div className="small text-muted">{date.getDate()}/{date.getMonth() + 1}</div>
                      <Badge bg={totalShifts > 0 ? 'success' : 'secondary'}>
                        {totalShifts} turnos
                      </Badge>
                      {totalShifts > 0 && (
                        <div className="small mt-1">
                          <Badge bg="warning" size="sm" className="me-1">{morningShifts.length}M</Badge>
                          <Badge bg="dark" size="sm">{nightShifts.length}N</Badge>
                        </div>
                      )}
                    </Col>
                  );
                })}
              </Row>
            </Card.Body>
          </Card>

          <Form onSubmit={handleSubmitQuickPublish}>
            <Form.Group className="mb-3">
              <Form.Label>Título del Horario</Form.Label>
              <Form.Control
                type="text"
                value={publishForm.title}
                onChange={handlePublishFormChange}
                name="title"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Mensaje para los Empleados</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={publishForm.message}
                onChange={handlePublishFormChange}
                name="message"
                placeholder="Mensaje opcional para incluir en la notificación..."
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Notificar empleados por email/notificación"
                checked={publishForm.notify_employees}
                onChange={handlePublishFormChange}
                name="notify_employees"
              />
            </Form.Group>

            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowQuickPublishModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="success">
                <FaShare className="me-1" />
                Publicar Horario
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </Container>
  );
};

export default ShiftManagement;