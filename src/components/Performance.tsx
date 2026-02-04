import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { User, PerformanceReview } from '@/types';
import { Star, TrendingUp, Award, BarChart3, Calendar, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PerformanceProps {
  user: User;
}

interface UserPoints {
  id: string;
  user_id: string;
  points: number;
  category: string;
  awarded_by: string;
  awarded_date: string;
  notes: string;
}

const MAX_YEARLY_POINTS = 240;
const MAX_MONTHLY_POINTS = 20; // 240 / 12 months

export const Performance: React.FC<PerformanceProps> = ({ user }) => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [points, setPoints] = useState<UserPoints[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [reviewsRes, pointsRes] = await Promise.all([
        supabase
          .from('performance_reviews')
          .select('*')
          .eq('userId', user.id)
          .order('reviewDate', { ascending: false }),
        supabase
          .from('user_points')
          .select('*')
          .eq('user_id', user.id)
          .order('awarded_date', { ascending: false }),
      ]);

      if (reviewsRes.data) setReviews(reviewsRes.data as PerformanceReview[]);
      if (pointsRes.data) setPoints(pointsRes.data as UserPoints[]);
      setLoading(false);
    };
    fetchData();
  }, [user.id]);

  const latestReview = reviews[0];
  
  const calculateAverage = (review: PerformanceReview) => {
    const scores = [
      review.workPerformance,
      review.qualityResults,
      review.attendanceBehavior,
      review.officePolicies,
      review.teamContribution,
    ];
    return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  // Calculate points for current month
  const getCurrentMonthPoints = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return points
      .filter(p => new Date(p.awarded_date) >= startOfMonth)
      .reduce((sum, p) => sum + p.points, 0);
  };

  // Calculate points for current year
  const getCurrentYearPoints = () => {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    return points
      .filter(p => new Date(p.awarded_date) >= startOfYear)
      .reduce((sum, p) => sum + p.points, 0);
  };

  const monthlyPoints = getCurrentMonthPoints();
  const yearlyPoints = getCurrentYearPoints();

  const categories = [
    { key: 'workPerformance', label: 'Work Performance', icon: TrendingUp },
    { key: 'qualityResults', label: 'Quality Results', icon: Award },
    { key: 'attendanceBehavior', label: 'Attendance & Behavior', icon: Star },
    { key: 'officePolicies', label: 'Office Policies', icon: BarChart3 },
    { key: 'teamContribution', label: 'Team Contribution', icon: Users },
  ];

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Review</h1>
        <p className="text-muted-foreground">Your performance evaluation and points</p>
      </div>

      {/* Points Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Monthly Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold text-primary">{monthlyPoints}</span>
              <span className="text-muted-foreground mb-1">/ {MAX_MONTHLY_POINTS}</span>
            </div>
            <Progress value={(monthlyPoints / MAX_MONTHLY_POINTS) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.max(0, MAX_MONTHLY_POINTS - monthlyPoints)} points to monthly target
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Star className="w-4 h-4" />
              Yearly Points
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-4xl font-bold text-accent">{yearlyPoints}</span>
              <span className="text-muted-foreground mb-1">/ {MAX_YEARLY_POINTS}</span>
            </div>
            <Progress value={(yearlyPoints / MAX_YEARLY_POINTS) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {Math.max(0, MAX_YEARLY_POINTS - yearlyPoints)} points to yearly target
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="review" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="review">Latest Review</TabsTrigger>
          <TabsTrigger value="history">Points History</TabsTrigger>
        </TabsList>

        <TabsContent value="review">
          {!latestReview ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Star className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h2 className="text-xl font-semibold mb-2">No Reviews Yet</h2>
                <p className="text-muted-foreground">
                  Your performance reviews will appear here once submitted by management.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overall Score */}
              <Card className="bg-primary text-primary-foreground">
                <CardContent className="py-8">
                  <div className="text-center">
                    <p className="text-sm opacity-80 mb-2">Overall Score</p>
                    <div className="text-5xl font-bold mb-2">
                      {calculateAverage(latestReview)}
                    </div>
                    <p className="text-sm opacity-80">out of 10</p>
                  </div>
                </CardContent>
              </Card>

              {/* Category Scores */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map(({ key, label, icon: Icon }) => {
                  const score = latestReview[key as keyof PerformanceReview] as number;
                  return (
                    <Card key={key}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          {label}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold">{score}</span>
                          <span className="text-muted-foreground">/10</span>
                        </div>
                        <Progress value={score * 10} className="h-2" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Comments */}
              {latestReview.comments && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Reviewer Comments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{latestReview.comments}</p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Reviewed on: {new Date(latestReview.reviewDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Points History</CardTitle>
            </CardHeader>
            <CardContent>
              {points.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No points earned yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {points.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Star className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{p.category.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {p.notes || `Awarded by ${p.awarded_by}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(p.awarded_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="default" className="text-lg px-3 py-1">
                        +{p.points}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Performance;
