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
import { Gift, Trophy, Sparkles, CheckCircle, Bell, Clock, PartyPopper } from 'lucide-react';
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
  winner_selected_at: string | null;
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

interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
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
  const [pendingWin, setPendingWin] = useState<DailyDraw | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedReward, setSelectedReward] = useState<RewardItem | null>(null);
  const [spinningIndex, setSpinningIndex] = useState(0);
  const [hasAutoJoined, setHasAutoJoined] = useState(false);
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
    checkPendingWins();
    fetchNotifications();
  }, [user.id]);

  // Auto-join draw when 8 hours completed
  useEffect(() => {
    if (hasCompletedHours && !todayDraw && !hasAutoJoined) {
      autoJoinDraw();
    }
  }, [hasCompletedHours, todayDraw, hasAutoJoined]);

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

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'reward')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) setNotifications(data as Notification[]);
  };

  const checkTodayDraw = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data } = await supabase
      .from('daily_draws')
      .select('*')
      .eq('user_id', user.id)
      .eq('draw_date', today)
      .maybeSingle();
    
    if (data) setTodayDraw(data as DailyDraw);
  };

  // Check for unclaimed wins (from previous days)
  const checkPendingWins = async () => {
    const { data } = await supabase
      .from('daily_draws')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_winner', true)
      .eq('is_claimed', false)
      .not('winner_selected_at', 'is', null)
      .order('draw_date', { ascending: false })
      .limit(1);
    
    if (data && data.length > 0) {
      setPendingWin(data[0] as DailyDraw);
    }
  };

  // Auto-join draw when completing 8 hours
  const autoJoinDraw = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already entered
    const { data: existing } = await supabase
      .from('daily_draws')
      .select('*')
      .eq('user_id', user.id)
      .eq('draw_date', today)
      .maybeSingle();

    if (existing) {
      setTodayDraw(existing as DailyDraw);
      setHasAutoJoined(true);
      return;
    }

    // Auto-join the draw (winner will be selected next day by edge function)
    const { data, error } = await supabase
      .from('daily_draws')
      .insert({
        user_id: user.id,
        user_name: user.name,
        draw_date: today,
        is_winner: false, // Will be determined next day
        is_claimed: false,
      })
      .select()
      .single();

    if (data && !error) {
      setTodayDraw(data as DailyDraw);
      setHasAutoJoined(true);
      toast({
        title: "🎯 Joined Today's Draw!",
        description: "You've completed 8 hours and automatically joined the daily lucky draw. Winner will be announced tomorrow!",
      });
    }
  };

  // Mark notifications as read
  const markNotificationRead = async (notifId: string) => {
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notifId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notifId ? { ...n, is_read: true } : n)
    );
  };

  // Claim reward with spinning animation
  const claimReward = () => {
    if (!pendingWin || pendingWin.is_claimed || rewardItems.length === 0) return;

    setIsSpinning(true);
    setSelectedReward(null);
    
    let spinCount = 0;
    const totalSpins = 30 + Math.floor(Math.random() * 20);
    let currentSpeed = 50;
    
    spinIntervalRef.current = setInterval(() => {
      setSpinningIndex((prev) => (prev + 1) % rewardItems.length);
      spinCount++;
      
      // Gradually slow down
      if (spinCount > totalSpins * 0.7) {
        currentSpeed += 10;
      }
      
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
    }, currentSpeed);
  };

  const saveRewardClaim = async (reward: RewardItem) => {
    if (!pendingWin) return;

    // Update draw as claimed
    await supabase
      .from('daily_draws')
      .update({ 
        is_claimed: true, 
        reward_id: reward.id 
      })
      .eq('id', pendingWin.id);

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
      setPendingWin(null);
      fetchMyRewards();
      fetchAllRewards();
      
      toast({
        title: "🎁 Reward Claimed!",
        description: `Congratulations! You won: ${reward.name}!`,
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

  const unreadNotifications = notifications.filter(n => !n.is_read);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Gift className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Rewards</h1>
            <p className="text-muted-foreground">Complete 8 hours to auto-join the daily lucky draw</p>
          </div>
        </div>
        
        {unreadNotifications.length > 0 && (
          <Badge variant="destructive" className="animate-pulse">
            <Bell className="w-3 h-3 mr-1" />
            {unreadNotifications.length} New
          </Badge>
        )}
      </div>

      {/* Winner Notification Alert */}
      {pendingWin && (
        <Card className="border-2 border-yellow-500 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 animate-pulse">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <PartyPopper className="w-8 h-8 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                    🎉 You Won the Lucky Draw!
                  </h2>
                  <p className="text-muted-foreground">
                    From {formatDate(pendingWin.draw_date)} - Click to claim your reward!
                  </p>
                </div>
              </div>
              <Button 
                onClick={claimReward}
                disabled={isSpinning}
                size="lg"
                className="gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
              >
                <Sparkles className="w-5 h-5" />
                {isSpinning ? "Spinning..." : "Claim My Reward!"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Spinning Rewards Display */}
      {(isSpinning || selectedReward) && (
        <Card className="border-2 border-primary/30 overflow-hidden">
          <CardContent className="py-8">
            <div className="flex justify-center items-center gap-2 overflow-hidden">
              {rewardItems.map((reward, index) => {
                const distance = Math.abs(index - spinningIndex);
                const isVisible = distance <= 2 || (rewardItems.length - distance) <= 2;
                
                return (
                  <div
                    key={reward.id}
                    className={`
                      flex-shrink-0 transition-all duration-100
                      ${index === spinningIndex 
                        ? 'scale-150 opacity-100 ring-4 ring-primary rounded-xl z-10' 
                        : 'scale-75 opacity-30'
                      }
                      ${!isSpinning && selectedReward?.id === reward.id 
                        ? 'animate-bounce ring-4 ring-yellow-400' 
                        : ''
                      }
                    `}
                    style={{ display: isVisible ? 'block' : 'none' }}
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
                );
              })}
            </div>
            
            {selectedReward && !isSpinning && (
              <div className="mt-6 text-center">
                <p className="text-2xl font-bold text-primary">
                  🎉 You won: {selectedReward.name}!
                </p>
                <p className="text-muted-foreground mt-2">
                  Collect your reward from HR
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lucky Draw Status */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            Daily Punctuality Lucky Draw
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Status Badges */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Badge variant={hasCompletedHours ? "default" : "secondary"}>
              {hasCompletedHours 
                ? "✓ 8 Hours Completed" 
                : `${Math.floor(todayTotalSeconds / 3600)}h ${Math.floor((todayTotalSeconds % 3600) / 60)}m worked`
              }
            </Badge>
            
            {todayDraw && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle className="w-3 h-3 mr-1" />
                Joined Today's Draw
              </Badge>
            )}
            
            {todayDraw && !todayDraw.winner_selected_at && (
              <Badge variant="outline" className="border-blue-500 text-blue-500">
                <Clock className="w-3 h-3 mr-1" />
                Winner Announced Tomorrow
              </Badge>
            )}
          </div>

          {/* How it works */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Complete your 8 working hours to automatically join the daily draw</li>
              <li>Next day, one winner is selected from all participants</li>
              <li>Winner receives an in-app notification</li>
              <li>Click "Claim My Reward" to spin and get a random gift!</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      {notifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Reward Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {notifications.map((notif) => (
                <div 
                  key={notif.id}
                  onClick={() => markNotificationRead(notif.id)}
                  className={`
                    p-3 rounded-lg cursor-pointer transition-colors
                    ${notif.is_read ? 'bg-muted/30' : 'bg-primary/10 border border-primary/20'}
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{notif.title}</p>
                      <p className="text-sm text-muted-foreground">{notif.message}</p>
                    </div>
                    {!notif.is_read && (
                      <Badge variant="default" className="text-xs">New</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(notif.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reward Items Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Punctuality Gifts</CardTitle>
          <p className="text-sm text-muted-foreground">Possible rewards you can win</p>
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
                No rewards yet. Complete your hours daily to participate!
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

        {/* Team Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-yellow-500 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Team Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Winner</TableHead>
                    <TableHead>Reward</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allRewards.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                        No rewards claimed yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    allRewards.map((reward) => (
                      <TableRow key={reward.id}>
                        <TableCell className="text-sm">{formatDate(reward.claim_date)}</TableCell>
                        <TableCell className="font-medium">{reward.user_name}</TableCell>
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
