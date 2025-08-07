<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Calendar as CalendarIcon, 
    Plus, 
    ChevronLeft, 
    ChevronRight,
    Clock,
    MapPin,
    Users,
    Video,
    Settings,
    ExternalLink
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  let currentDate = new Date();
  let viewMode = 'month'; // 'month', 'week', 'day'
  let events = [];
  let isLoading = false;
  let showCreateModal = false;
  let connectedCalendars = [];

  // New event form
  let newEvent = {
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    location: '',
    attendees: [],
    calendar: 'primary',
    workspaceId: null,
    meetingLink: ''
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  onMount(async () => {
    await loadConnectedCalendars();
    await loadEvents();
  });

  async function loadConnectedCalendars() {
    try {
      const response = await api.get('/integrations/calendars');
      if (response.ok) {
        connectedCalendars = await response.json();
      } else {
        // Mock data
        connectedCalendars = [
          { id: 'primary', name: 'Primary Calendar', provider: 'google', color: '#3B82F6' },
          { id: 'work', name: 'Work Calendar', provider: 'outlook', color: '#10B981' }
        ];
      }
    } catch (error) {
      console.error('Failed to load calendars:', error);
    }
  }

  async function loadEvents() {
    isLoading = true;
    try {
      const startDate = getMonthStart(currentDate);
      const endDate = getMonthEnd(currentDate);
      
      const response = await api.get(`/calendar/events?start=${startDate.toISOString()}&end=${endDate.toISOString()}`);
      if (response.ok) {
        events = await response.json();
      } else {
        // Mock events
        events = generateMockEvents();
      }
    } catch (error) {
      console.error('Failed to load events:', error);
      events = generateMockEvents();
    } finally {
      isLoading = false;
    }
  }

  function generateMockEvents() {
    const mockEvents = [];
    const today = new Date();
    
    for (let i = 0; i < 15; i++) {
      const eventDate = new Date(today);
      eventDate.setDate(today.getDate() + Math.floor(Math.random() * 30) - 15);
      
      const startTime = new Date(eventDate);
      startTime.setHours(9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 4) * 15);
      
      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + Math.floor(Math.random() * 3) + 1);

      mockEvents.push({
        id: `event-${i}`,
        title: ['Team Standup', 'Project Review', 'Client Meeting', 'Design Session', 'Code Review'][Math.floor(Math.random() * 5)],
        description: 'Meeting description here...',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        location: Math.random() > 0.5 ? 'Conference Room A' : 'Virtual',
        attendees: ['john@example.com', 'jane@example.com'],
        calendar: Math.random() > 0.5 ? 'primary' : 'work',
        provider: Math.random() > 0.5 ? 'google' : 'outlook'
      });
    }

    return mockEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  }

  function navigateMonth(direction: number) {
    currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1);
    loadEvents();
  }

  function goToToday() {
    currentDate = new Date();
    loadEvents();
  }

  function getMonthStart(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function getMonthEnd(date: Date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
  }

  function getDaysInMonth() {
    const start = getMonthStart(currentDate);
    const end = getMonthEnd(currentDate);
    const days = [];
    
    // Add days from previous month to fill the week
    const startDayOfWeek = start.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(start);
      day.setDate(day.getDate() - i - 1);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Add days of current month
    for (let i = 1; i <= end.getDate(); i++) {
      const day = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push({ date: day, isCurrentMonth: true });
    }
    
    // Add days from next month to fill the week
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remainingCells = totalCells - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const day = new Date(end);
      day.setDate(day.getDate() + i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    return days;
  }

  function getEventsForDay(date: Date) {
    return events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    });
  }

  function isToday(date: Date) {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  function formatTime(dateString: string) {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  async function createEvent() {
    try {
      const response = await api.post('/calendar/events', newEvent);
      if (response.ok) {
        showCreateModal = false;
        resetNewEvent();
        await loadEvents();
      }
    } catch (error) {
      console.error('Failed to create event:', error);
    }
  }

  function resetNewEvent() {
    newEvent = {
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      location: '',
      attendees: [],
      calendar: 'primary',
      workspaceId: null,
      meetingLink: ''
    };
  }

  function getCalendarColor(calendarId: string) {
    const calendar = connectedCalendars.find(c => c.id === calendarId);
    return calendar?.color || '#3B82F6';
  }
</script>

<svelte:head>
  <title>Calendar - NoteVault</title>
</svelte:head>

<!-- Create Event Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-dark-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white">Create Event</h2>
          <button
            on:click={() => showCreateModal = false}
            class="text-dark-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <form on:submit|preventDefault={createEvent} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Title *</label>
            <input
              type="text"
              bind:value={newEvent.title}
              class="input"
              placeholder="Event title"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Description</label>
            <textarea
              bind:value={newEvent.description}
              class="input"
              rows="3"
              placeholder="Event description"
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Start Time *</label>
              <input
                type="datetime-local"
                bind:value={newEvent.startTime}
                class="input"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">End Time *</label>
              <input
                type="datetime-local"
                bind:value={newEvent.endTime}
                class="input"
                required
              />
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Location</label>
            <input
              type="text"
              bind:value={newEvent.location}
              class="input"
              placeholder="Conference room, address, or 'Virtual'"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Calendar</label>
            <select bind:value={newEvent.calendar} class="input">
              {#each connectedCalendars as calendar}
                <option value={calendar.id}>{calendar.name}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Meeting Link</label>
            <input
              type="url"
              bind:value={newEvent.meetingLink}
              class="input"
              placeholder="https://zoom.us/j/123456789"
            />
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              on:click={() => showCreateModal = false}
              class="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Create Event
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-3">
        <CalendarIcon class="h-6 w-6 text-primary-400" />
        <h1 class="text-2xl font-bold text-white">Calendar</h1>
      </div>
      
      <div class="flex items-center space-x-2">
        <button
          on:click={() => navigateMonth(-1)}
          class="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        
        <h2 class="text-lg font-medium text-white min-w-[200px] text-center">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          on:click={() => navigateMonth(1)}
          class="p-2 rounded-lg hover:bg-dark-700 text-dark-400 hover:text-white"
        >
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </div>

    <div class="flex items-center space-x-3">
      <button
        on:click={goToToday}
        class="btn-secondary"
      >
        Today
      </button>
      
      <button
        on:click={() => showCreateModal = true}
        class="btn-primary"
      >
        <Plus class="h-4 w-4 mr-2" />
        New Event
      </button>
    </div>
  </div>
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  <div class="max-w-7xl mx-auto">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        <span class="ml-3 text-white">Loading calendar...</span>
      </div>
    {:else}
      <!-- Calendar grid -->
      <div class="bg-dark-800 rounded-lg overflow-hidden">
        <!-- Weekday headers -->
        <div class="grid grid-cols-7 border-b border-dark-700">
          {#each weekdays as day}
            <div class="p-4 text-center font-medium text-dark-300 bg-dark-900">
              {day}
            </div>
          {/each}
        </div>

        <!-- Calendar days -->
        <div class="grid grid-cols-7">
          {#each getDaysInMonth() as dayInfo}
            {@const dayEvents = getEventsForDay(dayInfo.date)}
            <div 
              class="min-h-[120px] p-2 border-r border-b border-dark-700 {
                dayInfo.isCurrentMonth ? 'bg-dark-800' : 'bg-dark-900'
              } {isToday(dayInfo.date) ? 'ring-2 ring-primary-400' : ''}"
            >
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium {
                  dayInfo.isCurrentMonth ? 'text-white' : 'text-dark-500'
                } {isToday(dayInfo.date) ? 'text-primary-400' : ''}">
                  {dayInfo.date.getDate()}
                </span>
                {#if dayEvents.length > 0}
                  <span class="text-xs text-dark-400">
                    {dayEvents.length}
                  </span>
                {/if}
              </div>

              <!-- Events for this day -->
              <div class="space-y-1">
                {#each dayEvents.slice(0, 3) as event}
                  <div
                    class="p-1 rounded text-xs text-white cursor-pointer hover:opacity-80 truncate"
                    style="background-color: {getCalendarColor(event.calendar)}80;"
                    title="{event.title} - {formatTime(event.startTime)}"
                  >
                    <div class="font-medium truncate">{event.title}</div>
                    <div class="text-xs opacity-75">{formatTime(event.startTime)}</div>
                  </div>
                {/each}
                
                {#if dayEvents.length > 3}
                  <div class="text-xs text-dark-400 pl-1">
                    +{dayEvents.length - 3} more
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Upcoming Events Sidebar -->
      <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <h3 class="text-lg font-semibold text-white mb-4">Upcoming Events</h3>
          <div class="space-y-3">
            {#each events.filter(e => new Date(e.startTime) > new Date()).slice(0, 5) as event}
              <div class="card p-4">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-2 mb-2">
                      <div
                        class="w-3 h-3 rounded-full"
                        style="background-color: {getCalendarColor(event.calendar)};"
                      ></div>
                      <h4 class="font-medium text-white">{event.title}</h4>
                    </div>
                    
                    <div class="space-y-1 text-sm text-dark-400">
                      <div class="flex items-center space-x-2">
                        <Clock class="h-4 w-4" />
                        <span>
                          {new Date(event.startTime).toLocaleDateString()} 
                          {formatTime(event.startTime)} - {formatTime(event.endTime)}
                        </span>
                      </div>
                      
                      {#if event.location}
                        <div class="flex items-center space-x-2">
                          <MapPin class="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      {/if}
                      
                      {#if event.attendees?.length > 0}
                        <div class="flex items-center space-x-2">
                          <Users class="h-4 w-4" />
                          <span>{event.attendees.length} attendee{event.attendees.length === 1 ? '' : 's'}</span>
                        </div>
                      {/if}
                    </div>
                  </div>

                  {#if event.meetingLink || event.provider}
                    <div class="flex items-center space-x-2">
                      {#if event.meetingLink}
                        <a
                          href={event.meetingLink}
                          target="_blank"
                          class="p-2 text-blue-400 hover:text-blue-300 rounded-lg hover:bg-dark-700"
                          title="Join meeting"
                        >
                          <Video class="h-4 w-4" />
                        </a>
                      {/if}
                      
                      <button class="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700">
                        <Settings class="h-4 w-4" />
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Connected Calendars -->
        <div>
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white">Connected Calendars</h3>
            <a href="/settings/integrations" class="text-primary-400 hover:text-primary-300 text-sm">
              Manage
            </a>
          </div>
          
          <div class="space-y-2">
            {#each connectedCalendars as calendar}
              <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div class="flex items-center space-x-3">
                  <div
                    class="w-4 h-4 rounded-full"
                    style="background-color: {calendar.color};"
                  ></div>
                  <div>
                    <div class="text-white font-medium">{calendar.name}</div>
                    <div class="text-xs text-dark-400 capitalize">{calendar.provider}</div>
                  </div>
                </div>
                <ExternalLink class="h-4 w-4 text-dark-400" />
              </div>
            {/each}
            
            {#if connectedCalendars.length === 0}
              <div class="text-center py-6">
                <CalendarIcon class="h-12 w-12 mx-auto mb-3 text-dark-500" />
                <p class="text-dark-400 mb-3">No calendars connected</p>
                <a href="/settings/integrations" class="btn-primary btn-sm">
                  Connect Calendar
                </a>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>