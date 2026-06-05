import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const siteUrl = Deno.env.get("PUBLIC_SITE_URL") ?? "https://mijn-graaf-van-schuyt.vercel.app";

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Supabase instellingen ontbreken voor toegangsaanvragen." }), { status: 500, headers: corsHeaders });
    }

    const authHeader = request.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Log opnieuw in om deze aanvraag goed te keuren." }), { status: 401, headers: corsHeaders });
    }

    const { data: profile } = await adminClient
      .from("profiles")
      .select("rol")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (profile?.rol !== "admin") {
      return new Response(JSON.stringify({ error: "Alleen beheerders mogen bewoners goedkeuren." }), { status: 403, headers: corsHeaders });
    }

    const body = await request.json();
    const requestId = String(body.request_id ?? "");
    if (!requestId) {
      return new Response(JSON.stringify({ error: "Aanvraag ontbreekt." }), { status: 400, headers: corsHeaders });
    }

    const { data: accessRequest, error: accessError } = await adminClient
      .from("access_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (accessError) throw accessError;
    if (!accessRequest) {
      return new Response(JSON.stringify({ error: "Deze aanvraag is niet gevonden." }), { status: 404, headers: corsHeaders });
    }
    if (accessRequest.status !== "Nieuw") {
      return new Response(JSON.stringify({ error: "Deze aanvraag is al verwerkt." }), { status: 409, headers: corsHeaders });
    }

    const origin = request.headers.get("Origin") || siteUrl;
    const redirectTo = `${origin.replace(/\/$/, "")}/?type=invite`;
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(accessRequest.email, {
      data: {
        naam_of_bijnaam: accessRequest.naam_of_bijnaam,
        achternaam: accessRequest.achternaam ?? "",
        huisnummer: accessRequest.huisnummer,
      },
      redirectTo,
    });

    if (inviteError) {
      return new Response(JSON.stringify({ error: inviteError.message }), { status: 400, headers: corsHeaders });
    }

    const timestamp = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from("access_requests")
      .update({
        status: "Goedgekeurd",
        approved_by: userData.user.id,
        approved_at: timestamp,
        invited_user_id: inviteData.user?.id ?? null,
        updated_at: timestamp,
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ ok: true, user_id: inviteData.user?.id ?? null }), { headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Onbekende fout." }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
