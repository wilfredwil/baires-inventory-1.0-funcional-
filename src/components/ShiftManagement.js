// src/components/ShiftManagement.js - CON FUNCIONALIDADES MEJORADAS
import React, { useState, useEffect } from 'react';
import { 
  Container, Row, Col, Card, Button, Form, Modal, Badge, Alert, 
  Tabs, Tab, Spinner, Dropdown, ButtonGroup
} from 'react-bootstrap';
import { 
  FaCalendarAlt, FaPlus, FaEdit, FaTrash, FaClock, FaUsers, FaShare, 
  FaEye, FaBuilding, FaCopy, FaExclamationTriangle, FaCheckCircle,
  FaConciergeBell, FaUtensils, FaArrowLeft, FaSun, FaMoon,
  FaCalendarWeek, FaDollarSign, FaChartBar, FaHistory, FaStar
} from 'react-icons/fa';
import { 
  collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, query, 
  orderBy, where, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import SchedulePublishing from './SchedulePublishing';
import '../styles/shifts.css';

// Configuración de tipos de turno - SOLO MAÑANA Y NOCHE
const SHIFT_TYPES = {
  morning: {
    name: 'Mañana',
    icon: FaSun,
    defaultStart: '11:00',
    defaultEnd: '17:00',
    color: '#ffc107',
    textColor: '#212529',
    bgClass: 'morning-shift'
  },
  night: {
    name: 'Noche', 
    icon: FaMoon,
    defaultStart: '16:30',
    defaultEnd: '23:00',
    color: '#343a40',
    textColor: '#ffffff',
    bgClass: 'night-shift'
  }
};

// Configuración ACTUALIZADA de posiciones por departamento con más roles
const POSITIONS = {
  FOH: [
    { value: 'host', label: 'Host/Hostess', priority: 1 },
    { value: 'server', label: 'Mesero/a', priority: 2 },
    { value: 'server_senior', label: 'Mesero/a Senior', priority: 3 },
    { value: 'bartender', label: 'Bartender', priority: 4 },
    { value: 'bartender_head', label: 'Bartender Principal', priority: 5 },
    { value: 'runner', label: 'Runner', priority: 6 },
    { value: 'food_runner', label: 'Food Runner', priority: 7 },
    { value: 'busser', label: 'Busser', priority: 8 },
    { value: 'manager', label: 'Manager', priority: 9 }
  ],
  BOH: [
    { value: 'dishwasher', label: 'Lavaplatos', priority: 1 },
    { value: 'prep_cook', label: 'Ayudante de Cocina', priority: 2 },
    { value: 'line_cook', label: 'Cocinero de Línea', priority: 3 },
    { value: 'cook', label: 'Cocinero/a', priority: 4 },
    { value: 'sous_chef', label: 'Sous Chef', priority: 5 },
    { value: 'chef', label: 'Chef/Manager de Cocina', priority: 6 }
  ]
};

// Función para obtener colores por rol
const getPositionColor = (role) => {
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
  return colors[role] || '#95a5a6';
};

// Helper functions
const getDayValue = (date) => {
  const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return dayMap[date.getDay()];
};

const getDayName = (dayValue) => {
  const dayMap = {
    'sunday': 'Dom', 'monday': 'Lun', 'tuesday': 'Mar',
    'wednesday': 'Mié', 'thursday': 'Jue', 'friday': 'Vie', 'saturday': 'Sáb'
  };
  return dayMap[dayValue] || dayValue;
};

// Helper para obtener nombres de días (siempre domingo a sábado)
const getDayNames = () => {
  return ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
};

const ShiftManagement = ({ user, userRole, onBack }) => {
  // Estados principales
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados de vista
  const [activeTab, setActiveTab] = useState('foh');
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  
  // Estados para funcionalidades nuevas
  const [showCopyWeekModal, setShowCopyWeekModal] = useState(false);
  const [copyWeekForm, setCopyWeekForm] = useState({
    sourceWeek: '',
    targetWeek: '',
    copyOptions: {
      copyEmployees: true,
      copyTimes: true,
      copyNotes: false
    }
  });
  
  // Estados adicionales para publicación rápida
  const [showQuickPublishModal, setShowQuickPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({
    week_start: '',
    week_end: '',
    title: '',
    message: '',
    notify_employees: true
  });
  
  // Estado del formulario de turno
  const [shiftForm, setShiftForm] = useState({
    employee_id: '',
    date: '',
    shift_type: 'morning',
    start_time: '',
    end_time: '',
    position: '',
    department: 'FOH',
    notes: '',
    status: 'scheduled'
  });

  // Verificar permisos por departamento
  const canManageFOH = () => ['admin', 'manager'].includes(userRole);
  const canManageBOH = () => ['admin', 'chef'].includes(userRole);
  const canManageAll = () => userRole === 'admin';

  // Cargar datos en tiempo real
  useEffect(() => {
    if (!user) return;

    const unsubscribeShifts = onSnapshot(
      query(collection(db, 'shifts'), orderBy('date', 'desc')),
      (snapshot) => {
        const shiftsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setShifts(shiftsData);
      }
    );

    const unsubscribeEmployees = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const employeeData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })).filter(emp => emp.active !== false);
        setEmployees(employeeData);
      }
    );

    setLoading(false);
    return () => {
      unsubscribeShifts();
      unsubscribeEmployees();
    };
  }, [user]);

  // Funciones auxiliares
  const getWeekDates = (startDate) => {
    const dates = [];
    const start = new Date(startDate);
    
    // Siempre empezar el domingo
    start.setDate(start.getDate() - start.getDay());
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    return dates;
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
    const employee = employees.find(emp => emp.id === employeeId);
    return employee ? 
      (employee.displayName || `${employee.firstName} ${employee.lastName}`) : 
      'Empleado no encontrado';
  };

  const getEmployeeDepartment = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.workInfo?.department || 'FOH';
  };

  const getEmployeeRole = (employeeId) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.role || '';
  };

  // NUEVA FUNCIÓN: Obtener turnos por fecha, tipo y agrupados por rol
  const getShiftsByDateAndTypeGroupedByRole = (date, department, shiftType) => {
    const dateStr = date.toISOString().split('T')[0];
    const dayShifts = shifts.filter(shift => 
      shift.date === dateStr && 
      shift.department === department &&
      shift.shift_type === shiftType
    );

    // Agrupar por rol y ordenar por prioridad
    const groupedShifts = {};
    const positions = POSITIONS[department] || [];
    
    dayShifts.forEach(shift => {
      // Intentar obtener el rol de diferentes fuentes
      let employeeRole = shift.position || // Primero la posición del turno
                       getEmployeeRole(shift.employee_id) || // Luego el rol del empleado 
                       shift.role || // Luego el campo role del turno
                       'other'; // Por último, 'other'
      
      if (!groupedShifts[employeeRole]) {
        groupedShifts[employeeRole] = [];
      }
      groupedShifts[employeeRole].push(shift);
    });

    // Ordenar grupos por prioridad de posición
    const sortedGroups = {};
    positions.forEach(position => {
      if (groupedShifts[position.value]) {
        sortedGroups[position.value] = groupedShifts[position.value];
      }
    });

    // Agregar roles que no están en la configuración al final
    Object.keys(groupedShifts).forEach(role => {
      if (!sortedGroups[role]) {
        sortedGroups[role] = groupedShifts[role];
      }
    });

    return sortedGroups;
  };

  const getShiftsByDateAndType = (date, department, shiftType) => {
    const dateStr = date.toISOString().split('T')[0];
    return shifts.filter(shift => 
      shift.date === dateStr && 
      shift.department === department &&
      shift.shift_type === shiftType
    );
  };

  const getAvailableEmployees = (department) => {
    return employees.filter(emp => 
      emp.active !== false && 
      emp.status !== 'inactive' &&
      emp.workInfo?.department === department
    );
  };

  // NUEVA FUNCIÓN: Copiar semana anterior
  const handleCopyPreviousWeek = async () => {
    try {
      const currentWeekDates = getWeekDates(currentWeek);
      const previousWeekDates = getWeekDates(new Date(currentWeek.getTime() - 7 * 24 * 60 * 60 * 1000));
      
      // Obtener turnos de la semana anterior para el departamento actual
      const currentDepartment = activeTab.toUpperCase();
      const previousWeekShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= previousWeekDates[0] && 
               shiftDate <= previousWeekDates[6] && 
               shift.department === currentDepartment;
      });

      if (previousWeekShifts.length === 0) {
        setError('No se encontraron turnos en la semana anterior para copiar');
        return;
      }

      let copiedCount = 0;
      const copyPromises = [];

      for (const shift of previousWeekShifts) {
        // Calcular la fecha correspondiente en la semana actual
        const originalDate = new Date(shift.date);
        const dayIndex = originalDate.getDay();
        const newDate = currentWeekDates[dayIndex === 0 ? 6 : dayIndex - 1]; // Ajustar domingo
        const newDateStr = newDate.toISOString().split('T')[0];

        // Verificar si ya existe un turno similar
        const existingShift = shifts.find(s => 
          s.date === newDateStr &&
          s.employee_id === shift.employee_id &&
          s.shift_type === shift.shift_type &&
          s.department === shift.department
        );

        if (!existingShift) {
          const newShift = {
            ...shift,
            id: undefined, // Remover el ID para crear uno nuevo
            date: newDateStr,
            created_at: serverTimestamp(),
            copied_from: shift.id,
            notes: shift.notes ? `${shift.notes} (Copiado)` : 'Copiado de semana anterior'
          };

          copyPromises.push(addDoc(collection(db, 'shifts'), newShift));
          copiedCount++;
        }
      }

      await Promise.all(copyPromises);
      
      setSuccess(`Se copiaron ${copiedCount} turnos de la semana anterior`);
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error copying previous week:', err);
      setError('Error al copiar la semana anterior: ' + err.message);
    }
  };

  // NUEVA FUNCIÓN: Crear template de la semana
  const handleCreateTemplate = async () => {
    try {
      const currentWeekDates = getWeekDates(currentWeek);
      const currentDepartment = activeTab.toUpperCase();
      
      // Obtener turnos de la semana actual
      const weekShifts = shifts.filter(shift => {
        const shiftDate = new Date(shift.date);
        return shiftDate >= currentWeekDates[0] && 
               shiftDate <= currentWeekDates[6] && 
               shift.department === currentDepartment;
      });

      if (weekShifts.length === 0) {
        setError('No hay turnos en esta semana para crear un template');
        return;
      }

      // Crear template en Firestore (colección 'schedule_templates')
      const templateData = {
        name: `Template ${currentDepartment} - ${new Date().toLocaleDateString('es-ES')}`,
        department: currentDepartment,
        created_by: user.email,
        created_at: serverTimestamp(),
        shifts_template: weekShifts.map(shift => ({
          day_of_week: new Date(shift.date).getDay(),
          shift_type: shift.shift_type,
          start_time: shift.start_time,
          end_time: shift.end_time,
          position: shift.position,
          employee_role: getEmployeeRole(shift.employee_id),
          notes: shift.notes || ''
        }))
      };

      await addDoc(collection(db, 'schedule_templates'), templateData);
      setSuccess('Template creado exitosamente');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Error creating template:', err);
      setError('Error al crear el template: ' + err.message);
    }
  };

  // Handlers existentes
  const handleShiftFormChange = (e) => {
    const { name, value } = e.target;
    let newForm = { ...shiftForm, [name]: value };

    // Auto-completar horarios según el tipo de turno
    if (name === 'shift_type') {
      const shiftType = SHIFT_TYPES[value];
      newForm.start_time = shiftType.defaultStart;
      newForm.end_time = shiftType.defaultEnd;
    }

    // Auto-completar departamento y posición del empleado
    if (name === 'employee_id') {
      const employee = employees.find(emp => emp.id === value);
      if (employee) {
        newForm.department = employee.workInfo?.department || 'FOH';
        newForm.position = employee.role || '';
      }
    }

    setShiftForm(newForm);
  };

  const handleSubmitShift = async (e) => {
    e.preventDefault();
    
    try {
      const employee = employees.find(emp => emp.id === shiftForm.employee_id);
      const shiftData = {
        ...shiftForm,
        // Asegurar que guardamos toda la información necesaria
        employee_name: employee ? (employee.displayName || `${employee.firstName} ${employee.lastName}`) : '',
        employee_role: employee?.role || shiftForm.position || '',
        employee_department: employee?.workInfo?.department || shiftForm.department,
        role: employee?.role || shiftForm.position || '', // Campo adicional para compatibilidad
        created_at: serverTimestamp(),
        created_by: user.email
      };

      if (editingShift) {
        await updateDoc(doc(db, 'shifts', editingShift.id), {
          ...shiftData,
          updated_at: serverTimestamp()
        });
        setSuccess('Turno actualizado exitosamente');
      } else {
        await addDoc(collection(db, 'shifts'), shiftData);
        setSuccess('Turno creado exitosamente');
      }

      setShowShiftModal(false);
      setEditingShift(null);
      resetShiftForm();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving shift:', err);
      setError('Error al guardar el turno: ' + err.message);
    }
  };

  const resetShiftForm = () => {
    setShiftForm({
      employee_id: '',
      date: '',
      shift_type: 'morning',
      start_time: '',
      end_time: '',
      position: '',
      department: 'FOH',
      notes: '',
      status: 'scheduled'
    });
  };

  const openShiftModal = (shift = null, prefillData = {}) => {
    if (shift) {
      setEditingShift(shift);
      setShiftForm({ ...shift });
    } else {
      resetShiftForm();
      setShiftForm(prev => ({ ...prev, ...prefillData }));
    }
    setShowShiftModal(true);
  };

  const handleDeleteShift = async (shiftId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este turno?')) {
      try {
        await deleteDoc(doc(db, 'shifts', shiftId));
        setSuccess('Turno eliminado exitosamente');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Error al eliminar el turno');
      }
    }
  };

  const changeWeek = (direction) => {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(currentWeek.getDate() + (direction * 7));
    setCurrentWeek(newWeek);
  };

  // Función para publicación rápida
  const handleQuickPublish = () => {
    const weekDates = getWeekDates(currentWeek);
    const weekStart = weekDates[0].toISOString().split('T')[0];
    const weekEnd = weekDates[6].toISOString().split('T')[0];
    const currentDepartment = activeTab.toUpperCase();
    
    console.log('=== PREPARANDO PUBLICACIÓN ===');
    console.log('currentWeek (estado):', currentWeek);
    console.log('weekDates calculadas:', weekDates.map(d => d.toDateString()));
    console.log('weekStart (string):', weekStart);
    console.log('weekEnd (string):', weekEnd);
    console.log('Departamento actual:', currentDepartment);
    
    // Verificar qué turnos existen en el calendario visible
    const visibleShifts = [];
    weekDates.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayShifts = shifts.filter(s => s.date === dateStr && s.department === currentDepartment);
      visibleShifts.push(...dayShifts);
      console.log(`Turnos para ${dateStr} (${currentDepartment}):`, dayShifts.length);
    });
    
    console.log('Total turnos visibles en calendario:', visibleShifts.length);
    console.log('=== FIN PREPARACIÓN ===');
    
    setPublishForm({
      week_start: weekStart,
      week_end: weekEnd,
      title: `Horarios ${currentDepartment} - Semana ${weekDates[0].toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}`,
      message: `Horarios del departamento ${currentDepartment} para la semana del ${weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} al ${weekDates[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}.`,
      notify_employees: true
    });
    
    setShowQuickPublishModal(true);
  };

  const handlePublishFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPublishForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmitQuickPublish = async (e) => {
    e.preventDefault();
    
    try {
      const weekDates = getWeekDates(currentWeek);
      const currentDepartment = activeTab.toUpperCase();
      
      console.log('Buscando turnos para publicar:', {
        weekStart: weekDates[0],
        weekEnd: weekDates[6],
        department: currentDepartment,
        totalShifts: shifts.length
      });
      
      // Mostrar TODOS los turnos para debug
      console.log('=== TODOS LOS TURNOS EN BASE DE DATOS ===');
      shifts.forEach(shift => {
        console.log(`Turno: ${shift.date} | Dept: ${shift.department || 'SIN_DEPT'} | Empleado: ${shift.employee_id} | Pos: ${shift.position}`);
      });
      console.log('=== FIN LISTA TURNOS ===');
      
      // Obtener turnos de la semana actual para este departamento
      // Usar comparación de strings para las fechas para evitar problemas de timezone
      const weekStartStr = weekDates[0].toISOString().split('T')[0];
      const weekEndStr = weekDates[6].toISOString().split('T')[0];
      
      const weekShifts = shifts.filter(shift => {
        const shiftDateStr = shift.date; // Ya viene como string 'YYYY-MM-DD'
        const inDateRange = shiftDateStr >= weekStartStr && shiftDateStr <= weekEndStr;
        const inDepartment = shift.department === currentDepartment;
        
        if (inDateRange && inDepartment) {
          console.log('Turno incluido:', {
            date: shift.date,
            employee: shift.employee_id,
            department: shift.department,
            position: shift.position
          });
        }
        
        return inDateRange && inDepartment;
      });

      console.log('Turnos encontrados para publicar:', weekShifts.length);
      console.log('Rango de fechas buscado:', { weekStartStr, weekEndStr });

      if (weekShifts.length === 0) {
        setError(`No hay turnos para publicar en el departamento ${currentDepartment} para esta semana (${weekDates[0].toLocaleDateString('es-ES')} - ${weekDates[6].toLocaleDateString('es-ES')})`);
        return;
      }

      // Calcular estadísticas
      const totalHours = weekShifts.reduce((acc, shift) => {
        const start = new Date(`2000-01-01 ${shift.start_time}`);
        const end = new Date(`2000-01-01 ${shift.end_time}`);
        if (end < start) end.setDate(end.getDate() + 1);
        return acc + (end - start) / (1000 * 60 * 60);
      }, 0);

      const stats = {
        totalShifts: weekShifts.length,
        employeesCount: new Set(weekShifts.map(shift => shift.employee_id)).size,
        totalHours: totalHours.toFixed(1),
        department: currentDepartment
      };

      const scheduleData = {
        ...publishForm,
        status: 'published',
        department: currentDepartment,
        created_by: user.email,
        created_by_name: user.displayName || user.email.split('@')[0],
        created_at: serverTimestamp(),
        shifts_included: weekShifts.map(shift => shift.id),
        stats,
        employee_responses: {},
        reminder_sent: false
      };

      console.log('Datos del horario a publicar:', {
        title: scheduleData.title,
        week_start: scheduleData.week_start,
        week_end: scheduleData.week_end,
        department: scheduleData.department,
        shiftsCount: scheduleData.shifts_included.length
      });

      // Crear el documento del horario publicado y obtener su referencia
      const docRef = await addDoc(collection(db, 'published_schedules'), scheduleData);
      const scheduleId = docRef.id;

      // Notificar empleados si está habilitado
      if (publishForm.notify_employees) {
        const employeeIds = [...new Set(weekShifts.map(shift => shift.employee_id))];
        
        for (const employeeId of employeeIds) {
          await addDoc(collection(db, 'notifications'), {
            employee_id: employeeId,
            type: 'schedule_published',
            title: 'Nuevo Horario Publicado',
            message: `Se ha publicado el horario ${currentDepartment} para la semana del ${weekDates[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}`,
            schedule_id: scheduleId,
            read: false,
            created_at: serverTimestamp()
          });
        }
      }

      setSuccess(`Horario ${currentDepartment} publicado exitosamente con ${weekShifts.length} turnos`);
      setShowQuickPublishModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error publishing schedule:', err);
      setError('Error al publicar el horario: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  const weekDates = getWeekDates(currentWeek);
  const currentDepartment = activeTab.toUpperCase();

  return (
    <Container fluid className="px-4">
      {/* Header con funcionalidades nuevas */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <Button variant="outline-secondary" onClick={onBack} className="me-3">
            <FaArrowLeft />
          </Button>
          <div>
            <h2 className="mb-0">
              <FaClock className="me-2" />
              Gestión de Turnos
            </h2>
            <p className="text-muted mb-0">
              Semana del {weekDates[0].toLocaleDateString('es-ES')} al {weekDates[6].toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>
        
        <div className="d-flex gap-2">
          {/* Botón para copiar semana anterior */}
          <Button 
            variant="outline-info" 
            onClick={handleCopyPreviousWeek}
            disabled={userRole === 'employee'}
          >
            <FaHistory className="me-1" />
            Copiar Semana Anterior
          </Button>
          
          {/* Botón para crear template */}
          <Button 
            variant="outline-warning" 
            onClick={handleCreateTemplate}
            disabled={userRole === 'employee'}
          >
            <FaStar className="me-1" />
            Crear Template
          </Button>

          <Button 
            variant="primary" 
            onClick={() => openShiftModal(null, { 
              department: currentDepartment, 
              date: weekDates[0].toISOString().split('T')[0] 
            })}
            disabled={userRole === 'employee'}
          >
            <FaPlus className="me-1" />
            Nuevo Turno
          </Button>
          
          <Button variant="success" onClick={handleQuickPublish}>
            <FaShare className="me-1" />
            Publicar
          </Button>
        </div>
      </div>

      {/* Alertas */}
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
      {success && <Alert variant="success" className="mb-3">{success}</Alert>}

      {/* Navegación de semanas */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <Button variant="outline-secondary" onClick={() => changeWeek(-1)}>
          <FaArrowLeft className="me-1" />
          Semana Anterior
        </Button>
        
        <div className="text-center">
          <h4 className="mb-0">
            {weekDates[0].toLocaleDateString('es-ES', { month: 'long', day: 'numeric' })} - 
            {weekDates[6].toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}
          </h4>
          <small className="text-muted">
            Domingo {weekDates[0].getDate()} a Sábado {weekDates[6].getDate()}
          </small>
        </div>
        
        <Button variant="outline-secondary" onClick={() => changeWeek(1)}>
          Semana Siguiente
          <FaArrowLeft className="ms-1" style={{ transform: 'rotate(180deg)' }} />
        </Button>
      </div>

      {/* Tabs por departamento */}
      <Tabs
        activeKey={activeTab}
        onSelect={setActiveTab}
        className="mb-4"
        justify
      >
        <Tab 
          eventKey="foh" 
          title={
            <span>
              <FaConciergeBell className="me-2" />
              Front of House
            </span>
          }
        >
          {/* Contenido FOH con separación por roles */}
          <div className="schedule-grid">
            {Object.values(SHIFT_TYPES).map(shiftType => (
              <Card key={shiftType.name} className="mb-4">
                <Card.Header 
                  className="d-flex align-items-center justify-content-between"
                  style={{ backgroundColor: shiftType.color, color: shiftType.textColor }}
                >
                  <div className="d-flex align-items-center">
                    <shiftType.icon className="me-2" />
                    <strong>Turno {shiftType.name}</strong>
                    <small className="ms-2">
                      ({shiftType.defaultStart} - {shiftType.defaultEnd})
                    </small>
                  </div>
                </Card.Header>
                
                <Card.Body className="p-0">
                  <div className="table-responsive">
                    <table className="table table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '150px' }}>Día</th>
                          {weekDates.map((date, index) => {
                            const dayNames = getDayNames();
                            return (
                              <th key={index} className="text-center">
                                <div className="small">{dayNames[index]}</div>
                                <div className="fw-bold">{date.getDate()}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="table-secondary fw-bold">
                            {shiftType.name}
                          </td>
                          {weekDates.map((date, index) => {
                            const groupedShifts = getShiftsByDateAndTypeGroupedByRole(
                              date, 'FOH', Object.keys(SHIFT_TYPES).find(key => SHIFT_TYPES[key].name === shiftType.name)
                            );
                            
                            return (
                              <td key={index} className="p-2" style={{ minHeight: '120px', verticalAlign: 'top' }}>
                                {Object.keys(groupedShifts).length === 0 ? (
                                  <div className="text-center text-muted small">
                                    Sin turnos
                                  </div>
                                ) : (
                                  <div>
                                    {Object.entries(groupedShifts).map(([role, roleShifts], roleIndex) => {
                                      const positionInfo = POSITIONS.FOH.find(p => p.value === role);
                                      const roleLabel = positionInfo?.label || role;
                                      
                                      return (
                                        <div key={role} className="mb-2">
                                          {/* Separador de rol */}
                                          {roleIndex > 0 && <hr className="my-2" style={{ borderColor: '#dee2e6' }} />}
                                          
                                          {/* Etiqueta de rol */}
                                          <div 
                                            className="small fw-bold text-center mb-1 px-2 py-1 rounded"
                                            style={{ 
                                              backgroundColor: getPositionColor(role),
                                              color: 'white',
                                              fontSize: '0.7rem'
                                            }}
                                          >
                                            {roleLabel}
                                          </div>
                                          
                                          {/* Empleados del rol */}
                                          {roleShifts.map(shift => (
                                            <div 
                                              key={shift.id}
                                              className="shift-item mb-1 p-1 rounded cursor-pointer"
                                              style={{ 
                                                backgroundColor: '#f8f9fa',
                                                border: `2px solid ${getPositionColor(role)}`,
                                                fontSize: '0.75rem'
                                              }}
                                              onClick={() => openShiftModal(shift)}
                                            >
                                              <div className="fw-bold">
                                                {getEmployeeName(shift.employee_id)}
                                              </div>
                                              <div className="text-muted">
                                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                              </div>
                                              {shift.notes && (
                                                <div className="small text-success">
                                                  📝 {shift.notes.substring(0, 20)}...
                                                </div>
                                              )}
                                              
                                              {/* Botones de acción */}
                                              <div className="d-flex justify-content-end mt-1">
                                                <Button 
                                                  size="sm" 
                                                  variant="outline-primary" 
                                                  className="me-1 px-1 py-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openShiftModal(shift);
                                                  }}
                                                >
                                                  <FaEdit size={10} />
                                                </Button>
                                                <Button 
                                                  size="sm" 
                                                  variant="outline-danger"
                                                  className="px-1 py-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteShift(shift.id);
                                                  }}
                                                >
                                                  <FaTrash size={10} />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Botón para agregar turno */}
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary" 
                                  className="w-100 mt-2"
                                  onClick={() => openShiftModal(null, {
                                    department: 'FOH',
                                    date: date.toISOString().split('T')[0],
                                    shift_type: Object.keys(SHIFT_TYPES).find(key => SHIFT_TYPES[key].name === shiftType.name)
                                  })}
                                >
                                  <FaPlus size={10} />
                                </Button>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </Tab>

        <Tab 
          eventKey="boh" 
          title={
            <span>
              <FaUtensils className="me-2" />
              Back of House
            </span>
          }
        >
          {/* Contenido BOH con separación por roles - Similar estructura */}
          <div className="schedule-grid">
            {Object.values(SHIFT_TYPES).map(shiftType => (
              <Card key={shiftType.name} className="mb-4">
                <Card.Header 
                  className="d-flex align-items-center justify-content-between"
                  style={{ backgroundColor: shiftType.color, color: shiftType.textColor }}
                >
                  <div className="d-flex align-items-center">
                    <shiftType.icon className="me-2" />
                    <strong>Turno {shiftType.name}</strong>
                    <small className="ms-2">
                      ({shiftType.defaultStart} - {shiftType.defaultEnd})
                    </small>
                  </div>
                </Card.Header>
                
                <Card.Body className="p-0">
                  <div className="table-responsive">
                    <table className="table table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '150px' }}>Día</th>
                          {weekDates.map((date, index) => {
                            const dayNames = getDayNames();
                            return (
                              <th key={index} className="text-center">
                                <div className="small">{dayNames[index]}</div>
                                <div className="fw-bold">{date.getDate()}</div>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="table-secondary fw-bold">
                            {shiftType.name}
                          </td>
                          {weekDates.map((date, index) => {
                            const groupedShifts = getShiftsByDateAndTypeGroupedByRole(
                              date, 'BOH', Object.keys(SHIFT_TYPES).find(key => SHIFT_TYPES[key].name === shiftType.name)
                            );
                            
                            return (
                              <td key={index} className="p-2" style={{ minHeight: '120px', verticalAlign: 'top' }}>
                                {Object.keys(groupedShifts).length === 0 ? (
                                  <div className="text-center text-muted small">
                                    Sin turnos
                                  </div>
                                ) : (
                                  <div>
                                    {Object.entries(groupedShifts).map(([role, roleShifts], roleIndex) => {
                                      const positionInfo = POSITIONS.BOH.find(p => p.value === role);
                                      const roleLabel = positionInfo?.label || role;
                                      
                                      return (
                                        <div key={role} className="mb-2">
                                          {/* Separador de rol */}
                                          {roleIndex > 0 && <hr className="my-2" style={{ borderColor: '#dee2e6' }} />}
                                          
                                          {/* Etiqueta de rol */}
                                          <div 
                                            className="small fw-bold text-center mb-1 px-2 py-1 rounded"
                                            style={{ 
                                              backgroundColor: getPositionColor(role),
                                              color: 'white',
                                              fontSize: '0.7rem'
                                            }}
                                          >
                                            {roleLabel}
                                          </div>
                                          
                                          {/* Empleados del rol */}
                                          {roleShifts.map(shift => (
                                            <div 
                                              key={shift.id}
                                              className="shift-item mb-1 p-1 rounded cursor-pointer"
                                              style={{ 
                                                backgroundColor: '#f8f9fa',
                                                border: `2px solid ${getPositionColor(role)}`,
                                                fontSize: '0.75rem'
                                              }}
                                              onClick={() => openShiftModal(shift)}
                                            >
                                              <div className="fw-bold">
                                                {getEmployeeName(shift.employee_id)}
                                              </div>
                                              <div className="text-muted">
                                                {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                                              </div>
                                              {shift.notes && (
                                                <div className="small text-success">
                                                  📝 {shift.notes.substring(0, 20)}...
                                                </div>
                                              )}
                                              
                                              {/* Botones de acción */}
                                              <div className="d-flex justify-content-end mt-1">
                                                <Button 
                                                  size="sm" 
                                                  variant="outline-primary" 
                                                  className="me-1 px-1 py-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openShiftModal(shift);
                                                  }}
                                                >
                                                  <FaEdit size={10} />
                                                </Button>
                                                <Button 
                                                  size="sm" 
                                                  variant="outline-danger"
                                                  className="px-1 py-0"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteShift(shift.id);
                                                  }}
                                                >
                                                  <FaTrash size={10} />
                                                </Button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                
                                {/* Botón para agregar turno */}
                                <Button 
                                  size="sm" 
                                  variant="outline-secondary" 
                                  className="w-100 mt-2"
                                  onClick={() => openShiftModal(null, {
                                    department: 'BOH',
                                    date: date.toISOString().split('T')[0],
                                    shift_type: Object.keys(SHIFT_TYPES).find(key => SHIFT_TYPES[key].name === shiftType.name)
                                  })}
                                >
                                  <FaPlus size={10} />
                                </Button>
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </Tab>
      </Tabs>

      {/* Modal para crear/editar turno */}
      <Modal show={showShiftModal} onHide={() => setShowShiftModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingShift ? 'Editar Turno' : 'Nuevo Turno'}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitShift}>
          <Modal.Body>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Empleado *</Form.Label>
                  <Form.Select
                    name="employee_id"
                    value={shiftForm.employee_id}
                    onChange={handleShiftFormChange}
                    required
                  >
                    <option value="">Seleccionar empleado...</option>
                    {getAvailableEmployees(shiftForm.department).map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.displayName || `${emp.firstName} ${emp.lastName}`} - {emp.role}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Fecha *</Form.Label>
                  <Form.Control
                    type="date"
                    name="date"
                    value={shiftForm.date}
                    onChange={handleShiftFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Tipo de Turno *</Form.Label>
                  <Form.Select
                    name="shift_type"
                    value={shiftForm.shift_type}
                    onChange={handleShiftFormChange}
                    required
                  >
                    {Object.entries(SHIFT_TYPES).map(([key, type]) => (
                      <option key={key} value={key}>
                        {type.name} ({type.defaultStart} - {type.defaultEnd})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Departamento *</Form.Label>
                  <Form.Select
                    name="department"
                    value={shiftForm.department}
                    onChange={handleShiftFormChange}
                    required
                  >
                    <option value="FOH">Front of House</option>
                    <option value="BOH">Back of House</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora Inicio *</Form.Label>
                  <Form.Control
                    type="time"
                    name="start_time"
                    value={shiftForm.start_time}
                    onChange={handleShiftFormChange}
                    required
                  />
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Hora Final *</Form.Label>
                  <Form.Control
                    type="time"
                    name="end_time"
                    value={shiftForm.end_time}
                    onChange={handleShiftFormChange}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Posición</Form.Label>
                  <Form.Select
                    name="position"
                    value={shiftForm.position}
                    onChange={handleShiftFormChange}
                  >
                    <option value="">Seleccionar posición...</option>
                    {POSITIONS[shiftForm.department]?.map(pos => (
                      <option key={pos.value} value={pos.value}>
                        {pos.label}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Estado</Form.Label>
                  <Form.Select
                    name="status"
                    value={shiftForm.status}
                    onChange={handleShiftFormChange}
                  >
                    <option value="scheduled">Programado</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="cancelled">Cancelado</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label>Notas</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={shiftForm.notes}
                onChange={handleShiftFormChange}
                placeholder="Notas adicionales..."
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowShiftModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {editingShift ? 'Actualizar' : 'Crear'} Turno
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal para publicación rápida */}
      <Modal show={showQuickPublishModal} onHide={() => setShowQuickPublishModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Publicar Horarios - {currentDepartment}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmitQuickPublish}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Título</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={publishForm.title}
                onChange={handlePublishFormChange}
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Mensaje</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="message"
                value={publishForm.message}
                onChange={handlePublishFormChange}
              />
            </Form.Group>

            <Form.Check
              type="checkbox"
              name="notify_employees"
              checked={publishForm.notify_employees}
              onChange={handlePublishFormChange}
              label="Notificar a empleados por email"
            />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowQuickPublishModal(false)}>
              Cancelar
            </Button>
            <Button variant="success" type="submit">
              <FaShare className="me-1" />
              Publicar Horarios
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Componente de publicación */}
      <SchedulePublishing 
        user={user} 
        userRole={userRole} 
        shifts={shifts} 
        employees={employees} 
      />
    </Container>
  );
};

export default ShiftManagement;