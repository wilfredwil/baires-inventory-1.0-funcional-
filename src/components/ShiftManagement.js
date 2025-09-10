// src/components/ShiftManagement.js
import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Modal, Table, Badge, Alert, Tabs, Tab, Spinner } from 'react-bootstrap';
import { FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaClock, FaUsers, FaStickyNote, FaExchangeAlt, FaCheck, FaTimes, FaCalendarWeek, FaUserClock, FaShare } from 'react-icons/fa';
import { collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, orderBy, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import SchedulePublishing from './SchedulePublishing';

const ShiftManagement = ({ user, userRole, onBack }) => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shiftNotes, setShiftNotes] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modales
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  
  // Estado del formulario de turno
  const [editingShift, setEditingShift] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    title: '',
    employee_id: '',
    employee_name: '',
    date: '',
    start_time: '',
    end_time: '',
    position: '',
    notes: '',
    status: 'scheduled'
  });

  // Estado de notas de turno
  const [noteForm, setNoteForm] = useState({
    shift_id: '',
    content: '',
    priority: 'normal',
    category: 'general'
  });

  // Estado de cambios de turno
  const [swapForm, setSwapForm] = useState({
    requesting_shift_id: '',
    target_shift_id: '',
    reason: ''
  });

  // Vista actual
  const [currentView, setCurrentView] = useState('calendar');
  const [selectedWeek, setSelectedWeek] = useState(new Date());

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

  const priorities = [
    { value: 'low', label: 'Baja', color: 'success' },
    { value: 'normal', label: 'Normal', color: 'primary' },
    { value: 'high', label: 'Alta', color: 'warning' },
    { value: 'urgent', label: 'Urgente', color: 'danger' }
  ];

  const noteCategories = [
    { value: 'general', label: 'General' },
    { value: 'inventory', label: 'Inventario' },
    { value: 'customer', label: 'Clientes' },
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'staff', label: 'Personal' },
    { value: 'finance', label: 'Finanzas' }
  ];

  // Cargar datos
  useEffect(() => {
    const unsubscribeShifts = onSnapshot(
      query(collection(db, 'shifts'), orderBy('date', 'desc')),
      (snapshot) => {
        const shiftData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setShifts(shiftData);
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

    const unsubscribeNotes = onSnapshot(
      query(collection(db, 'shift_notes'), orderBy('created_at', 'desc')),
      (snapshot) => {
        const noteData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setShiftNotes(noteData);
      }
    );

    const unsubscribeSwaps = onSnapshot(
      query(collection(db, 'shift_swaps'), orderBy('created_at', 'desc')),
      (snapshot) => {
        const swapData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setSwapRequests(swapData);
      }
    );

    setLoading(false);

    return () => {
      unsubscribeShifts();
      unsubscribeEmployees();
      unsubscribeNotes();
      unsubscribeSwaps();
    };
  }, []);

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

  const getShiftDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return '';
    const start = new Date(`2000-01-01 ${startTime}`);
    const end = new Date(`2000-01-01 ${endTime}`);
    if (end < start) end.setDate(end.getDate() + 1); // Turno nocturno
    
    const diff = (end - start) / (1000 * 60 * 60);
    return `${diff.toFixed(1)}h`;
  };

  const getShiftsByDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => shift.date === dateStr);
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId || emp.email === employeeId);
    return employee ? (employee.displayName || employee.email.split('@')[0]) : 'Empleado no encontrado';
  };

  // Handlers
  const handleShiftFormChange = (e) => {
    const { name, value } = e.target;
    setShiftForm(prev => ({
      ...prev,
      [name]: value
    }));

    // Auto-llenar nombre del empleado
    if (name === 'employee_id') {
      const employee = employees.find(emp => emp.id === value);
      setShiftForm(prev => ({
        ...prev,
        employee_name: employee ? (employee.displayName || employee.email.split('@')[0]) : ''
      }));
    }
  };

  const handleSubmitShift = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const shiftData = {
        ...shiftForm,
        created_by: user.email,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      };

      if (editingShift) {
        await updateDoc(doc(db, 'shifts', editingShift.id), {
          ...shiftData,
          created_at: editingShift.created_at // Mantener fecha de creación original
        });
        setSuccess('Turno actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'shifts'), shiftData);
        setSuccess('Turno creado exitosamente');
      }

      setShowShiftModal(false);
      resetShiftForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving shift:', err);
      setError('Error al guardar el turno: ' + err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleEditShift = (shift) => {
    setEditingShift(shift);
    setShiftForm({
      title: shift.title || '',
      employee_id: shift.employee_id || '',
      employee_name: shift.employee_name || '',
      date: shift.date || '',
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
      position: shift.position || '',
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
        console.error('Error deleting shift:', err);
        setError('Error al eliminar el turno');
        setTimeout(() => setError(''), 3000);
      }
    }
  };

  const handleSubmitNote = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await addDoc(collection(db, 'shift_notes'), {
        ...noteForm,
        author: user.email,
        author_name: user.displayName || user.email.split('@')[0],
        created_at: serverTimestamp()
      });

      setSuccess('Nota agregada exitosamente');
      setShowNoteModal(false);
      setNoteForm({ shift_id: '', content: '', priority: 'normal', category: 'general' });
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving note:', err);
      setError('Error al guardar la nota');
      setTimeout(() => setError(''), 3000);
    }
  };

  const resetShiftForm = () => {
    setEditingShift(null);
    setShiftForm({
      title: '',
      employee_id: '',
      employee_name: '',
      date: '',
      start_time: '',
      end_time: '',
      position: '',
      notes: '',
      status: 'scheduled'
    });
  };

  const weekDates = getWeekDates(selectedWeek);
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (loading) {
    return (
      <Container>
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </Spinner>
          <p className="mt-3">Cargando gestión de horarios...</p>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid>
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h2>
                <FaCalendarAlt className="me-2" />
                Gestión de Horarios
              </h2>
              <p className="text-muted mb-0">Sistema de turnos y notas estilo ShiftNotes</p>
            </div>
            <div>
              <Button variant="outline-secondary" onClick={onBack} className="me-2">
                Volver al Dashboard
              </Button>
              {(userRole === 'admin' || userRole === 'manager') && (
                <Button variant="primary" onClick={() => setShowShiftModal(true)}>
                  <FaPlus className="me-1" />
                  Nuevo Turno
                </Button>
              )}
            </div>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{success}</Alert>}

      {/* Tabs de Navegación */}
      <Tab eventKey="publish" title={<><FaShare className="me-1" />Publicar Horarios</>}>
      <SchedulePublishing 
       shifts={shifts}
       employees={employees}
       user={user}
       userRole={userRole}
      />
      </Tab>
      <Tabs activeKey={currentView} onSelect={(k) => setCurrentView(k)} className="mb-4">
        <Tab eventKey="calendar" title={<><FaCalendarWeek className="me-1" />Calendario Semanal</>}>
          {/* Vista de Calendario */}
          <Card>
            <Card.Header>
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Horarios de la Semana</h5>
                <div className="d-flex align-items-center gap-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => {
                      const newWeek = new Date(selectedWeek);
                      newWeek.setDate(newWeek.getDate() - 7);
                      setSelectedWeek(newWeek);
                    }}
                  >
                    ← Anterior
                  </Button>
                  <span className="mx-2">
                    {selectedWeek.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
                  </span>
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={() => {
                      const newWeek = new Date(selectedWeek);
                      newWeek.setDate(newWeek.getDate() + 7);
                      setSelectedWeek(newWeek);
                    }}
                  >
                    Siguiente →
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => setSelectedWeek(new Date())}
                  >
                    Hoy
                  </Button>
                </div>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '100px' }}>Horario</th>
                      {weekDates.map((date, index) => (
                        <th key={index} className="text-center">
                          <div>{dayNames[index]}</div>
                          <small className="text-muted">
                            {date.getDate()}/{date.getMonth() + 1}
                          </small>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Turnos de Mañana */}
                    <tr className="table-light">
                      <td className="fw-bold">Mañana<br/><small>06:00-14:00</small></td>
                      {weekDates.map((date, index) => {
                        const dayShifts = getShiftsByDate(date).filter(shift => {
                          const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
                          return startHour >= 6 && startHour < 14;
                        });
                        return (
                          <td key={index} className="p-2" style={{ minHeight: '80px', verticalAlign: 'top' }}>
                            {dayShifts.map(shift => (
                              <div key={shift.id} className="mb-1">
                                <div 
                                  className={`card border-0 p-2 ${shift.status === 'completed' ? 'bg-success' : shift.status === 'cancelled' ? 'bg-danger' : 'bg-primary'} text-white`}
                                  style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                  onClick={() => handleEditShift(shift)}
                                >
                                  <div className="fw-bold">{shift.employee_name || getEmployeeName(shift.employee_id)}</div>
                                  <div>{shift.position}</div>
                                  <div>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                                  {shift.notes && <div className="text-truncate" title={shift.notes}>📝 {shift.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Turnos de Tarde */}
                    <tr>
                      <td className="fw-bold">Tarde<br/><small>14:00-22:00</small></td>
                      {weekDates.map((date, index) => {
                        const dayShifts = getShiftsByDate(date).filter(shift => {
                          const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
                          return startHour >= 14 && startHour < 22;
                        });
                        return (
                          <td key={index} className="p-2" style={{ minHeight: '80px', verticalAlign: 'top' }}>
                            {dayShifts.map(shift => (
                              <div key={shift.id} className="mb-1">
                                <div 
                                  className={`card border-0 p-2 ${shift.status === 'completed' ? 'bg-success' : shift.status === 'cancelled' ? 'bg-danger' : 'bg-warning'} text-dark`}
                                  style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                  onClick={() => handleEditShift(shift)}
                                >
                                  <div className="fw-bold">{shift.employee_name || getEmployeeName(shift.employee_id)}</div>
                                  <div>{shift.position}</div>
                                  <div>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                                  {shift.notes && <div className="text-truncate" title={shift.notes}>📝 {shift.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Turnos de Noche */}
                    <tr className="table-light">
                      <td className="fw-bold">Noche<br/><small>22:00-06:00</small></td>
                      {weekDates.map((date, index) => {
                        const dayShifts = getShiftsByDate(date).filter(shift => {
                          const startHour = parseInt(shift.start_time?.split(':')[0] || '0');
                          return startHour >= 22 || startHour < 6;
                        });
                        return (
                          <td key={index} className="p-2" style={{ minHeight: '80px', verticalAlign: 'top' }}>
                            {dayShifts.map(shift => (
                              <div key={shift.id} className="mb-1">
                                <div 
                                  className={`card border-0 p-2 ${shift.status === 'completed' ? 'bg-success' : shift.status === 'cancelled' ? 'bg-danger' : 'bg-dark'} text-white`}
                                  style={{ fontSize: '0.8rem', cursor: 'pointer' }}
                                  onClick={() => handleEditShift(shift)}
                                >
                                  <div className="fw-bold">{shift.employee_name || getEmployeeName(shift.employee_id)}</div>
                                  <div>{shift.position}</div>
                                  <div>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                                  {shift.notes && <div className="text-truncate" title={shift.notes}>📝 {shift.notes}</div>}
                                </div>
                              </div>
                            ))}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="notes" title={<><FaStickyNote className="me-1" />Notas de Turno</>}>
          {/* Vista de Notas */}
          <Row>
            <Col md={8}>
              <Card>
                <Card.Header>
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Notas de Turno</h5>
                    <Button variant="primary" onClick={() => setShowNoteModal(true)}>
                      <FaPlus className="me-1" />
                      Nueva Nota
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  {shiftNotes.length === 0 ? (
                    <div className="text-center text-muted p-4">
                      <FaStickyNote size={48} className="mb-3" />
                      <p>No hay notas de turno aún</p>
                    </div>
                  ) : (
                    shiftNotes.map(note => (
                      <div key={note.id} className="border-bottom pb-3 mb-3">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <Badge bg={priorities.find(p => p.value === note.priority)?.color || 'primary'}>
                                {priorities.find(p => p.value === note.priority)?.label || 'Normal'}
                              </Badge>
                              <Badge bg="secondary">
                                {noteCategories.find(c => c.value === note.category)?.label || 'General'}
                              </Badge>
                              <small className="text-muted">
                                {note.author_name} • {note.created_at?.toDate().toLocaleString('es-AR')}
                              </small>
                            </div>
                            <p className="mb-0">{note.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card>
                <Card.Header>
                  <h6 className="mb-0">Filtros</h6>
                </Card.Header>
                <Card.Body>
                  <p className="text-muted">Próximamente: filtros por categoría, prioridad y fecha</p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>

        <Tab eventKey="employees" title={<><FaUsers className="me-1" />Personal</>}>
          {/* Vista de Personal */}
          <Card>
            <Card.Header>
              <h5 className="mb-0">Personal del Restaurante</h5>
            </Card.Header>
            <Card.Body>
              <Table striped hover>
                <thead>
                  <tr>
                    <th>Empleado</th>
                    <th>Email</th>
                    <th>Rol</th>
                    <th>Turnos Esta Semana</th>
                    <th>Horas Totales</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(employee => {
                    const weekStart = new Date(selectedWeek);
                    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
                    const weekEnd = new Date(weekStart);
                    weekEnd.setDate(weekStart.getDate() + 6);
                    
                    const employeeShifts = shifts.filter(shift => 
                      (shift.employee_id === employee.id || shift.employee_id === employee.email) &&
                      new Date(shift.date) >= weekStart && 
                      new Date(shift.date) <= weekEnd
                    );

                    const totalHours = employeeShifts.reduce((total, shift) => {
                      if (shift.start_time && shift.end_time) {
                        const start = new Date(`2000-01-01 ${shift.start_time}`);
                        const end = new Date(`2000-01-01 ${shift.end_time}`);
                        if (end < start) end.setDate(end.getDate() + 1);
                        return total + (end - start) / (1000 * 60 * 60);
                      }
                      return total;
                    }, 0);

                    return (
                      <tr key={employee.id}>
                        <td>{employee.displayName || employee.email.split('@')[0]}</td>
                        <td>{employee.email}</td>
                        <td>
                          <Badge bg={
                            employee.role === 'admin' ? 'danger' :
                            employee.role === 'manager' ? 'primary' :
                            employee.role === 'bartender' ? 'success' : 'warning'
                          }>
                            {employee.role === 'admin' ? 'Admin' :
                             employee.role === 'manager' ? 'Gerente' :
                             employee.role === 'bartender' ? 'Bartender' : 'Mesero'}
                          </Badge>
                        </td>
                        <td>{employeeShifts.length}</td>
                        <td>{totalHours.toFixed(1)}h</td>
                        <td>
                          <Badge bg={employee.active !== false ? 'success' : 'secondary'}>
                            {employee.active !== false ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>

      {/* Modal para Crear/Editar Turno */}
      <Modal show={showShiftModal} onHide={() => setShowShiftModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingShift ? 'Editar Turno' : 'Nuevo Turno'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitShift}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Empleado *</Form.Label>
                  <Form.Select
                    name="employee_id"
                    value={shiftForm.employee_id}
                    onChange={handleShiftFormChange}
                    required
                  >
                    <option value="">Seleccionar empleado...</option>
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.displayName || employee.email.split('@')[0]} ({employee.email})
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
                    onChange={handleShiftFormChange}
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
                    onChange={handleShiftFormChange}
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
                    onChange={handleShiftFormChange}
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
                    onChange={handleShiftFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Título del Turno</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={shiftForm.title}
                    onChange={handleShiftFormChange}
                    placeholder="Ej: Turno de Fin de Semana"
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <Form.Select
                    name="status"
                    value={shiftForm.status}
                    onChange={handleShiftFormChange}
                  >
                    <option value="scheduled">Programado</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="completed">Completado</option>
                    <option value="cancelled">Cancelado</option>
                  </Form.Select>
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
                onChange={handleShiftFormChange}
                placeholder="Instrucciones especiales, tareas específicas, etc."
              />
            </Form.Group>

            {shiftForm.start_time && shiftForm.end_time && (
              <Alert variant="info">
                <FaClock className="me-2" />
                Duración del turno: {getShiftDuration(shiftForm.start_time, shiftForm.end_time)}
              </Alert>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              {editingShift ? 'Actualizar' : 'Crear'} Turno
            </Button>
            {editingShift && (userRole === 'admin' || userRole === 'manager') && (
              <Button 
                variant="danger" 
                onClick={() => handleDeleteShift(editingShift.id)}
                className="ms-2"
              >
                <FaTrash className="me-1" />
                Eliminar
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal para Nueva Nota */}
      <Modal show={showNoteModal} onHide={() => setShowNoteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Nueva Nota de Turno</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitNote}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prioridad</Form.Label>
                  <Form.Select
                    name="priority"
                    value={noteForm.priority}
                    onChange={(e) => setNoteForm(prev => ({...prev, priority: e.target.value}))}
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select
                    name="category"
                    value={noteForm.category}
                    onChange={(e) => setNoteForm(prev => ({...prev, category: e.target.value}))}
                  >
                    {noteCategories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Contenido de la Nota *</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="content"
                value={noteForm.content}
                onChange={(e) => setNoteForm(prev => ({...prev, content: e.target.value}))}
                placeholder="Describe la situación, tarea pendiente, incidente, etc."
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNoteModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              Guardar Nota
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default ShiftManagement;