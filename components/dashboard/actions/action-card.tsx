"use client";

import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, CardContent, CardFooter } from "@/components/ui";
import { formatMinorAsCurrency } from "@/lib/dashboard-analytics";
import { getActionTypeLabel, isHighPriority } from "./action-priority";
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

  const high = isHighPriority(action.actionType);
  const typeLabel = getActionTypeLabel(action.actionType);
  const priority = high ? "HIGH" : "MEDIUM";

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
    <Card className="relative overflow-hidden">
      {/* Left accent bar */}
      <div
        className={`absolute inset-y-0 left-0 w-0.5 ${high ? "bg-destructive" : "bg-amber-400 dark:bg-amber-500"}`}
      />

      <CardContent className="pl-4 pt-5">
        {/* Header: type label + priority badge */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {typeLabel}
          </span>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
              high
                ? "bg-destructive/10 text-destructive"
                : "bg-amber-400/15 text-amber-700 dark:text-amber-400"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${high ? "bg-destructive" : "bg-amber-500"}`}
            />
            {priority}
          </span>
        </div>

        {/* Client info + revenue at risk */}
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{action.clientName}</p>
            <p className="mt-0.5 text-sm text-foreground">
              {getNudgeCopy(action.actionType, action.weeksSince)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">at risk</p>
            <p className="text-base font-bold text-foreground">
              {formatMinorAsCurrency(action.revenueAtRiskMinor, currencyCode)}
            </p>
          </div>
        </div>

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
              <div className="rounded-none border border-border bg-muted/40 px-3 py-2.5 text-sm text-foreground whitespace-pre-wrap">
                {action.messageTemplate}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 rounded-none"
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
          className="rounded-none"
          onClick={() => setIsTemplateOpen((prev) => !prev)}
        >
          {isTemplateOpen ? "Hide message" : "View message"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="rounded-none"
          onClick={handleDismiss}
          disabled={isDismissing}
        >
          Dismiss
        </Button>
      </CardFooter>
    </Card>
  );
}
