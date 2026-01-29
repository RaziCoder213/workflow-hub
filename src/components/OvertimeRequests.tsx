import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { User, OvertimeRequest } from '@/types';
import { Clock, Plus, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface OvertimeRequestsProps {
  user: User;
  requests: OvertimeRequest[];
  todayTotalSeconds: number;
  onRefresh: () => void;
}

export const OvertimeRequests: React.FC<OvertimeRequestsProps> = ({ 
  user, 
  requests, 
  todayTotalSeconds,
  onRefresh 
}) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project: '',
    hours: '',
    reason: '',
  });

  const myRequests = requests.filter(r => r.userId === user.id);
  const REQUIRED_SECONDS = 8 * 60 * 60;
  const canRequestOvertime = todayTotalSeconds >= REQUIRED_SECONDS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const hours = parseFloat(formData.hours);
      if (hours > 3) {
        alert('Maximum 3 hours can be requested. For more, contact management directly.');
        setLoading(false);
        return;
      }

      await supabase.from('overtime').insert({
        userId: user.id,
        userName: user.name,
        project: formData.project,
        hours,
        reason: formData.reason,
        status: 'Pending',
        date: new Date().toISOString().split('T')[0],
      });

      setOpen(false);
      setFormData({ project: '', hours: '', reason: '' });
      onRefresh();
    } catch (error) {
      console.error('Failed to submit overtime request:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'Rejected':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' => {
    switch (status) {
      case 'Approved':
        return 'default';
      case 'Rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatHours = (seconds: number) => {
    return (seconds / 3600).toFixed(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Additional Hours</h1>
          <p className="text-muted-foreground">Request overtime after completing 8 hours</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button disabled={!canRequestOvertime}>
              <Plus className="w-4 h-4 mr-2" />
              Request Hours
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Additional Hours</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input
                  value={formData.project}
                  onChange={(e) => setFormData({ ...formData, project: e.target.value })}
                  placeholder="Enter project name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Hours (max 3)</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="3"
                  step="0.5"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  For more than 3 hours, contact management directly
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Explain why additional hours are needed..."
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Request
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Banner */}
      {!canRequestOvertime && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-warning" />
              <div>
                <p className="font-medium">Complete 8 hours first</p>
                <p className="text-sm text-muted-foreground">
                  You've tracked {formatHours(todayTotalSeconds)} hours today. 
                  Complete 8 hours to request additional time.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            My Overtime Requests
          </CardTitle>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No overtime requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(request.status)}
                    <div>
                      <p className="font-medium">{request.project}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.hours} hours • {new Date(request.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStatusVariant(request.status)}>
                    {request.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OvertimeRequests;
