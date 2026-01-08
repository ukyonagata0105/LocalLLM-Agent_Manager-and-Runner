/**
 * E2E Test - Workflow View
 * Tests the n8n workflow integration page.
 */

import { test, expect } from '@playwright/test';

test.describe('Workflow View', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Workflows' }).click();
        // Updated: actual text in UI
        await expect(page.getByText('Workflow Automation (n8n)')).toBeVisible();
    });

    test('should display workflow header with n8n branding', async ({ page }) => {
        await expect(page.getByText('Workflow Automation (n8n)')).toBeVisible();
        await expect(page.getByText('Design and automate your processes using n8n')).toBeVisible();
    });

    test('should have Sync & Restart button', async ({ page }) => {
        await expect(page.getByRole('button', { name: '↻ Sync & Restart' })).toBeVisible();
    });

    test('should have Open in New Tab link', async ({ page }) => {
        const link = page.getByRole('link', { name: /Open in New Tab/ });
        await expect(link).toBeVisible();
        await expect(link).toHaveAttribute('href', 'http://localhost:5678');
    });

    test('should have n8n iframe', async ({ page }) => {
        const iframe = page.locator('iframe#n8n-frame');
        await expect(iframe).toBeVisible();
        await expect(iframe).toHaveAttribute('src', 'http://localhost:5678');
    });
});
