"use client";

import {
  Badge,
  Button,
  Checkbox,
  CloseButton,
  Code,
  Container,
  Divider,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";

const defaultPermissions = ["canView", "canEdit", "canDelete", "canManageRoles"];

type NewField = {
  name: string;
  type: "text" | "number" | "boolean" | "select";
  options?: string;
};

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select (dropdown)" },
];

export default function SettingsPage() {
  const [defaultRole, setDefaultRole] = useState("viewer");
  const [collections, setCollections] = useState<string[]>([]);
  const [newCollection, setNewCollection] = useState("");
  const [newFields, setNewFields] = useState<NewField[]>([]);
  type RolePermissions = Record<string, boolean>;
  const [roles, setRoles] = useState<Record<string, RolePermissions>>({});

  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "config/collections/items"));
      const items: string[] = [];
      snap.forEach((doc) => items.push(doc.id));

      if (!items.includes("users")) {
        items.unshift("users");
      }

      setCollections(items);

      const roleSnap = await getDocs(collection(db, "roles"));
      const roleResult: Record<string, RolePermissions> = {};
      roleSnap.forEach((d) => (roleResult[d.id] = d.data() as RolePermissions));
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

  const addRole = () => {
    const newData = defaultPermissions.reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {}
    );
    setRoles((prev) => ({ ...prev, [newRole]: newData }));
    setNewRole("");
  };

  const addCollection = async () => {
    const name = newCollection.trim().toLowerCase();
    if (!name || collections.includes(name) || name === "users") return;

    const fieldsToSave = newFields
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        type: f.type,
        ...(f.type === "select" && f.options
          ? { options: f.options.split(",").map((o) => o.trim()).filter(Boolean) }
          : {}),
      }));

    await setDoc(doc(db, "config/collections/items", name), {
      createdAt: Date.now(),
      fields: fieldsToSave,
    });

    setCollections((prev) => [...prev, name]);
    setNewCollection("");
    setNewFields([]);
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

        {/* 🔧 Dynamic Collection Creator */}
        <Stack mt="md" p="md" style={{ border: "1px solid #e0e0e0", borderRadius: 8 }}>
          <Title order={4}>Create New Collection</Title>

          <TextInput
            label="Collection Name"
            placeholder="e.g. products"
            value={newCollection}
            onChange={(e) => setNewCollection(e.currentTarget.value)}
          />
          
          {newFields.map((field, index) => (
            <Group key={index} align="flex-end">
              <TextInput
                label="Field Name"
                placeholder="e.g. price"
                value={field.name}
                onChange={(e) => {
                  const val = e?.currentTarget?.value ?? "";
                  setNewFields((prev) =>
                    prev.map((f, i) => (i === index ? { ...f, name: val } : f))
                  );
                }}
                style={{ flex: 1 }}
              />
              <Select
                label="Type"
                data={fieldTypes}
                value={field.type ?? "text"}
                onChange={(val) => {
                  if (!val) return;
                  setNewFields((prev) =>
                    prev.map((f, i) =>
                      i === index ? { ...f, ttype: val as NewField["type"], options: undefined } : f
                    )
                  );
                }}
                style={{ width: 180 }}
              />
              {field.type === "select" && (
                <TextInput
                  label="Options (comma separated)"
                  placeholder="e.g. A,B,C"
                  value={field.options ?? ""}
                  onChange={(e) => {
                    const val = e?.currentTarget?.value ?? "";
                    setNewFields((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, options: val } : f))
                    );
                  }}
                  style={{ flex: 1 }}
                />
              )}
              <CloseButton
                aria-label="Remove field"
                onClick={() =>
                  setNewFields((prev) => prev.filter((_, i) => i !== index))
                }
              />
            </Group>
          ))}


          <Button
            variant="light"
            onClick={() => setNewFields((prev) => [...prev, { name: "", type: "text" }])}
          >
            + Add Field
          </Button>

          <Button
            onClick={addCollection}
            disabled={!newCollection.trim() || newFields.length === 0}
          >
            Create Collection
          </Button>
        </Stack>

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
