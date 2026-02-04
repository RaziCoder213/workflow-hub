import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { User, PerformanceReview } from '@/types';
import { 
  Star, 
  Loader2, 
  CheckCircle,
  TrendingUp,
  Award,
  BarChart3,
  Users,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

interface PerformanceManagementProps {
  currentUser: User;
}

const CATEGORIES = [
  { key: 'workPerformance', label: 'Work Performance', icon: TrendingUp, description: 'Quality and quantity of work output' },
  { key: 'qualityResults', label: 'Quality Results', icon: Award, description: 'Accuracy and attention to detail' },
  { key: 'attendanceBehavior', label: 'Attendance & Behavior', icon: Star, description: 'Punctuality and professional conduct' },
  { key: 'officePolicies', label: 'Office Policies', icon: BarChart3, description: 'Adherence to company rules and guidelines' },
  { key: 'teamContribution', label: 'Team Contribution', icon: Users, description: 'Collaboration and helping others' },
];

export const PerformanceManagement: React.FC<PerformanceManagementProps> = ({ currentUser }) => {
  const [employees, setEmployees] = useState<User[]>([]);
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Review form state
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [scores, setScores] = useState({
    workPerformance: 5,
    qualityResults: 5,
    attendanceBehavior: 5,
    officePolicies: 5,
    teamContribution: 5,
  });
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [employeesRes, reviewsRes] = await Promise.all([
      supabase.from('profiles').select('*').order('name'),
      supabase.from('performance_reviews').select('*').order('reviewDate', { ascending: false }).limit(50),
    ]);

    if (employeesRes.data) setEmployees(employeesRes.data as User[]);
    if (reviewsRes.data) setReviews(reviewsRes.data as PerformanceReview[]);
    setLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    setSubmitting(true);
    try {
      const employee = employees.find(e => e.id === selectedEmployee);
      
      const { error } = await supabase.from('performance_reviews').insert({
        userId: selectedEmployee,
        reviewerId: currentUser.id,
        workPerformance: scores.workPerformance,
        qualityResults: scores.qualityResults,
        attendanceBehavior: scores.attendanceBehavior,
        officePolicies: scores.officePolicies,
        teamContribution: scores.teamContribution,
        comments,
        reviewDate: new Date().toISOString().split('T')[0],
      });

      if (error) throw error;

      // Also add to user_points
      const totalPoints = scores.workPerformance + scores.qualityResults + 
                         scores.attendanceBehavior + scores.officePolicies + 
                         scores.teamContribution;

      await supabase.from('user_points').insert({
        user_id: selectedEmployee,
        points: totalPoints,
        category: 'performance_review',
        awarded_by: currentUser.name,
        notes: `Performance review: ${totalPoints}/50 points`,
      });

      toast.success(`Performance review submitted for ${employee?.name}`);
      
      // Reset form
      setSelectedEmployee('');
      setScores({
        workPerformance: 5,
        qualityResults: 5,
        attendanceBehavior: 5,
        officePolicies: 5,
        teamContribution: 5,
      });
      setComments('');
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalScore = () => {
    return scores.workPerformance + scores.qualityResults + 
           scores.attendanceBehavior + scores.officePolicies + 
           scores.teamContribution;
  };

  const getScoreColor = (score: number, max: number = 10) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-accent';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getEmployeeName = (userId: string) => {
    return employees.find(e => e.id === userId)?.name || 'Unknown';
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
        <h1 className="text-2xl font-bold">Performance Reviews</h1>
        <p className="text-muted-foreground">Evaluate and track employee performance</p>
      </div>

      <Tabs defaultValue="submit" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="submit">Submit Review</TabsTrigger>
          <TabsTrigger value="history">Review History</TabsTrigger>
        </TabsList>

        {/* Submit Review Tab */}
        <TabsContent value="submit" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Review Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    New Performance Review
                  </CardTitle>
                  <CardDescription>
                    Rate the employee on each category from 1-10
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Employee Selection */}
                  <div className="space-y-2">
                    <Label>Select Employee</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an employee to review..." />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter(e => e.id !== currentUser.id)
                          .map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              <div className="flex items-center gap-2">
                                <span>{emp.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {emp.department || 'No Dept'}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedEmployee && (
                    <>
                      {/* Category Sliders */}
                      <div className="space-y-6">
                        {CATEGORIES.map(({ key, label, icon: Icon, description }) => (
                          <div key={key} className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-muted-foreground" />
                                <Label>{label}</Label>
                              </div>
                              <span className={`text-lg font-bold ${getScoreColor(scores[key as keyof typeof scores])}`}>
                                {scores[key as keyof typeof scores]}/10
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">{description}</p>
                            <Slider
                              value={[scores[key as keyof typeof scores]]}
                              onValueChange={([v]) => setScores({ ...scores, [key]: v })}
                              min={1}
                              max={10}
                              step={1}
                              className="w-full"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Comments */}
                      <div className="space-y-2">
                        <Label>Additional Comments</Label>
                        <Textarea
                          value={comments}
                          onChange={(e) => setComments(e.target.value)}
                          placeholder="Provide feedback, areas for improvement, achievements..."
                          rows={4}
                        />
                      </div>

                      {/* Submit Button */}
                      <Button 
                        onClick={handleSubmitReview} 
                        disabled={submitting}
                        className="w-full"
                        size="lg"
                      >
                        {submitting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Submit Performance Review
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Score Preview */}
            <div className="space-y-6">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Score Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center py-4">
                    <div className={`text-5xl font-bold ${getScoreColor(getTotalScore(), 50)}`}>
                      {getTotalScore()}
                    </div>
                    <p className="text-muted-foreground mt-1">out of 50 points</p>
                  </div>
                  
                  <div className="space-y-2">
                    {CATEGORIES.map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{scores[key as keyof typeof scores]}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-muted-foreground text-center">
                      This review adds {getTotalScore()} points (max 50/review)
                    </p>
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Yearly target: 240 points
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Review History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No reviews submitted yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Work</TableHead>
                        <TableHead className="text-center">Quality</TableHead>
                        <TableHead className="text-center">Attendance</TableHead>
                        <TableHead className="text-center">Policies</TableHead>
                        <TableHead className="text-center">Team</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reviews.map((review) => {
                        const total = review.workPerformance + review.qualityResults +
                                    review.attendanceBehavior + review.officePolicies +
                                    review.teamContribution;
                        return (
                          <TableRow key={review.id}>
                            <TableCell className="font-medium">
                              {getEmployeeName(review.userId)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(review.reviewDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-center">{review.workPerformance}</TableCell>
                            <TableCell className="text-center">{review.qualityResults}</TableCell>
                            <TableCell className="text-center">{review.attendanceBehavior}</TableCell>
                            <TableCell className="text-center">{review.officePolicies}</TableCell>
                            <TableCell className="text-center">{review.teamContribution}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={total >= 40 ? 'default' : total >= 25 ? 'secondary' : 'outline'}>
                                {total}/50
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PerformanceManagement;
