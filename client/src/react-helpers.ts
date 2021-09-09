import type { Context, Dispatch, SetStateAction } from 'react';
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

export function usePrevious<T>(value: T) {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

export function useRequiredContext<T>(context: Context<T | undefined>): T {
  const contextValue = useContext(context);

  if (contextValue == null) throw new Error('Missing context provider');

  return contextValue;
}
