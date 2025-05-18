// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../lib/firebaseConfig";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (user) {
        router.push("/dashboard"); // redirect after login
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Firestore Admin Panel</h1>
      {!user ? (
        <button onClick={handleLogin}>Sign in with Google</button>
      ) : (
        <>
          <p>Welcome, {user.email}</p>
          <button onClick={handleLogout}>Sign out</button>
        </>
      )}
    </div>
  );
}
