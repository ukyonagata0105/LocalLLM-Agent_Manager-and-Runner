/**
 * LLM Config Sync E2E Tests - Browser Mode
 * Tests the LLM config sync functionality via browser (same React bundle as Electron)
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Config Sync - Full Flow', () => {
    test('Complete LLM configuration flow', async ({ page }) => {
        await page.goto('/');

        // Step 1: Navigate to Settings
        await page.getByRole('button', { name: 'Settings' }).click();
        await expect(page.getByText('LLM Providers')).toBeVisible();

        // Step 2: Open LLM Providers
        await page.getByText('LLM Providers').click();
        await page.waitForTimeout(300);

        // Step 3: Verify provider dropdown
        const providerSelect = page.locator('select').first();
        await expect(providerSelect).toBeVisible();

        // Step 4: Select LM Studio
        await providerSelect.selectOption('lmstudio');
        await page.waitForTimeout(300);

        // Step 5: Verify Base URL appears
        const baseUrlInput = page.locator('input[placeholder*="localhost:1234"]');
        await expect(baseUrlInput).toBeVisible();

        // Step 6: Verify Save button text
        const saveButton = page.locator('button:has-text("Save")');
        await expect(saveButton).toContainText('Sync');

        // Step 7: Click Save
        await saveButton.click();

        // Step 8: Wait for response
        await page.waitForTimeout(2000);

        // Step 9: Verify success message
        const body = await page.textContent('body');
        expect(body?.toLowerCase()).toContain('saved');
    });

    test('LLM config persists after navigation', async ({ page }) => {
        await page.goto('/');

        // Set config
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByText('LLM Providers').click();
        await page.waitForTimeout(300);

        const providerSelect = page.locator('select').first();
        await providerSelect.selectOption('lmstudio');

        const saveButton = page.locator('button:has-text("Save")');
        await saveButton.click();
        await page.waitForTimeout(1500);

        // Navigate away
        await page.getByRole('button', { name: 'Dashboard' }).click();
        await page.waitForTimeout(500);

        // Navigate back
        await page.getByRole('button', { name: 'Settings' }).click();
        await page.getByText('LLM Providers').click();
        await page.waitForTimeout(500);

        // Verify selection persisted
        const selectedValue = await page.locator('select').first().inputValue();
        expect(selectedValue).toBe('lmstudio');
    });
});

test.describe('IPC Handler Verification', () => {
    test('sync-llm-config IPC handler exists in build', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const mainJsPath = path.join(__dirname, '..', 'electron', 'main.js');

        const content = fs.readFileSync(mainJsPath, 'utf-8');
        expect(content).toContain('sync-llm-config');
    });

    test('ServiceManager restart methods exist', async () => {
        const fs = await import('fs');
        const path = await import('path');
        const { fileURLToPath } = await import('url');

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const smPath = path.join(__dirname, '..', 'electron', 'ServiceManager.js');

        const content = fs.readFileSync(smPath, 'utf-8');
        expect(content).toContain('startOpenHands');
        expect(content).toContain('startN8n');
    });
});
