"use client";

import { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Paper,
  Button,
  Alert,
  Group,
} from "@mantine/core";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseConfig";
import { signOut } from "firebase/auth";
import { IconAlertCircle } from "@tabler/icons-react";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      router.push("/login");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Title order={2}>Security Settings</Title>

        {error && (
          <Alert icon={<IconAlertCircle size="1rem" />} color="red">
            {error}
          </Alert>
        )}

        <Paper p="md" withBorder>
          <Stack>
            <Title order={3}>Account Security</Title>
            <Text size="sm" c="dimmed">
              Manage your account security settings and authentication methods.
            </Text>
            <Group>
              <Button
                variant="light"
                color="red"
                onClick={handleSignOut}
                loading={loading}
              >
                Sign Out
              </Button>
            </Group>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
} 