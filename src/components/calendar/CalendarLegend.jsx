// src/components/calendar/CalendarLegend.jsx
// Displays the employee colors used in the calendar and status filters
// =========================================================

import React from 'react';

const CalendarLegend = ({ legendItems, onEmployeeToggle, activeEmployees }) => {
  if (!legendItems || legendItems.length === 0) return null;

  return (
    <div className="calendar-legend-card">
      <div className="legend-header">
        <h3>Team Members</h3>
        <span className="legend-count">{legendItems.length}</span>
      </div>
      
      <p className="legend-subtitle">
        Click to filter the calendar by employee
      </p>

      <div className="legend-items">
        {legendItems.map((emp) => {
          const isActive = activeEmployees.includes(emp.id);
          return (
            <button
              key={emp.id}
              className={`legend-item ${isActive ? 'active' : ''}`}
              onClick={() => onEmployeeToggle(emp.id)}
            >
              <div 
                className="color-dot" 
                style={{ backgroundColor: emp.color }}
              />
              <span className="emp-name">{emp.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarLegend;
