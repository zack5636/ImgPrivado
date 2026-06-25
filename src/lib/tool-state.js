export function createGenerationState({
  button,
  onGenerate,
  onDownload,
  onError,
  onReady,
  onInvalidate,
  canGenerate = () => true,
  labels = {}
}) {
  if (!button || typeof onGenerate !== 'function' || typeof onDownload !== 'function') {
    throw new Error('createGenerationState necesita button, onGenerate y onDownload.');
  }

  const text = {
    idle: labels.idle || 'Generar',
    processing: labels.processing || 'Procesando...',
    ready: labels.ready || 'Descargar'
  };

  let phase = 'idle';
  let result = null;

  const render = () => {
    button.textContent = text[phase];
    button.dataset.phase = phase;
    button.disabled = phase === 'processing' || (phase === 'idle' && !canGenerate());
    button.setAttribute('aria-busy', phase === 'processing' ? 'true' : 'false');
  };

  const invalidate = () => {
    result = null;
    phase = 'idle';
    onInvalidate?.();
    render();
  };

  const handleClick = async () => {
    if (phase === 'processing') {
      return null;
    }

    if (phase === 'ready') {
      await onDownload(result);
      return result;
    }

    if (!canGenerate()) {
      render();
      return null;
    }

    phase = 'processing';
    render();

    try {
      result = await onGenerate();
      phase = 'ready';
      onReady?.(result);
      render();
      return result;
    } catch (error) {
      result = null;
      phase = 'idle';
      render();
      onError?.(error);
      return null;
    }
  };

  button.addEventListener('click', handleClick);
  render();

  return {
    handleClick,
    invalidate,
    update: render,
    get phase() {
      return phase;
    },
    get result() {
      return result;
    }
  };
}
