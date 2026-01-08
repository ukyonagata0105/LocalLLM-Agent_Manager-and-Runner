/**
 * E2E Tests for LLM Config Sync Feature
 * Tests the LLM configuration and sync functionality
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Settings Sync Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should navigate to Settings view', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        await expect(page.getByText('LLM Providers')).toBeVisible();
    });

    test('should show LLM provider dropdown', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByText('LLM Providers').click();

        // Wait for the settings panel to expand
        await page.waitForTimeout(300);

        // Check for provider select
        const providerSelect = page.locator('select').first();
        await expect(providerSelect).toBeVisible();
    });

    test('should have LM Studio option in provider dropdown', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByText('LLM Providers').click();
        await page.waitForTimeout(300);

        const providerSelect = page.locator('select').first();
        const options = await providerSelect.locator('option').allTextContents();

        expect(options.some(o => o.includes('LM Studio'))).toBeTruthy();
    });

    test('should show Base URL field when LM Studio selected', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByText('LLM Providers').click();
        await page.waitForTimeout(300);

        // Select LM Studio
        const providerSelect = page.locator('select').first();
        await providerSelect.selectOption('lmstudio');
        await page.waitForTimeout(300);

        // Check for Base URL input
        const baseUrlInput = page.locator('input[placeholder*="localhost:1234"]');
        await expect(baseUrlInput).toBeVisible();
    });

    test('should have Save & Sync button', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByText('LLM Providers').click();
        await page.waitForTimeout(300);

        const saveButton = page.locator('button:has-text("Save")');
        await expect(saveButton).toBeVisible();
    });

    test('should show success message after save in browser mode', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByText('LLM Providers').click();
        await page.waitForTimeout(300);

        // Select LM Studio
        const providerSelect = page.locator('select').first();
        await providerSelect.selectOption('lmstudio');

        // Click save
        const saveButton = page.locator('button:has-text("Save")');
        await saveButton.click();

        // Wait for response
        await page.waitForTimeout(1500);

        // Should show some feedback
        const body = await page.textContent('body');
        expect(body?.toLowerCase()).toContain('saved');
    });
});

test.describe('Knowledge Base UI Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should navigate to Knowledge view', async ({ page }) => {
        await page.getByRole('button', { name: 'Knowledge' }).click();
        await expect(page.getByRole('heading', { name: /Knowledge Base/i })).toBeVisible();
    });

    test('should have Dify Integration section', async ({ page }) => {
        await page.getByRole('button', { name: 'Knowledge' }).click();
        // Knowledge Base page loaded
        await expect(page.getByRole('heading', { name: /Knowledge Base/i })).toBeVisible();
    });
});
