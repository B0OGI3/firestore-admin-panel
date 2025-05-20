"use client";

import {
  ActionIcon,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
  Box,
  NumberInput,
  Paper,
  Tooltip,
  Checkbox,
  CloseButton,
  Code,
  Divider,
  Select,
  Avatar,
  SimpleGrid,
  Modal,
  LoadingOverlay,
} from "@mantine/core";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
} from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";
import type { FieldDef, ValidationRule } from "@/types";
import { useRoles, type RolePermissions, RoleService } from "@/lib/hooks/useRoles";
import { IconTrash, IconCopy, IconInfoCircle, IconEdit, IconDatabase, IconFolder, IconPlus, IconGripVertical } from '@tabler/icons-react';
import { showNotification } from "@mantine/notifications";
import { useThemeToggle } from "@/lib/theme";
import { useMantineTheme } from "@mantine/core";
import { useAppTitle } from "@/lib/hooks/useAppTitle";
import PermissionGate from "@/lib/PermissionGate";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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

function DraggableField({ field, index, onFieldChange, onRemove, onTypeChange, onOptionsChange, onValidationChange, expandedField, setExpandedField }: {
  field: NewField;
  index: number;
  onFieldChange: (index: number, field: NewField) => void;
  onRemove: (index: number) => void;
  onTypeChange: (index: number, type: string) => void;
  onOptionsChange: (index: number, options: string) => void;
  onValidationChange: (index: number, validation: Partial<ValidationRule>) => void;
  expandedField: number | null;
  setExpandedField: (index: number | null) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.name + index });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Paper ref={setNodeRef} style={style} p="md" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-end">
          <Group gap="xs" style={{ cursor: 'grab' }} {...attributes} {...listeners}>
            <IconGripVertical size={18} style={{ color: 'var(--mantine-color-gray-5)' }} />
            <TextInput
              label="Field Name"
              placeholder="e.g. price"
              value={field.name}
              onChange={(e) => {
                const val = e.currentTarget.value;
                onFieldChange(index, { ...field, name: val });
              }}
              style={{ flex: 1 }}
            />
          </Group>
          <Select
            label="Type"
            data={fieldTypes}
            value={field.type}
            onChange={(val) => val && onTypeChange(index, val)}
            style={{ width: 180 }}
          />
          <CloseButton
            aria-label="Remove field"
            onClick={() => onRemove(index)}
          />
        </Group>
        <TextInput
          label="Description"
          placeholder="Field description (optional)"
          value={field.description ?? ""}
          onChange={(e) => {
            const val = e.currentTarget.value;
            onFieldChange(index, { ...field, description: val });
          }}
        />
        {field.type === "select" && (
          <TextInput
            label="Options (comma separated)"
            placeholder="e.g. A,B,C"
            value={Array.isArray(field.options) ? field.options.join(",") : ""}
            onChange={(e) => onOptionsChange(index, e.currentTarget.value)}
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
              onChange={(e) => onValidationChange(index, { required: e.currentTarget.checked })}
            />
            {field.type === "number" && (
              <Group grow>
                <NumberInput
                  label="Minimum value"
                  value={field.validation?.min ?? ""}
                  onChange={(val) => onValidationChange(index, { min: typeof val === 'number' ? val : null })}
                  allowNegative
                  allowDecimal
                />
                <NumberInput
                  label="Maximum value"
                  value={field.validation?.max ?? ""}
                  onChange={(val) => onValidationChange(index, { max: typeof val === 'number' ? val : null })}
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
                  onChange={(e) => onValidationChange(index, { pattern: e.currentTarget.value || null })}
                />
                <TextInput
                  label="Pattern Error Message"
                  placeholder="e.g. Only letters allowed"
                  value={field.validation?.patternError ?? ""}
                  onChange={(e) => onValidationChange(index, { patternError: e.currentTarget.value || null })}
                />
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

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
  const [editingCollection, setEditingCollection] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<NewField[]>([]);
  const [editExpandedField, setEditExpandedField] = useState<number | null>(null);
  const theme = useMantineTheme();
  const { colorScheme } = useThemeToggle();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const { title, updateTitle } = useAppTitle();
  const [newTitle, setNewTitle] = useState(title);
  const [savingTitle, setSavingTitle] = useState(false);

  // Add sensors hook at the component level
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
    try {
      const name = newCollection.trim().toLowerCase();
      if (!name) {
        showNotification({
          title: "Error",
          message: "Collection name cannot be empty",
          color: "red"
        });
        return;
      }
      
      if (collections.includes(name)) {
        showNotification({
          title: "Error",
          message: "A collection with this name already exists",
          color: "red"
        });
        return;
      }
      
      if (name === "users") {
        showNotification({
          title: "Error",
          message: "Cannot create a collection named 'users'",
          color: "red"
        });
        return;
      }

      if (newFields.length === 0) {
        showNotification({
          title: "Error",
          message: "Please add at least one field to the collection",
          color: "red"
        });
        return;
      }

      const fieldsToSave = newFields
        .filter((f) => f.name.trim())
        .map((f, index) => ({
          ...f,
          order: index, // Add order field
        }));

      await setDoc(doc(db, "config/collections/items", name), {
        createdAt: Date.now(),
        fields: fieldsToSave,
      });

      setCollections((prev) => [...prev, name]);
      setNewCollection("");
      setNewFields([]);
      
      showNotification({
        title: "Success",
        message: `Collection "${name}" created successfully`,
        color: "green"
      });
    } catch (error) {
      console.error("Failed to create collection:", error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to create collection. Please try again.",
        color: "red"
      });
    }
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
    showNotification({
      title: "Settings Saved",
      message: "General settings have been saved successfully.",
      color: "green",
      autoClose: 3000,
    });
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

  const handleEditCollection = async (name: string) => {
    try {
      const docSnap = await getDoc(doc(db, "config/collections/items", name));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEditFields(data.fields || []);
        setEditingCollection(name);
      }
    } catch (error) {
      console.error("Failed to load collection:", error);
      showNotification({
        title: "Error",
        message: "Failed to load collection for editing",
        color: "red"
      });
    }
  };

  const saveCollectionEdit = async () => {
    if (!editingCollection) return;

    try {
      const fieldsToSave = editFields
        .filter((f) => f.name.trim())
        .map((f, index) => ({
          ...f,
          order: index, // Add order field
        }));

      await setDoc(doc(db, "config/collections/items", editingCollection), {
        createdAt: Date.now(),
        fields: fieldsToSave,
      });

      setEditingCollection(null);
      setEditFields([]);
      setEditExpandedField(null);
      
      showNotification({
        title: "Success",
        message: `Collection "${editingCollection}" updated successfully`,
        color: "green"
      });
    } catch (error) {
      console.error("Failed to update collection:", error);
      showNotification({
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to update collection",
        color: "red"
      });
    }
  };

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) {
      showNotification({
        title: "Error",
        message: "Title cannot be empty",
        color: "red"
      });
      return;
    }

    setSavingTitle(true);
    const success = await updateTitle(newTitle.trim());
    setSavingTitle(false);

    if (success) {
      showNotification({
        title: "Success",
        message: "App title updated successfully",
        color: "green"
      });
    } else {
      showNotification({
        title: "Error",
        message: "Failed to update app title",
        color: "red"
      });
    }
  };

  if (loading || rolesLoading) return <Container>Loading settings...</Container>;

  // Theme-aware background
  const bgColor = colorScheme === "dark"
    ? theme.colors.dark[7]
    : "linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)";
  const cardBg = colorScheme === "dark"
    ? theme.colors.dark[6]
    : theme.white;

  return (
    <PermissionGate permission="canManageRoles" fallback={
      <Container>
        <Title order={2} mb="md">Access Denied</Title>
        <Text>You do not have permission to access this page. Only administrators can access the settings.</Text>
      </Container>
    }>
      <Box style={{ minHeight: "100vh", background: bgColor }}>
        <Container size="md" py="xl">
          <Title order={2} mb="md">Global Settings</Title>
          <Stack>
            <Card shadow="sm" radius="lg" withBorder p="xl" style={{ background: cardBg }}>
              <Title order={3} mb="md">App Configuration</Title>
              <Stack>
                <TextInput
                  label="Application Title"
                  description="The title shown in the header and login screen"
                  placeholder="Enter your application title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.currentTarget.value)}
                />
                <Button
                  onClick={handleSaveTitle}
                  loading={savingTitle}
                  disabled={newTitle === title}
                >
                  Save Title
                </Button>
              </Stack>
            </Card>

            <Select
              label="Default Role on Signup"
              value={defaultRole}
              onChange={(value) => setDefaultRole(value || 'viewer')}
              data={roleOptions}
              placeholder="Choose a default role"
            />

            <Text fw={500} mt="md">Allowed Firestore Collections</Text>
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg" mb="md">
              {collections.map((col) => (
                <Card
                  key={col}
                  shadow="md"
                  radius="lg"
                  withBorder
                  style={{ background: cardBg, minHeight: 120, position: 'relative' }}
                >
                  <Group align="center" gap="md">
                    <Avatar color="blue" radius="md" size={40}>
                      {col === "users" ? <IconFolder size={22} /> : <IconDatabase size={22} />}
                    </Avatar>
                    <Stack gap={0} style={{ flex: 1 }}>
                      <Title order={4} size="h5" style={{ fontWeight: 700 }}>{col.charAt(0).toUpperCase() + col.slice(1)}</Title>
                      <Text size="sm" c="dimmed">
                        {col === "users" ? "User accounts" : "Collection"}
                      </Text>
                    </Stack>
                    {col !== "users" && (
                      <Group gap={4}>
                        <ActionIcon
                          variant="subtle"
                          color="blue"
                          size="md"
                          onClick={() => handleEditCollection(col)}
                          title="Edit Collection"
                          style={{ transition: 'background 0.2s' }}
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          size="md"
                          onClick={() => removeCollection(col)}
                          title="Delete Collection"
                          style={{ transition: 'background 0.2s' }}
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Group>
                    )}
                  </Group>
                </Card>
              ))}
              {/* Add Collection Card */}
              <Card
                key="add-collection"
                shadow="md"
                radius="lg"
                withBorder
                style={{
                  background: cardBg,
                  minHeight: 120,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'box-shadow 0.2s, background 0.2s',
                  outline: 'none',
                }}
                onClick={() => setAddModalOpen(true)}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setAddModalOpen(true); }}
                className="add-collection-card"
              >
                <Stack align="center" gap={2} style={{ width: '100%' }}>
                  <Avatar color={colorScheme === 'dark' ? 'blue' : 'yellow'} radius="md" size={56} style={{ boxShadow: colorScheme === 'dark' ? '0 2px 8px #0003' : '0 2px 8px #0001', background: colorScheme === 'dark' ? theme.colors.dark[5] : '#fffbe6' }}>
                    <IconPlus size={32} color={colorScheme === 'dark' ? theme.colors.blue[4] : '#FFA000'} />
                  </Avatar>
                  <Text fw={700} size="lg" mt={4}>Add Collection</Text>
                  <Text size="sm" c="dimmed">Create a new collection</Text>
                </Stack>
              </Card>
            </SimpleGrid>

            {/* Add Collection Modal */}
            <Modal
              opened={addModalOpen}
              onClose={() => setAddModalOpen(false)}
              title="Create New Collection"
              centered
              size="lg"
            >
              <Stack>
                <TextInput
                  label="Collection Name"
                  placeholder="e.g. products"
                  value={newCollection}
                  onChange={(e) => setNewCollection(e.currentTarget.value)}
                />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      setNewFields((items) => {
                        const oldIndex = items.findIndex((item) => item.name + items.indexOf(item) === active.id);
                        const newIndex = items.findIndex((item) => item.name + items.indexOf(item) === over.id);
                        return arrayMove(items, oldIndex, newIndex);
                      });
                    }
                  }}
                >
                  <SortableContext
                    items={newFields.map((field, index) => field.name + index)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack>
                      {newFields.map((field, index) => (
                        <DraggableField
                          key={field.name + index}
                          field={field}
                          index={index}
                          onFieldChange={(index, field) => {
                            setNewFields((prev) =>
                              prev.map((f, i) => (i === index ? field : f))
                            );
                          }}
                          onRemove={(index) => setNewFields((prev) => prev.filter((_, i) => i !== index))}
                          onTypeChange={handleFieldTypeChange}
                          onOptionsChange={handleOptionsChange}
                          onValidationChange={(index, validation) => {
                            setNewFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      validation: {
                                        ...f.validation,
                                        ...validation,
                                      },
                                    }
                                  : f
                              )
                            );
                          }}
                          expandedField={expandedField}
                          setExpandedField={setExpandedField}
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
                <Group gap="sm">
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
                </Group>
              </Stack>
            </Modal>

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

            <Stack gap="xl">
              {Object.entries(roleCategories).map(([category, categoryLabel]) => {
                const categoryRoles = Object.entries(roles).filter(([_, role]) => role.category === category);
                if (categoryRoles.length === 0) return null;
                return (
                  <Card key={category} shadow="sm" radius="lg" withBorder p="xl" style={{ background: cardBg }}>
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
                                  style={{ transition: 'background 0.2s' }}
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
                                  style={{ transition: 'background 0.2s' }}
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
                  </Card>
                );
              })}

              {/* Add New Role Form */}
              <Card withBorder p="xl" radius="lg" shadow="sm" style={{ background: cardBg }}>
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
              </Card>
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

            {/* Edit Collection Modal */}
            <Modal
              opened={!!editingCollection}
              onClose={() => {
                setEditingCollection(null);
                setEditFields([]);
                setEditExpandedField(null);
              }}
              title={`Edit Collection: ${editingCollection}`}
              size="lg"
              centered
            >
              <Stack>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      setEditFields((items) => {
                        const oldIndex = items.findIndex((item) => item.name + items.indexOf(item) === active.id);
                        const newIndex = items.findIndex((item) => item.name + items.indexOf(item) === over.id);
                        return arrayMove(items, oldIndex, newIndex);
                      });
                    }
                  }}
                >
                  <SortableContext
                    items={editFields.map((field, index) => field.name + index)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack>
                      {editFields.map((field, index) => (
                        <DraggableField
                          key={field.name + index}
                          field={field}
                          index={index}
                          onFieldChange={(index, field) => {
                            setEditFields((prev) =>
                              prev.map((f, i) => (i === index ? field : f))
                            );
                          }}
                          onRemove={(index) => setEditFields((prev) => prev.filter((_, i) => i !== index))}
                          onTypeChange={(index, type) => {
                            const newValidation: ValidationRule = {
                              required: false,
                              min: null,
                              max: null,
                              pattern: null,
                              patternError: null,
                              email: false,
                              url: false,
                            };
                            setEditFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      type: type as NewField["type"],
                                      options: [],
                                      validation: newValidation
                                    }
                                  : f
                              )
                            );
                          }}
                          onOptionsChange={(index, options) => {
                            setEditFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      options: options.split(",").map((opt: string) => opt.trim()).filter(Boolean),
                                    }
                                  : f
                              )
                            );
                          }}
                          onValidationChange={(index, validation) => {
                            setEditFields((prev) =>
                              prev.map((f, i) =>
                                i === index
                                  ? {
                                      ...f,
                                      validation: {
                                        ...f.validation,
                                        ...validation,
                                      },
                                    }
                                  : f
                              )
                            );
                          }}
                          expandedField={editExpandedField}
                          setExpandedField={setEditExpandedField}
                        />
                      ))}
                    </Stack>
                  </SortableContext>
                </DndContext>
                <Button
                  variant="light"
                  onClick={() => setEditFields((prev) => [...prev, { name: "", type: "text" }])}
                >
                  + Add Field
                </Button>
                <Group justify="flex-end">
                  <Button onClick={saveCollectionEdit}>Save Changes</Button>
                </Group>
              </Stack>
            </Modal>

            <Code block mt="xl">
              {JSON.stringify({ defaultRole, collections, roles }, null, 2)}
            </Code>
          </Stack>
        </Container>
      </Box>
    </PermissionGate>
  );
}
