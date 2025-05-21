import { Center, Loader, Stack, Text } from '@mantine/core';

interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({ message = 'Loading...' }: LoadingScreenProps) {
  return (
    <Center style={{ height: '100vh', width: '100%' }}>
      <Stack align="center" gap="md">
        <Loader size="lg" />
        <Text c="dimmed">{message}</Text>
      </Stack>
    </Center>
  );
} 