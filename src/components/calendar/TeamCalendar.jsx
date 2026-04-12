// src/components/calendar/TeamCalendar.jsx
// Main calendar view utilizing FullCalendar for the team's absence schedule
// =========================================================

import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import CalendarLegend from './CalendarLegend';
import './TeamCalendar.css';

const TeamCalendar = () => {
  const navigate = useNavigate();
  const calendarRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [legendItems, setLegendItems] = useState([]);
  const [activeEmployees, setActiveEmployees] = useState([]); // Array of employee IDs to show. Empty = ALL
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters state
  const [currentRange, setCurrentRange] = useState({ start: null, end: null });

  // =============================================================
  // Fetch Events from API
  // =============================================================
  const fetchCalendarData = async (start, end) => {
    try {
      setLoading(true);
      setError(null);

      // Build query
      const params = {
        start: start.toISOString(),
        end: end.toISOString()
      };

      const { data } = await api.get('/calendar/team-calendar', { params });
      
      setEvents(data.data.events);
      setLegendItems(data.data.legend);
    } catch (err) {
      console.error('Failed to load calendar events', err);
      setError('Unable to load calendar data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Called automatically by FullCalendar when the user changes view (next, prev, month, week)
  const handleDatesSet = (dateInfo) => {
    setCurrentRange({ start: dateInfo.start, end: dateInfo.end });
    fetchCalendarData(dateInfo.start, dateInfo.end);
  };

  // =============================================================
  // Legend Filtering Logic
  // =============================================================
  const toggleEmployeeFilter = (employeeId) => {
    setActiveEmployees((prev) => {
      // If employee is already in the list, remove them
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      }
      // Otherwise add them
      return [...prev, employeeId];
    });
  };

  // Compute the events actually shown based on the filter
  const visibleEvents = events.filter((ev) => {
    if (activeEmployees.length === 0) return true; // Show all if no filters active
    return activeEmployees.includes(ev.extendedProps.employeeId);
  });

  // =============================================================
  // Custom Event Render
  // Adds conflicts indicator and status dots
  // =============================================================
  const renderEventContent = (eventInfo) => {
    const { isConflict, status } = eventInfo.event.extendedProps;
    
    return (
      <div className="custom-event-content" title={eventInfo.event.title}>
        {/* Red pulsing dot if overlapping with another person */}
        {isConflict && (
          <span className="conflict-indicator" title="Overlap Detected!">
            !
          </span>
        )}
        
        <span className="event-title">{eventInfo.event.title}</span>

        {/* Small dot for pending or modification requested */}
        {(status === 'pending' || status === 'modification_requested') && (
          <span 
            className={`status-indicator-dot ${status}`} 
            title={`Status: ${status}`} 
          />
        )}
      </div>
    );
  };

  return (
    <div className="calendar-page-container">
      {/* Header */}
      <div className="calendar-header-row">
        <div>
          <h1>Team Calendar</h1>
          <p>Global view of all team absences and overlaps</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-outline"
            style={{ 
              padding: '10px 20px', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              borderRadius: '10px', 
              color: '#f1f5f9', 
              cursor: 'pointer' 
            }}
            onClick={() => navigate('/dashboard')}
          >
            List View
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#991b1b', color: '#fecaca', padding: '12px 16px', borderRadius: 8, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="calendar-main-layout">
        <aside className="calendar-sidebar">
          {/* Legend Component */}
          <CalendarLegend 
            legendItems={legendItems}
            activeEmployees={activeEmployees}
            onEmployeeToggle={toggleEmployeeFilter}
          />
          
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 6px', color: '#fca5a5', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="conflict-indicator" style={{ position: 'relative', width: '12px', height: '12px', fontSize: '10px' }}>!</span> 
              Conflict Warning
            </h4>
            <p style={{ margin: 0, fontSize: '12px', color: '#fca5a5', lineHeight: 1.5 }}>
              Red badges and borders indicate that multiple team members have requested leave on overlapping dates.
            </p>
          </div>
        </aside>

        <section className="fc-wrapper">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek'
            }}
            events={visibleEvents}
            datesSet={handleDatesSet}
            eventContent={renderEventContent}
            weekends={false} // Hidden weekends as business days only
            height="auto"
            eventClick={(info) => {
              // Optionally do something when clicked, e.g. open details modal
              console.log('Event clicked:', info.event);
            }}
          />
        </section>
      </div>
    </div>
  );
};

export default TeamCalendar;
