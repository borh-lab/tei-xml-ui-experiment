import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function TestComponentsPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Component Test Page</h1>

      {/* Buttons */}
      <Card>
        <CardHeader>
          <CardTitle>Buttons</CardTitle>
          <CardDescription>Testing button variants</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button>Primary Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="link">Link Button</Button>
        </CardContent>
      </Card>

      {/* Input Fields */}
      <Card>
        <CardHeader>
          <CardTitle>Input Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="text-input">Text Input</Label>
            <Input id="text-input" placeholder="Text input" />
          </div>
          <div>
            <Label htmlFor="disabled-input">Disabled Input</Label>
            <Input id="disabled-input" disabled placeholder="Disabled" />
          </div>
        </CardContent>
      </Card>

      {/* Textarea */}
      <Card>
        <CardHeader>
          <CardTitle>Textarea</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea placeholder="Enter description" rows={4} />
        </CardContent>
      </Card>

      {/* Select */}
      <Card>
        <CardHeader>
          <CardTitle>Select Dropdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Select>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Alert */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>Test Alert - Default</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <AlertDescription>Destructive Alert</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Tabs</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="tab1">
            <TabsList>
              <TabsTrigger value="tab1">Tab One</TabsTrigger>
              <TabsTrigger value="tab2">Tab Two</TabsTrigger>
              <TabsTrigger value="tab3">Tab Three</TabsTrigger>
            </TabsList>
            <TabsContent value="tab1">
              <p>Content for Tab One</p>
            </TabsContent>
            <TabsContent value="tab2">
              <p>Content for Tab Two</p>
            </TabsContent>
            <TabsContent value="tab3">
              <p>Content for Tab Three</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Combined Card Example */}
      <Card>
        <CardHeader>
          <CardTitle>Test Card Title</CardTitle>
          <CardDescription>Combined component example</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>This is a card with multiple components working together.</p>
          <div className="flex gap-2">
            <Input placeholder="Quick input" className="flex-1" />
            <Button>Action</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
