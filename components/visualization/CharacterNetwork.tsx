'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useDocumentContext } from '@/lib/context/DocumentContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CharacterNetworkProps {
  onNodeClick?: (nodeId: string) => void;
}

// Custom node component to display character info
function CharacterNode({ data }: { data: any }) {
  return (
    <div className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-stone-200">
      <div className="font-bold">{data.label}</div>
      <div className="text-xs text-gray-500">{data.value} lines</div>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  character: CharacterNode,
};

export function CharacterNetwork({ onNodeClick }: CharacterNetworkProps) {
  const { document } = useDocumentContext();

  // Extract character interaction data from TEI document
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!document) return { initialNodes: [], initialEdges: [] };

    const dialogue = document.getDialogue();
    const speakerMap = new Map<string, number>();
    const interactions = new Map<string, number>();

    // Count dialogue per speaker
    dialogue.forEach((d) => {
      if (d.who) {
        const count = speakerMap.get(d.who) || 0;
        speakerMap.set(d.who, count + 1);
      }
    });

    // Track interactions between speakers
    for (let i = 0; i < dialogue.length - 1; i++) {
      const current = dialogue[i];
      const next = dialogue[i + 1];

      if (current.who && next.who && current.who !== next.who) {
        const key = `${current.who}-${next.who}`;
        const count = interactions.get(key) || 0;
        interactions.set(key, count + 1);
      }
    }

    // Create nodes
    const nodes: Node[] = Array.from(speakerMap.entries()).map(([id, count]) => ({
      id,
      type: 'character',
      position: { x: 0, y: 0 },
      data: {
        label: id.replace(/^#/, ''),
        value: count,
      },
    }));

    // Create edges based on interactions
    const edges: Edge[] = Array.from(interactions.entries()).map(([key, count]) => {
      const [source, target] = key.split('-');
      return {
        source,
        target,
        id: key,
        label: `${count} interactions`,
        data: { value: count },
        animated: true,
        style: { stroke: '#b1b1b7', strokeWidth: Math.min(count, 5) },
      };
    });

    // Layout nodes in a circle for better visualization
    const angleStep = (2 * Math.PI) / nodes.length;
    const radius = Math.max(150, nodes.length * 30);

    nodes.forEach((node, i) => {
      const angle = i * angleStep;
      node.position = {
        x: 250 + radius * Math.cos(angle) - 75,
        y: 250 + radius * Math.sin(angle) - 40,
      };
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [document]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeClick?.(node.id);
    },
    [onNodeClick]
  );

  if (!document || initialNodes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Character Network</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No dialogue data available. Load a TEI document with dialogue annotations.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Character Network</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ width: '100%', height: '500px' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                return '#b1b1b7';
              }}
              maskColor="rgb(240, 240, 240, 0.6)"
            />
          </ReactFlow>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            <strong>Nodes:</strong> {initialNodes.length} characters |{' '}
            <strong>Edges:</strong> {initialEdges.length} interactions
          </p>
          <p className="mt-1">
            Drag nodes to rearrange. Scroll to zoom. Click on a character to see details.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
