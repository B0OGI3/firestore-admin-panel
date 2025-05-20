"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Title,
  Text,
  Card,
  SimpleGrid,
  Group,
  Stack,
  Paper,
  RingProgress,
  Center,
  Loader,
} from "@mantine/core";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";
import { useThemeToggle } from "@/lib/theme";
import { useMantineTheme } from "@mantine/core";
import {
  IconUsers,
  IconDatabase,
  IconActivity,
  IconChartBar,
} from "@tabler/icons-react";

interface CollectionStats {
  name: string;
  count: number;
  growth: number;
  lastUpdated: Date;
}

interface UserActivity {
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
}

interface StorageStats {
  totalSize: number;
  collections: { [key: string]: number };
}

interface QueryStats {
  totalQueries: number;
  averageResponseTime: number;
  slowQueries: number;
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [collectionStats, setCollectionStats] = useState<CollectionStats[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity>({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
  });
  const [storageStats, setStorageStats] = useState<StorageStats>({
    totalSize: 0,
    collections: {},
  });
  const [queryStats, setQueryStats] = useState<QueryStats>({
    totalQueries: 0,
    averageResponseTime: 0,
    slowQueries: 0,
  });
  const { permissions, loading: permissionsLoading } = useRolePermissions();
  const theme = useMantineTheme();
  const { colorScheme } = useThemeToggle();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Fetch collection stats
        const collections = await getDocs(collection(db, "config/collections/items"));
        const stats: CollectionStats[] = [];
        
        for (const col of collections.docs) {
          const collectionName = col.id;
          const docs = await getDocs(collection(db, collectionName));
          const now = new Date();
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          
          // Get growth in last 30 days
          const recentDocs = await getDocs(
            query(
              collection(db, collectionName),
              where("createdAt", ">=", Timestamp.fromDate(thirtyDaysAgo))
            )
          );

          stats.push({
            name: collectionName,
            count: docs.size,
            growth: recentDocs.size,
            lastUpdated: now,
          });
        }

        // Fetch user activity
        const users = await getDocs(collection(db, "users"));
        const activeUsers = await getDocs(
          query(
            collection(db, "users"),
            where("lastLogin", ">=", Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)))
          )
        );
        const newUsers = await getDocs(
          query(
            collection(db, "users"),
            where("createdAt", ">=", Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
          )
        );

        setUserActivity({
          totalUsers: users.size,
          activeUsers: activeUsers.size,
          newUsers: newUsers.size,
        });

        // Set collection stats
        setCollectionStats(stats);

        // Mock storage stats (in a real app, you'd need to use Firebase Admin SDK)
        setStorageStats({
          totalSize: 1024 * 1024 * 50, // 50MB example
          collections: stats.reduce((acc, stat) => ({
            ...acc,
            [stat.name]: Math.floor(Math.random() * 1024 * 1024 * 10), // Random size per collection
          }), {}),
        });

        // Mock query stats (in a real app, you'd need to use Firebase Admin SDK)
        setQueryStats({
          totalQueries: 1500,
          averageResponseTime: 120, // ms
          slowQueries: 45,
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching analytics:", error);
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading || permissionsLoading) {
    return (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    );
  }

  if (!permissions?.canView) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Title order={2}>Access Denied</Title>
          <Text>You do not have permission to view analytics.</Text>
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
    <Container size="xl" py="xl" style={{ minHeight: "100vh", background: bgColor }}>
      <Title order={1} mb="xl">Analytics Dashboard</Title>

      {/* User Activity Section */}
      <Card shadow="sm" radius="lg" withBorder p="xl" mb="xl" style={{ background: cardBg }}>
        <Title order={2} mb="md">User Activity</Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Paper withBorder p="md" radius="md">
            <Group>
              <IconUsers size={24} color={theme.colors.blue[6]} />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">Total Users</Text>
                <Title order={3}>{userActivity.totalUsers}</Title>
              </Stack>
            </Group>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group>
              <IconActivity size={24} color={theme.colors.green[6]} />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">Active Users (7d)</Text>
                <Title order={3}>{userActivity.activeUsers}</Title>
              </Stack>
            </Group>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group>
              <IconChartBar size={24} color={theme.colors.orange[6]} />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">New Users (30d)</Text>
                <Title order={3}>{userActivity.newUsers}</Title>
              </Stack>
            </Group>
          </Paper>
        </SimpleGrid>
      </Card>

      {/* Collection Growth Section */}
      <Card shadow="sm" radius="lg" withBorder p="xl" mb="xl" style={{ background: cardBg }}>
        <Title order={2} mb="md">Collection Growth</Title>
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
          {collectionStats.map((stat) => (
            <Paper key={stat.name} withBorder p="md" radius="md">
              <Stack gap="xs">
                <Text size="sm" c="dimmed">{stat.name}</Text>
                <Group justify="space-between">
                  <Title order={3}>{stat.count}</Title>
                  <Text size="sm" c="green">+{stat.growth} (30d)</Text>
                </Group>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Card>

      {/* Storage Usage Section */}
      <Card shadow="sm" radius="lg" withBorder p="xl" mb="xl" style={{ background: cardBg }}>
        <Title order={2} mb="md">Storage Usage</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Paper withBorder p="md" radius="md">
            <Stack align="center">
              <RingProgress
                size={120}
                thickness={12}
                roundCaps
                sections={[{ value: 65, color: 'blue' }]}
                label={
                  <Center>
                    <Text size="sm" fw={700}>
                      {Math.round(storageStats.totalSize / (1024 * 1024))}MB
                    </Text>
                  </Center>
                }
              />
              <Text size="sm" c="dimmed">Total Storage Used</Text>
            </Stack>
          </Paper>
          <Stack>
            {Object.entries(storageStats.collections).map(([name, size]) => (
              <Paper key={name} withBorder p="md" radius="md">
                <Group justify="space-between">
                  <Text>{name}</Text>
                  <Text>{Math.round(size / (1024 * 1024))}MB</Text>
                </Group>
              </Paper>
            ))}
          </Stack>
        </SimpleGrid>
      </Card>

      {/* Query Performance Section */}
      <Card shadow="sm" radius="lg" withBorder p="xl" style={{ background: cardBg }}>
        <Title order={2} mb="md">Query Performance</Title>
        <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
          <Paper withBorder p="md" radius="md">
            <Group>
              <IconDatabase size={24} color={theme.colors.blue[6]} />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">Total Queries</Text>
                <Title order={3}>{queryStats.totalQueries}</Title>
              </Stack>
            </Group>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group>
              <IconActivity size={24} color={theme.colors.green[6]} />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">Avg Response Time</Text>
                <Title order={3}>{queryStats.averageResponseTime}ms</Title>
              </Stack>
            </Group>
          </Paper>
          <Paper withBorder p="md" radius="md">
            <Group>
              <IconChartBar size={24} color={theme.colors.red[6]} />
              <Stack gap={0}>
                <Text size="sm" c="dimmed">Slow Queries</Text>
                <Title order={3}>{queryStats.slowQueries}</Title>
              </Stack>
            </Group>
          </Paper>
        </SimpleGrid>
      </Card>
    </Container>
  );
} 