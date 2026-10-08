import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import UiGallery from './ui-gallery';

export const metadata: Metadata = {
  title: 'UI gallery',
  robots: { index: false, follow: false },
};

// Development reference for the base components. Production builds answer
// 404 so the page can't be reached on a deployed dashboard.
export default function UiGalleryPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }
  return <UiGallery />;
}
