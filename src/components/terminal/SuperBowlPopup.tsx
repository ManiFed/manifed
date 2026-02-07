import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SUPER_BOWL_THEME } from "@/data/superBowlMarkets";

interface SuperBowlPopupProps {
  open: boolean;
  onClose: () => void;
  onEnterSuperBowl: () => void;
}

export function SuperBowlPopup({ open, onClose, onEnterSuperBowl }: SuperBowlPopupProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-2 border-green-700 bg-gradient-to-b from-[#0a1a0a] to-[#0f1f0f] text-white">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            <span className="text-4xl block mb-2">🏈</span>
            <span className="bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent">
              {SUPER_BOWL_THEME.name}
            </span>
          </DialogTitle>
          <DialogDescription className="text-center text-green-300/80">
            {SUPER_BOWL_THEME.subtitle}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Football field decoration */}
          <div className="relative bg-green-900/40 border border-green-800 rounded-lg p-4 overflow-hidden">
            {/* Yard lines */}
            <div className="absolute inset-0 flex justify-between px-2 opacity-20">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="w-px h-full bg-white" />
              ))}
            </div>
            <div className="relative z-10 text-center space-y-2">
              <p className="text-green-200 text-sm">
                Enter the <span className="font-bold text-yellow-400">Super Bowl Trading Mode</span> for a 
                football-themed terminal with curated championship markets.
              </p>
              <div className="flex justify-center gap-4 text-xs text-green-400/60 mt-3">
                <span>🎯 Game Props</span>
                <span>📊 Live Odds</span>
                <span>🎵 Halftime</span>
                <span>🏆 MVP</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 border-green-800 text-green-400 hover:bg-green-900/30 hover:text-green-300"
              onClick={onClose}
            >
              Stay in Normal Mode
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 text-white font-bold shadow-lg shadow-green-900/50"
              onClick={onEnterSuperBowl}
            >
              🏈 Enter Super Bowl Mode
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
