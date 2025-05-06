import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FullCalendarModule } from '@fullcalendar/angular';
import { CalendarOptions, EventClickArg, DateSelectArg, EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { EventService } from '../../services/event.service';
import { Event } from '../../interfaces/event.interface';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, FullCalendarModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit {
  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    events: [],
    eventTimeFormat: {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    },
    locale: 'fr'
  };

  showEventModal = false;
  isNewEvent = true;
  currentEvent: Partial<Event> = {
    title: '',
    description: '',
    start: '',
    end: ''
  };

  constructor(private eventService: EventService, private router: Router) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventService.getEvents()
      .pipe(
        catchError(error => {
          if (error.status === 401) {
            this.router.navigate(['/login']);
          }
          return of([]);
        })
      )
      .subscribe(events => {
        console.log('Événements reçus:', events);
        
        if (!Array.isArray(events)) {
          console.error('Les événements reçus ne sont pas un tableau:', events);
          return;
        }

        const calendarEvents: EventInput[] = events.map(event => {
          console.log('Traitement de l\'événement:', event);
          const startDate = new Date(event.start);
          const endDate = new Date(event.end);

          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.error('Dates invalides pour l\'événement:', event);
            return null;
          }

          return {
            id: event.id?.toString(),
            title: event.title,
            start: startDate,
            end: endDate,
            description: event.description,
            allDay: false
          };
        }).filter(event => event !== null) as EventInput[];

        console.log('Événements formatés pour le calendrier:', calendarEvents);
        this.calendarOptions.events = calendarEvents;
      });
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    this.isNewEvent = true;
    this.currentEvent = {
      title: '',
      description: '',
      start: selectInfo.startStr,
      end: selectInfo.endStr
    };
    this.showEventModal = true;
  }

  handleEventClick(clickInfo: EventClickArg): void {
    this.isNewEvent = false;
    const eventId = parseInt(clickInfo.event.id);
    if (!isNaN(eventId)) {
      this.currentEvent = {
        id: eventId,
        title: clickInfo.event.title,
        description: clickInfo.event.extendedProps['description'] || '',
        start: clickInfo.event.startStr,
        end: clickInfo.event.endStr
      };
      this.showEventModal = true;
    }
  }

  createNewEvent(): void {
    this.isNewEvent = true;
    const now = new Date();
    this.currentEvent = {
      title: '',
      description: '',
      start: now.toISOString(),
      end: new Date(now.getTime() + 3600000).toISOString() // +1 hour
    };
    this.showEventModal = true;
  }

  saveEvent(): void {
    if (!this.currentEvent.title?.trim()) {
      return;
    }

    if (this.isNewEvent) {
      this.eventService.createEvent(this.currentEvent as Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at'>)
        .pipe(
          catchError(error => {
            if (error.status === 401) {
              this.router.navigate(['/login']);
            }
            return of(null);
          })
        )
        .subscribe(response => {
          if (response) {
            this.showEventModal = false;
            this.loadEvents();
          }
        });
    } else if (this.currentEvent.id) {
      this.eventService.updateEvent(
        this.currentEvent.id,
        this.currentEvent as Partial<Omit<Event, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
      )
      .pipe(
        catchError(error => {
          if (error.status === 401) {
            this.router.navigate(['/login']);
          }
          return of(null);
        })
      )
      .subscribe(response => {
        if (response) {
          this.showEventModal = false;
          this.loadEvents();
        }
      });
    }
  }

  deleteEvent(): void {
    if (this.currentEvent.id) {
      this.eventService.deleteEvent(this.currentEvent.id)
        .pipe(
          catchError(error => {
            if (error.status === 401) {
              this.router.navigate(['/login']);
            }
            return of(null);
          })
        )
        .subscribe(response => {
          if (response !== null) {
            this.showEventModal = false;
            this.loadEvents();
          }
        });
    }
  }
}

