// src/components/EmployeeDirectory.js - ARCHIVO COMPLETO CORREGIDO
import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  Card, 
  Button, 
  Form, 
  Row, 
  Col, 
  Alert, 
  Badge, 
  Image, 
  Spinner,
  InputGroup,
  Accordion,
  ListGroup,
  OverlayTrigger,
  Tooltip
} from 'react-bootstrap';
import { 
  FaUsers, 
  FaSearch, 
  FaPhone, 
  FaEnvelope, 
  FaMapMarkerAlt,
  FaBriefcase,
  FaCalendarAlt,
  FaEye,
  FaFilter,
  FaSortAlphaDown,
  FaSortAlphaUp,
  FaUserCircle,
  FaIdCard,
  FaClock
} from 'react-icons/fa';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../firebase';
import UserProfile from './UserProfile';

const EmployeeDirectory = ({ show, onHide, user, userRole }) => {
  // Estados principales
  const [employees, setEmployees] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('firstName');
  const [sortOrder, setSortOrder] = useState('asc');

  // Estados del modal de perfil
  const [showProfile, setShowProfile] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // CORRECCIÓN: Funciones para avatar automático
  const generateEmployeeAvatar = (employee, size = 60) => {
    const name = employee.displayName || 
                 `${employee.firstName || ''} ${employee.lastName || ''}`.trim() ||
                 employee.email?.split('@')[0] ||
                 'Usuario';
                 
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    
    const colors = [
      '#e74c3c', '#3498db', '#2ecc71', '#f39c12', 
      '#9b59b6', '#1abc9c', '#34495e', '#e67e22'
    ];
    
    const colorIndex = name.length % colors.length;
    const backgroundColor = colors[colorIndex];
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${backgroundColor}"/>
        <text x="${size/2}" y="${size/2 + size/6}" text-anchor="middle" fill="white" 
              font-family="Arial, sans-serif" font-size="${size/3}" font-weight="bold">${initials}</text>
      </svg>
    `;
    
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const getEmployeeImageSrc = (employee) => {
    return employee.profileImage || generateEmployeeAvatar(employee, 60);
  };

  // CORRECCIÓN: Función para mapear nombres de roles
  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: 'Admin',
      manager: 'Gerente', 
      bartender: 'Bartender',
      waiter: 'Mesero',
      server: 'Mesero',
      cocinero: 'Cocinero',
      chef: 'Chef',
      host: 'Anfitrión',
      runner: 'Runner',
      busser: 'Busser'
    };
    
    return roleMap[role] || 'Sin rol';
  };

  // Cargar empleados
  useEffect(() => {
    if (show) {
      const employeesQuery = query(
        collection(db, 'users'),
        orderBy('firstName', 'asc')
      );

      const unsubscribe = onSnapshot(employeesQuery, 
        (snapshot) => {
          const employeeData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setEmployees(employeeData);
          setLoading(false);
        },
        (error) => {
          console.error('Error loading employees:', error);
          setError('Error al cargar el directorio de empleados');
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [show]);

  // Aplicar filtros y ordenamiento
  useEffect(() => {
    let filtered = [...employees];

    // Filtro de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.firstName?.toLowerCase().includes(search) ||
        emp.lastName?.toLowerCase().includes(search) ||
        emp.displayName?.toLowerCase().includes(search) ||
        emp.email?.toLowerCase().includes(search) ||
        emp.workInfo?.position?.toLowerCase().includes(search) ||
        emp.workInfo?.department?.toLowerCase().includes(search)
      );
    }

    // Filtro por departamento
    if (departmentFilter) {
      filtered = filtered.filter(emp => emp.workInfo?.department === departmentFilter);
    }

    // Filtro por posición
    if (positionFilter) {
      filtered = filtered.filter(emp => emp.workInfo?.position === positionFilter);
    }

    // Filtro por estado
    if (statusFilter) {
      filtered = filtered.filter(emp => emp.workInfo?.status === statusFilter || emp.active === (statusFilter === 'active'));
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue = '';
      let bValue = '';

      switch (sortBy) {
        case 'firstName':
          aValue = a.firstName || '';
          bValue = b.firstName || '';
          break;
        case 'lastName':
          aValue = a.lastName || '';
          bValue = b.lastName || '';
          break;
        case 'department':
          aValue = a.workInfo?.department || '';
          bValue = b.workInfo?.department || '';
          break;
        case 'position':
          aValue = a.workInfo?.position || '';
          bValue = b.workInfo?.position || '';
          break;
        case 'startDate':
          aValue = a.workInfo?.startDate || '';
          bValue = b.workInfo?.startDate || '';
          break;
        default:
          aValue = a.firstName || '';
          bValue = b.firstName || '';
      }

      if (sortOrder === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

    setFilteredEmployees(filtered);
  }, [employees, searchTerm, departmentFilter, positionFilter, statusFilter, sortBy, sortOrder]);

  // Funciones auxiliares
  const getUniqueValues = (field, subfield = null) => {
    const values = employees.map(emp => {
      if (subfield) {
        return emp[field]?.[subfield];
      }
      return emp[field];
    }).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'danger';
      case 'manager': return 'primary';
      case 'bartender': return 'success';
      case 'waiter': return 'warning';
      case 'server': return 'warning';
      case 'cocinero': return 'info';
      case 'chef': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'secondary';
      case 'vacation': return 'info';
      case 'sick': return 'warning';
      case 'suspended': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Activo';
      case 'inactive': return 'Inactivo';
      case 'vacation': return 'Vacaciones';
      case 'sick': return 'Licencia';
      case 'suspended': return 'Suspendido';
      default: return 'No definido';
    }
  };

  const canViewProfile = (employee) => {
    return userRole === 'admin' || 
           userRole === 'manager' || 
           user.email === employee.email;
  };

  const canViewContactInfo = (employee) => {
    if (userRole === 'admin' || userRole === 'manager') return true;
    if (user.email === employee.email) return true;
    return employee.preferences?.privacy?.showPhone !== false;
  };

  const handleViewProfile = (employee) => {
    setSelectedEmployee(employee);
    setShowProfile(true);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    setPositionFilter('');
    setStatusFilter('');
    setSortBy('firstName');
    setSortOrder('asc');
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="xl" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaUsers className="me-2" />
            Directorio de Empleados
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {loading && (
            <div className="text-center p-4">
              <Spinner animation="border" />
              <p className="mt-2">Cargando directorio...</p>
            </div>
          )}

          {error && <Alert variant="danger">{error}</Alert>}

          {!loading && (
            <>
              {/* Controles de filtros y búsqueda */}
              <Card className="mb-4 border-0 shadow-sm">
                <Card.Body>
                  <Row>
                    <Col md={4}>
                      <InputGroup className="mb-3">
                        <InputGroup.Text><FaSearch /></InputGroup.Text>
                        <Form.Control
                          type="text"
                          placeholder="Buscar empleados..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </InputGroup>
                    </Col>
                    <Col md={2}>
                      <Form.Select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="mb-3"
                      >
                        <option value="">Todos los departamentos</option>
                        {getUniqueValues('workInfo', 'department').map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Form.Select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="mb-3"
                      >
                        <option value="">Todas las posiciones</option>
                        {getUniqueValues('workInfo', 'position').map(pos => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="mb-3"
                      >
                        <option value="">Todos los estados</option>
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                        <option value="vacation">Vacaciones</option>
                        <option value="sick">Licencia</option>
                      </Form.Select>
                    </Col>
                    <Col md={2}>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={resetFilters}
                        >
                          <FaFilter className="me-1" />
                          Reset
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleSort('firstName')}
                        >
                          {sortBy === 'firstName' && sortOrder === 'asc' ? 
                            <FaSortAlphaUp /> : <FaSortAlphaDown />}
                        </Button>
                      </div>
                    </Col>
                    <Col xs="auto">
                      <Badge bg="info">
                        {filteredEmployees.length} empleado{filteredEmployees.length !== 1 ? 's' : ''}
                      </Badge>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Grid de empleados */}
              {filteredEmployees.length === 0 ? (
                <Card className="text-center p-4">
                  <Card.Body>
                    <FaUsers size={48} className="text-muted mb-3" />
                    <h5>No se encontraron empleados</h5>
                    <p className="text-muted">Ajusta los filtros de búsqueda para ver más resultados</p>
                  </Card.Body>
                </Card>
              ) : (
                <Row>
                  {filteredEmployees.map(employee => (
                    <Col key={employee.id} lg={4} md={6} className="mb-4">
                      <Card className="h-100 shadow-sm border-0 employee-card">
                        <Card.Body>
                          {/* Header con foto y info básica */}
                          <div className="d-flex align-items-center mb-3">
                            <div className="me-3">
                              {/* CORRECCIÓN: Imagen con avatar automático */}
                              <Image
                                src={getEmployeeImageSrc(employee)}
                                roundedCircle
                                width={60}
                                height={60}
                                style={{ objectFit: 'cover' }}
                                onError={(e) => {
                                  e.target.src = generateEmployeeAvatar(employee, 60);
                                }}
                              />
                            </div>
                            <div className="flex-grow-1">
                              <h6 className="mb-1">
                                {employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Sin nombre'}
                              </h6>
                              <div className="d-flex flex-wrap gap-1 mb-1">
                                <Badge bg={getRoleColor(employee.role)}>
                                  {getRoleDisplayName(employee.role)}
                                </Badge>
                                <Badge bg={getStatusColor(employee.workInfo?.status)}>
                                  {getStatusText(employee.workInfo?.status)}
                                </Badge>
                              </div>
                              <small className="text-muted">{employee.email}</small>
                            </div>
                          </div>

                          {/* Información laboral */}
                          <div className="mb-3">
                            {employee.workInfo?.position && (
                              <div className="d-flex align-items-center mb-1">
                                <FaBriefcase className="me-2 text-muted" size={14} />
                                <small>{employee.workInfo.position}</small>
                              </div>
                            )}
                            {employee.workInfo?.department && (
                              <div className="d-flex align-items-center mb-1">
                                <FaIdCard className="me-2 text-muted" size={14} />
                                <small>{employee.workInfo.department}</small>
                              </div>
                            )}
                            {employee.workInfo?.startDate && (
                              <div className="d-flex align-items-center mb-1">
                                <FaCalendarAlt className="me-2 text-muted" size={14} />
                                <small>Desde {new Date(employee.workInfo.startDate).toLocaleDateString('es-AR')}</small>
                              </div>
                            )}
                          </div>

                          {/* Información de contacto */}
                          <div className="mb-3">
                            {canViewContactInfo(employee) && employee.phone && (
                              <div className="d-flex align-items-center mb-1">
                                <FaPhone className="me-2 text-muted" size={14} />
                                <small>{employee.phone}</small>
                              </div>
                            )}
                            {(userRole === 'admin' || userRole === 'manager') && employee.address?.city && (
                              <div className="d-flex align-items-center mb-1">
                                <FaMapMarkerAlt className="me-2 text-muted" size={14} />
                                <small>{employee.address.city}, {employee.address.state}</small>
                              </div>
                            )}
                          </div>

                          {/* Habilidades principales */}
                          {employee.skills && employee.skills.length > 0 && (
                            <div className="mb-3">
                              <small className="text-muted d-block mb-1">Habilidades:</small>
                              <div className="d-flex flex-wrap gap-1">
                                {employee.skills.slice(0, 3).map((skill, index) => (
                                  <Badge key={index} bg="light" text="dark" className="small">
                                    {skill}
                                  </Badge>
                                ))}
                                {employee.skills.length > 3 && (
                                  <Badge bg="light" text="muted" className="small">
                                    +{employee.skills.length - 3}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Botón de acción */}
                          <div className="d-grid">
                            {canViewProfile(employee) ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleViewProfile(employee)}
                              >
                                <FaEye className="me-1" />
                                Ver Perfil Completo
                              </Button>
                            ) : (
                              <Button variant="outline-secondary" size="sm" disabled>
                                <FaUserCircle className="me-1" />
                                Información Limitada
                              </Button>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          <div className="d-flex justify-content-between align-items-center w-100">
            <Badge bg="secondary">
              Total: {employees.length} empleados
            </Badge>
            <Button variant="secondary" onClick={onHide}>
              Cerrar
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Modal de perfil de usuario */}
      {showProfile && selectedEmployee && (
        <UserProfile
          show={showProfile}
          onHide={() => setShowProfile(false)}
          user={user}
          userRole={userRole}
          currentUserData={selectedEmployee}
          onProfileUpdate={(updatedData) => {
            // Actualizar la lista de empleados localmente
            setEmployees(prev => prev.map(emp => 
              emp.id === selectedEmployee.id ? { ...emp, ...updatedData } : emp
            ));
          }}
        />
      )}

      {/* Estilos adicionales */}
      <style>{`
        .employee-card {
          transition: all 0.2s ease;
          border-radius: 12px;
        }
        .employee-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .employee-card .card-body {
          padding: 1.25rem;
        }
        .badge {
          font-size: 0.7rem;
        }
      `}</style>
    </>
  );
};

export default EmployeeDirectory;