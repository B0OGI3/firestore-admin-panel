// src/lib/hooks/useRolePermissions.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";

export function useRolePermissions() {

    type Permissions = {
        role: string;
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canManageRoles?: boolean;
      };
      
  const [permissions, setPermissions] = useState<Permissions | null>(null);
      
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data();
        const role = userData?.role ?? "viewer";

        const roleSnap = await getDoc(doc(db, "roles", role));
        const roleData = roleSnap.exists() ? roleSnap.data() : {};

        setPermissions({
          role,
          canView: roleData?.canView ?? false,
          canEdit: roleData?.canEdit ?? false,
          canDelete: roleData?.canDelete ?? false,
          canManageRoles: roleData?.canManageRoles ?? false,
        });
      } catch (err) {
        console.error("Failed to load role permissions", err);
        setPermissions({ role: "unknown", canView: false, canEdit: false, canDelete: false });
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { permissions, loading };
}
