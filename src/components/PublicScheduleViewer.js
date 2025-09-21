// src/components/PublicScheduleViewer.js
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Card, 
  Table, 
  Badge, 
  Spinner, 
  Alert,
  Row,
  Col,
  Button
} from 'react-bootstrap';
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
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const PublicScheduleViewer = ({ scheduleId: propScheduleId, onBack }) => {
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

  const scheduleId = getScheduleId();
  const [schedule, setSchedule] = useState(null);
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadScheduleData = async () => {
      if (!scheduleId) {
        setError('ID de horario no encontrado en la URL');
        setLoading(false);
        return;
      }

      try {
        console.log('Cargando horario con ID:', scheduleId);
        
        // Cargar horario publicado
        const scheduleDoc = await getDoc(doc(db, 'published_schedules', scheduleId));
        
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

        // Cargar turnos incluidos
        if (scheduleData.shifts_included && scheduleData.shifts_included.length > 0) {
          console.log('Buscando turnos con IDs:', scheduleData.shifts_included);
          
          const shiftsQuery = query(
            collection(db, 'shifts'),
            where('__name__', 'in', scheduleData.shifts_included)
          );
          const shiftsSnapshot = await getDocs(shiftsQuery);
          const shiftsData = shiftsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          console.log('Turnos encontrados:', shiftsData.length);
          console.log('Turnos detalle:', shiftsData.map(s => ({
            id: s.id,
            date: s.date,
            employee: s.employee_id,
            position: s.position || s.employee_role || s.role
          })));
          
          setShifts(shiftsData);
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
  }, [scheduleId]);

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

  // Nueva función para renderizar la tabla estilo servidor con horarios
  const renderServerScheduleTable = () => {
    const weekDates = getWeekDates(new Date(schedule.week_start));
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THURS', 'FRI', 'SAT'];

    // Definir estructura de roles para FOH y BOH
    const roleStructure = {
      // Front of House (FOH)
      'SERVERS': ['server', 'server_senior'],
      'HOSTS': ['host', 'hostess'],
      'BARTENDERS': ['bartender', 'bartender_head'],
      'RUNNERS': ['runner', 'food_runner'],
      'BUSSERS': ['busser'],
      'MANAGERS': ['manager', 'floor_manager', 'shift_manager'],
      
      // Back of House (BOH)  
      'KITCHEN': ['chef', 'sous_chef', 'line_cook', 'prep_cook', 'cook'],
      'DISHWASHERS': ['dishwasher'],
      'EXPO': ['expo'],
    };

    // Función para obtener TODOS los empleados (no solo los que tienen turnos)
    const getAllEmployeesByRole = () => {
      const groupedEmployees = {};
      
      // Inicializar grupos
      Object.keys(roleStructure).forEach(groupName => {
        groupedEmployees[groupName] = [];
      });
      
      // Clasificar TODOS los empleados activos
      employees.forEach(employee => {
        if (employee.active === false || employee.status === 'inactive') return;
        
        const employeeData = {
          id: employee.id,
          name: employee.displayName || (employee.firstName + ' ' + employee.lastName).trim() || employee.email.split('@')[0],
          role: employee.role || '',
          department: employee.workInfo?.department || 'FOH'
        };

        // Encontrar en qué grupo pertenece este empleado
        let assigned = false;
        for (const [groupName, roles] of Object.entries(roleStructure)) {
          if (roles.includes(employee.role)) {
            groupedEmployees[groupName].push(employeeData);
            assigned = true;
            break;
          }
        }
        
        // Si no se asignó a ningún grupo, ponerlo en SERVERS por defecto
        if (!assigned) {
          groupedEmployees['SERVERS'].push(employeeData);
        }
      });

      // Ordenar alfabéticamente dentro de cada grupo
      Object.keys(groupedEmployees).forEach(groupName => {
        groupedEmployees[groupName].sort((a, b) => a.name.localeCompare(b.name));
      });

      // Remover grupos vacíos
      Object.keys(groupedEmployees).forEach(groupName => {
        if (groupedEmployees[groupName].length === 0) {
          delete groupedEmployees[groupName];
        }
      });

      return groupedEmployees;
    };

    const groupedEmployees = getAllEmployeesByRole();

    // Función para obtener el turno de un empleado en una fecha específica
    const getEmployeeShiftForDate = (employeeId, date) => {
      const dateStr = date.toISOString().split('T')[0];
      return shifts.find(shift => 
        shift.employee_id === employeeId && 
        shift.date === dateStr
      );
    };

    // Función para mostrar el horario en formato simple
    const getShiftDisplay = (shift) => {
      if (!shift) return <span className="text-danger fw-bold">OFF</span>;
      
      // Si solo hay hora de inicio, mostrar solo esa
      if (shift.start_time && !shift.end_time) {
        return <span className="text-primary fw-bold">{formatTime(shift.start_time)}</span>;
      }
      
      // Si hay hora de inicio y fin, mostrar rango
      if (shift.start_time && shift.end_time) {
        return (
          <div>
            <span className="text-primary fw-bold">{formatTime(shift.start_time)}</span>
            <br />
            <span className="text-secondary">{formatTime(shift.end_time)}</span>
          </div>
        );
      }
      
      return <span className="text-danger fw-bold">OFF</span>;
    };

    return (
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <FaCalendarWeek className="me-2" />
            Horario Semanal
          </h5>
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

    weekDates.forEach((date, index) => {
      const dayShifts = shifts.filter(shift => shift.date === date.toISOString().split('T')[0]);
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

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horario_${schedule.week_start}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Cargando horario...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-5">
        <Alert variant="danger" className="text-center">
          <h4>Error</h4>
          <p>{error}</p>
          {onBack && (
            <Button variant="secondary" onClick={onBack} className="mt-2">
              <FaArrowLeft className="me-1" />
              Volver
            </Button>
          )}
        </Alert>
      </Container>
    );
  }

  if (!schedule) {
    return (
      <Container className="mt-5">
        <Alert variant="warning" className="text-center">
          <h4>Horario no encontrado</h4>
          <p>El enlace puede ser incorrecto o el horario ya no está disponible.</p>
          {onBack && (
            <Button variant="secondary" onClick={onBack} className="mt-2">
              <FaArrowLeft className="me-1" />
              Volver
            </Button>
          )}
        </Alert>
      </Container>
    );
  }

  const weekDates = getWeekDates(new Date(schedule.week_start));
  
  // Debug: mostrar información de las fechas
  console.log('=== INFORMACIÓN DEL HORARIO PÚBLICO ===');
  console.log('Schedule week_start:', schedule.week_start);
  console.log('Schedule week_end:', schedule.week_end);
  console.log('WeekDates calculadas:', weekDates.map(d => d.toISOString().split('T')[0]));
  console.log('Total shifts disponibles:', shifts.length);

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
                  <h5 className="mb-0">{[...new Set(shifts.map(s => s.employee_id))].length}</h5>
                  <small className="text-muted">Empleados</small>
                </Col>
                <Col md={4}>
                  <div className="text-success mb-2">
                    <FaClock size={24} />
                  </div>
                  <h5 className="mb-0">{shifts.length}</h5>
                  <small className="text-muted">Total Turnos</small>
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