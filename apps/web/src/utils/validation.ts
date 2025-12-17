/**
 * Common validation utilities for form validation across the application
 */

/**
 * Validates email format
 * @param email - Email string to validate
 * @returns true if email format is valid
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Validates that a field is not empty
 * @param value - Value to check
 * @param trim - Whether to trim whitespace before checking (default: true)
 * @returns true if value is not empty
 */
export const isRequired = (value: any, trim: boolean = true): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    return trim ? value.trim().length > 0 : value.length > 0;
  }
  return true;
};

/**
 * Validates that a value is a positive integer
 * @param value - Value to validate (string or number)
 * @param min - Minimum value (default: 1)
 * @returns true if value is a positive integer >= min
 */
export const isPositiveInteger = (value: string | number, min: number = 1): boolean => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  return !isNaN(num) && num >= min && Number.isInteger(num);
};

/**
 * Validates that a value is a positive number (including decimals)
 * @param value - Value to validate (string or number)
 * @param min - Minimum value (default: 0)
 * @returns true if value is a positive number >= min
 */
export const isPositiveNumber = (value: string | number, min: number = 0): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num >= min;
};

/**
 * Validation result interface
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation rules interface
 */
export interface ValidationRule {
  field: string;
  validator: (value: any, formData?: any) => boolean | string;
  message?: string;
}

/**
 * Validates form data against a set of rules
 * @param formData - Form data object
 * @param rules - Array of validation rules
 * @returns Object with field names as keys and error messages as values
 */
export const validateForm = (
  formData: Record<string, any>,
  rules: ValidationRule[]
): Record<string, string> => {
  const errors: Record<string, string> = {};

  rules.forEach((rule) => {
    const value = formData[rule.field];
    const result = rule.validator(value, formData);

    if (result === false) {
      errors[rule.field] = rule.message || `${rule.field} is invalid`;
    } else if (typeof result === 'string') {
      errors[rule.field] = result;
    }
  });

  return errors;
};

/**
 * Common validation rule creators
 */
export const validationRules = {
  /**
   * Creates a required field validation rule
   */
  required: (field: string, message?: string): ValidationRule => ({
    field,
    validator: (value) => isRequired(value),
    message: message || `${field} is required`
  }),

  /**
   * Creates an email validation rule
   */
  email: (field: string, required: boolean = true, message?: string): ValidationRule => ({
    field,
    validator: (value) => {
      if (!required && (!value || !value.trim())) return true;
      if (!isRequired(value)) return message || 'Email is required';
      if (!isValidEmail(value)) return message || 'Please enter a valid email address';
      return true;
    }
  }),

  /**
   * Creates a positive integer validation rule
   */
  positiveInteger: (
    field: string,
    required: boolean = true,
    min: number = 1,
    message?: string
  ): ValidationRule => ({
    field,
    validator: (value) => {
      if (!required && (!value || value === '')) return true;
      if (!isRequired(value)) return message || `${field} is required`;
      if (!isPositiveInteger(value, min)) {
        return message || `${field} must be a positive number${min > 1 ? ` >= ${min}` : ''}`;
      }
      return true;
    }
  }),

  /**
   * Creates a password validation rule (for create mode)
   */
  password: (
    field: string,
    isCreateMode: boolean,
    message?: string
  ): ValidationRule => ({
    field,
    validator: (value) => {
      if (!isCreateMode) return true; // Password optional in edit mode
      if (!isRequired(value)) return message || 'Password is required';
      return true;
    }
  })
};

/**
 * Helper function to clear a specific field error from errors object
 * @param errors - Current errors object
 * @param field - Field name to clear
 * @returns New errors object with the field cleared
 */
export const clearFieldError = (
  errors: Record<string, string>,
  field: string
): Record<string, string> => {
  if (!errors[field]) return errors;
  const newErrors = { ...errors };
  delete newErrors[field];
  return newErrors;
};

/**
 * Helper function to clear multiple field errors
 * @param errors - Current errors object
 * @param fields - Array of field names to clear
 * @returns New errors object with the fields cleared
 */
export const clearFieldErrors = (
  errors: Record<string, string>,
  fields: string[]
): Record<string, string> => {
  const newErrors = { ...errors };
  fields.forEach((field) => {
    delete newErrors[field];
  });
  return newErrors;
};

