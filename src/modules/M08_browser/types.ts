/**
 * M08 Browser Automation - Types
 */

export interface BrowserSession {
    id: string;
    status: 'idle' | 'navigating' | 'active' | 'closed';
    url?: string;
    title?: string;
    createdAt: number;
}

export interface ScreenshotOptions {
    fullPage?: boolean;
    format?: 'png' | 'jpeg';
    quality?: number;
}

export interface NavigationResult {
    success: boolean;
    url: string;
    title?: string;
    error?: string;
}
