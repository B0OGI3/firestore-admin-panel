"use client";
import { useEffect, useState, useCallback } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import Link from "next/link";
import {
  Container,
  Title,
  Text,
  Card,
  SimpleGrid,
  Group,
  Center,
  Stack,
  Avatar,
  Box,
  useMantineTheme,
} from "@mantine/core";
import { IconDatabase, IconFolder } from "@tabler/icons-react";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { useThemeToggle } from "@/lib/theme";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const LS_KEY = "dashboard-collection-order";

function DraggableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
      tabIndex={0}
    >
      {children}
    </div>
  );
}

export default function DashboardPage() {
  const [collections, setCollections] = useState<string[]>([]);
  const { permissions, loading } = useRolePermissions();
  const router = useRouter();
  const theme = useMantineTheme();
  const { colorScheme } = useThemeToggle();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    const loadCollections = async () => {
      const snap = await getDocs(collection(db, "config/collections/items"));
      const names: string[] = [];
      snap.forEach((doc) => names.push(doc.id));
      // Try to load order from localStorage
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        try {
          const parsed: string[] = JSON.parse(stored);
          // Only keep collections that still exist
          const filtered = parsed.filter((id) => names.includes(id));
          // Add any new collections to the end
          const missing = names.filter((id) => !filtered.includes(id));
          setCollections([...filtered, ...missing]);
          return;
        } catch (error) {
          // Invalid JSON in localStorage, ignore and use default order
          console.warn('Invalid collection order in localStorage:', error);
        }
      }
      setCollections(names);
    };
    loadCollections();
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setCollections((items) => {
        const oldIndex = items.indexOf(String(active.id));
        const newIndex = items.indexOf(String(over?.id));
        const newOrder = arrayMove(items, oldIndex, newIndex);
        localStorage.setItem(LS_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  if (loading) {
    return (
      <Center h="100vh">
        <Text>Loading collections...</Text>
      </Center>
    );
  }

  if (!permissions?.canView) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Title order={2}>Access Denied</Title>
          <Text>You do not have permission to view collections.</Text>
        </Stack>
      </Center>
    );
  }

  // Theme-aware background
  const bgColor = colorScheme === "dark"
    ? theme.colors.dark[7]
    : "linear-gradient(135deg, #e3f0ff 0%, #f8fbff 100%)";
  const cardBg = colorScheme === "dark"
    ? theme.colors.dark[6]
    : theme.white;

  return (
    <Box style={{ minHeight: "100vh", background: bgColor }}>
      <Container py="xl" size="lg">
        <Stack align="center" mb="xl">
          <Title order={1} style={{ fontWeight: 800, fontSize: 32, letterSpacing: -1 }}>Dashboard</Title>
          <Text size="lg" c="dimmed" ta="center">
            Manage your Firestore collections below
          </Text>
        </Stack>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={collections} strategy={verticalListSortingStrategy}>
            <SimpleGrid
              cols={{ base: 1, sm: 1, md: 2, lg: 3 }}
              spacing="xl"
              verticalSpacing="xl"
            >
              {collections.map((col) => (
                <DraggableCard key={col} id={col}>
                  <Card
                    component={Link}
                    href={`/dashboard/${col}`}
                    shadow="md"
                    radius="lg"
                    withBorder
                    style={{
                      transition: "box-shadow 0.2s",
                      cursor: "pointer",
                      minHeight: 160,
                      background: cardBg,
                    }}
                    tabIndex={0}
                  >
                    <Group align="center" gap="xl" p="md">
                      <Avatar color="blue" radius="md" size={48}>
                        {col === "users" ? <IconFolder size={32} /> : <IconDatabase size={32} />}
                      </Avatar>
                      <Stack gap={4}>
                        <Title order={3} size="h3" style={{ fontWeight: 700 }}>{col.charAt(0).toUpperCase() + col.slice(1)}</Title>
                        <Text size="md" c="dimmed">
                          {col === "users" ? "User accounts" : "Collection"}
                        </Text>
                      </Stack>
                    </Group>
                  </Card>
                </DraggableCard>
              ))}
            </SimpleGrid>
          </SortableContext>
        </DndContext>
      </Container>
    </Box>
  );
}
