import { useRef, useState, useEffect } from 'react';
import { Canvas } from '@/components/whiteboard/canvas';
import { Toolbar } from '@/components/whiteboard/toolbar';
import { Header } from '@/components/whiteboard/header';
import { useWhiteboard } from '@/hooks/use-whiteboard';
import { getStroke } from 'perfect-freehand';
import { getSvgPathFromStroke, options } from '@/lib/whiteboard-utils';

export const Whiteboard = () => {
  const {
    elements,
    tool,
    setTool,
    color,
    setColor,
    size,
    setSize,
    selection,
    setSelection,
    startDrawing,
    continueDrawing,
    stopDrawing,
    clearCanvas,
    deleteSelection,
    updateElement,
    undo,
    redo,
    canUndo,
    canRedo
  } = useWhiteboard();

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: 'light' | 'dark' | 'system') => {
        root.classList.remove('light', 'dark');
        
        if (t === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
            return;
        }
        
        root.classList.add(t);
    };

    applyTheme(theme);
  }, [theme]);

  // Listen for system changes if theme is system
  useEffect(() => {
      if (theme !== 'system') return;
      
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
          const root = window.document.documentElement;
          root.classList.remove('light', 'dark');
          root.classList.add(mediaQuery.matches ? 'dark' : 'light');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const stageRef = useRef<any>(null);

  const handleDownload = (format: 'png' | 'svg', background: 'transparent' | 'white' | 'black') => {
    if (!stageRef.current || elements.length === 0) return;

    const stage = stageRef.current;
    
    // Calculate bounding box
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    elements.forEach(el => {
      if (el.type === 'stroke') {
        el.points.forEach(p => {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        });
      } else if (el.type === 'text') {
          if (el.x < minX) minX = el.x;
          if (el.y < minY) minY = el.y;
          // Approximate text bounds
          const node = stage.findOne('#' + el.id);
          const width = node ? node.width() : 100;
          const height = node ? node.height() : 20;
          
          if (el.x + width > maxX) maxX = el.x + width;
          if (el.y + height > maxY) maxY = el.y + height;
      }
    });
    
    const padding = 50;
    const x = isFinite(minX) ? minX - padding : 0;
    const y = isFinite(minY) ? minY - padding : 0;
    const width = isFinite(maxX) && maxX > minX ? maxX - minX + padding * 2 : stage.width();
    const height = isFinite(maxY) && maxY > minY ? maxY - minY + padding * 2 : stage.height();

    if (format === 'png') {
        const exportConfig = {
            x,
            y,
            width,
            height,
            pixelRatio: 2,
            mimeType: 'image/png',
        };

        const dataURL = stage.toDataURL(exportConfig);
        const link = document.createElement('a');
        link.download = `whiteboat-${Date.now()}.png`;
        
        if (background === 'transparent') {
            link.href = dataURL;
            link.click();
        } else {
            const img = new Image();
            img.src = dataURL;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = background;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            };
        }
    } else if (format === 'svg') {
        let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}">`;
        
        if (background !== 'transparent') {
            svgContent += `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${background}" />`;
        }
        
        elements.forEach(el => {
            if (el.type === 'stroke') {
                const strokeEl = el as any;
                const stroke = getStroke(strokeEl.points, {
                    ...options,
                    size: strokeEl.size,
                    thinning: strokeEl.tool === 'pen' ? 0.5 : 0,
                });
                const pathData = getSvgPathFromStroke(stroke);
                const color = strokeEl.tool === 'eraser' ? (background === 'transparent' ? 'white' : background) : strokeEl.color;
                
                svgContent += `<path d="${pathData}" fill="${color}" />`;
            } else if (el.type === 'text') {
                const textEl = el as any;
                svgContent += `<text x="${textEl.x}" y="${textEl.y}" font-size="${textEl.fontSize}" fill="${textEl.color}" font-family="sans-serif" dominant-baseline="hanging">${textEl.text}</text>`;
            }
        });
        
        svgContent += `</svg>`;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `whiteboat-${Date.now()}.svg`;
        link.click();
        URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      <Header onDownload={handleDownload} theme={theme} setTheme={setTheme} />
      <Canvas
        elements={elements}
        tool={tool}
        selection={selection}
        setSelection={setSelection}
        updateElement={updateElement}
        startDrawing={startDrawing}
        continueDrawing={continueDrawing}
        stopDrawing={stopDrawing}
        deleteSelection={deleteSelection}
        stageRef={stageRef}
      />
      <Toolbar
        tool={tool}
        setTool={setTool}
        color={color}
        setColor={setColor}
        size={size}
        setSize={setSize}
        clearCanvas={clearCanvas}
        deleteSelection={deleteSelection}
        hasSelection={selection.length > 0}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
      />
    </div>
  );
};