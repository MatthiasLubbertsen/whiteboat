import React, { useState, useEffect, useRef } from 'react';
import Konva from 'konva';
import { Stage, Layer, Path, Text, Transformer, Rect, Group, Circle } from 'react-konva';
import { getStroke } from 'perfect-freehand';
import { getSvgPathFromStroke, options, getBoundingBox, getArrowSvgPath } from '@/lib/whiteboard-utils';
import type { WhiteboardElement, StrokeElement, TextElement } from '@/hooks/use-whiteboard';
import { useCssVariable } from '@/hooks/use-css-variable';

interface CanvasProps {
  elements: WhiteboardElement[];
  tool: string;
  selection: string[];
  setSelection: (ids: string[]) => void;
  updateElement: (id: string, updates: Partial<WhiteboardElement>) => void;
  startDrawing: (x: number, y: number, pressure?: number) => void;
  continueDrawing: (x: number, y: number, pressure?: number) => void;
  stopDrawing: () => void;
  deleteSelection: () => void;
  stageRef: React.RefObject<any>;
}

export const Canvas: React.FC<CanvasProps> = ({
  elements = [],
  tool,
  selection,
  setSelection,
  updateElement,
  startDrawing,
  continueDrawing,
  stopDrawing,
  deleteSelection,
  stageRef,
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [selectionBox, setSelectionBox] = useState<{ start: {x:number, y:number}, end: {x:number, y:number} } | null>(null);
  const transformerRef = useRef<any>(null);
  const accentColor = useCssVariable('--accent') || '#3b82f6';

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.key === 'Delete' || e.key === 'Backspace') && selection.length > 0) {
              // Check if we are editing text (textarea focused)
              if (document.activeElement?.tagName === 'TEXTAREA') return;
              deleteSelection();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selection, deleteSelection]);

  useEffect(() => {
      if (selection.length > 0 && transformerRef.current) {
          const stage = transformerRef.current.getStage();
          const selectedNodes = selection.map(id => stage.findOne('#' + id)).filter(Boolean);
          transformerRef.current.nodes(selectedNodes);
          transformerRef.current.getLayer().batchDraw();
      } else if (transformerRef.current) {
          transformerRef.current.nodes([]);
          transformerRef.current.getLayer().batchDraw();
      }
  }, [selection, elements]);

  // Auto-edit new text elements
  useEffect(() => {
      const lastElement = elements[elements.length - 1];
      if (lastElement && lastElement.type === 'text' && lastElement.text === '' && selection.includes(lastElement.id)) {
          const stage = stageRef.current;
          const textNode = stage.findOne('#' + lastElement.id);
          if (textNode) {
              startEditing(textNode as Konva.Text, lastElement as TextElement);
          }
      }
  }, [elements, selection]);

  const startEditing = (textNode: Konva.Text, textEl: TextElement) => {
      textNode.hide();
      const tr = transformerRef.current;
      tr.hide();
      
      const textPosition = textNode.getAbsolutePosition();
      const stageBox = stageRef.current.container().getBoundingClientRect();
      const areaPosition = {
          x: stageBox.left + textPosition.x,
          y: stageBox.top + textPosition.y,
      };

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);
      textarea.value = textEl.text;
      textarea.style.position = 'absolute';
      textarea.style.top = areaPosition.y + 'px';
      textarea.style.left = areaPosition.x + 'px';
      textarea.style.width = Math.max(textNode.width() - textNode.padding() * 2, 100) + 'px';
      textarea.style.height = Math.max(textNode.height() - textNode.padding() * 2 + 5, 50) + 'px';
      textarea.style.fontSize = (textNode.fontSize() * scale) + 'px'; // Scale font size
      textarea.style.border = 'none';
      textarea.style.padding = '0px';
      textarea.style.margin = '0px';
      textarea.style.overflow = 'hidden';
      textarea.style.background = 'none';
      textarea.style.outline = 'none';
      textarea.style.resize = 'none';
      textarea.style.lineHeight = String(textNode.lineHeight());
      textarea.style.fontFamily = textNode.fontFamily();
      textarea.style.transformOrigin = 'left top';
      textarea.style.textAlign = textNode.align();
      textarea.style.color = textNode.fill() as string;
      
      textarea.focus();

      const removeTextarea = () => {
          updateElement(textEl.id, { text: textarea.value });
          document.body.removeChild(textarea);
          textNode.show();
          tr.show();
      };

      textarea.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' && !e.shiftKey) {
              removeTextarea();
          }
      });
      textarea.addEventListener('blur', removeTextarea);
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * 0.9 : oldScale * 1.1;
    setScale(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setPosition(newPos);
  };

  const handleMouseDown = (e: any) => {
    if (tool === 'hand') return;
    
    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition();

    if (tool === 'select') {
        const clickedOnEmpty = e.target === stage;
        if (clickedOnEmpty) {
            setSelectionBox({ start: point, end: point });
            setSelection([]);
        }
        return;
    }

    startDrawing(point.x, point.y);
  };

  const handleMouseMove = (e: any) => {
    if (tool === 'hand') return;
    
    const stage = e.target.getStage();
    const point = stage.getRelativePointerPosition();

    if (tool === 'select') {
        if (selectionBox) {
            setSelectionBox({ ...selectionBox, end: point });
        }
        return;
    }
    
    continueDrawing(point.x, point.y);
  };

  const handleMouseUp = () => {
    if (tool === 'hand') return;
    
    if (tool === 'select') {
        if (selectionBox) {
            const box = {
                x: Math.min(selectionBox.start.x, selectionBox.end.x),
                y: Math.min(selectionBox.start.y, selectionBox.end.y),
                width: Math.abs(selectionBox.end.x - selectionBox.start.x),
                height: Math.abs(selectionBox.end.y - selectionBox.start.y)
            };
            
            if (box.width > 0 && box.height > 0) {
                const selectedIds = elements.filter(el => {
                    if (el.type === 'text') {
                        return el.x >= box.x && el.x <= box.x + box.width && el.y >= box.y && el.y <= box.y + box.height;
                    } else if (el.type === 'stroke') {
                        const points = (el as StrokeElement).points;
                        // Check if bounding box of stroke intersects selection box
                        // Or if any point is inside. Let's do any point inside for simplicity.
                        return points.some(p => p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height);
                    }
                    return false;
                }).map(el => el.id);
                setSelection(selectedIds);
            }
            setSelectionBox(null);
        }
        return;
    }

    stopDrawing();
  };

  const handleSelect = (id: string) => {
      if (tool === 'select') {
          setSelection([id]);
      }
  };

  const handleTransformEnd = (e: any) => {
      const node = e.target;
      const id = node.id();
      updateElement(id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
      });
  };

  // Background dots style
  // We use CSS for performance.
  // Scale dots: 1px * scale.
  // Spacing: 20px * scale.
  const dotSize = Math.max(1, 1 * scale);
  const gridSize = 20 * scale;
  const isDark = document.documentElement.classList.contains('dark');
  
  return (
    <div 
        className="w-full h-full bg-white dark:bg-zinc-950 overflow-hidden touch-none"
        style={{
            backgroundImage: `radial-gradient(circle, ${isDark ? '#333' : '#ddd'} ${dotSize}px, transparent ${dotSize}px)`,
            backgroundSize: `${gridSize}px ${gridSize}px`,
            backgroundPosition: `${position.x}px ${position.y}px`
        }}
    >
      <Stage
        width={dimensions.width}
        height={dimensions.height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={tool === 'hand'}
        ref={stageRef}
        className="cursor-crosshair"
        style={{ cursor: tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair' }}
      >
        <Layer>
          {elements?.map((el) => {
            if (el.type === 'stroke') {
                const strokeEl = el as StrokeElement;
                
                if (strokeEl.tool === 'arrow') {
                    if (strokeEl.points.length < 2) return null;
                    const start = strokeEl.points[0];
                    const end = strokeEl.points[strokeEl.points.length - 1];
                    const pathData = getArrowSvgPath(start, end);
                    const isSelected = selection.includes(el.id);
                    const box = getBoundingBox([start, end], strokeEl.size + 20);

                    return (
                        <Group
                            key={el.id}
                            id={el.id}
                            x={el.x}
                            y={el.y}
                            rotation={el.rotation}
                            draggable={tool === 'select'}
                            onClick={(e) => {
                                e.cancelBubble = true;
                                handleSelect(el.id);
                            }}
                            onTap={(e) => {
                                e.cancelBubble = true;
                                handleSelect(el.id);
                            }}
                            onDragEnd={handleTransformEnd}
                        >
                            <Rect
                                x={box.x}
                                y={box.y}
                                width={box.width}
                                height={box.height}
                                fill="transparent"
                                listening={isSelected}
                            />
                            <Path
                                data={pathData}
                                stroke={strokeEl.color}
                                strokeWidth={strokeEl.size}
                                lineCap="round"
                                lineJoin="round"
                            />
                            {isSelected && (
                                <>
                                    <Circle
                                        name="start"
                                        x={start.x}
                                        y={start.y}
                                        radius={8}
                                        fill="white"
                                        stroke={accentColor}
                                        strokeWidth={2}
                                        draggable
                                        onDragMove={(e) => {
                                            const group = e.target.getParent();
                                            if (!group) return;
                                            const path = group.findOne('Path') as Konva.Path;
                                            const startCircle = group.findOne('.start');
                                            const endCircle = group.findOne('.end');
                                            if (!path || !startCircle || !endCircle) return;
                                            
                                            const s = { x: startCircle.x(), y: startCircle.y() };
                                            const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                            path.data(getArrowSvgPath(s, e_pos));
                                        }}
                                        onDragEnd={(e) => {
                                            const group = e.target.getParent();
                                            if (!group) return;
                                            const startCircle = group.findOne('.start');
                                            const endCircle = group.findOne('.end');
                                            if (!startCircle || !endCircle) return;

                                            const s = { x: startCircle.x(), y: startCircle.y() };
                                            const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                            
                                            updateElement(el.id, {
                                                points: [
                                                    { ...start, x: s.x, y: s.y },
                                                    { ...end, x: e_pos.x, y: e_pos.y }
                                                ]
                                            });
                                        }}
                                        onMouseDown={(e) => e.cancelBubble = true}
                                        onTouchStart={(e) => e.cancelBubble = true}
                                    />
                                    <Circle
                                        name="end"
                                        x={end.x}
                                        y={end.y}
                                        radius={8}
                                        fill="white"
                                        stroke={accentColor}
                                        strokeWidth={2}
                                        draggable
                                        onDragMove={(e) => {
                                            const group = e.target.getParent();
                                            if (!group) return;
                                            const path = group.findOne('Path') as Konva.Path;
                                            const startCircle = group.findOne('.start');
                                            const endCircle = group.findOne('.end');
                                            if (!path || !startCircle || !endCircle) return;
                                            
                                            const s = { x: startCircle.x(), y: startCircle.y() };
                                            const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                            path.data(getArrowSvgPath(s, e_pos));
                                        }}
                                        onDragEnd={(e) => {
                                            const group = e.target.getParent();
                                            if (!group) return;
                                            const startCircle = group.findOne('.start');
                                            const endCircle = group.findOne('.end');
                                            if (!startCircle || !endCircle) return;

                                            const s = { x: startCircle.x(), y: startCircle.y() };
                                            const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                            
                                            updateElement(el.id, {
                                                points: [
                                                    { ...start, x: s.x, y: s.y },
                                                    { ...end, x: e_pos.x, y: e_pos.y }
                                                ]
                                            });
                                        }}
                                        onMouseDown={(e) => e.cancelBubble = true}
                                        onTouchStart={(e) => e.cancelBubble = true}
                                    />
                                </>
                            )}
                        </Group>
                    );
                }

                const stroke = getStroke(strokeEl.points, {
                ...options,
                size: strokeEl.size,
                thinning: strokeEl.tool === 'pen' ? 0.5 : 0,
                });
                const pathData = getSvgPathFromStroke(stroke);
                const isSelected = selection.includes(el.id);
                const box = getBoundingBox(strokeEl.points, strokeEl.size / 2);
                const isStraightLine = strokeEl.tool === 'pen' && strokeEl.points.length === 2;

                return (
                <Group
                    key={el.id}
                    id={el.id}
                    x={el.x}
                    y={el.y}
                    rotation={el.rotation}
                    draggable={tool === 'select'}
                    onClick={(e) => {
                        e.cancelBubble = true;
                        handleSelect(el.id);
                    }}
                    onTap={(e) => {
                        e.cancelBubble = true;
                        handleSelect(el.id);
                    }}
                    onDragEnd={handleTransformEnd}
                >
                    <Rect
                        x={box.x}
                        y={box.y}
                        width={box.width}
                        height={box.height}
                        fill="transparent"
                        listening={isSelected}
                    />
                    <Path
                        data={pathData}
                        fill={strokeEl.tool === 'eraser' ? '#ffffff' : strokeEl.color}
                        globalCompositeOperation={
                            strokeEl.tool === 'eraser' ? 'destination-out' : 'source-over'
                        }
                    />
                    {isSelected && isStraightLine && (
                        <>
                            <Circle
                                name="start"
                                x={strokeEl.points[0].x}
                                y={strokeEl.points[0].y}
                                radius={8}
                                fill="white"
                                stroke={accentColor}
                                strokeWidth={2}
                                draggable
                                onDragMove={(e) => {
                                    const group = e.target.getParent();
                                    if (!group) return;
                                    const path = group.findOne('Path') as Konva.Path;
                                    const startCircle = group.findOne('.start');
                                    const endCircle = group.findOne('.end');
                                    if (!path || !startCircle || !endCircle) return;
                                    
                                    const s = { x: startCircle.x(), y: startCircle.y() };
                                    const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                    
                                    const newStroke = getStroke([s, e_pos], {
                                        ...options,
                                        size: strokeEl.size,
                                        thinning: 0.5,
                                    });
                                    path.data(getSvgPathFromStroke(newStroke));
                                }}
                                onDragEnd={(e) => {
                                    const group = e.target.getParent();
                                    if (!group) return;
                                    const startCircle = group.findOne('.start');
                                    const endCircle = group.findOne('.end');
                                    if (!startCircle || !endCircle) return;

                                    const s = { x: startCircle.x(), y: startCircle.y() };
                                    const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                    
                                    updateElement(el.id, {
                                        points: [
                                            { ...strokeEl.points[0], x: s.x, y: s.y },
                                            { ...strokeEl.points[1], x: e_pos.x, y: e_pos.y }
                                        ]
                                    });
                                }}
                                onMouseDown={(e) => e.cancelBubble = true}
                                onTouchStart={(e) => e.cancelBubble = true}
                            />
                            <Circle
                                name="end"
                                x={strokeEl.points[1].x}
                                y={strokeEl.points[1].y}
                                radius={8}
                                fill="white"
                                stroke={accentColor}
                                strokeWidth={2}
                                draggable
                                onDragMove={(e) => {
                                    const group = e.target.getParent();
                                    if (!group) return;
                                    const path = group.findOne('Path') as Konva.Path;
                                    const startCircle = group.findOne('.start');
                                    const endCircle = group.findOne('.end');
                                    if (!path || !startCircle || !endCircle) return;
                                    
                                    const s = { x: startCircle.x(), y: startCircle.y() };
                                    const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                    
                                    const newStroke = getStroke([s, e_pos], {
                                        ...options,
                                        size: strokeEl.size,
                                        thinning: 0.5,
                                    });
                                    path.data(getSvgPathFromStroke(newStroke));
                                }}
                                onDragEnd={(e) => {
                                    const group = e.target.getParent();
                                    if (!group) return;
                                    const startCircle = group.findOne('.start');
                                    const endCircle = group.findOne('.end');
                                    if (!startCircle || !endCircle) return;

                                    const s = { x: startCircle.x(), y: startCircle.y() };
                                    const e_pos = { x: endCircle.x(), y: endCircle.y() };
                                    
                                    updateElement(el.id, {
                                        points: [
                                            { ...strokeEl.points[0], x: s.x, y: s.y },
                                            { ...strokeEl.points[1], x: e_pos.x, y: e_pos.y }
                                        ]
                                    });
                                }}
                                onMouseDown={(e) => e.cancelBubble = true}
                                onTouchStart={(e) => e.cancelBubble = true}
                            />
                        </>
                    )}
                </Group>
                );
            } else if (el.type === 'text') {
                const textEl = el as TextElement;
                return (
                    <Text
                        key={el.id}
                        id={el.id}
                        x={textEl.x}
                        y={textEl.y}
                        rotation={textEl.rotation}
                        text={textEl.text}
                        fontSize={textEl.fontSize}
                        fill={textEl.color}
                        draggable={tool === 'select'}
                        onClick={() => handleSelect(el.id)}
                        onTap={() => handleSelect(el.id)}
                        onDragEnd={handleTransformEnd}
                        onDblClick={(e) => startEditing(e.target as Konva.Text, textEl)}
                    />
                );
            }
            return null;
          })}
          {selectionBox && (
              <Rect
                x={Math.min(selectionBox.start.x, selectionBox.end.x)}
                y={Math.min(selectionBox.start.y, selectionBox.end.y)}
                width={Math.abs(selectionBox.end.x - selectionBox.start.x)}
                height={Math.abs(selectionBox.end.y - selectionBox.start.y)}
                fill={`color-mix(in srgb, ${accentColor}, transparent 80%)`}
                stroke={accentColor}
                strokeWidth={1}
              />
          )}
          <Transformer
            ref={transformerRef}
            borderStroke={accentColor}
            anchorStroke={accentColor}
            anchorFill="white"
          />
        </Layer>
      </Stage>
    </div>
  );
};