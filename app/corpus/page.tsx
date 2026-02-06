'use client';

import { useSearchParams } from 'next/navigation';
import { CorpusBrowser } from '@/components/corpus/CorpusBrowser';

export default function CorpusPage() {
  const searchParams = useSearchParams();
  const docId = searchParams.get('doc') || null;

  return <CorpusBrowser initialDocId={docId} />;
}

export const metadata = {
  title: 'TEI Corpus Browser',
  description: 'Browse and explore TEI corpora',
};
