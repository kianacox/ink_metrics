import type { Action } from "./types";

type ActionType = Action["actionType"];
export type ActionPriority = "HIGH" | "MEDIUM";

export function getActionPriority(actionType: ActionType): ActionPriority {
  return actionType === "lapsed_repeat" ? "HIGH" : "MEDIUM";
}

export function getActionTypeLabel(actionType: ActionType): string {
  switch (actionType) {
    case "lapsed_repeat":
      return "Retention";
    case "new_client":
      return "Follow-up";
    case "in_progress":
      return "In Progress";
  }
}

export function isHighPriority(actionType: ActionType): boolean {
  return getActionPriority(actionType) === "HIGH";
}
