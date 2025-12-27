import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Keyboard, Plus, X, Edit2, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Hotkey {
  id: string;
  key: string;
  side: 'YES' | 'NO';
  amount: number;
  orderType: 'market' | 'limit-fixed' | 'limit-relative';
  limitPrice?: number;
  relativeOffset?: number;
  expirationMinutes?: number;
  mcOptionIndex?: number;
  note?: string;
  color?: string;
}

interface HotkeyDisplayPanelProps {
  hotkeys: Hotkey[];
  onUpdateHotkey?: (id: string, updates: Partial<Hotkey>) => void;
}

const HOTKEY_COLORS = [
  'bg-emerald-500/20 border-emerald-500/50 text-emerald-400',
  'bg-blue-500/20 border-blue-500/50 text-blue-400',
  'bg-purple-500/20 border-purple-500/50 text-purple-400',
  'bg-yellow-500/20 border-yellow-500/50 text-yellow-400',
  'bg-pink-500/20 border-pink-500/50 text-pink-400',
  'bg-orange-500/20 border-orange-500/50 text-orange-400',
  'bg-cyan-500/20 border-cyan-500/50 text-cyan-400',
  'bg-red-500/20 border-red-500/50 text-red-400',
];

export function HotkeyDisplayPanel({ hotkeys, onUpdateHotkey }: HotkeyDisplayPanelProps) {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const getColorClass = (index: number) => {
    return HOTKEY_COLORS[index % HOTKEY_COLORS.length];
  };

  const getOrderTypeLabel = (hotkey: Hotkey) => {
    if (hotkey.orderType === 'market') return 'MKT';
    if (hotkey.orderType === 'limit-fixed') return `@${hotkey.limitPrice}%`;
    if (hotkey.orderType === 'limit-relative') return `±${hotkey.relativeOffset}%`;
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
      <Card className="bg-gray-900/50 border-gray-800 p-3">
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <Keyboard className="w-4 h-4" />
          <span>No hotkeys configured</span>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">
          Add hotkeys in the Hotkeys tab below
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Keyboard className="w-4 h-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-300">Hotkeys</span>
      </div>
      <ScrollArea className="max-h-[160px]">
        <div className="space-y-1.5">
          {hotkeys.map((hotkey, index) => (
            <div
              key={hotkey.id}
              className={`flex items-center gap-2 p-2 rounded border ${getColorClass(index)}`}
            >
              <Badge 
                variant="outline" 
                className="w-8 h-8 flex items-center justify-center text-lg font-bold border-2 bg-black/30"
              >
                {hotkey.key.toUpperCase()}
              </Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs">
                  <span className={hotkey.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}>
                    {hotkey.side}
                  </span>
                  <span className="text-gray-400">M${hotkey.amount}</span>
                  <span className="text-gray-500">{getOrderTypeLabel(hotkey)}</span>
                  {hotkey.expirationMinutes && (
                    <span className="text-gray-600">{hotkey.expirationMinutes}m</span>
                  )}
                </div>
                {/* Note display/edit */}
                {editingNoteId === hotkey.id ? (
                  <div className="flex items-center gap-1 mt-1">
                    <Input
                      value={noteValue}
                      onChange={(e) => setNoteValue(e.target.value)}
                      placeholder="Add note..."
                      className="h-5 text-[10px] bg-black/30 border-gray-700 px-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveNote(hotkey.id);
                        if (e.key === 'Escape') setEditingNoteId(null);
                      }}
                    />
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="w-5 h-5"
                      onClick={() => saveNote(hotkey.id)}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                  </div>
                ) : hotkey.note ? (
                  <p 
                    className="text-[10px] text-gray-500 truncate cursor-pointer hover:text-gray-400"
                    onClick={() => startEditNote(hotkey)}
                  >
                    {hotkey.note}
                  </p>
                ) : onUpdateHotkey && (
                  <button 
                    className="text-[10px] text-gray-600 hover:text-gray-400"
                    onClick={() => startEditNote(hotkey)}
                  >
                    + Add note
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}
