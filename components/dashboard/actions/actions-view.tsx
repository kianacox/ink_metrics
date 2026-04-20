"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ActionCard, type Action } from "./action-card";
import { ActionCardSkeleton } from "./action-card-skeleton";
import { ActionsEmptyState } from "./actions-empty-state";
import { ActionsErrorState } from "./actions-error-state";

interface ActionsViewProps {
  displayName: string | null;
}

export function ActionsView({ displayName }: ActionsViewProps) {
  const [actions, setActions] = useState<Action[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const res = await fetch("/api/dashboard/actions");
      if (!res.ok) throw new Error("fetch failed");
      const { actions: fetched } = (await res.json()) as { actions: Action[] };
      setActions(fetched);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const handleDismiss = useCallback((actionId: string) => {
    setActions((prev) => prev.filter((a) => a.actionId !== actionId));
  }, []);

  const handleDismissError = useCallback(() => {
    setToast("Couldn't dismiss action. Please try again.");
    setTimeout(() => setToast(null), 3000);
  }, []);

  const greeting = `Hey ${displayName ?? "there"}, here's who needs a message:`;

  return (
    <div className="mx-auto w-full max-w-2xl">
      {toast !== null && (
        <div
          className="fixed right-4 top-4 z-50 max-w-xs rounded-md border border-border bg-background px-4 py-3 text-sm shadow-lg sm:right-6 sm:top-6"
          role="status"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {isLoading && (
        <div className="flex flex-col gap-4" aria-label="Loading actions">
          <ActionCardSkeleton />
          <ActionCardSkeleton />
          <ActionCardSkeleton />
        </div>
      )}

      {!isLoading && hasError && <ActionsErrorState onRetry={fetchActions} />}

      {!isLoading && !hasError && actions.length === 0 && <ActionsEmptyState />}

      {!isLoading && !hasError && actions.length > 0 && (
        <>
          <p className="mb-4 text-sm font-medium text-foreground">{greeting}</p>
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {actions.map((action) => (
                <motion.div
                  key={action.actionId}
                  layout
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <ActionCard
                    action={action}
                    onDismiss={handleDismiss}
                    onDismissError={handleDismissError}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
}
