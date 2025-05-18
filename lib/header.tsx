"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ActionIcon,
  Box,
  Container,
  Flex,
  Group,
  Text,
} from "@mantine/core";
import { IconArrowLeft, IconMoon, IconSun } from "@tabler/icons-react";
import { useThemeToggle } from "@/lib/theme";

export default function HeaderBar() {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = pathname?.startsWith("/dashboard/") && pathname !== "/dashboard";
  const { colorScheme, toggle } = useThemeToggle();

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
              <ActionIcon onClick={() => router.back()} variant="subtle" size="lg">
                <IconArrowLeft size={20} />
              </ActionIcon>
            )}
            <Text fw={600} size="lg">
              Firestore Admin Panel
            </Text>
          </Group>
          <ActionIcon
            onClick={toggle}
            variant="subtle"
            size="lg"
            title={`Switch to ${colorScheme === "light" ? "dark" : "light"} mode`}
          >
            {colorScheme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
          </ActionIcon>
        </Flex>
      </Container>
    </Box>
  );
}
