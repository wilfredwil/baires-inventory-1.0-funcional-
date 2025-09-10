// src/components/MessagingSystem.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Button,
  Badge,
  Alert,
  Spinner,
  Dropdown,
  Modal,
  InputGroup
} from 'react-bootstrap';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  updateDoc,
  doc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  FaComments,
  FaPlus,
  FaPaperPlane,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaFilter,
  FaSearch,
  FaClock,
  FaUser,
  FaEllipsisV,
  FaReply,
  FaHeart,
  FaFlag,
  FaBell
} from 'react-icons/fa';

const MessagingSystem = ({ user, userRole, onBack }) => {
  // Estados principales
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados del formulario
  const [newMessage, setNewMessage] = useState({
    content: '',
    category: 'general',
    priority: 'normal',
    shift: getCurrentShift(),
    for_shift: 'all'
  });
  
  // Estados de filtros
  const [filters, setFilters] = useState({
    category: 'all',
    priority: 'all',
    shift: 'all',
    search: ''
  });
  
  // Estados de UI
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showMessageDetail, setShowMessageDetail] = useState(false);
  
  // Referencia para auto-scroll
  const messagesEndRef = useRef(null);

  // Configuración de categorías
  const categories = [
    { value: 'general', label: 'General', icon: FaComments, color: 'primary' },
    { value: 'inventory', label: 'Inventario', icon: FaCheckCircle, color: 'warning' },
    { value: 'maintenance', label: 'Mantenimiento', icon: FaExclamationTriangle, color: 'danger' },
    { value: 'customer', label: 'Clientes', icon: FaUser, color: 'info' },
    { value: 'staff', label: 'Personal', icon: FaUser, color: 'success' },
    { value: 'urgent', label: 'Urgente', icon: FaFlag, color: 'danger' }
  ];

  // Configuración de prioridades
  const priorities = [
    { value: 'low', label: 'Baja', color: 'success' },
    { value: 'normal', label: 'Normal', color: 'primary' },
    { value: 'high', label: 'Alta', color: 'warning' },
    { value: 'urgent', label: 'Urgente', color: 'danger' }
  ];

  // Configuración de turnos
  const shifts = [
    { value: 'morning', label: 'Mañana (6:00-14:00)' },
    { value: 'afternoon', label: 'Tarde (14:00-22:00)' },
    { value: 'night', label: 'Noche (22:00-6:00)' },
    { value: 'all', label: 'Todos los turnos' }
  ];

  // Función para obtener el turno actual
  function getCurrentShift() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
  }

  // Cargar mensajes en tiempo real
  useEffect(() => {
    const today = new Date();
    const sevenDaysAgo = new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));

    const messagesQuery = query(
      collection(db, 'messages'),
      where('created_at', '>=', sevenDaysAgo),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(messagesQuery, 
      (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(messagesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading messages:', error);
        setError('Error cargando mensajes');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Auto-scroll al final de los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filtrar mensajes
  const filteredMessages = messages.filter(message => {
    const matchesCategory = filters.category === 'all' || message.category === filters.category;
    const matchesPriority = filters.priority === 'all' || message.priority === filters.priority;
    const matchesShift = filters.shift === 'all' || message.shift === filters.shift || message.for_shift === 'all';
    const matchesSearch = !filters.search || 
      message.content.toLowerCase().includes(filters.search.toLowerCase()) ||
      message.author_name?.toLowerCase().includes(filters.search.toLowerCase());
    
    return matchesCategory && matchesPriority && matchesShift && matchesSearch;
  });

  // Enviar nuevo mensaje
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.content.trim()) {
      setError('El mensaje no puede estar vacío');
      return;
    }

    try {
      await addDoc(collection(db, 'messages'), {
        content: newMessage.content.trim(),
        category: newMessage.category,
        priority: newMessage.priority,
        shift: newMessage.shift,
        for_shift: newMessage.for_shift,
        author_email: user.email,
        author_name: user.displayName || user.email.split('@')[0],
        author_role: userRole,
        created_at: serverTimestamp(),
        likes: [],
        read_by: [],
        replies: []
      });

      setNewMessage({
        content: '',
        category: 'general',
        priority: 'normal',
        shift: getCurrentShift(),
        for_shift: 'all'
      });

      setShowNewMessageModal(false);
      setSuccess('Mensaje enviado correctamente');
      setTimeout(() => setSuccess(''), 3000);

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Error al enviar el mensaje');
    }
  };

  // Marcar mensaje como leído
  const markAsRead = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);
      
      if (message && !message.read_by?.includes(user.email)) {
        const updatedReadBy = [...(message.read_by || []), user.email];
        await updateDoc(messageRef, {
          read_by: updatedReadBy
        });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Dar like a un mensaje
  const toggleLike = async (messageId) => {
    try {
      const messageRef = doc(db, 'messages', messageId);
      const message = messages.find(m => m.id === messageId);
      
      if (message) {
        const likes = message.likes || [];
        const hasLiked = likes.includes(user.email);
        
        const updatedLikes = hasLiked 
          ? likes.filter(email => email !== user.email)
          : [...likes, user.email];
          
        await updateDoc(messageRef, {
          likes: updatedLikes
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  // Obtener configuración de categoría
  const getCategoryConfig = (category) => {
    return categories.find(cat => cat.value === category) || categories[0];
  };

  // Obtener configuración de prioridad
  const getPriorityConfig = (priority) => {
    return priorities.find(pri => pri.value === priority) || priorities[1];
  };

  // Formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.abs(now - date) / 36e5;
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `hace ${diffInMinutes} min`;
    } else if (diffInHours < 24) {
      return `hace ${Math.floor(diffInHours)} h`;
    } else {
      return date.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Obtener estadísticas rápidas
  const getStats = () => {
    const today = new Date();
    const todayMessages = messages.filter(msg => {
      const msgDate = msg.created_at?.toDate ? msg.created_at.toDate() : new Date(msg.created_at);
      return msgDate.toDateString() === today.toDateString();
    });

    const urgentMessages = messages.filter(msg => msg.priority === 'urgent' && !msg.read_by?.includes(user.email));
    const unreadMessages = messages.filter(msg => !msg.read_by?.includes(user.email));

    return {
      total: messages.length,
      today: todayMessages.length,
      urgent: urgentMessages.length,
      unread: unreadMessages.length
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <div className="text-center">
          <Spinner animation="border" style={{ color: '#3b82f6' }} />
          <p className="mt-3">Cargando mensajes...</p>
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
                <FaComments className="me-3" style={{ color: '#3b82f6' }} />
                Sistema de Comunicación
              </h2>
              <p className="text-muted mb-0">Mensajes entre turnos y comunicación del equipo</p>
            </div>
            <div className="d-flex gap-2">
              <Button variant="outline-secondary" onClick={onBack}>
                ← Volver al Dashboard
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setShowNewMessageModal(true)}
                style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
              >
                <FaPlus className="me-2" />
                Nuevo Mensaje
              </Button>
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
          <Card className="text-center border-0" style={{ background: '#3b82f6', color: 'white' }}>
            <Card.Body>
              <h3>{stats.total}</h3>
              <small>Total Mensajes (7 días)</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#10b981', color: 'white' }}>
            <Card.Body>
              <h3>{stats.today}</h3>
              <small>Mensajes de Hoy</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#f59e0b', color: 'white' }}>
            <Card.Body>
              <h3>{stats.unread}</h3>
              <small>No Leídos</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="text-center border-0" style={{ background: '#ef4444', color: 'white' }}>
            <Card.Body>
              <h3>{stats.urgent}</h3>
              <small>Urgentes</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Filtros */}
      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body>
          <Row>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Categoría</Form.Label>
                <Form.Select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="all">Todas las categorías</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Prioridad</Form.Label>
                <Form.Select
                  value={filters.priority}
                  onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="all">Todas las prioridades</option>
                  {priorities.map(pri => (
                    <option key={pri.value} value={pri.value}>{pri.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Turno</Form.Label>
                <Form.Select
                  value={filters.shift}
                  onChange={(e) => setFilters(prev => ({ ...prev, shift: e.target.value }))}
                >
                  <option value="all">Todos los turnos</option>
                  {shifts.map(shift => (
                    <option key={shift.value} value={shift.value}>{shift.label}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Buscar</Form.Label>
                <InputGroup>
                  <InputGroup.Text><FaSearch /></InputGroup.Text>
                  <Form.Control
                    type="text"
                    placeholder="Buscar mensajes..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  />
                </InputGroup>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Lista de Mensajes */}
      <Card className="border-0 shadow-sm">
        <Card.Body style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {filteredMessages.length === 0 ? (
            <div className="text-center py-5 text-muted">
              <FaComments size={48} className="mb-3" />
              <p>No hay mensajes que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="d-flex flex-column gap-3">
              {filteredMessages.map((message) => {
                const categoryConfig = getCategoryConfig(message.category);
                const priorityConfig = getPriorityConfig(message.priority);
                const isUnread = !message.read_by?.includes(user.email);
                const hasLiked = message.likes?.includes(user.email);
                const CategoryIcon = categoryConfig.icon;

                return (
                  <div
                    key={message.id}
                    className={`p-3 border rounded ${isUnread ? 'border-primary bg-light' : 'border-light'}`}
                    style={{ 
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => {
                      markAsRead(message.id);
                      setSelectedMessage(message);
                      setShowMessageDetail(true);
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2">
                        <CategoryIcon style={{ color: `var(--bs-${categoryConfig.color})` }} />
                        <Badge bg={categoryConfig.color} className="me-2">
                          {categoryConfig.label}
                        </Badge>
                        <Badge bg={priorityConfig.color}>
                          {priorityConfig.label}
                        </Badge>
                        {isUnread && (
                          <Badge bg="primary">
                            <FaBell size={10} />
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted d-flex align-items-center gap-1">
                        <FaClock />
                        {formatDate(message.created_at)}
                      </small>
                    </div>
                    
                    <p className="mb-2" style={{ 
                      fontWeight: isUnread ? '600' : '400'
                    }}>
                      {message.content}
                    </p>
                    
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-2">
                        <small className="text-muted">
                          <FaUser className="me-1" />
                          {message.author_name} ({message.author_role})
                        </small>
                        <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                          {shifts.find(s => s.value === message.shift)?.label || message.shift}
                        </Badge>
                      </div>
                      
                      <div className="d-flex align-items-center gap-2">
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLike(message.id);
                          }}
                          style={{
                            border: 'none',
                            background: hasLiked ? '#dc3545' : 'transparent',
                            color: hasLiked ? 'white' : '#dc3545'
                          }}
                        >
                          <FaHeart /> {message.likes?.length || 0}
                        </button>
                        <small className="text-muted">
                          {message.read_by?.length || 0} leído{(message.read_by?.length || 0) !== 1 ? 's' : ''}
                        </small>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Modal Nuevo Mensaje */}
      <Modal show={showNewMessageModal} onHide={() => setShowNewMessageModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaPlus className="me-2" />
            Nuevo Mensaje
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSendMessage}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Categoría</Form.Label>
                  <Form.Select
                    value={newMessage.category}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, category: e.target.value }))}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Prioridad</Form.Label>
                  <Form.Select
                    value={newMessage.priority}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, priority: e.target.value }))}
                    required
                  >
                    {priorities.map(pri => (
                      <option key={pri.value} value={pri.value}>{pri.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Turno Actual</Form.Label>
                  <Form.Select
                    value={newMessage.shift}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, shift: e.target.value }))}
                    required
                  >
                    {shifts.slice(0, 3).map(shift => (
                      <option key={shift.value} value={shift.value}>{shift.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Dirigido a</Form.Label>
                  <Form.Select
                    value={newMessage.for_shift}
                    onChange={(e) => setNewMessage(prev => ({ ...prev, for_shift: e.target.value }))}
                    required
                  >
                    <option value="all">Todos los turnos</option>
                    {shifts.slice(0, 3).map(shift => (
                      <option key={shift.value} value={shift.value}>{shift.label}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Mensaje</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder="Escribe tu mensaje aquí..."
                value={newMessage.content}
                onChange={(e) => setNewMessage(prev => ({ ...prev, content: e.target.value }))}
                required
              />
              <Form.Text className="text-muted">
                {newMessage.content.length}/500 caracteres
              </Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowNewMessageModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              <FaPaperPlane className="me-2" />
              Enviar Mensaje
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Detalle del Mensaje */}
      <Modal show={showMessageDetail} onHide={() => setShowMessageDetail(false)} size="lg" centered>
        {selectedMessage && (
          <>
            <Modal.Header closeButton>
              <Modal.Title>
                <div className="d-flex align-items-center gap-2">
                  {React.createElement(getCategoryConfig(selectedMessage.category).icon)}
                  <Badge bg={getCategoryConfig(selectedMessage.category).color}>
                    {getCategoryConfig(selectedMessage.category).label}
                  </Badge>
                  <Badge bg={getPriorityConfig(selectedMessage.priority).color}>
                    {getPriorityConfig(selectedMessage.priority).label}
                  </Badge>
                </div>
              </Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <div className="mb-3">
                <small className="text-muted">
                  De: {selectedMessage.author_name} ({selectedMessage.author_role}) • 
                  {formatDate(selectedMessage.created_at)} • 
                  Turno: {shifts.find(s => s.value === selectedMessage.shift)?.label}
                </small>
              </div>
              
              <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
                {selectedMessage.content}
              </p>
              
              <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                <div className="d-flex align-items-center gap-3">
                  <button
                    className="btn btn-outline-danger"
                    onClick={() => toggleLike(selectedMessage.id)}
                    style={{
                      background: selectedMessage.likes?.includes(user.email) ? '#dc3545' : 'transparent',
                      color: selectedMessage.likes?.includes(user.email) ? 'white' : '#dc3545'
                    }}
                  >
                    <FaHeart className="me-1" />
                    {selectedMessage.likes?.length || 0} Me gusta
                  </button>
                </div>
                
                <small className="text-muted">
                  Leído por {selectedMessage.read_by?.length || 0} persona{(selectedMessage.read_by?.length || 0) !== 1 ? 's' : ''}
                </small>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowMessageDetail(false)}>
                Cerrar
              </Button>
            </Modal.Footer>
          </>
        )}
      </Modal>
    </Container>
  );
};

export default MessagingSystem;