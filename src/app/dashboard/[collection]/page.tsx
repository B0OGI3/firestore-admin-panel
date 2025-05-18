"use client";

import {
  ActionIcon,
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
} from "@mantine/core";
import { IconEdit, IconTrash, IconPlus } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  getDocs,
  collection,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { showNotification } from "@mantine/notifications";

type FirestoreDoc = {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
};

export default function CollectionViewer() {
  const params = useParams();
  const collectionName = params.collection as string;

  const [docs, setDocs] = useState<FirestoreDoc[]>([]);
  const [search, setSearch] = useState("");
  const [editingDoc, setEditingDoc] = useState<FirestoreDoc | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [modalOpened, setModalOpened] = useState(false);

  const newDocFields = {
    name: "",
    email: "",
  };

  useEffect(() => {
    const fetchDocs = async () => {
      const snap = await getDocs(collection(db, collectionName));
      setDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    fetchDocs();
  }, [collectionName]);

  const filtered = docs.filter((doc) =>
    Object.values(doc)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const allKeys = Array.from(
    new Set(docs.flatMap((doc) => Object.keys(doc).filter((k) => k !== "id")))
  );

  const handleEdit = (doc: FirestoreDoc) => {
    setEditingDoc(doc);
    setEditFields(
      Object.fromEntries(
        Object.entries(doc).filter(([, v]) => typeof v === "string")

      ) as Record<string, string>
    );
    setModalOpened(true);
  };
  

  const saveEdit = async () => {
    if (!editingDoc) return;
    try {
      const updated = { ...editFields };
      delete updated.id;
      await updateDoc(doc(db, collectionName, editingDoc.id), updated);
      showNotification({ title: "Saved", message: "Document updated", color: "green" });
      window.location.reload();
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
      showNotification({ title: "Success", message: "Document added", color: "green" });
      window.location.reload();
    } catch {
      showNotification({ title: "Error", message: "Failed to add document", color: "red" });
    }
  };

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
          <Button leftSection={<IconPlus size={16} />} onClick={addDocument}>
            Add Document
          </Button>
        </Group>
      </Flex>

      <Card withBorder radius="md" shadow="xs" p="lg">
        <Box style={{ overflowX: "auto" }}>
          <Table
            striped
            highlightOnHover
            withColumnBorders
            verticalSpacing="md"
          >
            <thead>
              <tr>
                <th style={{ minWidth: 240, textAlign: "left" }}>ID</th>
                {allKeys.map((key) => (
                  <th key={`header-${key}`} style={{ minWidth: 120, textAlign: "left" }}>
                    {key}
                  </th>
                ))}
                <th style={{ textAlign: "center", minWidth: 120 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ wordBreak: "break-all", maxWidth: 240 }}>
                      {doc.id}
                    </td>
                    {allKeys.map((key) => (
                      <td key={`${doc.id}-${key}`} style={{ minWidth: 120 }}>
                        {String(doc[key] ?? "—")}
                      </td>
                    ))}
                    <td style={{ textAlign: "center", minWidth: 120 }}>
                      <Group gap="xs" justify="center">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          size="md"
                          onClick={() => handleEdit(doc)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                        <ActionIcon
                          color="red"
                          variant="light"
                          size="md"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Group>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={allKeys.length + 2}>
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
        onClose={() => setModalOpened(false)}
        title="Edit Document"
        centered
      >
        <Stack>
          {editingDoc &&
            allKeys.map((key, i) => (
              <TextInput
                key={`${editingDoc.id}-${key}`}
                label={key}
                value={editFields[key] ?? ""}
                autoFocus={i === 0}
                onChange={(e) =>
                  setEditFields((prev) => ({
                    ...prev,
                    [key]: e.currentTarget.value,
                  }))
                }
              />
            ))}
          <Group justify="flex-end">
            <Button onClick={saveEdit}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
