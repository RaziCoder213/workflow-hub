import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { LeaveRequest, OvertimeRequest } from '@/types';
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle,
  User,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface RequestsManagementProps {
  type: 'leaves' | 'overtime';
  leaveRequests: LeaveRequest[];
  overtimeRequests: OvertimeRequest[];
  onRefresh: () => void;
}

export const RequestsManagement: React.FC<RequestsManagementProps> = ({
  type,
  leaveRequests,
  overtimeRequests,
  onRefresh,
}) => {
  const [processing, setProcessing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');

  const handleLeaveAction = async (id: string, status: 'Approved' | 'Rejected') => {
    setProcessing(id);
    const { error } = await supabase.from('leaves').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update leave request');
    } else {
      toast.success(`Leave request ${status.toLowerCase()}`);
      onRefresh();
    }
    setProcessing(null);
  };

  const handleOvertimeAction = async (id: string, status: 'Approved' | 'Rejected') => {
    setProcessing(id);
    const { error } = await supabase.from('overtime').update({ status }).eq('id', id);
    if (error) {
      toast.error('Failed to update overtime request');
    } else {
      toast.success(`Overtime request ${status.toLowerCase()}`);
      onRefresh();
    }
    setProcessing(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <Badge className="bg-accent">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const filterByStatus = <T extends { status: string }>(items: T[], status: string) => {
    if (status === 'pending') return items.filter(i => i.status === 'Pending');
    if (status === 'approved') return items.filter(i => i.status === 'Approved');
    if (status === 'rejected') return items.filter(i => i.status === 'Rejected');
    return items;
  };

  if (type === 'leaves') {
    const filteredLeaves = filterByStatus(leaveRequests, activeTab);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">Review and manage employee leave applications</p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-warning">
                {leaveRequests.filter(l => l.status === 'Pending').length}
              </p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-accent">
                {leaveRequests.filter(l => l.status === 'Approved').length}
              </p>
              <p className="text-sm text-muted-foreground">Approved</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-2xl font-bold text-destructive">
                {leaveRequests.filter(l => l.status === 'Rejected').length}
              </p>
              <p className="text-sm text-muted-foreground">Rejected</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
              <TabsList>
                <TabsTrigger value="pending">
                  Pending ({leaveRequests.filter(l => l.status === 'Pending').length})
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {filteredLeaves.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No {activeTab} leave requests
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeaves.map((request) => (
                  <div key={request.id} className="p-4 border rounded-lg">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{request.userName}</span>
                          <Badge variant="outline">{request.type}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{request.reason}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {request.status === 'Pending' ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleLeaveAction(request.id, 'Approved')}
                              disabled={processing === request.id}
                              className="bg-accent hover:bg-accent/90"
                            >
                              {processing === request.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleLeaveAction(request.id, 'Rejected')}
                              disabled={processing === request.id}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          getStatusBadge(request.status)
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Overtime requests
  const filteredOvertime = filterByStatus(overtimeRequests, activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Overtime Requests</h1>
        <p className="text-muted-foreground">Review and manage additional hours requests</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-warning">
              {overtimeRequests.filter(o => o.status === 'Pending').length}
            </p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-accent">
              {overtimeRequests.filter(o => o.status === 'Approved').length}
            </p>
            <p className="text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-destructive">
              {overtimeRequests.filter(o => o.status === 'Rejected').length}
            </p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({overtimeRequests.filter(o => o.status === 'Pending').length})
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredOvertime.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No {activeTab} overtime requests
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOvertime.map((request) => (
                <div key={request.id} className="p-4 border rounded-lg">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{request.userName}</span>
                        <Badge variant="outline">{request.hours} hours</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4" />
                        <span>{request.project}</span>
                        <span>•</span>
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(request.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm">{request.reason}</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {request.status === 'Pending' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleOvertimeAction(request.id, 'Approved')}
                            disabled={processing === request.id}
                            className="bg-accent hover:bg-accent/90"
                          >
                            {processing === request.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleOvertimeAction(request.id, 'Rejected')}
                            disabled={processing === request.id}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        getStatusBadge(request.status)
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestsManagement;
