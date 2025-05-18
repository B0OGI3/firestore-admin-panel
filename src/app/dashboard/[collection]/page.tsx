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
} from "@mantine/core";
import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";
import { useEffect, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
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

type FirestoreDoc = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
};

export default function CollectionViewer() {
  const router = useRouter();
  const params = useParams();
  const collectionName = params.collection as string;

  const [docs, setDocs] = useState<FirestoreDoc[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [editingDoc, setEditingDoc] = useState<FirestoreDoc | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [newDocFields, setNewDocFields] = useState<Record<string, string>>({});
  const [modalOpened, setModalOpened] = useState(false);
  const [addModalOpened, setAddModalOpened] = useState(false);
  const { permissions, loading } = useRolePermissions();

  const centerCellStyle: CSSProperties = {
    textAlign: "center",
    minWidth: 120,
  };

  const displayValue = (val: any): string => {
    if (val === null || val === undefined) return "–";
    if (typeof val === "string") return val.trim() || "–";
    return String(val);
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
        setFields(["name", "email", "role"]);
        return;
      }

      try {
        const snap = await getDoc(doc(db, "config/collections/items", collectionName));
        if (snap.exists()) {
          const data = snap.data();
          const declaredFields = Array.isArray(data.fields) ? data.fields : [];
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
      fields.forEach((key) => (initial[key] = ""));
      setNewDocFields(initial);
    }
  }, [addModalOpened, fields]);

  const filtered = docs.filter((doc) =>
    Object.values(doc).join(" ").toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (doc: FirestoreDoc) => {
    setEditingDoc(doc);
    const safeFields: Record<string, string> = {};
    fields.forEach((key) => {
      const val = doc[key];
      safeFields[key] =
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
      const updated = { ...editFields };
      await updateDoc(doc(db, collectionName, editingDoc.id), updated);
      setDocs((prev) =>
        prev.map((d) => (d.id === editingDoc.id ? { ...d, ...updated } : d))
      );
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
      await addDoc(collection(db, collectionName), newDocFields);
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
            Manage and edit your Firestore collection
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
        <Box style={{ overflowX: "auto", overflowY: "hidden" }}>
          <Table striped highlightOnHover withColumnBorders verticalSpacing="md">
            <thead>
              <tr>
                <th style={{ ...centerCellStyle, minWidth: 240 }}>ID</th>
                {fields.map((key) => (
                  <th key={key} style={centerCellStyle}>{key}</th>
                ))}
                <th style={centerCellStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ ...centerCellStyle, wordBreak: "break-all", maxWidth: 240 }}>{doc.id}</td>
                    {fields.map((key) => (
                      <td key={key} style={centerCellStyle}>
                        {key === "role" ? (
                          <Badge variant="light" color="blue">
                            {displayValue(doc[key])}
                          </Badge>
                        ) : (
                          displayValue(doc[key])
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
                    <Box ta="center" py="sm">No matching documents found.</Box>
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </Box>
      </Card>

      {/* Edit Modal */}
      <Modal opened={modalOpened} onClose={() => setModalOpened(false)} title="Edit Document" centered>
        <Stack>
          {fields.map((key, i) => (
            <TextInput
              key={`edit-${key}`}
              label={key}
              value={editFields[key] ?? ""}
              autoFocus={i === 0}
              onChange={(e) =>
                setEditFields((prev) => ({ ...prev, [key]: e.currentTarget.value }))
              }
            />
          ))}
          <Group justify="flex-end">
            <Button onClick={saveEdit}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Add Modal */}
      {addModalOpened && fields.length > 0 && (
        <Modal opened={addModalOpened} onClose={() => setAddModalOpened(false)} title="Add New Document" centered>
          <Stack>
            {fields.map((key, i) => (
              <TextInput
                key={`new-${key}`}
                label={key}
                value={typeof newDocFields[key] === "string" ? newDocFields[key] : ""}
                autoFocus={i === 0}
                onChange={(e) => {
                  const val = e?.currentTarget?.value ?? "";
                  setNewDocFields((prev) => ({ ...prev, [key]: val }));
                }}
              />
            ))}
            <Group justify="flex-end">
              <Button onClick={addDocument}>Create</Button>
            </Group>
          </Stack>
        </Modal>
      )}
    </Container>
  );
}
