// scheduleAvailabilityHelper.js
// Funciones helper para verificar disponibilidad de empleados en horarios

/**
 * Obtiene empleados disponibles para un día específico
 * @param {Array} employees - Lista de todos los empleados
 * @param {string} dayOfWeek - Día de la semana (monday, tuesday, etc.)
 * @param {string} department - Departamento opcional para filtrar (FOH, BOH, ADMIN)
 * @returns {Array} Empleados disponibles ese día
 */
export const getAvailableEmployees = (employees, dayOfWeek, department = null) => {
  return employees.filter(employee => {
    // Verificar que esté activo
    if (employee.status !== 'active' || employee.active === false) {
      return false;
    }

    // Verificar disponibilidad ese día
    const workDays = employee.workInfo?.schedule?.workDays || [];
    if (!workDays.includes(dayOfWeek)) {
      return false;
    }

    // Filtrar por departamento si se especifica
    if (department && employee.workInfo?.department !== department) {
      return false;
    }

    return true;
  });
};

/**
 * Obtiene empleados disponibles por rol específico
 * @param {Array} employees - Lista de todos los empleados
 * @param {string} dayOfWeek - Día de la semana
 * @param {string} role - Rol específico (server, chef, bartender, etc.)
 * @returns {Array} Empleados con ese rol disponibles
 */
export const getAvailableEmployeesByRole = (employees, dayOfWeek, role) => {
  return getAvailableEmployees(employees, dayOfWeek).filter(
    employee => employee.role === role
  );
};

/**
 * Verifica si un empleado específico está disponible un día
 * @param {Object} employee - Datos del empleado
 * @param {string} dayOfWeek - Día de la semana
 * @returns {boolean} true si está disponible
 */
export const isEmployeeAvailable = (employee, dayOfWeek) => {
  if (employee.status !== 'active' || employee.active === false) {
    return false;
  }
  
  const workDays = employee.workInfo?.schedule?.workDays || [];
  return workDays.includes(dayOfWeek);
};

/**
 * Obtiene estadísticas de disponibilidad por departamento
 * @param {Array} employees - Lista de empleados
 * @param {string} dayOfWeek - Día de la semana
 * @returns {Object} Estadísticas por departamento
 */
export const getAvailabilityStats = (employees, dayOfWeek) => {
  const stats = {
    FOH: { available: 0, total: 0 },
    BOH: { available: 0, total: 0 },
    ADMIN: { available: 0, total: 0 }
  };

  employees.forEach(employee => {
    const dept = employee.workInfo?.department || 'FOH';
    if (stats[dept]) {
      stats[dept].total++;
      if (isEmployeeAvailable(employee, dayOfWeek)) {
        stats[dept].available++;
      }
    }
  });

  return stats;
};

/**
 * Convierte nombre de día en español a valor del sistema
 * @param {string} dayName - Nombre del día (Lunes, Martes, etc.)
 * @returns {string} Valor del día (monday, tuesday, etc.)
 */
export const getDayValue = (dayName) => {
  const dayMap = {
    'Domingo': 'sunday',
    'Lunes': 'monday',
    'Martes': 'tuesday',
    'Miércoles': 'wednesday',
    'Jueves': 'thursday',
    'Viernes': 'friday',
    'Sábado': 'saturday'
  };
  
  return dayMap[dayName] || dayName.toLowerCase();
};

/**
 * Obtiene nombre en español del día
 * @param {string} dayValue - Valor del día (monday, tuesday, etc.)
 * @returns {string} Nombre en español
 */
export const getDayName = (dayValue) => {
  const dayMap = {
    'sunday': 'Domingo',
    'monday': 'Lunes',
    'tuesday': 'Martes',
    'wednesday': 'Miércoles',
    'thursday': 'Jueves',
    'friday': 'Viernes',
    'saturday': 'Sábado'
  };
  
  return dayMap[dayValue] || dayValue;
};

/**
 * Genera sugerencias de horarios basadas en disponibilidad
 * @param {Array} employees - Lista de empleados
 * @param {string} dayOfWeek - Día de la semana
 * @param {string} shift - Turno (morning, afternoon, night)
 * @returns {Object} Sugerencias organizadas por rol
 */
