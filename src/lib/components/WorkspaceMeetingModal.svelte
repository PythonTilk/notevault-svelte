<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Calendar, Clock, Users, Video } from 'lucide-svelte';
  import { api } from '$lib/api';

  export let isOpen: boolean = false;
  export let workspaceId: string;
  export let workspaceName: string = '';

  const dispatch = createEventDispatcher<{
    close: void;
    created: { meeting: any };
  }>();

  let isCreating = false;
  let error: string | null = null;

  // Meeting form data
  let meeting = {
    title: '',
    description: '',
    startTime: '',
    duration: 60, // in minutes
    attendees: [] as string[],
    generateMeetingLink: true
  };

  let attendeeInput = '';

  // Initialize with current date/time + 1 hour
  function initializeDateTime() {
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    meeting.startTime = now.toISOString().slice(0, 16); // Format for datetime-local
  }

  function addAttendee() {
    if (attendeeInput.trim() && !meeting.attendees.includes(attendeeInput.trim())) {
      meeting.attendees = [...meeting.attendees, attendeeInput.trim()];
      attendeeInput = '';
    }
  }

  function removeAttendee(email: string) {
    meeting.attendees = meeting.attendees.filter(a => a !== email);
  }

  function handleAttendeeKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      addAttendee();
    }
  }

  async function createMeeting() {
    if (!meeting.title.trim() || !meeting.startTime) return;

    isCreating = true;
    error = null;

    try {
      const result = await api.scheduleMeetingFromWorkspace(workspaceId, {
        title: meeting.title,
        description: meeting.description,
        startTime: meeting.startTime,
        duration: meeting.duration,
        attendees: meeting.attendees,
        generateMeetingLink: meeting.generateMeetingLink
      });

      dispatch('created', { meeting: result });
      handleClose();
    } catch (err) {
      console.error('Failed to create meeting:', err);
      error = err instanceof Error ? err.message : 'Failed to create meeting';
    } finally {
      isCreating = false;
    }
  }

  function handleClose() {
    isOpen = false;
    error = null;
    meeting = {
      title: '',
      description: '',
      startTime: '',
      duration: 60,
      attendees: [],
      generateMeetingLink: true
    };
    attendeeInput = '';
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }

  // Initialize datetime when modal opens
  $: if (isOpen && !meeting.startTime) {
    initializeDateTime();
  }
</script>

{#if isOpen}
  <!-- Modal backdrop -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    on:click={handleClose}
  >
    <!-- Modal content -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      on:click|stopPropagation
      on:keydown={handleKeydown}
      tabindex="-1"
    >
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar class="w-5 h-5" />
            Schedule Meeting for {workspaceName}
          </h2>
          <button
            class="text-dark-400 hover:text-white transition-colors"
            on:click={handleClose}
            aria-label="Close modal"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Error message -->
        {#if error}
          <div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-red-400 text-sm">{error}</p>
          </div>
        {/if}

        <form on:submit|preventDefault={createMeeting} class="space-y-4">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Meeting Title *
            </label>
            <input
              type="text"
              bind:value={meeting.title}
              class="input"
              placeholder="Weekly team standup"
              required
            />
          </div>

          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Description
            </label>
            <textarea
              bind:value={meeting.description}
              class="input"
              rows="3"
              placeholder="Meeting agenda and topics to discuss..."
            ></textarea>
          </div>

          <!-- Date and Time -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">
                Start Time *
              </label>
              <input
                type="datetime-local"
                bind:value={meeting.startTime}
                class="input"
                required
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">
                Duration (minutes)
              </label>
              <select bind:value={meeting.duration} class="input">
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>
          </div>

          <!-- Attendees -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Attendees
            </label>
            <div class="space-y-2">
              <div class="flex gap-2">
                <input
                  type="email"
                  bind:value={attendeeInput}
                  class="input flex-1"
                  placeholder="Enter email address"
                  on:keydown={handleAttendeeKeydown}
                />
                <button
                  type="button"
                  on:click={addAttendee}
                  class="btn-secondary px-4"
                >
                  Add
                </button>
              </div>
              
              {#if meeting.attendees.length > 0}
                <div class="flex flex-wrap gap-2">
                  {#each meeting.attendees as attendee}
                    <div class="flex items-center gap-2 bg-dark-800 px-3 py-1 rounded-lg text-sm">
                      <Users class="w-3 h-3" />
                      <span class="text-dark-200">{attendee}</span>
                      <button
                        type="button"
                        on:click={() => removeAttendee(attendee)}
                        class="text-dark-400 hover:text-red-400 text-xs"
                      >
                        ×
                      </button>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          </div>

          <!-- Meeting Link Option -->
          <div class="flex items-center space-x-3">
            <input
              type="checkbox"
              id="generateMeetingLink"
              bind:checked={meeting.generateMeetingLink}
              class="rounded"
            />
            <label for="generateMeetingLink" class="text-sm text-dark-300 flex items-center gap-2">
              <Video class="w-4 h-4" />
              Generate meeting link automatically
            </label>
          </div>

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              on:click={handleClose}
              class="btn-secondary"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
              disabled={isCreating || !meeting.title.trim() || !meeting.startTime}
            >
              {#if isCreating}
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating...
              {:else}
                <Calendar class="w-4 h-4 mr-2" />
                Schedule Meeting
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}