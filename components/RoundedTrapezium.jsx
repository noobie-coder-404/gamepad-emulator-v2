import React, { useMemo } from 'react';
import { Path, Skia, CornerPathEffect } from "@shopify/react-native-skia";

export const RoundedTrapezium = ({
  width,
  height,
  angle,
  cornerRadius,
  color = "white",
  children,
  centered = false,
}) => {
  const path = useMemo(() => {
    const rad = (angle * Math.PI) / 180;
    const offset = height / Math.tan(rad);

    // Safety check: if the angle is too flat, the top width disappears.
    // We ensure the top is at least 1px wide.
    const topWidth = Math.max(1, width - 2 * offset);
    const actualOffset = (width - topWidth) / 2;

    const p = Skia.Path.Make();
    if (centered) {
      const halfWidth = width / 2;
      const halfTopWidth = topWidth / 2;

      p.moveTo(-halfTopWidth, 0);
      p.lineTo(halfTopWidth, 0);
      p.lineTo(halfWidth, height);
      p.lineTo(-halfWidth, height);
    } else {
      // 1. Start Top-Left
      p.moveTo(actualOffset, 0);
      // 2. Line to Top-Right
      p.lineTo(width - actualOffset, 0);
      // 3. Line to Bottom-Right
      p.lineTo(width, height);
      // 4. Line to Bottom-Left
      p.lineTo(0, height);
    }
    
    p.close(); // Crucial for rounding the final corner!
    return p;
  }, [centered, width, height, angle]);

  return (
    <Path path={path} color={color} style="fill">
      <CornerPathEffect r={cornerRadius} />
      {children}
    </Path>
  );
};
