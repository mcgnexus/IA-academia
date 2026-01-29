// Validación de manejo de eventos para el chatbot
(function validateChatEvents() {
  const events = {
    click: [],
    mousedown: [],
    touchstart: []
  };

  function logEvent(type, target, prevented) {
    events[type].push({
      timestamp: Date.now(),
      target: target.tagName + (target.id ? '#' + target.id : ''),
      prevented: prevented
    });
  }

  // Interceptar eventos para análisis
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    const wrappedListener = function(event) {
      const result = listener.call(this, event);
      logEvent(type, event.target, event.defaultPrevented);
      return result;
    };
    return originalAddEventListener.call(this, type, wrappedListener, options);
  };

  // Función de validación
  window.validateChatFunctionality = function() {
    const fab = document.getElementById('chatFab');
    const widget = document.getElementById('chatWidget');
    const closeBtn = document.getElementById('chatClose');

    if (!fab || !widget || !closeBtn) {
      return { error: 'Elementos faltantes' };
    }

    const results = {
      fabClickable: fab.style.cursor === 'pointer' || getComputedStyle(fab).cursor === 'pointer',
      closeBtnClickable: closeBtn.style.cursor === 'pointer' || getComputedStyle(closeBtn).cursor === 'pointer',
      widgetVisible: !widget.hidden,
      ariaExpanded: fab.getAttribute('aria-expanded'),
      zIndexFAB: parseInt(getComputedStyle(fab).zIndex),
      zIndexWidget: parseInt(getComputedStyle(widget).zIndex),
      zIndexClose: parseInt(getComputedStyle(closeBtn).zIndex),
      events: events
    };

    return results;
  };

  console.log('✅ Validador de eventos del chatbot cargado. Usa validateChatFunctionality() para verificar.');
})();