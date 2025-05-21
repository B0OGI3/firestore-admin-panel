"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Text,
  Stack,
  Divider,
  Paper,
  Box,
  ActionIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  User,
  sendEmailVerification,
} from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { useAppTitle } from "@/lib/hooks/useAppTitle";
import { useThemeToggle } from "@/lib/theme";
import { IconSun, IconMoon } from "@tabler/icons-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendSuccess, setResendSuccess] = useState(false);
  const { title } = useAppTitle();
  const { colorScheme, toggle } = useThemeToggle();
  const [isSignUp, setIsSignUp] = useState(false);

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value: string) => (value.length < 6 ? "Password must be at least 6 characters" : null),
    },
  });

  const ensureUserInFirestore = async (user: User) => {
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // Get the default role from app_config/global
      const configRef = doc(db, "app_config", "global");
      const configDoc = await getDoc(configRef);
      const defaultRole = configDoc.exists() ? configDoc.data().defaultRole : "viewer";

      await setDoc(userRef, {
        email: user.email,
        displayName: user.displayName || user.email,
        role: defaultRole,
        createdAt: new Date().toISOString(),
      });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError("");
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserInFirestore(result.user);
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error('Error in handleGoogleLogin:', error);
      const firebaseError = error as { code: string; message: string };
      setError(firebaseError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (values: typeof form.values) => {
    setLoading(true);
    setError("");
    try {
      if (isSignUp) {
        // Sign up mode
        const result = await createUserWithEmailAndPassword(auth, values.email, values.password);
        await ensureUserInFirestore(result.user);
        
        // Send verification email
        await sendEmailVerification(result.user);
        
        // Sign out the user until they verify their email
        await auth.signOut();
        setError("Please check your email (and spam/junk folder) to verify your account before signing in.");
        setIsSignUp(false);
      } else {
        // Sign in mode
        const result = await signInWithEmailAndPassword(auth, values.email, values.password);
        
        // Check if email is verified
        if (!result.user.emailVerified) {
          await auth.signOut();
          setError("Please verify your email before signing in. Check your inbox and spam/junk folder for the verification link.");
          return;
        }
        
        await ensureUserInFirestore(result.user);
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const firebaseError = error as { code: string; message: string };
      console.error('Firebase auth error:', firebaseError);
      
      // Handle specific error cases
      switch (firebaseError.code) {
        case 'auth/invalid-credential':
          setError("Invalid email or password. Please check your credentials.");
          break;
        case 'auth/email-already-in-use':
          setError("This email is already registered. Please sign in instead.");
          break;
        case 'auth/weak-password':
          setError("Password is too weak. Please use a stronger password.");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address. Please check your email format.");
          break;
        case 'auth/operation-not-allowed':
          setError("Email/password accounts are not enabled. Please contact support.");
          break;
        default:
          setError(firebaseError.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setLoading(true);
    setError("");
    setResendSuccess(false);
    try {
      const email = form.values.email;
      if (!email) {
        setError("Please enter your email address");
        return;
      }
      
      // Try to sign in to get the user object
      const result = await signInWithEmailAndPassword(auth, email, form.values.password);
      if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
        setResendSuccess(true);
        setError("");
      } else {
        setError("Your email is already verified. Please sign in.");
      }
      // Sign out after sending verification
      await auth.signOut();
    } catch (error: unknown) {
      const firebaseError = error as { code: string; message: string };
      if (firebaseError.code === 'auth/user-not-found') {
        setError("No account found with this email. Please sign up first.");
      } else {
        setError(firebaseError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colorScheme === "dark"
          ? "linear-gradient(135deg, var(--mantine-color-dark-7) 0%, var(--mantine-color-dark-8) 100%)"
          : "linear-gradient(135deg, #f8fbff 0%, #e3f0ff 100%)",
        position: "relative",
      }}
    >
      {/* Light/Dark mode toggle in top-right */}
      <ActionIcon
        onClick={toggle}
        size="lg"
        variant="subtle"
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 10,
          background: colorScheme === "dark" ? "rgba(30,30,30,0.7)" : "rgba(255,255,255,0.7)",
          border: colorScheme === "dark" ? "1px solid #222" : "1px solid #e3eaf5",
          boxShadow: "0 2px 8px #0001",
          transition: "background 0.2s, border 0.2s",
        }}
        aria-label={colorScheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      >
        {colorScheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
      </ActionIcon>
      <Container size="xs" py={0}>
        <Paper
          radius={32}
          p={36}
          withBorder
          shadow="xl"
          style={{
            backdropFilter: "blur(8px)",
            backgroundColor: colorScheme === "dark"
              ? "rgba(30, 30, 30, 0.92)"
              : "rgba(255, 255, 255, 0.97)",
            border: colorScheme === "dark" ? undefined : "1px solid #e3eaf5",
          }}
        >
          <Stack gap={32}>
            <div>
              <Title order={1} ta="center" fw={900} size={32} style={{ letterSpacing: -1, color: colorScheme === "dark" ? undefined : "#2563eb", marginBottom: 10 }}>
                {isSignUp ? `Create your account` : title}
              </Title>
              <Text c={colorScheme === "dark" ? "dimmed" : "blue.6"} size="sm" ta="center" fw={400} mb={8} style={{ opacity: 0.85 }}>
                {isSignUp ? "Sign up to get started with Firestore Admin Panel" : "👋 Welcome! Sign in to manage your Firestore data"}
              </Text>
            </div>

            <form onSubmit={form.onSubmit(handleEmailAuth)}>
              <Stack gap={18}>
                <TextInput
                  required
                  label="Email"
                  placeholder="hello@example.com"
                  radius={20}
                  size="md"
                  styles={{ input: { background: colorScheme === "dark" ? undefined : "#f4f8ff", borderRadius: 20 } }}
                  withAsterisk={false}
                  {...form.getInputProps("email")}
                />

                <PasswordInput
                  required
                  label="Password"
                  placeholder="Your password"
                  radius={20}
                  size="md"
                  styles={{ input: { background: colorScheme === "dark" ? undefined : "#f4f8ff", borderRadius: 20 } }}
                  withAsterisk={false}
                  {...form.getInputProps("password")}
                />

                <Text
                  size="sm"
                  c={colorScheme === "dark" ? "blue.4" : "blue.6"}
                  ta="right"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push("/forgot-password")}
                >
                  Forgot password?
                </Text>

                {error && (
                  <Text c="red" size="sm" ta="center">
                    {error}
                  </Text>
                )}

                {resendSuccess && (
                  <Text c="green" size="sm" ta="center">
                    Verification email sent! Please check your inbox and spam/junk folder.
                  </Text>
                )}

                <Button
                  type="submit"
                  radius="md"
                  loading={loading}
                  fullWidth
                  size="md"
                  mt="md"
                  variant={colorScheme === "dark" ? "filled" : "light"}
                  color="blue"
                >
                  {isSignUp ? "Sign up" : "Sign in"}
                </Button>

                {!isSignUp && error && error.includes("verify your email") && (
                  <Button
                    variant="subtle"
                    color="blue"
                    fullWidth
                    size="sm"
                    onClick={handleResendVerification}
                    loading={loading}
                  >
                    Resend verification email
                  </Button>
                )}
              </Stack>
            </form>

            <Divider label="Or" labelPosition="center" color={colorScheme === "dark" ? "gray" : "blue"} my={18} />

            <Button
              variant={colorScheme === "dark" ? "light" : "default"}
              leftSection={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_993_771)">
                    <path d="M19.805 10.2305C19.805 9.55078 19.7484 8.86719 19.6266 8.19922H10.2V12.0508H15.6406C15.4156 13.2812 14.6734 14.332 13.6266 15.0297V17.2797H16.605C18.3484 15.6797 19.805 13.2305 19.805 10.2305Z" fill="#4285F4"/>
                    <path d="M10.2 20C12.7 20 14.7984 19.1797 16.605 17.2797L13.6266 15.0297C12.6484 15.6897 11.4984 16.0703 10.2 16.0703C7.79844 16.0703 5.74844 14.4609 4.99844 12.3203H1.90503V14.6406C3.70156 17.8828 6.74844 20 10.2 20Z" fill="#34A853"/>
                    <path d="M4.99844 12.3203C4.79844 11.6602 4.68438 10.9609 4.68438 10.25C4.68438 9.53906 4.79844 8.83984 4.99844 8.17969V5.85938H1.90503C1.29844 7.08984 1 8.42969 1 10.25C1 12.0703 1.29844 13.4102 1.90503 14.6406L4.99844 12.3203Z" fill="#FBBC05"/>
                    <path d="M10.2 4.42969C11.6016 4.42969 12.8641 4.91016 13.8453 5.83984L16.675 3.07031C14.7984 1.32031 12.7 0.5 10.2 0.5C6.74844 0.5 3.70156 2.61719 1.90503 5.85938L4.99844 8.17969C5.74844 6.03906 7.79844 4.42969 10.2 4.42969Z" fill="#EA4335"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_993_771">
                      <rect width="20" height="20" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
              }
              onClick={handleGoogleLogin}
              loading={loading}
              fullWidth
              size="md"
              radius={20}
              style={colorScheme === "dark"
                ? undefined
                : {
                    background: "#fff",
                    border: "1px solid #e3eaf5",
                    color: "#2563eb",
                    fontWeight: 600,
                    transition: "box-shadow 0.15s, border 0.15s",
                  }
              }
              onMouseOver={e => {
                if (colorScheme !== "dark") {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px #e3eaf5";
                  (e.currentTarget as HTMLButtonElement).style.border = "1.5px solid #b6c6e3";
                }
              }}
              onMouseOut={e => {
                if (colorScheme !== "dark") {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLButtonElement).style.border = "1px solid #e3eaf5";
                }
              }}
            >
              Continue with Google
            </Button>
            <Text ta="center" mt={8} size="sm" c={colorScheme === "dark" ? "gray.5" : "blue.7"}>
              {isSignUp ? (
                <>
                  Already have an account?{' '}
                  <span
                    style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
                    onClick={() => { setIsSignUp(false); setError(""); }}
                  >
                    Sign in
                  </span>
                </>
              ) : (
                <>
                  Don&apos;t have an account?{' '}
                  <span
                    style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
                    onClick={() => { setIsSignUp(true); setError(""); }}
                  >
                    Sign up
                  </span>
                </>
              )}
            </Text>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
