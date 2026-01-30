import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Gift, Trophy, Sparkles, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface RewardItem {
  id: string;
  name: string;
  category: string;
  image_url: string;
  is_active: boolean;
}

interface DailyDraw {
  id: string;
  user_id: string;
  user_name: string;
  draw_date: string;
  is_winner: boolean;
  is_claimed: boolean;
  reward_id: string | null;
}

interface RewardClaim {
  id: string;
  user_id: string;
  user_name: string;
  reward_id: string;
  reward_name: string;
  reward_type: string;
  claim_date: string;
}

interface RewardsProps {
  user: User;
  todayTotalSeconds: number;
}

const Rewards: React.FC<RewardsProps> = ({ user, todayTotalSeconds }) => {
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [myRewards, setMyRewards] = useState<RewardClaim[]>([]);
  const [allRewards, setAllRewards] = useState<RewardClaim[]>([]);
  const [todayDraw, setTodayDraw] = useState<DailyDraw | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [spinningIndex, setSpinningIndex] = useState(0);
  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const REQUIRED_SECONDS = 8 * 60 * 60;
  const hasCompletedHours = todayTotalSeconds >= REQUIRED_SECONDS;

  // Fetch all data
  useEffect(() => {
    fetchRewardItems();
    fetchMyRewards();
    fetchAllRewards();
    checkTodayDraw();
  }, [user.id]);

  const fetchRewardItems = async () => {
    const { data } = await supabase
      .from('reward_items')
      .select('*')
      .eq('is_active', true)
      .eq('category', 'daily_punctuality');
    
    if (data) setRewardItems(data);
  };

  const fetchMyRewards = async () => {
    const { data } = await supabase
      .from('reward_claims')
      .select('*')
      .eq('user_id', user.id)
      .order('claim_date', { ascending: false });
    
    if (data) setMyRewards(data);
  };

  const fetchAllRewards = async () => {
    const { data } = await supabase
      .from('reward_claims')
      .select('*')
      .order('claim_date', { ascending: false })
      .limit(50);
    
    if (data) setAllRewards(data);
  };

  const checkTodayDraw = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('daily_draws')
      .select('*')
      .eq('user_id', user.id)
      .eq('draw_date', today)
      .maybeSingle();
    
    if (data) setTodayDraw(data);
  };

  // Enter the draw (when completing 8 hours)
  const enterDraw = async () => {
    if (!hasCompletedHours) {
      toast({
        title: "Not Eligible",
        description: "You need to complete 8 hours to enter the draw",
        variant: "destructive"
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check if already entered
    if (todayDraw) {
      toast({
        title: "Already Entered",
        description: "You've already entered today's draw!",
      });
      return;
    }

    // Randomly determine if winner (for demo, 100% chance)
    const isWinner = true;

    const { data, error } = await supabase
      .from('daily_draws')
      .insert({
        user_id: user.id,
        user_name: user.name,
        draw_date: today,
        is_winner: isWinner,
        is_claimed: false,
      })
      .select()
      .single();

    if (data && !error) {
      setTodayDraw(data);
      toast({
        title: "🎉 Congratulations!",
        description: "You've won today's lucky draw! Claim your reward now!",
      });
    }
  };

  // Claim reward with spinning animation
  const claimReward = () => {
    if (!todayDraw || todayDraw.is_claimed || rewardItems.length === 0) return;

    setIsSpinning(true);
    setSelectedReward(null);
    
    let spinCount = 0;
    const totalSpins = 30 + Math.floor(Math.random() * 20);
    
    spinIntervalRef.current = setInterval(() => {
      setSpinningIndex((prev) => (prev + 1) % rewardItems.length);
      spinCount++;
      
      if (spinCount >= totalSpins) {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        
        // Select final random reward
        const finalIndex = Math.floor(Math.random() * rewardItems.length);
        const wonReward = rewardItems[finalIndex];
        
        setSpinningIndex(finalIndex);
        setSelectedReward(wonReward);
        setIsSpinning(false);
        
        // Save to database
        saveRewardClaim(wonReward);
      }
    }, 100 - (spinCount * 1.5)); // Slow down gradually
  };

  const saveRewardClaim = async (reward: RewardItem) => {
    // Update draw as claimed
    await supabase
      .from('daily_draws')
      .update({ 
        is_claimed: true, 
        reward_id: reward.id 
      })
      .eq('id', todayDraw!.id);

    // Insert reward claim
    const { error } = await supabase
      .from('reward_claims')
      .insert({
        user_id: user.id,
        user_name: user.name,
        reward_id: reward.id,
        reward_name: reward.name,
        reward_type: 'Daily Punctuality',
      });

    if (!error) {
      setTodayDraw({ ...todayDraw!, is_claimed: true, reward_id: reward.id });
      fetchMyRewards();
      fetchAllRewards();
      
      toast({
        title: "🎁 Reward Claimed!",
        description: `You won: ${reward.name}!`,
      });
    }
  };

  // Format date
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
      <div className="flex items-center gap-3">
        <Gift className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
          <p className="text-muted-foreground">Complete 8 hours daily to participate in the lucky draw</p>
        </div>
      </div>

      {/* Lucky Draw Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Daily Punctuality Lucky Draw
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Badge variant={hasCompletedHours ? "default" : "secondary"}>
                {hasCompletedHours ? "✓ 8 Hours Completed" : `${Math.floor(todayTotalSeconds / 3600)}h ${Math.floor((todayTotalSeconds % 3600) / 60)}m worked`}
              </Badge>
            </div>
            
            {todayDraw && !todayDraw.is_claimed && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <Trophy className="w-3 h-3 mr-1" />
                You're today's winner!
              </Badge>
            )}
            
            {todayDraw?.is_claimed && (
              <Badge variant="outline" className="border-green-500 text-green-500">
                <CheckCircle className="w-3 h-3 mr-1" />
                Reward Claimed
              </Badge>
            )}
          </div>

          {/* Spinning Rewards Display */}
          {(isSpinning || selectedReward) && (
            <div className="mb-6 p-6 bg-card rounded-xl border-2 border-primary/30 relative overflow-hidden">
              <div className="flex justify-center items-center gap-4">
                {rewardItems.map((reward, index) => (
                  <div
                    key={reward.id}
                    className={`
                      flex-shrink-0 transition-all duration-150
                      ${index === spinningIndex 
                        ? 'scale-125 opacity-100 ring-4 ring-primary rounded-xl' 
                        : 'scale-75 opacity-30'
                      }
                      ${!isSpinning && selectedReward?.id === reward.id 
                        ? 'animate-bounce ring-4 ring-yellow-400' 
                        : ''
                      }
                    `}
                    style={{ display: Math.abs(index - spinningIndex) <= 2 ? 'block' : 'none' }}
                  >
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-muted">
                      <img 
                        src={reward.image_url} 
                        alt={reward.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-center text-xs mt-1 font-medium truncate w-24">
                      {reward.name}
                    </p>
                  </div>
                ))}
              </div>
              
              {selectedReward && !isSpinning && (
                <div className="mt-4 text-center">
                  <p className="text-xl font-bold text-primary">
                    🎉 You won: {selectedReward.name}!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {!todayDraw && (
              <Button 
                onClick={enterDraw}
                disabled={!hasCompletedHours}
                className="gap-2"
              >
                <Gift className="w-4 h-4" />
                Enter Today's Draw
              </Button>
            )}
            
            {todayDraw && todayDraw.is_winner && !todayDraw.is_claimed && (
              <Button 
                onClick={claimReward}
                disabled={isSpinning}
                className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
              >
                <Sparkles className="w-4 h-4" />
                {isSpinning ? "Spinning..." : "Claim Your Reward!"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reward Items Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Punctuality Gifts</CardTitle>
          <p className="text-sm text-muted-foreground">Be on time and complete your hours</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {rewardItems.map((reward) => (
              <div 
                key={reward.id} 
                className="flex flex-col items-center p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="w-20 h-20 rounded-lg overflow-hidden mb-2 bg-background">
                  <img 
                    src={reward.image_url} 
                    alt={reward.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs text-center font-medium text-foreground">
                  {reward.name}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* My Rewards & History */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* My Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              My Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            {myRewards.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                You have no rewards yet. Complete your hours to participate!
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {myRewards.map((reward) => (
                  <div 
                    key={reward.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                  >
                    <div>
                      <p className="font-medium">{reward.reward_name}</p>
                      <p className="text-xs text-muted-foreground">{reward.reward_type}</p>
                    </div>
                    <Badge variant="outline">{formatDate(reward.claim_date)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Others Being Rewarded */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-yellow-500 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Others Being Rewarded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Team Member</TableHead>
                    <TableHead>Reward Type</TableHead>
                    <TableHead>Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRewards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No rewards claimed yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    allRewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell className="text-sm">{formatDate(reward.claim_date)}</TableCell>
                        <TableCell className="font-medium">{reward.user_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {reward.reward_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{reward.reward_name}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rewards;
