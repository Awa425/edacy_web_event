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
  styleUrls: ['./calendar.component.css']
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
    eventDrop: this.handleEventDrop.bind(this),
    eventResize: this.handleEventResize.bind(this),
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

          const now = new Date();
          const isPast = now > endDate;
          const isCurrent = now >= startDate && now < endDate;
          const className = isPast ? 'fc-event-past' : isCurrent ? 'fc-event-current' : 'fc-event-future';

          return {
            id: event.id?.toString(),
            title: event.title,
            start: startDate,
            end: endDate,
            description: event.description,
            allDay: false,
            className: className
          };
        }).filter(event => event !== null) as EventInput[];

        console.log('Événements formatés pour le calendrier:', calendarEvents);
        this.calendarOptions.events = calendarEvents;
      });
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  handleDateSelect(selectInfo: DateSelectArg): void {
    this.isNewEvent = true;
    const start = new Date(selectInfo.start);
    const end = new Date(selectInfo.end);
    
    // S'assurer que la date de fin est après la date de début
    if (end <= start) {
      end.setHours(start.getHours() + 1);
    }

    this.currentEvent = {
      title: '',
      description: '',
      start: this.formatDate(start),
      end: this.formatDate(end)
    };
    this.showEventModal = true;
  }

  handleEventClick(clickInfo: EventClickArg): void {
    this.isNewEvent = false;
    const eventId = parseInt(clickInfo.event.id);
    if (!isNaN(eventId)) {
      // Récupérer l'événement complet depuis l'API
      this.eventService.getEvent(eventId).subscribe(event => {
        this.currentEvent = {
          id: event.id,
          title: event.title,
          description: event.description,
          start: event.start,
          end: event.end
        };
        this.showEventModal = true;
      });
    }
  }

  createNewEvent(): void {
    this.isNewEvent = true;
    const now = new Date();
    const end = new Date(now.getTime() + 3600000); // +1 hour
    this.currentEvent = {
      title: '',
      description: '',
      start: this.formatDate(now),
      end: this.formatDate(end)
    };
    this.showEventModal = true;
  }

  saveEvent(): void {
    if (!this.currentEvent.title?.trim()) {
      return;
    }

    if (this.isNewEvent) {
      if (!this.currentEvent.start || !this.currentEvent.end) {
        console.error('Les dates de début et de fin sont requises');
        return;
      }

      const start = new Date(this.currentEvent.start);
      const end = new Date(this.currentEvent.end);

      if (end <= start) {
        console.error('La date de fin doit être après la date de début');
        return;
      }

      const eventToCreate = {
        title: this.currentEvent.title || '',
        description: this.currentEvent.description || '',
        start: this.formatDate(start),
        end: this.formatDate(end)
      };

      this.eventService.createEvent(eventToCreate)
        .pipe(
          catchError(error => {
            if (error.status === 401) {
              this.router.navigate(['/login']);
            }
            console.error('Erreur lors de la création:', error);
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
      const eventToUpdate = {
        title: this.currentEvent.title,
        description: this.currentEvent.description,
        start: this.currentEvent.start ? new Date(this.currentEvent.start).toISOString().slice(0, 19).replace('T', ' ') : '',
        end: this.currentEvent.end ? new Date(this.currentEvent.end).toISOString().slice(0, 19).replace('T', ' ') : ''
      };
      
      this.eventService.updateEvent(
        this.currentEvent.id,
        eventToUpdate
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

  handleEventDrop(eventDropInfo: any): void {
    const eventId = parseInt(eventDropInfo.event.id);
    if (!isNaN(eventId)) {
      const eventToUpdate = {
        start: eventDropInfo.event.start.toISOString().slice(0, 19).replace('T', ' '),
        end: eventDropInfo.event.end.toISOString().slice(0, 19).replace('T', ' ')
      };

      this.eventService.updateEvent(eventId, eventToUpdate)
        .pipe(
          catchError(error => {
            if (error.status === 401) {
              this.router.navigate(['/login']);
            }
            eventDropInfo.revert();
            return of(null);
          })
        )
        .subscribe(response => {
          if (!response) {
            eventDropInfo.revert();
          }
        });
    }
  }

  handleEventResize(eventResizeInfo: any): void {
    const eventId = parseInt(eventResizeInfo.event.id);
    if (!isNaN(eventId)) {
      const eventToUpdate = {
        start: eventResizeInfo.event.start.toISOString().slice(0, 19).replace('T', ' '),
        end: eventResizeInfo.event.end.toISOString().slice(0, 19).replace('T', ' ')
      };

      this.eventService.updateEvent(eventId, eventToUpdate)
        .pipe(
          catchError(error => {
            if (error.status === 401) {
              this.router.navigate(['/login']);
            }
            eventResizeInfo.revert();
            return of(null);
          })
        )
        .subscribe(response => {
          if (!response) {
            eventResizeInfo.revert();
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

