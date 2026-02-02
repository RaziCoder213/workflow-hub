import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Shield, Plus, Key, Copy, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { useToast } from '@/hooks/use-toast';
import * as OTPAuth from 'otpauth';

interface AuthenticatorEntry {
  id: string;
  user_id: string;
  user_name: string;
  app_name: string;
  login_identity: string;
  secret_key: string;
  created_at: string;
}

interface AuthenticatorProps {
  user: User;
}

const Authenticator: React.FC<AuthenticatorProps> = ({ user }) => {
  const [entries, setEntries] = useState<AuthenticatorEntry[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [newLoginIdentity, setNewLoginIdentity] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [activeCode, setActiveCode] = useState<{ id: string; code: string; timeLeft: number } | null>(null);
  const [visibleSecrets, setVisibleSecrets] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchEntries();
  }, [user.id]);

  // Update code countdown
  useEffect(() => {
    if (!activeCode) return;

    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = 30 - (now % 30);
      
      if (timeLeft === 30) {
        // Generate new code
        const entry = entries.find(e => e.id === activeCode.id);
        if (entry) {
          const code = generateTOTP(entry.secret_key);
          setActiveCode({ id: entry.id, code, timeLeft });
        }
      } else {
        setActiveCode(prev => prev ? { ...prev, timeLeft } : null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCode, entries]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('authenticator_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data && !error) {
      setEntries(data as AuthenticatorEntry[]);
    }
  };

  const generateTOTP = (secret: string): string => {
    try {
      // Clean the secret (remove spaces and dashes)
      const cleanSecret = secret.replace(/[\s-]/g, '').toUpperCase();
      
      const totp = new OTPAuth.TOTP({
        secret: OTPAuth.Secret.fromBase32(cleanSecret),
        digits: 6,
        period: 30,
      });
      
      return totp.generate();
    } catch {
      return 'Invalid';
    }
  };

  const handleAddEntry = async () => {
    if (!newAppName.trim() || !newLoginIdentity.trim() || !newSecretKey.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }

    // Validate the secret key
    try {
      const cleanSecret = newSecretKey.replace(/[\s-]/g, '').toUpperCase();
      OTPAuth.Secret.fromBase32(cleanSecret);
    } catch {
      toast({
        title: "Invalid Secret Key",
        description: "The secret key is not a valid Base32 string",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('authenticator_entries')
      .insert({
        user_id: user.id,
        user_name: user.name,
        app_name: newAppName.trim(),
        login_identity: newLoginIdentity.trim(),
        secret_key: newSecretKey.replace(/[\s-]/g, '').toUpperCase(),
      });

    if (!error) {
      toast({
        title: "Entry Added",
        description: `${newAppName} authenticator added successfully`,
      });
      setNewAppName('');
      setNewLoginIdentity('');
      setNewSecretKey('');
      setIsAddDialogOpen(false);
      fetchEntries();
    } else {
      toast({
        title: "Error",
        description: "Failed to add entry",
        variant: "destructive"
      });
    }
  };

  const handleDeleteEntry = async (id: string, appName: string) => {
    const { error } = await supabase
      .from('authenticator_entries')
      .delete()
      .eq('id', id);

    if (!error) {
      toast({
        title: "Entry Deleted",
        description: `${appName} removed from authenticator`,
      });
      fetchEntries();
      if (activeCode?.id === id) {
        setActiveCode(null);
      }
    }
  };

  const handleGetCode = (entry: AuthenticatorEntry) => {
    const code = generateTOTP(entry.secret_key);
    const now = Math.floor(Date.now() / 1000);
    const timeLeft = 30 - (now % 30);
    setActiveCode({ id: entry.id, code, timeLeft });
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Code copied to clipboard",
    });
  };

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Authenticator</h1>
            <p className="text-muted-foreground">Manage your 2FA codes for various services</p>
          </div>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" />
              Add New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Authenticator Entry</DialogTitle>
              <DialogDescription>
                Enter the details from your authenticator setup. The secret key is usually shown as a text code during 2FA setup.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="appName">App/Service Name</Label>
                <Input
                  id="appName"
                  placeholder="e.g., GitHub, Shopify, Slack"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginIdentity">Login Identity</Label>
                <Input
                  id="loginIdentity"
                  placeholder="e.g., email@example.com or username"
                  value={newLoginIdentity}
                  onChange={(e) => setNewLoginIdentity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secretKey">Secret Key (Base32)</Label>
                <Input
                  id="secretKey"
                  placeholder="e.g., JBSWY3DPEHPK3PXP"
                  value={newSecretKey}
                  onChange={(e) => setNewSecretKey(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This is the text code shown during 2FA setup (not the QR code)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddEntry} className="bg-green-600 hover:bg-green-700">
                Add Entry
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Code Display */}
      {activeCode && (
        <Card className="border-2 border-primary bg-primary/5">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Key className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Current Code</p>
                  <p className="text-4xl font-mono font-bold tracking-widest text-primary">
                    {activeCode.code.slice(0, 3)} {activeCode.code.slice(3)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="28"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeDasharray={176}
                        strokeDashoffset={176 - (176 * activeCode.timeLeft) / 30}
                        className="text-primary transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold">
                      {activeCode.timeLeft}s
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(activeCode.code)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Authenticator Entries</CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No authenticator entries yet</p>
              <p className="text-sm">Click "Add New" to add your first 2FA entry</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App Name</TableHead>
                    <TableHead>Login Identity</TableHead>
                    <TableHead>Added By</TableHead>
                    <TableHead>Added On</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.app_name}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.login_identity}</TableCell>
                      <TableCell>{entry.user_name}</TableCell>
                      <TableCell>{formatDate(entry.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleGetCode(entry)}
                          >
                            Get Code
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleSecretVisibility(entry.id)}
                          >
                            {visibleSecrets.has(entry.id) ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteEntry(entry.id, entry.app_name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Visible Secrets */}
      {Array.from(visibleSecrets).map(id => {
        const entry = entries.find(e => e.id === id);
        if (!entry) return null;
        return (
          <Card key={id} className="border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{entry.app_name} Secret Key</p>
                  <p className="font-mono text-lg">{entry.secret_key}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    copyToClipboard(entry.secret_key);
                    toggleSecretVisibility(id);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy & Hide
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default Authenticator;
