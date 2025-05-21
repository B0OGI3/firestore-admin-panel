import type { FieldDef } from "@/types";

export type ValidationError = {
  field: string;
  message: string;
};

export type ValidationResult = {
  isValid: boolean;
  errors: ValidationError[];
};

type ValidationValue = string | number | boolean | null | undefined;

/**
 * Validates a single field based on its validation rules
 */
export function validateField(
  fieldName: string,
  value: ValidationValue,
  validation?: FieldDef['validation']
): ValidationError | null {
  if (!validation) return null;

  // Required check
  if (validation.required && (value === null || value === undefined || value === "")) {
    return {
      field: fieldName,
      message: `${fieldName} is required`
    };
  }

  // Skip further validation if value is empty and not required
  if (value === null || value === undefined || value === "") {
    return null;
  }

  // Type-specific validations
  if (typeof value === 'number') {
    // Min value check
    if (validation.min !== null && validation.min !== undefined && value < validation.min) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${validation.min}`
      };
    }

    // Max value check
    if (validation.max !== null && validation.max !== undefined && value > validation.max) {
      return {
        field: fieldName,
        message: `${fieldName} must be at most ${validation.max}`
      };
    }
  }

  // Pattern check for strings
  if (typeof value === 'string' && validation.pattern) {
    try {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return {
          field: fieldName,
          message: validation.patternError || `${fieldName} has an invalid format`
        };
      }
    } catch (err) {
      console.error(`Invalid regex pattern for field ${fieldName}:`, err);
      return {
        field: fieldName,
        message: "Invalid validation pattern"
      };
    }
  }

  // Email validation
  if (validation.email && typeof value === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return {
        field: fieldName,
        message: "Please enter a valid email address"
      };
    }
  }

  // URL validation
  if (validation.url && typeof value === 'string') {
    try {
      new URL(value);
    } catch {
      return {
        field: fieldName,
        message: "Please enter a valid URL"
      };
    }
  }

  // String length validation
  if (typeof value === 'string') {
    if (validation.min !== null && validation.min !== undefined && value.length < validation.min) {
      return {
        field: fieldName,
        message: `${fieldName} must be at least ${validation.min} characters`
      };
    }
    if (validation.max !== null && validation.max !== undefined && value.length > validation.max) {
      return {
        field: fieldName,
        message: `${fieldName} must be at most ${validation.max} characters`
      };
    }
  }

  return null;
}

/**
 * Validates a document against its field definitions
 */
export function validateDocument(
  doc: Record<string, ValidationValue>,
  fields: FieldDef[]
): ValidationResult {
  const errors: ValidationError[] = [];

  fields.forEach((field) => {
    const error = validateField(field.name, doc[field.name], field.validation);
    if (error) {
      errors.push(error);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Formats validation errors into a user-friendly string
 */
export function formatValidationErrors(errors: ValidationError[]): string {
  return errors.map(err => `${err.field}: ${err.message}`).join('\n');
} 