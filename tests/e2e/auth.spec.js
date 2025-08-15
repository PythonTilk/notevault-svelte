import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should redirect to login when not authenticated', async ({ page }) => {
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should login with admin credentials', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[type="email"]', 'admin@notevault.com');
    await page.fill('input[type="password"]', 'admin123');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/');
    
    // Should see welcome message or dashboard content
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
  });

  test('should login with demo credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'demo@notevault.com');
    await page.fill('input[type="password"]', 'demo123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('text=Welcome')).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    
    // Should show error message
    await expect(page.locator('text=Invalid')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    
    // Click register link
    await page.click('text=Sign up');
    
    await expect(page).toHaveURL(/.*\/register/);
    await expect(page.locator('h1')).toContainText('Sign Up');
  });
});