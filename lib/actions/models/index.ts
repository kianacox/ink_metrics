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

export interface ActionResponse {
  actionId: string;
  clientId: string;
  clientName: string;
  actionType: ActionType;
  weeksSince: number;
  revenueAtRiskMinor: number;
  messageTemplate: string;
}

export interface UpsertRow {
  user_id: string;
  client_id: string;
  action_type: ActionType;
  session_id: string | null;
  revenue_at_risk_minor: number;
  dismissed_at: null;
}
