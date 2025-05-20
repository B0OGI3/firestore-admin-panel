"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Container,
  Title,
  TextInput,
  Button,
  Text,
  Stack,
  Paper,
  Box,
  ActionIcon,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebaseConfig";
import { useThemeToggle } from "@/lib/theme";
import { IconSun, IconMoon } from "@tabler/icons-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { colorScheme, toggle } = useThemeToggle();

  const form = useForm({
    initialValues: {
      email: "",
    },
    validate: {
      email: (value: string) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
    },
  });

  const handlePasswordReset = async (values: typeof form.values) => {
    setLoading(true);
    setError("");
    try {
      await sendPasswordResetEmail(auth, values.email);
      setSuccess(true);
    } catch (error: unknown) {
      const firebaseError = error as { code: string; message: string };
      setError(firebaseError.message);
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
                Reset Password
              </Title>
              <Text c={colorScheme === "dark" ? "dimmed" : "blue.6"} size="sm" ta="center" fw={400} mb={8} style={{ opacity: 0.85 }}>
                Enter your email address and we&apos;ll send you a link to reset your password
              </Text>
            </div>

            {success ? (
              <Stack gap={18}>
                <Text c="green" size="sm" ta="center">
                  Password reset email sent! Please check your inbox.
                </Text>
                <Button
                  onClick={() => router.push("/login")}
                  radius="md"
                  fullWidth
                  size="md"
                  variant={colorScheme === "dark" ? "filled" : "light"}
                  color="blue"
                >
                  Back to Login
                </Button>
              </Stack>
            ) : (
              <form onSubmit={form.onSubmit(handlePasswordReset)}>
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

                  {error && (
                    <Text c="red" size="sm" ta="center">
                      {error}
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
                    Send Reset Link
                  </Button>

                  <Text ta="center" mt={8} size="sm" c={colorScheme === "dark" ? "gray.5" : "blue.7"}>
                    Remember your password?{" "}
                    <span
                      style={{ cursor: 'pointer', textDecoration: 'underline', fontWeight: 500 }}
                      onClick={() => router.push("/login")}
                    >
                      Sign in
                    </span>
                  </Text>
                </Stack>
              </form>
            )}
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
} 