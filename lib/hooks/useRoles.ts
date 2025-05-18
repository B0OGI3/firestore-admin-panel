import { useState, useMemo, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, deleteDoc, type DocumentData } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import { showNotification } from '@mantine/notifications';

export type RolePermissions = {
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canManageRoles: boolean;
};

export type Role = {
  permissions: RolePermissions;
  category: string;
};

export type Roles = Record<string, Role>;

const createDefaultPermissions = (): RolePermissions => ({
  canView: false,
  canEdit: false,
  canDelete: false,
  canManageRoles: false
});

const migrateRoleData = (data: DocumentData): Role => {
  // If the data already has the new structure, return it as is
  if (data.permissions && typeof data.permissions === 'object') {
    return {
      permissions: {
        canView: Boolean(data.permissions.canView),
        canEdit: Boolean(data.permissions.canEdit),
        canDelete: Boolean(data.permissions.canDelete),
        canManageRoles: Boolean(data.permissions.canManageRoles)
      },
      category: data.category || "custom"
    };
  }

  // If it's the old structure, migrate it
  return {
    permissions: {
      canView: Boolean(data.canView),
      canEdit: Boolean(data.canEdit),
      canDelete: Boolean(data.canDelete),
      canManageRoles: Boolean(data.canManageRoles)
    },
    category: "custom"
  };
};

// Role management service
export const RoleService = {
  /**
   * Subscribe to role changes
   * @param onUpdate Callback function to handle role updates
   * @param onError Callback function to handle errors
   * @returns Unsubscribe function
   */
  subscribeToRoles(
    onUpdate: (roles: Roles) => void,
    onError?: (error: Error) => void
  ) {
    const unsubscribe = onSnapshot(
      collection(db, "roles"),
      (snapshot) => {
        const roles: Roles = {};
        snapshot.forEach((doc) => {
          const data = doc.data();
          roles[doc.id] = migrateRoleData(data);
        });
        onUpdate(roles);
      },
      (err: Error) => {
        console.error("Error listening to roles:", err);
        onError?.(err);
      }
    );
    return unsubscribe;
  },

  /**
   * Toggle a permission for a role
   */
  async togglePermission(role: string, currentRole: Role, perm: keyof RolePermissions) {
    const newValue = !currentRole.permissions[perm];
    const updatedRole: Role = {
      ...currentRole,
      permissions: {
        ...currentRole.permissions,
        [perm]: newValue
      }
    };

    await setDoc(doc(db, "roles", role), updatedRole);
  },

  /**
   * Save a role
   */
  async saveRole(role: string, roleData: Role) {
    await setDoc(doc(db, "roles", role), roleData);
  },

  /**
   * Add a new role
   */
  async addRole(roleName: string, category: string = "custom") {
    const trimmedName = roleName.trim().toLowerCase();
    if (!trimmedName) {
      throw new Error("Role name cannot be empty");
    }

    const newRole: Role = {
      permissions: createDefaultPermissions(),
      category
    };

    await setDoc(doc(db, "roles", trimmedName), newRole);
  },

  /**
   * Delete a role
   */
  async deleteRole(role: string) {
    await deleteDoc(doc(db, "roles", role));
  },

  /**
   * Duplicate a role
   */
  async duplicateRole(role: string, roleData: Role) {
    const newName = `${role}_copy`;
    await setDoc(doc(db, "roles", newName), roleData);
    return newName;
  }
};

// React hook for role management
export function useRoles() {
  const [roles, setRoles] = useState<Roles>({
    viewer: {
      permissions: {
        canView: true,
        canEdit: false,
        canDelete: false,
        canManageRoles: false
      },
      category: "user"
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = RoleService.subscribeToRoles(
      (updatedRoles) => {
        setRoles(updatedRoles);
        setLoading(false);
      },
      () => {
        showNotification({
          title: "Error",
          message: "Failed to sync roles",
          color: "red"
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const roleOptions = useMemo(() => 
    Object.keys(roles).map(role => ({
      value: role,
      label: role.charAt(0).toUpperCase() + role.slice(1)
    })), [roles]
  );

  const togglePermission = async (role: string, perm: keyof RolePermissions) => {
    try {
      const currentRole = roles[role];
      if (!currentRole) return;
      await RoleService.togglePermission(role, currentRole, perm);
    } catch (err) {
      console.error("Failed to toggle permission:", err);
      showNotification({
        title: "Error",
        message: `Failed to toggle permission "${perm}" for role "${role}"`,
        color: "red"
      });
    }
  };

  const saveRole = async (role: string) => {
    try {
      const roleData = roles[role];
      if (!roleData) return;
      
      await RoleService.saveRole(role, roleData);
      
      showNotification({
        title: "Success",
        message: `Role "${role}" saved successfully`,
        color: "green"
      });
    } catch (err) {
      console.error("Failed to save role:", err);
      showNotification({
        title: "Error",
        message: `Failed to save role "${role}"`,
        color: "red"
      });
    }
  };

  const addRole = async (roleName: string, category: string = "custom") => {
    try {
      const trimmedName = roleName.trim().toLowerCase();
      if (!trimmedName) {
        showNotification({
          title: "Error",
          message: "Role name cannot be empty",
          color: "red"
        });
        return;
      }

      if (roles[trimmedName]) {
        showNotification({
          title: "Error",
          message: `Role "${trimmedName}" already exists`,
          color: "red"
        });
        return;
      }

      await RoleService.addRole(trimmedName, category);

      showNotification({
        title: "Success",
        message: `Role "${trimmedName}" added successfully`,
        color: "green"
      });
    } catch (err) {
      console.error("Failed to add role:", err);
      showNotification({
        title: "Error",
        message: `Failed to add role "${roleName}"`,
        color: "red"
      });
    }
  };

  return {
    roles,
    loading,
    roleOptions,
    togglePermission,
    saveRole,
    addRole
  };
} 