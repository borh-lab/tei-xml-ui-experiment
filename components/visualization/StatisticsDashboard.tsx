'use client';

import React, { useMemo } from 'react';
import { useDocumentService } from '@/lib/effect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ChartData {
  passage: string;
  dialogue: number;
}

interface CharacterDialogueData {
  name: string;
  value: number;
  fill: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function StatisticsDashboard() {
  const { document } = useDocumentService();

  const stats = useMemo(() => {
    if (!document) return null;

    const dialogue = document.state.dialogue;
    const passages = document.state.passages;
    const characters = document.state.characters;
    const relationships = document.state.relationships;

    // Dialogue per passage
    const dialoguePerPassage: ChartData[] = passages.map((passage) => ({
      passage: `#${passage.index + 1}`,
      dialogue: passage.tags.filter((t) => t.type === 'said').length,
    }));

    // Character with most dialogue
    const characterDialogueCount = new Map<string, number>();
    dialogue.forEach((d) => {
      if (d.speaker) {
        const char = characters.find((c) => c.id === d.speaker);
        const name = char?.name || d.speaker;
        characterDialogueCount.set(name, (characterDialogueCount.get(name) || 0) + 1);
      }
    });

    const topCharacters: CharacterDialogueData[] = Array.from(characterDialogueCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count], index) => ({
        name,
        value: count,
        fill: COLORS[index % COLORS.length],
      }));

    // Relationship types
    const relationshipTypes = new Map<string, number>();
    relationships.forEach((r) => {
      relationshipTypes.set(r.type, (relationshipTypes.get(r.type) || 0) + 1);
    });

    const relationshipData = Array.from(relationshipTypes.entries()).map(([type, count]) => ({
      name: type,
      value: count,
    }));

    // Tag type distribution
    const tagTypes = new Map<string, number>();
    passages.forEach((p) => {
      p.tags.forEach((t) => {
        tagTypes.set(t.type, (tagTypes.get(t.type) || 0) + 1);
      });
    });

    const tagData = Array.from(tagTypes.entries()).map(([type, count]) => ({
      name: type,
      value: count,
    }));

    return {
      totalDialogue: dialogue.length,
      totalPassages: passages.length,
      totalCharacters: characters.length,
      totalRelationships: relationships.length,
      dialoguePerPassage,
      topCharacters,
      relationshipData,
      tagData,
    };
  }, [document]);

  if (!stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Document Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No document loaded</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Dialogue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDialogue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Passages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPassages}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Characters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCharacters}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRelationships}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dialogue per passage */}
        <Card>
          <CardHeader>
            <CardTitle>Dialogue per Passage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.dialoguePerPassage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="passage"
                  label={{ value: 'Passage', position: 'insideBottom', offset: -5 }}
                />
                <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="dialogue" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top characters by dialogue */}
        {stats.topCharacters.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Top Speakers by Dialogue</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={stats.topCharacters}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={(entry) => entry.name}
                  >
                    {stats.topCharacters.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Relationship types */}
        {stats.relationshipData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Relationship Types</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.relationshipData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Tag type distribution */}
        {stats.tagData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tag Type Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={stats.tagData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
