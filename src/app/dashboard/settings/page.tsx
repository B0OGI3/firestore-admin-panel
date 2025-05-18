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
  Box,
  NumberInput,
  Paper,
  Tooltip,
  ActionIcon,
  Modal,
  LoadingOverlay,
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
import type { FieldDef, ValidationRule } from "@/types";
import { useRoles, type RolePermissions, RoleService } from "@/lib/hooks/useRoles";
import { IconTrash, IconCopy, IconInfoCircle } from '@tabler/icons-react';
import { showNotification } from "@mantine/notifications";

const defaultPermissions: Array<keyof RolePermissions> = ["canView", "canEdit", "canDelete", "canManageRoles"];

const roleCategories = {
  admin: "Administrative",
  content: "Content Management",
  user: "User Management",
  custom: "Custom Roles"
} as const;

type RoleCategory = keyof typeof roleCategories;

type NewField = FieldDef;

const fieldTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "select", label: "Select (dropdown)" },
  { value: "date", label: "Date" },
  { value: "email", label: "Email" },
  { value: "url", label: "URL" },
];

const permissionDescriptions = {
  canView: "Can view documents in collections",
  canEdit: "Can create and edit documents",
  canDelete: "Can delete documents",
  canManageRoles: "Can manage roles and permissions"
} as const;

