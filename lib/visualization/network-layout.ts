/**
 * Network Layout - Computed Layout for Character Network Visualization
 *
 * Layout is computed on-demand from document state, not stored.
 * This ensures it's always consistent with current data.
 */

import type {
  Character,
  Relationship,
  NetworkLayout,
  NetworkNode,
  NetworkEdge,
} from '@/lib/tei/types';

// ============================================================================
// Public API
// ============================================================================

/**
 * Pure function: Compute network layout from characters and relationships
 *
 * Layout is computed on-demand from document state, not stored.
 * This ensures it's always consistent with current data.
 */
export function computeNetworkLayout(
  characters: readonly Character[],
  relationships: readonly Relationship[],
  options?: {
    width?: number;
    height?: number;
    algorithm?: 'force' | 'circular';
  }
): NetworkLayout {
  const width = options?.width || 800;
  const height = options?.height || 600;
  const algorithm = options?.algorithm || 'circular';

  // Build node list
  const nodes: NetworkNode[] = characters.map((char) => ({
    id: char.id,
    name: char.name,
    sex: char.sex,
    connections: relationships.filter(
      (r) => r.from === char.id || r.to === char.id
    ).length,
  }));

  // Build edge list
  const edges: NetworkEdge[] = relationships.map((rel) => ({
    from: rel.from,
    to: rel.to,
    type: rel.type,
    mutual: rel.mutual,
    weight: calculateWeight(rel, characters),
  }));

  // Compute layout using selected algorithm
  const layout =
    algorithm === 'force'
      ? forceDirectedLayout(nodes, edges, { width, height })
      : circularLayout(nodes, edges, { width, height });

  return { nodes, edges, layout };
}

// ============================================================================
// Private Helpers
// ============================================================================

/**
 * Pure function: Calculate edge weight based on dialogue frequency
 *
 * TODO: Implement dialogue frequency analysis
 * For now, return 1 for all edges.
 */
function calculateWeight(
  relation: Relationship,
  _characters: readonly Character[]
): number {
  // TODO: Implement dialogue frequency analysis
  // For now, return 1 for all edges
  return 1;
}

/**
 * Pure function: Force-directed layout algorithm
 *
 * Simplified force-directed layout.
 * In production, use d3-force or similar library.
 */
function forceDirectedLayout(
  nodes: readonly NetworkNode[],
  edges: readonly NetworkEdge[],
  options: { width: number; height: number }
): {
  nodes: readonly { id: string; x: number; y: number }[];
  edges: readonly { source: string; target: string }[];
} {
  const { width, height } = options;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  // Position nodes in circle
  const positionedNodes = nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI;
    return {
      id: node.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return {
    nodes: positionedNodes,
    edges: edges.map((e) => ({
      source: e.from,
      target: e.to,
    })),
  };
}

/**
 * Pure function: Circular layout algorithm
 *
 * Positions nodes in a circle around the center.
 */
function circularLayout(
  nodes: readonly NetworkNode[],
  edges: readonly NetworkEdge[],
  options: { width: number; height: number }
): {
  nodes: readonly { id: string; x: number; y: number }[];
  edges: readonly { source: string; target: string }[];
} {
  const { width, height } = options;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 3;

  // Position nodes in circle
  const positionedNodes = nodes.map((node, i) => {
    const angle = (i / nodes.length) * 2 * Math.PI - Math.PI / 2; // Start at top
    return {
      id: node.id,
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

  return {
    nodes: positionedNodes,
    edges: edges.map((e) => ({
      source: e.from,
      target: e.to,
    })),
  };
}
