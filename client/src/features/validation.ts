import type { RequestInput } from '../types';

export function validateCredentials(email: string, password: string, confirmation?: string) {
    const errors: Record<string, string> = {};
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email address.';
    if (!password.trim() || new TextEncoder().encode(password).length > 72 || password.includes('\0')) {
        errors.password = 'Enter a password of at most 72 UTF-8 bytes.';
    } else if (confirmation !== undefined && password.length < 8) {
        errors.password = 'Use at least 8 characters.';
    }
    if (confirmation !== undefined && confirmation !== password) errors.confirmation = 'Passwords must match.';
    return errors;
}

export function validateRequest(input: RequestInput) {
    const errors: Partial<Record<keyof RequestInput, string>> = {};
    for (const [key, limit] of [['title', 255], ['description', 10000], ['category', 50]] as const) {
        if (!input[key].trim() || input[key].includes('\0') || input[key].length > limit) {
            errors[key] = `Enter a ${key} up to ${limit.toLocaleString()} characters.`;
        }
    }
    return errors;
}
