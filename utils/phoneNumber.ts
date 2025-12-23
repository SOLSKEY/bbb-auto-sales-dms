/**
 * Phone number formatting utilities
 * All phone numbers are stored in format: +1-XXX-XXX-XXXX
 */

/**
 * Extracts only digits from a phone number string
 */
export const extractDigits = (phone: string): string => {
    return phone.replace(/\D/g, '');
};

/**
 * Formats a phone number to +1-XXX-XXX-XXXX format
 * Accepts any format with 10 digits and formats consistently
 * @param phone - Phone number in any format (e.g., "1111111111", "111-111-1111", "(111) 111-1111")
 * @returns Formatted phone number as "+1-XXX-XXX-XXXX" or empty string if invalid
 */
export const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // Extract only digits
    const digits = extractDigits(phone);
    
    // Must have exactly 10 digits
    if (digits.length !== 10) {
        return phone; // Return as-is if not 10 digits (user might still be typing)
    }
    
    // Format as +1-XXX-XXX-XXXX
    const areaCode = digits.slice(0, 3);
    const firstPart = digits.slice(3, 6);
    const secondPart = digits.slice(6, 10);
    
    return `+1-${areaCode}-${firstPart}-${secondPart}`;
};

/**
 * Validates if a phone number has exactly 10 digits
 */
export const isValidPhoneNumber = (phone: string): boolean => {
    const digits = extractDigits(phone);
    return digits.length === 10;
};

/**
 * Normalizes a phone number for storage (removes +1 if present, extracts digits)
 * This is used to check if two phone numbers are the same
 */
export const normalizePhoneNumber = (phone: string): string => {
    // Remove +1 prefix if present, then extract digits
    const withoutCountryCode = phone.replace(/^\+1[- ]?/, '');
    return extractDigits(withoutCountryCode);
};

