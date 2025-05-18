"use client";

import {
  Button,
  Checkbox,
  Code,
  Container,
  Divider,
  Stack,
  Text,
  TextInput,
  Title,
  Group,
  Badge,
  CloseButton,
} from "@mantine/core";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";

const defaultPermissions = [
  "canView",
  "canEdit",
  "canDelete",
  "canManageRoles",
];

export default function SettingsPage() {
  const [defaultRole, setDefaultRole] = useState("viewer");
  const [collections, setCollections] = useState<string[]>([]);
  const [newCollection, setNewCollection] = useState("");
  const [newCollectionFields, setNewCollectionFields] = useState("");
  const [roles, setRoles] = useState<Record<string, any>>({});
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "config/collections/items"));
      const items: string[] = [];
      snap.forEach((doc) => items.push(doc.id));

      // Ensure "users" is included
      if (!items.includes("users")) {
        items.unshift("users");
      }

      setCollections(items);

      const roleSnap = await getDocs(collection(db, "roles"));
      const roleResult: Record<string, any> = {};
      roleSnap.forEach((d) => (roleResult[d.id] = d.data()));
      setRoles(roleResult);

      setLoading(false);
    };

    load();
  }, []);

  const togglePermission = (role: string, perm: string) => {
    setRoles((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [perm]: !prev[role][perm],
      },
    }));
  };

  const saveRole = async (role: string) => {
    await setDoc(doc(db, "roles", role), roles[role]);
  };

  const addRole = async () => {
    const newData = defaultPermissions.reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {}
    );
    setRoles((prev) => ({ ...prev, [newRole]: newData }));
    setNewRole("");
  };

  const addCollection = async () => {
    const name = newCollection.trim().toLowerCase();
    const fields = newCollectionFields
      .split(",")
      .map((f) => f.trim())
      .filter((f) => f);

    if (!name || collections.includes(name) || name === "users") return;
    await setDoc(doc(db, "config/collections/items", name), {
      createdAt: Date.now(),
      fields,
    });
    setCollections((prev) => [...prev, name]);
    setNewCollection("");
    setNewCollectionFields("");
  };

  const removeCollection = async (name: string) => {
    if (name === "users") return;
    await deleteDoc(doc(db, "config/collections/items", name));
    setCollections((prev) => prev.filter((c) => c !== name));
  };

  const saveSettings = async () => {
    const cleanCollections = Array.from(new Set([...collections, "users"]));
    await setDoc(
      doc(db, "app_config", "global"),
      {
        defaultRole,
        allowedCollections: cleanCollections,
      },
      { merge: true }
    );
  };

  if (loading) return <Container>Loading settings...</Container>;

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">Global Settings</Title>

      <Stack>
        <TextInput
          label="Default Role on Signup"
          value={defaultRole}
          onChange={(e) => setDefaultRole(e.currentTarget.value)}
        />

        <Text fw={500} mt="md">Allowed Firestore Collections</Text>
        <Group gap="xs" wrap="wrap">
          {collections.map((col) => (
            <Badge
              key={col}
              variant="light"
              rightSection={
                col !== "users" ? (
                  <CloseButton
                    onClick={() => removeCollection(col)}
                    size="xs"
                  />
                ) : undefined
              }
            >
              {col}
            </Badge>
          ))}
        </Group>

        <Group>
          <TextInput
            placeholder="New collection name"
            value={newCollection}
            onChange={(e) => setNewCollection(e.currentTarget.value)}
          />
          <TextInput
            placeholder="Fields (comma separated)"
            value={newCollectionFields}
            onChange={(e) => setNewCollectionFields(e.currentTarget.value)}
          />
          <Button onClick={addCollection}>Add</Button>
        </Group>

        <Button onClick={saveSettings}>Save General Settings</Button>

        <Divider label="Role Manager" my="xl" />

        {Object.entries(roles).map(([role, perms]) => (
          <div key={role}>
            <Title order={4} mt="md">{role}</Title>
            <Stack>
              {defaultPermissions.map((perm) => (
                <Checkbox
                  key={perm}
                  label={perm}
                  checked={perms[perm] ?? false}
                  onChange={() => togglePermission(role, perm)}
                />
              ))}
              <Button onClick={() => saveRole(role)}>Save Role</Button>
              <Divider my="sm" />
            </Stack>
          </div>
        ))}

        <TextInput
          label="New Role Name"
          value={newRole}
          onChange={(e) => setNewRole(e.currentTarget.value)}
        />
        <Button onClick={addRole} disabled={!newRole.trim()}>
          Add Role
        </Button>

        <Code block mt="xl">
          {JSON.stringify({ defaultRole, collections, roles }, null, 2)}
        </Code>
      </Stack>
    </Container>
  );
}
