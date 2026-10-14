import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { palette } from '../theme';

export type CategoryIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface CategoryVisual {
  icon: CategoryIconName;
  /** Tile background tint. */
  tint: string;
  /** Icon color. */
  color: string;
}

/** Keyword → visual; first match wins (categories have no images in the backend). */
const RULES: { match: RegExp; visual: CategoryVisual }[] = [
  { match: /cement|concrete|mortar|putty/i, visual: { icon: 'sack', tint: palette.slate100, color: palette.slate700 } },
  { match: /steel|tmt|rod|bar|iron|rebar/i, visual: { icon: 'pillar', tint: '#E8EEF6', color: '#3B5B85' } },
  { match: /brick|block|ash/i, visual: { icon: 'wall', tint: '#FDECE4', color: '#B4532A' } },
  { match: /sand|balu|soil/i, visual: { icon: 'grain', tint: palette.amber50, color: palette.amber700 } },
  { match: /aggregate|stone|gitti|chip|gravel|metal/i, visual: { icon: 'dots-hexagon', tint: '#EEF0F3', color: palette.slate600 } },
  { match: /tile|marble|granite|floor/i, visual: { icon: 'checkerboard', tint: '#EAF4F1', color: '#2F7A64' } },
  { match: /paint|colour|color|primer/i, visual: { icon: 'format-paint', tint: '#F3ECFB', color: '#6D3FB0' } },
  { match: /pipe|plumb|sanitary|water/i, visual: { icon: 'pipe', tint: '#E6F4FB', color: '#1F78A8' } },
  { match: /electric|wire|cable|switch/i, visual: { icon: 'lightning-bolt', tint: palette.amber50, color: palette.amber600 } },
  { match: /wood|ply|timber|door|board/i, visual: { icon: 'door', tint: '#F6EEE6', color: '#8A5A2B' } },
  { match: /tool|hardware|nail|screw/i, visual: { icon: 'hammer-wrench', tint: palette.slate100, color: palette.slate700 } },
  { match: /roof|sheet/i, visual: { icon: 'home-roof', tint: '#E9EDF5', color: palette.slate600 } },
];

const FALLBACK: CategoryVisual = { icon: 'cube-outline', tint: palette.orange50, color: palette.orange600 };

export const getCategoryVisual = (name: string): CategoryVisual =>
  RULES.find((r) => r.match.test(name))?.visual ?? FALLBACK;
