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

  const getShiftsByDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayShifts = shifts.filter(shift => shift.date === dateStr);
    
    console.log(`Turnos para ${dateStr}:`, dayShifts.length);
    if (dayShifts.length > 0) {
      console.log('Detalle turnos:', dayShifts.map(s => ({
        employee: s.employee_id,
        position: s.position || s.employee_role || s.role,
        time: `${s.start_time}-${s.end_time}`
      })));
    }
    
    return dayShifts.sort((a, b) => {
      return a.start_time?.localeCompare(b.start_time) || 0;
    });
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

  const getShiftClass = (startTime) => {
    if (!startTime) return 'secondary';
    const hour = parseInt(startTime.split(':')[0]);
    if (hour >= 6 && hour < 14) return 'primary'; // Mañana
    if (hour >= 14 && hour < 22) return 'warning'; // Tarde
    return 'dark'; // Noche
  };

  // NUEVA FUNCIÓN: Obtener color específico por rol/posición
  const getPositionColorForPublic = (position) => {
    const colors = {
      // FOH
      'host': '#3498db',
      'server': '#27ae60',
      'server_senior': '#229954',
      'bartender': '#9b59b6',
      'bartender_head': '#8e44ad',
      'runner': '#1abc9c',
      'food_runner': '#17a2b8', // Nuevo color para Food Runner
      'busser': '#16a085',
      'manager': '#e67e22',
      
      // BOH
      'dishwasher': '#95a5a6',
      'prep_cook': '#e74c3c',
      'line_cook': '#c0392b',
      'cook': '#d35400',
      'sous_chef': '#e67e22',
      'chef': '#f39c12'
    };
    return colors[position] || '#6c757d'; // Color por defecto
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
      const dayShifts = getShiftsByDate(date);
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
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  
  // Debug: mostrar información de las fechas
  console.log('=== INFORMACIÓN DEL HORARIO PÚBLICO ===');
  console.log('Schedule week_start:', schedule.week_start);
  console.log('Schedule week_end:', schedule.week_end);
  console.log('WeekDates calculadas:', weekDates.map(d => d.toISOString().split('T')[0]));
  console.log('Total shifts disponibles:', shifts.length);
  console.log('=== FIN INFO ===');

  return (
    <Container fluid className="py-4 schedule-viewer">
      {/* Header */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <Row className="align-items-center">
            <Col>
              <div className="d-flex align-items-center">
                {onBack && (
                  <Button 
                    variant="light" 
                    size="sm" 
                    onClick={onBack}
                    className="me-3"
                  >
                    <FaArrowLeft />
                  </Button>
                )}
                <div>
                  <h3 className="mb-0">
                    <FaCalendarWeek className="me-2" />
                    {schedule.title}
                  </h3>
                  <p className="mb-0 mt-1">
                    {formatDate(schedule.week_start)} - {formatDate(schedule.week_end)}
                  </p>
                </div>
              </div>
            </Col>
            <Col xs="auto" className="d-print-none">
              <Button variant="light" size="sm" onClick={handlePrint} className="me-2">
                <FaPrint className="me-1" />
                Imprimir
              </Button>
              <Button variant="light" size="sm" onClick={downloadAsText}>
                <FaDownload className="me-1" />
                Descargar
              </Button>
            </Col>
          </Row>
        </Card.Header>
        
        {schedule.message && (
          <Card.Body>
            <Alert variant="info" className="mb-0">
              <strong>Mensaje del equipo:</strong> {schedule.message}
            </Alert>
          </Card.Body>
        )}
      </Card>

      {/* Estadísticas */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="text-center border-primary">
            <Card.Body>
              <div className="text-primary">
                <FaUsers size={24} />
              </div>
              <h5 className="mt-2 mb-0">{[...new Set(shifts.map(s => s.employee_id))].length}</h5>
              <small className="text-muted">Empleados</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center border-success">
            <Card.Body>
              <div className="text-success">
                <FaClock size={24} />
              </div>
              <h5 className="mt-2 mb-0">{shifts.length}</h5>
              <small className="text-muted">Total Turnos</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={4}>
          <Card className="text-center border-warning">
            <Card.Body>
              <div className="text-warning">
                <FaCalendarWeek size={24} />
              </div>
              <h5 className="mt-2 mb-0">7</h5>
              <small className="text-muted">Días</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Tabla de horarios para desktop */}
      <Card className="mb-4 d-none d-md-block">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table className="mb-0 schedule-table">
              <thead className="table-dark">
                <tr>
                  {weekDates.map((date, index) => {
                    const day = dayNames[index];
                    const isToday = date.toDateString() === new Date().toDateString();
                    return (
                      <th 
                        key={index} 
                        className={`text-center p-3 ${isToday ? 'bg-primary text-white' : ''}`}
                      >
                        <div>{day}</div>
                        <small>{date.getDate()}/{date.getMonth() + 1}</small>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                <tr style={{ height: '200px' }}>
                  {weekDates.map((date, index) => {
                    const dayShifts = getShiftsByDate(date);
                    return (
                      <td key={index} className="align-top p-2">
                        {dayShifts.length === 0 ? (
                          <div className="text-center text-muted small py-3">
                            Sin turnos
                          </div>
                        ) : (
                          dayShifts.map(shift => (
                            <div
                              key={shift.id}
                              className="shift-card p-2 mb-1 rounded"
                              style={{ 
                                backgroundColor: getPositionColorForPublic(shift.position || shift.employee_role || shift.role),
                                color: 'white',
                                fontSize: '0.75rem',
                                border: '1px solid rgba(0,0,0,0.1)'
                              }}
                            >
                              <div className="small">
                                <strong>{getEmployeeName(shift.employee_id)}</strong>
                              </div>
                              <div className="small">
                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                              </div>
                              <div className="small">
                                <Badge bg="light" text="dark">
                                  {shift.position || shift.employee_role || shift.role || 'Empleado'}
                                </Badge>
                              </div>
                              {shift.notes && (
                                <div className="small mt-1" title={shift.notes}>
                                  📝 {shift.notes.substring(0, 20)}...
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Lista detallada para vista móvil */}
      <div className="d-md-none mt-4">
        <h5>Vista Detallada</h5>
        {weekDates.map((date, index) => {
          const dayShifts = getShiftsByDate(date);
          return (
            <Card key={index} className="mb-3">
              <Card.Header>
                <strong>{dayNames[index]} {date.getDate()}/{date.getMonth() + 1}</strong>
              </Card.Header>
              <Card.Body>
                {dayShifts.length === 0 ? (
                  <p className="text-muted mb-0">Sin turnos programados</p>
                ) : (
                  <div className="row">
                    {dayShifts.map(shift => (
                      <div key={shift.id} className="col-12 mb-2">
                        <div 
                          className="card"
                          style={{ 
                            backgroundColor: getPositionColorForPublic(shift.position || shift.employee_role || shift.role),
                            color: 'white',
                            border: '1px solid rgba(0,0,0,0.1)'
                          }}
                        >
                          <div className="card-body p-2">
                            <div className="d-flex justify-content-between">
                              <strong>{getEmployeeName(shift.employee_id)}</strong>
                              <Badge bg="light" text="dark">
                                {shift.position || shift.employee_role || shift.role || 'Empleado'}
                              </Badge>
                            </div>
                            <div className="small">
                              {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                            </div>
                            {shift.notes && (
                              <div className="small mt-1">
                                📝 {shift.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>
          );
        })}
      </div>

      {/* Información de contacto (si está disponible) */}
      {schedule.created_by_name && (
        <Card className="mt-4 d-print-none">
          <Card.Body className="text-center">
            <small className="text-muted">
              Horario publicado por <strong>{schedule.created_by_name}</strong>
              {schedule.created_at && (
                <> el {new Date(schedule.created_at.toDate()).toLocaleDateString('es-ES')}</>
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
          
          .schedule-table th,
          .schedule-table td {
            border: 1px solid #000 !important;
            padding: 8px !important;
          }
          
          .shift-card {
            border: 1px solid #ccc !important;
            background: #f8f9fa !important;
            color: #000 !important;
          }
        }
        
        .schedule-viewer {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          min-height: 100vh;
        }
        
        .shift-card {
          font-size: 0.75rem;
          line-height: 1.2;
        }
        
        .schedule-table td {
          vertical-align: top !important;
          min-height: 150px;
        }
      `}</style>
    </Container>
  );
};

export default PublicScheduleViewer;