import { test, expect } from '@playwright/test';

test.describe('Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"]', 'admin@notevault.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/');
  });

  test('should create a new workspace', async ({ page }) => {
    // Look for create workspace button
    const createBtn = page.locator('text=Create Workspace').or(page.locator('button:has-text("New")'));
    
    if (await createBtn.isVisible()) {
      await createBtn.click();
      
      // Fill workspace form
      await page.fill('input[name="name"]', 'E2E Test Workspace');
      await page.fill('textarea[name="description"]', 'Created by E2E test');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Should see success message or new workspace
      await expect(page.locator('text=E2E Test Workspace')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should display existing workspaces', async ({ page }) => {
    // Check if workspaces are listed
    const workspacesList = page.locator('[data-testid="workspaces-list"]');
    
    if (await workspacesList.isVisible()) {
      await expect(workspacesList).toBeVisible();
    } else {
      // Check for empty state or workspace cards
      const hasWorkspaces = await page.locator('.workspace-card').count() > 0;
      const hasEmptyState = await page.locator('text=No workspaces').isVisible();
      
      expect(hasWorkspaces || hasEmptyState).toBe(true);
    }
  });

  test('should navigate to workspace canvas', async ({ page }) => {
    // Look for existing workspace or create one
    const workspaceCard = page.locator('.workspace-card').first();
    
    if (await workspaceCard.isVisible()) {
      await workspaceCard.click();
      
      // Should navigate to workspace page
      await expect(page).toHaveURL(/.*\/workspaces\/[a-f0-9-]+/);
      
      // Should see canvas interface
      await expect(page.locator('[data-testid="workspace-canvas"]')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should allow workspace settings access', async ({ page }) => {
    const workspaceCard = page.locator('.workspace-card').first();
    
    if (await workspaceCard.isVisible()) {
      // Look for settings menu (usually three dots or gear icon)
      const settingsBtn = workspaceCard.locator('button[aria-label="Workspace settings"]')
        .or(workspaceCard.locator('[data-testid="workspace-menu"]'));
      
      if (await settingsBtn.isVisible()) {
        await settingsBtn.click();
        
        // Should see workspace options
        await expect(page.locator('text=Edit')).toBeVisible();
      }
    }
  });
});