import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Eraser, Hand, Trash2, MousePointer2, Wand2, Type, Undo2, Redo2, Loader2 } from 'lucide-react';

interface ToolbarProps {
  tool: string;
  setTool: (tool: string) => void;
  color: string;
  setColor: (color: string) => void;
  size: number;
  setSize: (size: number) => void;
  clearCanvas: () => void;
  deleteSelection: () => void;
  hasSelection: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isRecognizing?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  tool,
  setTool,
  color,
  setColor,
  size,
  setSize,
  clearCanvas,
  deleteSelection,
  hasSelection,
  undo,
  redo,
  canUndo,
  canRedo,
  isRecognizing,
}) => {
  return (
    <TooltipProvider>
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg rounded-full px-4 py-2 flex items-center gap-4 z-50">
      <div className="flex items-center gap-1">
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                variant={tool === 'select' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('select')}
                >
                <MousePointer2 className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Select</TooltipContent>
        </Tooltip>
        
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                variant={tool === 'pen' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('pen')}
                >
                <Pencil className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Pen (Auto-Straighten)</TooltipContent>
        </Tooltip>

        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                variant={tool === 'magic' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('magic')}
                disabled={isRecognizing}
                >
                {isRecognizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>Magic Pencil (OCR)</TooltipContent>
        </Tooltip>

        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                variant={tool === 'text' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('text')}
                >
                <Type className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Text</TooltipContent>
        </Tooltip>

        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                variant={tool === 'eraser' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('eraser')}
                >
                <Eraser className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Eraser</TooltipContent>
        </Tooltip>

        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                variant={tool === 'hand' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setTool('hand')}
                >
                <Hand className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Pan</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-8" />

      <div className="flex items-center gap-2">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full overflow-hidden border-2" style={{ borderColor: color === '#ffffff' ? '#e5e7eb' : color }}>
            <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                title="Pick color"
            />
        </div>
        
        <div className="flex flex-col w-24 gap-1">
            <label className="text-[10px] text-muted-foreground font-medium px-1">Size: {size}px</label>
            <input
            type="range"
            min="1"
            max="50"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
            title="Size"
            />
        </div>
      </div>

      <Separator orientation="vertical" className="h-8" />

      <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={undo} disabled={!canUndo}>
                    <Undo2 className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Undo</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={redo} disabled={!canRedo}>
                    <Redo2 className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Redo</TooltipContent>
          </Tooltip>
      </div>

      <Separator orientation="vertical" className="h-8" />

      {hasSelection ? (
          <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={deleteSelection}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>Delete Selection</TooltipContent>
          </Tooltip>
      ) : (
        <AlertDialog>
            <AlertDialogTrigger asChild>
            <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Clear Whiteboard?</AlertDialogTitle>
                <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your drawing.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearCanvas} className="bg-red-500 hover:bg-red-600 text-white dark:text-white">
                Clear
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
    </TooltipProvider>
  );
};