import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PushRequest = {
  audience?: "all" | "user";
  user_id?: string;
  title: string;
  body: string;
  url?: string;
  category?: "personal" | "building" | "help" | "report" | "knowledge" | "bulletin";
  importance?: "normaal" | "belangrijk" | "urgent";
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:beheer@graafvanschuyt.local";

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

function preferenceColumn(category?: PushRequest["category"]) {
  if (category === "building") return "building_notifications";
  if (category === "help") return "help_notifications";
  if (category === "report") return "report_notifications";
  if (category === "knowledge") return "knowledge_notifications";
  if (category === "bulletin") return "bulletin_notifications";
  return "personal_notifications";
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = (await request.json()) as PushRequest;
    const authHeader = request.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Niet ingelogd." }), { status: 401, headers: corsHeaders });
    }

    if (payload.audience === "all") {
      const { data: adminProfile } = await supabaseAdmin
        .from("profiles")
        .select("rol")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (adminProfile?.rol !== "admin") {
        return new Response(JSON.stringify({ error: "Alleen beheerders mogen algemene pushmeldingen versturen." }), { status: 403, headers: corsHeaders });
      }

      if (payload.importance !== "belangrijk" && payload.importance !== "urgent") {
        return new Response(JSON.stringify({ sent: 0, skipped: "Geen push voor normale meldingen." }), { headers: corsHeaders });
      }
    }

    const preference = preferenceColumn(payload.category);
    let targetUserIds: string[] = [];

    if (payload.audience === "user" && payload.user_id) {
      const { data: preferenceRow } = await supabaseAdmin
        .from("notification_preferences")
        .select(`user_id, ${preference}`)
        .eq("user_id", payload.user_id)
        .maybeSingle();
      targetUserIds = preferenceRow?.[preference] === false ? [] : [payload.user_id];
    } else {
      const { data: preferenceRows, error: preferenceError } = await supabaseAdmin
        .from("notification_preferences")
        .select("user_id")
        .eq(preference, true);
      if (preferenceError) throw preferenceError;
      targetUserIds = (preferenceRows ?? []).map((row) => row.user_id);
    }

    if (targetUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders });
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth,user_id")
      .in("user_id", targetUserIds);

    if (error) throw error;

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url ?? "/",
      tag: payload.category ?? "mijn-graaf-van-schuyt",
      renotify: payload.importance === "urgent",
    });

    const results = await Promise.allSettled(
      (subscriptions ?? []).map((subscription) =>
        webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload,
        ),
      ),
    );

    const failedEndpoints = results
      .map((result, index) => ({ result, subscription: subscriptions?.[index] }))
      .filter(({ result }) => result.status === "rejected")
      .map(({ subscription }) => subscription?.endpoint)
      .filter(Boolean);

    if (failedEndpoints.length > 0) {
      await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", failedEndpoints);
    }

    return new Response(JSON.stringify({ sent: results.filter((result) => result.status === "fulfilled").length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
