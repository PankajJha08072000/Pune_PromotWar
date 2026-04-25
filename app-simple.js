'use strict';

// Simple working version - no Gemini API yet
console.log('🚀 Minimal app loaded');

let sidebar, menuBtn, userInput, sendBtn, chatArea, typingIndicator;

// DOM helper
const $ = id => document.getElementById(id);

// Initialize when HTML is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('📍 DOMContentLoaded fired');
  
  // Get DOM refs
  sidebar = $('sidebar');
  menuBtn = $('menuBtn');
  userInput = $('userInput');
  sendBtn = $('sendBtn');
  chatArea = $('chatArea');
  typingIndicator = $('typingIndicator');

  if (!userInput || !sendBtn) {
    console.error('❌ Critical elements missing!');
    return;
  }

  console.log('✅ DOM elements found');

  // Wire up send button
  sendBtn.addEventListener('click', handleSend);
  
  // Wire up Enter key in input
  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  // Wire up menu button
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      console.log('Menu clicked');
      if (sidebar) sidebar.classList.toggle('open');
    });
  }

  // Enable send button when text is entered
  userInput.addEventListener('input', () => {
    sendBtn.disabled = userInput.value.trim().length === 0;
  });

  console.log('✅ Event listeners attached');
});

// Simple message handler
async function handleSend() {
  const message = userInput.value.trim();
  
  if (!message) {
    console.warn('Empty message');
    return;
  }

  console.log('📤 Sending:', message);
  
  // Add user message to chat
  addMessageToChat('user', message);
  
  // Clear input
  userInput.value = '';
  sendBtn.disabled = true;

  // Show typing indicator
  if (typingIndicator) {
    typingIndicator.style.display = 'flex';
  }

  // Simulate response delay
  setTimeout(() => {
    if (typingIndicator) {
      typingIndicator.style.display = 'none';
    }
    addMessageToChat('ai', 'I need your Gemini API key to respond. Please check the instructions.');
    console.log('📥 Response added');
  }, 1000);
}

// Display message in chat
function addMessageToChat(role, content) {
  if (!chatArea) return;

  const msgDiv = document.createElement('div');
  msgDiv.className = `message ${role}`;
  msgDiv.innerHTML = `
    <div class="message-avatar">${role === 'user' ? '👤' : '🤖'}</div>
    <div class="message-content">${escapeHtml(content)}</div>
  `;
  
  chatArea.appendChild(msgDiv);
  chatArea.scrollTop = chatArea.scrollHeight;
  console.log(`Message added: ${role} - ${content.substring(0, 50)}...`);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

console.log('✅ Minimal app ready');
