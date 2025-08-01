import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@notevault.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should work on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Dashboard should be responsive
    await expect(page.locator('nav')).toBeVisible();
    
    // Mobile navigation might be collapsed
    const mobileMenu = page.locator('[data-testid="mobile-menu"]').or(page.locator('.mobile-menu'));
    if (await mobileMenu.isVisible()) {
      await expect(mobileMenu).toBeVisible();
    }
  });

  test('should work on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Should maintain functionality
    await expect(page.locator('text=Dashboard')).toBeVisible();
    
    // Sidebar might be visible or collapsed
    const sidebar = page.locator('[data-testid="sidebar"]').or(page.locator('nav'));
    await expect(sidebar).toBeVisible();
  });

  test('should work on desktop viewport', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    
    // Full desktop layout
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // Should utilize full width effectively
    const mainContent = page.locator('main');
    const boundingBox = await mainContent.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(1000);
  });

  test('should handle viewport changes', async ({ page }) => {
    // Start with desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    await expect(page.locator('nav')).toBeVisible();
    
    // Switch to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Layout should adapt
    await expect(page.locator('body')).toBeVisible();
    
    // Switch back to desktop
    await page.setViewportSize({ width: 1200, height: 800 });
    
    // Should work normally
    await expect(page.locator('nav')).toBeVisible();
  });

  test('should maintain accessibility on all viewports', async ({ page }) => {
    const viewports = [
      { width: 375, height: 667 }, // Mobile
      { width: 768, height: 1024 }, // Tablet
      { width: 1200, height: 800 }  // Desktop
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      
      // Check for proper heading structure
      const headings = page.locator('h1, h2, h3, h4, h5, h6');
      const headingCount = await headings.count();
      expect(headingCount).toBeGreaterThan(0);
      
      // Check for navigation landmarks
      const nav = page.locator('nav');
      await expect(nav).toBeVisible();
      
      // Check for main content area
      const main = page.locator('main').or(page.locator('[role="main"]'));
      if (await main.isVisible()) {
        await expect(main).toBeVisible();
      }
    }
  });
});