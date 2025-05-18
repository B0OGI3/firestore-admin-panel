"use client";

import { useState, useEffect } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import {
  getDocs,
  doc,
  setDoc,
  getDoc,
  collection,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import { useRouter } from "next/navigation";
import {
  TextInput,
  Button,
  Paper,
  Stack,
  Title,
  Group,
  Text,
  Container,
} from "@mantine/core";

export default function LoginPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        router.replace("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  const ensureUserInFirestore = async (user: User) => {
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);

    if (!docSnap.exists()) {
      const usersSnap = await getDocs(collection(db, "users"));
      const isFirstUser = usersSnap.empty;

      await setDoc(
        userRef,
        {
          email: user.email,
          name: user.displayName ?? "",
          role: isFirstUser ? "admin" : "viewer",
        },
        { merge: true }
      );
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await ensureUserInFirestore(result.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEmailAuth = async () => {
    try {
      let result;
      if (mode === "signup") {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }

      await ensureUserInFirestore(result.user);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    setError("");
  };

  return (
    <Container size={420} my="xl">
      <Title ta="center" mb="lg">
        Firestore Admin Panel
      </Title>

      <Paper withBorder shadow="md" p={30} radius="md">
        <Stack>
          <TextInput
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
          />
          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          <Button onClick={handleEmailAuth}>
            {mode === "signup" ? "Sign Up" : "Sign In"}
          </Button>
          <Button variant="light" onClick={handleGoogleLogin}>
            Sign in with Google
          </Button>
        </Stack>

        {error && (
          <Text c="red" mt="md" size="sm">
            {error}
          </Text>
        )}

        <Group justify="center" mt="md">
          <Text size="sm">
            {mode === "signup"
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <Button variant="subtle" size="sm" onClick={toggleMode}>
              {mode === "signup" ? "Log In" : "Sign Up"}
            </Button>
          </Text>
        </Group>
      </Paper>
    </Container>
  );
}
