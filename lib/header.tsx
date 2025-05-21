"use client";

import { useRouter } from "next/navigation";
import {
  ActionIcon,
  Flex,
  Text,
  useMantineTheme,
  Button,
} from "@mantine/core";
import {
  IconHome,
  IconMoon,
  IconSun,
  IconLogout,
  IconHistory,
} from "@tabler/icons-react";
import { useThemeToggle } from "@/lib/theme";
import { auth } from "@/lib/firebaseConfig";
import { useAppTitle } from "./hooks/useAppTitle";
import { signOut } from "firebase/auth";
import PermissionGate from "@/lib/PermissionGate";

export default function HeaderBar(): JSX.Element {
  const router = useRouter();
  const theme = useMantineTheme();
  const { colorScheme, toggle } = useThemeToggle();
  const { title } = useAppTitle();

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Flex
      direction="column"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backgroundColor: colorScheme === "dark" ? theme.colors.dark[7] : theme.white,
      }}
    >
      <Flex
        align="center"
        justify="space-between"
        py={8}
        px="md"
        style={{
          borderBottom: `1px solid ${
            colorScheme === "dark" ? theme.colors.dark[4] : theme.colors.gray[3]
          }`,
        }}
      >
        <Flex align="center" gap="md">
          <ActionIcon
            variant="subtle"
            onClick={() => router.push("/dashboard")}
            size="sm"
          >
            <IconHome size={18} />
          </ActionIcon>
          <Text size="lg" fw={500}>
            {title}
          </Text>
        </Flex>

        <Flex align="center" gap="xs">
          <PermissionGate permission="canManageRoles" fallback={null}>
            <ActionIcon
              variant="subtle"
              onClick={() => router.push("/dashboard/changelog")}
              size="sm"
            >
              <IconHistory size={18} />
            </ActionIcon>
          </PermissionGate>
          <ActionIcon
            variant="subtle"
            onClick={toggle}
            size="sm"
          >
            {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>

          <Button
            variant="light"
            color="red"
            size="xs"
            px="xs"
            h={30}
            styles={{
              root: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }
            }}
            leftSection={<IconLogout size={14} />}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
