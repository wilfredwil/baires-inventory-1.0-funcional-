// src/components/TaskManager.js
import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Modal, Alert, Badge, 
  Table, InputGroup, Dropdown, ListGroup
} from 'react-bootstrap';
import { 
  FaTasks, FaPlus, FaEdit, FaTrash, FaEye, FaCamera, 
  FaClock, FaFlag, FaUser, FaCalendarAlt, FaCheck,
  FaExclamationTriangle, FaArrowLeft
} from 'react-icons/fa';
import { 
  collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, 
  query, where, orderBy, serverTimestamp, getDocs
} from 'firebase/firestore';
import { db } from '../firebase';

const TaskManager = ({ onBack, user, userRole, selectedShift = null }) => {
  // Estados principales
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados del modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Estados del formulario
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: '',
    department: 'FOH',
    shift_id: selectedShift?.id || '',
    priority: 'normal',
    requires_photo: false,
    estimated_duration: 15,
    due_date: new Date().toISOString().split('T')[0],
    shift_type: 'morning'
  });

  // Configuraciones
  const priorities = [
    { value: 'low', label: 'Baja', color: 'success', icon: FaFlag },
    { value: 'normal', label: 'Normal', color: 'primary', icon: FaFlag },
    { value: 'high', label: 'Alta', color: 'warning', icon: FaFlag },
    { value: 'urgent', label: 'Urgente', color: 'danger', icon: FaExclamationTriangle }
  ];

  const departments = [
    { value: 'FOH', label: 'Front of House' },
    { value: 'BOH', label: 'Back of House' }
  ];

  const shiftTypes = [
    { value: 'morning', label: 'Mañana (6:00-14:00)' },
    { value: 'afternoon', label: 'Tarde (14:00-22:00)' },
    { value: 'night', label: 'Noche (22:00-6:00)' }
  ];

  // Cargar datos
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Cargar tareas asignadas de hoy y próximos 7 días
        const today = new Date();
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        const tasksQuery = query(
          collection(db, 'assigned_tasks'),
          where('assigned_date', '>=', today.toISOString().split('T')[0]),
          where('assigned_date', '<=', nextWeek.toISOString().split('T')[0]),
          orderBy('assigned_date', 'desc'),
          orderBy('priority', 'desc')
        );

        const unsubscribeTasks = onSnapshot(tasksQuery, (snapshot) => {
          const tasksData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setTasks(tasksData);
        });

        // Cargar empleados activos
        const employeesQuery = query(
          collection(db, 'users'),
          where('active', '==', true)
        );
        
        const employeesSnapshot = await getDocs(employeesQuery);
        const employeesData = employeesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeesData);

        // Cargar turnos de la semana actual
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const shiftsQuery = query(
          collection(db, 'shifts'),
          where('date', '>=', weekStart.toISOString().split('T')[0]),
          where('date', '<=', weekEnd.toISOString().split('T')[0])
        );

        const shiftsSnapshot = await getDocs(shiftsQuery);
        const shiftsData = shiftsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setShifts(shiftsData);

        return () => unsubscribeTasks();

      } catch (err) {
        console.error('Error cargando datos:', err);
        setError('Error al cargar los datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Manejar formulario
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTaskForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const taskData = {
        ...taskForm,
        status: 'pending',
        assigned_at: serverTimestamp(),
        created_by: user.uid,
        // Auto-eliminar fotos después de 7 días
        auto_delete_photos_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      };

      if (editingTask) {
        await updateDoc(doc(db, 'assigned_tasks', editingTask.id), {
          ...taskData,
          updated_at: serverTimestamp()
        });
        setSuccess('Tarea actualizada exitosamente');
      } else {
        await addDoc(collection(db, 'assigned_tasks'), taskData);
        setSuccess('Tarea asignada exitosamente');
      }

      setShowTaskModal(false);
      resetForm();
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error guardando tarea:', err);
      setError('Error al guardar la tarea');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTaskForm({
      title: '',
      description: '',
      assigned_to: '',
      department: 'FOH',
      shift_id: selectedShift?.id || '',
      priority: 'normal',
      requires_photo: false,
      estimated_duration: 15,
      due_date: new Date().toISOString().split('T')[0],
      shift_type: 'morning'
    });
    setEditingTask(null);
  };

  const handleEdit = (task) => {
    setTaskForm({
      title: task.title,
      description: task.description,
      assigned_to: task.assigned_to,
      department: task.department,
      shift_id: task.shift_id || '',
      priority: task.priority,
      requires_photo: task.requires_photo,
      estimated_duration: task.estimated_duration,
      due_date: task.assigned_date,
      shift_type: task.shift_type
    });
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('¿Estás seguro de eliminar esta tarea?')) {
      try {
        await deleteDoc(doc(db, 'assigned_tasks', taskId));
        setSuccess('Tarea eliminada exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Error al eliminar la tarea');
      }
    }
  };

  const getEmployeeName = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : 'Empleado no encontrado';
  };

  const getPriorityConfig = (priority) => {
    return priorities.find(p => p.value === priority) || priorities[1];
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'warning', text: 'Pendiente' },
      in_progress: { color: 'info', text: 'En Progreso' },
      completed: { color: 'success', text: 'Completada' },
      failed: { color: 'danger', text: 'Fallida' }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  const getAvailableEmployees = () => {
    const selectedDept = taskForm.department;
    return employees.filter(emp => 
      emp.workInfo?.department === selectedDept || 
      (!emp.workInfo?.department && selectedDept === 'FOH')
    );
  };

  if (loading && tasks.length === 0) {
    return (
      <Container className="mt-4">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      {/* Header */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center mb-3">
            <Button variant="outline-secondary" onClick={onBack} className="me-3">
              <FaArrowLeft className="me-2" />
              Volver
            </Button>
            <h2 className="mb-0">
              <FaTasks className="me-2" />
              Gestión de Tareas
            </h2>
          </div>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
        </Col>
      </Row>

      {/* Botón para nueva tarea */}
      <Row className="mb-4">
        <Col>
          <Button 
            variant="primary" 
            onClick={() => setShowTaskModal(true)}
            disabled={loading}
          >
            <FaPlus className="me-2" />
            Asignar Nueva Tarea
          </Button>
        </Col>
      </Row>

      {/* Lista de tareas */}
      <Row>
        <Col>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Tareas Asignadas</h5>
            </Card.Header>
            <Card.Body>
              {tasks.length === 0 ? (
                <div className="text-center py-4">
                  <FaTasks size={50} className="text-muted mb-3" />
                  <p className="text-muted">No hay tareas asignadas</p>
                </div>
              ) : (
                <Table responsive striped hover>
                  <thead>
                    <tr>
                      <th>Tarea</th>
                      <th>Empleado</th>
                      <th>Fecha</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>Foto</th>
                      <th>Duración</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(task => {
                      const priorityConfig = getPriorityConfig(task.priority);
                      const statusConfig = getStatusBadge(task.status);
                      
                      return (
                        <tr key={task.id}>
                          <td>
                            <div>
                              <strong>{task.title}</strong>
                              <br />
                              <small className="text-muted">{task.description}</small>
                            </div>
                          </td>
                          <td>{getEmployeeName(task.assigned_to)}</td>
                          <td>{new Date(task.assigned_date).toLocaleDateString('es-ES')}</td>
                          <td>
                            <Badge bg={priorityConfig.color}>
                              <priorityConfig.icon className="me-1" />
                              {priorityConfig.label}
                            </Badge>
                          </td>
                          <td>
                            <Badge bg={statusConfig.color}>
                              {statusConfig.text}
                            </Badge>
                          </td>
                          <td>
                            {task.requires_photo ? (
                              <FaCamera className="text-primary" title="Foto requerida" />
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            <FaClock className="me-1" />
                            {task.estimated_duration}min
                          </td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEdit(task)}
                              className="me-2"
                            >
                              <FaEdit />
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDelete(task.id)}
                            >
                              <FaTrash />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Modal para crear/editar tarea */}
      <Modal show={showTaskModal} onHide={() => setShowTaskModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingTask ? 'Editar Tarea' : 'Asignar Nueva Tarea'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Título de la Tarea *</Form.Label>
                  <Form.Control
                    type="text"
                    name="title"
                    value={taskForm.title}
                    onChange={handleFormChange}
                    placeholder="Ej: Limpiar estación de café"
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Departamento</Form.Label>
                  <Form.Select
                    name="department"
                    value={taskForm.department}
                    onChange={handleFormChange}
                  >
                    {departments.map(dept => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={taskForm.description}
                onChange={handleFormChange}
                placeholder="Detalles de la tarea..."
              />
            </Form.Group>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Asignar a Empleado *</Form.Label>
                  <Form.Select
                    name="assigned_to"
                    value={taskForm.assigned_to}
                    onChange={handleFormChange}
                    required
                  >
                    <option value="">Seleccionar empleado...</option>
                    {getAvailableEmployees().map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName} - {emp.role}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha de Realización</Form.Label>
                  <Form.Control
                    type="date"
                    name="due_date"
                    value={taskForm.due_date}
                    onChange={handleFormChange}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Prioridad</Form.Label>
                  <Form.Select
                    name="priority"
                    value={taskForm.priority}
                    onChange={handleFormChange}
                  >
                    {priorities.map(priority => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Duración Estimada (min)</Form.Label>
                  <Form.Control
                    type="number"
                    name="estimated_duration"
                    value={taskForm.estimated_duration}
                    onChange={handleFormChange}
                    min="5"
                    max="240"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Turno</Form.Label>
                  <Form.Select
                    name="shift_type"
                    value={taskForm.shift_type}
                    onChange={handleFormChange}
                  >
                    {shiftTypes.map(shift => (
                      <option key={shift.value} value={shift.value}>
                        {shift.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                name="requires_photo"
                checked={taskForm.requires_photo}
                onChange={handleFormChange}
                label="Esta tarea requiere foto de verificación"
              />
              <Form.Text className="text-muted">
                Las fotos se eliminan automáticamente después de 7 días
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Guardando...' : editingTask ? 'Actualizar' : 'Asignar Tarea'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default TaskManager;