/**
 * E2E Test - Navigation Flow
 * Tests the basic navigation between views in the dashboard.
 */

import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('should display the dashboard view by default', async ({ page }) => {
        // It might take a moment or depend on persisted state/default view
        // We check for Main Dashboard components
        await expect(page.getByText('Monitor your agents and system status')).toBeVisible();
    });

    test('should navigate to Tasks view', async ({ page }) => {
        await page.getByRole('button', { name: 'Tasks' }).click();
        await expect(page.getByText('Task Management')).toBeVisible();
        await expect(page.getByText('To Do')).toBeVisible();
    });

    test('should navigate to Workflows view', async ({ page }) => {
        await page.getByRole('button', { name: 'Workflows' }).click();
        // Updated: actual text in UI
        await expect(page.getByText('Workflow Automation (n8n)')).toBeVisible();
        await expect(page.getByText('Sync & Restart')).toBeVisible();
    });

    test('should navigate to Analytics view', async ({ page }) => {
        await page.getByRole('button', { name: 'Analytics' }).click();
        await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible();
        await expect(page.getByText('Total Tokens')).toBeVisible();
    });

    test('should navigate to Agents view', async ({ page }) => {
        await page.getByRole('button', { name: 'Agents' }).click();
        // Check for Agent Chat or Debugger
        await expect(page.getByText('Agent Chat')).toBeVisible();
    });

    test('should navigate to Knowledge view', async ({ page }) => {
        await page.getByRole('button', { name: 'Knowledge' }).click();
        // Use heading role for more specific match
        await expect(page.getByRole('heading', { name: /Knowledge Base/i })).toBeVisible();
    });

    test('should navigate to OpenHands view', async ({ page }) => {
        await page.getByRole('button', { name: 'OpenHands' }).click();
        await expect(page.getByText('Autonomous Coding Agent Runtime')).toBeVisible();
    });

    test('should navigate to Settings view', async ({ page }) => {
        await page.getByRole('button', { name: 'Settings' }).click();
        await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
        await expect(page.getByText('LLM Providers', { exact: false })).toBeVisible();
    });

    test('should toggle sidebar', async ({ page }) => {
        // Sidebar should be expanded by default
        await expect(page.getByText('LocalLLM')).toBeVisible();

        // Click collapse button
        await page.locator('button').filter({ has: page.locator('svg') }).first().click();

        // After collapse, the text should be hidden or sidebar narrower
        await page.waitForTimeout(300); // Wait for animation
    });
});
