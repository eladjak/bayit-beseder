"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, animate, motion } from "framer-motion";

export function AnimatedNumber({
  value,
  suffix = "",
  className = "",
  duration = 0.8,
}: {
  value: number;
  suffix?: string;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(Math.round(latest)),
    });
    return controls.stop;
  }, [isInView, value, motionValue, duration]);

  return (
    <motion.span
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {display}
      {suffix}
    </motion.span>
  );
}
