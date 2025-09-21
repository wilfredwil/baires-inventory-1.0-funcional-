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
    
    // Si es admin, puede cambiar entre departamentos
    if (userRole === 'admin' || userRole === 'manager') {
      return selectedDepartment; // Usar el departamento seleccionado
    }
    
    // Para empleados regulares, usar su departamento asignado
    return user.workInfo?.department || user.department || 'FOH';
  };

  const allowedDepartment = getUserDepartment();

  // Cargar datos del horario
  useEffect(() => {
    const loadScheduleData = async () => {
      const scheduleId = getScheduleId();
      
      if (!scheduleId) {
        setError('ID de horario no encontrado');
        setLoading(false);
        return;
      }

      try {
        // Cargar horario específico
        const scheduleDocRef = doc(db, 'schedules', scheduleId);
        const scheduleSnapshot = await getDoc(scheduleDocRef);
        
        if (!scheduleSnapshot.exists()) {
          setError('Horario no encontrado');
          setLoading(false);
          return;
        }

        const scheduleData = {
          id: scheduleSnapshot.id,
          ...scheduleSnapshot.data()
        };
        
        setSchedule(scheduleData);
        
        console.log('Schedule data loaded:', scheduleData);

        // Cargar turnos incluidos en el horario
        if (scheduleData.shifts_included && scheduleData.shifts_included.length > 0) {
          const allShifts = [];
          
          // Cargar todos los turnos por lotes
          for (let i = 0; i < scheduleData.shifts_included.length; i += 10) {
            const batch = scheduleData.shifts_included.slice(i, i + 10);
            const batchQuery = query(
              collection(db, 'shifts'),
              where('__name__', 'in', batch)
            );
            
            const batchSnapshot = await getDocs(batchQuery);
            const batchShifts = batchSnapshot.docs.map(doc => ({
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
    return employee ? 
      (employee.displayName || employee.email.split('@')[0]) : 
      'Empleado no encontrado';
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

    // Función para obtener todos los turnos de un empleado y todas sus posiciones
    const getEmployeeShiftsAndPositions = (employeeId) => {
      const employeeShifts = shifts.filter(shift => shift.employee_id === employeeId);
      const positions = new Set();
      
      employeeShifts.forEach(shift => {
        if (shift.position) {
          positions.add(shift.position);
        } else if (shift.role) {
          positions.add(shift.role);
        }
      });
      
      // Si no hay posiciones en los turnos, usar el rol del empleado
      if (positions.size === 0) {
        const employee = employees.find(emp => emp.id === employeeId);
        if (employee?.role) {
          positions.add(employee.role);
        }
      }
      
      return {
        shifts: employeeShifts,
        positions: Array.from(positions)
      };
    };

    // Filtrar empleados y crear entradas múltiples por posición
    const getFilteredEmployeesByRole = () => {
      const groupedEmployees = {};
      let rolesToShow = {};

      // Determinar qué roles mostrar según el departamento seleccionado
      if (allowedDepartment === 'FOH') {
        rolesToShow = roleStructure.FOH;
      } else if (allowedDepartment === 'BOH') {
        rolesToShow = roleStructure.BOH;
      } else {
        rolesToShow = roleStructure.FOH;
      }
      
      // Inicializar grupos
      Object.keys(rolesToShow).forEach(groupName => {
        groupedEmployees[groupName] = [];
      });
      
      // Filtrar empleados por departamento seleccionado
      const filteredEmployees = employees.filter(employee => {
        const empDepartment = employee.workInfo?.department || employee.department;
        
        if (empDepartment) {
          return empDepartment === allowedDepartment;
        }
        
        const employeeRole = employee.role?.toLowerCase() || '';
        const fohRoles = ['host', 'hostess', 'server', 'server_senior', 'bartender', 'bartender_head', 'runner', 'food_runner', 'busser', 'manager', 'floor_manager', 'shift_manager'];
        const bohRoles = ['chef', 'sous_chef', 'line_cook', 'prep_cook', 'cook', 'dishwasher', 'expo'];
        
        if (fohRoles.includes(employeeRole)) {
          return allowedDepartment === 'FOH';
        }
        if (bohRoles.includes(employeeRole)) {
          return allowedDepartment === 'BOH';
        }
        
        return allowedDepartment === 'FOH';
      });

      // Para cada empleado, crear entradas por cada posición que tiene
      filteredEmployees.forEach(employee => {
        const { positions } = getEmployeeShiftsAndPositions(employee.id);
        
        // Si el empleado tiene múltiples posiciones, crear una entrada para cada una
        const positionsToProcess = positions.length > 0 ? positions : [employee.role];
        
        positionsToProcess.forEach(position => {
          const positionLower = position?.toLowerCase() || '';
          
          // Buscar en qué grupo pertenece esta posición
          Object.keys(rolesToShow).forEach(groupName => {
            const roles = rolesToShow[groupName];
            if (roles.includes(positionLower)) {
              // Crear una entrada única por empleado y posición
              const employeeEntry = {
                ...employee,
                currentPosition: position,
                uniqueKey: `${employee.id}_${position}`
              };
              
              // Evitar duplicados
              if (!groupedEmployees[groupName].find(emp => emp.uniqueKey === employeeEntry.uniqueKey)) {
                groupedEmployees[groupName].push(employeeEntry);
              }
            }
          });
        });
      });

      return groupedEmployees;
    };

    // Función para obtener turnos de un empleado en una fecha específica para una posición específica
    const getEmployeeShiftsForDate = (employeeId, date, position) => {
      const dateStr = date.toISOString().split('T')[0];
      return shifts.filter(shift => 
        shift.employee_id === employeeId && 
        shift.date === dateStr &&
        (shift.position === position || shift.role === position)
      );
    };

    // Función para renderizar los turnos de un empleado (puede tener múltiples turnos en un día)
    const renderEmployeeShifts = (employee, date) => {
      const employeeShifts = getEmployeeShiftsForDate(employee.id, date, employee.currentPosition);
      
      if (employeeShifts.length === 0) {
        return <div className="text-center text-muted" style={{ fontSize: '12px', padding: '2px' }}>-</div>;
      }

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {employeeShifts.map((shift, index) => {
            const startTime = formatTime(shift.start_time);
            return (
              <div 
                key={`${shift.id || index}`}
                style={{
                  backgroundColor: getPositionColor(employee.currentPosition),
                  color: 'white',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  textAlign: 'center',
                  fontWeight: '500'
                }}
              >
                {startTime}
              </div>
            );
          })}
        </div>
      );
    };

    // Función para obtener el label de una posición
    const getPositionLabel = (position) => {
      const labels = {
        // FOH
        'host': 'Host',
        'hostess': 'Hostess',
        'server': 'Mesero',
        'server_senior': 'Mesero Sr.',
        'bartender': 'Bartender',
        'bartender_head': 'Head Bartender',
        'runner': 'Runner',
        'food_runner': 'Food Runner',
        'busser': 'Busser',
        'manager': 'Manager',
        'floor_manager': 'Floor Manager',
        'shift_manager': 'Shift Manager',
        
        // BOH
        'chef': 'Chef',
        'sous_chef': 'Sous Chef',
        'line_cook': 'Line Cook',
        'prep_cook': 'Prep Cook',
        'cook': 'Cook',
        'dishwasher': 'Dishwasher',
        'expo': 'Expo'
      };
      return labels[position?.toLowerCase()] || position || 'N/A';
    };

    const groupedEmployees = getFilteredEmployeesByRole();

    return (
      <div style={{ fontSize: '12px', lineHeight: '1.3' }}>
        <Table 
          bordered 
          size="sm" 
          style={{ 
            fontSize: '11px', 
            marginBottom: '0',
            tableLayout: 'fixed'
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ 
                width: '200px', 
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '700'
              }}>
                {allowedDepartment === 'FOH' ? 'FRONT OF HOUSE' : 'BACK OF HOUSE'}
              </th>
              {dayNames.map((day, index) => (
                <th key={day} style={{ 
                  width: '90px', 
                  padding: '6px 4px',
                  textAlign: 'center',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  <div>{day}</div>
                  <div style={{ fontSize: '9px', fontWeight: '400', opacity: '0.9' }}>
                    {weekDates[index] ? weekDates[index].getDate() : ''}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(groupedEmployees).map(groupName => {
              const groupEmployees = groupedEmployees[groupName];
              if (groupEmployees.length === 0) return null;

              return (
                <React.Fragment key={groupName}>
                  {/* Header del grupo de roles */}
                  <tr>
                    <td 
                      colSpan={8} 
                      style={{ 
                        backgroundColor: '#34495e',
                        color: 'white',
                        padding: '6px 12px',
                        fontWeight: '700',
                        fontSize: '11px',
                        textAlign: 'center',
                        letterSpacing: '0.5px'
                      }}
                    >
                      {groupName}
                    </td>
                  </tr>
                  
                  {/* Empleados del grupo */}
                  {groupEmployees.map((employee) => (
                    <tr key={employee.uniqueKey}>
                      <td style={{ 
                        padding: '8px 12px', 
                        borderRight: '2px solid #e9ecef',
                        backgroundColor: '#f8f9fa',
                        fontWeight: '600',
                        fontSize: '13px',
                        width: '200px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span>{employee.displayName || employee.email?.split('@')[0] || 'Sin nombre'}</span>
                          <span style={{ 
                            fontSize: '10px', 
                            color: getPositionColor(employee.currentPosition),
                            fontWeight: '700',
                            textTransform: 'uppercase'
                          }}>
                            {getPositionLabel(employee.currentPosition)}
                          </span>
                          {employee.phone && (
                            <span style={{ fontSize: '10px', color: '#6c757d' }}>
                              📞 {employee.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      {weekDates.map((date, dayIndex) => (
                        <td key={dayIndex} style={{ 
                          padding: '4px 2px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          width: '90px'
                        }}>
                          {renderEmployeeShifts(employee, date)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </Table>
      </div>
    );
  };

  // Función para manejar la impresión
  const handlePrint = () => {
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        @media print {
          body { font-family: Arial, sans-serif; }
          .no-print { display: none !important; }
          table { border-collapse: collapse; width: 100%; }
          th, td { border: 1px solid #000; padding: 4px; font-size: 10px; }
          th { background-color: #f0f0f0; }
        }
      </style>
      <h2>${schedule.title}</h2>
      <p>Semana del ${formatDate(schedule.week_start)} al ${formatDate(schedule.week_end)}</p>
      ${document.querySelector('table').outerHTML}
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent.innerHTML);
    printWindow.document.close();
    printWindow.print();
  };

  // Función para descargar como texto
  const downloadAsText = () => {
    const weekDates = getWeekDates(new Date(schedule.week_start));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    
    let content = `${schedule.title}\n`;
    content += `Semana del ${formatDate(schedule.week_start)} al ${formatDate(schedule.week_end)}\n\n`;
    
    dayNames.forEach((dayName, index) => {
      const date = weekDates[index];
      const dateStr = date.toISOString().split('T')[0];
      const dayShifts = getFilteredShifts().filter(shift => shift.date === dateStr);
      
      content += `${dayName} ${date.getDate()}:\n`;
      
      if (dayShifts.length === 0) {
        content += '  Sin turnos programados\n';
      } else {
        dayShifts.forEach(shift => {
          const employeeName = getEmployeeName(shift.employee_id);
          const startTime = formatTime(shift.start_time);
          const endTime = formatTime(shift.end_time);
          const position = shift.position || shift.role || 'Sin posición';
          
          content += `  ${employeeName} (${position}): ${startTime} - ${endTime}\n`;
        });
      }
      content += '\n';
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horario-${schedule.week_start}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
              {schedule.created_at.toDate ? 
                schedule.created_at.toDate().toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) :
                'Fecha no disponible'
              }
            </small>
          </Card.Body>
        </Card>
      )}
    </Container>
  );
};

export default PublicScheduleViewer;