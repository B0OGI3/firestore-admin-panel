"use client";

import { NavLink, Stack, Box, Drawer, useMantineTheme } from "@mantine/core";
import { useMediaQuery } from '@mantine/hooks';
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  IconDashboard,
  IconSettings,
  IconChartBar,
  IconShieldLock,
  IconHistory,
} from "@tabler/icons-react";
import { useThemeToggle } from "@/lib/theme";
import PermissionGate from "@/lib/PermissionGate";
import { useState } from "react";
import HeaderBar from "@/lib/header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const theme = useMantineTheme();
  const { colorScheme } = useThemeToggle();
  const [opened, setOpened] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const sidebarBg = colorScheme === "dark" 
    ? theme.colors.dark[7]
    : theme.colors.gray[0];

  const sidebarContent = (
    <Stack>
      <NavLink
        component={Link}
        href="/dashboard"
        label="Dashboard"
        leftSection={<IconDashboard size="1.2rem" />}
        active={pathname === "/dashboard"}
        onClick={() => setOpened(false)}
      />
      <NavLink
        component={Link}
        href="/dashboard/analytics"
        label="Analytics"
        leftSection={<IconChartBar size="1.2rem" />}
        active={pathname === "/dashboard/analytics"}
        onClick={() => setOpened(false)}
      />
      <PermissionGate permission="canManageRoles" fallback={null}>
        <NavLink
          component={Link}
          href="/dashboard/changelog"
          label="Changelog"
          leftSection={<IconHistory size="1.2rem" />}
          active={pathname === "/dashboard/changelog"}
          onClick={() => setOpened(false)}
        />
      </PermissionGate>
      <NavLink
        component={Link}
        href="/dashboard/settings/security"
        label="Security"
        leftSection={<IconShieldLock size="1.2rem" />}
        active={pathname === "/dashboard/settings/security"}
        onClick={() => setOpened(false)}
      />
      <PermissionGate permission="canManageRoles" fallback={null}>
        <NavLink
          component={Link}
          href="/dashboard/settings"
          label="Settings"
          leftSection={<IconSettings size="1.2rem" />}
          active={pathname === "/dashboard/settings"}
          onClick={() => setOpened(false)}
        />
      </PermissionGate>
    </Stack>
  );

  return (
    <Box style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Header with Burger Menu */}
      <Box style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <HeaderBar burgerOpened={opened} onBurgerClick={() => setOpened(!opened)} />
      </Box>

      {/* Mobile Drawer */}
      {isMobile ? (
        <Drawer
          opened={opened}
          onClose={() => setOpened(false)}
          size="100%"
          padding="md"
          title="Navigation"
          zIndex={1002}
        >
          {sidebarContent}
        </Drawer>
      ) : (
        /* Desktop Sidebar */
        <Box
          style={{
            width: 300,
            borderRight: '1px solid var(--mantine-color-gray-3)',
            padding: '1rem',
            position: 'fixed',
            top: 60,
            left: 0,
            bottom: 0,
            backgroundColor: sidebarBg,
            zIndex: 100,
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Main Content */}
      <Box style={{ 
        flex: 1, 
        padding: '1rem', 
        marginTop: 60,
        marginLeft: isMobile ? 0 : 300,
        width: '100%',
        overflowX: 'auto',
      }}>
        {children}
      </Box>
    </Box>
  );
} 