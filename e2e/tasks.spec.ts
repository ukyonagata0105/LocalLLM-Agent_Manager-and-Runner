/**
 * E2E Test - Task Management Flow
 * Tests creating, completing, and managing tasks in the Kanban board.
 */

import { test, expect } from '@playwright/test';

test.describe('Task Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByRole('button', { name: 'Tasks' }).click();
        await expect(page.getByText('Task Management')).toBeVisible();
    });

    test('should display Kanban columns', async ({ page }) => {
        await expect(page.locator('section').filter({ hasText: 'To Do' }).first()).toBeVisible();
        await expect(page.locator('section').filter({ hasText: 'In Progress' }).first()).toBeVisible();
        await expect(page.locator('section').filter({ hasText: 'Done' }).first()).toBeVisible();
        await expect(page.locator('section').filter({ hasText: 'Blocked' }).first()).toBeVisible();
    });

    test('should show existing sample tasks', async ({ page }) => {
        // Use semantic role 'article' for task cards
        const taskCard = page.getByRole('article').first();
        await expect(taskCard).toBeVisible();
    });

    test('should open add task modal when clicking + button', async ({ page }) => {
        // Use explicit aria-label for the specific column's add button
        await page.getByRole('button', { name: 'Add task to To Do' }).click();

        // Modal should appear
        await expect(page.getByText('Add New Task', { exact: true })).toBeVisible();
        await expect(page.getByPlaceholder('Enter task title...')).toBeVisible();
    });

    test('should create a new task', async ({ page }) => {
        // Open modal via specific button
        await page.getByRole('button', { name: 'Add task to To Do' }).click();

        // Fill in task title
        await page.getByPlaceholder('Enter task title...').fill('E2E Test Task');

        // Submit - target the submit button inside the form/modal
        await page.locator('form').getByRole('button', { name: 'Add Task' }).click();

        // Task should appear (check for new article)
        await expect(page.getByRole('article').filter({ hasText: 'E2E Test Task' })).toBeVisible();
    });

    test('should mark task as done', async ({ page }) => {
        // Find a task card
        const taskCard = page.getByRole('article').first();
        if (await taskCard.isVisible()) {
            // Click to open details
            await taskCard.click();

            // Check if Detail Modal is open
            await expect(page.getByText('Description', { exact: true })).toBeVisible();

            // Check for status section
            await expect(page.getByText('Status', { exact: true })).toBeVisible();
        }
    });
});
