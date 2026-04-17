/** Returns true if the string is a valid email address. */
export const isValidEmail = (v: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

/** Returns true if the string is a 10-digit mobile number. */
export const isValidMobile = (v: string): boolean =>
  /^[0-9]{10}$/.test(v.trim());

/**
 * Returns true if password meets requirements:
 * min 8 chars, at least 1 uppercase letter, at least 1 number.
 */
export const isValidPassword = (v: string): boolean =>
  v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v);

/** Strip all non-digit characters (for mobile inputs). */
export const digitsOnly = (v: string): string => v.replace(/[^0-9]/g, "");
