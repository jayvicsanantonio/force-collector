export const queryKeys = {
  me: () => ["me"],
  catalog: (query: string, filters?: Record<string, string>) => [
    "catalog",
    query,
    filters ?? {},
  ],
  figure: (id: string) => ["figure", id],
  scan: (barcode: string) => ["scan", barcode],
  collection: (status?: string, query?: string) => [
    "collection",
    status ?? "ALL",
    query ?? "",
  ],
  wishlist: (query?: string) => ["wishlist", query ?? ""],
  price: (userFigureId: string) => ["price", userFigureId],
  priceAlerts: () => ["price-alerts"],
  analyticsSummary: (range: string) => ["analytics", "summary", range],
  analyticsSeries: (range: string) => ["analytics", "series", range],
  analyticsDistribution: (by: string, range: string) => [
    "analytics",
    "distribution",
    by,
    range,
  ],
};
