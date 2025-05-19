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
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Center,
  NativeSelect,
  NumberInput,
  FileInput,
  Checkbox,
} from "@mantine/core";

import { IconEdit, IconTrash, IconPlus, IconDownload, IconUpload } from "@tabler/icons-react";

import {
  useEffect,
  useState,
  type CSSProperties
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

const centerCellStyle: CSSProperties = {
  textAlign: "center",
  minWidth: 120,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  padding: "0.5rem"
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
  const { permissions, loading } = useRolePermissions();
  const [uploadModalOpened, setUploadModalOpened] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [bulkEditModalOpened, setBulkEditModalOpened] = useState(false);
  const [bulkEditField, setBulkEditField] = useState<string>("");
  const [bulkEditValue, setBulkEditValue] = useState<string>("");

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
      autoFocus: autoFocus
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const val = e.currentTarget?.value;
      onChange(val);
      validateAndUpdateField(f, val, isNewDoc);
    };

    const handleNumberChange = (val: number | string) => {
      const stringVal = String(val ?? '');
      onChange(stringVal);
      validateAndUpdateField(f, stringVal, isNewDoc);
    };

    switch (f.type) {
      case "number":
        return (
          <NumberInput
            key={f.name}
            {...commonProps}
            value={value ? Number(value) : 0}
            onChange={handleNumberChange}
            allowNegative
            allowDecimal
          />
        );

      case "boolean":
        return (
          <NativeSelect
            key={f.name}
            {...commonProps}
            value={value || "false"}
            onChange={handleInputChange}
            data={[
              { value: "true", label: "True" },
              { value: "false", label: "False" },
            ]}
          />
        );

      case "select": {
        const options = Array.isArray(f.options) ? f.options : [];
        return (
          <NativeSelect
            key={f.name}
            {...commonProps}
            value={value || ""}
            onChange={handleInputChange}
            data={options.map(opt => ({ value: opt, label: opt }))}
          />
        );
      }

      case "date":
        // TODO: Implement date picker
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            onChange={handleInputChange}
            type="date"
          />
        );

      case "email":
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            onChange={handleInputChange}
            type="email"
          />
        );

      case "url":
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            onChange={handleInputChange}
            type="url"
          />
        );

      default:
        return (
          <TextInput
            key={f.name}
            {...commonProps}
            value={value}
            onChange={handleInputChange}
          />
        );
    }
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
          { name: "name", type: "text" },
          { name: "email", type: "text" },
          { name: "role", type: "select", options: ["admin", "editor", "viewer"] },
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
          setFields(declaredFields);
        }
      } catch {
        showNotification({ title: "Error", message: "Could not load fields", color: "red" });
      }
    };

    fetchFields();
  }, [collectionName]);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!collectionName) return;
      try {
        const snap = await getDocs(collection(db, collectionName));
        setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch {
        showNotification({ title: "Error", message: "Failed to fetch documents", color: "red" });
      }
    };
    fetchDocs();
  }, [collectionName]);

  useEffect(() => {
    if (addModalOpened) {
      const initial: Record<string, string> = {};
      fields.forEach((f) => {
        initial[f.name] = f.type === "boolean" ? "false" : "";
      });
      setNewDocFields(initial);
    }
  }, [addModalOpened, fields]);

  const filtered = docs.filter((doc) =>
    Object.values(doc).join(" ").toLowerCase().includes(search.toLowerCase())
  );

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
      fields.forEach((f) => {
        const val = editFields[f.name] ?? "";
        updated[f.name] =
          f.type === "number"
            ? parseFloat(val) || 0
            : f.type === "boolean"
            ? val === "true"
            : val;
      });

      // Validate before saving
      const validation = validateDocument(updated, fields);
      if (!validation.isValid) {
        validation.errors.forEach((error) => {
          showNotification({
            title: `Error in ${error.field}`,
            message: error.message,
            color: "red",
            autoClose: 5000,
          });
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

      // Update local state
      setDocs((prev) => prev.map((d) => (d.id === editingDoc.id ? { ...d, ...updated } : d)));
      setModalOpened(false);
      setEditFieldErrors({});
      showNotification({ 
        title: "Success", 
        message: "Document updated successfully", 
        color: "green",
        autoClose: 3000 
      });
    } catch {
      showNotification({ 
        title: "Error", 
        message: "Failed to save document", 
        color: "red",
        autoClose: 5000 
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!permissions?.canDelete) return;
    if (!confirm("Delete this document?")) return;
    try {
      // Create a new batch
      const batch = writeBatch(db);
      
      // Add the delete operation to the batch
      const docRef = doc(db, collectionName, id);
      batch.delete(docRef);

      // Commit the batch
      await batch.commit();

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
      fields.forEach((f) => {
        const val = newDocFields[f.name] ?? "";
        parsed[f.name] =
          f.type === "number"
            ? parseFloat(val) || 0
            : f.type === "boolean"
            ? val === "true"
            : val;
      });

      // Validate before adding
      const validation = validateDocument(parsed, fields);
      if (!validation.isValid) {
        validation.errors.forEach((error) => {
          showNotification({
            title: `Error in ${error.field}`,
            message: error.message,
            color: "red",
            autoClose: 5000,
          });
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
    } catch {
      showNotification({ 
        title: "Error", 
        message: "Failed to add document", 
        color: "red",
        autoClose: 5000 
      });
    }
  };

  const downloadCSV = () => {
    if (filtered.length === 0) {
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
      ...filtered.map(doc => {
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

  const handleBulkDelete = async () => {
    if (!permissions?.canDelete) return;
    if (selectedDocs.size === 0) return;
    if (!confirm(`Delete ${selectedDocs.size} selected documents?`)) return;

    try {
      const batch = writeBatch(db);
      selectedDocs.forEach(id => {
        const docRef = doc(db, collectionName, id);
        batch.delete(docRef);
      });

      await batch.commit();
      setDocs(prev => prev.filter(d => !selectedDocs.has(d.id)));
      setSelectedDocs(new Set());
      showNotification({
        title: "Success",
        message: `Deleted ${selectedDocs.size} documents`,
        color: "green",
      });
    } catch {
      showNotification({
        title: "Error",
        message: "Failed to delete documents",
        color: "red",
      });
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
    if (selectedDocs.size === filtered.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(filtered.map(d => d.id)));
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

  if (!loading && !permissions?.canView) {
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
    <Container size="xl" py="xl">
      <Flex justify="space-between" align="center" mb="xl">
        <Box>
          <Title order={2}>{collectionName}</Title>
          <Text size="sm" c="dimmed">
            Role: <strong>{permissions?.role ?? "Unknown"}</strong> · Manage and edit your Firestore collection
          </Text>
        </Box>
        <Group gap="sm">
          <TextInput
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            miw={250}
          />
          {collectionName !== "users" && permissions?.canEdit && (
            <>
              {selectedDocs.size > 0 && (
                <Group gap="xs">
                  <Button 
                    variant="light" 
                    color="red"
                    onClick={handleBulkDelete}
                  >
                    Delete Selected ({selectedDocs.size})
                  </Button>
                  <Button 
                    variant="light"
                    onClick={() => setBulkEditModalOpened(true)}
                  >
                    Edit Selected ({selectedDocs.size})
                  </Button>
                </Group>
              )}
              <Button 
                leftSection={<IconDownload size={16} />} 
                variant="light"
                onClick={downloadCSV}
              >
                Download CSV
              </Button>
              <Button 
                leftSection={<IconUpload size={16} />} 
                variant="light"
                onClick={() => setUploadModalOpened(true)}
              >
                Upload CSV
              </Button>
              <Button 
                leftSection={<IconPlus size={16} />} 
                onClick={() => setAddModalOpened(true)}
              >
                Add Document
              </Button>
            </>
          )}
        </Group>
      </Flex>

      <Card withBorder radius="md" shadow="xs" p="lg">
        <Box style={{ overflowX: "auto", overflowY: "hidden" }}>
          <Table striped highlightOnHover withColumnBorders verticalSpacing="md" style={{ tableLayout: "fixed" }}>
            <thead>
              <tr>
                <th style={{ ...centerCellStyle, width: "120px" }}>
                  <Group gap="xs" justify="flex-start" wrap="nowrap">
                    <Checkbox
                      checked={selectedDocs.size === filtered.length && filtered.length > 0}
                      indeterminate={selectedDocs.size > 0 && selectedDocs.size < filtered.length}
                      onChange={toggleSelectAll}
                    />
                    <Text size="sm" c="dimmed" style={{ whiteSpace: 'nowrap' }}>Select All</Text>
                  </Group>
                </th>
                <th style={{ ...centerCellStyle, width: "240px" }}>ID</th>
                {fields.map((f, i) => (
                  <th key={`head-${f.name}-${i}`} style={centerCellStyle}>
                    {f.name}
                  </th>
                ))}
                <th style={{ ...centerCellStyle, width: "100px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ ...centerCellStyle, width: "120px" }}>
                      <Group gap="xs" justify="flex-start" wrap="nowrap">
                        <Checkbox
                          checked={selectedDocs.has(doc.id)}
                          onChange={() => toggleSelectDoc(doc.id)}
                        />
                      </Group>
                    </td>
                    <td style={{ ...centerCellStyle, width: "240px" }}>{doc.id}</td>
                    {fields.map((f, i) => (
                      <td key={`cell-${f.name}-${i}`} style={centerCellStyle}>
                        {f.name === "role" ? (
                          <Badge variant="light" color="blue">
                            {displayValue(doc[f.name])}
                          </Badge>
                        ) : (
                          displayValue(doc[f.name])
                        )}
                      </td>
                    ))}
                    <td style={{ ...centerCellStyle, width: "100px" }}>
                      <Group gap="xs" justify="center">
                        <ActionIcon 
                          color="blue" 
                          variant="light" 
                          size="md" 
                          onClick={() => handleEdit(doc)}
                          style={{ display: 'inline-flex' }}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon 
                          color="red" 
                          variant="light" 
                          size="md" 
                          onClick={() => handleDelete(doc.id)}
                          style={{ display: 'inline-flex' }}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={fields.length + 3}>
                    <Box ta="center" py="sm">
                      No matching documents found.
                    </Box>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Box>
      </Card>

      <Modal 
        opened={modalOpened} 
        onClose={() => {
          setModalOpened(false);
          setEditFieldErrors({});
        }}
        title="Edit Document" 
        centered
        size="lg"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3
        }}
      >
        <Stack>
          {fields.map((f, i) =>
            renderFieldInput(
              f,
              editFields[f.name] ?? "",
              (val) => setEditFields((prev) => ({ ...prev, [f.name]: val })),
              i === 0,
              false
            )
          )}
          <Group justify="flex-end">
            <Button onClick={saveEdit}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal 
        opened={addModalOpened} 
        onClose={() => {
          setAddModalOpened(false);
          setNewFieldErrors({});
        }}
        title="Add New Document" 
        centered
        size="lg"
        overlayProps={{
          backgroundOpacity: 0.55,
          blur: 3
        }}
      >
        <Stack>
          {fields.map((f, i) =>
            renderFieldInput(
              f,
              newDocFields[f.name] ?? "",
              (val) => setNewDocFields((prev) => ({ ...prev, [f.name]: val })),
              i === 0,
              true
            )
          )}
          <Group justify="flex-end">
            <Button onClick={addDocument}>Create</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={uploadModalOpened}
        onClose={() => {
          setUploadModalOpened(false);
          setUploadFile(null);
        }}
        title="Upload CSV"
        centered
      >
        <Stack>
          <Text size="sm" c="dimmed">
            Upload a CSV file with the following columns: id, {fields.map(f => f.name).join(', ')}
          </Text>
          <FileInput
            label="CSV File"
            placeholder="Choose a CSV file"
            accept=".csv"
            value={uploadFile}
            onChange={setUploadFile}
          />
          <Group justify="flex-end">
            <Button
              onClick={handleCSVUpload}
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
        onClose={() => {
          setBulkEditModalOpened(false);
          setBulkEditField("");
          setBulkEditValue("");
        }}
        title={`Edit ${selectedDocs.size} Documents`}
        centered
      >
        <Stack>
          <NativeSelect
            label="Field to Update"
            data={fields.map(f => ({ value: f.name, label: f.name }))}
            value={bulkEditField}
            onChange={(e) => setBulkEditField(e.currentTarget.value)}
          />
          {bulkEditField && (
            renderFieldInput(
              fields.find(f => f.name === bulkEditField)!,
              bulkEditValue,
              setBulkEditValue,
              true
            )
          )}
          <Group justify="flex-end">
            <Button onClick={handleBulkEdit}>Update All</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
