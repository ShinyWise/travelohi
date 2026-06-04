/*
 * Password Validation Rules:
 * - Must be 8-30 characters long
 * - Only allowed characters are printable ASCII (letters, numbers, symbols)
 * - Spaces are NOT allowed
 */
export const PASSWORD_REGEX = /^[\x21-\x7E]{8,30}$/;

export const isValidPassword = (password: string): boolean => {
    return PASSWORD_REGEX.test(password);
};
