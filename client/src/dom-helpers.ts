export function setFormDisabled(el: HTMLFormElement, disabled: boolean) {
  const controls = el.elements as any; // TODO: typing
  const controlsCount = controls.length;

  for (let i = 0; i < controlsCount; i++) {
    const control = controls[i];

    if ('disabled' in control)
      control.disabled = disabled;
  }
}
