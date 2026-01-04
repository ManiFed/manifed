import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Hotkey {
  id: string;
  key: string;
  side: 'YES' | 'NO' | 'STRADDLE';
  amount: number;
  orderType: 'market' | 'limit-fixed' | 'limit-relative' | 'straddle';
  limitPrice?: number;
  relativeOffset?: number;
  expirationMinutes?: number;
  mcOptionIndex?: number;
  note?: string;
  color?: string;
  straddleDelta?: number;
}

interface HotkeyDisplayPanelProps {
  hotkeys: Hotkey[];
  onUpdateHotkey?: (id: string, updates: Partial<Hotkey>) => void;
}

export function HotkeyDisplayPanel({ hotkeys, onUpdateHotkey }: HotkeyDisplayPanelProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const getOrderTypeLabel = (hotkey: Hotkey) => {
    if (hotkey.orderType === 'market') return 'MKT';
    if (hotkey.orderType === 'limit-fixed') return `@${hotkey.limitPrice}%`;
    if (hotkey.orderType === 'limit-relative') return `±${hotkey.relativeOffset}%`;
    if (hotkey.orderType === 'straddle') return `±${hotkey.straddleDelta}%`;
    return '';
  };

  const startEditNote = (hotkey: Hotkey) => {
    setEditingNoteId(hotkey.id);
    setNoteValue(hotkey.note || '');
  };

  const saveNote = (id: string) => {
    if (onUpdateHotkey) {
      onUpdateHotkey(id, { note: noteValue });
    }
    setEditingNoteId(null);
    setNoteValue('');
  };

  if (hotkeys.length === 0) {
    return (
      <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-3">
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <span className="font-mono">⌨</span>
          <span>No hotkeys</span>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">
          Add in Hotkeys tab
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d1117] border border-[#1e2736] rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold text-white">Hotkeys</span>
        <span className="text-[10px] text-gray-500">({hotkeys.length})</span>
      </div>
      <div className="h-[140px] overflow-y-auto space-y-1">
        {hotkeys.map((hotkey) => (
          <div
            key={hotkey.id}
            className="flex items-center gap-2 p-1.5 rounded bg-[#1a2332] hover:bg-[#1e2a3b] transition-colors"
          >
            <span className="w-6 h-6 flex items-center justify-center text-xs font-bold border border-emerald-500/50 text-emerald-400 rounded shrink-0">
              {hotkey.key.toUpperCase() || '?'}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className={`${
                  hotkey.side === 'YES' 
                    ? 'text-emerald-400' 
                    : hotkey.side === 'STRADDLE'
                    ? 'text-purple-400'
                    : 'text-red-400'
                }`}>
                  {hotkey.side === 'STRADDLE' ? 'STR' : hotkey.side}
                </span>
                <span className="text-gray-300">M${hotkey.amount}</span>
                <span className="text-gray-500">{getOrderTypeLabel(hotkey)}</span>
              </div>
              {/* Note display/edit */}
              {editingNoteId === hotkey.id ? (
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    placeholder="Add note..."
                    className="h-5 text-[10px] bg-[#0d1117] border-[#1e2736] px-1.5"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveNote(hotkey.id);
                      if (e.key === 'Escape') setEditingNoteId(null);
                    }}
                  />
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="w-5 h-5 hover:bg-emerald-500/20 text-[10px]"
                    onClick={() => saveNote(hotkey.id)}
                  >
                    ✓
                  </Button>
                </div>
              ) : hotkey.note ? (
                <p 
                  className="text-[9px] text-gray-500 truncate cursor-pointer hover:text-gray-400"
                  onClick={() => startEditNote(hotkey)}
                >
                  {hotkey.note}
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
