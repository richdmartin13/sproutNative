/**
 * SpiderChart — React Native SVG radar chart matching web Spider.jsx exactly.
 * Uses react-native-svg (bundled in Expo Go) for proper polygon fills,
 * stroke lines, and text labels — identical to the web SVG implementation.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { useApp } from '../context/AppContext.js';

export default function SpiderChart({ axes, layers, size = 280 }) {
  const { theme } = useApp();

  const data = useMemo(() => {
    if (!axes || axes.length < 3 || !layers?.length) return null;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.36;
    const n = axes.length;

    // Layer polygons — same math as web Spider.jsx
    const layerPolys = layers.map(layer => {
      const max = layer.max ?? (Math.max(...layer.values, 0) || 1);
      const points = layer.values.map((v, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        const r = (Math.max(0, v) / max) * radius;
        return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
      });
      return { ...layer, points };
    });

    // Axis endpoints + label positions (identical to web)
    const axisLines = axes.map((label, i) => {
      const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return {
        label: label.length > 12 ? label.slice(0, 11) + '…' : label,
        x:  cx + radius * Math.cos(ang),
        y:  cy + radius * Math.sin(ang),
        lx: cx + (radius + 16) * Math.cos(ang),
        ly: cy + (radius + 16) * Math.sin(ang),
        ang,
      };
    });

    // Grid rings at 25%, 50%, 75%, 100%
    const rings = [0.25, 0.5, 0.75, 1].map(t =>
      axes.map((_, i) => {
        const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
        return [cx + radius * t * Math.cos(ang), cy + radius * t * Math.sin(ang)];
      })
    );

    return { cx, cy, radius, axisLines, layerPolys, rings };
  }, [axes, layers, size]);

  if (!data) return null;
  const { cx, cy, axisLines, layerPolys, rings } = data;

  const borderColor = theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)';

  return (
    <View style={{ alignSelf: 'center', width: size, height: size }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>

        {/* Grid rings — filled polygon outlines */}
        {rings.map((ring, i) => (
          <Polygon
            key={`ring-${i}`}
            points={ring.map(p => p.join(',')).join(' ')}
            fill="none"
            stroke={borderColor}
            strokeWidth="1"
            opacity={0.6}
          />
        ))}

        {/* Axis lines from center to edge */}
        {axisLines.map((a, i) => (
          <Line
            key={`axis-${i}`}
            x1={cx} y1={cy} x2={a.x} y2={a.y}
            stroke={borderColor}
            strokeWidth="1"
            opacity={0.5}
          />
        ))}

        {/* Data layers — filled polygons with stroke (identical to web) */}
        {layerPolys.map((layer, li) => (
          <G key={`layer-${li}`}>
            <Polygon
              points={layer.points.map(p => p.join(',')).join(' ')}
              fill={layer.color}
              fillOpacity={li === 0 ? 0.28 : 0.14}
              stroke={layer.color}
              strokeWidth="2"
            />
            {layer.points.map((p, pi) => (
              <Circle
                key={`dot-${li}-${pi}`}
                cx={p[0]} cy={p[1]}
                r={2.5}
                fill={layer.color}
              />
            ))}
          </G>
        ))}

        {/* Axis labels */}
        {axisLines.map((a, i) => {
          // Text anchor: centre if top/bottom, start if right side, end if left side
          const anchor = Math.abs(a.lx - cx) < 5 ? 'middle'
            : a.lx > cx ? 'start' : 'end';
          return (
            <SvgText
              key={`lbl-${i}`}
              x={a.lx} y={a.ly}
              fontSize="9.5"
              fontWeight="600"
              textAnchor={anchor}
              alignmentBaseline="middle"
              fill={theme.muted}
            >
              {a.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}
