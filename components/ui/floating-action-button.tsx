import { Plus } from "lucide-react";
import type { ButtonHTMLAttributes } from "react";

type FloatingActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "className">;

export function FloatingActionButton(props: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.75rem)] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90 lg:bottom-6 sm:right-6"
      {...props}
    >
      <Plus className="h-6 w-6" aria-hidden="true" />
    </button>
  );
}
