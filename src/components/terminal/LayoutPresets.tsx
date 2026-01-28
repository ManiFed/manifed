import { Button } from "@/components/ui/button";
import { PanelConfig } from "./TerminalEditMode";

interface LayoutPresetsProps {
  onApplyPreset: (panels: PanelConfig[]) => void;
}

const PRESETS = {
  minimal: {
    name: "Minimal",
    description: "Chart + Order entry only",
    panels: [
      { id: 'hotkeys', name: 'Hotkeys', visible: false, order: 0, width: 'narrow' as const },
      { id: 'watchlist', name: 'Watchlist', visible: false, order: 1, width: 'narrow' as const },
      { id: 'chart', name: 'Price Chart', visible: true, order: 2, width: 'wide' as const },
      { id: 'orderbook', name: 'Order Book', visible: false, order: 3, width: 'normal' as const },
      { id: 'positions', name: 'Positions', visible: true, order: 4, width: 'normal' as const },
      { id: 'youtube', name: 'YouTube', visible: false, order: 5, width: 'normal' as const },
      { id: 'logs', name: 'Execution Logs', visible: false, order: 6, width: 'normal' as const },
    ],
  },
  full: {
    name: "Full",
    description: "All panels visible",
    panels: [
      { id: 'hotkeys', name: 'Hotkeys', visible: true, order: 0, width: 'narrow' as const },
      { id: 'watchlist', name: 'Watchlist', visible: true, order: 1, width: 'narrow' as const },
      { id: 'chart', name: 'Price Chart', visible: true, order: 2, width: 'wide' as const },
      { id: 'orderbook', name: 'Order Book', visible: true, order: 3, width: 'normal' as const },
      { id: 'positions', name: 'Positions', visible: true, order: 4, width: 'normal' as const },
      { id: 'youtube', name: 'YouTube', visible: true, order: 5, width: 'normal' as const },
      { id: 'logs', name: 'Execution Logs', visible: true, order: 6, width: 'normal' as const },
    ],
  },
  analytics: {
    name: "Analytics",
    description: "Focus on data & analysis",
    panels: [
      { id: 'hotkeys', name: 'Hotkeys', visible: false, order: 0, width: 'narrow' as const },
      { id: 'watchlist', name: 'Watchlist', visible: true, order: 1, width: 'narrow' as const },
      { id: 'chart', name: 'Price Chart', visible: true, order: 2, width: 'wide' as const },
      { id: 'orderbook', name: 'Order Book', visible: true, order: 3, width: 'normal' as const },
      { id: 'positions', name: 'Positions', visible: true, order: 4, width: 'normal' as const },
      { id: 'youtube', name: 'YouTube', visible: false, order: 5, width: 'normal' as const },
      { id: 'logs', name: 'Execution Logs', visible: true, order: 6, width: 'normal' as const },
    ],
  },
  trading: {
    name: "Trading",
    description: "Hotkeys + Positions + Logs",
    panels: [
      { id: 'hotkeys', name: 'Hotkeys', visible: true, order: 0, width: 'narrow' as const },
      { id: 'watchlist', name: 'Watchlist', visible: false, order: 1, width: 'narrow' as const },
      { id: 'chart', name: 'Price Chart', visible: true, order: 2, width: 'wide' as const },
      { id: 'orderbook', name: 'Order Book', visible: true, order: 3, width: 'normal' as const },
      { id: 'positions', name: 'Positions', visible: true, order: 4, width: 'normal' as const },
      { id: 'youtube', name: 'YouTube', visible: false, order: 5, width: 'normal' as const },
      { id: 'logs', name: 'Execution Logs', visible: true, order: 6, width: 'normal' as const },
    ],
  },
};

export function LayoutPresets({ onApplyPreset }: LayoutPresetsProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Presets:</span>
      {Object.entries(PRESETS).map(([key, preset]) => (
        <Button
          key={key}
          variant="outline"
          size="sm"
          onClick={() => onApplyPreset(preset.panels)}
          className="h-6 px-2 text-xs border-gray-700 hover:border-gray-600"
          title={preset.description}
        >
          {preset.name}
        </Button>
      ))}
    </div>
  );
}

export { PRESETS };
