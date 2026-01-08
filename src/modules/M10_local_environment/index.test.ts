
import { describe, it, expect } from 'vitest';
import { getConfigService } from './ConfigService';

describe('M10 Local Environment', () => {
    it('should initialize ConfigService', () => {
        const config = getConfigService();
        expect(config).toBeDefined();
    });
});
