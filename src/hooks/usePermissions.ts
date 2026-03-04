import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RolePermission } from '@/types';

interface UsePermissionsReturn {
  permissions: RolePermission[];
  loading: boolean;
  canView: (permission: string) => boolean;
  canCreate: (permission: string) => boolean;
  canEdit: (permission: string) => boolean;
  canDelete: (permission: string) => boolean;
  hasAnyAdminAccess: boolean;
}

// Map nav item IDs to permission keys
export const NAV_PERMISSION_MAP: Record<string, string> = {
  // Admin nav
  'command': 'employees', // if they can view employees, they can see command center
  'employees': 'employees',
  'leaves': 'leave_approvals',
  'overtime': 'overtime_approvals',
  'projects': 'projects',
  'holidays': 'holidays',
  'breaks': 'breaks',
  'performance': 'performance',
  'rewards': 'rewards_management',
  'hours-adjustment': 'hours_adjustment',
  'hours-overview': 'hours_overview',
  'permissions': 'permissions',
};

// Employee nav permission map
export const EMPLOYEE_NAV_PERMISSION_MAP: Record<string, string> = {
  'dashboard': 'attendance',
  'checkins': 'attendance',
  'attendance': 'attendance',
  'leaves': 'leave_requests',
  'overtime': 'overtime_requests',
  'rewards': 'rewards',
  'authenticator': 'attendance',
  'performance': 'performance',
  'profile': 'attendance',
};

export const usePermissions = (userRole: string | undefined): UsePermissionsReturn => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userRole) {
      setLoading(false);
      return;
    }
    
    const fetchPermissions = async () => {
      const { data } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', userRole);
      
      if (data) setPermissions(data as RolePermission[]);
      setLoading(false);
    };

    fetchPermissions();
  }, [userRole]);

  const canView = useCallback((permission: string) => {
    // System Admin always has full access
    if (userRole === 'Admin') return true;
    const perm = permissions.find(p => p.permission === permission);
    return perm?.can_view ?? false;
  }, [permissions, userRole]);

  const canCreate = useCallback((permission: string) => {
    if (userRole === 'Admin') return true;
    const perm = permissions.find(p => p.permission === permission);
    return perm?.can_create ?? false;
  }, [permissions, userRole]);

  const canEdit = useCallback((permission: string) => {
    if (userRole === 'Admin') return true;
    const perm = permissions.find(p => p.permission === permission);
    return perm?.can_edit ?? false;
  }, [permissions, userRole]);

  const canDelete = useCallback((permission: string) => {
    if (userRole === 'Admin') return true;
    const perm = permissions.find(p => p.permission === permission);
    return perm?.can_delete ?? false;
  }, [permissions, userRole]);

  // Check if user has ANY admin-level view permissions (to show admin nav)
  const hasAnyAdminAccess = userRole === 'Admin' || userRole === 'HR' || 
    permissions.some(p => p.can_view && Object.values(NAV_PERMISSION_MAP).includes(p.permission));

  return { permissions, loading, canView, canCreate, canEdit, canDelete, hasAnyAdminAccess };
};
