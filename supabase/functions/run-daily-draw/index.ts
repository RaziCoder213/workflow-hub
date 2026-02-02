import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DrawParticipant {
  id: string;
  user_id: string;
  user_name: string;
  draw_date: string;
  is_winner: boolean;
}

interface Profile {
  id: string;
  name: string;
  email: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get yesterday's date (the draw for participants who completed 8h yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const drawDate = yesterday.toISOString().split('T')[0];

    console.log(`Running daily draw for date: ${drawDate}`);

    // Get all participants from yesterday who haven't had a winner selected yet
    const { data: participants, error: fetchError } = await supabase
      .from('daily_draws')
      .select('*')
      .eq('draw_date', drawDate)
      .is('winner_selected_at', null);

    if (fetchError) {
      throw new Error(`Failed to fetch participants: ${fetchError.message}`);
    }

    if (!participants || participants.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No participants found for yesterday's draw",
          date: drawDate 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${participants.length} participants`);

    // Randomly select one winner
    const winnerIndex = Math.floor(Math.random() * participants.length);
    const winner = participants[winnerIndex] as DrawParticipant;

    console.log(`Winner selected: ${winner.user_name} (${winner.user_id})`);

    // Mark all participants as processed, winner as is_winner = true
    const now = new Date().toISOString();
    
    // Update winner
    const { error: winnerError } = await supabase
      .from('daily_draws')
      .update({ 
        is_winner: true, 
        winner_selected_at: now 
      })
      .eq('id', winner.id);

    if (winnerError) {
      throw new Error(`Failed to update winner: ${winnerError.message}`);
    }

    // Update non-winners
    const nonWinnerIds = participants
      .filter((p: DrawParticipant) => p.id !== winner.id)
      .map((p: DrawParticipant) => p.id);
    
    if (nonWinnerIds.length > 0) {
      await supabase
        .from('daily_draws')
        .update({ 
          is_winner: false, 
          winner_selected_at: now 
        })
        .in('id', nonWinnerIds);
    }

    // Get winner's profile for email
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email')
      .eq('id', winner.user_id)
      .single();

    // Create in-app notification for winner
    const { error: notifError } = await supabase
      .from('notifications')
      .insert({
        user_id: winner.user_id,
        user_name: winner.user_name,
        title: "🎉 You Won the Daily Draw!",
        message: `Congratulations! You've won yesterday's punctuality lucky draw. Visit the Rewards page to claim your prize!`,
        type: "reward",
        metadata: { draw_date: drawDate, draw_id: winner.id }
      });

    if (notifError) {
      console.error(`Failed to create notification: ${notifError.message}`);
    }

    // Mark email as sent (email would be sent via separate service/integration)
    await supabase
      .from('daily_draws')
      .update({ email_sent: true })
      .eq('id', winner.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily draw completed successfully",
        date: drawDate,
        winner: {
          id: winner.user_id,
          name: winner.user_name,
          email: (profile as Profile)?.email || null
        },
        totalParticipants: participants.length
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Error in run-daily-draw:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
