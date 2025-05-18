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
} from "@mantine/core";

import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";

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
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebaseConfig";
import { showNotification } from "@mantine/notifications";
import { onAuthStateChanged } from "firebase/auth";
import PermissionGate from "@/lib/PermissionGate";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";
import { validateDocument, validateField } from "@/lib/validation";
import type { FieldDef, FirestoreDoc, DocumentUpdate } from "@/types";

const centerCellStyle: CSSProperties = {
  textAlign: "center",
  minWidth: 120,
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
        console.log('Setting initial field:', f.name, 'Value:', initial[f.name]);
      });
      setNewDocFields(initial);
    }
  }, [addModalOpened, fields]);

  const filtered = docs.filter((doc) =>
    Object.values(doc).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (doc: FirestoreDoc) => {
    setEditingDoc(doc);
    const safeFields: Record<string, string> = {};
    fields.forEach((f) => {
      const val = doc[f.name];
      console.log('Setting edit field:', f.name, 'Value:', val, 'Type:', typeof val);
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

      await updateDoc(doc(db, collectionName, editingDoc.id), updated);
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
    if (!confirm("Delete this document?")) return;
    try {
      await deleteDoc(doc(db, collectionName, id));
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

      await addDoc(collection(db, collectionName), parsed);
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
          {collectionName !== "users" && (
            <PermissionGate permission="canEdit">
              <Button leftSection={<IconPlus size={16} />} onClick={() => setAddModalOpened(true)}>
                Add Document
              </Button>
            </PermissionGate>
          )}
        </Group>
      </Flex>

      <Card withBorder radius="md" shadow="xs" p="lg">
        <Box style={{ overflowX: "auto" }}>
          <Table striped highlightOnHover withColumnBorders verticalSpacing="md">
            <thead>
              <tr>
                <th style={{ ...centerCellStyle, minWidth: 240 }}>ID</th>
                {fields.map((f, i) => (
                  <th key={`head-${f.name}-${i}`} style={centerCellStyle}>
                    {f.name}
                  </th>
                ))}
                <th style={centerCellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ ...centerCellStyle, wordBreak: "break-all", maxWidth: 240 }}>{doc.id}</td>
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
                    <td style={centerCellStyle}>
                      <Group gap="xs" justify="center">
                        <PermissionGate permission="canEdit">
                          <ActionIcon color="blue" variant="light" size="md" onClick={() => handleEdit(doc)}>
                            <IconEdit size={16} />
                          </ActionIcon>
                        </PermissionGate>
                        <PermissionGate permission="canDelete">
                          <ActionIcon color="red" variant="light" size="md" onClick={() => handleDelete(doc.id)}>
                            <IconTrash size={16} />
                          </ActionIcon>
                        </PermissionGate>
                      </Group>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={fields.length + 2}>
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
    </Container>
  );
}
