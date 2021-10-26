import { useEffect } from 'react';

export default function useTitle(title: string | null | undefined): void {
  useEffect(() => {
    if (title != null) {
      // TODO: localize
      document.title = `${title} | Project Loved`;
    }
  }, [title]);
}
