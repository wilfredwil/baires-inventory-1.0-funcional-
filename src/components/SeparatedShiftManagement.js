import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Modal, Alert, Badge, 
  Table, Tabs, Tab, InputGroup, OverlayTrigger, Tooltip, Nav
} from 'react-bootstrap';
import { 
  FaCalendarAlt, FaPlus, FaClock, FaUsers, FaExclamationTriangle,
  FaCheck, FaTimes, FaEdit, FaTrash, FaEye, FaFilter, FaSearch,
  FaUserClock, FaCalendarCheck, FaChartBar, FaUtensils, FaConciergeBell,
  FaUserTie, FaChefHat, FaArrowLeft
} from 'react-icons/fa';
import { 
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, 
  query, orderBy, serverTimestamp, where 
} from 'firebase/firestore';
import { db } from '../firebase';

// Helper Functions para Disponibilidad
const getDayValue = (date) => {
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayMap[date.getDay()];
};

const getDayName = (dayValue) => {
  const dayMap = {
    'sunday': 'Domingo', 'monday': 'Lunes', 'tuesday': 'Martes',
    'wednesday': 'Miércoles', 'thursday': 'Jueves', 'friday': 'Viernes', 'saturday': 'Sábado'
  };
  return dayMap[dayValue] || dayValue;
};

const getAvailableEmployees = (employees, dayOfWeek, department) => {
  return employees.filter(employee => {
    // Verificar que esté activo
    if (employee.status !== 'active' || employee.active === false) return false;
    
    // Filtrar por departamento
    if (employee.workInfo?.department !== department) return false;
    
    // Verificar disponibilidad ese día
    const workDays = employee.workInfo?.schedule?.workDays || [];
    if (!workDays.includes(dayOfWeek)) return false;
    
    return true;
  });
};

const getAvailabilityStats = (employees, dayOfWeek, department) => {
  const deptEmployees = employees.filter(emp => emp.workInfo?.department === department);
  const available = deptEmployees.filter(emp => {
    const workDays = emp.workInfo?.schedule?.workDays || [];
    return workDays.includes(dayOfWeek) && emp.status === 'active';
  });
  
  return {
    total: deptEmployees.length,
    available: available.length
  };
};

