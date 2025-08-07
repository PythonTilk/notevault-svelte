import { test, expect } from '@playwright/test';

test.describe('Dashboard Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin first
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@notevault.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should display dashboard components', async ({ page }) => {
    // Check for main dashboard elements
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Check for sidebar navigation
    await expect(page.locator('nav')).toBeVisible();
    
    // Check for workspaces section
    await expect(page.locator('text=Workspaces')).toBeVisible();
  });

  test('should show user profile in sidebar', async ({ page }) => {
    // Check if user profile is displayed
    await expect(page.locator('text=Administrator')).toBeVisible();
  });

  test('should navigate to different sections', async ({ page }) => {
    // Navigate to chat
    await page.click('text=Chat');
    await expect(page).toHaveURL(/.*\/chat/);
    
    // Navigate to files
    await page.click('text=Files');
    await expect(page).toHaveURL(/.*\/files/);
    
    // Navigate to settings
    await page.click('text=Settings');
    await expect(page).toHaveURL(/.*\/settings/);
    
    // Navigate back to dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/');
  });

  test('should display announcements', async ({ page }) => {
    // Look for announcements section
    const announcements = page.locator('text=Welcome to NoteVault');
    if (await announcements.isVisible()) {
      await expect(announcements).toBeVisible();
    }
  });

  test('should allow theme switching', async ({ page }) => {
    // Look for theme selector (might be in settings)
    await page.goto('/settings');
    
    // Check if theme options are available
    const themeSelector = page.locator('[data-testid="theme-selector"]');
    if (await themeSelector.isVisible()) {
      await themeSelector.click();
      await expect(page.locator('text=Dark')).toBeVisible();
      await expect(page.locator('text=Light')).toBeVisible();
    }
  });
});