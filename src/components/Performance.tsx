import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { User, PerformanceReview } from '@/types';
import { Star, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface PerformanceProps {
  user: User;
}

export const Performance: React.FC<PerformanceProps> = ({ user }) => {
  const [reviews, setReviews] = useState<PerformanceReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      const { data } = await supabase
        .from('performance_reviews')
        .select('*')
        .eq('userId', user.id)
        .order('reviewDate', { ascending: false });

      if (data) {
        setReviews(data as PerformanceReview[]);
      }
      setLoading(false);
    };
    fetchReviews();
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

  const categories = [
    { key: 'workPerformance', label: 'Work Performance', icon: TrendingUp },
    { key: 'qualityResults', label: 'Quality Results', icon: Award },
    { key: 'attendanceBehavior', label: 'Attendance & Behavior', icon: Star },
    { key: 'officePolicies', label: 'Office Policies', icon: BarChart3 },
    { key: 'teamContribution', label: 'Team Contribution', icon: Star },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Performance Review</h1>
        <p className="text-muted-foreground">Your performance evaluation scores</p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading...</div>
      ) : !latestReview ? (
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
    </div>
  );
};

export default Performance;
