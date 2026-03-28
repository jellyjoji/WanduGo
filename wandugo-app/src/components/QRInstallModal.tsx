"use client";

import { useEffect, useRef } from "react";
import QRCode from "qrcode";

interface QRInstallModalProps {
  onClose: () => void;
}

export default function QRInstallModal({ onClose }: QRInstallModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const url = "https://wandugo.vercel.app/";
    QRCode.toCanvas(canvasRef.current, url, {
      width: 220,
      margin: 2,
      color: { dark: "#1e3a5f", light: "#ffffff" },
      // Use higher error correction so logo overlay doesn't break scannability
      errorCorrectionLevel: "H",
    }).then(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const logoSize = 46;
      const padding = 6;
      const x = (canvas.width - logoSize) / 2;
      const y = (canvas.height - logoSize) / 2;

      // White rounded square behind the logo
      ctx.fillStyle = "#ffffff";
      const r = 6;
      const bx = x - padding;
      const by = y - padding;
      const bw = logoSize + padding * 2;
      const bh = logoSize + padding * 2;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.lineTo(bx + bw - r, by);
      ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
      ctx.lineTo(bx + bw, by + bh - r);
      ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
      ctx.lineTo(bx + r, by + bh);
      ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
      ctx.lineTo(bx, by + r);
      ctx.quadraticCurveTo(bx, by, bx + r, by);
      ctx.closePath();
      ctx.fill();

      const img = new Image();
      img.onload = () => ctx.drawImage(img, x, y, logoSize, logoSize);
      img.src = "/icon.svg";
    });
  }, []);

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = "wandugo-qr.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <img src="/logo.svg" alt="WanduGo" className="h-8 w-auto" />
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-inner">
          <canvas ref={canvasRef} />
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
          </svg>
          Download QR Code
        </button>

        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
            Scan to open on another device
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Then tap{" "}
            <span className="font-medium">Share → Add to Home Screen</span> on
            iOS, or use Chrome&apos;s install button on Android.
          </p>
        </div>

        <div className="w-full border-t border-gray-100 dark:border-slate-700 pt-3">
          <p className="text-center text-xs font-mono text-gray-400 dark:text-gray-500 break-all select-all">
            {typeof window !== "undefined" ? "https://wandugo.vercel.app/" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
