export type ActionType = "lapsed_repeat" | "new_client" | "in_progress";

export interface ClientAction {
  actionId: string;
  userId: string;
  clientId: string;
  actionType: ActionType;
  sessionId: string | null;
  revenueAtRiskMinor: number | null;
  dismissedAt: string | null;
  createdAt: string;
}

export interface LapsedRepeatSignal {
  clientId: string;
  revenueAtRiskMinor: number;
}

export interface NewClientSignal {
  clientId: string;
  revenueAtRiskMinor: number;
}

export interface InProgressSignal {
  clientId: string;
  sessionId: string;
  revenueAtRiskMinor: number;
}

export interface SessionRow {
  sessionId: string;
  clientId: string;
  priceMinor: number;
  sessionAt: string;
  inProgress: boolean;
}
