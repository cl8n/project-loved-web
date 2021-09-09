// TODO: kinda stupid but it doesn't look bad most of the time
// Assumes that the element has `box-sizing: border-box;`
function autoHeight(element: HTMLElement) {
  element.style.height = '0';
  element.style.height = element.scrollHeight + element.offsetHeight - element.clientHeight + 'px';
}

export function registerTextareaAutoHeightTrigger() {
  document.addEventListener('input', (event) => {
    if (event.target instanceof HTMLTextAreaElement) {
      autoHeight(event.target);
    }
  });
}

export function autoHeightRef(element: HTMLElement | null) {
  if (element != null) {
    autoHeight(element);
  }
}
