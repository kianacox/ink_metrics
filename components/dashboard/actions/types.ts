export interface Action {
  actionId: string;
  clientId: string;
  clientName: string;
  actionType: "lapsed_repeat" | "new_client" | "in_progress";
  weeksSince: number;
  revenueAtRiskMinor: number;
  messageTemplate: string;
}
