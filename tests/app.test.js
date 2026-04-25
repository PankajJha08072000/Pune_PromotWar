const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

describe('NeuralLearn Core Logic Tests', () => {
  let parseMarkdown, extractTopics, state, buildSystemPrompt;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = html;
    
    // Reset modules to reload app.js and re-bind constants
    jest.resetModules();
    
    // Mock prompt
    window.prompt = jest.fn().mockReturnValue('test-key');
    
    const app = require('../app.js');
    parseMarkdown = app.parseMarkdown;
    extractTopics = app.extractTopics;
    state = app.state;
    buildSystemPrompt = app.buildSystemPrompt;
    
    // Trigger init
    document.dispatchEvent(new Event('DOMContentLoaded'));
  });

  describe('parseMarkdown', () => {
    it('should format bold text correctly', () => {
      expect(parseMarkdown('**hello**')).toContain('<strong>hello</strong>');
    });
    it('should format code blocks correctly', () => {
      expect(parseMarkdown('```js\nvar a=1;\n```')).toContain('<pre><code class="lang-js">var a=1;</code></pre>');
    });
  });

  describe('extractTopics', () => {
    it('should increment topic counters when keywords match', () => {
      extractTopics('tell me about machine learning', 'machine learning is cool');
      expect(state.topics['machine learning']).toBe(1);
      
      extractTopics('another machine learning thing', 'yes');
      expect(state.topics['machine learning']).toBe(2);
    });

    it('should be case insensitive', () => {
      extractTopics('Machine Learning', 'MACHINE LEARNING');
      expect(state.topics['machine learning']).toBe(1);
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include current learning style and difficulty', () => {
      state.learningStyle = 'socratic';
      state.difficulty = 5;
      const prompt = buildSystemPrompt();
      expect(prompt).toContain('Socratic method');
      expect(prompt).toContain('Expert');
    });
  });

  describe('UI Interactions', () => {
    it('should toggle sidebar', () => {
      const menuBtn = document.getElementById('menuBtn');
      const sidebar = document.getElementById('sidebar');
      menuBtn.click();
      expect(sidebar.classList.contains('open')).toBe(true);
      expect(sidebar.classList.contains('collapsed')).toBe(true);
    });

    it('should handle difficulty slider change', () => {
      const slider = document.getElementById('difficultySlider');
      slider.value = 4;
      slider.dispatchEvent(new Event('input'));
      expect(state.difficulty).toBe(4);
      expect(document.getElementById('difficultyBadge').textContent).toBe('Advanced');
    });

    it('should handle style picker clicks', () => {
      const practicalBtn = document.getElementById('stylePractical');
      practicalBtn.click();
      expect(state.learningStyle).toBe('practical');
      expect(practicalBtn.classList.contains('active')).toBe(true);
    });

    it('should clear chat on new session click', () => {
      state.messages = [{role: 'user', content: 'test'}];
      document.getElementById('newSessionBtn').click();
      expect(state.messages.length).toBe(0);
    });
    
    it('should open quiz and answer questions', () => {
      const quizBtn = document.getElementById('quizBtn');
      quizBtn.click();
      expect(document.getElementById('quizOverlay').style.display).toBe('flex');
      
      // Answer first question
      const opt = document.getElementById('qopt1');
      opt.click();
      
      expect(document.getElementById('quizFeedback').innerHTML).toContain('✅ Correct!');
      
      const nextBtn = document.querySelector('.quiz-next-btn');
      nextBtn.click();
      expect(document.querySelector('.quiz-question').textContent).toContain('Q2');
    });
    
    it('should copy text, thumbs up, and thumbs down', () => {
      // simulate message actions
      document.getElementById('userInput').value = 'hello';
      document.getElementById('sendBtn').disabled = false;
      
      // Need a mock bubble
      const bubble = document.createElement('div');
      bubble.className = 'msg-body';
      bubble.innerHTML = '<div class="msg-bubble">Test content</div>';
      
      const btn = document.createElement('button');
      btn.className = 'msg-action-btn';
      bubble.appendChild(btn);
      document.body.appendChild(bubble);
      
      Object.assign(navigator, {
        clipboard: {
          writeText: jest.fn().mockImplementation(() => Promise.resolve()),
        },
      });
      
      window.copyText(btn);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test content');
      
      window.thumbsUp(btn);
      expect(btn.textContent).toBe('✅ Thanks!');
      
      window.thumbsDown(btn);
      expect(btn.textContent).toBe('🔄 Simplifying…');
    });
  });
});
