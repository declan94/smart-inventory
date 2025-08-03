/**
 * Enhanced checkbox detection utilities for OCR processing
 * Filters out table lines and rotation artifacts to reduce false positives
 */

const DARK_THRESHOLD = 128; // For binary images: 0 = dark, 255 = light, threshold at midpoint

/**
 * Enhanced checkbox detection algorithm that filters out table lines and rotation artifacts
 */
export const detectCheckboxState = (
  data: Buffer, // binary data (0 = dark, 255 = light)
  info: { width: number; height: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  label: string // for log
): boolean => {
  const width = x1 - x0;
  const height = y1 - y0;

  // 1. Detect line pixels first
  const linePixels = detectLinePixels(data, info, x0, y0, x1, y1);

  // 2. Count dark pixels excluding line pixels
  let effectiveArea = 0;
  const totalArea = width * height;

  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const pixelKey = `${x},${y}`;
      const isDark = data[y * info.width + x] < DARK_THRESHOLD;

      if (isDark && !linePixels.has(pixelKey)) {
        effectiveArea += Math.min(x - x0, y - y0, x1 - x, y1 - y);
      }
    }
  }

  // Calculate density excluding line pixels
  const effectiveDensity = effectiveArea / totalArea;
  const isChecked = effectiveDensity > 0.15

  console.log(`label: ${label} effectiveDensity: ${effectiveDensity}`, isChecked ? "CHECKED" : "UNCHECKED");
  return isChecked
};

/**
 * Detect all pixels that are part of straight lines (table borders)
 * Handles rotated images by detecting lines at various angles
 */
export const detectLinePixels = (
  data: Buffer,
  info: { width: number; height: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number
): Set<string> => {
  const linePixels = new Set<string>();

  // Define angles to check for lines (in radians)
  // Focus on very small rotations (±5 degrees) with fine granularity
  const angles: number[] = [];

  // Horizontal lines: 0° ± 5° in 0.5° increments
  for (let deg = -5; deg <= 5; deg += 1) {
    angles.push((deg * Math.PI) / 180);
  }

  // Vertical lines: 90° ± 5° in 0.5° increments
  for (let deg = 85; deg <= 95; deg += 1) {
    angles.push((deg * Math.PI) / 180);
  }

  for (const angle of angles) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    // For each angle, scan perpendicular to the line direction
    if (Math.abs(cos) > Math.abs(sin)) {
      // More horizontal than vertical - scan vertically
      for (let baseY = y0; baseY <= y1; baseY += 2) {
        detectLineAtAngle(data, info, x0, y0, x1, y1, baseY, angle, true, linePixels);
      }
    } else {
      // More vertical than horizontal - scan horizontally
      for (let baseX = x0; baseX <= x1; baseX += 2) {
        detectLineAtAngle(data, info, x0, y0, x1, y1, baseX, angle, false, linePixels);
      }
    }
  }

  return linePixels;
};

/**
 * Detect a line at a specific angle starting from a base position
 */
const detectLineAtAngle = (
  data: Buffer,
  info: { width: number; height: number },
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  base: number,
  angle: number,
  scanVertically: boolean,
  linePixels: Set<string>
) => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const linePoints: Array<{ x: number; y: number }> = [];

  const consecutiveThreshold = scanVertically ? (y1 - y0) * 0.8 : (x1 - x0) * 0.6;

  if (scanVertically) {
    // Scan along Y axis, calculate X based on angle
    const baseY = base;
    for (let offset = -Math.max(x1 - x0, y1 - y0); offset <= Math.max(x1 - x0, y1 - y0); offset += 1) {
      const x = Math.round((x0 + x1) / 2 + offset * cos);
      const y = Math.round(baseY + offset * sin);

      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        if (data[y * info.width + x] < DARK_THRESHOLD) {
          linePoints.push({ x, y });
        } else if (linePoints.length > 0) {
          // Gap in line - check if we have enough consecutive points
          if (linePoints.length >= consecutiveThreshold) {
            linePoints.forEach((point) => linePixels.add(`${point.x},${point.y}`));
          }
          linePoints.length = 0; // Clear array
        }
      }
    }
  } else {
    // Scan along X axis, calculate Y based on angle
    const baseX = base;
    for (let offset = -Math.max(x1 - x0, y1 - y0); offset <= Math.max(x1 - x0, y1 - y0); offset += 1) {
      const x = Math.round(baseX + offset * cos);
      const y = Math.round((y0 + y1) / 2 + offset * sin);

      if (x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        if (data[y * info.width + x] < DARK_THRESHOLD) {
          linePoints.push({ x, y });
        } else if (linePoints.length > 0) {
          // Gap in line - check if we have enough consecutive points
          if (linePoints.length >= (x1 - x0) * 0.6) {
            linePoints.forEach((point) => linePixels.add(`${point.x},${point.y}`));
          }
          linePoints.length = 0; // Clear array
        }
      }
    }
  }

  // Check final line segment
  if (linePoints.length >= consecutiveThreshold) {
    linePoints.forEach((point) => linePixels.add(`${point.x},${point.y}`));
  }
};
