export type FigureStatus = "OWNED" | "WISHLIST";

export type CachedFigure = {
  id: string;
  name: string;
  series: string | null;
  status: FigureStatus;
  lastPrice: number | null;
  inStock: boolean | null;
  updatedAt: string;
  syncPending: boolean;
};

export type PendingMutation = {
  id: string;
  type: "status_update";
  entityId: string;
  payload: {
    status: FigureStatus;
    updatedAt: string;
  };
  createdAt: string;
};

export type DashboardSummary = {
  totalOwned: number;
  totalWishlist: number;
  pendingSync: number;
};
