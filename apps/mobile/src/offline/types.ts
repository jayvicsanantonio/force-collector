export type FigureStatus = "OWNED" | "WISHLIST" | "PREORDER" | "SOLD";

export type CachedFigure = {
  id: string;
  figureId: string | null;
  name: string;
  series: string | null;
  status: FigureStatus;
  lastPrice: number | null;
  inStock: boolean | null;
  condition?: "MINT" | "OPENED" | "LOOSE" | "UNKNOWN";
  purchasePrice?: number | null;
  purchaseCurrency?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  photoRefs?: string[] | null;
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
    }
  | {
      id: string;
      type: "details_update";
      entityId: string;
      payload: {
        condition?: "MINT" | "OPENED" | "LOOSE" | "UNKNOWN" | null;
        purchasePrice?: number | null;
        purchaseCurrency?: string | null;
        purchaseDate?: string | null;
        notes?: string | null;
        photoRefs?: string[] | null;
        updatedAt: string;
      };
      createdAt: string;
    };

export type DashboardSummary = {
  totalOwned: number;
  totalWishlist: number;
  pendingSync: number;
  estimatedValue: number;
  completionPercent: number;
};
