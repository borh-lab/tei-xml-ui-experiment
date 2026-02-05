// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { QuickSearchDialog as QuickSearchDialogOriginal } from './QuickSearchDialog';

const FEATURE_FLAG = 'feature-useEffectMisc';

/**
 * QuickSearchDialog Effect wrapper
 *
 * This component wraps QuickSearchDialog which already uses Effect services
 * (via useDocumentService hook). The wrapper checks a feature flag to enable
 * the component when the Effect migration is enabled.
 *
 * Feature Flag: 'feature-useEffectMisc'
 * - When enabled (set to 'true' in localStorage): Returns the component
 * - When disabled or not set: Returns null
 */
export function QuickSearchDialog(props: any) {
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

  return <QuickSearchDialogOriginal {...props} />;
}

export default QuickSearchDialog;
