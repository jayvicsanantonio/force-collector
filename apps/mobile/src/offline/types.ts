export type FigureStatus = "OWNED" | "WISHLIST" | "PREORDER" | "SOLD";

export type CachedFigure = {
  id: string;
  figureId: string | null;
  name: string;
  series: string | null;
  status: FigureStatus;
  lastPrice: number | null;
  inStock: boolean | null;
  updatedAt: string;
  syncPending: boolean;
};

export type PendingMutation =
  | {
      id: string;
      type: "status_update";
      entityId: string;
      payload: {
        status: FigureStatus;
        updatedAt: string;
      };
      createdAt: string;
    }
  | {
      id: string;
      type: "create_user_figure";
      entityId: string;
      payload: {
        figureId: string;
        status: FigureStatus;
        name: string;
        series: string | null;
        updatedAt: string;
      };
      createdAt: string;
    };

export type DashboardSummary = {
  totalOwned: number;
  totalWishlist: number;
  pendingSync: number;
};
