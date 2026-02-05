'use client';

import { useState } from 'react';
import { Menu, Home, FileText, HelpCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

export function MobileNavigation() {
  const [open, setOpen] = useState(false);

  const handleNavigate = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden" aria-label="Open navigation menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>Navigation</SheetTitle>
            <Badge variant="outline" className="text-[10px] flex items-center gap-1">
              <Info className="h-3 w-3" />
              feature-useEffectCorpus
            </Badge>
          </div>
          <SheetDescription>Quick access to main features</SheetDescription>
        </SheetHeader>
        <nav className="mt-8 flex flex-col gap-4">
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() =>
              handleNavigate(() => {
                window.location.href = '/';
              })
            }
          >
            <Home className="mr-2 h-5 w-5" />
            Home
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() =>
              handleNavigate(() => {
                // Scroll to samples section or trigger samples dialog
                const samplesButton = document.querySelector('[aria-label="Open samples gallery"]');
                if (samplesButton instanceof HTMLElement) {
                  samplesButton.click();
                }
              })
            }
          >
            <FileText className="mr-2 h-5 w-5" />
            Samples
          </Button>
          <Button
            variant="ghost"
            className="justify-start"
            onClick={() =>
              handleNavigate(() => {
                // Trigger keyboard shortcuts help
                const helpButton = document.querySelector('[aria-label="Keyboard shortcuts"]');
                if (helpButton instanceof HTMLElement) {
                  helpButton.click();
                }
              })
            }
          >
            <HelpCircle className="mr-2 h-5 w-5" />
            Help
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
