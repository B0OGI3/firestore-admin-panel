"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Paper,
  Table,
  Text,
  Badge,
  Stack,
  Group,
  ActionIcon,
  Tooltip,
  Modal,
  ScrollArea,
  Code,
  Center,
  Loader,
  Select,
  TextInput,
  Button,
} from "@mantine/core";
import { IconEye, IconFilter, IconX } from "@tabler/icons-react";
import { ChangelogService } from "@/lib/services/changelog";
import type { ChangelogEntry } from "@/types";
import { formatDistanceToNow } from "date-fns";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";

export default function ChangelogPage() {
  const { permissions, loading: permissionsLoading } = useRolePermissions();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<ChangelogEntry | null>(null);
  const [collections, setCollections] = useState<string[]>([]);
  const [users, setUsers] = useState<string[]>([]);
  
  // Filter states
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const recentEntries = await ChangelogService.getRecentEntries();
      setEntries(recentEntries);
      
      // Extract unique collections and users, ensuring they are strings and not empty
      const uniqueCollections = Array.from(new Set(recentEntries
        .map(e => e.collection)
        .filter(Boolean) // Remove null/undefined/empty values
      ));
      const uniqueUsers = Array.from(new Set(recentEntries
        .map(e => e.userEmail)
        .filter(Boolean) // Remove null/undefined/empty values
      ));
      
      setCollections(uniqueCollections);
      setUsers(uniqueUsers);
    } catch (error) {
      console.error("Failed to load changelog entries:", error);
      // Set empty arrays on error to prevent undefined data
      setCollections([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: ChangelogEntry["action"]) => {
    switch (action) {
      case "create":
        return "green";
      case "update":
        return "blue";
      case "delete":
        return "red";
      default:
        return "gray";
    }
  };

  const formatChanges = (changes: ChangelogEntry["changes"]) => {
    if (!changes.before && !changes.after) return "No changes recorded";
    
    const before = changes.before ? JSON.stringify(changes.before, null, 2) : "{}";
    const after = changes.after ? JSON.stringify(changes.after, null, 2) : "{}";
    
    return (
      <Stack gap="xs">
        {changes.before && (
          <>
            <Text size="sm" fw={500}>Before:</Text>
            <Code block>{before}</Code>
          </>
        )}
        {changes.after && (
          <>
            <Text size="sm" fw={500}>After:</Text>
            <Code block>{after}</Code>
          </>
        )}
      </Stack>
    );
  };

  const clearFilters = () => {
    setSelectedCollection(null);
    setSelectedUser(null);
    setSelectedAction(null);
    setSearchQuery("");
  };

  const filteredEntries = entries
    .filter(entry => {
      // Collection filter
      if (selectedCollection && entry.collection !== selectedCollection) return false;
      
      // User filter
      if (selectedUser && entry.userEmail !== selectedUser) return false;
      
      // Action filter
      if (selectedAction && entry.action !== selectedAction) return false;
      
      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          entry.collection.toLowerCase().includes(query) ||
          entry.documentId.toLowerCase().includes(query) ||
          entry.userEmail.toLowerCase().includes(query) ||
          JSON.stringify(entry.changes).toLowerCase().includes(query)
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  if (permissionsLoading) {
    return (
      <Center h="100vh">
        <Loader size="sm" />
      </Center>
    );
  }

  if (!permissions?.role || permissions.role !== 'admin') {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Title order={2}>Access Denied</Title>
          <Text>Only administrators can access the changelog.</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Title order={2}>Changelog</Title>

        <Paper withBorder p="md">
          <Stack gap="md">
            <Group justify="space-between">
              <Text fw={500}>Filters</Text>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<IconX size={14} />}
                onClick={clearFilters}
              >
                Clear Filters
              </Button>
            </Group>
            
            <Group grow>
              <Select
                label="Collection"
                placeholder="Filter by collection"
                value={selectedCollection}
                onChange={setSelectedCollection}
                data={collections.length > 0 ? collections.map(c => ({ value: c, label: c })) : []}
                clearable
              />
              <Select
                label="User"
                placeholder="Filter by user email"
                value={selectedUser}
                onChange={setSelectedUser}
                data={users.length > 0 ? users.map(u => ({ value: u, label: u })) : []}
                clearable
              />
              <Select
                label="Action"
                placeholder="Filter by action"
                value={selectedAction}
                onChange={setSelectedAction}
                data={[
                  { value: "create", label: "Create" },
                  { value: "update", label: "Update" },
                  { value: "delete", label: "Delete" }
                ]}
                clearable
              />
            </Group>
            
            <Group grow>
              <TextInput
                label="Search"
                placeholder="Search in all fields..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                leftSection={<IconFilter size={14} />}
              />
            </Group>
          </Stack>
        </Paper>

        <Paper withBorder>
          <ScrollArea>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Time</Table.Th>
                  <Table.Th>User</Table.Th>
                  <Table.Th>Action</Table.Th>
                  <Table.Th>Collection</Table.Th>
                  <Table.Th>Document ID</Table.Th>
                  <Table.Th>Changes</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {loading ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Center>
                        <Loader size="sm" />
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                ) : filteredEntries.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={6}>
                      <Text c="dimmed" ta="center">No changes found</Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  filteredEntries.map((entry) => (
                    <Table.Tr key={entry.id}>
                      <Table.Td>
                        {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                      </Table.Td>
                      <Table.Td>{entry.userEmail}</Table.Td>
                      <Table.Td>
                        <Badge color={getActionColor(entry.action)}>
                          {entry.action}
                        </Badge>
                      </Table.Td>
                      <Table.Td>{entry.collection}</Table.Td>
                      <Table.Td>{entry.documentId}</Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Tooltip label="View Changes">
                            <ActionIcon
                              variant="subtle"
                              color="blue"
                              onClick={() => setSelectedEntry(entry)}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Paper>
      </Stack>

      <Modal
        opened={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title="Change Details"
        size="lg"
      >
        {selectedEntry && (
          <Stack gap="md">
            <Group>
              <Text size="sm" fw={500}>Action:</Text>
              <Badge color={getActionColor(selectedEntry.action)}>
                {selectedEntry.action}
              </Badge>
            </Group>
            <Group>
              <Text size="sm" fw={500}>Collection:</Text>
              <Text size="sm">{selectedEntry.collection}</Text>
            </Group>
            <Group>
              <Text size="sm" fw={500}>Document ID:</Text>
              <Text size="sm">{selectedEntry.documentId}</Text>
            </Group>
            <Group>
              <Text size="sm" fw={500}>User:</Text>
              <Text size="sm">{selectedEntry.userEmail}</Text>
            </Group>
            <Group>
              <Text size="sm" fw={500}>Time:</Text>
              <Text size="sm">
                {new Date(selectedEntry.timestamp).toLocaleString()}
              </Text>
            </Group>
            <Text size="sm" fw={500}>Changes:</Text>
            {formatChanges(selectedEntry.changes)}
          </Stack>
        )}
      </Modal>
    </Container>
  );
} 