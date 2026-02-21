import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  extractEbayItemId,
  fetchEbayListing,
} from "../_shared/retailers/ebay.ts";

const DEFAULT_INTERVAL_HOURS = 6;
const DEFAULT_BATCH_SIZE = 100;

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

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

serve(async () => {
  try {
    const supabase = getAdminClient();
    const intervalHours = Number(
      Deno.env.get("PRICE_CHECK_INTERVAL_HOURS") ?? DEFAULT_INTERVAL_HOURS
    );
    const batchSize = Number(
      Deno.env.get("PRICE_CHECK_BATCH_SIZE") ?? DEFAULT_BATCH_SIZE
    );

    const cutoff = hoursAgo(intervalHours);
    const { data: listings, error } = await supabase
      .from("retailer_listings")
      .select("*")
      .or(`last_checked_at.is.null,last_checked_at.lt.${cutoff}`)
      .limit(batchSize);

    if (error) {
      throw error;
    }

    const now = new Date().toISOString();
    const results = [] as Array<Record<string, unknown>>;
    let updated = 0;
    let skipped = 0;

    for (const listing of listings ?? []) {
      if (listing.retailer !== "EBAY") {
        skipped += 1;
        results.push({ id: listing.id, status: "skipped", reason: "retailer" });
        continue;
      }

      const itemId = listing.external_id ?? extractEbayItemId(listing.product_url);
      if (!itemId) {
        skipped += 1;
        results.push({
          id: listing.id,
          status: "skipped",
          reason: "missing_external_id",
        });
        continue;
      }

      try {
        const snapshot = await fetchEbayListing(itemId);
        if (!snapshot) {
          skipped += 1;
          results.push({ id: listing.id, status: "skipped", reason: "not_found" });
          continue;
        }

        const nextPrice = snapshot.price ?? listing.current_price ?? null;
        const nextCurrency = snapshot.currency ?? listing.currency;
        const nextInStock =
          snapshot.inStock === null ? listing.in_stock : snapshot.inStock;

        const { error: updateError } = await supabase
          .from("retailer_listings")
          .update({
            current_price: nextPrice,
            currency: nextCurrency,
            in_stock: nextInStock,
            last_checked_at: now,
          })
          .eq("id", listing.id);

        if (updateError) {
          throw updateError;
        }

        if (nextPrice !== null) {
          const { error: historyError } = await supabase
            .from("price_history_points")
            .insert({
              retailer_listing_id: listing.id,
              price: nextPrice,
              currency: nextCurrency,
              in_stock: nextInStock,
              captured_at: now,
            });
          if (historyError) {
            throw historyError;
          }
        }

        updated += 1;
        results.push({ id: listing.id, status: "updated" });
      } catch (err) {
        skipped += 1;
        results.push({
          id: listing.id,
          status: "error",
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return jsonResponse({
      ok: true,
      checked: listings?.length ?? 0,
      updated,
      skipped,
      results,
    });
  } catch (err) {
    return jsonResponse(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});
