'use client';

import { DocumentProvider } from '@/lib/context/DocumentContext';
import { ErrorProvider } from '@/lib/context/ErrorContext';
import { Toaster } from '@/components/ui/toaster';
import { Suspense } from 'react';
import URLSyncProvider from '@/lib/navigation/URLSyncProvider';
import { useSearchParams } from 'next/navigation';

function ProvidersInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();

  return (
    <DocumentProvider>
      <URLSyncProvider searchParams={searchParams}>
        <ErrorProvider>{children}</ErrorProvider>
        <Toaster />
      </URLSyncProvider>
    </DocumentProvider>
  );
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ProvidersInner>{children}</ProvidersInner>
    </Suspense>
  );
}
