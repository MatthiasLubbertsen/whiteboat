import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Download, Moon, Sun, Monitor } from 'lucide-react';

interface HeaderProps {
  onDownload: (format: 'png' | 'svg', background: 'transparent' | 'white' | 'black') => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const Header: React.FC<HeaderProps> = ({ onDownload, theme, setTheme }) => {
  const cycleTheme = () => {
      if (theme === 'light') setTheme('dark');
      else if (theme === 'dark') setTheme('system');
      else setTheme('light');
  };

  const getThemeIcon = () => {
      if (theme === 'light') return <Sun className="h-4 w-4" />;
      if (theme === 'dark') return <Moon className="h-4 w-4" />;
      return <Monitor className="h-4 w-4" />;
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 z-50">
      <div className="flex items-center gap-2">
        <div className="text-2xl select-none">⛵</div>
        <h1 className="font-bold text-lg tracking-tight hidden sm:block">Whiteboat</h1>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={cycleTheme}>
              {getThemeIcon()}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Toggle theme</p>
          </TooltipContent>
        </Tooltip>

        <Dialog>
          <Tooltip>
            <TooltipTrigger asChild>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </DialogTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export whiteboard</p>
            </TooltipContent>
          </Tooltip>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Export Whiteboard</DialogTitle>
              <DialogDescription>
                Choose a format and background style for your exported image.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="png" className="w-full pt-2">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="png">PNG Image</TabsTrigger>
                    <TabsTrigger value="svg">SVG Vector</TabsTrigger>
                </TabsList>
                <TabsContent value="png" className="grid grid-cols-3 gap-4 pt-4">
                    <Button variant="outline" className="h-24 flex flex-col gap-2 p-2" onClick={() => onDownload('png', 'transparent')}>
                        <div className="w-full flex-1 rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2VlZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-50"></div>
                        <span className="text-xs">Transparent</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 p-2" onClick={() => onDownload('png', 'white')}>
                        <div className="w-full flex-1 rounded border border-zinc-200 bg-white"></div>
                        <span className="text-xs">White</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 p-2" onClick={() => onDownload('png', 'black')}>
                        <div className="w-full flex-1 rounded border border-zinc-800 bg-zinc-950"></div>
                        <span className="text-xs">Dark</span>
                    </Button>
                </TabsContent>
                <TabsContent value="svg" className="grid grid-cols-3 gap-4 pt-4">
                    <Button variant="outline" className="h-24 flex flex-col gap-2 p-2" onClick={() => onDownload('svg', 'transparent')}>
                        <div className="w-full flex-1 rounded border border-dashed border-zinc-300 dark:border-zinc-700 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iI2VlZSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] dark:bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMzMzMiLz48cGF0aCBkPSJNMCAwTDggOFpNOCAwTDAgOFoiIHN0cm9rZT0iIzQ0NCIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-50"></div>
                        <span className="text-xs">Transparent</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 p-2" onClick={() => onDownload('svg', 'white')}>
                        <div className="w-full flex-1 rounded border border-zinc-200 bg-white"></div>
                        <span className="text-xs">White</span>
                    </Button>
                    <Button variant="outline" className="h-24 flex flex-col gap-2 p-2" onClick={() => onDownload('svg', 'black')}>
                        <div className="w-full flex-1 rounded border border-zinc-800 bg-zinc-950"></div>
                        <span className="text-xs">Dark</span>
                    </Button>
                </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};