import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { getDoc, doc } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

type Permissions = Record<string, boolean>;

export function useRolePermissions() {
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleMissing, setRoleMissing] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user: User | null) => {
      setLoading(true);
      setError(null);
      setRoleMissing(false);

      try {
        if (!user) {
          setRole(null);
          setPermissions({});
          setLoading(false);
          return;
        }

        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        let userRole = userSnap.data()?.role;

        // Fallback to global.defaultRole if none set
        if (!userRole) {
          const globalSnap = await getDoc(doc(db, "app_config", "global"));
          userRole = globalSnap.data()?.defaultRole || "viewer";
          setRoleMissing(true);
        }

        setRole(userRole);

        const roleSnap = await getDoc(doc(db, "roles", userRole));
        if (!roleSnap.exists()) {
          setPermissions({});
          setError(`Role "${userRole}" not found.`);
        } else {
          setPermissions(roleSnap.data() as Permissions);
        }
      } catch (err: any) {
        setError("Failed to load role permissions.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { role, permissions, loading, error, roleMissing };
}
