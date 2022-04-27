import type { Context, DependencyList, Dispatch, EffectCallback, SetStateAction } from 'react';
import { useContext, useEffect, useRef } from 'react';

export function setProperty<T, K extends keyof T>(
  setter: Dispatch<SetStateAction<T>>,
  property: K,
  value: T[K],
) {
  setter((prevState) => {
    return {
      ...prevState,
      [property]: value,
    };
  });
}

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

export function usePrevious<T>(value: T) {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function useRequiredContext<T>(context: Context<T | undefined>): T {
  const contextValue = useContext(context);

  if (contextValue == null) {
    throw new Error('Missing context provider');
  }

  return contextValue;
}
