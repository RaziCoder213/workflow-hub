import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { RolePermission } from '@/types';
import { Shield, Loader2, Eye, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface CustomRole {
  id: string;
  name: string;
  description: string;
  is_system_role: boolean;
  created_by: string;
  created_at: string;
}

const PERMISSION_LABELS: Record<string, string> = {
  employees: 'Employee Management',
  leave_requests: 'Leave Requests (Submit)',
  leave_approvals: 'Leave Approvals (Manage)',
  overtime_requests: 'Overtime Requests (Submit)',
  overtime_approvals: 'Overtime Approvals (Manage)',
  performance: 'Performance Reviews',
  attendance: 'Attendance Records',
  breaks: 'Break Schedules',
  rewards: 'Rewards (View)',
  rewards_management: 'Rewards Management',
  roles: 'Role Management',
  permissions: 'Permission Settings',
};

export const RolePermissions: React.FC = () => {
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('Admin');

  // Role form
  const [roleOpen, setRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [permRes, rolesRes] = await Promise.all([
      supabase.from('role_permissions').select('*').order('permission'),
      supabase.from('custom_roles').select('*').order('name'),
    ]);
    
    if (permRes.data) setPermissions(permRes.data as RolePermission[]);
    if (rolesRes.data) setRoles(rolesRes.data as CustomRole[]);
    setLoading(false);
  };

  const handlePermissionChange = async (
    role: string,
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
    
    setSaving(true);
    
    if (perm) {
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
    } else {
      // Create new permission row
      const newPerm = {
        role,
        permission,
        can_view: field === 'can_view' ? value : false,
        can_create: field === 'can_create' ? value : false,
        can_edit: field === 'can_edit' ? value : false,
        can_delete: field === 'can_delete' ? value : false,
      };

      const { data, error } = await supabase
        .from('role_permissions')
        .insert(newPerm)
        .select()
        .single();

      if (error) {
        toast.error('Failed to create permission');
      } else if (data) {
        setPermissions(prev => [...prev, data as RolePermission]);
        toast.success('Permission created');
      }
    }
    
    setSaving(false);
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingRole) {
        const { error } = await supabase
          .from('custom_roles')
          .update(roleForm)
          .eq('id', editingRole.id);
        if (error) throw error;
        toast.success('Role updated');
      } else {
        // Create the role
        const { data, error } = await supabase
          .from('custom_roles')
          .insert({ ...roleForm, is_system_role: false })
          .select()
          .single();
        if (error) throw error;

        // Create default permissions for the new role
        const defaultPerms = Object.keys(PERMISSION_LABELS).map(perm => ({
          role: roleForm.name,
          permission: perm,
          can_view: false,
          can_create: false,
          can_edit: false,
          can_delete: false,
        }));

        await supabase.from('role_permissions').insert(defaultPerms);
        toast.success('Role created');
      }

      setRoleOpen(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '' });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role: CustomRole) => {
    if (role.is_system_role) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (!confirm(`Delete role "${role.name}"? Users with this role will need to be reassigned.`)) return;

    try {
      // Delete permissions for this role
      await supabase.from('role_permissions').delete().eq('role', role.name);
      
      // Delete the role
      const { error } = await supabase.from('custom_roles').delete().eq('id', role.id);
      if (error) throw error;

      toast.success('Role deleted');
      fetchData();
      
      if (selectedRole === role.name) {
        setSelectedRole('Admin');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete role');
    }
  };

  const getRolePermissions = (role: string) => {
    const rolePerms = permissions.filter(p => p.role === role);
    
    // Return existing permissions + placeholders for missing ones
    return Object.keys(PERMISSION_LABELS).map(permKey => {
      const existing = rolePerms.find(p => p.permission === permKey);
      if (existing) return existing;
      
      return {
        id: `temp-${role}-${permKey}`,
        role,
        permission: permKey,
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
      } as RolePermission;
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Admin': return 'default';
      case 'HR': return 'secondary';
      case 'Employee': return 'outline';
      default: return 'secondary';
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Role Permissions</h1>
          <p className="text-muted-foreground">Configure roles and what each can view and manage</p>
        </div>
        <Dialog open={roleOpen} onOpenChange={(open) => {
          setRoleOpen(open);
          if (!open) {
            setEditingRole(null);
            setRoleForm({ name: '', description: '' });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRole ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleRoleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Role Name</Label>
                <Input
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g., Team Lead, Manager"
                  required
                  disabled={!!editingRole}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="What this role is responsible for..."
                />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingRole ? 'Update Role' : 'Create Role'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="roles">Manage Roles</TabsTrigger>
        </TabsList>

        {/* Permissions Tab */}
        <TabsContent value="permissions" className="space-y-6">
          {/* Role Selection Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {roles.map((role) => (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all ${selectedRole === role.name ? 'ring-2 ring-primary' : 'hover:border-primary/50'}`}
                onClick={() => setSelectedRole(role.name)}
              >
                <CardHeader className="p-4">
                  <div className="flex items-center gap-2">
                    <Shield className={`w-4 h-4 ${selectedRole === role.name ? 'text-primary' : 'text-muted-foreground'}`} />
                    <CardTitle className="text-sm">{role.name}</CardTitle>
                  </div>
                  {role.is_system_role && (
                    <Badge variant="outline" className="text-xs w-fit">System</Badge>
                  )}
                </CardHeader>
              </Card>
            ))}
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
        </TabsContent>

        {/* Manage Roles Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Roles</CardTitle>
              <CardDescription>System and custom roles in your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-muted-foreground" />
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.is_system_role ? 'default' : 'secondary'}>
                          {role.is_system_role ? 'System' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {!role.is_system_role && (
                          <div className="flex justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => {
                                setEditingRole(role);
                                setRoleForm({ name: role.name, description: role.description || '' });
                                setRoleOpen(true);
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => handleDeleteRole(role)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
                  {roles.map(role => (
                    <TableHead key={role.id} className="text-center">
                      <Badge variant={getRoleBadgeVariant(role.name)}>{role.name}</Badge>
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
                    {roles.map(role => {
                      const perm = permissions.find(p => p.role === role.name && p.permission === permKey);
                      const hasAccess = perm?.can_view || perm?.can_create || perm?.can_edit || perm?.can_delete;
                      const fullAccess = perm?.can_view && perm?.can_create && perm?.can_edit && perm?.can_delete;
                      
                      return (
                        <TableCell key={role.id} className="text-center">
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
