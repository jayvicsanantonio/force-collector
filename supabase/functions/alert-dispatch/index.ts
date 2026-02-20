import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  sendExpoPushMessages,
  shouldSendForPreferences,
  type ExpoPushMessage,
} from "../_shared/push.ts";

const DEFAULT_COOLDOWN_HOURS = 24;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function getAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  });
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

type Listing = {
  id: string;
  figure_id: string;
  retailer: string;
  current_price: number | string | null;
  currency: string;
  in_stock: boolean | null;
};

type HistoryPoint = {
  price: number | string;
  currency: string;
  in_stock: boolean | null;
  captured_at: string;
};

type AlertCandidate = {
  listing: Listing;
  current: HistoryPoint;
  previous: HistoryPoint;
};

serve(async () => {
  try {
    const supabase = getAdminClient();
    const now = new Date();

    const { data: alerts, error: alertError } = await supabase
      .from("price_alerts")
      .select(
        "id,user_id,user_figure_id,target_price,currency,enabled,retailers,notify_on_restock,cooldown_hours"
      )
      .eq("enabled", true);

    if (alertError) {
      throw alertError;
    }

    if (!alerts?.length) {
      return jsonResponse({ ok: true, alerts: 0, sent: 0 });
    }

    const userFigureIds = unique(
      alerts.map((alert) => alert.user_figure_id).filter(Boolean)
    );

    const { data: userFigures, error: userFigureError } = await supabase
      .from("user_figures")
      .select("id,figure_id")
      .in("id", userFigureIds);

    if (userFigureError) {
      throw userFigureError;
    }

    const userFigureById = new Map(
      (userFigures ?? []).map((row) => [row.id, row])
    );

    const figureIds = unique(
      (userFigures ?? [])
        .map((row) => row.figure_id)
        .filter((value): value is string => Boolean(value))
    );

    const { data: figures, error: figureError } = await supabase
      .from("figures")
      .select("id,name")
      .in("id", figureIds);

    if (figureError) {
      throw figureError;
    }

    const figureNameById = new Map(
      (figures ?? []).map((row) => [row.id, row.name])
    );

    const { data: listings, error: listingError } = await supabase
      .from("retailer_listings")
      .select("id,figure_id,retailer,current_price,currency,in_stock")
      .in("figure_id", figureIds);

    if (listingError) {
      throw listingError;
    }

    const listingsByFigure = new Map<string, Listing[]>();
    for (const listing of listings ?? []) {
      const bucket = listingsByFigure.get(listing.figure_id) ?? [];
      bucket.push(listing as Listing);
      listingsByFigure.set(listing.figure_id, bucket);
    }

    const userIds = unique(alerts.map((alert) => alert.user_id));

    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("user_id,preferences")
      .in("user_id", userIds);

    if (profileError) {
      throw profileError;
    }

    const preferencesByUser = new Map(
      (profiles ?? []).map((row) => [row.user_id, row.preferences])
    );

    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("user_id,expo_push_token")
      .in("user_id", userIds);

    if (tokenError) {
      throw tokenError;
    }

    const tokensByUser = new Map<string, string[]>();
    for (const token of tokens ?? []) {
      if (!token.expo_push_token) {
        continue;
      }
      const bucket = tokensByUser.get(token.user_id) ?? [];
      bucket.push(token.expo_push_token);
      tokensByUser.set(token.user_id, bucket);
    }

    const historyCache = new Map<string, HistoryPoint[]>();

    async function getHistory(listingId: string) {
      if (historyCache.has(listingId)) {
        return historyCache.get(listingId) ?? [];
      }
      const { data, error } = await supabase
        .from("price_history_points")
        .select("price,currency,in_stock,captured_at")
        .eq("retailer_listing_id", listingId)
        .order("captured_at", { ascending: false })
        .limit(2);
      if (error) {
        throw error;
      }
      const history = (data ?? []) as HistoryPoint[];
      historyCache.set(listingId, history);
      return history;
    }

    const messages: ExpoPushMessage[] = [];
    const eventsToInsert: Array<Record<string, unknown>> = [];
    let processed = 0;

    for (const alert of alerts) {
      processed += 1;
      const userFigure = userFigureById.get(alert.user_figure_id);
      const figureId = userFigure?.figure_id ?? null;
      if (!figureId) {
        continue;
      }

      const relevantListings = listingsByFigure.get(figureId) ?? [];
      if (!relevantListings.length) {
        continue;
      }

      const preferredRetailers = Array.isArray(alert.retailers)
        ? alert.retailers
        : [];
      const candidateListings = preferredRetailers.length
        ? relevantListings.filter((listing) =>
            preferredRetailers.includes(listing.retailer)
          )
        : relevantListings;

      if (!candidateListings.length) {
        continue;
      }

      const priceCandidates: AlertCandidate[] = [];
      const restockCandidates: AlertCandidate[] = [];
      const targetPrice = toNumber(alert.target_price);
      if (targetPrice === null) {
        continue;
      }

      for (const listing of candidateListings) {
        const history = await getHistory(listing.id);
        if (history.length < 2) {
          continue;
        }
        const [current, previous] = history;
        const currentPrice = toNumber(current.price);
        const previousPrice = toNumber(previous.price);
        if (
          currentPrice !== null &&
          previousPrice !== null &&
          currentPrice <= targetPrice &&
          previousPrice > targetPrice
        ) {
          priceCandidates.push({
            listing,
            current: { ...current, price: currentPrice },
            previous: { ...previous, price: previousPrice },
          });
        }

        if (
          alert.notify_on_restock &&
          current.in_stock === true &&
          previous.in_stock !== true
        ) {
          restockCandidates.push({ listing, current, previous });
        }
      }

      let selected: { type: "price_drop" | "restock"; candidate: AlertCandidate } | null =
        null;

      if (priceCandidates.length) {
        priceCandidates.sort((a, b) => a.current.price - b.current.price);
        selected = { type: "price_drop", candidate: priceCandidates[0] };
      } else if (restockCandidates.length) {
        selected = { type: "restock", candidate: restockCandidates[0] };
      }

      if (!selected) {
        continue;
      }

      const cooldownHours =
        typeof alert.cooldown_hours === "number"
          ? alert.cooldown_hours
          : DEFAULT_COOLDOWN_HOURS;

      const { data: lastEvents, error: lastEventError } = await supabase
        .from("price_alert_events")
        .select("triggered_at")
        .eq("price_alert_id", alert.id)
        .eq("event_type", selected.type)
        .order("triggered_at", { ascending: false })
        .limit(1);

      if (lastEventError) {
        throw lastEventError;
      }

      if (lastEvents?.length) {
        const lastTriggered = new Date(lastEvents[0].triggered_at);
        const nextAllowed = new Date(
          lastTriggered.getTime() + cooldownHours * 60 * 60 * 1000
        );
        if (nextAllowed > now) {
          continue;
        }
      }

      const preferences = preferencesByUser.get(alert.user_id) ?? null;
      const notificationPrefs =
        (preferences?.notifications as Record<string, boolean> | undefined) ??
        (preferences as Record<string, boolean> | null);
      if (!shouldSendForPreferences(notificationPrefs, selected.type)) {
        continue;
      }

      const userTokens = tokensByUser.get(alert.user_id) ?? [];
      if (!userTokens.length) {
        continue;
      }

      const figureName = figureNameById.get(figureId) ?? "Wishlist item";
      const deeplink =
        selected.type === "price_drop"
          ? `/wishlist/details?userFigureId=${alert.user_figure_id}&figureId=${figureId}`
          : `/wishlist?figureId=${figureId}`;

      const eventPrice = toNumber(selected.candidate.current.price);
      const priceText =
        typeof eventPrice === "number" ? `${eventPrice.toFixed(2)}` : null;

      const retailerLabel = selected.candidate.listing.retailer;

      const title =
        selected.type === "price_drop"
          ? `${figureName} price drop`
          : `${figureName} back in stock`;

      const body =
        selected.type === "price_drop"
          ? `Now ${priceText ?? "available"} at ${retailerLabel}.`
          : `Available at ${retailerLabel}.`;

      for (const token of userTokens) {
        messages.push({
          to: token,
          title,
          body,
          sound: "default",
          data: {
            type: selected.type,
            figure_id: figureId,
            user_figure_id: alert.user_figure_id,
            deeplink,
          },
        });
      }

      eventsToInsert.push({
        price_alert_id: alert.id,
        user_id: alert.user_id,
        user_figure_id: alert.user_figure_id,
        retailer_listing_id: selected.candidate.listing.id,
        event_type: selected.type,
        price: eventPrice,
        currency: selected.candidate.current.currency ?? alert.currency,
        in_stock: selected.candidate.current.in_stock ?? null,
        triggered_at: now.toISOString(),
      });
    }

    if (messages.length) {
      await sendExpoPushMessages(messages);
    }

    if (eventsToInsert.length) {
      const { error: eventInsertError } = await supabase
        .from("price_alert_events")
        .insert(eventsToInsert);
      if (eventInsertError) {
        throw eventInsertError;
      }
    }

    return jsonResponse({
      ok: true,
      alerts: alerts.length,
      processed,
      sent: messages.length,
      events: eventsToInsert.length,
    });
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
