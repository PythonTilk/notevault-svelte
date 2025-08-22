import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { toastStore } from './toast';

describe('Toast Store', () => {
  beforeEach(() => {
    // Clear all toasts before each test
    const toasts = get(toastStore);
    toasts.forEach(toast => toastStore.removeToast(toast.id));
  });

  it('should start with empty toast list', () => {
    const toasts = get(toastStore);
    expect(toasts).toHaveLength(0);
  });

  it('should add success toast with correct properties', () => {
    const toastId = toastStore.success('Test Title', 'Test message');
    const toasts = get(toastStore);
    
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      id: toastId,
      type: 'success',
      title: 'Test Title',
      message: 'Test message',
      duration: 5000
    });
  });

  it('should add error toast with correct properties', () => {
    const toastId = toastStore.error('Error Title', 'Error message');
    const toasts = get(toastStore);
    
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      id: toastId,
      type: 'error',
      title: 'Error Title',
      message: 'Error message',
      duration: 7000
    });
  });

  it('should add warning toast with correct properties', () => {
    const toastId = toastStore.warning('Warning Title', 'Warning message');
    const toasts = get(toastStore);
    
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      id: toastId,
      type: 'warning',
      title: 'Warning Title',
      message: 'Warning message',
      duration: 6000
    });
  });

  it('should add info toast with correct properties', () => {
    const toastId = toastStore.info('Info Title', 'Info message');
    const toasts = get(toastStore);
    
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      id: toastId,
      type: 'info',
      title: 'Info Title',
      message: 'Info message',
      duration: 4000
    });
  });

  it('should remove toast by id', () => {
    const toastId = toastStore.success('Test', 'Test message');
    let toasts = get(toastStore);
    expect(toasts).toHaveLength(1);
    
    toastStore.removeToast(toastId);
    toasts = get(toastStore);
    expect(toasts).toHaveLength(0);
  });

  it('should handle multiple toasts', () => {
    const toast1 = toastStore.success('Success', 'Success message');
    const toast2 = toastStore.error('Error', 'Error message');
    const toast3 = toastStore.info('Info', 'Info message');
    
    const toasts = get(toastStore);
    expect(toasts).toHaveLength(3);
    
    // Check that toasts are in correct order (newest first)
    expect(toasts[0].id).toBe(toast1);
    expect(toasts[1].id).toBe(toast2);
    expect(toasts[2].id).toBe(toast3);
  });

  it('should remove specific toast without affecting others', () => {
    const toast1 = toastStore.success('Success', 'Success message');
    const toast2 = toastStore.error('Error', 'Error message');
    const toast3 = toastStore.info('Info', 'Info message');
    
    toastStore.removeToast(toast2);
    
    const toasts = get(toastStore);
    expect(toasts).toHaveLength(2);
    expect(toasts.find(t => t.id === toast1)).toBeDefined();
    expect(toasts.find(t => t.id === toast3)).toBeDefined();
    expect(toasts.find(t => t.id === toast2)).toBeUndefined();
  });

  it('should auto-remove toast after specified duration', async () => {
    vi.useFakeTimers();
    
    const toastId = toastStore.addToast({
      type: 'success',
      title: 'Test',
      message: 'Test message',
      duration: 1000
    });
    
    let toasts = get(toastStore);
    expect(toasts).toHaveLength(1);
    
    // Fast-forward time by 1000ms
    vi.advanceTimersByTime(1000);
    
    // Wait for the next tick to allow the timeout to execute
    await vi.runAllTimersAsync();
    
    toasts = get(toastStore);
    expect(toasts).toHaveLength(0);
    
    vi.useRealTimers();
  });

  it('should not auto-remove toast with duration 0', async () => {
    vi.useFakeTimers();
    
    const toastId = toastStore.addToast({
      type: 'error',
      title: 'Persistent Error',
      message: 'This error stays',
      duration: 0
    });
    
    let toasts = get(toastStore);
    expect(toasts).toHaveLength(1);
    
    // Fast-forward time significantly
    vi.advanceTimersByTime(10000);
    await vi.runAllTimersAsync();
    
    toasts = get(toastStore);
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBe(toastId);
    
    vi.useRealTimers();
  });

  it('should generate unique IDs for toasts', () => {
    const toast1 = toastStore.success('Test 1', 'Message 1');
    const toast2 = toastStore.success('Test 2', 'Message 2');
    const toast3 = toastStore.success('Test 3', 'Message 3');
    
    expect(toast1).not.toBe(toast2);
    expect(toast2).not.toBe(toast3);
    expect(toast1).not.toBe(toast3);
  });

  it('should allow custom duration for toasts', () => {
    const toastId = toastStore.addToast({
      type: 'info',
      title: 'Custom Duration',
      message: 'This has custom duration',
      duration: 2500
    });
    
    const toasts = get(toastStore);
    expect(toasts[0].duration).toBe(2500);
  });
});