export default function SettingsPage() {
  const [defaultRole, setDefaultRole] = useState("viewer");
  const [collections, setCollections] = useState<string[]>([]);
  const [newCollection, setNewCollection] = useState("");
  const [newFields, setNewFields] = useState<NewField[]>([]);
  const [expandedField, setExpandedField] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRole, setNewRole] = useState("");
  const [newRoleCategory, setNewRoleCategory] = useState<RoleCategory>("custom");
  const { roles, loading: rolesLoading, roleOptions, togglePermission, saveRole, addRole } = useRoles();
  const [deleteRole, setDeleteRole] = useState<string | null>(null);
  const [savingRole, setSavingRole] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const snap = await getDocs(collection(db, "config/collections/items"));
      const items: string[] = [];
      snap.forEach((doc) => items.push(doc.id));

      if (!items.includes("users")) {
        items.unshift("users");
      }

      setCollections(items);
      setLoading(false);
    };

    load();
  }, []);

  const addCollection = async () => {
    const name = newCollection.trim().toLowerCase();
    if (!name || collections.includes(name) || name === "users") return;

    const fieldsToSave = newFields
      .filter((f) => f.name.trim())
      .map((f) => ({
        name: f.name.trim(),
        type: f.type,
        description: f.description || undefined,
        validation: f.validation || undefined,
        options: Array.isArray(f.options) ? f.options : undefined,
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

  const handleFieldTypeChange = (index: number, val: string | null) => {
    if (!val) return;
    const newValidation: ValidationRule = {
      required: false,
      min: null,
      max: null,
      pattern: null,
      patternError: null,
      email: false,
      url: false,
    };
    
    setNewFields((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              type: val as NewField["type"],
              options: [],
              validation: newValidation
            }
          : f
      )
    );
  };

  const handleOptionsChange = (index: number, val: string) => {
    setNewFields((prev) =>
      prev.map((f, i) =>
        i === index
          ? {
              ...f,
              options: val.split(",").map((opt: string) => opt.trim()).filter(Boolean),
            }
          : f
      )
    );
  };

  const handleAddRole = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    await addRole(newRole, newRoleCategory);
    setNewRole("");
    setNewRoleCategory("custom");
  };

  const handleDeleteRole = async (role: string) => {
    setDeleteRole(role);
  };

  const confirmDeleteRole = async () => {
    if (!deleteRole) return;
    try {
      await RoleService.deleteRole(deleteRole);
      showNotification({
        title: "Success",
        message: `Role "${deleteRole}" deleted successfully`,
        color: "green"
      });
      setDeleteRole(null);
    } catch (err) {
      console.error("Failed to delete role:", err);
      showNotification({
        title: "Error",
        message: "Failed to delete role",
        color: "red"
      });
    }
  };

  const handleSaveRole = async (role: string) => {
    setSavingRole(role);
    try {
      await saveRole(role);
    } finally {
      setSavingRole(null);
    }
  };

  const handleDuplicateRole = async (role: string) => {
    try {
      const roleData = roles[role];
      if (!roleData) return;

      const newName = await RoleService.duplicateRole(role, roleData);
      showNotification({
        title: "Success",
        message: `Role duplicated as "${newName}"`,
        color: "green"
      });
    } catch (err) {
      console.error("Failed to duplicate role:", err);
      showNotification({
        title: "Error",
        message: "Failed to duplicate role",
        color: "red"
      });
    }
  };

  if (loading || rolesLoading) return <Container>Loading settings...</Container>;

  return (
    <Container size="md" py="xl">
      <Title order={2} mb="md">Global Settings</Title>

      <Stack>
        <Select
          label="Default Role on Signup"
          value={defaultRole}
          onChange={(value) => setDefaultRole(value || 'viewer')}
          data={roleOptions}
          placeholder="Choose a default role"
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
            <Paper key={index} p="md" withBorder>
              <Stack gap="sm">
                <Group justify="space-between" align="flex-end">
                  <TextInput
                    label="Field Name"
                    placeholder="e.g. price"
                    value={field.name}
                    onChange={(e) => {
                      const val = e.currentTarget.value;
                      setNewFields((prev) =>
                        prev.map((f, i) => (i === index ? { ...f, name: val } : f))
                      );
                    }}
                    style={{ flex: 1 }}
                  />
                  
                  <Select
                    label="Type"
                    data={fieldTypes}
                    value={field.type}
                    onChange={(val) => handleFieldTypeChange(index, val)}
                    style={{ width: 180 }}
                  />
                  
                  <CloseButton
                    aria-label="Remove field"
                    onClick={() => setNewFields((prev) => prev.filter((_, i) => i !== index))}
                  />
                </Group>

                <TextInput
                  label="Description"
                  placeholder="Field description (optional)"
                  value={field.description ?? ""}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    setNewFields((prev) =>
                      prev.map((f, i) => (i === index ? { ...f, description: val } : f))
                    );
                  }}
                />

                {field.type === "select" && (
                  <TextInput
                    label="Options (comma separated)"
                    placeholder="e.g. A,B,C"
                    value={Array.isArray(field.options) ? field.options.join(",") : ""}
                    onChange={(e) => handleOptionsChange(index, e.currentTarget.value)}
                  />
                )}

                <Button
                  variant="subtle"
                  size="sm"
                  onClick={() => setExpandedField(expandedField === index ? null : index)}
                >
                  {expandedField === index ? "Hide Validation" : "Show Validation"}
                </Button>

                {expandedField === index && (
                  <Stack gap="xs">
                    <Checkbox
                      label="Required field"
                      checked={field.validation?.required ?? false}
                      onChange={(e) => {
                        setNewFields((prev) =>
                          prev.map((f, i) =>
                            i === index
                              ? {
                                  ...f,
                                  validation: {
                                    ...f.validation,
                                    required: e.currentTarget.checked,
                                  },
                                }
                              : f
                          )
                        );
                      }}
                    />

                    {field.type === "number" && (
                      <Group grow>
                        <NumberInput
                          label="Minimum value"
                          value={field.validation?.min ?? ""}
                          onChange={(val) => {
                            setNewFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      validation: {
                                        ...f.validation,
                                        min: typeof val === 'number' ? val : null,
                                      },
                                    }
                                  : f
                              )
                            );
                          }}
                          allowNegative
                          allowDecimal
                        />
                        <NumberInput
                          label="Maximum value"
                          value={field.validation?.max ?? ""}
                          onChange={(val) => {
                            setNewFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      validation: {
                                        ...f.validation,
                                        max: typeof val === 'number' ? val : null,
                                      },
                                    }
                                  : f
                              )
                            );
                          }}
                          allowNegative
                          allowDecimal
                        />
                      </Group>
                    )}

                    {field.type === "text" && (
                      <>
                        <TextInput
                          label="Pattern (regex)"
                          placeholder="e.g. ^[A-Za-z]+$"
                          value={field.validation?.pattern ?? ""}
                          onChange={(e) => {
                            const val = e.currentTarget.value;
                            setNewFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      validation: {
                                        ...f.validation,
                                        pattern: val || null,
                                      },
                                    }
                                  : f
                              )
                            );
                          }}
                        />
                        <TextInput
                          label="Pattern Error Message"
                          placeholder="e.g. Only letters allowed"
                          value={field.validation?.patternError ?? ""}
                          onChange={(e) => {
                            const val = e.currentTarget.value;
                            setNewFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      validation: {
                                        ...f.validation,
                                        patternError: val || null,
                                      },
                                    }
                                  : f
                              )
                            );
                          }}
                        />
                      </>
                    )}
                  </Stack>
                )}
              </Stack>
            </Paper>
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

        <Divider 
          label={
            <Group gap="xs">
              <Text>Role Manager</Text>
              <Tooltip label="Manage user roles and their permissions">
                <ActionIcon variant="subtle" size="sm">
                  <IconInfoCircle size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
          }
          my="xl" 
        />

        <Stack gap="md">
          {Object.entries(roleCategories).map(([category, categoryLabel]) => {
            const categoryRoles = Object.entries(roles).filter(([_, role]) => role.category === category);
            if (categoryRoles.length === 0) return null;
            
            return (
              <Box key={category}>
                <Title order={3} mb="md">{categoryLabel}</Title>
                <Stack gap="md">
                  {categoryRoles.map(([roleName, role]) => (
                    <Paper key={roleName} withBorder p="md" radius="md">
                      <Group justify="space-between" mb="xs">
                        <Title order={4}>{roleName.charAt(0).toUpperCase() + roleName.slice(1)}</Title>
                        <Group gap="xs">
                          <Tooltip label="Duplicate role">
                            <ActionIcon 
                              variant="light" 
                              color="blue" 
                              onClick={() => handleDuplicateRole(roleName)}
                              disabled={loading}
                            >
                              <IconCopy size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete role">
                            <ActionIcon 
                              variant="light" 
                              color="red" 
                              onClick={() => handleDeleteRole(roleName)}
                              disabled={loading}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Group>

                      <Stack gap="xs" pos="relative">
                        <LoadingOverlay visible={savingRole === roleName} />
                        {defaultPermissions.map((perm) => {
                          const isChecked = role.permissions[perm] ?? false;
                          return (
                            <Group key={perm} wrap="nowrap" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                label={perm}
                                checked={isChecked}
                                onChange={() => togglePermission(roleName, perm)}
                                onClick={(e) => e.stopPropagation()}
                                styles={{
                                  input: { cursor: 'pointer' },
                                  label: { cursor: 'pointer' }
                                }}
                              />
                              <Tooltip 
                                label={permissionDescriptions[perm as keyof typeof permissionDescriptions]}
                                position="right"
                                multiline
                                w={200}
                              >
                                <ActionIcon 
                                  variant="subtle" 
                                  size="sm" 
                                  color="gray"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <IconInfoCircle size={16} />
                                </ActionIcon>
                              </Tooltip>
                            </Group>
                          );
                        })}
                        <Button 
                          onClick={() => handleSaveRole(roleName)} 
                          loading={savingRole === roleName}
                          disabled={loading}
                          mt="sm"
                        >
                          Save Role
                        </Button>
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            );
          })}

          <Paper withBorder p="md" radius="md">
            <Title order={4} mb="md">Add New Role</Title>
            <Stack>
              <TextInput
                label="Role Name"
                description="Enter a unique name for the new role"
                placeholder="e.g. editor"
                value={newRole}
                onChange={(e) => setNewRole(e.currentTarget.value)}
              />
              <Select
                label="Role Category"
                description="Choose a category for better organization"
                data={Object.entries(roleCategories).map(([value, label]) => ({ value, label }))}
                value={newRoleCategory}
                onChange={(value) => setNewRoleCategory(value as RoleCategory)}
              />
              <Button 
                onClick={handleAddRole} 
                disabled={!newRole.trim() || loading}
                fullWidth
              >
                Add Role
              </Button>
            </Stack>
          </Paper>
        </Stack>

        <Modal
          opened={!!deleteRole}
          onClose={() => setDeleteRole(null)}
          title="Delete Role"
          centered
        >
          <Stack>
            <Text>Are you sure you want to delete the role &quot;{deleteRole}&quot;? This action cannot be undone.</Text>
            <Group justify="flex-end">
              <Button variant="light" onClick={() => setDeleteRole(null)}>Cancel</Button>
              <Button color="red" onClick={confirmDeleteRole}>Delete</Button>
            </Group>
          </Stack>
        </Modal>

        <Code block mt="xl">
          {JSON.stringify({ defaultRole, collections, roles }, null, 2)}
        </Code>
      </Stack>
    </Container>
  );
}
