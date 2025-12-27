import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { GripVertical, Save, X, RotateCcw, Move } from 'lucide-react';

export interface PanelConfig {
  id: string;
  name: string;
  visible: boolean;
  order: number;
  width?: 'narrow' | 'normal' | 'wide';
}

interface TerminalEditModeProps {
  panels: PanelConfig[];
  onSave: (panels: PanelConfig[]) => void;
  onCancel: () => void;
}

const STORAGE_KEY = 'manifold_terminal_layout';

export function useTerminalLayout() {
  const defaultPanels: PanelConfig[] = [
    { id: 'hotkeys', name: 'Hotkeys', visible: true, order: 0, width: 'narrow' },
    { id: 'watchlist', name: 'Watchlist', visible: true, order: 1, width: 'narrow' },
    { id: 'chart', name: 'Price Chart', visible: true, order: 2, width: 'wide' },
    { id: 'orderbook', name: 'Order Book', visible: true, order: 3, width: 'normal' },
    { id: 'positions', name: 'Positions', visible: true, order: 4, width: 'normal' },
    { id: 'youtube', name: 'YouTube', visible: true, order: 5, width: 'normal' },
    { id: 'logs', name: 'Execution Logs', visible: true, order: 6, width: 'normal' },
  ];

  const [panels, setPanels] = useState<PanelConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultPanels;
      }
    }
    return defaultPanels;
  });

  const saveLayout = useCallback((newPanels: PanelConfig[]) => {
    setPanels(newPanels);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newPanels));
  }, []);

  const resetLayout = useCallback(() => {
    setPanels(defaultPanels);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultPanels));
  }, []);

  const isPanelVisible = useCallback((id: string) => {
    return panels.find(p => p.id === id)?.visible ?? true;
  }, [panels]);

  const getPanelOrder = useCallback((id: string) => {
    return panels.find(p => p.id === id)?.order ?? 0;
  }, [panels]);

  return { panels, saveLayout, resetLayout, isPanelVisible, getPanelOrder };
}

export function TerminalEditMode({ panels, onSave, onCancel }: TerminalEditModeProps) {
  const [localPanels, setLocalPanels] = useState<PanelConfig[]>([...panels].sort((a, b) => a.order - b.order));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPanels = [...localPanels];
    const draggedPanel = newPanels[draggedIndex];
    newPanels.splice(draggedIndex, 1);
    newPanels.splice(index, 0, draggedPanel);
    
    // Update order values
    newPanels.forEach((p, i) => p.order = i);
    
    setLocalPanels(newPanels);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const toggleVisibility = (id: string) => {
    setLocalPanels(prev => prev.map(p => 
      p.id === id ? { ...p, visible: !p.visible } : p
    ));
  };

  const handleSave = () => {
    onSave(localPanels);
  };

  const handleReset = () => {
    const defaultPanels: PanelConfig[] = [
      { id: 'hotkeys', name: 'Hotkeys', visible: true, order: 0, width: 'narrow' },
      { id: 'watchlist', name: 'Watchlist', visible: true, order: 1, width: 'narrow' },
      { id: 'chart', name: 'Price Chart', visible: true, order: 2, width: 'wide' },
      { id: 'orderbook', name: 'Order Book', visible: true, order: 3, width: 'normal' },
      { id: 'positions', name: 'Positions', visible: true, order: 4, width: 'normal' },
      { id: 'youtube', name: 'YouTube', visible: true, order: 5, width: 'normal' },
      { id: 'logs', name: 'Execution Logs', visible: true, order: 6, width: 'normal' },
    ];
    setLocalPanels(defaultPanels);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-900 border-gray-700 w-full max-w-lg p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Move className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl font-bold text-white">Edit Terminal Layout</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <p className="text-sm text-gray-400">
          Drag to reorder panels. Toggle visibility with the switch.
        </p>

        <div className="space-y-2">
          {localPanels.map((panel, index) => (
            <div
              key={panel.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-move ${
                draggedIndex === index 
                  ? 'border-emerald-500 bg-emerald-500/10' 
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              } ${!panel.visible ? 'opacity-50' : ''}`}
            >
              <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-white font-medium">{panel.name}</span>
              <Switch
                checked={panel.visible}
                onCheckedChange={() => toggleVisibility(panel.id)}
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            <Save className="w-4 h-4" />
            Save Layout
          </Button>
        </div>
      </Card>
    </div>
  );
}
