import { useState, useEffect, useCallback, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { recognizeShape } from '../lib/whiteboard-utils';

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

const strokesToPath = (strokes: StrokeElement[]) => {
    if (strokes.length === 0) return null;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    strokes.forEach(stroke => {
        stroke.points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    });

    const width = maxX - minX + 40;
    const height = maxY - minY + 40;
    
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    strokes.forEach(stroke => {
        ctx.beginPath();
        if (stroke.points.length > 0) {
            ctx.moveTo(stroke.points[0].x - minX + 20, stroke.points[0].y - minY + 20);
            stroke.points.forEach(p => ctx.lineTo(p.x - minX + 20, p.y - minY + 20));
        }
        ctx.stroke();
    });

    return { dataUrl: canvas.toDataURL(), x: minX, y: minY };
};

const eraseFromStroke = (stroke: StrokeElement, x: number, y: number, radius: number): StrokeElement[] => {
    const points = stroke.points;
    let hasErasure = false;
    const segments: Point[][] = [];
    let currentSegment: Point[] = [];

    for (const p of points) {
        const dist = Math.hypot(p.x - x, p.y - y);
        if (dist > radius) {
            currentSegment.push(p);
        } else {
            hasErasure = true;
            if (currentSegment.length > 0) {
                segments.push(currentSegment);
                currentSegment = [];
            }
        }
    }
    if (currentSegment.length > 0) {
        segments.push(currentSegment);
    }

    if (!hasErasure) {
        return [stroke];
    }
    
    if (segments.length === 0) return [];
    
    return segments.map(seg => ({
        ...stroke,
        id: crypto.randomUUID(),
        points: seg
    }));
};

const isOverText = (text: TextElement, x: number, y: number, radius: number) => {
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return false;
    ctx.font = `${text.fontSize}px sans-serif`;
    const metrics = ctx.measureText(text.text);
    const width = metrics.width;
    const height = text.fontSize; 
    
    return x >= text.x - radius && x <= text.x + width + radius &&
           y >= text.y - radius && y <= text.y + height + radius;
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
  const [isRecognizing, setIsRecognizing] = useState(false);
  const isDrawing = useRef(false);
  const ocrTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elementsRef = useRef(elements);

  useEffect(() => {
      elementsRef.current = elements;
  }, [elements]);

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
      if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
      setIsRecognizing(false);
      if (historyIndex > 0) {
          setHistoryIndex(prev => prev - 1);
          setElements(history[historyIndex - 1]);
      }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
      if (ocrTimeoutRef.current) clearTimeout(ocrTimeoutRef.current);
      setIsRecognizing(false);
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

    if (tool === 'eraser') {
        setElements(prev => {
            const newElements: WhiteboardElement[] = [];
            let changed = false;
            for (const el of prev) {
                if (el.type === 'text') {
                    if (isOverText(el as TextElement, x, y, size)) {
                        changed = true;
                    } else {
                        newElements.push(el);
                    }
                } else if (el.type === 'stroke') {
                    const segments = eraseFromStroke(el as StrokeElement, x, y, size);
                    if (segments.length !== 1 || segments[0] !== el) {
                        changed = true;
                        newElements.push(...segments);
                    } else {
                        newElements.push(el);
                    }
                }
            }
            return changed ? newElements : prev;
        });
        return;
    }

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

    if (tool === 'eraser') {
        setElements(prev => {
            const newElements: WhiteboardElement[] = [];
            let changed = false;
            for (const el of prev) {
                if (el.type === 'text') {
                    if (isOverText(el as TextElement, x, y, size)) {
                        changed = true;
                    } else {
                        newElements.push(el);
                    }
                } else if (el.type === 'stroke') {
                    const segments = eraseFromStroke(el as StrokeElement, x, y, size);
                    if (segments.length !== 1 || segments[0] !== el) {
                        changed = true;
                        newElements.push(...segments);
                    } else {
                        newElements.push(el);
                    }
                }
            }
            return changed ? newElements : prev;
        });
        return;
    }

    setElements((prev) => {
      const lastElement = prev[prev.length - 1];
      if (!lastElement || lastElement.type !== 'stroke' || lastElement.isComplete) return prev;

      const newPoints = [...lastElement.points, { x, y, pressure }];
      const newElement = { ...lastElement, points: newPoints };
      
      return [...prev.slice(0, -1), newElement];
    });
  }, [tool, size]);

  const stopDrawing = useCallback(async () => {
    if (!isDrawing.current) return;
    isDrawing.current = false;
    
    if (tool === 'eraser') {
        addToHistory(elements);
        return;
    }

    // We need to get the latest state. Since stopDrawing depends on elements, it should be fresh.
    const lastElement = elements[elements.length - 1];
    if (!lastElement || lastElement.type !== 'stroke' || lastElement.isComplete) return;

    let newEl = { ...lastElement, isComplete: true };
    
    // Shape recognition
    if (newEl.tool === 'pen') {
        const correctedPoints = recognizeShape(newEl.points);
        if (correctedPoints) {
            // Preserve pressure if possible, or just use default
            newEl.points = correctedPoints.map(p => ({ ...p, pressure: 0.5 }));
        }
    }

    const newElements = [...elements.slice(0, -1), newEl];
    addToHistory(newElements);
    
    if (newEl.tool === 'magic') {
        if (ocrTimeoutRef.current) {
            clearTimeout(ocrTimeoutRef.current);
        }
        
        setIsRecognizing(true);
        
        ocrTimeoutRef.current = setTimeout(async () => {
            const currentElements = elementsRef.current;
            
            // Find consecutive magic strokes at the end
            const magicStrokes: StrokeElement[] = [];
            let i = currentElements.length - 1;
            while (i >= 0) {
                const el = currentElements[i];
                if (el.type === 'stroke' && el.tool === 'magic') {
                    magicStrokes.unshift(el);
                } else {
                    break;
                }
                i--;
            }
            
            if (magicStrokes.length === 0) {
                setIsRecognizing(false);
                return;
            }

            const result = strokesToPath(magicStrokes);
            if (result) {
                try {
                    const { data: { text } } = await Tesseract.recognize(result.dataUrl, 'eng');
                    const cleanText = text.trim();

                    if (cleanText) {
                        const baseElements = currentElements.slice(0, currentElements.length - magicStrokes.length);
                        
                        // Find nearest text element
                        let nearestId: string | null = null;
                        let minDistance = Infinity;
                        const threshold = 200; // pixels

                        baseElements.forEach(el => {
                            if (el.type === 'text') {
                                const dist = Math.hypot(el.x - result.x, el.y - result.y);
                                if (dist < minDistance) {
                                    minDistance = dist;
                                    nearestId = el.id;
                                }
                            }
                        });

                        if (nearestId && minDistance < threshold) {
                            const updatedElements = baseElements.map(el => 
                                el.id === nearestId 
                                    ? { ...el, text: (el as TextElement).text + ' ' + cleanText } 
                                    : el
                            );
                            addToHistory(updatedElements);
                        } else {
                            const newTextElement: TextElement = {
                                id: magicStrokes[0].id,
                                type: 'text',
                                x: result.x,
                                y: result.y,
                                rotation: 0,
                                color: magicStrokes[0].color,
                                text: cleanText,
                                fontSize: 24,
                            };
                            
                            const updatedElements = [...baseElements, newTextElement];
                            addToHistory(updatedElements);
                        }
                    }
                } catch (e) {
                    console.error("OCR Failed", e);
                } finally {
                    setIsRecognizing(false);
                }
            } else {
                setIsRecognizing(false);
            }
        }, 1000);
    }
  }, [elements, addToHistory, tool]);

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
    isRecognizing,
    clearCanvas,
    deleteSelection,
    updateElement,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1
  };
};