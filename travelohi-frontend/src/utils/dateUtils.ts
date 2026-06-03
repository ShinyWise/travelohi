import type { Language } from './translations';

/**
 * Option A: Clean & Modern Format
 * Example: Sunday, 19 Jul 2026
 */
export const formatLongDate = (dateStr: string, lang: Language = 'ID'): string => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat(lang === 'ID' ? 'id-ID' : 'en-US', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        }).format(date);
    } catch (e) {
        return dateStr;
    }
};

/**
 * Formats time from ISO string or YYYY-MM-DD HH:mm
 * Example: 13:16
 */
export const formatTimeOnly = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
        // Fallback for non-standard formats if any
        const match = dateStr.match(/\d{2}:\d{2}/);
        return match ? match[0] : dateStr;
    }
};

/**
 * Combines for Flight Option A
 * Sunday, 19 Jul 2026
 * 13:16 -> 15:28
 */
export const formatFlightTimeline = (departureStr: string, arrivalStr: string, lang: Language = 'ID') => {
    const depDate = formatLongDate(departureStr, lang);
    const depTime = formatTimeOnly(departureStr);
    const arrTime = formatTimeOnly(arrivalStr);

    return {
        dateLabel: depDate,
        timeRange: `${depTime} → ${arrTime}`
    };
};
