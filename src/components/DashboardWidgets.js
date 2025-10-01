// src/components/DashboardWidgets.js - VERSIÓN MEJORADA CON TODAS LAS FUNCIONALIDADES
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Badge, Alert, ListGroup, Spinner } from 'react-bootstrap';
import {
  FaCalendarDay,
  FaUsers,
  FaComments,
  FaBoxes,
  FaUserClock,
  FaExclamationTriangle,
  FaClock,
  FaBell,
  FaCheckCircle,
  FaArrowRight,
  FaChartLine,
  FaTasks,
  FaClipboardList,
  FaWineGlass,
  FaUtensils
} from 'react-icons/fa';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const DashboardWidgets = ({ user, userRole, onNavigate }) => {
  // Estados
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [kitchenInventory, setKitchenInventory] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [messages, setMessages] = useState([]);

  // Cargar datos en tiempo real
  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Cargar turnos de hoy
        const today = new Date().toISOString().split('T')[0];
        const shiftsQuery = query(
          collection(db, 'shifts'),
          where('date', '==', today)
        );
        
        const unsubscribeShifts = onSnapshot(shiftsQuery, (snapshot) => {
          const shiftsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setShifts(shiftsData);
        });

        // 2. Cargar inventario bar
        const unsubscribeBar = onSnapshot(
          collection(db, 'bar_inventory'),
          (snapshot) => {
            const barData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setInventory(barData);
          }
        );

        // 3. Cargar inventario cocina
        const unsubscribeKitchen = onSnapshot(
          collection(db, 'kitchen_inventory'),
          (snapshot) => {
            const kitchenData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setKitchenInventory(kitchenData);
          }
        );

        // 4. Cargar empleados
        const employeesSnapshot = await getDocs(collection(db, 'users'));
        const employeesData = employeesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setEmployees(employeesData);

        // 5. Cargar mensajes recientes
        const messagesQuery = query(
          collection(db, 'messages'),
          orderBy('timestamp', 'desc')
        );
        
        const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
          const messagesData = snapshot.docs.slice(0, 10).map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(messagesData);
        });

        setLoading(false);

        // Cleanup
        return () => {
          unsubscribeShifts();
          unsubscribeBar();
          unsubscribeKitchen();
          unsubscribeMessages();
        };
      } catch (error) {
        console.error('Error cargando datos:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Funciones de cálculo
  const getActiveShifts = () => {
    if (!shifts || shifts.length === 0) return [];
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    return shifts.filter(shift => {
      if (!shift || !shift.start_time || !shift.end_time) return false;
      return shift.start_time <= currentTime && shift.end_time >= currentTime;
    });
  };

  const getUpcomingShifts = () => {
    if (!shifts || shifts.length === 0) return [];
    
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const twoHoursTime = `${twoHoursLater.getHours().toString().padStart(2, '0')}:${twoHoursLater.getMinutes().toString().padStart(2, '0')}`;
    
    return shifts.filter(shift => {
      if (!shift || !shift.start_time) return false;
      return shift.start_time > currentTime && shift.start_time <= twoHoursTime;
    });
  };

  const getCriticalItems = () => {
    const allItems = [...(inventory || []), ...(kitchenInventory || [])];
    return allItems.filter(item => {
      if (!item || typeof item.stock !== 'number') return false;
      const criticalThreshold = item.umbral_critical || item.reorder_point || 2;
      return item.stock <= criticalThreshold;
    });
  };

  const getLowStockItems = () => {
    const allItems = [...(inventory || []), ...(kitchenInventory || [])];
    return allItems.filter(item => {
      if (!item || typeof item.stock !== 'number') return false;
      const lowThreshold = item.umbral_low || item.min_stock || 5;
      const criticalThreshold = item.umbral_critical || item.reorder_point || 2;
      return item.stock > criticalThreshold && item.stock <= lowThreshold;
    });
  };

  const getUnreadMessages = () => {
    if (!messages || messages.length === 0) return [];
    return messages.filter(msg => 
      !msg.read_by || !msg.read_by.includes(user?.uid)
    );
  };

  const getEmployeeInfo = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? {
      name: employee.displayName || employee.email?.split('@')[0] || 'Empleado',
      role: employee.role || 'staff'
    } : null;
  };

  // Datos calculados
  const activeShifts = getActiveShifts();
  const upcomingShifts = getUpcomingShifts();
  const criticalItems = getCriticalItems();
  const lowStockItems = getLowStockItems();
  const unreadMessages = getUnreadMessages();

  const handleNavigation = (view) => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate(view);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Cargando dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* SECCIÓN 1: Alertas Urgentes */}
      {(criticalItems.length > 0 || upcomingShifts.length > 0) && (
        <Alert variant="warning" className="mb-4">
          <div className="d-flex align-items-center mb-2">
            <FaExclamationTriangle className="me-2" size={20} />
            <strong>Alertas Urgentes</strong>
          </div>
          <ul className="mb-0 ps-4">
            {criticalItems.length > 0 && (
              <li>
                <strong>{criticalItems.length}</strong> producto(s) en stock crítico que necesitan reorden inmediato
              </li>
            )}
            {upcomingShifts.length > 0 && (
              <li>
                <strong>{upcomingShifts.length}</strong> empleado(s) entran en las próximas 2 horas
              </li>
            )}
          </ul>
        </Alert>
      )}

      {/* SECCIÓN 2: Estadísticas Principales */}
      <Row className="mb-4">
        <Col lg={3} md={6} className="mb-3">
          <Card 
            className="text-center border-0 h-100 shadow-sm"
            style={{ 
              background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: 'white',
              cursor: 'pointer'
            }}
            onClick={() => handleNavigation('shifts')}
          >
            <Card.Body>
              <FaCalendarDay size={28} className="mb-2" />
              <h3 className="mb-1">{shifts.length}</h3>
              <small>Turnos Hoy</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <Card 
            className="text-center border-0 h-100 shadow-sm"
            style={{ 
              background: activeShifts.length > 0 
                ? 'linear-gradient(135deg, #10b981, #047857)' 
                : 'linear-gradient(135deg, #6b7280, #4b5563)',
              color: 'white',
              cursor: 'pointer'
            }}
            onClick={() => handleNavigation('shifts')}
          >
            <Card.Body>
              <FaUserClock size={28} className="mb-2" />
              <h3 className="mb-1">{activeShifts.length}</h3>
              <small>Trabajando Ahora</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <Card 
            className="text-center border-0 h-100 shadow-sm"
            style={{ 
              background: unreadMessages.length > 0
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
              color: 'white',
              cursor: 'pointer'
            }}
            onClick={() => handleNavigation('messaging')}
          >
            <Card.Body>
              <FaComments size={28} className="mb-2" />
              <h3 className="mb-1">{unreadMessages.length}</h3>
              <small>Mensajes Sin Leer</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={3} md={6} className="mb-3">
          <Card 
            className="text-center border-0 h-100 shadow-sm"
            style={{ 
              background: criticalItems.length > 0 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : lowStockItems.length > 0
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #10b981, #047857)',
              color: 'white',
              cursor: 'pointer'
            }}
            onClick={() => handleNavigation('bar-inventory')}
          >
            <Card.Body>
              <FaBoxes size={28} className="mb-2" />
              <h3 className="mb-1">
                {criticalItems.length > 0 ? criticalItems.length : 
                 lowStockItems.length > 0 ? lowStockItems.length : 
                 inventory.length + kitchenInventory.length}
              </h3>
              <small>
                {criticalItems.length > 0 ? '¡CRÍTICO!' : 
                 lowStockItems.length > 0 ? 'Stock Bajo' : 
                 'Stock OK'}
              </small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* SECCIÓN 3: Información en Tiempo Real */}
      <Row className="mb-4">
        {/* Turnos Activos */}
        <Col lg={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FaUserClock className="me-2" />
                  <strong>Personal Trabajando Ahora</strong>
                </div>
                <Badge bg="light" text="dark">{activeShifts.length}</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              {activeShifts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <FaClock size={32} className="mb-2 opacity-50" />
                  <p className="mb-0">No hay empleados trabajando en este momento</p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {activeShifts.map(shift => {
                    const empInfo = getEmployeeInfo(shift.employee_id);
                    return (
                      <ListGroup.Item key={shift.id} className="px-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{empInfo?.name || 'Empleado'}</strong>
                            <div className="small text-muted">
                              <Badge bg="secondary" className="me-2">{shift.position || empInfo?.role}</Badge>
                              {shift.start_time} - {shift.end_time}
                            </div>
                          </div>
                          <Badge bg={shift.shift_type === 'morning' ? 'warning' : 'dark'}>
                            {shift.shift_type === 'morning' ? 'Mañana' : 'Noche'}
                          </Badge>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
              <div className="mt-3 text-center">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => handleNavigation('shifts')}
                >
                  Ver Todos los Turnos <FaArrowRight className="ms-1" />
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Próximos Turnos */}
        <Col lg={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Header className="bg-info text-white">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <FaClock className="me-2" />
                  <strong>Próximas Entradas (2h)</strong>
                </div>
                <Badge bg="light" text="dark">{upcomingShifts.length}</Badge>
              </div>
            </Card.Header>
            <Card.Body>
              {upcomingShifts.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <FaCheckCircle size={32} className="mb-2 opacity-50" />
                  <p className="mb-0">No hay entradas próximas</p>
                </div>
              ) : (
                <ListGroup variant="flush">
                  {upcomingShifts.map(shift => {
                    const empInfo = getEmployeeInfo(shift.employee_id);
                    return (
                      <ListGroup.Item key={shift.id} className="px-0">
                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <strong>{empInfo?.name || 'Empleado'}</strong>
                            <div className="small text-muted">
                              <Badge bg="secondary" className="me-2">{shift.position || empInfo?.role}</Badge>
                              Entra a las {shift.start_time}
                            </div>
                          </div>
                          <Badge bg="info" className="text-white">
                            {shift.start_time}
                          </Badge>
                        </div>
                      </ListGroup.Item>
                    );
                  })}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* SECCIÓN 4: Inventario Crítico */}
      {(criticalItems.length > 0 || lowStockItems.length > 0) && (
        <Row className="mb-4">
          <Col>
            <Card className="shadow-sm border-danger">
              <Card.Header className="bg-danger text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <FaExclamationTriangle className="me-2" />
                    <strong>Productos que Requieren Atención</strong>
                  </div>
                  <Badge bg="light" text="dark">
                    {criticalItems.length + lowStockItems.length}
                  </Badge>
                </div>
              </Card.Header>
              <Card.Body>
                <Row>
                  {criticalItems.length > 0 && (
                    <Col md={6} className="mb-3">
                      <h6 className="text-danger">
                        <FaExclamationTriangle className="me-2" />
                        Stock Crítico - Reorden Urgente
                      </h6>
                      <ListGroup variant="flush">
                        {criticalItems.slice(0, 5).map(item => {
                          const isBar = inventory.find(i => i.id === item.id);
                          return (
                            <ListGroup.Item key={item.id} className="px-0 py-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center">
                                    <strong className="text-danger me-2">{item.name}</strong>
                                    <Badge bg={isBar ? 'primary' : 'warning'} className="badge-sm">
                                      {isBar ? <><FaWineGlass size={10} /> Bar</> : <><FaUtensils size={10} /> Cocina</>}
                                    </Badge>
                                  </div>
                                  <div className="small text-muted">
                                    Stock: <strong className="text-danger">{item.stock || 0}</strong> {item.unit || 'unidades'}
                                    {item.umbral_critical && <span className="ms-2">(Umbral: {item.umbral_critical})</span>}
                                  </div>
                                </div>
                                <Badge bg="danger">¡CRÍTICO!</Badge>
                              </div>
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                      {criticalItems.length > 5 && (
                        <div className="text-center mt-2">
                          <small className="text-muted">+ {criticalItems.length - 5} productos más</small>
                        </div>
                      )}
                    </Col>
                  )}
                  
                  {lowStockItems.length > 0 && (
                    <Col md={criticalItems.length > 0 ? 6 : 12} className="mb-3">
                      <h6 className="text-warning">
                        <FaBell className="me-2" />
                        Stock Bajo - Reorden Pronto
                      </h6>
                      <ListGroup variant="flush">
                        {lowStockItems.slice(0, 5).map(item => {
                          const isBar = inventory.find(i => i.id === item.id);
                          return (
                            <ListGroup.Item key={item.id} className="px-0 py-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center">
                                    <strong className="text-warning me-2">{item.name}</strong>
                                    <Badge bg={isBar ? 'primary' : 'warning'} className="badge-sm">
                                      {isBar ? <><FaWineGlass size={10} /> Bar</> : <><FaUtensils size={10} /> Cocina</>}
                                    </Badge>
                                  </div>
                                  <div className="small text-muted">
                                    Stock: <strong className="text-warning">{item.stock || 0}</strong> {item.unit || 'unidades'}
                                    {item.umbral_low && <span className="ms-2">(Umbral: {item.umbral_low})</span>}
                                  </div>
                                </div>
                                <Badge bg="warning" text="dark">Bajo</Badge>
                              </div>
                            </ListGroup.Item>
                          );
                        })}
                      </ListGroup>
                      {lowStockItems.length > 5 && (
                        <div className="text-center mt-2">
                          <small className="text-muted">+ {lowStockItems.length - 5} productos más</small>
                        </div>
                      )}
                    </Col>
                  )}
                </Row>
                <div className="text-center mt-3">
                  <Button 
                    variant="outline-danger" 
                    size="sm" 
                    className="me-2"
                    onClick={() => handleNavigation('bar-inventory')}
                  >
                    <FaWineGlass className="me-2" />
                    Ver Inventario Bar
                  </Button>
                  <Button 
                    variant="outline-warning" 
                    size="sm"
                    onClick={() => handleNavigation('kitchen-inventory')}
                  >
                    <FaUtensils className="me-2" />
                    Ver Inventario Cocina
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* SECCIÓN 5: Acciones Rápidas por Rol */}
      <Row className="mb-4">
        <Col>
          <Card className="shadow-sm">
            <Card.Header>
              <strong>Acciones Rápidas</strong>
            </Card.Header>
            <Card.Body>
              <Row>
                {/* Acciones para todos */}
                <Col md={3} sm={6} className="mb-3">
                  <Button 
                    variant="outline-primary" 
                    className="w-100"
                    onClick={() => handleNavigation('shifts')}
                  >
                    <FaCalendarDay className="d-block mx-auto mb-2" size={24} />
                    <small>Ver Mis Turnos</small>
                  </Button>
                </Col>

                <Col md={3} sm={6} className="mb-3">
                  <Button 
                    variant="outline-info" 
                    className="w-100"
                    onClick={() => handleNavigation('messaging')}
                  >
                    <FaComments className="d-block mx-auto mb-2" size={24} />
                    <small>Mensajes</small>
                  </Button>
                </Col>

                {/* Acciones específicas por rol */}
                {(userRole === 'admin' || userRole === 'manager') && (
                  <>
                    <Col md={3} sm={6} className="mb-3">
                      <Button 
                        variant="outline-success" 
                        className="w-100"
                        onClick={() => handleNavigation('shifts')}
                      >
                        <FaUsers className="d-block mx-auto mb-2" size={24} />
                        <small>Gestionar Personal</small>
                      </Button>
                    </Col>
                    
                    <Col md={3} sm={6} className="mb-3">
                      <Button 
                        variant="outline-warning" 
                        className="w-100"
                        onClick={() => handleNavigation('bar-inventory')}
                      >
                        <FaChartLine className="d-block mx-auto mb-2" size={24} />
                        <small>Ver Reportes</small>
                      </Button>
                    </Col>
                  </>
                )}

                {(userRole === 'bartender' || userRole === 'admin' || userRole === 'manager') && (
                  <Col md={3} sm={6} className="mb-3">
                    <Button 
                      variant="outline-primary" 
                      className="w-100"
                      onClick={() => handleNavigation('bar-inventory')}
                    >
                      <FaWineGlass className="d-block mx-auto mb-2" size={24} />
                      <small>Inventario Bar</small>
                    </Button>
                  </Col>
                )}

                {(userRole === 'chef' || userRole === 'cocinero' || userRole === 'admin' || userRole === 'manager') && (
                  <Col md={3} sm={6} className="mb-3">
                    <Button 
                      variant="outline-danger" 
                      className="w-100"
                      onClick={() => handleNavigation('kitchen-inventory')}
                    >
                      <FaUtensils className="d-block mx-auto mb-2" size={24} />
                      <small>Inventario Cocina</small>
                    </Button>
                  </Col>
                )}
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* SECCIÓN 6: Resumen del Equipo */}
      <Row>
        <Col lg={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Header>
              <FaUsers className="me-2" />
              <strong>Resumen del Personal</strong>
            </Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-3">
                <span>Total Empleados:</span>
                <strong>{employees.length}</strong>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span>Trabajando Hoy:</span>
                <strong className="text-primary">{shifts.length}</strong>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span>Activos Ahora:</span>
                <strong className="text-success">{activeShifts.length}</strong>
              </div>
              <div className="d-flex justify-content-between">
                <span>Tu Rol:</span>
                <Badge bg="primary">
                  {userRole === 'admin' ? 'Administrador' : 
                   userRole === 'manager' ? 'Gerente' : 
                   userRole === 'bartender' ? 'Bartender' :
                   userRole === 'chef' ? 'Chef' :
                   userRole === 'cocinero' ? 'Cocinero' :
                   'Empleado'}
                </Badge>
              </div>
              <div className="mt-3 text-center">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={() => handleNavigation('employee-directory')}
                >
                  Ver Directorio Completo
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={6} className="mb-3">
          <Card className="h-100 shadow-sm">
            <Card.Header>
              <FaClipboardList className="me-2" />
              <strong>Estado del Negocio</strong>
            </Card.Header>
            <Card.Body>
              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Inventario Bar:</span>
                  <Badge bg={
                    inventory.filter(i => i.stock <= (i.umbral_critical || i.reorder_point || 2)).length > 0 ? 'danger' :
                    inventory.filter(i => i.stock <= (i.umbral_low || i.min_stock || 5)).length > 0 ? 'warning' : 
                    'success'
                  }>
                    {inventory.length} items
                  </Badge>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  {(() => {
                    const total = inventory.length || 1;
                    const critical = inventory.filter(i => i.stock <= (i.umbral_critical || i.reorder_point || 2)).length;
                    const low = inventory.filter(i => {
                      const crit = i.umbral_critical || i.reorder_point || 2;
                      const lowThresh = i.umbral_low || i.min_stock || 5;
                      return i.stock > crit && i.stock <= lowThresh;
                    }).length;
                    const ok = total - critical - low;
                    
                    return (
                      <>
                        {ok > 0 && (
                          <div 
                            className="progress-bar bg-success" 
                            style={{ width: `${(ok / total * 100)}%` }}
                          />
                        )}
                        {low > 0 && (
                          <div 
                            className="progress-bar bg-warning" 
                            style={{ width: `${(low / total * 100)}%` }}
                          />
                        )}
                        {critical > 0 && (
                          <div 
                            className="progress-bar bg-danger" 
                            style={{ width: `${(critical / total * 100)}%` }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Inventario Cocina:</span>
                  <Badge bg={
                    kitchenInventory.filter(i => i.stock <= (i.umbral_critical || i.reorder_point || 2)).length > 0 ? 'danger' :
                    kitchenInventory.filter(i => i.stock <= (i.umbral_low || i.min_stock || 5)).length > 0 ? 'warning' : 
                    'success'
                  }>
                    {kitchenInventory.length} items
                  </Badge>
                </div>
                <div className="progress" style={{ height: '8px' }}>
                  {(() => {
                    const total = kitchenInventory.length || 1;
                    const critical = kitchenInventory.filter(i => i.stock <= (i.umbral_critical || i.reorder_point || 2)).length;
                    const low = kitchenInventory.filter(i => {
                      const crit = i.umbral_critical || i.reorder_point || 2;
                      const lowThresh = i.umbral_low || i.min_stock || 5;
                      return i.stock > crit && i.stock <= lowThresh;
                    }).length;
                    const ok = total - critical - low;
                    
                    return (
                      <>
                        {ok > 0 && (
                          <div 
                            className="progress-bar bg-success" 
                            style={{ width: `${(ok / total * 100)}%` }}
                          />
                        )}
                        {low > 0 && (
                          <div 
                            className="progress-bar bg-warning" 
                            style={{ width: `${(low / total * 100)}%` }}
                          />
                        )}
                        {critical > 0 && (
                          <div 
                            className="progress-bar bg-danger" 
                            style={{ width: `${(critical / total * 100)}%` }}
                          />
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mb-3">
                <div className="d-flex justify-content-between mb-2">
                  <span>Cobertura de Turnos:</span>
                  <Badge bg={shifts.length > 0 ? 'success' : 'warning'}>
                    {shifts.length > 0 ? 'Cubierto' : 'Pendiente'}
                  </Badge>
                </div>
              </div>

              <div className="text-center mt-3">
                <small className="text-muted">
                  Última actualización: {new Date().toLocaleTimeString('es-ES')}
                </small>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardWidgets;