'use client';

import React, { useCallback, useMemo, useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ProximityAnalyzer, ProximityConfig, ProximityMethod, EdgeDirection } from '@/lib/visualization/ProximityAnalyzer';

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

  // Network configuration state
  const [proximityMethod, setProximityMethod] = useState<ProximityMethod>('dialogue');
  const [maxDistance, setMaxDistance] = useState(3);
  const [edgeDirection, setEdgeDirection] = useState<EdgeDirection>('undirected');
  const [edgeThreshold, setEdgeThreshold] = useState(1);

  // Build proximity config
  const config: ProximityConfig = useMemo(
    () => ({
      method: proximityMethod,
      maxDistance,
      edgeDirection,
      edgeThreshold,
    }),
    [proximityMethod, maxDistance, edgeDirection, edgeThreshold]
  );

  // Extract character interaction data from TEI document using ProximityAnalyzer
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!document) return { initialNodes: [], initialEdges: [] };

    const analyzer = new ProximityAnalyzer(document);
    return analyzer.analyze(config);
  }, [document, config]);

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
        {/* Configuration Panel */}
        <div className="mb-6 space-y-6 p-4 bg-muted rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Proximity Method Selector */}
            <div className="space-y-2">
              <Label htmlFor="proximity-method">Proximity Method</Label>
              <Select
                value={proximityMethod}
                onValueChange={(value: ProximityMethod) => setProximityMethod(value)}
              >
                <SelectTrigger id="proximity-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraph">Paragraph (Same Paragraph)</SelectItem>
                  <SelectItem value="dialogue">Dialogue (Sequential Turns)</SelectItem>
                  <SelectItem value="word">Word Distance (Within X Words)</SelectItem>
                  <SelectItem value="combined">Combined (Multiple Methods)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How character relationships are detected
              </p>
            </div>

            {/* Edge Direction Selector */}
            <div className="space-y-2">
              <Label htmlFor="edge-direction">Edge Direction</Label>
              <Select
                value={edgeDirection}
                onValueChange={(value: EdgeDirection) => setEdgeDirection(value)}
              >
                <SelectTrigger id="edge-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undirected">Undirected (Relationships)</SelectItem>
                  <SelectItem value="directed">Directed (Dialogue Flow)</SelectItem>
                  <SelectItem value="both">Both (Combined)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How edges are displayed in the graph
              </p>
            </div>

            {/* Max Distance Slider */}
            <div className="space-y-2">
              <Label htmlFor="max-distance">
                Max Distance: {maxDistance} {proximityMethod === 'word' ? 'words' : 'turns'}
              </Label>
              <Slider
                id="max-distance"
                min={1}
                max={proximityMethod === 'word' ? 100 : 10}
                step={1}
                value={[maxDistance]}
                onValueChange={(value) => setMaxDistance(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                {proximityMethod === 'word'
                  ? 'Maximum word distance for character proximity'
                  : 'Maximum dialogue turns between characters'}
              </p>
            </div>

            {/* Edge Threshold Slider */}
            <div className="space-y-2">
              <Label htmlFor="edge-threshold">Min Strength: {edgeThreshold}</Label>
              <Slider
                id="edge-threshold"
                min={1}
                max={10}
                step={1}
                value={[edgeThreshold]}
                onValueChange={(value) => setEdgeThreshold(value[0])}
              />
              <p className="text-xs text-muted-foreground">
                Minimum connection strength to display edge
              </p>
            </div>
          </div>
        </div>

        {/* ReactFlow Graph */}
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

        {/* Statistics */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            <strong>Nodes:</strong> {initialNodes.length} characters |{' '}
            <strong>Edges:</strong> {initialEdges.length} connections
          </p>
          <p className="mt-1">
            <strong>Method:</strong> {proximityMethod} |{' '}
            <strong>Direction:</strong> {edgeDirection} |{' '}
            <strong>Threshold:</strong> {edgeThreshold}
          </p>
          <p className="mt-1">
            Drag nodes to rearrange. Scroll to zoom. Click on a character to see details.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
