"use client";

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
  Select,
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

const centerCellStyle: CSSProperties = {
  textAlign: "center",
  minWidth: 120,
};

type DocumentUpdate = Record<string, string | number | boolean>;

type FieldDef = {
  name: string;
  type: "text" | "number" | "boolean" | "select";
  options?: string[];
};

type FirestoreDoc = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
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
  const { permissions, loading } = useRolePermissions();

  const displayValue = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return "–";
    if (typeof val === "string") return val.trim() || "–";
    return String(val);
  };

  const renderFieldInput = (
    f: FieldDef,
    value: string,
    onChange: (val: string) => void,
    autoFocus = false
  ) => {
    const comboboxProps = { withinPortal: false, zIndex: 3000 };

    switch (f.type) {
      case "number":
        return (
          <NumberInput
            key={f.name}
            label={f.name}
            value={value ? Number(value) : undefined}
            onChange={(val) => onChange(val?.toString() ?? "")}
            autoFocus={autoFocus}
          />
        );

      case "boolean":
        return (
          <Select
            key={f.name}
            label={f.name}
            value={value}
            onChange={(val) => onChange(val ?? "")}
            data={[
              { value: "true", label: "True" },
              { value: "false", label: "False" },
            ]}
            comboboxProps={comboboxProps}
          />
        );

      case "select":
        return (
          <Select
            key={f.name}
            label={f.name}
            value={value}
            onChange={(val) => onChange(val ?? "")}
            data={(f.options ?? []).map((opt) => ({ value: opt, label: opt }))}
            comboboxProps={comboboxProps}
          />
        );

      default:
        return (
          <TextInput
            key={f.name}
            label={f.name}
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
            autoFocus={autoFocus}
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
      fields.forEach((f) => (initial[f.name] = ""));
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
      safeFields[f.name] =
        typeof val === "string" || typeof val === "number" || typeof val === "boolean"
          ? String(val)
          : "";
    });
    setEditFields(safeFields);
    setModalOpened(true);
  };

  const saveEdit = async () => {
    if (!editingDoc) return;
    try {
      const updated: DocumentUpdate = {};
      fields.forEach((f) => {
        const val = editFields[f.name];
        updated[f.name] =
          f.type === "number"
            ? parseFloat(val)
            : f.type === "boolean"
            ? val === "true"
            : val;
      });
      await updateDoc(doc(db, collectionName, editingDoc.id), updated);
      setDocs((prev) => prev.map((d) => (d.id === editingDoc.id ? { ...d, ...updated } : d)));
      setModalOpened(false);
      showNotification({ title: "Saved", message: "Document updated", color: "green" });
    } catch {
      showNotification({ title: "Error", message: "Failed to save", color: "red" });
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
        const val = newDocFields[f.name];
        parsed[f.name] =
          f.type === "number"
            ? parseFloat(val)
            : f.type === "boolean"
            ? val === "true"
            : val;
      });
      await addDoc(collection(db, collectionName), parsed);
      const snap = await getDocs(collection(db, collectionName));
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setAddModalOpened(false);
      showNotification({ title: "Success", message: "Document added", color: "green" });
    } catch {
      showNotification({ title: "Error", message: "Failed to add document", color: "red" });
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

      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Edit Document" centered>
        <Stack>
          {fields.map((f, i) =>
            renderFieldInput(
              f,
              editFields[f.name] ?? "",
              (val) => setEditFields((prev) => ({ ...prev, [f.name]: val })),
              i === 0
            )
          )}
          <Group justify="flex-end">
            <Button onClick={saveEdit}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Add New Document" centered>
        <Stack>
          {fields.map((f, i) =>
            renderFieldInput(
              f,
              newDocFields[f.name] ?? "",
              (val) => setNewDocFields((prev) => ({ ...prev, [f.name]: val })),
              i === 0
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
