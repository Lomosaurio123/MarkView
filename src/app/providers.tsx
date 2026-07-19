'use client';

import { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/toaster';

export const providers: ReactNode = (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <Toaster />
  </ThemeProvider>
);