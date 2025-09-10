// src/components/SchedulePublishing.js
import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  Form, 
  Alert, 
  Badge, 
  Table, 
  Row, 
  Col,
  Spinner,
  Toast,
  ToastContainer
} from 'react-bootstrap';
import { 
  FaShare, 
  FaEye, 
  FaEdit, 
  FaTrash, 
  FaClock,
  FaUsers,
  FaCalendarWeek,
  FaPaperPlane,
  FaCheckCircle,
  FaExclamationTriangle
} from 'react-icons/fa';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

const SchedulePublishing = ({ shifts, employees, user, userRole }) => {
  // Estados
  const [publishedSchedules, setPublishedSchedules] = useState([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showToast, setShowToast] = useState(false);

  // Formulario de publicación
  const [publishForm, setPublishForm] = useState({
    week_start: '',
    week_end: '',
    title: '',
    message: '',
    notify_employees: true,
    deadline_response: '',
    auto_remind: true
  });

  // Cargar horarios publicados
  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'published_schedules'), 
        orderBy('created_at', 'desc')
      ),
      (snapshot) => {
        const schedules = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPublishedSchedules(schedules);
        setLoading(false);
      }
    );

    return () => unsubscribe();
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getShiftsForWeek = (startDate, endDate) => {
    return shifts.filter(shift => {
      const shiftDate = new Date(shift.date);
      return shiftDate >= new Date(startDate) && shiftDate <= new Date(endDate);
    });
  };

  const calculateWeekStats = (weekShifts) => {
    const totalShifts = weekShifts.length;
    const employeesCount = new Set(weekShifts.map(shift => shift.employee_id)).size;
    const totalHours = weekShifts.reduce((acc, shift) => {
      if (shift.start_time && shift.end_time) {
        const start = new Date(`2000-01-01 ${shift.start_time}`);
        const end = new Date(`2000-01-01 ${shift.end_time}`);
        if (end < start) end.setDate(end.getDate() + 1);
        const hours = (end - start) / (1000 * 60 * 60);
        return acc + hours;
      }
      return acc;
    }, 0);

    return { totalShifts, employeesCount, totalHours: totalHours.toFixed(1) };
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId || emp.email === employeeId);
    return employee ? (employee.displayName || employee.email.split('@')[0]) : 'Empleado no encontrado';
  };

  // Handlers
  const handlePublishFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPublishForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePublishSchedule = async (e) => {
    e.preventDefault();
    setPublishing(true);
    setError('');

    try {
      const weekShifts = getShiftsForWeek(publishForm.week_start, publishForm.week_end);
      const stats = calculateWeekStats(weekShifts);

      const scheduleData = {
        ...publishForm,
        status: 'published',
        created_by: user.email,
        created_by_name: user.displayName || user.email.split('@')[0],
        created_at: serverTimestamp(),
        shifts_included: weekShifts.map(shift => shift.id),
        stats,
        employee_responses: {},
        reminder_sent: false
      };

      await addDoc(collection(db, 'published_schedules'), scheduleData);

      // Si está habilitado notificar empleados, crear notificaciones
      if (publishForm.notify_employees) {
        const employeeIds = [...new Set(weekShifts.map(shift => shift.employee_id))];
        
        for (const employeeId of employeeIds) {
          await addDoc(collection(db, 'notifications'), {
            employee_id: employeeId,
            type: 'schedule_published',
            title: 'Nuevo Horario Publicado',
            message: `Se ha publicado el horario para la semana del ${formatDate(publishForm.week_start)}`,
            schedule_id: scheduleData.id,
            read: false,
            created_at: serverTimestamp()
          });
        }
      }

      setSuccess('Horario publicado exitosamente');
      setShowToast(true);
      setShowPublishModal(false);
      resetPublishForm();
    } catch (err) {
      console.error('Error publishing schedule:', err);
      setError('Error al publicar el horario: ' + err.message);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este horario publicado?')) {
      try {
        await deleteDoc(doc(db, 'published_schedules', scheduleId));
        setSuccess('Horario eliminado exitosamente');
        setShowToast(true);
      } catch (err) {
        console.error('Error deleting schedule:', err);
        setError('Error al eliminar el horario');
      }
    }
  };

  const handlePreviewSchedule = (schedule) => {
    setSelectedSchedule(schedule);
    setShowPreviewModal(true);
  };

  const resetPublishForm = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    setPublishForm({
      week_start: startOfWeek.toISOString().split('T')[0],
      week_end: endOfWeek.toISOString().split('T')[0],
      title: `Horarios Semana ${startOfWeek.toLocaleDateString('es-ES')}`,
      message: '',
      notify_employees: true,
      deadline_response: '',
      auto_remind: true
    });
  };

  const generateShareableLink = (scheduleId) => {
    return `${window.location.origin}/schedule/view/${scheduleId}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setSuccess('Enlace copiado al portapapeles');
      setShowToast(true);
    });
  };

  if (loading) {
    return (
      <div className="text-center p-4">
        <Spinner animation="border" />
        <p className="mt-2">Cargando horarios publicados...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4>
            <FaShare className="me-2" />
            Publicación de Horarios
          </h4>
          <p className="text-muted mb-0">
            Publica y comparte horarios con tu equipo
          </p>
        </div>
        {(userRole === 'admin' || userRole === 'manager') && (
          <Button 
            variant="primary" 
            onClick={() => {
              resetPublishForm();
              setShowPublishModal(true);
            }}
          >
            <FaPaperPlane className="me-1" />
            Publicar Horario
          </Button>
        )}
      </div>

      {/* Alertas */}
      {error && <Alert variant="danger">{error}</Alert>}

      {/* Lista de horarios publicados */}
      <Row>
        {publishedSchedules.length === 0 ? (
          <Col>
            <Card className="text-center py-5">
              <Card.Body>
                <FaCalendarWeek size={48} className="text-muted mb-3" />
                <h5>No hay horarios publicados</h5>
                <p className="text-muted">
                  Comienza publicando tu primer horario para compartirlo con el equipo
                </p>
                {(userRole === 'admin' || userRole === 'manager') && (
                  <Button 
                    variant="primary" 
                    onClick={() => {
                      resetPublishForm();
                      setShowPublishModal(true);
                    }}
                  >
                    Publicar Primer Horario
                  </Button>
                )}
              </Card.Body>
            </Card>
          </Col>
        ) : (
          publishedSchedules.map(schedule => (
            <Col md={6} lg={4} key={schedule.id} className="mb-3">
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{schedule.title}</strong>
                    <Badge 
                      bg={schedule.status === 'published' ? 'success' : 'warning'} 
                      className="ms-2"
                    >
                      {schedule.status === 'published' ? 'Publicado' : 'Borrador'}
                    </Badge>
                  </div>
                  <div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handlePreviewSchedule(schedule)}
                      className="me-1"
                    >
                      <FaEye />
                    </Button>
                    {(userRole === 'admin' || userRole === 'manager') && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                      >
                        <FaTrash />
                      </Button>
                    )}
                  </div>
                </Card.Header>
                <Card.Body>
                  <p className="small text-muted mb-2">
                    <FaCalendarWeek className="me-1" />
                    {formatDate(schedule.week_start)} - {formatDate(schedule.week_end)}
                  </p>
                  
                  <div className="d-flex justify-content-between small mb-2">
                    <span>
                      <FaClock className="me-1" />
                      {schedule.stats?.totalShifts || 0} turnos
                    </span>
                    <span>
                      <FaUsers className="me-1" />
                      {schedule.stats?.employeesCount || 0} empleados
                    </span>
                  </div>

                  {schedule.message && (
                    <p className="small text-muted mb-2">
                      "{schedule.message}"
                    </p>
                  )}

                  <div className="d-grid gap-2">
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => copyToClipboard(generateShareableLink(schedule.id))}
                    >
                      <FaShare className="me-1" />
                      Copiar Enlace
                    </Button>
                  </div>
                </Card.Body>
                <Card.Footer className="small text-muted">
                  Publicado por {schedule.created_by_name} • 
                  {schedule.created_at && new Date(schedule.created_at.toDate()).toLocaleDateString()}
                </Card.Footer>
              </Card>
            </Col>
          ))
        )}
      </Row>

      {/* Modal de publicación */}
      <Modal show={showPublishModal} onHide={() => setShowPublishModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPaperPlane className="me-2" />
            Publicar Horario
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handlePublishSchedule}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Inicio de Semana</Form.Label>
                  <Form.Control
                    type="date"
                    name="week_start"
                    value={publishForm.week_start}
                    onChange={handlePublishFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fin de Semana</Form.Label>
                  <Form.Control
                    type="date"
                    name="week_end"
                    value={publishForm.week_end}
                    onChange={handlePublishFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Título del Horario</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={publishForm.title}
                onChange={handlePublishFormChange}
                placeholder="Ej: Horarios Semana del 10-16 Septiembre"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Mensaje para el Equipo</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="message"
                value={publishForm.message}
                onChange={handlePublishFormChange}
                placeholder="Mensaje opcional para el equipo..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha límite para confirmación</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="deadline_response"
                    value={publishForm.deadline_response}
                    onChange={handlePublishFormChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Check
              type="checkbox"
              name="notify_employees"
              checked={publishForm.notify_employees}
              onChange={handlePublishFormChange}
              label="Notificar a empleados por email"
              className="mb-2"
            />

            <Form.Check
              type="checkbox"
              name="auto_remind"
              checked={publishForm.auto_remind}
              onChange={handlePublishFormChange}
              label="Enviar recordatorios automáticos"
            />

            {/* Preview de turnos */}
            {publishForm.week_start && publishForm.week_end && (
              <Card className="mt-3">
                <Card.Header>
                  <strong>Vista Previa</strong>
                </Card.Header>
                <Card.Body>
                  {(() => {
                    const weekShifts = getShiftsForWeek(publishForm.week_start, publishForm.week_end);
                    const stats = calculateWeekStats(weekShifts);
                    
                    return (
                      <div>
                        <div className="d-flex justify-content-between mb-2">
                          <span><strong>Total de turnos:</strong> {stats.totalShifts}</span>
                          <span><strong>Empleados:</strong> {stats.employeesCount}</span>
                          <span><strong>Horas totales:</strong> {stats.totalHours}h</span>
                        </div>
                        {weekShifts.length === 0 && (
                          <Alert variant="warning">
                            <FaExclamationTriangle className="me-1" />
                            No hay turnos programados para esta semana
                          </Alert>
                        )}
                      </div>
                    );
                  })()}
                </Card.Body>
              </Card>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPublishModal(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={publishing}>
              {publishing ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Publicando...
                </>
              ) : (
                <>
                  <FaPaperPlane className="me-1" />
                  Publicar Horario
                </>
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal de vista previa */}
      <Modal show={showPreviewModal} onHide={() => setShowPreviewModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            Vista Previa: {selectedSchedule?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedSchedule && (
            <div>
              <div className="mb-3">
                <h6>Información del Horario</h6>
                <p><strong>Semana:</strong> {formatDate(selectedSchedule.week_start)} - {formatDate(selectedSchedule.week_end)}</p>
                <p><strong>Publicado por:</strong> {selectedSchedule.created_by_name}</p>
                {selectedSchedule.message && (
                  <p><strong>Mensaje:</strong> {selectedSchedule.message}</p>
                )}
              </div>

              <div className="mb-3">
                <h6>Estadísticas</h6>
                <Row>
                  <Col md={4}>
                    <Card bg="light">
                      <Card.Body className="text-center">
                        <h4>{selectedSchedule.stats?.totalShifts || 0}</h4>
                        <small>Total Turnos</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card bg="light">
                      <Card.Body className="text-center">
                        <h4>{selectedSchedule.stats?.employeesCount || 0}</h4>
                        <small>Empleados</small>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card bg="light">
                      <Card.Body className="text-center">
                        <h4>{selectedSchedule.stats?.totalHours || 0}h</h4>
                        <small>Horas Totales</small>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>

              <div>
                <h6>Enlace para Compartir</h6>
                <div className="input-group">
                  <Form.Control
                    type="text"
                    value={generateShareableLink(selectedSchedule.id)}
                    readOnly
                  />
                  <Button
                    variant="outline-secondary"
                    onClick={() => copyToClipboard(generateShareableLink(selectedSchedule.id))}
                  >
                    Copiar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowPreviewModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast de notificaciones */}
      <ToastContainer position="top-end" className="p-3">
        <Toast show={showToast} onClose={() => setShowToast(false)} delay={3000} autohide>
          <Toast.Header>
            <FaCheckCircle className="text-success me-2" />
            <strong className="me-auto">Éxito</strong>
          </Toast.Header>
          <Toast.Body>{success}</Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
};

export default SchedulePublishing;