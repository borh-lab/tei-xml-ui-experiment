// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { LoadedCorpusView as LoadedCorpusViewOriginal } from './LoadedCorpusView';
import type { CorpusMetadata, DocumentId } from '@/lib/effect/protocols/CorpusDataSource';
import type { DocumentViewState } from '@/lib/effect/services/CorpusBrowser';

const FEATURE_FLAG = 'feature-useEffectCorpus';

interface LoadedCorpusViewProps {
  metadata: CorpusMetadata;
  page: number;
  documentState: DocumentViewState;
  onLoadDocument: (docId: DocumentId) => void;
  onChangePage: (page: number) => void;
  onGoBack: () => void;
}

export function LoadedCorpusView(props: LoadedCorpusViewProps) {
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

  return <LoadedCorpusViewOriginal {...props} />;
}

export default LoadedCorpusView;
