<script lang="ts">
  import Toast from './Toast.svelte';
  import { toastStore } from '$lib/stores/toast';
</script>

<div class="fixed top-4 right-4 z-50 space-y-3 pointer-events-none">
  {#each $toastStore as toast (toast.id)}
    <div class="pointer-events-auto">
      <Toast {toast} />
    </div>
  {/each}
</div>