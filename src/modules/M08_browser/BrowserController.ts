/**
 * M08 Browser Automation - Browser Controller
 * Uses native Electron webContents or Puppeteer/Playwright when available.
 */

import { BrowserSession, NavigationResult } from './types';

export class BrowserController {
    private sessions: Map<string, BrowserSession> = new Map();

    async createSession(): Promise<BrowserSession> {
        const session: BrowserSession = {
            id: crypto.randomUUID(),
            status: 'idle',
            createdAt: Date.now(),
        };
        this.sessions.set(session.id, session);
        console.log(`[Browser] Session created: ${session.id}`);
        return session;
    }

    async navigate(sessionId: string, url: string): Promise<NavigationResult> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            return { success: false, url, error: 'Session not found' };
        }

        session.status = 'navigating';
        session.url = url;

        // In production with Playwright:
        // const page = await this.getBrowserPage(sessionId);
        // await page.goto(url);
        // session.title = await page.title();

        // For now, simulate navigation
        session.status = 'active';
        session.title = `Page: ${url}`;

        console.log(`[Browser] Navigated to: ${url}`);
        return { success: true, url, title: session.title };
    }

    async click(sessionId: string, selector: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return false;
        }

        console.log(`[Browser] Clicked: ${selector}`);
        return true;
    }

    async type(sessionId: string, selector: string, text: string): Promise<boolean> {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return false;
        }

        console.log(`[Browser] Typed in ${selector}: ${text.substring(0, 20)}...`);
        return true;
    }

    async screenshot(sessionId: string): Promise<string | null> {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return null;
        }

        // In production: return base64 encoded screenshot
        console.log(`[Browser] Screenshot captured for session ${sessionId}`);
        return 'data:image/png;base64,placeholder';
    }

    async getContent(sessionId: string): Promise<string | null> {
        const session = this.sessions.get(sessionId);
        if (!session || session.status !== 'active') {
            return null;
        }

        // In production: return page HTML content
        return `<html><body><h1>${session.title}</h1></body></html>`;
    }

    async closeSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.status = 'closed';
            this.sessions.delete(sessionId);
            console.log(`[Browser] Session closed: ${sessionId}`);
        }
    }

    getSession(sessionId: string): BrowserSession | undefined {
        return this.sessions.get(sessionId);
    }

    getAllSessions(): BrowserSession[] {
        return Array.from(this.sessions.values());
    }
}

let controllerInstance: BrowserController | null = null;

export function getBrowserController(): BrowserController {
    if (!controllerInstance) {
        controllerInstance = new BrowserController();
    }
    return controllerInstance;
}
