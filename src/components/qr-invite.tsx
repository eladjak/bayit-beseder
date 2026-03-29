"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, Download, Share2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";

interface QRInviteProps {
  inviteCode: string;
  inviteLink: string;
}

export function QRInvite({ inviteCode, inviteLink }: QRInviteProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [qrReady, setQrReady] = useState(false);

  // Generate QR code onto canvas
  useEffect(() => {
    if (!inviteLink) return;

    let cancelled = false;

    void (async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        if (cancelled || !canvasRef.current) return;

        await QRCode.toCanvas(canvasRef.current, inviteLink, {
          width: 240,
          margin: 2,
          color: {
            dark: "#1a1a2e",
            light: "#ffffff",
          },
          errorCorrectionLevel: "M",
        });

        if (!cancelled) setQrReady(true);
      } catch {
        // QR generation failed silently
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inviteLink]);

  const handleCopyCode = useCallback(() => {
    void navigator.clipboard.writeText(inviteCode).then(() => {
      setCopied(true);
      toast.success(t("invite.codeCopied"));
      setTimeout(() => setCopied(false), 2000);
    });
  }, [inviteCode, t]);

  const handleDownloadQR = useCallback(() => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "bayit-beseder-invite-qr.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t("qr.downloaded"));
  }, [t]);

  const handleShareQR = useCallback(async () => {
    if (!canvasRef.current) return;

    // Try Web Share API with file
    if (typeof navigator.share === "function" && navigator.canShare) {
      try {
        canvasRef.current.toBlob(async (blob) => {
          if (!blob) return;
          const file = new File([blob], "bayit-beseder-invite.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: t("qr.shareTitle"),
              text: `${t("invite.whatsappMessage")}\n${inviteLink}`,
              files: [file],
            });
            return;
          }
          // Fallback: share link only
          await navigator.share({
            title: t("qr.shareTitle"),
            text: `${t("invite.whatsappMessage")}\n${inviteLink}`,
            url: inviteLink,
          });
        });
        return;
      } catch {
        // Share cancelled or failed
      }
    }

    // Fallback: download the QR
    handleDownloadQR();
  }, [inviteLink, handleDownloadQR, t]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* QR Code canvas */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {!qrReady && (
            <div className="w-[240px] h-[240px] rounded-2xl bg-surface border border-border flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={`rounded-2xl shadow-lg border border-border/50 transition-opacity duration-300 ${qrReady ? "opacity-100" : "opacity-0 absolute inset-0"}`}
            style={{ width: 240, height: 240 }}
          />
        </div>

        <p className="text-xs text-muted text-center">{t("qr.scanInstruction")}</p>
      </div>

      {/* Invite code */}
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-background border border-border rounded-xl px-3 py-2.5 text-base font-mono font-bold tracking-widest text-primary text-center">
          {inviteCode}
        </code>
        <button
          onClick={handleCopyCode}
          className="p-2.5 rounded-xl bg-background border border-border hover:bg-surface-hover transition-colors active:scale-90"
          aria-label={t("invite.copyCodeLabel")}
        >
          {copied ? (
            <Check className="w-4 h-4 text-success" />
          ) : (
            <Copy className="w-4 h-4 text-muted" />
          )}
        </button>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleShareQR}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-background hover:bg-surface-hover transition-colors text-sm font-medium text-foreground active:scale-[0.98]"
        >
          <Share2 className="w-4 h-4 text-muted" />
          {t("qr.share")}
        </button>
        <button
          onClick={handleDownloadQR}
          className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border bg-background hover:bg-surface-hover transition-colors text-sm font-medium text-foreground active:scale-[0.98]"
        >
          <Download className="w-4 h-4 text-muted" />
          {t("qr.download")}
        </button>
      </div>
    </motion.div>
  );
}
