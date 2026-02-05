// @ts-nocheck
'use client';

import { useMemo, useCallback } from 'react';
import ReactFlow, { Node, Edge, Background, Controls, MiniMap, BackgroundVariant, MarkerType } from 'reactflow';
import 'reactflow/dist/style.css';
import { useDocumentService } from '@/lib/effect/react/hooks';
import { computeNetworkLayout } from '@/lib/visualization/network-layout';
import type { TEIDocument } from '@/lib/tei/types';

interface CharacterNetworkProps {
  document?: TEIDocument;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

// Custom node component to display character info
function CharacterNode({ data }: { data: { label: string; connections?: number } }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-200 min-w-[100px]">
      <div className="font-bold">{data.label}</div>
      {data.connections !== undefined && (
        <div className="text-xs text-gray-500">{data.connections} connections</div>
      )}
    </div>
  );
}

const nodeTypes = {
  character: CharacterNode,
};

/**
 * CharacterNetwork - Effect-based version
 *
 * Uses useDocumentService hook instead of props.
 * Fully functional with React bridge implementation.
 */
export function EffectCharacterNetwork({
  onNodeClick,
  width = 500,
  height = 400,
}: Omit<CharacterNetworkProps, 'document'>) {
  const { document } = useDocumentService();

  // Compute network layout from document state
  const layout = useMemo(() => {
    if (!document) return null;
    return computeNetworkLayout(document.state.characters, document.state.relationships, {
      width,
      height,
      algorithm: 'circular',
    });
  }, [document, width, height]);

  // Convert layout nodes to ReactFlow nodes
  const nodes: Node[] = useMemo(() => {
    if (!layout) return [];
    return layout.nodes.map((node) => {
      const position = layout.layout.nodes.find((n) => n.id === node.id);
      return {
        id: node.id,
        type: 'character',
        data: {
          label: node.name,
          connections: node.connections,
          sex: node.sex,
        },
        position: position ? { x: position.x, y: position.y } : { x: 0, y: 0 },
        style: {
          background: node.sex === 'M' ? '#dbeafe' : node.sex === 'F' ? '#fce7f3' : '#f3f4f6',
          border:
            node.sex === 'M'
              ? '3px solid #3b82f6'
              : node.sex === 'F'
                ? '3px solid #ec4899'
                : '3px solid #6b7280',
        },
      };
    });
  }, [layout]);

  // Convert layout edges to ReactFlow edges
  const edges: Edge[] = useMemo(() => {
    if (!layout) return [];
    return layout.edges.map((edge) => ({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      label: edge.type,
      animated: edge.mutual,
      style: {
        stroke: edge.mutual ? '#10b981' : '#64748b',
        strokeWidth: edge.weight ? Math.min(3, Math.max(1, edge.weight)) : 1,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edge.mutual ? '#10b981' : '#64748b',
      },
    }));
  }, [layout]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  if (!document || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">
          No characters to display. Add characters to see the network visualization.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: `${height}px` }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        attributionPosition="bottom-left"
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const sex = node.data.sex;
            return sex === 'M' ? '#dbeafe' : sex === 'F' ? '#fce7f3' : '#f3f4f6';
          }}
          maskColor="rgb(240, 240, 240, 0.6)"
        />
      </ReactFlow>

      {/* Statistics */}
      <div className="mt-4 text-sm text-muted-foreground">
        <p>
          <strong>Nodes:</strong> {nodes.length} characters | <strong>Edges:</strong> {edges.length}{' '}
          connections
        </p>
        <p className="mt-1">
          Drag nodes to rearrange. Scroll to zoom. Click on a character to see details.
        </p>
      </div>
    </div>
  );
}

/**
 * CharacterNetwork with feature flag support
 *
 * Automatically switches between React and Effect implementations
 * based on feature-useEffectVisualization feature flag.
 *
 * For now, we default to React version until Effect is fully tested.
 */
export default function CharacterNetwork(props: CharacterNetworkProps) {
  // Check if Effect version should be used
  const useEffect = typeof window !== 'undefined'
    ? localStorage.getItem('feature-useEffectVisualization') === 'true'
    : false;

  if (useEffect) {
    return <EffectCharacterNetwork {...props} />;
  }

  // Fall back to React version
  const ReactCharacterNetwork = require('./CharacterNetwork').CharacterNetwork;
  return <ReactCharacterNetwork {...props} />;
}
