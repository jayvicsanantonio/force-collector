import test from "node:test";
import assert from "node:assert/strict";

import {
  FigureSchema,
  PriceAlertSchema,
  PriceHistoryPointSchema,
  RetailerListingSchema,
} from "../../packages/shared/src/entities.ts";
import {
  HydratedUserFigureListResponseSchema,
  PriceAlertListResponseSchema,
  PriceResponseSchema,
} from "../../packages/shared/src/api.ts";

test("FigureSchema accepts nullable backend-style figure payloads", () => {
  const result = FigureSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000001",
    name: "Darth Vader",
    subtitle: "Archive",
    edition: null,
    series: "The Black Series",
    wave: null,
    release_year: 2020,
    era: "ORIGINAL",
    faction: "Empire",
    exclusivity: "General",
    upc: "630509989138",
    primary_image_url: null,
    lore: null,
    specs: {},
    created_at: "2026-03-01T00:00:00.000Z",
    updated_at: "2026-03-01T00:00:00.000Z",
  });

  assert.equal(result.success, true);
});

test("RetailerListingSchema coerces numeric strings and nullable timestamps", () => {
  const result = RetailerListingSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000002",
    figure_id: "00000000-0000-4000-8000-000000000001",
    retailer: "AMAZON",
    product_url: "https://example.com/listing",
    external_id: null,
    last_checked_at: null,
    in_stock: true,
    current_price: "24.99",
    currency: "USD",
  });

  assert.equal(result.success, true);
  assert.equal(result.success && result.data.current_price, 24.99);
});

test("PriceResponseSchema accepts normalized pricing payloads", () => {
  const result = PriceResponseSchema.safeParse({
    listings: [
      {
        id: "00000000-0000-4000-8000-000000000003",
        figure_id: "00000000-0000-4000-8000-000000000001",
        retailer: "EBAY",
        product_url: "https://example.com/ebay",
        external_id: "123",
        last_checked_at: "2026-03-01T00:00:00.000Z",
        in_stock: false,
        current_price: "31.50",
        currency: "USD",
      },
    ],
    history: [
      {
        id: "00000000-0000-4000-8000-000000000004",
        retailer_listing_id: "00000000-0000-4000-8000-000000000003",
        price: "31.50",
        currency: "USD",
        in_stock: false,
        captured_at: "2026-03-01T00:00:00.000Z",
      },
    ],
  });

  assert.equal(result.success, true);
  assert.equal(result.success && result.data.history[0].price, 31.5);
});

test("Hydrated user figure list accepts nested figure and listing summary payloads", () => {
  const result = HydratedUserFigureListResponseSchema.safeParse({
    items: [
      {
        id: "00000000-0000-4000-8000-000000000005",
        user_id: "00000000-0000-4000-8000-000000000006",
        figure_id: "00000000-0000-4000-8000-000000000001",
        custom_figure_payload: null,
        status: "OWNED",
        condition: "UNKNOWN",
        purchase_price: null,
        purchase_currency: null,
        purchase_date: null,
        notes: null,
        photo_refs: null,
        created_at: "2026-03-01T00:00:00.000Z",
        updated_at: "2026-03-01T00:00:00.000Z",
        figure: {
          id: "00000000-0000-4000-8000-000000000001",
          name: "Darth Vader",
          subtitle: null,
          edition: null,
          series: "The Black Series",
          wave: null,
          release_year: 2020,
          era: "ORIGINAL",
          faction: "Empire",
          exclusivity: "General",
          upc: null,
          primary_image_url: null,
          lore: null,
          specs: {},
          created_at: "2026-03-01T00:00:00.000Z",
          updated_at: "2026-03-01T00:00:00.000Z",
        },
        listing_summary: {
          last_price: 24.99,
          in_stock: true,
          last_checked_at: "2026-03-01T00:00:00.000Z",
        },
      },
    ],
    next_cursor: null,
  });

  assert.equal(result.success, true);
});

test("Price alert schemas accept numeric strings from PostgREST", () => {
  const alert = {
    id: "00000000-0000-4000-8000-000000000007",
    user_id: "00000000-0000-4000-8000-000000000006",
    user_figure_id: "00000000-0000-4000-8000-000000000005",
    target_price: "19.99",
    currency: "USD",
    enabled: true,
    retailers: ["AMAZON", "TARGET"],
    notify_on_restock: true,
    cooldown_hours: "24",
  };

  const itemResult = PriceAlertSchema.safeParse(alert);
  const listResult = PriceAlertListResponseSchema.safeParse({ items: [alert] });

  assert.equal(itemResult.success, true);
  assert.equal(listResult.success, true);
  assert.equal(itemResult.success && itemResult.data.target_price, 19.99);
});

test("PriceHistoryPointSchema rejects non-numeric price values", () => {
  const result = PriceHistoryPointSchema.safeParse({
    id: "00000000-0000-4000-8000-000000000008",
    retailer_listing_id: "00000000-0000-4000-8000-000000000003",
    price: "not-a-number",
    currency: "USD",
    in_stock: true,
    captured_at: "2026-03-01T00:00:00.000Z",
  });

  assert.equal(result.success, false);
});
