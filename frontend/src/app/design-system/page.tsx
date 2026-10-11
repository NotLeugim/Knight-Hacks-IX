import { notFound } from 'next/navigation';
import DesignSystemShowcase from './DesignSystemShowcase';

// Internal Orbit UI style guide: only available when running `npm run dev`.
// Production builds (Vercel) return a 404 for /design-system.
export default function DesignSystemPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound();
  }
  return <DesignSystemShowcase />;
}
