"use client";

import Image from "next/image";
import { motion } from "framer-motion";

interface CategoryCardProps {
  categoryKey: string;
  label: string;
  illustration?: string;
  icon?: string;
  isActive?: boolean;
  count?: number;
  onClick?: () => void;
  size?: "sm" | "md";
}

export function CategoryCard({
  categoryKey,
  label,
  illustration,
  icon,
  isActive = false,
  count,
  onClick,
  size = "md",
}: CategoryCardProps) {
  const isSm = size === "sm";

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      aria-label={`קטגוריה: ${label}`}
      aria-pressed={isActive}
      className={`relative flex-shrink-0 rounded-2xl overflow-hidden transition-all ${
        isSm ? "w-20 h-20" : "w-28 h-28"
      } ${
        isActive
          ? "ring-2 ring-primary shadow-lg shadow-primary/20"
          : "ring-1 ring-border/30 opacity-80 hover:opacity-100"
      }`}
    >
      {/* Background image or fallback */}
      {illustration ? (
        <Image
          src={illustration}
          alt={label}
          fill
          className="object-cover"
          sizes={isSm ? "80px" : "112px"}
        />
      ) : (
        <div className="absolute inset-0 bg-surface" />
      )}

      {/* Dark overlay for text readability */}
      <div
        className={`absolute inset-0 ${
          isActive
            ? "bg-gradient-to-t from-primary/80 to-primary/20"
            : "bg-gradient-to-t from-black/60 to-black/10"
        }`}
      />

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end p-1.5">
        {icon && (
          <span className={isSm ? "text-base mb-0.5" : "text-xl mb-1"}>
            {icon}
          </span>
        )}
        <span
          className={`text-white font-medium leading-tight text-center ${
            isSm ? "text-[10px]" : "text-xs"
          }`}
        >
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-primary text-white text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-sm">
            {count}
          </span>
        )}
      </div>
    </motion.button>
  );
}
