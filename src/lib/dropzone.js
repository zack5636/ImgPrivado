export function createDropzone({
  element,
  input = element?.querySelector('input[type="file"]'),
  onFiles,
  multiple = true
}) {
  if (!element || !input || typeof onFiles !== 'function') {
    throw new Error('createDropzone necesita element, input y onFiles.');
  }

  input.multiple = multiple;

  const readFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length > 0) {
      onFiles(files);
    }
    input.value = '';
  };

  element.addEventListener('click', (event) => {
    if (event.target !== input) {
      input.click();
    }
  });

  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      input.click();
    }
  });

  input.addEventListener('change', () => readFiles(input.files));

  ['dragenter', 'dragover'].forEach((eventName) => {
    element.addEventListener(eventName, (event) => {
      event.preventDefault();
      element.classList.add('is-dragover');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    element.addEventListener(eventName, (event) => {
      event.preventDefault();
      element.classList.remove('is-dragover');
    });
  });

  element.addEventListener('drop', (event) => {
    readFiles(event.dataTransfer.files);
  });

  return {
    destroy() {
      element.replaceWith(element.cloneNode(true));
    }
  };
}
