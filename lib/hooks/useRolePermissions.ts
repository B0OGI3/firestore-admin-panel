// src/lib/hooks/useRolePermissions.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebaseConfig";
import type { RolePermissions } from "./useRoles";

/**
 * Custom hook to manage and fetch user role permissions from Firestore.
 * This hook handles the authentication state and fetches the corresponding
 * permissions for the current user's role.
 * 
 * @returns {Object} An object containing:
 *   - permissions: The current user's permissions
 *   - loading: Boolean indicating if permissions are being loaded
 *   - error: Any error that occurred during permission fetching
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { permissions, loading, error } = useRolePermissions();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *   
 *   return permissions?.canEdit ? <EditButton /> : null;
 * }
 * ```
 */

export function useRolePermissions() {
  /**
   * Type definition for user permissions
   */
  type Permissions = {
    role: string;
  } & RolePermissions;

  /**
   * Type definition for user document in Firestore
   */
  type UserDoc = {
    role?: string;
  };

  /**
   * Type definition for role document in Firestore
   */
  type RoleDoc = {
    permissions: {
      canView: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canManageRoles: boolean;
    };
    category: string;
  };

  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Get user's role
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.data() as UserDoc;
        const role = userData?.role ?? "viewer";

        // Get role permissions
        const roleSnap = await getDoc(doc(db, "roles", role));
        const roleData = roleSnap.data() as RoleDoc | undefined;

        // Set permissions based on role data
        if (roleData?.permissions) {
          // New structure
          setPermissions({
            role,
            ...roleData.permissions
          });
        } else if (roleData) {
          // Legacy structure
          setPermissions({
            role,
            canView: roleData.permissions?.canView ?? false,
            canEdit: roleData.permissions?.canEdit ?? false,
            canDelete: roleData.permissions?.canDelete ?? false,
            canManageRoles: roleData.permissions?.canManageRoles ?? false
          });
        } else {
          // Default permissions for unknown roles
          setPermissions({
            role,
            canView: role === 'admin', // Admin always has view access
            canEdit: role === 'admin', // Admin always has edit access
            canDelete: role === 'admin', // Admin always has delete access
            canManageRoles: role === 'admin' // Admin always has role management access
          });
        }
      } catch (err) {
        console.error("Failed to load role permissions", err);
        // Set default admin permissions if the user's email contains 'admin'
        const isAdmin = user.email?.toLowerCase().includes('admin') ?? false;
        setPermissions({
          role: isAdmin ? 'admin' : 'unknown',
          canView: isAdmin,
          canEdit: isAdmin,
          canDelete: isAdmin,
          canManageRoles: isAdmin
        });
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  return { permissions, loading };
}
