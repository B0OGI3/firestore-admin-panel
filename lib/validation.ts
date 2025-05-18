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
      message: "This field is required"
    };
  }

  // Type-specific validations
  if (typeof value === 'number') {
    // Min value check
    if (validation.min !== null && validation.min !== undefined && value < validation.min) {
      return {
        field: fieldName,
        message: `Value must be at least ${validation.min}`
      };
    }

    // Max value check
    if (validation.max !== null && validation.max !== undefined && value > validation.max) {
      return {
        field: fieldName,
        message: `Value must be at most ${validation.max}`
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
          message: validation.patternError || `Invalid format`
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
        message: "Invalid email address"
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
        message: "Invalid URL"
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