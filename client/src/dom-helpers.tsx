import { ChangeEvent, Dispatch, FormEvent, PropsWithChildren, SetStateAction, useEffect, useRef } from 'react';

function setFormDisabled(form: HTMLFormElement, disabled: boolean) {
  const controls = form.elements as any; // TODO: typing
  const controlsCount = controls.length;

  for (let i = 0; i < controlsCount; i++) {
    const control = controls[i];

    if ('disabled' in control)
      control.disabled = disabled;
  }
}

export type FormSubmitHandler = (values: Record<string, string>, then: () => void, inputs: HTMLFormControlsCollection) => Promise<void> | null;

type FormProps = PropsWithChildren<{
  busyState: [boolean, Dispatch<SetStateAction<boolean>>];
  keepAfterSubmit?: boolean;
  onSubmit: FormSubmitHandler;
}>;

export function Form({
  busyState: [busy, setBusy],
  children,
  keepAfterSubmit,
  onSubmit,
}: FormProps) {
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (ref.current != null)
      setFormDisabled(ref.current, busy);
  }, [busy]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    const form = event.currentTarget;
    const controls = form.elements;
    const controlsCount = controls.length;
    const values: Record<string, string> = {};

    for (let i = 0; i < controlsCount; i++) {
      const control = controls[i] as any; // TODO: typing

      if (control.type === 'submit')
        continue;

      values[control.name] = control.type === 'radio'
        ? (controls.namedItem(control.name) as RadioNodeList).value
        : control.value;
    }

    const maybePromise = onSubmit(
      values,
      () => {
        if (!keepAfterSubmit)
          form.reset();
      },
      controls,
    );

    if (maybePromise == null)
      setBusy(false);
    else
      maybePromise.finally(() => setBusy(false));
  };

  return <form ref={ref} onSubmit={handleSubmit}>{children}</form>;
}

export function autoHeight<T extends HTMLElement>(element: T) {
  element.style.height = '5px';
  element.style.height = element.scrollHeight + 'px';
}
