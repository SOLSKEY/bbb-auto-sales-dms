// server/utils/cstTime.js
// Central Standard Time (America/Chicago) utilities for SMS scheduling

const CST_TIMEZONE = 'America/Chicago';

/**
 * Get current date/time in CST timezone
 * @returns {Date} Current time interpreted in CST
 */
export const getNowCST = () => {
    const now = new Date();
    const cstString = now.toLocaleString('en-US', { timeZone: CST_TIMEZONE });
    return new Date(cstString);
};

/**
 * Get current hour and minute in CST
 * @returns {{hour: number, minute: number}}
 */
export const getCurrentCSTTime = () => {
    const now = getNowCST();
    return {
        hour: now.getHours(),
        minute: now.getMinutes()
    };
};

/**
 * Check if current CST time is within a window of the target time
 * @param {number} targetHour - Target hour (0-23)
 * @param {number} targetMinute - Target minute (0-59)
 * @param {number} windowMinutes - Window size in minutes (default 5)
 * @returns {boolean}
 */
export const isWithinTimeWindow = (targetHour, targetMinute, windowMinutes = 5) => {
    const { hour, minute } = getCurrentCSTTime();
    const currentMinuteOfDay = hour * 60 + minute;
    const targetMinuteOfDay = targetHour * 60 + targetMinute;

    return Math.abs(currentMinuteOfDay - targetMinuteOfDay) <= windowMinutes;
};

/**
 * Get the start and end of a date in CST, returned as UTC timestamps
 * @param {Date} date - Date to get bounds for
 * @returns {{start: Date, end: Date}} Start and end of day in UTC
 */
export const getCSTDateBounds = (date) => {
    // Format the date in CST to get year/month/day
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CST_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;

    // Create start of day (00:00:00) in CST
    const startCSTStr = `${year}-${month}-${day}T00:00:00`;
    const endCSTStr = `${year}-${month}-${day}T23:59:59`;

    // Convert CST times to UTC
    // CST is UTC-6, CDT is UTC-5
    const startCST = new Date(startCSTStr);
    const endCST = new Date(endCSTStr);

    // Get the UTC offset for this date (handles DST)
    const cstOffset = getCSTOffsetHours(startCST);

    // Add the offset to convert CST to UTC
    const startUTC = new Date(startCST.getTime() + (cstOffset * 60 * 60 * 1000));
    const endUTC = new Date(endCST.getTime() + (cstOffset * 60 * 60 * 1000));

    return { start: startUTC, end: endUTC };
};

/**
 * Get CST offset in hours (accounts for DST)
 * CST (Standard) = UTC-6
 * CDT (Daylight) = UTC-5
 * @param {Date} date - Date to check
 * @returns {number} Offset in hours (5 or 6)
 */
export const getCSTOffsetHours = (date) => {
    // Create a date in CST timezone and check the offset
    const jan = new Date(date.getFullYear(), 0, 1);
    const jul = new Date(date.getFullYear(), 6, 1);

    // Get timezone offset for January and July
    const janOffset = new Date(jan.toLocaleString('en-US', { timeZone: CST_TIMEZONE })).getTimezoneOffset();
    const julOffset = new Date(jul.toLocaleString('en-US', { timeZone: CST_TIMEZONE })).getTimezoneOffset();

    // The larger offset is standard time, smaller is daylight time
    const stdOffset = Math.max(janOffset, julOffset);

    // Check if the given date is in DST
    const dateOffset = new Date(date.toLocaleString('en-US', { timeZone: CST_TIMEZONE })).getTimezoneOffset();
    const isDST = dateOffset < stdOffset;

    return isDST ? 5 : 6; // CDT is UTC-5, CST is UTC-6
};

/**
 * Format a UTC date for display in SMS messages (in CST)
 * @param {string|Date} utcDate - UTC date/time
 * @returns {string} Formatted string like "Mon, Dec 23 at 2:00 PM"
 */
export const formatForSMS = (utcDate) => {
    const date = new Date(utcDate);

    const options = {
        timeZone: CST_TIMEZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    return date.toLocaleString('en-US', options);
};

/**
 * Format just the time portion for SMS
 * @param {string|Date} utcDate - UTC date/time
 * @returns {string} Formatted string like "2:00 PM"
 */
export const formatTimeForSMS = (utcDate) => {
    const date = new Date(utcDate);

    const options = {
        timeZone: CST_TIMEZONE,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    return date.toLocaleString('en-US', options);
};

/**
 * Get tomorrow's date (in CST)
 * @returns {Date}
 */
export const getTomorrowCST = () => {
    const tomorrow = getNowCST();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
};

/**
 * Get today's date (in CST)
 * @returns {Date}
 */
export const getTodayCST = () => {
    return getNowCST();
};

/**
 * Check if a given appointment time is approximately 1 hour from now
 * @param {string|Date} appointmentTime - UTC appointment time
 * @param {number} windowMinutes - Acceptable window in minutes (default 5)
 * @returns {boolean}
 */
export const isApproximatelyOneHourAway = (appointmentTime, windowMinutes = 5) => {
    const now = new Date();
    const appointment = new Date(appointmentTime);
    const diffMinutes = (appointment.getTime() - now.getTime()) / (1000 * 60);

    // Check if it's between 55 and 65 minutes away (1 hour +/- window)
    return diffMinutes >= (60 - windowMinutes) && diffMinutes <= (60 + windowMinutes);
};

/**
 * Get the current CST date as a string (YYYY-MM-DD)
 * @returns {string}
 */
export const getCSTDateString = () => {
    const now = getNowCST();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
