import { useEffect, useState } from 'react';
import { Alert, Container, Stack, Title, Text, Button } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { auth, db } from '../firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

interface FirebaseErrorBoundaryProps {
  children: React.ReactNode;
}

export function FirebaseErrorBoundary({ children }: FirebaseErrorBoundaryProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkFirebaseConnection = async () => {
      try {
        // Test Firestore connection
        const docRef = doc(db, 'app_config', 'global');
        await getDoc(docRef);
        // Test Auth connection
        await auth.currentUser;
        setError(null);
      } catch (err) {
        console.error('Firebase connection error:', err);
        setError('Failed to connect to Firebase. Please check your configuration and internet connection.');
      } finally {
        setLoading(false);
      }
    };

    void checkFirebaseConnection();
  }, []);

  if (loading) {
    return null; // Let the app's loading state handle this
  }

  if (error) {
    return (
      <Container size="sm" py="xl">
        <Stack gap="md">
          <Title order={2}>Connection Error</Title>
          <Alert icon={<IconAlertCircle size="1rem" />} color="red" title="Firebase Connection Failed">
            <Text>{error}</Text>
            <Text mt="sm" size="sm">
              Please check:
            </Text>
            <ul>
              <li>Your internet connection</li>
              <li>Firebase configuration in .env.local</li>
              <li>Firebase project status</li>
            </ul>
            <Button
              mt="md"
              onClick={() => window.location.reload()}
              variant="light"
            >
              Retry Connection
            </Button>
          </Alert>
        </Stack>
      </Container>
    );
  }

  return <>{children}</>;
} 