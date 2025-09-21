// src/components/PublicScheduleViewer.js
import React, { useState, useEffect } from 'react';
import { 
  FaCalendarWeek, 
  FaClock, 
  FaUsers, 
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaDownload,
  FaPrint,
  FaArrowLeft
} from 'react-icons/fa';
import { 
  Container, 
  Card, 
  Table, 
  Badge, 
  Spinner, 
  Alert,
  Row,
  Col,
  Button,
  ButtonGroup
} from 'react-bootstrap';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const PublicScheduleViewer = ({ scheduleId: propScheduleId, onBack, user, userRole }) => {
  // Estados
  const [schedule, setSchedule] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('FOH'); // Nuevo estado para el departamento seleccionado

  // Obtener scheduleId de props o de la URL
  const getScheduleId = () => {
    if (propScheduleId) return propScheduleId;
    
    // Si no hay prop, intentar obtener de la URL
    const urlParts = window.location.pathname.split('/');
    if (urlParts.includes('schedule') && urlParts.includes('view')) {
      const index = urlParts.indexOf('view');
      return urlParts[index + 1];
    }
    
    return null;
  };

  // Determinar qué departamento puede ver el usuario
  const getUserDepartment = () => {
    if (!user) return 'FOH';
    
    // Si es admin, puede cambiar entre departamentos, pero empieza con FOH
    if (userRole === 'admin') return selectedDepartment;
    
    // Obtener departamento del usuario
    const userDepartment = user.workInfo?.department || user.department;
    
    // Si no tiene departamento definido, intentar determinarlo por rol
    if (!userDepartment) {
      const fohRoles = ['host', 'hostess', 'server', 'server_senior', 'bartender', 'bartender_head', 'runner', 'food_runner', 'busser', 'manager', 'floor_manager', 'shift_manager'];
      const bohRoles = ['chef', 'sous_chef', 'line_cook', 'prep_cook', 'cook', 'dishwasher', 'expo'];
      
      if (fohRoles.includes(user.role?.toLowerCase())) return 'FOH';
      if (bohRoles.includes(user.role?.toLowerCase())) return 'BOH';
    }
    
    return userDepartment || 'FOH'; // Por defecto FOH
  };

  const scheduleId = getScheduleId();
  const allowedDepartment = getUserDepartment();

  useEffect(() => {
    const loadScheduleData = async () => {
      const currentScheduleId = getScheduleId(); // Obtener scheduleId local para useEffect
      
      if (!currentScheduleId) {
        setError('ID de horario no encontrado en la URL');
        setLoading(false);
        return;
      }

      try {
        console.log('Cargando horario con ID:', currentScheduleId);
        
        // Cargar horario publicado
        const scheduleDoc = await getDoc(doc(db, 'published_schedules', currentScheduleId));
        
        if (!scheduleDoc.exists()) {
          setError('Horario no encontrado');
          setLoading(false);
          return;
        }

        const scheduleData = { id: scheduleDoc.id, ...scheduleDoc.data() };
        setSchedule(scheduleData);
        
        console.log('Horario cargado:', {
          title: scheduleData.title,
          week_start: scheduleData.week_start,
          week_end: scheduleData.week_end,
          shifts_included: scheduleData.shifts_included?.length || 0
        });

        // Cargar turnos incluidos con división en lotes para evitar el límite de 30 en consultas IN
        if (scheduleData.shifts_included && scheduleData.shifts_included.length > 0) {
          console.log('Buscando turnos con IDs:', scheduleData.shifts_included);
          
          const allShifts = [];
          const batchSize = 30; // Límite de Firebase para consultas IN
          const shiftIds = scheduleData.shifts_included;
          
          // Dividir los IDs en lotes de 30
          for (let i = 0; i < shiftIds.length; i += batchSize) {
            const batch = shiftIds.slice(i, i + batchSize);
            console.log(`Cargando lote ${Math.floor(i/batchSize) + 1} con ${batch.length} turnos`);
            
            const shiftsQuery = query(
              collection(db, 'shifts'),
              where('__name__', 'in', batch)
            );
            
            const shiftsSnapshot = await getDocs(shiftsQuery);
            const batchShifts = shiftsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            allShifts.push(...batchShifts);
          }
          
          console.log('Turnos encontrados:', allShifts.length);
          console.log('Turnos detalle:', allShifts.map(s => ({
            id: s.id,
            date: s.date,
            employee: s.employee_id,
            position: s.position || s.employee_role || s.role
          })));
          
          setShifts(allShifts);
        } else {
          console.log('No hay shifts_included en el horario');
          setShifts([]);
        }

        // Cargar información de empleados
        const employeesSnapshot = await getDocs(collection(db, 'users'));
        const employeesData = employeesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(emp => emp.active !== false);
        setEmployees(employeesData);
        
        console.log('Empleados cargados:', employeesData.length);

      } catch (err) {
        console.error('Error loading schedule:', err);
        setError('Error al cargar el horario: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadScheduleData();
  }, [propScheduleId]); // Dependencia en propScheduleId para recargar si cambia

  // Funciones auxiliares
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
    const employee = employees.find(emp => emp.id === employeeId || emp.email === employeeId);
    return employee ? (employee.displayName || employee.email.split('@')[0]) : 'Empleado no encontrado';
  };

  const getEmployeePhone = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId || emp.email === employeeId);
    return employee?.phone || '';
  };

  const getWeekDates = (startDate) => {
    const dates = [];
    
    // Usar directamente la fecha de inicio del horario (ya es domingo)
    const start = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  // Colores diferenciados para cada tipo de trabajo
  const getPositionColor = (position) => {
    const colors = {
      // FOH - Front of House
      'host': '#3498db',           // Azul brillante
      'hostess': '#3498db',        // Azul brillante
      'server': '#27ae60',         // Verde
      'server_senior': '#229954',  // Verde oscuro
      'bartender': '#9b59b6',      // Púrpura
      'bartender_head': '#8e44ad', // Púrpura oscuro
      'runner': '#1abc9c',         // Turquesa
      'food_runner': '#17a2b8',    // Cyan
      'busser': '#16a085',         // Verde azulado
      'manager': '#e67e22',        // Naranja
      'floor_manager': '#d35400',  // Naranja oscuro
      'shift_manager': '#e67e22',  // Naranja
      
      // BOH - Back of House
      'dishwasher': '#95a5a6',     // Gris
      'prep_cook': '#e74c3c',      // Rojo
      'line_cook': '#c0392b',      // Rojo oscuro
      'cook': '#d35400',           // Naranja rojizo
      'sous_chef': '#f39c12',      // Amarillo oscuro
      'chef': '#f1c40f',           // Amarillo brillante
      'expo': '#2ecc71',           // Verde brillante
      
      // Otros
      'trainee': '#7f8c8d',        // Gris oscuro
      'intern': '#bdc3c7'          // Gris claro
    };
    return colors[position?.toLowerCase()] || '#95a5a6';
  };

  // Función para filtrar turnos por departamento
  const getFilteredShifts = () => {
    return shifts.filter(shift => {
      // Verificar por departamento del turno
      if (shift.department) {
        return shift.department === allowedDepartment;
      }
      
      // Si no tiene departamento, verificar por empleado
      const employee = employees.find(emp => emp.id === shift.employee_id);
      if (employee) {
        const empDepartment = employee.workInfo?.department || employee.department;
        
        // Si el empleado tiene departamento definido, usarlo
        if (empDepartment) {
          return empDepartment === allowedDepartment;
        }
        
        // Si no tiene departamento, determinarlo por rol
        const employeeRole = employee.role?.toLowerCase() || '';
        const fohRoles = ['host', 'hostess', 'server', 'server_senior', 'bartender', 'bartender_head', 'runner', 'food_runner', 'busser', 'manager', 'floor_manager', 'shift_manager'];
        const bohRoles = ['chef', 'sous_chef', 'line_cook', 'prep_cook', 'cook', 'dishwasher', 'expo'];
        
        if (fohRoles.includes(employeeRole)) {
          return allowedDepartment === 'FOH';
        }
        if (bohRoles.includes(employeeRole)) {
          return allowedDepartment === 'BOH';
        }
        
        // Si no se puede determinar, NO mostrar el turno
        console.log(`⚠️ Turno del empleado ${employee.email} no se puede clasificar - Rol: ${employeeRole}, Departamento: ${empDepartment}`);
        return false;
      }
      
      // Si no se encuentra el empleado, NO mostrar el turno
      console.log(`⚠️ Turno con employee_id ${shift.employee_id} - empleado no encontrado`);
      return false;
    });
  };

  // Nueva función para renderizar la tabla estilo servidor con horarios FILTRADA POR DEPARTAMENTO
  const renderServerScheduleTable = () => {
    const weekDates = getWeekDates(new Date(schedule.week_start));
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THURS', 'FRI', 'SAT'];

    // Definir estructura de roles para FOH y BOH
    const roleStructure = {
      // Front of House (FOH)
      FOH: {
        'SERVERS': ['server', 'server_senior'],
        'HOSTS': ['host', 'hostess'],
        'BARTENDERS': ['bartender', 'bartender_head'],
        'RUNNERS': ['runner', 'food_runner'],
        'BUSSERS': ['busser'],
        'MANAGERS': ['manager', 'floor_manager', 'shift_manager']
      },
      // Back of House (BOH)  
      BOH: {
        'KITCHEN': ['chef', 'sous_chef', 'line_cook', 'prep_cook', 'cook'],
        'DISHWASHERS': ['dishwasher'],
        'EXPO': ['expo']
      }
    };

    // Filtrar empleados por departamento permitido
    const getFilteredEmployeesByRole = () => {
      const groupedEmployees = {};
      let rolesToShow = {};

      // Determinar qué roles mostrar según el departamento seleccionado
      if (allowedDepartment === 'FOH') {
        // Mostrar solo FOH
        rolesToShow = roleStructure.FOH;
      } else if (allowedDepartment === 'BOH') {
        // Mostrar solo BOH
        rolesToShow = roleStructure.BOH;
      } else {
        // Por defecto mostrar FOH
        rolesToShow = roleStructure.FOH;
      }
      
      // Inicializar grupos
      Object.keys(rolesToShow).forEach(groupName => {
        groupedEmployees[groupName] = [];
      });
      
      // Filtrar empleados por departamento seleccionado
      const filteredEmployees = employees.filter(employee => {
        const empDepartment = employee.workInfo?.department || employee.department;
        
        // Si tiene departamento definido, usarlo
        if (empDepartment) {
          return empDepartment === allowedDepartment;
        }
        
        // Si no tiene departamento definido, determinarlo por rol
        const employeeRole = employee.role?.toLowerCase() || '';
        const fohRoles = ['host', 'hostess', 'server', 'server_senior', 'bartender', 'bartender_head', 'runner', 'food_runner', 'busser', 'manager', 'floor_manager', 'shift_manager'];
        const bohRoles = ['chef', 'sous_chef', 'line_cook', 'prep_cook', 'cook', 'dishwasher', 'expo'];
        
        if (fohRoles.includes(employeeRole)) {
          return allowedDepartment === 'FOH';
        }
        if (bohRoles.includes(employeeRole)) {
          return allowedDepartment === 'BOH';
        }
        
        // Si no se puede determinar el departamento por rol, NO mostrar el empleado
        console.log(`⚠️ Empleado ${employee.email} no se puede clasificar - Rol: ${employeeRole}, Departamento: ${empDepartment}`);
        return false;
      });

      // Clasificar empleados filtrados
      filteredEmployees.forEach(employee => {
        const employeeRole = (employee.role || employee.position || '').toLowerCase();
        let assigned = false;
        
        // Buscar en qué grupo pertenece este empleado
        Object.entries(rolesToShow).forEach(([groupName, roles]) => {
          if (roles.includes(employeeRole) && !assigned) {
            groupedEmployees[groupName].push({
              id: employee.id,
              name: employee.displayName || employee.email.split('@')[0],
              role: employee.role || employee.position || '',
              email: employee.email
            });
            assigned = true;
          }
        });
        
        // Si no se asignó a ningún grupo específico, NO asignar por defecto
        if (!assigned && employee.active !== false) {
          console.log(`⚠️ Empleado ${employee.email} con rol "${employee.role || 'sin rol'}" no pudo ser asignado a ningún grupo`);
        }
      });
      
      return groupedEmployees;
    };

    const groupedEmployees = getFilteredEmployeesByRole();
    const filteredShifts = getFilteredShifts();

    // Función para obtener el turno de un empleado en una fecha específica
    const getEmployeeShiftForDate = (employeeId, date) => {
      const dateString = date.toISOString().split('T')[0];
      return filteredShifts.find(shift => 
        (shift.employee_id === employeeId || shift.employee_id === employeeId) && 
        shift.date === dateString
      );
    };

    // Función para mostrar el horario en formato simple con colores
    const getShiftDisplay = (shift) => {
      if (!shift) return <span className="text-danger fw-bold">OFF</span>;
      
      const position = shift.position || shift.employee_role || shift.role || '';
      const color = getPositionColor(position);
      
      // Si solo hay hora de inicio, mostrar solo esa
      if (shift.start_time && !shift.end_time) {
        return (
          <div style={{ 
            backgroundColor: color, 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            {formatTime(shift.start_time)}
            <br />
            <small>{position.toUpperCase()}</small>
          </div>
        );
      }
      
      // Si hay hora de inicio y fin, mostrar rango
      if (shift.start_time && shift.end_time) {
        return (
          <div style={{ 
            backgroundColor: color, 
            color: 'white', 
            padding: '4px 8px', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            fontWeight: 'bold'
          }}>
            {formatTime(shift.start_time)}
            <br />
            {formatTime(shift.end_time)}
            <br />
            <small>{position.toUpperCase()}</small>
          </div>
        );
      }
      
      return <span className="text-danger fw-bold">OFF</span>;
    };

    return (
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                <FaCalendarWeek className="me-2" />
                Horario Semanal - {allowedDepartment === 'FOH' ? 'Front of House (FOH)' : 'Back of House (BOH)'}
              </h5>
            </Col>
            <Col xs="auto">
              {userRole === 'admin' ? (
                <ButtonGroup>
                  <Button 
                    variant={selectedDepartment === 'FOH' ? 'warning' : 'outline-warning'}
                    size="sm"
                    onClick={() => setSelectedDepartment('FOH')}
                  >
                    FOH
                  </Button>
                  <Button 
                    variant={selectedDepartment === 'BOH' ? 'warning' : 'outline-warning'}
                    size="sm"
                    onClick={() => setSelectedDepartment('BOH')}
                  >
                    BOH
                  </Button>
                </ButtonGroup>
              ) : (
                <Badge bg="warning" text="dark">
                  {allowedDepartment === 'FOH' ? 'Solo FOH' : 'Solo BOH'}
                </Badge>
              )}
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table className="mb-0 server-schedule-table" bordered>
              <thead className="table-dark">
                <tr>
                  <th className="text-center py-3" style={{ minWidth: '150px', backgroundColor: '#2c3e50' }}>
                    <strong>EMPLEADOS</strong>
                  </th>
                  {weekDates.map((date, index) => {
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <th 
                        key={index} 
                        className={`text-center py-3 ${isToday ? 'bg-warning text-dark' : ''}`}
                        style={{ minWidth: '100px', backgroundColor: isToday ? '#ffc107' : '#e67e22' }}
                      >
                        <div><strong>{dayNames[index]}</strong></div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedEmployees).map(([groupName, groupEmployees]) => {
                  if (groupEmployees.length === 0) return null;
                  
                  return (
                    <React.Fragment key={groupName}>
                      {/* Header del grupo */}
                      <tr>
                        <td 
                          colSpan={8} 
                          className="bg-secondary text-white text-center fw-bold py-2"
                          style={{ backgroundColor: '#e67e22 !important' }}
                        >
                          {groupName}
                        </td>
                      </tr>
                      
                      {/* Empleados del grupo */}
                      {groupEmployees.map((employee) => (
                        <tr key={employee.id}>
                          <td className="align-middle" style={{ backgroundColor: '#f8f9fa', fontWeight: 'bold' }}>
                            {employee.name.toUpperCase()}
                          </td>
                          {weekDates.map((date, dayIndex) => {
                            const shift = getEmployeeShiftForDate(employee.id, date);
                            const isToday = date.toDateString() === new Date().toDateString();
                            
                            return (
                              <td 
                                key={dayIndex} 
                                className={`text-center align-middle ${isToday ? 'bg-warning bg-opacity-25' : ''}`}
                                style={{ 
                                  height: '50px',
                                  backgroundColor: isToday ? '#fff3cd' : 'white'
                                }}
                              >
                                {getShiftDisplay(shift)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadAsText = () => {
    if (!schedule || !shifts.length) return;

    let content = `${schedule.title}\n`;
    content += `Semana del ${formatDate(schedule.week_start)} al ${formatDate(schedule.week_end)}\n\n`;
    
    if (schedule.message) {
      content += `Mensaje: ${schedule.message}\n\n`;
    }

    const weekDates = getWeekDates(new Date(schedule.week_start));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const filteredShifts = getFilteredShifts();

    weekDates.forEach((date, index) => {
      const dayShifts = filteredShifts.filter(shift => shift.date === date.toISOString().split('T')[0]);
      content += `${dayNames[index]} ${date.getDate()}/${date.getMonth() + 1}\n`;
      content += '─'.repeat(30) + '\n';
      
      if (dayShifts.length === 0) {
        content += 'Sin turnos programados\n\n';
      } else {
        dayShifts.forEach(shift => {
          content += `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)} | `;
          content += `${getEmployeeName(shift.employee_id)} | ${shift.position || shift.employee_role || shift.role || 'Empleado'}\n`;
        });
        content += '\n';
      }
    });

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horario_${schedule.title.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3">Cargando horario...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          {error}
        </Alert>
        {onBack && (
          <Button variant="outline-secondary" onClick={onBack} className="mt-3">
            <FaArrowLeft className="me-2" />
            Volver
          </Button>
        )}
      </Container>
    );
  }

  if (!schedule) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>Horario no encontrado</Alert.Heading>
          El horario solicitado no existe o no está disponible.
        </Alert>
        {onBack && (
          <Button variant="outline-secondary" onClick={onBack} className="mt-3">
            <FaArrowLeft className="me-2" />
            Volver
          </Button>
        )}
      </Container>
    );
  }

  // Debug: Imprimir información de las fechas
  console.log('=== INFORMACIÓN DEL HORARIO PÚBLICO ===');
  console.log('Usuario:', user?.email, 'Rol:', userRole, 'Departamento permitido:', allowedDepartment);
  console.log('Departamento seleccionado:', selectedDepartment);
  console.log('Schedule week_start:', schedule.week_start);
  console.log('Schedule week_end:', schedule.week_end);
  const weekDates = getWeekDates(new Date(schedule.week_start));
  console.log('WeekDates calculadas:', weekDates.map(d => d.toISOString().split('T')[0]));
  console.log('Total shifts disponibles:', shifts.length);
  console.log('Shifts filtrados por departamento:', getFilteredShifts().length);

  return (
    <Container fluid className="schedule-viewer py-4">
      {/* Header del horario */}
      <Row className="mb-4">
        <Col>
          <Card className="border-0 shadow-sm">
            <Card.Body className="text-center">
              <h2 className="mb-3 text-primary">
                <FaCalendarWeek className="me-2" />
                {schedule.title}
              </h2>
              <p className="lead mb-3">
                Semana del {formatDate(schedule.week_start)} al {formatDate(schedule.week_end)}
              </p>
              
              {schedule.message && (
                <Alert variant="info" className="mb-3">
                  <strong>Mensaje:</strong> {schedule.message}
                </Alert>
              )}

              <Row className="text-center">
                <Col md={4}>
                  <div className="text-primary mb-2">
                    <FaUsers size={24} />
                  </div>
                  <h5 className="mb-0">{[...new Set(getFilteredShifts().map(s => s.employee_id))].length}</h5>
                  <small className="text-muted">Empleados {allowedDepartment}</small>
                </Col>
                <Col md={4}>
                  <div className="text-success mb-2">
                    <FaClock size={24} />
                  </div>
                  <h5 className="mb-0">{getFilteredShifts().length}</h5>
                  <small className="text-muted">Total Turnos {allowedDepartment}</small>
                </Col>
                <Col md={4}>
                  <div className="text-warning mb-2">
                    <FaCalendarWeek size={24} />
                  </div>
                  <h5 className="mb-0">7</h5>
                  <small className="text-muted">Días</small>
                </Col>
              </Row>

              {/* Botones de acción */}
              <div className="mt-4 d-print-none">
                <Button 
                  variant="outline-primary" 
                  onClick={handlePrint}
                  className="me-2"
                >
                  <FaPrint className="me-1" />
                  Imprimir
                </Button>
                <Button 
                  variant="outline-secondary" 
                  onClick={downloadAsText}
                  className="me-2"
                >
                  <FaDownload className="me-1" />
                  Descargar
                </Button>
                {onBack && (
                  <Button variant="secondary" onClick={onBack}>
                    <FaArrowLeft className="me-1" />
                    Volver
                  </Button>
                )}
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Nueva tabla estilo servidor */}
      {renderServerScheduleTable()}

      {/* Información adicional */}
      {schedule.created_at && (
        <Card className="border-0 shadow-sm d-print-none">
          <Card.Body className="text-center">
            <small className="text-muted">
              Horario publicado el {' '}
              {schedule.created_at.toDate ? (
                <>
                  {(schedule.created_at.toDate()).toLocaleDateString('es-ES')} por {schedule.created_by_name || 'Administrador'}
                </>
              ) : (
                <>{(schedule.created_at.toDate()).toLocaleDateString('es-ES')}</>
              )}
            </small>
          </Card.Body>
        </Card>
      )}

      <style jsx>{`
        @media print {
          .d-print-none {
            display: none !important;
          }
          
          .server-schedule-table th,
          .server-schedule-table td {
            border: 1px solid #000 !important;
            padding: 8px !important;
          }
        }
        
        .schedule-viewer {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        
        .server-schedule-table {
          font-size: 0.9rem;
        }
        
        .server-schedule-table td {
          padding: 8px;
          vertical-align: middle;
        }
        
        .server-schedule-table th {
          padding: 12px 8px;
          text-align: center;
          vertical-align: middle;
        }
        
        @media (max-width: 768px) {
          .server-schedule-table {
            font-size: 0.75rem;
          }
          
          .server-schedule-table th,
          .server-schedule-table td {
            padding: 6px 4px;
          }
        }
      `}</style>
    </Container>
  );
};

export default PublicScheduleViewer;