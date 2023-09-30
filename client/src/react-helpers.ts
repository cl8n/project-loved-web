import type { Context, DependencyList, EffectCallback } from 'react';
import { useContext, useEffect, useRef } from 'react';

export function useEffectExceptOnMount(effect: EffectCallback, deps?: DependencyList): void {
  const firstUpdate = useRef(true);

  useEffect(() => {
    if (firstUpdate.current) {
      firstUpdate.current = false;
      return;
    }

    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function useRequiredContext<T>(context: Context<T | undefined>): T {
  const contextValue = useContext(context);

  if (contextValue == null) {
    throw new Error('Missing context provider');
  }

  return contextValue;
}
