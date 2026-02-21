export type EbayListingSnapshot = {
  price: number | null;
  currency: string | null;
  inStock: boolean | null;
  rawStatus?: string | null;
};

const DEFAULT_MARKETPLACE_ID = "EBAY-US";

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function extractEbayItemId(productUrl: string | null | undefined) {
  if (!productUrl) {
    return null;
  }
  const match = productUrl.match(/\/itm\/(\d+)/i);
  if (match?.[1]) {
    return match[1];
  }
  const alt = productUrl.match(/itm\/?(\d+)/i);
  return alt?.[1] ?? null;
}

export async function fetchEbayListing(
  itemId: string
): Promise<EbayListingSnapshot | null> {
  const token =
    Deno.env.get("EBAY_OAUTH_TOKEN") ?? Deno.env.get("EBAY_BROWSE_TOKEN");
  if (!token) {
    throw new Error("Missing EBAY_OAUTH_TOKEN for eBay Browse API.");
  }

  const marketplaceId =
    Deno.env.get("EBAY_MARKETPLACE_ID") ?? DEFAULT_MARKETPLACE_ID;

  const response = await fetch(
    `https://api.ebay.com/buy/browse/v1/item/${itemId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-EBAY-C-MARKETPLACE-ID": marketplaceId,
      },
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `eBay Browse API failed: ${response.status} ${response.statusText} ${text}`
    );
  }

  const data = (await response.json()) as Record<string, unknown>;
  const priceObj = data.price as Record<string, unknown> | undefined;
  const availability = data.availability as Record<string, unknown> | undefined;

  const price = parseNumber(priceObj?.value);
  const currency =
    (typeof priceObj?.currency === "string"
      ? priceObj?.currency
      : undefined) ??
    (typeof priceObj?.currencyCode === "string"
      ? priceObj?.currencyCode
      : null);

  const status =
    typeof availability?.availabilityStatus === "string"
      ? availability.availabilityStatus
      : null;

  const inStock =
    status === null
      ? null
      : status === "IN_STOCK"
        ? true
        : false;

  return {
    price,
    currency,
    inStock,
    rawStatus: status,
  };
}
