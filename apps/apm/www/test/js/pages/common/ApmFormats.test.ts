import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApmFormats } from '@/pages/common/ApmFormats';

describe('ApmFormats', () => {
    describe('timeAgo', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            const date = new Date('2023-01-01T12:00:00Z');
            vi.setSystemTime(date);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('should work with number (timestamp in seconds)', () => {
            const now = Date.now() / 1000;
            expect(ApmFormats.timeAgo(now)).toBe('<1min ago');
            expect(ApmFormats.timeAgo(now - 30)).toBe('<1min ago');
            expect(ApmFormats.timeAgo(now - 45)).toBe('<1min ago');
            expect(ApmFormats.timeAgo(now - 46)).toBe('1 min ago');
            expect(ApmFormats.timeAgo(now - 90)).toBe('2 mins ago');
            expect(ApmFormats.timeAgo(now - 3600)).toBe('1h ago');
            expect(ApmFormats.timeAgo(now - 3660)).toBe('1h 1min ago');
        });

        it('should format durations in days', () => {
            const now = Date.now() / 1000;
            expect(ApmFormats.timeAgo(now - 24 * 60 * 60)).toBe('24h ago');
            expect(ApmFormats.timeAgo(now - (2 * 24 + 3) * 60 * 60)).toBe('2 days, 3 hours ago');
            expect(ApmFormats.timeAgo(now - (8 * 24 + 3) * 60 * 60)).toBe('8 days ago');
        });

        it('should work with string', () => {
            // @ts-ignore - testing new functionality
            expect(ApmFormats.timeAgo('2023-01-01 12:00:00')).toBe('<1min ago');
            // @ts-ignore
            expect(ApmFormats.timeAgo('2023-01-01 11:59:30')).toBe('<1min ago');
            // @ts-ignore
            expect(ApmFormats.timeAgo('2023-01-01 11:59:15')).toBe('<1min ago');
            // @ts-ignore
            expect(ApmFormats.timeAgo('2023-01-01 11:59:14')).toBe('1 min ago');
            // @ts-ignore
            expect(ApmFormats.timeAgo('2023-01-01 11:58:30')).toBe('2 mins ago');
        });

        it('should work with Date object', () => {
            const now = new Date();
            // @ts-ignore
            expect(ApmFormats.timeAgo(now)).toBe('<1min ago');
            const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
            // @ts-ignore
            expect(ApmFormats.timeAgo(thirtySecondsAgo)).toBe('<1min ago');
            const fortyFiveSecondsAgo = new Date(now.getTime() - 45 * 1000);
            // @ts-ignore
            expect(ApmFormats.timeAgo(fortyFiveSecondsAgo)).toBe('<1min ago');
            const fortySixSecondsAgo = new Date(now.getTime() - 46 * 1000);
            // @ts-ignore
            expect(ApmFormats.timeAgo(fortySixSecondsAgo)).toBe('1 min ago');
        });
    });
});
