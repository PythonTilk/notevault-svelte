<script lang="ts">
  import { onMount } from 'svelte';
  import { Bell, Check, X, Info, AlertTriangle, CheckCircle } from 'lucide-svelte';
  import { 
    notifications, 
    isLoading, 
    error, 
    unreadCount, 
    notificationStore 
  } from '$lib/stores/notifications';

  let filter: 'all' | 'unread' = 'all';

  onMount(async () => {
    await notificationStore.load();
  });

  function markAsRead(notificationId: string) {
    notificationStore.markAsRead(notificationId);
  }

  function markAllAsRead() {
    notificationStore.markAllAsRead();
  }

  function deleteNotification(notificationId: string) {
    notificationStore.delete(notificationId);
  }

  function getIcon(type: string) {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return X;
      default: return Info;
    }
  }

  function getIconColor(type: string) {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-blue-400';
    }
  }

  function formatDate(date: Date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else {
      return `${days}d ago`;
    }
  }

  $: filteredNotifications = filter === 'all' 
    ? $notifications 
    : $notifications.filter(n => !n.isRead);
</script>

<svelte:head>
  <title>Notifications - NoteVault</title>
</svelte:head>

<div class="min-h-screen bg-dark-900 p-6">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div class="flex items-center space-x-3">
        <Bell class="h-8 w-8 text-primary-400" />
        <div>
          <h1 class="text-3xl font-bold text-white">Notifications</h1>
          <p class="text-dark-400">
            {$unreadCount > 0 ? `${$unreadCount} unread notification${$unreadCount === 1 ? '' : 's'}` : 'All caught up!'}
          </p>
        </div>
      </div>

      {#if $unreadCount > 0}
        <button
          on:click={markAllAsRead}
          class="btn-secondary text-sm"
        >
          <Check class="h-4 w-4 mr-2" />
          Mark all as read
        </button>
      {/if}
    </div>

    <!-- Filter Tabs -->
    <div class="flex space-x-1 mb-6">
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {filter === 'all' 
          ? 'bg-primary-600 text-white' 
          : 'text-dark-300 hover:text-white hover:bg-dark-700'}"
        on:click={() => filter = 'all'}
      >
        All ({$notifications.length})
      </button>
      <button
        class="px-4 py-2 rounded-lg text-sm font-medium transition-colors {filter === 'unread' 
          ? 'bg-primary-600 text-white' 
          : 'text-dark-300 hover:text-white hover:bg-dark-700'}"
        on:click={() => filter = 'unread'}
      >
        Unread ({$unreadCount})
      </button>
    </div>

    <!-- Notifications List -->
    {#if $isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    {:else if filteredNotifications.length === 0}
      <div class="text-center py-12">
        <Bell class="h-16 w-16 text-dark-600 mx-auto mb-4" />
        <h3 class="text-xl font-semibold text-white mb-2">
          {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
        </h3>
        <p class="text-dark-400">
          {filter === 'unread' 
            ? 'All your notifications have been read.' 
            : 'You\'ll see notifications here when you have them.'}
        </p>
      </div>
    {:else}
      <div class="space-y-4">
        {#each filteredNotifications as notification (notification.id)}
          <div class="card p-4 {!notification.isRead ? 'border-l-4 border-primary-500' : ''}">
            <div class="flex items-start space-x-4">
              <!-- Icon -->
              <div class="flex-shrink-0 mt-1">
                <svelte:component 
                  this={getIcon(notification.type)} 
                  class="h-5 w-5 {getIconColor(notification.type)}" 
                />
              </div>

              <!-- Content -->
              <div class="flex-1 min-w-0">
                <div class="flex items-start justify-between">
                  <div class="flex-1">
                    <h3 class="text-white font-medium {!notification.isRead ? 'font-semibold' : ''}">
                      {notification.title}
                    </h3>
                    <p class="text-dark-300 text-sm mt-1">
                      {notification.message}
                    </p>
                    <p class="text-dark-500 text-xs mt-2">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>

                  <!-- Actions -->
                  <div class="flex items-center space-x-2 ml-4">
                    {#if !notification.isRead}
                      <button
                        on:click={() => markAsRead(notification.id)}
                        class="p-1 text-dark-400 hover:text-primary-400 transition-colors"
                        title="Mark as read"
                      >
                        <Check class="h-4 w-4" />
                      </button>
                    {/if}
                    <button
                      on:click={() => deleteNotification(notification.id)}
                      class="p-1 text-dark-400 hover:text-red-400 transition-colors"
                      title="Delete notification"
                    >
                      <X class="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <!-- Action Button -->
                {#if notification.actionUrl}
                  <div class="mt-3">
                    <a
                      href={notification.actionUrl}
                      class="inline-flex items-center text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                      View →
                    </a>
                  </div>
                {/if}
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>