'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { editor } from 'monaco-editor';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface XMLCodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onDidChangeSelection?: (event: any) => void;
  onMount?: (editor: editor.IStandaloneCodeEditor) => void;
  errors?: Array<{ line: number; message: string }>;
  readOnly?: boolean;
  height?: string;
}

export const XMLCodeEditor: React.FC<XMLCodeEditorProps> = ({
  value,
  onChange,
  onDidChangeSelection,
  onMount,
  errors = [],
  readOnly = false,
  height = '100%',
}) => {
  const [mounted, setMounted] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationRefs = useRef<string[]>([]);
  const [hasPendingChange, setHasPendingChange] = useState(false);

  // Only render on client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, _monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;

    // Configure XML language options
    // Note: Monaco doesn't have built-in XML validation, so we'll use custom markers

    // Register selection change listener
    if (onDidChangeSelection) {
      editor.onDidChangeCursorSelection((e) => {
        onDidChangeSelection(e);
      });
    }

    // Call parent onMount callback
    if (onMount) {
      onMount(editor);
    }

    // Set custom XML syntax highlighting options
    editor.updateOptions({
      formatOnPaste: true,
      formatOnType: true,
    });
  }, [onDidChangeSelection, onMount]);

  const handleEditorChange = useCallback((newValue: string | undefined) => {
    if (newValue !== undefined && onChange) {
      setHasPendingChange(true);
      onChange(newValue);
      // Debounce is handled by the parent component
    }
  }, [onChange]);

  // Update error markers (squiggles) when errors change
  useEffect(() => {
    if (!editorRef.current || !mounted) return;

    const monacoEditor = editorRef.current;
    const model = monacoEditor.getModel();

    if (!model) return;

    // Clear existing decorations
    const oldDecorations = decorationRefs.current;
    decorationRefs.current = [];

    // Create new decorations for errors (using dynamic import to access monaco)
    import('monaco-editor').then((monaco) => {
      const newDecorations: editor.IModelDeltaDecoration[] = errors.map((error) => ({
        range: new monaco.Range(
          error.line,
          1,
          error.line,
          1000 // Highlight entire line
        ),
        options: {
          className: 'squiggly-error',
          hoverMessage: {
            value: error.message,
          },
          minimap: {
            color: '#ff0000',
            position: monaco.editor.MinimapPosition.Inline,
          },
        },
      }));

      // Apply decorations
      decorationRefs.current = monacoEditor.deltaDecorations(oldDecorations, newDecorations);
    });
  }, [errors, mounted]);

  // Clear pending change flag after a delay
  useEffect(() => {
    if (hasPendingChange) {
      const timer = setTimeout(() => {
        setHasPendingChange(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [hasPendingChange]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-sm text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <MonacoEditor
        defaultLanguage="xml"
        value={value}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        options={{
          readOnly,
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          detectIndentation: true,
          folding: true,
          bracketPairColorization: {
            enabled: true,
          },
          wordWrap: 'on',
          // XML-specific options
          formatOnPaste: true,
          formatOnType: true,
        }}
        theme="vs"
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-sm text-muted-foreground">Loading editor...</div>
          </div>
        }
      />
      {/* Custom CSS for error squiggles */}
      <style jsx global>{`
        .squiggly-error {
          text-decoration: underline wavy red;
          text-decoration-style: wavy;
          text-decoration-color: #ff0000;
        }
      `}</style>
    </div>
  );
};

XMLCodeEditor.displayName = 'XMLCodeEditor';
