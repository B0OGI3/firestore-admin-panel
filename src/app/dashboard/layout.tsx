"use client";

import { NavLink, Stack, Box } from "@mantine/core";
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
import { useMantineTheme } from "@mantine/core";
import PermissionGate from "@/lib/PermissionGate";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const theme = useMantineTheme();
  const { colorScheme } = useThemeToggle();

  const sidebarBg = colorScheme === "dark" 
    ? theme.colors.dark[7]
    : theme.colors.gray[0];

  return (
    <Box style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Fixed Sidebar */}
      <Box
        style={{
          width: 300,
          borderRight: '1px solid var(--mantine-color-gray-3)',
          padding: '1rem',
          position: 'fixed',
          top: 60, // Account for header height
          left: 0,
          bottom: 0,
          backgroundColor: sidebarBg,
          zIndex: 100,
        }}
      >
        <Stack>
          <NavLink
            component={Link}
            href="/dashboard"
            label="Dashboard"
            leftSection={<IconDashboard size="1.2rem" />}
            active={pathname === "/dashboard"}
          />
          <NavLink
            component={Link}
            href="/dashboard/analytics"
            label="Analytics"
            leftSection={<IconChartBar size="1.2rem" />}
            active={pathname === "/dashboard/analytics"}
          />
          <NavLink
            component={Link}
            href="/dashboard/changelog"
            label="Changelog"
            leftSection={<IconHistory size="1.2rem" />}
            active={pathname === "/dashboard/changelog"}
          />
          <NavLink
            component={Link}
            href="/dashboard/settings/security"
            label="Security"
            leftSection={<IconShieldLock size="1.2rem" />}
            active={pathname === "/dashboard/settings/security"}
          />
          <PermissionGate permission="canManageRoles" fallback={null}>
            <NavLink
              component={Link}
              href="/dashboard/settings"
              label="Settings"
              leftSection={<IconSettings size="1.2rem" />}
              active={pathname === "/dashboard/settings"}
            />
          </PermissionGate>
        </Stack>
      </Box>

      {/* Main Content with margin for sidebar */}
      <Box style={{ 
        flex: 1, 
        padding: '1rem', 
        marginTop: 60, // Account for header height
        marginLeft: 300, // Account for sidebar width
      }}>
        {children}
      </Box>
    </Box>
  );
} 