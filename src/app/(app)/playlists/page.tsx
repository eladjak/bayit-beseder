"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, ListChecks } from "lucide-react";
import { PLAYLISTS } from "@/lib/playlists";
import { usePlaylistTimer } from "@/hooks/usePlaylistTimer";
import { PlaylistPlayer } from "@/components/playlist-player";
import { useTranslation } from "@/hooks/useTranslation";

export default function PlaylistsPage() {
  const { t } = useTranslation();
  const timer = usePlaylistTimer();
  const [showPlayer, setShowPlayer] = useState(false);

  function handleStart(playlistId: string) {
    const playlist = PLAYLISTS.find((p) => p.id === playlistId);
    if (!playlist) return;
    timer.start(playlist);
    setShowPlayer(true);
  }

  function handleStop() {
    timer.stop();
    setShowPlayer(false);
  }

  // Build props for PlaylistPlayer (timer state + overridden stop)
  const playerProps = {
    ...timer,
    stop: handleStop,
  };

  return (
    <div className="space-y-5">
      {/* Gradient header */}
      <div className="gradient-hero rounded-b-3xl overflow-hidden">
        <Image
          src="/illustrations/playlist-cleaning.jpg"
          alt={t("playlists.imageAlt")}
          width={512}
          height={144}
          sizes="(max-width: 512px) 100vw, 512px"
          className="w-full h-36 object-cover opacity-60"
        />
        <div className="text-center px-4 pt-4 pb-8 -mt-4 relative z-10">
          <h1 className="text-2xl font-bold text-white">{t("playlists.title")}</h1>
          <p className="text-sm text-white/70 mt-1">
            {t("playlists.subtitle")}
          </p>
        </div>
      </div>

      {/* Cards grid */}
      <div className="px-4 -mt-2 pb-4">
        <div className="grid grid-cols-2 gap-3">
          {PLAYLISTS.map((playlist, i) => (
            <motion.button
              key={playlist.id}
              onClick={() => handleStart(playlist.id)}
              className="card-elevated p-4 text-right flex flex-col gap-2 active:scale-95 transition-transform"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <span className="text-3xl">{playlist.icon}</span>
              <span className="text-sm font-bold text-foreground leading-tight">
                {playlist.name}
              </span>
              <div className="flex flex-col gap-1 mt-auto">
                <div className="flex items-center gap-1 text-muted">
                  <Clock className="w-3 h-3" />
                  <span className="text-[11px]">{playlist.totalMinutes} {t("common.minutes")}</span>
                </div>
                <div className="flex items-center gap-1 text-muted">
                  <ListChecks className="w-3 h-3" />
                  <span className="text-[11px]">
                    {playlist.tasks.length} {t("playlists.tasks")}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Info note */}
        <motion.p
          className="text-center text-xs text-muted mt-6 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {t("playlists.hint")}
        </motion.p>
      </div>

      {/* Active player overlay */}
      <AnimatePresence>
        {showPlayer && timer.currentPlaylist && (
          <PlaylistPlayer {...playerProps} />
        )}
      </AnimatePresence>
    </div>
  );
}
