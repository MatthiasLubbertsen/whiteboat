import { useState, useEffect, useCallback, useRef } from 'react';
import Tesseract from 'tesseract.js';

export type Point = { x: number; y: number; pressure?: number };

export type ElementType = 'stroke' | 'text';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  rotation: number;
  color: string;
}

export interface StrokeElement extends BaseElement {
  type: 'stroke';
  points: Point[];
  size: number;
  tool: string;
  isComplete: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  fontSize: number;
}

export type WhiteboardElement = StrokeElement | TextElement;

const STORAGE_KEY = 'whiteboat-drawings';

const pointsToPath = (points: Point[]) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    });

    const width = maxX - minX + 40;
    const height = maxY - minY + 40;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    if (points.length > 0) {
        ctx.moveTo(points[0].x - minX + 20, points[0].y - minY + 20);
        points.forEach(p => ctx.lineTo(p.x - minX + 20, p.y - minY + 20));
    }
    ctx.stroke();

    return { dataUrl: canvas.toDataURL(), x: minX, y: minY };
};

export const useWhiteboard = () => {
  const [elements, setElements] = useState<WhiteboardElement[]>([]);
  const [history, setHistory] = useState<WhiteboardElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [tool, setToolState] = useState<string>('pen');
  const [color, setColor] = useState<string>('#000000');
  const [size, setSizeState] = useState<number>(5);
  const [toolSizes, setToolSizes] = useState<Record<string, number>>({
      pen: 5,
      eraser: 20,
      magic: 5,
      text: 24
  });
  
  const [selection, setSelection] = useState<string[]>([]);
  const isDrawing = useRef(false);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const loaded = JSON.parse(saved);
        setElements(loaded);
        setHistory([loaded]);
        setHistoryIndex(0);
      } catch (e) {
        console.error("Failed to load drawings", e);
      }
    } else {
        setHistory([[]]);
        setHistoryIndex(0);
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(elements));
  }, [elements]);

  // Dark mode color switching
  useEffect(() => {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
              if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                  const isDark = document.documentElement.classList.contains('dark');
                  setColor(prev => {
                      if (prev === '#000000' && isDark) return '#ffffff';
                      if (prev === '#ffffff' && !isDark) return '#000000';
                      return prev;
                  });
              }
          });
      });
      
      observer.observe(document.documentElement, { attributes: true });
      return () => observer.disconnect();
  }, []);

  const setTool = useCallback((newTool: string) => {
      setToolState(newTool);
      if (newTool !== 'select') {
          setSelection([]);
      }
      if (toolSizes[newTool]) {
          setSizeState(toolSizes[newTool]);
      }
  }, [toolSizes]);

  const setSize = useCallback((newSize: number) => {
      setSizeState(newSize);
      setToolSizes(prev => ({ ...prev, [tool]: newSize }));
  }, [tool]);

  const addToHistory = useCallback((newElements: WhiteboardElement[]) => {
      setHistory(prev => {
          const newHistory = prev.slice(0, historyIndex + 1);
          newHistory.push(newElements);
          return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
      setElements(newElements);
  }, [historyIndex]);

  const undo = useCallback(() => {
      if (historyIndex > 0) {
          setHistoryIndex(prev => prev - 1);
          setElements(history[historyIndex - 1]);
      }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
      if (historyIndex < history.length - 1) {
          setHistoryIndex(prev => prev + 1);
          setElements(history[historyIndex + 1]);
      }
  }, [history, historyIndex]);

  const startDrawing = useCallback((x: number, y: number, pressure?: number) => {
    if (tool === 'select' || tool === 'hand') return;
    
    if (tool === 'text') {
        const id = crypto.randomUUID();
        const newText: TextElement = {
            id,
            type: 'text',
            x,
            y,
            rotation: 0,
            color,
            text: '', 
            fontSize: size,
        };
        const newElements = [...elements, newText];
        addToHistory(newElements);
        setTool('select');
        setSelection([id]);
        return;
    }

    isDrawing.current = true;
    const id = crypto.randomUUID();
    const newElement: StrokeElement = {
        id,
        type: 'stroke',
        x: 0,
        y: 0,
        rotation: 0,
        points: [{ x, y, pressure }],
        color: tool === 'eraser' ? '#000000' : color,
        size: size,
        tool: tool,
        isComplete: false,
    };
    
    setElements(prev => [...prev, newElement]);
  }, [color, size, tool, elements, addToHistory, setTool]);

  const continueDrawing = useCallback((x: number, y: number, pressure?: number) => {
    if (!isDrawing.current) return;
    setElements((prev) => {
      const lastElement = prev[prev.length - 1];
      if (!lastElement || lastElement.type !== 'stroke' || lastElement.isComplete) return prev;

      const newPoints = [...lastElement.points, { x, y, pressure }];
      const newElement = { ...lastElement, points: newPoints };
      
      return [...prev.slice(0, -1), newElement];
    });
  }, []);

  const stopDrawing = useCallback(async () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    // We need to get the latest state. Since stopDrawing depends on elements, it should be fresh.
    const lastElement = elements[elements.length - 1];
    if (!lastElement || lastElement.type !== 'stroke' || lastElement.isComplete) return;

    let newEl = { ...lastElement, isComplete: true };
    
    // Shape recognition (Straighten Line)
    if (newEl.tool === 'pen') {
        const points = newEl.points;
        if (points.length > 5) {
            const start = points[0];
            const end = points[points.length - 1];
            const dist = Math.hypot(end.x - start.x, end.y - start.y);
            
            let pathLen = 0;
            for(let i=1; i<points.length; i++) {
                pathLen += Math.hypot(points[i].x - points[i-1].x, points[i].y - points[i-1].y);
            }
            
            if (dist / pathLen > 0.9) {
                newEl.points = [start, end];
            }
        }
    }

    const newElements = [...elements.slice(0, -1), newEl];
    addToHistory(newElements);
    
    if (newEl.tool === 'magic') {
        const result = pointsToPath(newEl.points);
        if (result) {
            try {
                const { data: { text } } = await Tesseract.recognize(result.dataUrl, 'eng');
                const cleanText = text.trim();
                if (cleanText) {
                    const newTextElement: TextElement = {
                        id: newEl.id,
                        type: 'text',
                        x: result.x,
                        y: result.y,
                        rotation: 0,
                        color: newEl.color,
                        text: cleanText,
                        fontSize: 24,
                    };
                    const updatedElements = newElements.map(el => el.id === newEl.id ? newTextElement : el);
                    addToHistory(updatedElements);
                }
            } catch (e) {
                console.error("OCR Failed", e);
            }
        }
    }
  }, [elements, addToHistory]);

  const clearCanvas = useCallback(() => {
    addToHistory([]);
    setSelection([]);
  }, [addToHistory]);

  const deleteSelection = useCallback(() => {
      const newElements = elements.filter(el => !selection.includes(el.id));
      addToHistory(newElements);
      setSelection([]);
  }, [selection, elements, addToHistory]);

  const updateElement = useCallback((id: string, updates: Partial<WhiteboardElement>) => {
      const newElements = elements.map(el => el.id === id ? { ...el, ...updates } as WhiteboardElement : el);
      addToHistory(newElements);
  }, [elements, addToHistory]);

  return {
    elements,
    setElements,
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
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
};