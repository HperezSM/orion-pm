import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find all workspaces where trial has expired and tier is not 'starter'
    const { data: expiredWorkspaces, error: fetchError } = await supabase
      .from("workspaces")
      .select("id, owner_id, tier, trial_ends_at")
      .not("tier", "eq", "free")
      .not("trial_ends_at", "is", null)
      .lt("trial_ends_at", new Date().toISOString());

    if (fetchError) {
      throw fetchError;
    }

    const results = [];

    for (const workspace of expiredWorkspaces || []) {
      // Skip if already on a paid plan (has stripe subscription)
      const { data: wsData } = await supabase
        .from("workspaces")
        .select("stripe_subscription_id")
        .eq("id", workspace.id)
        .single();

      if (wsData?.stripe_subscription_id) {
        // Has active subscription, don't downgrade
        continue;
      }

      // Downgrade to starter
      const { error: updateError } = await supabase
        .from("workspaces")
        .update({ 
          tier: "starter",
          trial_ends_at: null 
        })
        .eq("id", workspace.id);

      if (updateError) {
        results.push({ workspace_id: workspace.id, status: "error", error: updateError.message });
        continue;
      }

      // Log the subscription event
      await supabase.from("subscription_events").insert({
        workspace_id: workspace.id,
        event_type: "trial_expired",
        old_tier: workspace.tier,
        new_tier: "starter",
        metadata_json: { reason: "trial_expired", expired_at: workspace.trial_ends_at },
      });

      // Create notification for workspace owner
      await supabase.from("notifications").insert({
        user_id: workspace.owner_id,
        type: "subscription",
        title: "Trial Expired",
        message: "Your Pro trial has ended. You've been moved to the Starter plan. Upgrade anytime to restore full features.",
        entity_type: "workspace",
        entity_id: workspace.id,
      });

      results.push({ workspace_id: workspace.id, status: "downgraded" });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
