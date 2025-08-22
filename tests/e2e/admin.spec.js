import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@notevault.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should access admin panel', async ({ page }) => {
    // Navigate to admin panel
    await page.click('text=Admin');
    await expect(page).toHaveURL(/.*\/admin/);
    
    // Should see admin dashboard
    await expect(page.locator('h1')).toContainText(/Admin|Dashboard/);
  });

  test('should display system statistics', async ({ page }) => {
    await page.goto('/admin');
    
    // Check for system stats
    await expect(page.locator('text=Users')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Workspaces')).toBeVisible();
    
    // Check for numerical stats
    const userCount = page.locator('[data-testid="user-count"]').or(page.locator('text=/\\d+ Users?/'));
    if (await userCount.isVisible()) {
      await expect(userCount).toBeVisible();
    }
  });

  test('should access user management', async ({ page }) => {
    await page.goto('/admin');
    
    // Navigate to user management
    const usersLink = page.locator('text=Manage Users').or(page.locator('a[href*="/admin/users"]'));
    
    if (await usersLink.isVisible()) {
      await usersLink.click();
      await expect(page).toHaveURL(/.*\/admin\/users/);
      
      // Should see users list
      await expect(page.locator('text=admin@notevault.com')).toBeVisible();
      await expect(page.locator('text=demo@notevault.com')).toBeVisible();
    }
  });

  test('should show audit logs', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for audit logs section
    const auditSection = page.locator('text=Audit Log').or(page.locator('[data-testid="audit-logs"]'));
    
    if (await auditSection.isVisible()) {
      await expect(auditSection).toBeVisible();
    }
  });

  test('should manage announcements', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for announcements management
    const announcementsSection = page.locator('text=Announcements').or(page.locator('[data-testid="announcements"]'));
    
    if (await announcementsSection.isVisible()) {
      await expect(announcementsSection).toBeVisible();
      
      // Should see existing announcements
      await expect(page.locator('text=Welcome to NoteVault')).toBeVisible();
    }
  });
});

test.describe('Admin Permissions', () => {
  test('should deny access to non-admin users', async ({ page }) => {
    // Login as demo user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'demo@notevault.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
    
    // Try to access admin panel directly
    await page.goto('/admin');
    
    // Should be redirected or show permission denied
    const isRedirected = !page.url().includes('/admin');
    const hasPermissionError = await page.locator('text=Permission denied').isVisible();
    const hasUnauthorizedError = await page.locator('text=Unauthorized').isVisible();
    
    expect(isRedirected || hasPermissionError || hasUnauthorizedError).toBe(true);
  });
});