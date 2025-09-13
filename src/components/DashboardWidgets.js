// src/components/DashboardWidgets.js - VERSIÓN SIMPLIFICADA Y SEGURA CON NAVEGACIÓN CORREGIDA
import React from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import {
  FaCalendarDay,
  FaUsers,
  FaComments,
  FaBoxes,
  FaChartLine,
  FaUserClock,
  FaEye
} from 'react-icons/fa';

const DashboardWidgets = ({ user, userRole, inventory, employees, onNavigate }) => {
  // Función segura para calcular estadísticas
  const getStats = () => {
    const safeInventory = Array.isArray(inventory) ? inventory : [];
    const safeEmployees = Array.isArray(employees) ? employees : [];
    
    // Calcular productos con stock bajo
    const lowStockCount = safeInventory.filter(item => {
      if (!item || typeof item.stock !== 'number') return false;
      const threshold = item.umbral_low || 5;
      return item.stock <= threshold;
    }).length;

    return {
      totalProducts: safeInventory.length,
      totalEmployees: safeEmployees.length,
      lowStock: lowStockCount,
      totalShifts: 0,
      activeShifts: 0,
      todayMessages: 0
    };
  };

  const stats = getStats();

  const handleNavigation = (view) => {
    if (onNavigate && typeof onNavigate === 'function') {
      onNavigate(view);
    }
  };

  return (
    <div>
      <Row className="mb-4">
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            color: 'white'
          }}>
            <Card.Body>
              <FaCalendarDay size={24} className="mb-2" />
              <h4>{stats.totalShifts}</h4>
              <small>Turnos Hoy</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #10b981, #047857)',
            color: 'white'
          }}>
            <Card.Body>
              <FaUserClock size={24} className="mb-2" />
              <h4>{stats.activeShifts}</h4>
              <small>Turnos Activos</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            color: 'white'
          }}>
            <Card.Body>
              <FaComments size={24} className="mb-2" />
              <h4>{stats.todayMessages}</h4>
              <small>Mensajes</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card 
            className="text-center border-0 h-100" 
            style={{ 
              background: stats.lowStock > 0 
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #f59e0b, #d97706)',
              color: 'white'
            }}
          >
            <Card.Body>
              <FaBoxes size={24} className="mb-2" />
              <h4>{stats.lowStock}</h4>
              <small>Stock Bajo</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
            color: 'white'
          }}>
            <Card.Body>
              <FaUsers size={24} className="mb-2" />
              <h4>{stats.totalEmployees}</h4>
              <small>Empleados</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col lg={2} md={4} sm={6} className="mb-3">
          <Card className="text-center border-0 h-100" style={{ 
            background: 'linear-gradient(135deg, #ec4899, #db2777)',
            color: 'white'
          }}>
            <Card.Body>
              <FaChartLine size={24} className="mb-2" />
              <h4>{stats.totalProducts}</h4>
              <small>Productos</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col md={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Accesos Rápidos</h5>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col lg={3} md={6}>
                  <div 
                    className="text-center p-3 rounded border"
                    style={{ 
                      background: '#f0f9ff',
                      borderColor: '#0ea5e9',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleNavigation('shifts')}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(14, 165, 233, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <FaCalendarDay size={24} style={{ color: '#0ea5e9' }} className="mb-2" />
                    <h6 className="mb-1">Horarios</h6>
                    <small className="text-muted">Gestión de turnos</small>
                  </div>
                </Col>
                
                <Col lg={3} md={6}>
                  <div 
                    className="text-center p-3 rounded border"
                    style={{ 
                      background: '#fef7ff',
                      borderColor: '#e9d5ff',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleNavigation('bar-inventory')}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <FaBoxes size={24} style={{ color: '#8b5cf6' }} className="mb-2" />
                    <h6 className="mb-1">Inventario Bar</h6>
                    <small className="text-muted">Stock y productos</small>
                  </div>
                </Col>
                
                <Col lg={3} md={6}>
                  <div 
                    className="text-center p-3 rounded border"
                    style={{ 
                      background: '#fffbeb',
                      borderColor: '#fed7aa',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleNavigation('kitchen-inventory')}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <FaUsers size={24} style={{ color: '#ea580c' }} className="mb-2" />
                    <h6 className="mb-1">Cocina</h6>
                    <small className="text-muted">Ingredientes</small>
                  </div>
                </Col>
                
                <Col lg={3} md={6}>
                  <div 
                    className="text-center p-3 rounded border"
                    style={{ 
                      background: '#f0fdf4',
                      borderColor: '#bbf7d0',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => handleNavigation('messaging')}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <FaComments size={24} style={{ color: '#16a34a' }} className="mb-2" />
                    <h6 className="mb-1">Mensajes</h6>
                    <small className="text-muted">Comunicación del equipo</small>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="mb-0">Resumen del Inventario</h6>
            </Card.Header>
            <Card.Body>
              {stats.totalProducts === 0 ? (
                <div className="text-center py-4">
                  <FaBoxes size={48} className="text-muted mb-3" />
                  <p className="text-muted">No hay productos en el inventario</p>
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => handleNavigation('bar-inventory')}
                  >
                    Agregar productos
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total de productos:</span>
                    <strong>{stats.totalProducts}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Con stock bajo:</span>
                    <strong className={stats.lowStock > 0 ? 'text-danger' : 'text-success'}>
                      {stats.lowStock}
                    </strong>
                  </div>
                  <div className="mt-3">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="w-100"
                      onClick={() => handleNavigation('bar-inventory')}
                    >
                      Ver inventario completo
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={6}>
          <Card className="h-100">
            <Card.Header>
              <h6 className="mb-0">Personal</h6>
            </Card.Header>
            <Card.Body>
              {stats.totalEmployees === 0 ? (
                <div className="text-center py-4">
                  <FaUsers size={48} className="text-muted mb-3" />
                  <p className="text-muted">No hay empleados registrados</p>
                  {userRole === 'admin' && (
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => handleNavigation('users')}
                    >
                      Gestionar usuarios
                    </Button>
                  )}
                </div>
              ) : (
                <div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Total empleados:</span>
                    <strong>{stats.totalEmployees}</strong>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span>Tu rol:</span>
                    <strong className="text-primary">
                      {userRole === 'admin' ? 'Administrador' : 
                       userRole === 'manager' ? 'Gerente' : 'Empleado'}
                    </strong>
                  </div>
                  <div className="mt-3">
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      className="w-100"
                      onClick={() => handleNavigation('employee-directory')}
                    >
                      Ver directorio
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardWidgets;