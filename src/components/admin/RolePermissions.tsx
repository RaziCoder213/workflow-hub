import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { RolePermission, UserRole } from '@/types';
import { Shield, Loader2, Check, Eye, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

const PERMISSION_LABELS: Record<string, string> = {
  employees: 'Employee Management',
  leaves: 'Leave Requests',
  overtime: 'Overtime Requests',
  performance: 'Performance Reviews',
  attendance: 'Attendance Records',
  breaks: 'Break Schedules',
  rewards: 'Rewards System',
  roles: 'Role Management',
  permissions: 'Permission Settings',
};

const ROLES: UserRole[] = ['Admin', 'HR', 'Employee'];

export const RolePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('Admin');

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .order('permission');
    
    if (data && !error) {
      setPermissions(data as RolePermission[]);
    }
    setLoading(false);
  };

  const handlePermissionChange = async (
    role: UserRole,
    permission: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    // Don't allow modifying Admin permissions for roles/permissions
    if (role === 'Admin' && (permission === 'roles' || permission === 'permissions')) {
      toast.error('Cannot modify Admin access to role management');
      return;
    }

    const perm = permissions.find(p => p.role === role && p.permission === permission);
    if (!perm) return;

    setSaving(true);
    const { error } = await supabase
      .from('role_permissions')
      .update({ [field]: value })
      .eq('id', perm.id);

    if (error) {
      toast.error('Failed to update permission');
    } else {
      setPermissions(prev => prev.map(p => 
        p.id === perm.id ? { ...p, [field]: value } : p
      ));
      toast.success('Permission updated');
    }
    setSaving(false);
  };

  const getRolePermissions = (role: UserRole) => {
    return permissions.filter(p => p.role === role);
  };

  const getRoleBadgeVariant = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'default';
      case 'HR': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Role Permissions</h1>
        <p className="text-muted-foreground">Configure what each role can view and manage</p>
      </div>

      {/* Role Description Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={selectedRole === 'Admin' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="cursor-pointer" onClick={() => setSelectedRole('Admin')}>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-primary" />
              Admin
            </CardTitle>
            <CardDescription>
              Full system access. Can manage all employees, roles, and permissions.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className={selectedRole === 'HR' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="cursor-pointer" onClick={() => setSelectedRole('HR')}>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-secondary-foreground" />
              HR
            </CardTitle>
            <CardDescription>
              Can manage employees, approve requests, and conduct performance reviews.
            </CardDescription>
          </CardHeader>
        </Card>
        <Card className={selectedRole === 'Employee' ? 'ring-2 ring-primary' : ''}>
          <CardHeader className="cursor-pointer" onClick={() => setSelectedRole('Employee')}>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="w-5 h-5 text-muted-foreground" />
              Employee
            </CardTitle>
            <CardDescription>
              Can view own data, submit leave/overtime requests, and view attendance.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      {/* Permissions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Badge variant={getRoleBadgeVariant(selectedRole)}>{selectedRole}</Badge>
            Permissions
          </CardTitle>
          <CardDescription>
            Toggle permissions for the {selectedRole} role
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="w-4 h-4" />
                    View
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Plus className="w-4 h-4" />
                    Create
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Pencil className="w-4 h-4" />
                    Edit
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {getRolePermissions(selectedRole).map((perm) => {
                const isProtected = selectedRole === 'Admin' && 
                  (perm.permission === 'roles' || perm.permission === 'permissions');
                
                return (
                  <TableRow key={perm.id}>
                    <TableCell className="font-medium">
                      {PERMISSION_LABELS[perm.permission] || perm.permission}
                      {isProtected && (
                        <Badge variant="outline" className="ml-2 text-xs">Protected</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={perm.can_view}
                        onCheckedChange={(v) => handlePermissionChange(selectedRole, perm.permission, 'can_view', v)}
                        disabled={saving || isProtected}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={perm.can_create}
                        onCheckedChange={(v) => handlePermissionChange(selectedRole, perm.permission, 'can_create', v)}
                        disabled={saving || isProtected}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={perm.can_edit}
                        onCheckedChange={(v) => handlePermissionChange(selectedRole, perm.permission, 'can_edit', v)}
                        disabled={saving || isProtected}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={perm.can_delete}
                        onCheckedChange={(v) => handlePermissionChange(selectedRole, perm.permission, 'can_delete', v)}
                        disabled={saving || isProtected}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions Matrix</CardTitle>
          <CardDescription>Quick overview of all role permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Feature</TableHead>
                  {ROLES.map(role => (
                    <TableHead key={role} className="text-center">
                      <Badge variant={getRoleBadgeVariant(role)}>{role}</Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.keys(PERMISSION_LABELS).map(permKey => (
                  <TableRow key={permKey}>
                    <TableCell className="font-medium">
                      {PERMISSION_LABELS[permKey]}
                    </TableCell>
                    {ROLES.map(role => {
                      const perm = permissions.find(p => p.role === role && p.permission === permKey);
                      const hasAccess = perm?.can_view || perm?.can_create || perm?.can_edit || perm?.can_delete;
                      const fullAccess = perm?.can_view && perm?.can_create && perm?.can_edit && perm?.can_delete;
                      
                      return (
                        <TableCell key={role} className="text-center">
                          {fullAccess ? (
                            <Badge variant="default" className="bg-accent">Full</Badge>
                          ) : hasAccess ? (
                            <Badge variant="secondary">Partial</Badge>
                          ) : (
                            <Badge variant="outline">None</Badge>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RolePermissions;
