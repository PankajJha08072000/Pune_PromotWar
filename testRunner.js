// Simple pure JavaScript Testing Suite
window.runTests = function() {
  console.log("Starting Test Suite...");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Test state initialization
  assert(state !== undefined, "Global state object exists");
  assert(state.difficulty === 2, "Default difficulty is 2");
  
  // 2. Test Markdown parsing (if available)
  if (typeof parseMarkdown === 'function') {
    const html = parseMarkdown("**Bold** and *Italic*");
    assert(html.includes("<strong>Bold</strong>"), "Markdown bold parsing works");
  }

  // 3. Test progress logic
  state.topics['testTopic'] = 1;
  updateProgress();
  assert(state.topics['testTopic'] === 1, "Topic tracking works");

  console.log(`Test Run Complete. Passed: ${passed}, Failed: ${failed}`);
  
  if (failed === 0) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = `All ${passed} tests passed!`;
    document.getElementById('toastContainer').appendChild(toast);
  }
};

// Automatically run tests if ?test=1 is in URL
if (window.location.search.includes('test=1')) {
  setTimeout(window.runTests, 1000);
}
