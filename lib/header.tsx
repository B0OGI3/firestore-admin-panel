"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ActionIcon,
  Box,
  Container,
  Flex,
  Group,
  Text,
  Button,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconMoon,
  IconSun,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { useThemeToggle } from "@/lib/theme";
import PermissionGate from "@/lib/PermissionGate";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";

export default function HeaderBar(): JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = pathname?.startsWith("/dashboard/") && pathname !== "/dashboard";
  const { colorScheme, toggle } = useThemeToggle();

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (error) {
      // Error handling is managed by Firebase Auth
      router.replace("/login");
    }
  };

  return (
    <Box
      component="header"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderBottom: "1px solid var(--mantine-color-gray-4)",
        backgroundColor: "var(--mantine-color-body)",
      }}
      py="sm"
    >
      <Container size="xl">
        <Flex justify="space-between" align="center">
          <Group>
            {showBack && (
              <ActionIcon
                onClick={() => void router.back()}
                variant="subtle"
                size="lg"
                title="Go back"
              >
                <IconArrowLeft size={20} />
              </ActionIcon>
            )}
            <Text fw={600} size="lg">
              Firestore Admin Panel
            </Text>
          </Group>

          <Group gap="xs">
            <PermissionGate permission="canManageRoles">
              <Button
                variant="light"
                size="xs"
                leftSection={<IconSettings size={16} />}
                onClick={() => void router.push("/dashboard/settings")}
              >
                Config
              </Button>
            </PermissionGate>

            <ActionIcon
              onClick={() => void toggle()}
              variant="subtle"
              size="lg"
              title={`Switch to ${colorScheme === "light" ? "dark" : "light"} mode`}
            >
              {colorScheme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
            </ActionIcon>

            <ActionIcon
              onClick={() => void handleLogout()}
              variant="subtle"
              size="lg"
              title="Sign out"
              color="red"
            >
              <IconLogout size={18} />
            </ActionIcon>
          </Group>
        </Flex>
      </Container>
    </Box>
  );
}
