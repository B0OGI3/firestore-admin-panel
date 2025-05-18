export type ValidationRule = {
  required?: boolean;
  min?: number | null;
  max?: number | null;
  pattern?: string | null;
  patternError?: string | null;
  email?: boolean;
  url?: boolean;
};

export type FieldDef = {
  name: string;
  type: "text" | "number" | "boolean" | "select" | "date" | "email" | "url";
  options?: string[] | undefined;
  validation?: ValidationRule | undefined;
  description?: string | undefined;
};

export type FirestoreDoc = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type DocumentUpdate = Record<string, string | number | boolean>; 