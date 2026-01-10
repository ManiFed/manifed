import { ReactNode } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

interface ResizableTerminalLayoutProps {
  leftSidebar: ReactNode;
  mainContent: ReactNode;
  rightSidebar: ReactNode;
  leftDefaultSize?: number;
  rightDefaultSize?: number;
}

export function ResizableTerminalLayout({
  leftSidebar,
  mainContent,
  rightSidebar,
  leftDefaultSize = 15,
  rightDefaultSize = 22
}: ResizableTerminalLayoutProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[calc(100vh-4rem)]">
      {/* Left Sidebar */}
      <ResizablePanel 
        defaultSize={leftDefaultSize} 
        minSize={10} 
        maxSize={25}
        className="p-4 space-y-4"
      >
        {leftSidebar}
      </ResizablePanel>
      
      <ResizableHandle withHandle className="bg-gray-800 hover:bg-gray-700 transition-colors" />
      
      {/* Main Content */}
      <ResizablePanel defaultSize={100 - leftDefaultSize - rightDefaultSize} minSize={40}>
        <div className="p-4 space-y-4 h-full overflow-auto">
          {mainContent}
        </div>
      </ResizablePanel>
      
      <ResizableHandle withHandle className="bg-gray-800 hover:bg-gray-700 transition-colors" />
      
      {/* Right Sidebar */}
      <ResizablePanel 
        defaultSize={rightDefaultSize} 
        minSize={15} 
        maxSize={35}
        className="p-4 space-y-4 overflow-auto"
      >
        {rightSidebar}
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}