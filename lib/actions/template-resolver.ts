import type { ActionType } from "@/lib/actions/models";

const TEMPLATES: Record<ActionType, string> = {
  lapsed_repeat: `Hey {{client_name}}! It's been a while — hope you're well.\nI've got some availability coming up if you've been thinking about\nyour next piece. Let me know if you'd like to get something booked in!`,
  new_client: `Hey {{client_name}}! Really enjoyed tattooing you — hope you're\nloving the piece. If you've been thinking about adding to your\ncollection, I'd love to work with you again. Feel free to reach out!`,
  in_progress: `Hey {{client_name}}! Just checking in on your piece — hope it's\nhealing well. Whenever you're ready to book the next session, just\ngive me a shout and we'll get it sorted.`,
};

export function resolveMessageTemplate(actionType: ActionType, clientName: string): string {
  return TEMPLATES[actionType].replace(/\{\{client_name\}\}/g, clientName);
}