const SeparatedShiftManagement = ({ onBack, user, userRole }) => {
  // Estados principales
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de vista
  const [activeTab, setActiveTab] = useState('foh'); // 'foh' o 'boh'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);

  // Estados de filtros
  const [filterRole, setFilterRole] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Estado del formulario
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    date: '',
    start_time: '',
    end_time: '',
    department: 'FOH',
    notes: '',
    status: 'scheduled'
  });

  // Verificar permisos
  const canManageFOH = () => {
    return ['admin', 'manager'].includes(userRole);
  };

  const canManageBOH = () => {
    return ['admin', 'chef'].includes(userRole);
  };

  // Cargar datos
  useEffect(() => {
    if (!user) return;

    const unsubscribeShifts = onSnapshot(
      query(collection(db, 'shifts'), orderBy('date', 'desc')),
      (snapshot) => {
        const shiftsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setShifts(shiftsData);
      }
    );

    const unsubscribeEmployees = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const employeeData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(emp => emp.active !== false);
        setEmployees(employeeData);
      }
    );

    setLoading(false);
    return () => { unsubscribeShifts(); unsubscribeEmployees(); };
  }, [user]);

  // Funciones auxiliares
  const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    start.setDate(start.getDate() - start.getDay());
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
    return employee ? (employee.displayName || `${employee.firstName} ${employee.lastName}`) : 'Empleado no encontrado';
  };

  const getShiftsByDate = (date, department) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => 
      shift.date === dateStr && 
      shift.department === department
    );
  };

  // Obtener empleados disponibles para una fecha y departamento
  const getAvailableEmployeesForDate = (date, department) => {
    const dayOfWeek = getDayValue(date);
    return getAvailableEmployees(employees, dayOfWeek, department)
      .filter(emp => {
        if (filterRole !== 'all' && emp.role !== filterRole) return false;
        if (searchTerm && !emp.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) && 
            !emp.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !emp.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
      });
  };

  // Handlers
  const handleShiftFormChange = (e) => {
    const { name, value } = e.target;
    setShiftForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!shiftForm.employee_id || !shiftForm.date || !shiftForm.start_time || !shiftForm.end_time) {
      setError('Todos los campos obligatorios deben completarse');
      return;
    }

    try {
      const employee = employees.find(emp => emp.id === shiftForm.employee_id);
      const selectedDate = new Date(shiftForm.date);
      const dayOfWeek = getDayValue(selectedDate);
      
      // Verificar disponibilidad del empleado
      const workDays = employee?.workInfo?.schedule?.workDays || [];
      if (!workDays.includes(dayOfWeek)) {
        setError(`${employee.displayName} no está disponible los ${getDayName(dayOfWeek)}s según su configuración.`);
        return;
      }

      // Verificar que el departamento coincida
      if (employee.workInfo?.department !== shiftForm.department) {
        setError(`${employee.displayName} pertenece al departamento ${employee.workInfo?.department}, no a ${shiftForm.department}.`);
        return;
      }

      await addDoc(collection(db, 'shifts'), {
        ...shiftForm,
        employee_name: employee.displayName || `${employee.firstName} ${employee.lastName}`,
        employee_role: employee.role,
        employee_department: employee.workInfo?.department,
        created_at: serverTimestamp(),
        created_by: user.email
      });

      setSuccess(`Turno ${shiftForm.department} creado exitosamente`);
      setShiftForm({ 
        employee_id: '', date: '', start_time: '', end_time: '', 
        department: activeTab.toUpperCase(), notes: '', status: 'scheduled' 
      });
      setShowShiftModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al crear el turno: ' + err.message);
    }
  };

  // Componente de disponibilidad para una fecha y departamento
  const AvailabilityCard = ({ date, department }) => {
    const dayOfWeek = getDayValue(date);
    const stats = getAvailabilityStats(employees, dayOfWeek, department);
    const assignedToday = getShiftsByDate(date, department);
    
    return (
      <Card className="mb-3 border-0 shadow-sm">
        <Card.Header className={`bg-${department === 'FOH' ? 'warning' : 'info'} text-white`}>
          <div className="d-flex justify-content-between align-items-center">
            <h6 className="mb-0">{getDayName(dayOfWeek)} - {date.toLocaleDateString()}</h6>
            <Badge bg="light" text="dark">
              {department}
            </Badge>
          </div>
        </Card.Header>
        <Card.Body className="p-3">
          <Row className="text-center">
            <Col md={4}>
              <div className="text-primary">
                <FaUsers className="mb-1" />
                <div><strong>{stats.available}/{stats.total}</strong></div>
                <small>Disponibles</small>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-success">
                <FaCalendarCheck className="mb-1" />
                <div><strong>{assignedToday.length}</strong></div>
                <small>Asignados</small>
              </div>
            </Col>
            <Col md={4}>
              <div className="text-info">
                <FaClock className="mb-1" />
                <div><strong>{stats.total - stats.available}</strong></div>
                <small>No Disponibles</small>
              </div>
            </Col>
          </Row>
          
          {stats.available === 0 && stats.total > 0 && (
            <Alert variant="warning" className="mt-2 mb-0">
              <FaExclamationTriangle className="me-2" />
              <small>Sin personal disponible este día</small>
            </Alert>
          )}
        </Card.Body>
      </Card>
    );
  };

  // Componente principal del calendario por departamento
  const DepartmentCalendar = ({ department }) => {
    const weekDates = getWeekDates(selectedDate);
    const canManage = department === 'FOH' ? canManageFOH() : canManageBOH();

    return (
      <div>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4>
              {department === 'FOH' ? (
                <>
                  <FaConciergeBell className="me-2 text-warning" />
                  Front of House
                </>
              ) : (
                <>
                  <FaChefHat className="me-2 text-info" />
                  Back of House
                </>
              )}
            </h4>
            <p className="text-muted mb-0">
              {department === 'FOH' 
                ? 'Gestión de horarios del salón (Manager)' 
                : 'Gestión de horarios de cocina (Chef)'}
            </p>
          </div>
          
          <div className="d-flex gap-2">
            <Button variant="outline-secondary" onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() - 7);
              setSelectedDate(newDate);
            }}>
              ← Anterior
            </Button>
            <Button variant="outline-secondary" onClick={() => setSelectedDate(new Date())}>
              Hoy
            </Button>
            <Button variant="outline-secondary" onClick={() => {
              const newDate = new Date(selectedDate);
              newDate.setDate(newDate.getDate() + 7);
              setSelectedDate(newDate);
            }}>
              Siguiente →
            </Button>
          </div>
        </div>

        {!canManage && (
          <Alert variant="info" className="mb-4">
            <FaExclamationTriangle className="me-2" />
            Solo puedes ver los horarios de {department}. 
            {department === 'FOH' ? ' Los managers pueden editarlos.' : ' Los chefs pueden editarlos.'}
          </Alert>
        )}

        <Row>
          {weekDates.map((date, index) => (
            <Col key={index} className="mb-4">
              <AvailabilityCard date={date} department={department} />
              
              <Card className="border-0 shadow-sm">
                <Card.Header className={`d-flex justify-content-between align-items-center bg-${department === 'FOH' ? 'warning' : 'info'} text-white`}>
                  <small className="fw-bold">{getDayName(getDayValue(date))}</small>
                  <small>{date.getDate()}</small>
                </Card.Header>
                <Card.Body className="p-2" style={{ minHeight: '200px' }}>
                  {getShiftsByDate(date, department).map(shift => {
                    const employee = employees.find(emp => emp.id === shift.employee_id);
                    const shiftClass = shift.start_time && parseInt(shift.start_time.split(':')[0]) >= 18 ? 'bg-dark text-white' :
                                     shift.start_time && parseInt(shift.start_time.split(':')[0]) >= 14 ? 'bg-warning' : 'bg-primary text-white';
                    
                    return (
                      <div key={shift.id} className={`p-2 mb-2 rounded ${shiftClass}`} style={{ fontSize: '0.75rem' }}>
                        <div className="fw-bold">{getEmployeeName(shift.employee_id)}</div>
                        <div>{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</div>
                        <div>
                          <Badge bg="light" text="dark" className="me-1">{employee?.role}</Badge>
                        </div>
                        {shift.notes && <div className="mt-1"><small>{shift.notes}</small></div>}
                        
                        {canManage && (
                          <div className="mt-1">
                            <Button size="sm" variant="outline-light" className="me-1" onClick={() => {
                              setEditingShift(shift);
                              setShiftForm({...shift, department});
                              setShowShiftModal(true);
                            }}>
                              <FaEdit />
                            </Button>
                            <Button size="sm" variant="outline-danger" onClick={async () => {
                              if (window.confirm('¿Eliminar este turno?')) {
                                try {
                                  await deleteDoc(doc(db, 'shifts', shift.id));
                                  setSuccess('Turno eliminado exitosamente');
                                  setTimeout(() => setSuccess(''), 3000);
                                } catch (err) {
                                  setError('Error al eliminar turno');
                                }
                              }
                            }}>
                              <FaTrash />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {canManage && (
                    <Button
                      size="sm"
                      variant={`outline-${department === 'FOH' ? 'warning' : 'info'}`}
                      className="w-100 mt-2"
                      onClick={() => {
                        setShiftForm(prev => ({ 
                          ...prev, 
                          date: date.toISOString().split('T')[0],
                          department: department
                        }));
                        setEditingShift(null);
                        setShowShiftModal(true);
                      }}
                    >
                      <FaPlus /> Agregar Turno {department}
                    </Button>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="mt-3">Cargando sistema de horarios...</p>
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
              <Button 
                variant="link" 
                onClick={onBack}
                className="p-0 mb-2"
              >
                <FaArrowLeft className="me-2" />
                Volver al Dashboard
              </Button>
              <h2><FaCalendarAlt className="me-2" />Horarios Separados FOH/BOH</h2>
              <p className="text-muted mb-0">
                Gestión independiente: Manager → FOH | Chef → BOH
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Alertas */}
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')} dismissible>{success}</Alert>}

      {/* Información de permisos */}
      <Row className="mb-4">
        <Col>
          <Alert variant="info">
            <Row>
              <Col md={6}>
                <h6><FaConciergeBell className="me-2" />Front of House (FOH)</h6>
                <p className="mb-0">
                  <strong>Gestión:</strong> Manager • 
                  <strong> Incluye:</strong> Meseros, Bartenders, Hosts, Cajeros
                </p>
              </Col>
              <Col md={6}>
                <h6><FaChefHat className="me-2" />Back of House (BOH)</h6>
                <p className="mb-0">
                  <strong>Gestión:</strong> Chef • 
                  <strong> Incluye:</strong> Cocineros, Ayudantes, Dishwashers
                </p>
              </Col>
            </Row>
          </Alert>
        </Col>
      </Row>

      {/* Estadísticas Generales */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaUsers className="text-primary mb-2" size={24} />
              <h4 className="text-primary">{employees.length}</h4>
              <small className="text-muted">Empleados Totales</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaConciergeBell className="text-warning mb-2" size={24} />
              <h4 className="text-warning">{employees.filter(emp => emp.workInfo?.department === 'FOH').length}</h4>
              <small className="text-muted">Personal FOH</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaUtensils className="text-info mb-2" size={24} />
              <h4 className="text-info">{employees.filter(emp => emp.workInfo?.department === 'BOH').length}</h4>
              <small className="text-muted">Personal BOH</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <FaCalendarCheck className="text-success mb-2" size={24} />
              <h4 className="text-success">{shifts.length}</h4>
              <small className="text-muted">Turnos Programados</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabs por Departamento */}
      <Tabs 
        activeKey={activeTab} 
        onSelect={(k) => setActiveTab(k)} 
        className="mb-4"
        variant="pills"
      >
        <Tab 
          eventKey="foh" 
          title={
            <span className="d-flex align-items-center">
              <FaConciergeBell className="me-2" />
              FOH - Front of House
              <Badge bg="warning" className="ms-2">
                {employees.filter(emp => emp.workInfo?.department === 'FOH').length}
              </Badge>
            </span>
          }
          disabled={!canManageFOH() && userRole !== 'admin'}
        >
          <DepartmentCalendar department="FOH" />
        </Tab>
        
        <Tab 
          eventKey="boh" 
          title={
            <span className="d-flex align-items-center">
              <FaChefHat className="me-2" />
              BOH - Back of House
              <Badge bg="info" className="ms-2">
                {employees.filter(emp => emp.workInfo?.department === 'BOH').length}
              </Badge>
            </span>
          }
          disabled={!canManageBOH() && userRole !== 'admin'}
        >
          <DepartmentCalendar department="BOH" />
        </Tab>
      </Tabs>

      {/* Modal para Crear/Editar Turno */}
      <Modal show={showShiftModal} onHide={() => setShowShiftModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaClock className="me-2" />
            {editingShift ? 'Editar' : 'Crear'} Turno {shiftForm.department}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateShift}>
          <Modal.Body>
            <Alert variant={shiftForm.department === 'FOH' ? 'warning' : 'info'}>
              <strong>Departamento:</strong> {shiftForm.department === 'FOH' ? 'Front of House (Salón)' : 'Back of House (Cocina)'}
            </Alert>

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
                    {shiftForm.date && getAvailableEmployeesForDate(new Date(shiftForm.date), shiftForm.department).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`} - {emp.role}
                      </option>
                    ))}
                  </Form.Select>
                  {shiftForm.date && (
                    <Form.Text className="text-success">
                      ✅ Solo empleados {shiftForm.department} disponibles para {getDayName(getDayValue(new Date(shiftForm.date)))}
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
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
            </Row>

            <Row>
              <Col md={6}>
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
              <Col md={6}>
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
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary">
              <FaCheck className="me-1" />
              {editingShift ? 'Actualizar' : 'Crear'} Turno
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default SeparatedShiftManagement;