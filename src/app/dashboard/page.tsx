"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import Link from "next/link";
import { Container, Stack, Title, Button } from "@mantine/core";

export default function DashboardPage() {
  const [collections, setCollections] = useState<string[]>([]);

  useEffect(() => {
    const loadCollections = async () => {
      const snap = await getDocs(collection(db, "config/collections/items"));
      const names: string[] = [];
      snap.forEach((doc) => names.push(doc.id));
      setCollections(names);
    };
    loadCollections();
  }, []);

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
