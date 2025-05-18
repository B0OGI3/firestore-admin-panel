"use client";

import { ReactNode } from "react";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";
import { Loader, Center, Text, Stack, Title } from "@mantine/core";

type PermissionGateProps = {
  permission: string;
  not?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
};

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

  const hasPermission = permissions ? !!permissions[permission as keyof typeof permissions] : false;
  const shouldRender = not ? !hasPermission : hasPermission;

  if (!shouldRender) {
    return fallback || (
      <Center h="100%">
        <Stack align="center">
          <Title order={3}>Access Denied</Title>
          <Text>You do not have permission: <code>{permission}</code></Text>
        </Stack>
      </Center>
    );
  }

  return <>{children}</>;
}
