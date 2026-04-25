"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, CardContent, CardFooter } from "@/components/ui";
import { formatMinorAsCurrency } from "@/lib/dashboard-analytics";
import type { Action } from "./types";

export type { Action };

function getNudgeCopy(actionType: Action["actionType"], weeksSince: number): string {
  switch (actionType) {
    case "lapsed_repeat":
      return `It's been ${weeksSince} weeks since their last session — worth a check-in.`;
    case "new_client":
      return `${weeksSince} weeks since their first visit — a quick message could bring them back.`;
    case "in_progress":
      return `Their piece is still in progress and it's been ${weeksSince} weeks — time to follow up.`;
  }
}

interface ActionCardProps {
  action: Action;
  currencyCode: string;
  onDismiss: (actionId: string) => void;
  onDismissError: () => void;
}

export function ActionCard({ action, currencyCode, onDismiss, onDismissError }: ActionCardProps) {
  const [isTemplateOpen, setIsTemplateOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(action.messageTemplate);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // clipboard write failed (permission denied or API unavailable) — no-op
    }
  }, [action.messageTemplate]);

  const handleDismiss = useCallback(async () => {
    setIsDismissing(true);
    try {
      const res = await fetch(`/api/dashboard/actions/${action.actionId}/dismiss`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("dismiss failed");
      onDismiss(action.actionId);
    } catch {
      setIsDismissing(false);
      onDismissError();
    }
  }, [action.actionId, onDismiss, onDismissError]);

  return (
    <Card>
      <CardContent className="pt-6">
        <p className="font-semibold text-foreground">{action.clientName}</p>
        <p className="mt-1 text-sm text-foreground">
          {getNudgeCopy(action.actionType, action.weeksSince)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatMinorAsCurrency(action.revenueAtRiskMinor, currencyCode)} at risk
        </p>

        <AnimatePresence initial={false}>
          {isTemplateOpen && (
            <motion.div
              key="template"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div className="mt-4 rounded border border-border bg-muted p-3 text-sm text-foreground whitespace-pre-wrap">
                {action.messageTemplate}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleCopy}
              >
                {isCopied ? "Copied!" : "Copy message"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsTemplateOpen((prev) => !prev)}
        >
          {isTemplateOpen ? "Hide message" : "View message"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          disabled={isDismissing}
        >
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
}
