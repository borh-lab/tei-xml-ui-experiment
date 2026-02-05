// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { CommandPalette as CommandPaletteOriginal } from './CommandPalette';

const FEATURE_FLAG = 'feature-useEffectMisc';

/**
 * CommandPalette Effect wrapper
 *
 * This component wraps CommandPalette which already uses Effect services
 * (via useDocumentService hook). The wrapper checks a feature flag to enable
 * the component when the Effect migration is enabled.
 *
 * Feature Flag: 'feature-useEffectMisc'
 * - When enabled (set to 'true' in localStorage): Returns the component
 * - When disabled or not set: Returns null
 */
export function CommandPalette(props: any) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const flagValue = localStorage.getItem(FEATURE_FLAG);
    setIsEnabled(flagValue === 'true');
  }, []);

  if (!isClient || !isEnabled) {
    return null;
  }

  return <CommandPaletteOriginal {...props} />;
}

export default CommandPalette;