export const generateShiftSuggestions = (employees, dayOfWeek, shift = 'any') => {
  const available = getAvailableEmployees(employees, dayOfWeek);
  
  const suggestions = {
    FOH: {
      servers: available.filter(emp => emp.role === 'server' && emp.workInfo?.department === 'FOH'),
      bartenders: available.filter(emp => emp.role === 'bartender'),
      hosts: available.filter(emp => emp.role === 'host'),
      cashiers: available.filter(emp => emp.role === 'cashier'),
      managers: available.filter(emp => emp.role === 'floor_manager')
    },
    BOH: {
      chefs: available.filter(emp => emp.role === 'chef'),
      sous_chefs: available.filter(emp => emp.role === 'sous_chef'),
      cooks: available.filter(emp => emp.role === 'cook'),
      prep_cooks: available.filter(emp => emp.role === 'prep_cook'),
      dishwashers: available.filter(emp => emp.role === 'dishwasher'),
      kitchen_managers: available.filter(emp => emp.role === 'kitchen_manager')
    },
    ADMIN: {
      admins: available.filter(emp => emp.role === 'admin'),
      managers: available.filter(emp => emp.role === 'manager'),
      supervisors: available.filter(emp => emp.role === 'supervisor')
    }
  };

  return suggestions;
};

/**
 * Valida que un turno tenga cobertura mínima
 * @param {Array} assignedEmployees - Empleados asignados al turno
 * @param {string} shiftType - Tipo de turno (morning, afternoon, night)
 * @returns {Object} Resultado de validación
 */
export const validateShiftCoverage = (assignedEmployees, shiftType = 'any') => {
  const coverage = {
    FOH: {
      servers: assignedEmployees.filter(emp => emp.role === 'server').length,
      bartenders: assignedEmployees.filter(emp => emp.role === 'bartender').length,
      hosts: assignedEmployees.filter(emp => emp.role === 'host').length,
      managers: assignedEmployees.filter(emp => emp.role === 'floor_manager').length
    },
    BOH: {
      chefs: assignedEmployees.filter(emp => emp.role === 'chef').length,
      cooks: assignedEmployees.filter(emp => emp.role === 'cook').length,
      dishwashers: assignedEmployees.filter(emp => emp.role === 'dishwasher').length
    }
  };

  // Requerimientos mínimos por turno
  const minimumRequirements = {
    morning: {
      FOH: { servers: 1, hosts: 1 },
      BOH: { cooks: 1, dishwashers: 1 }
    },
    afternoon: {
      FOH: { servers: 2, bartenders: 1, hosts: 1 },
      BOH: { chefs: 1, cooks: 1, dishwashers: 1 }
    },
    night: {
      FOH: { servers: 3, bartenders: 1, managers: 1 },
      BOH: { chefs: 1, cooks: 2, dishwashers: 1 }
    }
  };

  const requirements = minimumRequirements[shiftType] || minimumRequirements.afternoon;
  const warnings = [];
  const errors = [];

  // Verificar FOH
  Object.entries(requirements.FOH || {}).forEach(([role, minCount]) => {
    const currentCount = coverage.FOH[role] || 0;
    if (currentCount < minCount) {
      errors.push(`Faltan ${minCount - currentCount} ${role} en FOH`);
    }
  });

  // Verificar BOH
  Object.entries(requirements.BOH || {}).forEach(([role, minCount]) => {
    const currentCount = coverage.BOH[role] || 0;
    if (currentCount < minCount) {
      errors.push(`Faltan ${minCount - currentCount} ${role} en BOH`);
    }
  });

  return {
    isValid: errors.length === 0,
    coverage,
    errors,
    warnings,
    suggestions: errors.length > 0 ? 
      `Se recomienda agregar: ${errors.join(', ')}` : 
      'Cobertura adecuada para el turno'
  };
};

// Ejemplo de uso en componente React:
/*
import { 
  getAvailableEmployees, 
  getAvailableEmployeesByRole,
  generateShiftSuggestions,
  validateShiftCoverage,
  getDayValue 
} from './scheduleAvailabilityHelper';

// En tu componente de horarios:
const ScheduleComponent = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedDay, setSelectedDay] = useState('monday');
  
  // Obtener empleados disponibles para el día seleccionado
  const availableEmployees = getAvailableEmployees(employees, selectedDay);
  
  // Obtener solo meseros disponibles
  const availableServers = getAvailableEmployeesByRole(employees, selectedDay, 'server');
  
  // Generar sugerencias para el turno
  const shiftSuggestions = generateShiftSuggestions(employees, selectedDay, 'afternoon');
  
  return (
    <div>
      <h4>Empleados Disponibles para {getDayName(selectedDay)}</h4>
      <p>Total disponibles: {availableEmployees.length}</p>
      <p>Meseros disponibles: {availableServers.length}</p>
      
      {shiftSuggestions.FOH.servers.map(server => (
        <div key={server.id}>
          {server.displayName} - Disponible {server.workInfo.schedule.workDays.length} días/semana
        </div>
      ))}
    </div>
  );
};
*/