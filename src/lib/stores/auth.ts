import { writable } from 'svelte/store';
import type { User } from '$lib/types';

export const currentUser = writable<User | null>(null);
export const isAuthenticated = writable<boolean>(false);
export const isLoading = writable<boolean>(true);

// Mock authentication for demo
export const authStore = {
  login: async (email: string, password: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser: User = {
      id: '1',
      username: 'demo_user',
      email,
      displayName: 'Demo User',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
      role: 'admin',
      createdAt: new Date(),
      lastActive: new Date(),
      isOnline: true
    };
    
    currentUser.set(mockUser);
    isAuthenticated.set(true);
    localStorage.setItem('auth_token', 'mock_token');
    
    return { success: true };
  },
  
  logout: () => {
    currentUser.set(null);
    isAuthenticated.set(false);
    localStorage.removeItem('auth_token');
  },
  
  checkAuth: async () => {
    isLoading.set(true);
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      // Simulate API call to verify token
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockUser: User = {
        id: '1',
        username: 'demo_user',
        email: 'demo@example.com',
        displayName: 'Demo User',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
        role: 'admin',
        createdAt: new Date(),
        lastActive: new Date(),
        isOnline: true
      };
      
      currentUser.set(mockUser);
      isAuthenticated.set(true);
    }
    
    isLoading.set(false);
  }
};