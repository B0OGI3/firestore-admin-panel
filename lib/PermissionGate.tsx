"use client";

import { ReactNode } from "react";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";
import { Loader, Center, Text, Stack, Title } from "@mantine/core";

/**
 * A component that conditionally renders its children based on user permissions.
 * This component works in conjunction with the useRolePermissions hook to
 * implement role-based access control (RBAC) in the UI.
 * 
 * @component
 * @example
 * ```tsx
 * // Basic usage
 * <PermissionGate permission="canEdit">
 *   <EditButton />
 * </PermissionGate>
 * 
 * // With fallback content
 * <PermissionGate 
 *   permission="canDelete" 
 *   fallback={<DisabledButton />}
 * >
 *   <DeleteButton />
 * </PermissionGate>
 * 
 * // Inverse permission check
 * <PermissionGate permission="canEdit" not>
 *   <ReadOnlyView />
 * </PermissionGate>
 * ```
 */

/**
 * Props for the PermissionGate component
 */
type PermissionGateProps = {
  /** The permission to check for */
  permission: string;
  /** Invert the permission check */
  not?: boolean;
  /** Content to render when permission check passes */
  children: ReactNode;
  /** Content to render when permission check fails */
  fallback?: ReactNode;
  /** Content to render while permissions are loading */
  loadingFallback?: ReactNode;
};

/**
 * PermissionGate Component
 * 
 * Renders its children only if the current user has the specified permission.
 * Uses the useRolePermissions hook to check permissions.
 */
export default function PermissionGate({
  permission,
  not = false,
  children,
  fallback = null,
  loadingFallback = (
    <Center h="100%">
      <Loader />
    </Center>
  ),
}: PermissionGateProps) {
  const { permissions, loading } = useRolePermissions();

  if (loading) return loadingFallback;

  // Always grant access to admin users
  if (permissions?.role === 'admin') {
    return <>{children}</>;
  }

  // Check if the user has the required permission
  const hasPermission = permissions ? !!permissions[permission as keyof typeof permissions] : false;
  const shouldRender = not ? !hasPermission : hasPermission;

  if (!shouldRender) {
    return fallback || (
      <Center h="100%">
        <Stack align="center" gap="xs">
          <Title order={3}>Access Denied</Title>
          <Text>You do not have permission: <code>{permission}</code></Text>
          <Text size="sm" c="dimmed">Current role: {permissions?.role ?? 'Unknown'}</Text>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}
