import { useState, useEffect, ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface PanelConfig {
  id: string;
  title: string;
  content: ReactNode;
  defaultOpen?: boolean;
}

interface DraggableSidebarProps {
  panels: PanelConfig[];
  storageKey: string;
}

interface SortablePanelProps {
  panel: PanelConfig;
  isOpen: boolean;
  onToggle: () => void;
}

function SortablePanel({ panel, isOpen, onToggle }: SortablePanelProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: panel.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-0.5 -ml-1 text-gray-600 hover:text-gray-400"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="w-3 h-3" />
          </div>
          <span>{panel.title}</span>
        </div>
        <span className="text-gray-500 text-xs">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-gray-800">
          {panel.content}
        </div>
      )}
    </div>
  );
}

export function DraggableSidebar({ panels, storageKey }: DraggableSidebarProps) {
  const [panelOrder, setPanelOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${storageKey}_order`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return panels.map(p => p.id);
      }
    }
    return panels.map(p => p.id);
  });

  const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem(`${storageKey}_open`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return {};
      }
    }
    return panels.reduce((acc, p) => ({ ...acc, [p.id]: p.defaultOpen !== false }), {});
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    localStorage.setItem(`${storageKey}_order`, JSON.stringify(panelOrder));
  }, [panelOrder, storageKey]);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_open`, JSON.stringify(openStates));
  }, [openStates, storageKey]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPanelOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const togglePanel = (id: string) => {
    setOpenStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Sort panels by saved order
  const orderedPanels = [...panels].sort((a, b) => {
    const aIndex = panelOrder.indexOf(a.id);
    const bIndex = panelOrder.indexOf(b.id);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={panelOrder} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {orderedPanels.map((panel) => (
            <SortablePanel
              key={panel.id}
              panel={panel}
              isOpen={openStates[panel.id] !== false}
              onToggle={() => togglePanel(panel.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
