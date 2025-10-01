// src/components/EmployeeTasks.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Modal, Alert, Badge, 
  ProgressBar, ListGroup, InputGroup
} from 'react-bootstrap';
import { 
  FaTasks, FaCamera, FaCheck, FaClock, FaFlag, FaPlay, 
  FaPause, FaStop, FaImage, FaComments, FaExclamationTriangle,
  FaCheckCircle, FaTimesCircle, FaHourglass, FaChevronDown,
  FaChevronUp, FaCalendarAlt, FaArrowLeft
} from 'react-icons/fa';
import { 
  collection, onSnapshot, updateDoc, doc, query, where, 
  orderBy, serverTimestamp, addDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

const EmployeeTasks = ({ user, onBack }) => {
  // Estados principales
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados del modal de completar tarea
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskNotes, setTaskNotes] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Referencias
  const fileInputRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();

  // Estados de vista
  const [filter, setFilter] = useState('pending'); // pending, completed, all
  const [expandedTask, setExpandedTask] = useState(null);

  // Cargar tareas del empleado
  useEffect(() => {
    if (!user?.uid) return;

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const tasksQuery = query(
      collection(db, 'assigned_tasks'),
      where('assigned_to', '==', user.uid),
      where('assigned_date', '>=', yesterday.toISOString().split('T')[0])
    );

    const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      const tasksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Ordenar en el cliente para evitar índices complejos
      tasksData.sort((a, b) => {
        // Primero por fecha (más reciente primero)
        const dateCompare = new Date(b.assigned_date) - new Date(a.assigned_date);
        if (dateCompare !== 0) return dateCompare;
        
        // Luego por prioridad (urgent > high > normal > low)
        const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
        return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2);
      });
      
      setTasks(tasksData);
    });

    return () => unsubscribe();
  }, [user]);

  // Filtrar tareas según el filtro seleccionado
  const getFilteredTasks = () => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => ['pending', 'in_progress'].includes(task.status));
      case 'completed':
        return tasks.filter(task => ['completed', 'failed'].includes(task.status));
      default:
        return tasks;
    }
  };

  // Obtener configuración de prioridad
  const getPriorityConfig = (priority) => {
    const configs = {
      low: { color: 'success', text: 'Baja', icon: FaFlag },
      normal: { color: 'primary', text: 'Normal', icon: FaFlag },
      high: { color: 'warning', text: 'Alta', icon: FaFlag },
      urgent: { color: 'danger', text: 'Urgente', icon: FaExclamationTriangle }
    };
    return configs[priority] || configs.normal;
  };

  // Obtener configuración de estado
  const getStatusConfig = (status) => {
    const configs = {
      pending: { color: 'warning', text: 'Pendiente', icon: FaHourglass },
      in_progress: { color: 'info', text: 'En Progreso', icon: FaPlay },
      completed: { color: 'success', text: 'Completada', icon: FaCheckCircle },
      failed: { color: 'danger', text: 'Fallida', icon: FaTimesCircle }
    };
    return configs[status] || configs.pending;
  };

  // Iniciar tarea
  const handleStartTask = async (taskId) => {
    try {
      await updateDoc(doc(db, 'assigned_tasks', taskId), {
        status: 'in_progress',
        started_at: serverTimestamp()
      });
      setSuccess('Tarea iniciada');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error al iniciar la tarea');
    }
  };

  // Abrir modal para completar tarea
  const handleCompleteTask = (task) => {
    setSelectedTask(task);
    setTaskNotes('');
    setCapturedPhoto(null);
    setPhotoPreview(null);
    setShowCompleteModal(true);
  };

  // Capturar foto con cámara
  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Cámara trasera en móviles
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Error accediendo a la cámara:', err);
      setError('No se pudo acceder a la cámara. Usa la opción de archivo.');
    }
  };

  // Tomar foto
  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      // Convertir a blob con compresión
      canvas.toBlob((blob) => {
        setCapturedPhoto(blob);
        setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
        
        // Detener stream de video
        const stream = video.srcObject;
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }, 'image/jpeg', 0.7);
    }
  };

  // Manejar selección de archivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setCapturedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // Subir foto a Firebase Storage
  const uploadPhoto = async (taskId) => {
    if (!capturedPhoto) return null;

    const timestamp = Date.now();
    const photoRef = ref(storage, `task_photos/${taskId}_${timestamp}.jpg`);
    
    await uploadBytes(photoRef, capturedPhoto);
    return await getDownloadURL(photoRef);
  };

  // Confirmar completar tarea
  const confirmCompleteTask = async () => {
    if (!selectedTask) return;

    setUploading(true);
    try {
      let photoUrl = null;

      // Subir foto si es requerida
      if (selectedTask.requires_photo && capturedPhoto) {
        photoUrl = await uploadPhoto(selectedTask.id);
      }

      // Actualizar tarea
      await updateDoc(doc(db, 'assigned_tasks', selectedTask.id), {
        status: 'completed',
        completed_at: serverTimestamp(),
        notes: taskNotes,
        photo_url: photoUrl
      });

      // Crear registro de actividad (opcional)
      await addDoc(collection(db, 'task_activities'), {
        task_id: selectedTask.id,
        employee_id: user.uid,
        action: 'completed',
        notes: taskNotes,
        photo_url: photoUrl,
        created_at: serverTimestamp()
      });

      setSuccess('¡Tarea completada exitosamente!');
      setShowCompleteModal(false);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error completando tarea:', err);
      setError('Error al completar la tarea');
    } finally {
      setUploading(false);
    }
  };

  // Marcar tarea como fallida
  const markTaskFailed = async () => {
    if (!selectedTask) return;

    try {
      await updateDoc(doc(db, 'assigned_tasks', selectedTask.id), {
        status: 'failed',
        completed_at: serverTimestamp(),
        notes: taskNotes || 'Tarea marcada como fallida'
      });

      setSuccess('Tarea marcada como fallida');
      setShowCompleteModal(false);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      setError('Error al marcar la tarea');
    }
  };

  // Obtener progreso del día
  const getDayProgress = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.assigned_date === today);
    const completed = todayTasks.filter(task => task.status === 'completed').length;
    const total = todayTasks.length;
    
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  const progress = getDayProgress();
  const filteredTasks = getFilteredTasks();

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
              Mis Tareas
            </h2>
          </div>
          
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">{success}</Alert>}
        </Col>
      </Row>

      {/* Progreso del día */}
      <Row className="mb-4">
        <Col>
          <Card>
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h5 className="mb-0">Progreso de Hoy</h5>
                <Badge bg="primary">{progress.completed}/{progress.total}</Badge>
              </div>
              <ProgressBar 
                now={progress.percentage} 
                label={`${Math.round(progress.percentage)}%`}
                variant={progress.percentage === 100 ? 'success' : 'primary'}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Row className="mb-3">
        <Col>
          <div className="d-flex gap-2">
            <Button
              variant={filter === 'pending' ? 'primary' : 'outline-primary'}
              onClick={() => setFilter('pending')}
            >
              Pendientes ({tasks.filter(t => ['pending', 'in_progress'].includes(t.status)).length})
            </Button>
            <Button
              variant={filter === 'completed' ? 'primary' : 'outline-primary'}
              onClick={() => setFilter('completed')}
            >
              Completadas ({tasks.filter(t => ['completed', 'failed'].includes(t.status)).length})
            </Button>
            <Button
              variant={filter === 'all' ? 'primary' : 'outline-primary'}
              onClick={() => setFilter('all')}
            >
              Todas ({tasks.length})
            </Button>
          </div>
        </Col>
      </Row>

      {/* Lista de tareas */}
      <Row>
        <Col>
          {filteredTasks.length === 0 ? (
            <Card>
              <Card.Body className="text-center py-5">
                <FaTasks size={50} className="text-muted mb-3" />
                <h4 className="text-muted">No hay tareas {filter === 'pending' ? 'pendientes' : filter === 'completed' ? 'completadas' : ''}</h4>
                <p className="text-muted">¡Buen trabajo!</p>
              </Card.Body>
            </Card>
          ) : (
            <ListGroup>
              {filteredTasks.map(task => {
                const priorityConfig = getPriorityConfig(task.priority);
                const statusConfig = getStatusConfig(task.status);
                const isExpanded = expandedTask === task.id;
                const canStart = task.status === 'pending';
                const canComplete = task.status === 'in_progress';
                const isCompleted = ['completed', 'failed'].includes(task.status);

                return (
                  <ListGroup.Item key={task.id} className="p-0">
                    <Card className="border-0">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center mb-2">
                              <h5 className="mb-0 me-3">{task.title}</h5>
                              <Badge bg={priorityConfig.color} className="me-2">
                                <priorityConfig.icon className="me-1" />
                                {priorityConfig.text}
                              </Badge>
                              <Badge bg={statusConfig.color}>
                                <statusConfig.icon className="me-1" />
                                {statusConfig.text}
                              </Badge>
                            </div>
                            
                            <div className="d-flex align-items-center text-muted mb-2">
                              <FaCalendarAlt className="me-2" />
                              {new Date(task.assigned_date).toLocaleDateString('es-ES')}
                              <span className="mx-3">•</span>
                              <FaClock className="me-2" />
                              {task.estimated_duration} min
                              {task.requires_photo && (
                                <>
                                  <span className="mx-3">•</span>
                                  <FaCamera className="me-2" />
                                  Foto requerida
                                </>
                              )}
                            </div>

                            {task.description && (
                              <p className="text-muted mb-2">{task.description}</p>
                            )}
                          </div>

                          <div className="d-flex align-items-center">
                            {canStart && (
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleStartTask(task.id)}
                                className="me-2"
                              >
                                <FaPlay className="me-1" />
                                Iniciar
                              </Button>
                            )}
                            
                            {canComplete && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleCompleteTask(task)}
                                className="me-2"
                              >
                                <FaCheck className="me-1" />
                                Completar
                              </Button>
                            )}

                            <Button
                              variant="outline-secondary"
                              size="sm"
                              onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                            >
                              {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                            </Button>
                          </div>
                        </div>

                        {/* Información expandida */}
                        {isExpanded && (
                          <div className="mt-3 pt-3 border-top">
                            <Row>
                              <Col md={6}>
                                <p><strong>Asignada:</strong> {task.assigned_at?.toDate().toLocaleString('es-ES')}</p>
                                {task.started_at && (
                                  <p><strong>Iniciada:</strong> {task.started_at.toDate().toLocaleString('es-ES')}</p>
                                )}
                                {task.completed_at && (
                                  <p><strong>Completada:</strong> {task.completed_at.toDate().toLocaleString('es-ES')}</p>
                                )}
                              </Col>
                              <Col md={6}>
                                {task.notes && (
                                  <div>
                                    <strong>Notas:</strong>
                                    <p className="text-muted mb-0">{task.notes}</p>
                                  </div>
                                )}
                                {task.photo_url && (
                                  <div className="mt-2">
                                    <strong>Foto de verificación:</strong>
                                    <br />
                                    <img 
                                      src={task.photo_url} 
                                      alt="Verificación de tarea"
                                      style={{ maxWidth: '200px', maxHeight: '150px' }}
                                      className="img-thumbnail mt-1"
                                    />
                                  </div>
                                )}
                              </Col>
                            </Row>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </ListGroup.Item>
                );
              })}
            </ListGroup>
          )}
        </Col>
      </Row>

      {/* Modal para completar tarea */}
      <Modal show={showCompleteModal} onHide={() => setShowCompleteModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Completar Tarea</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedTask && (
            <div>
              <h5>{selectedTask.title}</h5>
              <p className="text-muted">{selectedTask.description}</p>

              {/* Campo de notas */}
              <Form.Group className="mb-3">
                <Form.Label>Notas (opcional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  placeholder="Añade cualquier comentario sobre la tarea..."
                />
              </Form.Group>

              {/* Sección de foto si es requerida */}
              {selectedTask.requires_photo && (
                <div className="mb-3">
                  <Form.Label>Foto de Verificación *</Form.Label>
                  
                  {!photoPreview ? (
                    <div>
                      <div className="d-flex gap-2 mb-3">
                        <Button 
                          variant="primary" 
                          onClick={handleCameraCapture}
                        >
                          <FaCamera className="me-2" />
                          Usar Cámara
                        </Button>
                        <Button 
                          variant="outline-primary"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <FaImage className="me-2" />
                          Seleccionar Archivo
                        </Button>
                      </div>

                      {/* Video para cámara */}
                      <video 
                        ref={videoRef} 
                        style={{ width: '100%', maxHeight: '300px', display: 'none' }}
                        onLoadedMetadata={() => {
                          if (videoRef.current) {
                            videoRef.current.style.display = 'block';
                          }
                        }}
                      />
                      
                      {videoRef.current?.srcObject && (
                        <Button 
                          variant="success" 
                          onClick={takePhoto}
                          className="mt-2"
                        >
                          <FaCamera className="me-2" />
                          Tomar Foto
                        </Button>
                      )}

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                      />
                    </div>
                  ) : (
                    <div>
                      <img 
                        src={photoPreview} 
                        alt="Foto capturada"
                        style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }}
                        className="img-thumbnail mb-2"
                      />
                      <div>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => {
                            setCapturedPhoto(null);
                            setPhotoPreview(null);
                          }}
                        >
                          Tomar Otra Foto
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-danger" onClick={markTaskFailed}>
            <FaTimesCircle className="me-2" />
            Marcar como Fallida
          </Button>
          <Button variant="secondary" onClick={() => setShowCompleteModal(false)}>
            Cancelar
          </Button>
          <Button 
            variant="success" 
            onClick={confirmCompleteTask}
            disabled={uploading || (selectedTask?.requires_photo && !capturedPhoto)}
          >
            {uploading ? 'Guardando...' : (
              <>
                <FaCheckCircle className="me-2" />
                Completar Tarea
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default EmployeeTasks;