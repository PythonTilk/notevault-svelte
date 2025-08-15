import { writable } from 'svelte/store';

export const showCreateWorkspaceModal = writable<boolean>(false);