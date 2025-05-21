"use client";

/**
 * CollectionViewer Component
 * 
 * A dynamic collection viewer and editor for Firestore collections.
 * This component automatically generates a UI based on the collection's field definitions
 * and handles CRUD operations with proper permission checks.
 * 
 * Features:
 * - Dynamic field rendering based on field type
 * - Inline document editing
 * - Real-time search filtering
 * - Role-based access control
 * - Responsive table layout
 */

import {
  ActionIcon,
  Button,
  Card,
  Container,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Center,
  NumberInput,
  Checkbox,
  Pagination,
  Collapse,
  Select,
  SimpleGrid,
  Box,
  Loader,
} from "@mantine/core";
import { Dropzone } from '@mantine/dropzone';
import { 
  IconEdit, 
  IconTrash, 
  IconPlus, 
  IconDownload, 
  IconUpload, 
  IconFilter, 
  IconX,
  IconArrowUp,
  IconArrowDown,
  IconArrowsSort,
} from "@tabler/icons-react";

import {
  useEffect,
  useState,
  type CSSProperties,
  useCallback,
  useMemo,
} from "react";

import {
  useParams,
  useRouter
} from "next/navigation";

import {
  getDocs,
  getDoc,
  collection,
  doc,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebaseConfig";
import { showNotification } from "@mantine/notifications";
import { onAuthStateChanged } from "firebase/auth";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";
import { validateDocument, validateField } from "@/lib/validation";
import type { FieldDef, FirestoreDoc, DocumentUpdate } from "@/types";
import { useDebouncedValue } from '@mantine/hooks';
import { ChangelogService } from "@/lib/services/changelog";

const centerCellStyle: CSSProperties = {
  textAlign: "center",
  minWidth: 120,
  maxWidth: 200,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  padding: "0.5rem",
  fontSize: "0.875rem"
};

/**
 * Utility function to format display values
 * @param val - The value to format
 * @returns Formatted string representation of the value
 */
const displayValue = (val: string | number | boolean | null | undefined): string => {
  if (val === null || val === undefined) return "–";
  if (typeof val === "string") return val.trim() || "–";
  return String(val);
};

type SortDirection = 'asc' | 'desc' | null;

type FilterValue = string | number | boolean;

export default function CollectionViewer() {
  const router = useRouter();
  const params = useParams();
  const collectionName = params.collection as string;

  const [docs, setDocs] = useState<FirestoreDoc[]>([]);
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [search, setSearch] = useState("");
  const [editingDoc, setEditingDoc] = useState<FirestoreDoc | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [newDocFields, setNewDocFields] = useState<Record<string, string>>({});
  const [modalOpened, setModalOpened] = useState(false);
  const [addModalOpened, setAddModalOpened] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [newFieldErrors, setNewFieldErrors] = useState<Record<string, string>>({});
  const { permissions, loading: permissionsLoading } = useRolePermissions();
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [bulkEditModalOpened, setBulkEditModalOpened] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>("");
  const [bulkEditValue, setBulkEditValue] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<Record<string, FilterValue>>({});
  const [numberOperators, setNumberOperators] = useState<Record<string, string>>({});
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [debouncedFilters] = useDebouncedValue(advancedFilters, 300);
  const [cachedDocs, setCachedDocs] = useState<FirestoreDoc[]>([]);
  const [cachedFilteredDocs, setCachedFilteredDocs] = useState<FirestoreDoc[]>([]);
  const [loading, setLoading] = useState(false);

  const validateAndUpdateField = (
    fieldDef: FieldDef,
    value: string,
    isNewDoc: boolean
  ) => {
    const error = validateField(
      fieldDef.name,
      fieldDef.type === "number" ? parseFloat(value) || 0 : value,
      fieldDef.validation
    );
    
    if (isNewDoc) {
      setNewFieldErrors(prev => ({
        ...prev,
        [fieldDef.name]: error?.message || ""
      }));
    } else {
      setEditFieldErrors(prev => ({
        ...prev,
        [fieldDef.name]: error?.message || ""
      }));
    }
    
    return !error;
  };

  const renderFieldInput = (
    f: FieldDef,
    value: string,
    onChange: (val: string) => void,
    autoFocus = false,
    isNewDoc = false
  ) => {
    const error = isNewDoc ? newFieldErrors[f.name] : editFieldErrors[f.name];
    const commonProps = {
      label: f.name,
      error: error,
      description: f.description,
      autoFocus: autoFocus,
      required: f.validation?.required ?? false,
      withAsterisk: f.validation?.required ?? false,
      onChange: (val: string | null | React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const stringVal = typeof val === 'string' ? val : 
                         val === null ? '' :
                         val.currentTarget?.value || '';
        onChange(stringVal);
        validateAndUpdateField(f, stringVal, isNewDoc);
      }
    };

    switch (f.type) {
      case "number": {
        const numberProps: {
          value: number;
          onChange: (val: number | string) => void;
          allowNegative: boolean;
          allowDecimal: boolean;
          label: string;
          error: string | undefined;
          description: string | undefined;
          autoFocus: boolean;
          required: boolean;
          withAsterisk: boolean;
          min?: number;
          max?: number;
        } = {
          ...commonProps,
          value: value ? Number(value) : 0,
          onChange: (val: number | string) => {
            const stringVal = String(val ?? '');
            onChange(stringVal);
            validateAndUpdateField(f, stringVal, isNewDoc);
          },
          allowNegative: true,
          allowDecimal: true
        };

        // Only add min/max if they are valid numbers
        if (typeof f.validation?.min === 'number') {
          numberProps.min = f.validation.min;
        }
        if (typeof f.validation?.max === 'number') {
          numberProps.max = f.validation.max;
        }

        return <NumberInput key={f.name} {...numberProps} />;
      }

      case "boolean":
        return (
          <Select
            key={f.name}
            {...commonProps}
            value={value || ""}
            data={[
              { value: "true", label: "True" },
              { value: "false", label: "False" }
            ]}
            clearable={!f.validation?.required}
          />
        );

      case "select": {
        const options = Array.isArray(f.options) ? f.options : [];
        return (
          <Select
            key={f.name}
            {...commonProps}
            value={value || ""}
            data={options.map(opt => ({ value: opt, label: opt }))}
            clearable={!f.validation?.required}
          />
        );
      }

      case "date":
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            type="date"
          />
        );

      case "email":
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            type="email"
          />
        );

      case "url":
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            type="url"
          />
        );

      default:
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            minLength={f.validation?.min ?? undefined}
            maxLength={f.validation?.max ?? undefined}
          />
        );
    }
  };

  const renderAdvancedFilter = (field: FieldDef) => {
    const value = advancedFilters[field.name] ?? '';
    
    switch (field.type) {
      case 'number':
        return (
          <Box>
            <Group align="flex-end" gap="xs">
              <Select
                label={field.name}
                value={numberOperators[field.name] || '='}
                onChange={(val: string | null) => {
                  if (val) {
                    setNumberOperators(prev => ({ ...prev, [field.name]: val }));
                  }
                }}
                data={[
                  { value: '=', label: 'Equals' },
                  { value: '>', label: 'Greater than' },
                  { value: '<', label: 'Less than' },
                  { value: '>=', label: 'Greater than or equal' },
                  { value: '<=', label: 'Less than or equal' },
                ]}
                size="sm"
                style={{ width: '40%' }}
              />
              <NumberInput
                value={typeof value === 'number' ? value : ''}
                onChange={(val: string | number) => {
                  const numVal = typeof val === 'string' ? parseFloat(val) || 0 : val;
                  setAdvancedFilters(prev => ({ ...prev, [field.name]: numVal }));
                }}
                placeholder={`Filter ${field.name}`}
                size="sm"
                style={{ flex: 1 }}
                rightSection={
                  value !== '' && (
                    <ActionIcon
                      size="sm"
                      variant="transparent"
                      onClick={() => {
                        setAdvancedFilters(prev => ({ ...prev, [field.name]: '' }));
                        setNumberOperators(prev => ({ ...prev, [field.name]: '=' }));
                      }}
                    >
                      <IconX size={14} />
                    </ActionIcon>
                  )
                }
              />
            </Group>
          </Box>
        );

      case 'boolean':
        return (
          <Select
            label={field.name}
            value={typeof value === 'boolean' ? String(value) : ''}
            onChange={(val: string | null) => {
              if (val !== null) {
                const boolVal = val === 'true';
                setAdvancedFilters(prev => ({ ...prev, [field.name]: boolVal }));
              }
            }}
            placeholder={`Filter ${field.name}`}
            size="sm"
            data={[
              { value: 'true', label: 'True' },
              { value: 'false', label: 'False' }
            ]}
            clearable
            rightSection={
              value !== '' && (
                <ActionIcon
                  size="sm"
                  variant="transparent"
                  onClick={() => {
                    setAdvancedFilters(prev => ({ ...prev, [field.name]: '' }));
                  }}
                >
                  <IconX size={14} />
                </ActionIcon>
              )
            }
          />
        );

      case 'select':
        return (
          <Select
            label={field.name}
            value={typeof value === 'string' ? value : ''}
            onChange={(val: string | null) => {
              if (val !== null) {
                setAdvancedFilters(prev => ({ ...prev, [field.name]: val }));
              }
            }}
            placeholder={`Filter ${field.name}`}
            size="sm"
            data={field.options?.map(opt => ({ value: opt, label: opt })) ?? []}
            clearable
            rightSection={
              value !== '' && (
                <ActionIcon
                  size="sm"
                  variant="transparent"
                  onClick={() => {
                    setAdvancedFilters(prev => ({ ...prev, [field.name]: '' }));
                  }}
                >
                  <IconX size={14} />
                </ActionIcon>
              )
            }
          />
        );

      default:
        return (
          <TextInput
            label={field.name}
            value={typeof value === 'string' ? value : ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setAdvancedFilters(prev => ({ ...prev, [field.name]: e.currentTarget.value }));
            }}
            placeholder={`Filter ${field.name}`}
            size="sm"
            rightSection={
              value !== '' && (
                <ActionIcon
                  size="sm"
                  variant="transparent"
                  onClick={() => {
                    setAdvancedFilters(prev => ({ ...prev, [field.name]: '' }));
                  }}
                >
                  <IconX size={14} />
                </ActionIcon>
              )
            }
          />
        );
    }
  };

  const handleSort = (fieldName: string) => {
    if (sortField === fieldName) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(fieldName);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (fieldName: string) => {
    if (sortField !== fieldName) {
      return <IconArrowsSort size={14} />;
    }
    return sortDirection === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    const fetchFields = async () => {
      if (collectionName === "users") {
        setFields([
          { name: "name", type: "text", order: 0 },
          { name: "email", type: "text", order: 1 },
          { name: "role", type: "select", options: ["admin", "editor", "viewer"], order: 2 },
        ]);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "config/collections/items", collectionName));
        if (snap.exists()) {
          const data = snap.data();
          const declaredFields = Array.isArray(data.fields)
            ? (data.fields as FieldDef[])
            : [];
          setFields(declaredFields.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
        }
      } catch {
        showNotification({ title: "Error", message: "Could not load fields", color: "red" });
      }
    };

    fetchFields();
  }, [collectionName]);

  // Memoize the filtered and sorted documents
  const processedDocs = useMemo(() => {
    if (!cachedFilteredDocs.length) return [];

    if (!sortField || !sortDirection) return cachedFilteredDocs;

    return [...cachedFilteredDocs].sort((a, b) => {
      const field = fields.find(f => f.name === sortField);
      if (!field) return 0;

      const aValue = (a as Record<string, unknown>)[sortField];
      const bValue = (b as Record<string, unknown>)[sortField];

      // Handle null/undefined values
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      let comparison = 0;
      switch (field.type) {
        case 'number':
          comparison = Number(aValue) - Number(bValue);
          break;
        case 'boolean':
          comparison = String(aValue).localeCompare(String(bValue));
          break;
        default:
          comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [cachedFilteredDocs, sortField, sortDirection, fields]);

  // Memoize the current page's documents
  const currentPageDocs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return processedDocs.slice(startIndex, endIndex);
  }, [processedDocs, currentPage]);

  // Fetch all documents with caching
  const fetchAllDocs = useCallback(async () => {
    if (!collectionName) return;
    try {
      setLoading(true);
      const allDocsSnap = await getDocs(collection(db, collectionName));
      const allDocs = allDocsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCachedDocs(allDocs);
    } catch (error) {
      showNotification({ 
        title: "Error", 
        message: "Failed to fetch documents", 
        color: "red" 
      });
    } finally {
      setLoading(false);
    }
  }, [collectionName]);

  // Process filters and search
  const processFilters = useCallback(() => {
    if (!cachedDocs.length) return;

    const filtered = cachedDocs.filter((doc) => {
      // Apply text search if exists
      if (debouncedSearch && !Object.entries(doc)
        .filter(([key]) => key !== "id")
        .some(([_, value]) =>
          String(value)
            .toLowerCase()
            .includes(debouncedSearch.toLowerCase())
        )) {
        return false;
      }

      // Apply advanced filters
      for (const [fieldName, filterValue] of Object.entries(debouncedFilters)) {
        if (filterValue === '') continue;
        
        const field = fields.find(f => f.name === fieldName);
        if (!field) continue;

        const docValue = (doc as Record<string, unknown>)[fieldName];
        
        switch (field.type) {
          case 'number': {
            const operator = numberOperators[fieldName] || '=';
            const numValue = Number(filterValue);
            const numDocValue = Number(docValue);
            
            switch (operator) {
              case '=':
                if (numDocValue !== numValue) return false;
                break;
              case '>':
                if (numDocValue <= numValue) return false;
                break;
              case '<':
                if (numDocValue >= numValue) return false;
                break;
              case '>=':
                if (numDocValue < numValue) return false;
                break;
              case '<=':
                if (numDocValue > numValue) return false;
                break;
            }
            break;
          }
          case 'boolean':
            if (String(docValue) !== filterValue) return false;
            break;
          case 'select':
            if (docValue !== filterValue) return false;
            break;
          default:
            if (!String(docValue).toLowerCase().includes(String(filterValue).toLowerCase())) return false;
        }
      }

      return true;
    });

    setCachedFilteredDocs(filtered);
  }, [cachedDocs, debouncedSearch, debouncedFilters, fields, numberOperators]);

  // Initial data fetch
  useEffect(() => {
    void fetchAllDocs();
  }, [fetchAllDocs]);

  // Process filters when dependencies change
  useEffect(() => {
    processFilters();
  }, [processFilters]);

  // Update displayed documents
  useEffect(() => {
    setDocs(currentPageDocs);
  }, [currentPageDocs]);

  useEffect(() => {
    if (addModalOpened) {
      const initial: Record<string, string> = {};
      fields.forEach((f) => {
        initial[f.name] = f.type === "boolean" ? "false" : "";
      });
      setNewDocFields(initial);
    }
  }, [addModalOpened, fields]);

  const handleEdit = (doc: FirestoreDoc) => {
    if (!permissions?.canEdit) return;
    setEditingDoc(doc);
    const safeFields: Record<string, string> = {};
    fields.forEach((f) => {
      const val = doc[f.name];
      safeFields[f.name] = val !== null && val !== undefined ? String(val) : (f.type === "boolean" ? "false" : "");
    });
    setEditFields(safeFields);
    setModalOpened(true);
  };

  const saveEdit = async () => {
    if (!editingDoc) return;
    try {
      const updated: DocumentUpdate = {};
      let hasErrors = false;

      // Validate all fields before saving
      fields.forEach((f) => {
        const val = editFields[f.name] ?? "";
        const isValid = validateAndUpdateField(f, val, false);
        if (!isValid) hasErrors = true;
        
        updated[f.name] =
          f.type === "number"
            ? parseFloat(val) || 0
            : f.type === "boolean"
            ? val === "true"
            : val;
      });

      if (hasErrors) {
        showNotification({
          title: "Validation Error",
          message: "Please fix the errors before saving",
          color: "red",
          autoClose: 5000,
        });
        return;
      }

      // Create a new batch
      const batch = writeBatch(db);
      
      // Add the update operation to the batch
      const docRef = doc(db, collectionName, editingDoc.id);
      batch.update(docRef, updated);

      // Commit the batch
      await batch.commit();

      // Record the change in changelog
      const user = auth.currentUser;
      if (user) {
        await ChangelogService.addEntry({
          userId: user.uid,
          userEmail: user.email || "unknown@example.com",
          action: "update",
          collection: collectionName,
          documentId: editingDoc.id,
          changes: {
            before: editingDoc,
            after: updated
          }
        });
      }

      // Refresh the documents list
      const snap = await getDocs(collection(db, collectionName));
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setModalOpened(false);
      setEditFieldErrors({});
      showNotification({ 
        title: "Success", 
        message: "Document updated successfully", 
        color: "green",
        autoClose: 3000 
      });
    } catch (error) {
      console.error("Failed to update document:", error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update document. Please try again.",
        color: "red"
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!permissions?.canDelete) return;
    if (!confirm("Delete this document?")) return;
    try {
      // Get the document data before deleting
      const docToDelete = docs.find(d => d.id === id);
      if (!docToDelete) return;

      // Create a new batch
      const batch = writeBatch(db);
      
      // Add the delete operation to the batch
      const docRef = doc(db, collectionName, id);
      batch.delete(docRef);

      // Commit the batch
      await batch.commit();

      // Record the deletion in changelog
      const user = auth.currentUser;
      if (user) {
        await ChangelogService.addEntry({
          userId: user.uid,
          userEmail: user.email || "unknown@example.com",
          action: "delete",
          collection: collectionName,
          documentId: id,
          changes: {
            before: { ...docToDelete, id: id },
            after: { id: id } // Keep the ID in the after state
          }
        });
      }

      // Update local state
      setDocs((prev) => prev.filter((d) => d.id !== id));
      showNotification({ title: "Deleted", message: "Document removed", color: "red" });
    } catch {
      showNotification({ title: "Error", message: "Failed to delete", color: "red" });
    }
  };

  const addDocument = async () => {
    try {
      const parsed: DocumentUpdate = {};
      let hasErrors = false;

      // Validate all fields before adding
      fields.forEach((f) => {
        const val = newDocFields[f.name] ?? "";
        const isValid = validateAndUpdateField(f, val, true);
        if (!isValid) hasErrors = true;
        
        parsed[f.name] =
          f.type === "number"
            ? parseFloat(val) || 0
            : f.type === "boolean"
            ? val === "true"
            : val;
      });

      if (hasErrors) {
        showNotification({
          title: "Validation Error",
          message: "Please fix the errors before adding the document",
          color: "red",
          autoClose: 5000,
        });
        return;
      }

      // Create a new batch
      const batch = writeBatch(db);
      
      // Create a new document reference
      const newDocRef = doc(collection(db, collectionName));
      
      // Add the set operation to the batch
      batch.set(newDocRef, parsed);

      // Commit the batch
      await batch.commit();

      // Record the creation in changelog
      const user = auth.currentUser;
      if (user) {
        await ChangelogService.addEntry({
          userId: user.uid,
          userEmail: user.email || "unknown@example.com",
          action: "create",
          collection: collectionName,
          documentId: newDocRef.id,
          changes: {
            before: {}, // Empty object for new document
            after: parsed
          }
        });
      }

      // Refresh the documents list
      const snap = await getDocs(collection(db, collectionName));
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAddModalOpened(false);
      setNewFieldErrors({});
      showNotification({ 
        title: "Success", 
        message: "Document added successfully", 
        color: "green",
        autoClose: 3000 
      });
    } catch (error) {
      console.error("Failed to add document:", error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to add document. Please try again.",
        color: "red"
      });
    }
  };

  const downloadCSV = () => {
    if (docs.length === 0) {
      showNotification({
        title: "Error",
        message: "No data to export",
        color: "red",
      });
      return;
    }

    // Create CSV header
    const headers = ['id', ...fields.map(f => f.name)];
    const csvContent = [
      headers.join(','),
      ...docs.map(doc => {
        const row = [
          doc.id,
          ...fields.map(f => {
            const value = doc[f.name];
            // Handle special characters and quotes in CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          })
        ];
        return row.join(',');
      })
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${collectionName}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCSVUpload = async () => {
    if (!uploadFile) return;

    try {
      setUploading(true);
      const text = await uploadFile.text();
      const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim().replace(/^"|"$/g, '')));
      
      if (rows.length === 0) {
        throw new Error('CSV file is empty');
      }

      const headers = rows[0];
      if (!headers) {
        throw new Error('CSV file is missing headers');
      }
      
      // Validate headers
      const expectedHeaders = ['id', ...fields.map(f => f.name)];
      if (!expectedHeaders.every((h, i) => headers[i] === h)) {
        throw new Error('CSV headers do not match collection fields');
      }

      // Create batch
      const batch = writeBatch(db);
      let successCount = 0;
      let errorCount = 0;

      // Process each row
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length !== headers.length) continue;

        try {
          const docData: DocumentUpdate = {};
          fields.forEach((f, index) => {
            const value = row[index + 1] || ''; // +1 because first column is ID
            docData[f.name] = f.type === 'number' ? parseFloat(value) || 0 :
                             f.type === 'boolean' ? value === 'true' :
                             value;
          });

          // Validate data
          const validation = validateDocument(docData, fields);
          if (!validation.isValid) {
            errorCount++;
            continue;
          }

          const docId = row[0];
          if (!docId) {
            errorCount++;
            continue;
          }

          const docRef = doc(db, collectionName, docId);
          batch.set(docRef, docData);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      // Commit batch
      await batch.commit();

      // Refresh data
      const snap = await getDocs(collection(db, collectionName));
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

      showNotification({
        title: "Upload Complete",
        message: `Successfully imported ${successCount} documents${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        color: successCount > 0 ? "green" : "red",
      });

      setUploadModalOpened(false);
      setUploadFile(null);
    } catch (error) {
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to upload CSV",
        color: "red",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleBulkEdit = async () => {
    if (!permissions?.canEdit) return;
    if (selectedDocs.size === 0) return;
    if (!bulkEditField || bulkEditValue === undefined) return;

    try {
      const batch = writeBatch(db);
      const field = fields.find(f => f.name === bulkEditField);
      if (!field) return;

      const parsedValue = field.type === "number" ? parseFloat(bulkEditValue) || 0 :
                         field.type === "boolean" ? bulkEditValue === "true" :
                         bulkEditValue;

      selectedDocs.forEach(id => {
        const docRef = doc(db, collectionName, id);
        batch.update(docRef, { [bulkEditField]: parsedValue });
      });

      await batch.commit();

      // Record the changes in changelog
      const user = auth.currentUser;
      if (user) {
        const changelogPromises = Array.from(selectedDocs).map(async (docId) => {
          const doc = docs.find(d => d.id === docId);
          if (doc) {
            await ChangelogService.addEntry({
              userId: user.uid,
              userEmail: user.email || "unknown@example.com",
              action: "update",
              collection: collectionName,
              documentId: docId,
              changes: {
                before: { [bulkEditField]: doc[bulkEditField] },
                after: { [bulkEditField]: parsedValue }
              }
            });
          }
        });
        await Promise.all(changelogPromises);
      }

      setDocs(prev => prev.map(d => 
        selectedDocs.has(d.id) ? { ...d, [bulkEditField]: parsedValue } : d
      ));
      setSelectedDocs(new Set());
      setBulkEditModalOpened(false);
      showNotification({
        title: "Success",
        message: `Updated ${selectedDocs.size} documents`,
        color: "green",
      });
    } catch {
      showNotification({
        title: "Error",
        message: "Failed to update documents",
        color: "red",
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === docs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(docs.map(d => d.id)));
    }
  };

  const toggleSelectDoc = (id: string) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDocs(newSelected);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!permissionsLoading && !permissions?.canView) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Title order={2}>Access Denied</Title>
          <Text>You do not have permission to view this collection.</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Container size="xl" px="xs">
      <Stack gap="md">
        <Group justify="space-between" align="center" wrap="nowrap">
          <Title order={2}>{collectionName}</Title>
          <Group gap="xs" wrap="nowrap">
            {permissions?.canEdit && (
              <Button
                leftSection={<IconPlus size="1rem" />}
                onClick={() => setAddModalOpened(true)}
                size="sm"
              >
                Add
              </Button>
            )}
            {permissions?.canEdit && (
              <Button
                leftSection={<IconUpload size="1rem" />}
                onClick={() => setUploadModalOpened(true)}
                size="sm"
              >
                Import
              </Button>
            )}
            <Button
              leftSection={<IconDownload size="1rem" />}
              onClick={downloadCSV}
              size="sm"
            >
              Export
            </Button>
          </Group>
        </Group>

        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between" wrap="nowrap">
              <TextInput
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                style={{ flex: 1 }}
                size="sm"
              />
              <Button
                variant="light"
                leftSection={<IconFilter size="1rem" />}
                onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                size="sm"
              >
                Filters
              </Button>
            </Group>

            <Collapse in={showAdvancedSearch}>
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {fields.map((field) => renderAdvancedFilter(field))}
              </SimpleGrid>
            </Collapse>

            <Box style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              {loading ? (
                <Center py="xl">
                  <Loader size="sm" />
                </Center>
              ) : (
                <Table striped highlightOnHover>
                  <thead>
                    <tr>
                      {permissions?.canDelete && (
                        <th style={{ width: 40, padding: '0.5rem' }}>
                          <Checkbox
                            checked={selectedDocs.size === docs.length}
                            onChange={toggleSelectAll}
                            size="sm"
                          />
                        </th>
                      )}
                      {fields.map((field) => (
                        <th
                          key={field.name}
                          style={{
                            ...centerCellStyle,
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                          onClick={() => handleSort(field.name)}
                        >
                          <Group gap={4} justify="center" wrap="nowrap">
                            {field.name}
                            {getSortIcon(field.name)}
                          </Group>
                        </th>
                      ))}
                      <th style={{ width: 100, padding: '0.5rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc) => (
                      <tr key={doc.id}>
                        {permissions?.canDelete && (
                          <td style={{ padding: '0.5rem' }}>
                            <Checkbox
                              checked={selectedDocs.has(doc.id)}
                              onChange={() => toggleSelectDoc(doc.id)}
                              size="sm"
                            />
                          </td>
                        )}
                        {fields.map((field) => (
                          <td key={field.name} style={centerCellStyle}>
                            {displayValue(doc[field.name])}
                          </td>
                        ))}
                        <td style={{ padding: '0.5rem' }}>
                          <Group gap={4} justify="center" wrap="nowrap">
                            {permissions?.canEdit && (
                              <ActionIcon
                                color="blue"
                                onClick={() => handleEdit(doc)}
                                size="sm"
                              >
                                <IconEdit size="1rem" />
                              </ActionIcon>
                            )}
                            {permissions?.canDelete && (
                              <ActionIcon
                                color="red"
                                onClick={() => handleDelete(doc.id)}
                                size="sm"
                              >
                                <IconTrash size="1rem" />
                              </ActionIcon>
                            )}
                          </Group>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Box>

            <Group justify="space-between" wrap="nowrap">
              <Text size="sm" color="dimmed">
                Showing {docs.length} items
              </Text>
              <Pagination
                total={Math.ceil(cachedDocs.length / ITEMS_PER_PAGE)}
                value={currentPage}
                onChange={handlePageChange}
                size="sm"
              />
            </Group>
          </Stack>
        </Card>
      </Stack>

      {/* Edit Modal */}
      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Edit Document"
        size="lg"
        centered
      >
        <Stack gap="md">
          {editingDoc &&
            fields.map((field) =>
              renderFieldInput(
                field,
                editFields[field.name] || "",
                (val) =>
                  setEditFields((prev) => ({ ...prev, [field.name]: val })),
                field === fields[0]
              )
            )}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveEdit()}>Save Changes</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Document Modal */}
      <Modal
        opened={addModalOpened}
        onClose={() => setAddModalOpened(false)}
        title="Add New Document"
        size="lg"
        centered
      >
        <Stack gap="md">
          {fields.map((field) =>
            renderFieldInput(
              field,
              newDocFields[field.name] || "",
              (val) =>
                setNewDocFields((prev) => ({ ...prev, [field.name]: val })),
              field === fields[0],
              true
            )
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setAddModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={() => void addDocument()}>Add Document</Button>
          </Group>
        </Stack>
      </Modal>

      {/* CSV Upload Modal */}
      <Modal
        opened={uploadModalOpened}
        onClose={() => setUploadModalOpened(false)}
        title="Upload CSV"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Dropzone
            onDrop={(files) => {
              if (files[0]) {
                setUploadFile(files[0]);
              }
            }}
            maxFiles={1}
            accept={['text/csv']}
          >
            <Group justify="center" gap="xl" style={{ minHeight: 220, pointerEvents: 'none' }}>
              <Dropzone.Accept>
                <IconUpload size={50} stroke={1.5} />
              </Dropzone.Accept>
              <Dropzone.Reject>
                <IconUpload size={50} stroke={1.5} />
              </Dropzone.Reject>
              <Dropzone.Idle>
                <IconUpload size={50} stroke={1.5} />
              </Dropzone.Idle>

              <div>
                <Text size="xl" inline>
                  Drag a CSV file here or click to select
                </Text>
                <Text size="sm" c="dimmed" inline mt={7}>
                  The file should not exceed 5mb
                </Text>
              </div>
            </Group>
          </Dropzone>
          {uploadFile && (
            <Text size="sm" ta="center">
              Selected file: {uploadFile.name}
            </Text>
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setUploadModalOpened(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleCSVUpload()}
              loading={uploading}
              disabled={!uploadFile}
            >
              Upload
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Bulk Edit Modal */}
      <Modal
        opened={bulkEditModalOpened}
        onClose={() => setBulkEditModalOpened(false)}
        title="Bulk Edit"
        size="lg"
        centered
      >
        <Stack gap="md">
          <Select
            label="Select Field"
            data={fields.map((f) => ({ value: f.name, label: f.name }))}
            value={bulkEditField}
            onChange={(val) => setBulkEditField(val || '')}
            clearable
          />
          {bulkEditField && (
            renderFieldInput(
              fields.find((f) => f.name === bulkEditField)!,
              bulkEditValue,
              setBulkEditValue,
              true
            )
          )}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={() => setBulkEditModalOpened(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleBulkEdit()}>
              Apply to Selected
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
