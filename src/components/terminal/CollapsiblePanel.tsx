import { useState, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsiblePanelProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  icon?: ReactNode;
}

export function CollapsiblePanel({ 
  title, 
  children, 
  defaultOpen = true, 
  className = '',
  icon
}: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card className={`bg-gray-900/50 border-gray-800 overflow-hidden ${className}`}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-gray-800">
          {children}
        </div>
      )}
    </Card>
  );
}
