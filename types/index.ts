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
  order?: number;
};

export type FirestoreDoc = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
};

export type DocumentUpdate = Record<string, string | number | boolean>;

export type ChangelogEntry = {
  id: string;
  timestamp: number;
  userId: string;
  userEmail: string;
  action: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  changes: {
    before?: Record<string, any>;
    after?: Record<string, any>;
  };
  metadata?: Record<string, any>;
}; 