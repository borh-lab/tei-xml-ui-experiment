// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export interface TagInfo {
  tagName: string;
  attributes: Record<string, string>;
  element: HTMLElement;
}

interface TagEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tagInfo: TagInfo | null;
  onApply: (tagName: string, attributes: Record<string, string>) => void;
}

// TEI tag schema definitions for common tags
const TAG_SCHEMAS: Record<
  string,
  {
    attributes: Array<{
      name: string;
      type: 'text' | 'select';
      required: boolean;
      options?: string[];
      defaultValue?: string;
    }>;
  }
> = {
  said: {
    attributes: [
      {
        name: 'who',
        type: 'select',
        required: true,
        options: ['speaker1', 'speaker2', 'speaker3', 'speaker4', 'speaker5'],
        defaultValue: 'speaker1',
      },
      {
        name: 'direct',
        type: 'select',
        required: false,
        options: ['true', 'false'],
        defaultValue: 'false',
      },
      {
        name: 'aloud',
        type: 'select',
        required: false,
        options: ['true', 'false'],
        defaultValue: 'true',
      },
    ],
  },
  q: {
    attributes: [
      {
        name: 'who',
        type: 'text',
        required: false,
      },
    ],
  },
  stage: {
    attributes: [
      {
        name: 'type',
        type: 'select',
        required: false,
        options: ['enter', 'exit', 'setting', 'delivery', 'action'],
        defaultValue: 'action',
      },
    ],
  },
  p: {
    attributes: [
      {
        name: 'id',
        type: 'text',
        required: false,
      },
    ],
  },
};

export function TagEditDialog({ isOpen, onClose, tagInfo, onApply }: TagEditDialogProps) {
  const [editedAttributes, setEditedAttributes] = useState<Record<string, string>>({});
  const [previewXML, setPreviewXML] = useState<string>('');

  const updatePreview = useCallback((tagName: string, attrs: Record<string, string>) => {
    const attrString = Object.entries(attrs)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join('');
    setPreviewXML(`<${tagName}${attrString}>...</${tagName}>`);
  }, []);

  // Initialize edited attributes when tagInfo changes
  useEffect(() => {
    if (tagInfo) {
      setEditedAttributes({ ...tagInfo.attributes });
      updatePreview(tagInfo.tagName, tagInfo.attributes);
    }
  }, [tagInfo, updatePreview]);

  const handleAttributeChange = (attrName: string, value: string) => {
    const newAttrs = { ...editedAttributes, [attrName]: value };
    setEditedAttributes(newAttrs);
    if (tagInfo) {
      updatePreview(tagInfo.tagName, newAttrs);
    }
  };

  const handleApply = () => {
    if (tagInfo) {
      onApply(tagInfo.tagName, editedAttributes);
      onClose();
    }
  };

  const handleCancel = () => {
    onClose();
  };

  const getSchema = () => {
    if (!tagInfo) return null;
    return TAG_SCHEMAS[tagInfo.tagName] || null;
  };

  const schema = getSchema();

  if (!tagInfo) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Tag: &lt;{tagInfo.tagName}&gt;</DialogTitle>
          <DialogDescription>
            Modify the attributes of this TEI tag. Changes will be applied to the document.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="attributes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="attributes">Attributes</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="attributes" className="space-y-4">
            {schema ? (
              // Schema-based form
              <div className="space-y-4">
                {schema.attributes.map((attrDef) => {
                  const value = editedAttributes[attrDef.name] || attrDef.defaultValue || '';

                  return (
                    <div key={attrDef.name} className="space-y-2">
                      <Label htmlFor={attrDef.name}>
                        {attrDef.name}
                        {attrDef.required && <span className="text-destructive ml-1">*</span>}
                      </Label>

                      {attrDef.type === 'select' && attrDef.options ? (
                        <Select
                          value={value}
                          onValueChange={(val) => handleAttributeChange(attrDef.name, val)}
                        >
                          <SelectTrigger id={attrDef.name}>
                            <SelectValue placeholder="Select value..." />
                          </SelectTrigger>
                          <SelectContent>
                            {attrDef.options.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={attrDef.name}
                          type="text"
                          value={value}
                          onChange={(e) => handleAttributeChange(attrDef.name, e.target.value)}
                          placeholder={attrDef.defaultValue || `Enter ${attrDef.name}...`}
                        />
                      )}

                      <p className="text-xs text-muted-foreground">
                        {attrDef.type === 'select'
                          ? 'Select from predefined options'
                          : 'Enter a value'}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Generic form for unknown tags
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  No schema available for this tag. Edit attributes manually.
                </p>

                {Object.entries(editedAttributes).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{key}</Label>
                    <Input
                      id={key}
                      type="text"
                      value={value}
                      onChange={(e) => handleAttributeChange(key, e.target.value)}
                    />
                  </div>
                ))}

                {Object.keys(editedAttributes).length === 0 && (
                  <p className="text-sm text-muted-foreground">No attributes to edit.</p>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div className="space-y-2">
              <Label>XML Preview</Label>
              <div className="p-4 bg-muted rounded-md">
                <pre className="text-sm font-mono">{previewXML}</pre>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Current Attributes</Label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(editedAttributes).map(([key, value]) => (
                  <Badge key={key} variant="outline" className="font-mono">
                    {key}=&quot;{value}&quot;
                  </Badge>
                ))}
                {Object.keys(editedAttributes).length === 0 && (
                  <span className="text-sm text-muted-foreground">No attributes</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Element Info</Label>
              <div className="p-3 bg-muted rounded-md text-sm">
                <div>
                  <strong>Tag:</strong> &lt;{tagInfo.tagName}&gt;
                </div>
                <div>
                  <strong>Attributes:</strong> {Object.keys(editedAttributes).length}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
