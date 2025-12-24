import { getArrow } from 'perfect-arrows';

export function getArrowSvgPath(start: {x: number, y: number}, end: {x: number, y: number}) {
    const arrow = getArrow(start.x, start.y, end.x, end.y, {
        padEnd: 0,
    });
    const [sx, sy, cx, cy, ex, ey, ae] = arrow;

    const headSize = 15;
    const angle1 = ae + Math.PI * 0.85;
    const angle2 = ae - Math.PI * 0.85;
    
    const x1 = ex + Math.cos(angle1) * headSize;
    const y1 = ey + Math.sin(angle1) * headSize;
    const x2 = ex + Math.cos(angle2) * headSize;
    const y2 = ey + Math.sin(angle2) * headSize;

    // Draw the curve and the arrow head
    // Note: We might want to fill the arrow head, but for a single path stroke, it might look weird if we don't close it properly.
    // If we just stroke the path, the head will be an open V shape if we don't close it.
    // Let's make the head a filled triangle if we can, but with a single path we can only stroke or fill the whole thing.
    // If we stroke, we can draw the V shape.
    
    // M sx sy Q cx cy ex ey (Curve)
    // M x1 y1 L ex ey L x2 y2 (Head as V shape)
    
    return `M${sx},${sy} Q${cx},${cy} ${ex},${ey} M${x1},${y1} L${ex},${ey} L${x2},${y2}`;
}

export function getSvgPathFromStroke(stroke: number[][]) {
  if (!stroke.length) return "";

  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...stroke[0], "Q"]
  );

  d.push("Z");
  return d.join(" ");
}

export const options = {
  size: 10,
  thinning: 0.5,
  smoothing: 0.5,
  streamline: 0.5,
  easing: (t: number) => t,
  start: {
    taper: 0,
    easing: (t: number) => t,
    cap: true,
  },
  end: {
    taper: 0,
    easing: (t: number) => t,
    cap: true,
  },
};

export function getBoundingBox(points: {x: number, y: number}[], padding = 0) {
  if (points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { 
    x: minX - padding, 
    y: minY - padding, 
    width: maxX - minX + padding * 2, 
    height: maxY - minY + padding * 2 
  };
}

type Point = { x: number; y: number };

function distance(p1: Point, p2: Point) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

function pathLength(points: Point[]) {
    let len = 0;
    for (let i = 1; i < points.length; i++) {
        len += distance(points[i - 1], points[i]);
    }
    return len;
}

function resample(points: Point[], n: number): Point[] {
    if (points.length === 0) return [];
    const I = pathLength(points) / (n - 1);
    let D = 0;
    const newPoints = [points[0]];
    const srcPoints = [...points]; // Copy to avoid modifying original
    
    let i = 1;
    while (i < srcPoints.length) {
        const d = distance(srcPoints[i - 1], srcPoints[i]);
        if (D + d >= I && d > 0) {
            const qx = srcPoints[i - 1].x + ((I - D) / d) * (srcPoints[i].x - srcPoints[i - 1].x);
            const qy = srcPoints[i - 1].y + ((I - D) / d) * (srcPoints[i].y - srcPoints[i - 1].y);
            const q = { x: qx, y: qy };
            newPoints.push(q);
            srcPoints.splice(i, 0, q); // Insert q so we can continue from it
            D = 0;
        } else {
            D += d;
        }
        i++;
    }
    
    while (newPoints.length < n) {
        newPoints.push(srcPoints[srcPoints.length - 1]);
    }
    return newPoints;
}

function getCorners(points: Point[]): number[] {
    const corners: number[] = [];
    const W = 3; // Window size
    const straws: number[] = [];
    
    for (let i = W; i < points.length - W; i++) {
        straws.push(distance(points[i - W], points[i + W]));
    }
    
    let t = 0;
    // Calculate median straw length
    const sortedStraws = [...straws].sort((a, b) => a - b);
    const median = sortedStraws[Math.floor(sortedStraws.length / 2)];
    t = median * 0.95;

    for (let i = W; i < points.length - W; i++) {
        if (straws[i - W] < t) {
            // Local minimum check
            let isLocalMin = true;
            for (let j = -W; j <= W; j++) {
                 // Check bounds for straws array
                 const idx = i - W + j;
                 if (idx >= 0 && idx < straws.length) {
                     if (straws[i - W] > straws[idx]) {
                         isLocalMin = false;
                         break;
                     }
                 }
            }
            if (isLocalMin) {
                corners.push(i);
                i += W; // Skip neighbors
            }
        }
    }
    return corners;
}

export function recognizeShape(originalPoints: Point[]): Point[] | null {
    if (originalPoints.length < 3) return null;

    const totalLen = pathLength(originalPoints);
    const distStartEnd = distance(originalPoints[0], originalPoints[originalPoints.length - 1]);
    
    // 1. Line Detection
    // If the start-end distance is very close to the total path length, it's a line.
    if (distStartEnd / totalLen > 0.9) {
        return [originalPoints[0], originalPoints[originalPoints.length - 1]];
    }

    // 2. Check if closed
    const isClosed = distStartEnd < Math.max(20, totalLen * 0.2);
    if (!isClosed) return null; // If not a line and not closed, return null (raw stroke)

    // 3. Resample for shape analysis
    const points = resample(originalPoints, 40);
    
    // 4. Corner Detection
    const cornerIndices = getCorners(points);
    
    // 5. Shape Classification
    const bbox = getBoundingBox(originalPoints);
    const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };

    // Circle / Ellipse (0 or very few corners, or corners are weak)
    // Also check standard deviation of radius to be sure
    const radii = points.map(p => distance(p, center));
    const avgRadius = radii.reduce((a, b) => a + b, 0) / radii.length;
    const variance = radii.reduce((a, r) => a + Math.pow(r - avgRadius, 2), 0) / radii.length;
    const stdDev = Math.sqrt(variance);
    
    // If few corners AND relatively constant radius, it's a circle
    if (cornerIndices.length <= 2 && (stdDev / avgRadius < 0.25)) {
        const circlePoints: Point[] = [];
        const steps = 60;
        // Use max dimension for radius to avoid shrinking too much
        const radius = Math.max(bbox.width, bbox.height) / 2; 
        for (let i = 0; i <= steps; i++) {
            const angle = (i / steps) * 2 * Math.PI;
            circlePoints.push({
                x: center.x + radius * Math.cos(angle),
                y: center.y + radius * Math.sin(angle)
            });
        }
        return circlePoints;
    }

    return null;
}
