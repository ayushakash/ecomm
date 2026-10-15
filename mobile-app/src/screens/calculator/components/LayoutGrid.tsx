import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Text } from '../../../components/ui';
import { colors, radii, spacing } from '../../../theme';
import { q, type GridParams } from '../calculatorMath';

const PAD = 28;
const DIM_OFFSET = 14;
const DOT = 7;
const LABEL_W = 90;

/** Column-grid plan view (port of the web canvas drawGrid) drawn with plain Views. */
export function LayoutGrid({ params }: { params: GridParams }) {
  const { length, breadth, colsX, colsY, spacing: gridSpacing, assumedSquare } = params;
  const { t } = useTranslation('calculator');
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const height = Math.min(width * 0.65, 400);
  const w = width - PAD * 2;
  const h = height - PAD * 2;
  const scale = Math.min(w / length, h / breadth);
  const drawW = length * scale;
  const drawH = breadth * scale;
  const originX = PAD + (w - drawW) / 2;
  const originY = PAD + (h - drawH) / 2;
  const dx = drawW / (colsX - 1);
  const dy = drawH / (colsY - 1);
  const rows = Array.from({ length: colsY }, (_, i) => i);
  const cols = Array.from({ length: colsX }, (_, j) => j);

  return (
    <View>
      <View
        style={[styles.canvas, { height: height || 200 }]}
        onLayout={onLayout}
        accessibilityLabel={t('grid.a11yLabel', { colsX, colsY, length: q(length), breadth: q(breadth) })}
      >
        {width > 0 && (
          <>
            {rows.map((i) => (
              <View
                key={`h${i}`}
                style={[styles.gridLine, { left: originX, top: originY + i * dy, width: drawW, height: 1 }]}
              />
            ))}
            {cols.map((j) => (
              <View
                key={`v${j}`}
                style={[styles.gridLine, { left: originX + j * dx, top: originY, width: 1, height: drawH }]}
              />
            ))}
            <View style={[styles.outline, { left: originX, top: originY, width: drawW, height: drawH }]} />
            {rows.flatMap((i) =>
              cols.map((j) => (
                <View
                  key={`c${i}-${j}`}
                  style={[styles.column, { left: originX + j * dx - DOT / 2, top: originY + i * dy - DOT / 2 }]}
                />
              )),
            )}
            {/* Top dimension (length) */}
            <View style={[styles.dimLine, { left: originX, top: originY - DIM_OFFSET, width: drawW, height: 1 }]} />
            <Text
              variant="micro"
              color="successDark"
              align="center"
              style={[styles.dimLabel, { left: originX + drawW / 2 - LABEL_W / 2, top: originY - DIM_OFFSET - 15 }]}
            >
              {t('grid.feet', { value: q(length) })}
            </Text>
            {/* Right dimension (breadth) */}
            <View
              style={[styles.dimLine, { left: originX + drawW + DIM_OFFSET, top: originY, width: 1, height: drawH }]}
            />
            <Text
              variant="micro"
              color="successDark"
              align="center"
              style={[
                styles.dimLabel,
                styles.rotated,
                { left: originX + drawW + DIM_OFFSET + 8 - LABEL_W / 2, top: originY + drawH / 2 - 7 },
              ]}
            >
              {t('grid.feet', { value: q(breadth) })}
            </Text>
          </>
        )}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.column, styles.legendDot]} />
          <Text variant="caption" color="textSecondary">
            {t('grid.legend', { colsX, colsY, spacing: q(gridSpacing) })}
          </Text>
        </View>
        {assumedSquare && (
          <Text variant="caption" color="textMuted">
            {t('grid.assumedSquare')}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  gridLine: { position: 'absolute', backgroundColor: colors.borderStrong },
  outline: { position: 'absolute', borderWidth: 1.5, borderColor: colors.text },
  column: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: colors.dangerDark,
  },
  dimLine: { position: 'absolute', backgroundColor: colors.successDark },
  dimLabel: { position: 'absolute', width: LABEL_W },
  rotated: { transform: [{ rotate: '-90deg' }] },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { position: 'relative' },
});
