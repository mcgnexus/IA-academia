// Script de prueba para validar el manejo de eventos del chatbot
(function testChatEvents() {
  console.log('🧪 Iniciando pruebas de eventos del chatbot...');
  
  const fab = document.getElementById('chatFab');
  const widget = document.getElementById('chatWidget');
  const closeBtn = document.getElementById('chatClose');
  
  if (!fab || !widget || !closeBtn) {
    console.error('❌ Elementos del chatbot no encontrados');
    return;
  }
  
  let testResults = [];
  
  function addTestResult(testName, passed, details) {
    testResults.push({ testName, passed, details });
    console.log(`${passed ? '✅' : '❌'} ${testName}: ${details}`);
  }
  
  // Test 1: Verificar estado inicial
  addTestResult(
    'Estado inicial del chat',
    widget.hidden === true,
    `El chat debería estar cerrado inicialmente (hidden: ${widget.hidden})`
  );
  
  // Test 2: Verificar aria-expanded inicial
  addTestResult(
    'ARIA expanded inicial',
    fab.getAttribute('aria-expanded') === 'false',
    `aria-expanded debería ser "false" inicialmente (actual: ${fab.getAttribute('aria-expanded')})`
  );
  
  // Test 3: Verificar que el botón de cierre sea clicable
  const closeBtnStyle = window.getComputedStyle(closeBtn);
  addTestResult(
    'Botón de cierre clicable',
    closeBtnStyle.cursor === 'pointer' && closeBtnStyle.zIndex > 0,
    `Cursor: ${closeBtnStyle.cursor}, Z-index: ${closeBtnStyle.zIndex}`
  );
  
  // Test 4: Verificar que el FAB sea clicable
  const fabStyle = window.getComputedStyle(fab);
  addTestResult(
    'FAB clicable',
    fabStyle.cursor === 'pointer' && fabStyle.zIndex > 0,
    `Cursor: ${fabStyle.cursor}, Z-index: ${fabStyle.zIndex}`
  );
  
  // Test 5: Verificar que no haya errores de JavaScript
  let jsError = false;
  const originalConsoleError = console.error;
  console.error = function() {
    jsError = true;
    originalConsoleError.apply(console, arguments);
  };
  
  // Simular interacciones
  try {
    // Abrir chat
    fab.click();
    setTimeout(() => {
      addTestResult('Abrir chat', !widget.hidden, 'El chat debería estar abierto después de clickear FAB');
      
      // Cerrar con botón
      closeBtn.click();
      setTimeout(() => {
        addTestResult('Cerrar con botón', widget.hidden, 'El chat debería estar cerrado después de clickear ×');
        
        // Verificar que no hubo errores de JS
        addTestResult('Sin errores de JavaScript', !jsError, 'No deberían haber errores durante las interacciones');
        
        // Resumen final
        const passedTests = testResults.filter(t => t.passed).length;
        const totalTests = testResults.length;
        
        console.log('\n📊 RESUMEN DE PRUEBAS:');
        console.log(`Tests pasados: ${passedTests}/${totalTests}`);
        
        if (passedTests === totalTests) {
          console.log('🎉 ¡Todas las pruebas pasaron! El chatbot está funcionando correctamente.');
        } else {
          console.log('⚠️ Algunas pruebas fallaron. Revisa los detalles arriba.');
          testResults.filter(t => !t.passed).forEach(t => {
            console.log(`  - ${t.testName}: ${t.details}`);
          });
        }
        
        // Restaurar console.error
        console.error = originalConsoleError;
        
      }, 100);
    }, 100);
  } catch (error) {
    console.error('❌ Error durante las pruebas:', error);
    console.error = originalConsoleError;
  }
})();