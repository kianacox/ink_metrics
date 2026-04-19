"use client";

import { forwardRef } from "react";
import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

type AnimatedCardProps = HTMLMotionProps<"div"> & {
  index?: number;
};

export const AnimatedCard = forwardRef<HTMLDivElement, AnimatedCardProps>(
  ({ index = 0, className, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();

    const variants: Variants = {
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          duration: 0.3,
          ease: "easeOut",
          delay: Math.min(index, 8) * 0.06,
        },
      },
    };

    return (
      <motion.div
        ref={ref}
        className={cn("rounded-none border bg-card text-card-foreground shadow", className)}
        initial={shouldReduceMotion ? false : "hidden"}
        animate="visible"
        variants={variants}
        whileHover={
          shouldReduceMotion
            ? undefined
            : {
                // Hardcoded dark-mode gold — CSS vars can't be used in framer-motion style values.
                // If --gold (dark) changes, update this literal too.
                boxShadow: "0 0 0 1px hsl(44 54% 54% / 0.3)",
              }
        }
        transition={{ duration: 0.15, ease: "easeOut" }}
        {...props}
      />
    );
  },
);

AnimatedCard.displayName = "AnimatedCard";
