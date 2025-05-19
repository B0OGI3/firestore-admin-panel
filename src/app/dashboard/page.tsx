"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import Link from "next/link";
import { Container, Stack, Title, Button, Center, Text } from "@mantine/core";
import { useRolePermissions } from "@/lib/hooks/useRolePermissions";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

export default function DashboardPage() {
  const [collections, setCollections] = useState<string[]>([]);
  const { permissions, loading } = useRolePermissions();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) router.replace("/login");
    });
    return unsubscribe;
  }, [router]);

  useEffect(() => {
    const loadCollections = async () => {
      const snap = await getDocs(collection(db, "config/collections/items"));
      const names: string[] = [];
      snap.forEach((doc) => names.push(doc.id));
      setCollections(names);
    };
    loadCollections();
  }, []);

  if (loading) {
    return (
      <Center h="100vh">
        <Text>Loading collections...</Text>
      </Center>
    );
  }

  if (!permissions?.canView) {
    return (
      <Center h="100vh">
        <Stack align="center">
          <Title order={2}>Access Denied</Title>
          <Text>You do not have permission to view collections.</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Container py="xl">
      <Title order={2} mb="lg">Firestore Collections</Title>
      <Stack>
        {collections.map((col) => (
          <Button key={col} component={Link} href={`/dashboard/${col}`} variant="light">
            {col}
          </Button>
        ))}
      </Stack>
    </Container>
  );
}
