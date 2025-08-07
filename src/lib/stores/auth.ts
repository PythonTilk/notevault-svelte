import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { User } from '$lib/types';
import { api } from '$lib/api';

export const currentUser = writable<User | null>(null);
export const isAuthenticated = writable<boolean>(false);
export const isLoading = writable<boolean>(true);

export const authStore = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      
      if (response.success && response.token && response.user) {
        if (browser) {
          localStorage.setItem('auth_token', response.token);
        }
        
        const user: User = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          displayName: response.user.displayName,
          avatar: response.user.avatar,
          role: response.user.role,
          createdAt: new Date(response.user.createdAt),
          lastActive: new Date(response.user.lastActive),
          isOnline: response.user.isOnline
        };
        
        currentUser.set(user);
        isAuthenticated.set(true);
        
        return { success: true };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  },

  register: async (userData: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }) => {
    try {
      const response = await api.register(userData);
      
      if (response.success && response.token && response.user) {
        if (browser) {
          localStorage.setItem('auth_token', response.token);
        }
        
        const user: User = {
          id: response.user.id,
          username: response.user.username,
          email: response.user.email,
          displayName: response.user.displayName,
          avatar: response.user.avatar,
          role: response.user.role,
          createdAt: new Date(response.user.createdAt),
          lastActive: new Date(),
          isOnline: true
        };
        
        currentUser.set(user);
        isAuthenticated.set(true);
        
        return { success: true };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Registration failed' };
    }
  },
  
  logout: async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      currentUser.set(null);
      isAuthenticated.set(false);
      if (browser) {
        localStorage.removeItem('auth_token');
      }
    }
  },
  
  checkAuth: async () => {
    if (!browser) {
      isLoading.set(false);
      return;
    }
    
    isLoading.set(true);
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      try {
        const userData = await api.getCurrentUser();
        
        const user: User = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          displayName: userData.displayName,
          avatar: userData.avatar,
          role: userData.role,
          createdAt: new Date(userData.createdAt),
          lastActive: new Date(userData.lastActive),
          isOnline: userData.isOnline
        };
        
        currentUser.set(user);
        isAuthenticated.set(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Token is invalid, remove it
        localStorage.removeItem('auth_token');
        currentUser.set(null);
        isAuthenticated.set(false);
      }
    }
    
    isLoading.set(false);
  },

  updateProfile: async (updates: { displayName?: string; avatar?: string }) => {
    try {
      const updatedUser = await api.updateProfile(updates);
      
      const user: User = {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
        createdAt: new Date(updatedUser.createdAt),
        lastActive: new Date(updatedUser.lastActive),
        isOnline: updatedUser.isOnline
      };
      
      currentUser.set(user);
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Update failed' };
    }
  }
};