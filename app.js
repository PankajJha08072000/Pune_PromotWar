'use strict';

// ── State ──────────────────────────────────────────────────────────────────
const state = {
  messages: [],
  topics: {},
  quizzesTaken: 0,
  streak: 0,
  learningStyle: 'visual',
  difficulty: 2,
  sessionStart: new Date(),
  thinking: false,
  apiKey: null,
};

const DIFFICULTY_LABELS = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert'];

// ── DOM refs ───────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const sidebar       = $('sidebar');
const menuBtn       = $('menuBtn');
const sidebarToggle = $('sidebarToggle');
const welcomeHero   = $('welcomeHero');
const chatArea      = $('chatArea');
const userInput     = $('userInput');
const sendBtn       = $('sendBtn');
const typingIndicator = $('typingIndicator');
const quizOverlay   = $('quizOverlay');
const quizBody      = $('quizBody');
const toastContainer = $('toastContainer');
const masteryBar    = $('masteryBar');
const masteryValue  = $('masteryValue');
const statTopics    = $('statTopics');
const statQuizzes   = $('statQuizzes');
const statStreak    = $('statStreak');
const topicsList    = $('topicsList');
const difficultySlider = $('difficultySlider');
const difficultyBadge  = $('difficultyBadge');
const inputCounter  = $('inputCounter');
const sessionInfo   = $('sessionInfo');

// ── Init ───────────────────────────────────────────────────────────────────
function init() {
  updateSessionInfo();
  bindEvents();
  autoResizeInput();
}

function bindEvents() {
  menuBtn.addEventListener('click', toggleSidebar);
  sidebarToggle.addEventListener('click', toggleSidebar);

  sendBtn.addEventListener('click', handleSend);
  userInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  userInput.addEventListener('input', onInputChange);

  // Suggestion cards
  document.querySelectorAll('.suggestion-card').forEach(btn => {
    btn.addEventListener('click', () => {
      userInput.value = `Teach me about ${btn.dataset.topic}`;
      onInputChange();
      handleSend();
    });
  });

  // Style picker
  document.querySelectorAll('.style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.style-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.learningStyle = btn.dataset.style;
      showToast(`Learning style: ${btn.textContent.trim()}`, 'info');
    });
  });

  // Difficulty
  difficultySlider.addEventListener('input', () => {
    state.difficulty = +difficultySlider.value;
    difficultyBadge.textContent = DIFFICULTY_LABELS[state.difficulty];
  });

  // Quick actions
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const map = {
        explain: 'Please explain that more simply.',
        example: 'Can you give me a concrete example?',
        test: 'Quiz me on what I just learned.',
        deeper: 'Go deeper on this topic.',
        summary: 'Give me a quick summary of everything covered so far.',
      };
      const msg = map[btn.dataset.action];
      if (msg) { userInput.value = msg; onInputChange(); handleSend(); }
    });
  });

  $('quizBtn').addEventListener('click', openQuiz);
  $('quizClose').addEventListener('click', () => { quizOverlay.style.display = 'none'; });
  $('clearBtn').addEventListener('click', clearChat);
  $('newSessionBtn').addEventListener('click', clearChat);
  $('summaryBtn').addEventListener('click', () => {
    userInput.value = 'Give me a comprehensive summary of everything we have covered in this session.';
    onInputChange(); handleSend();
  });
}

function toggleSidebar() {
  sidebar.classList.toggle('open');
  sidebar.classList.toggle('collapsed');
}

// ── Input handling ─────────────────────────────────────────────────────────
function onInputChange() {
  const len = userInput.value.length;
  inputCounter.textContent = `${len} / 2000`;
  sendBtn.disabled = len === 0 || state.thinking;
  autoResizeInput();
}

function autoResizeInput() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
}

// ── Send message ───────────────────────────────────────────────────────────
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || state.thinking) return;

  addMessage('user', text);
  userInput.value = '';
  onInputChange();
  showHero(false);

  state.thinking = true;
  sendBtn.disabled = true;
  showTyping(true);

  try {
    const reply = await callGemini(text);
    showTyping(false);
    addMessage('ai', reply);
    extractTopics(text, reply);
    updateProgress();
  } catch (err) {
    showTyping(false);
    addMessage('ai', `⚠️ I encountered an issue: **${err.message}**\n\nPlease check your API key or try again.`);
  } finally {
    state.thinking = false;
    sendBtn.disabled = false;
  }
}

// ── Gemini API ─────────────────────────────────────────────────────────────
async function callGemini(userText) {
  // Use stored key or prompt user
  let key = state.apiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('nl_api_key') : null);
  if (!key) {
    key = typeof window !== 'undefined' ? window.prompt('Enter your Gemini API key to start learning:\n(It will be saved locally in your browser)') : 'test-key';
    if (!key) throw new Error('No API key provided.');
    if (typeof localStorage !== 'undefined') localStorage.setItem('nl_api_key', key);
    state.apiKey = key;
  } else {
    state.apiKey = key;
  }

  try {
    // Dynamically import the SDK to maintain vanilla JS structure
    const { GoogleGenerativeAI } = await import('https://esm.run/@google/generative-ai');
    const genAI = new GoogleGenerativeAI(key);
    
    const systemPrompt = buildSystemPrompt();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemPrompt 
    });

    const history = state.messages.slice(-10).map(m => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({
      history: history,
      generationConfig: {
        temperature: 0.8,
        topP: 0.95,
        maxOutputTokens: 1800,
      },
    });

    const result = await chat.sendMessage(userText);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini SDK Error:', error);
    throw new Error(error.message || 'API error');
  }
}

function buildSystemPrompt() {
  const styleGuides = {
    visual: 'Use diagrams described in text, visual metaphors, and spatial analogies. Format with clear headers and bullet points.',
    practical: 'Focus on hands-on examples, code snippets, and real-world use cases. Always show practical applications.',
    theoretical: 'Provide rigorous definitions, mathematical notation where relevant, and deep conceptual explanations.',
    socratic: 'Use the Socratic method — ask probing questions, guide discovery rather than giving direct answers.',
  };

  return `You are NeuralLearn, an expert adaptive AI tutor. Your goal is to help the learner master concepts effectively.

CURRENT LEARNER PROFILE:
- Learning style: ${state.learningStyle} — ${styleGuides[state.learningStyle]}
- Difficulty level: ${DIFFICULTY_LABELS[state.difficulty]} (${state.difficulty}/5)
- Topics covered: ${Object.keys(state.topics).join(', ') || 'none yet'}
- Messages exchanged: ${state.messages.length}

TEACHING PRINCIPLES:
1. Break complex ideas into digestible steps
2. Always explain the "WHY" not just the "WHAT"
3. Connect new concepts to previously discussed material
4. Use analogies relevant to the learner's background
5. After explaining, offer to quiz or go deeper
6. Celebrate progress; be encouraging but honest
7. If user seems confused, simplify immediately
8. Proactively suggest next steps or related topics

FORMAT:
- Use **bold** for key terms
- Use headers (###) for major sections
- Keep paragraphs short and scannable
- End responses with a follow-up question or suggestion when appropriate
- For code, use fenced code blocks with language identifier

Adapt to the learner's demonstrated understanding throughout the conversation.`;
}

// ── Message rendering ──────────────────────────────────────────────────────
function addMessage(role, content) {
  const msg = { role, content, time: new Date() };
  state.messages.push(msg);
  renderMessage(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function renderMessage(msg) {
  const div = document.createElement('div');
  div.className = `message ${msg.role}`;

  const isAi = msg.role === 'ai';
  const timeStr = msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  div.innerHTML = `
    <div class="msg-avatar ${isAi ? 'ai' : 'user-av'}">${isAi ? '🧠' : '👤'}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-sender">${isAi ? 'NeuralLearn' : 'You'}</span>
        <span class="msg-time">${timeStr}</span>
      </div>
      <div class="msg-bubble">${parseMarkdown(msg.content)}</div>
      ${isAi ? `<div class="msg-actions">
        <button class="msg-action-btn" onclick="copyText(this)" title="Copy">📋 Copy</button>
        <button class="msg-action-btn" onclick="thumbsUp(this)" title="Helpful">👍 Helpful</button>
        <button class="msg-action-btn" onclick="thumbsDown(this)" title="Not helpful">👎 Simpler</button>
      </div>` : ''}
    </div>`;

  chatArea.appendChild(div);
}

// Simple markdown → HTML parser
/**
 * Parses markdown text and returns sanitized HTML.
 * @param {string} text - The raw markdown text
 * @returns {string} Sanitized HTML string
 */
function parseMarkdown(text) {
  const rawHtml = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang || 'text'}">${code.trim()}</code></pre>`)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h3>$1</h3>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/(<li>[\s\S]+?<\/li>)/g, '<ul>$1</ul>')
    .replace(/<\/ul>\s*<ul>/g, '')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hupbl])(.+)$/gm, m => m ? `<p>${m}</p>` : '')
    .replace(/<p><\/p>/g, '');
    
  return typeof window !== 'undefined' && window.DOMPurify 
    ? window.DOMPurify.sanitize(rawHtml) 
    : rawHtml;
}

// ── UI helpers ─────────────────────────────────────────────────────────────
function showHero(show) {
  welcomeHero.style.display = show ? 'flex' : 'none';
  chatArea.classList.toggle('visible', !show);
}

function showTyping(show) {
  typingIndicator.style.display = show ? 'flex' : 'none';
  if (show) chatArea.scrollTop = chatArea.scrollHeight;
}

function updateSessionInfo() {
  const now = new Date();
  sessionInfo.textContent = `Started ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

function showToast(msg, type = 'info') {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastContainer.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function clearChat() {
  state.messages = [];
  state.topics = {};
  chatArea.innerHTML = '';
  showHero(true);
  updateSidebarStats();
  showToast('New session started!', 'success');
}

// ── Progress & topics ──────────────────────────────────────────────────────
/**
 * Extracts topics from user and AI conversation to track progress.
 * @param {string} userMsg - User's message
 * @param {string} aiReply - AI's response
 */
function extractTopics(userMsg, aiReply) {
  const combined = userMsg + ' ' + aiReply;
  const keywords = [
    'machine learning','neural network','blockchain','quantum','linear algebra',
    'python','javascript','react','algorithm','data structure','recursion',
    'calculus','statistics','physics','chemistry','history','economics',
    'psychology','philosophy','biology','genetics','astronomy',
    'deep learning','natural language','computer vision','cryptography',
  ];
  keywords.forEach(kw => {
    if (combined.toLowerCase().includes(kw)) {
      if (!state.topics[kw]) state.topics[kw] = 1;
      else state.topics[kw]++;
    }
  });
  if (typeof window !== 'undefined') renderTopics();
}

function renderTopics() {
  const entries = Object.entries(state.topics).slice(0, 8);
  if (!entries.length) {
    topicsList.innerHTML = '<div class="topics-empty">No topics yet. Start learning!</div>';
    return;
  }
  topicsList.innerHTML = entries.map(([name, count]) => {
    const level = count >= 5 ? 'advanced' : count >= 2 ? 'intermediate' : 'beginner';
    const label = count >= 5 ? 'Advanced' : count >= 2 ? 'Intermediate' : 'Beginner';
    return `<div class="topic-pill">
      <span class="topic-name">${name}</span>
      <span class="topic-level ${level}">${label}</span>
    </div>`;
  }).join('');
}

function updateProgress() {
  const topicCount = Object.keys(state.topics).length;
  const msgCount = state.messages.filter(m => m.role === 'ai').length;
  const mastery = Math.min(100, Math.round((topicCount * 8 + msgCount * 2)));

  masteryBar.style.width = mastery + '%';
  masteryValue.textContent = mastery + '%';
  statTopics.textContent = topicCount;
  statQuizzes.textContent = state.quizzesTaken;
  statStreak.textContent = Math.floor(msgCount / 3);
}

function updateSidebarStats() {
  masteryBar.style.width = '0%';
  masteryValue.textContent = '0%';
  statTopics.textContent = '0';
  statQuizzes.textContent = '0';
  statStreak.textContent = '0';
  topicsList.innerHTML = '<div class="topics-empty">No topics yet. Start learning!</div>';
}

// ── Quiz ───────────────────────────────────────────────────────────────────
const quizBank = [
  {
    q: 'What is the purpose of a learning rate in machine learning?',
    opts: ['Controls how many neurons fire','Controls the step size during optimization','Sets the number of training epochs','Determines the model architecture'],
    ans: 1, exp: 'The learning rate controls how much the model weights change in response to the estimated error each time the model weights are updated.',
  },
  {
    q: 'Which data structure operates on LIFO (Last In, First Out) principle?',
    opts: ['Queue','Linked List','Stack','Binary Tree'],
    ans: 2, exp: 'A Stack follows LIFO — the last element added is the first one removed, like a stack of plates.',
  },
  {
    q: 'In quantum computing, what is "superposition"?',
    opts: ['A qubit being both 0 and 1 simultaneously','A quantum error correction method','Two qubits being entangled','A type of quantum gate'],
    ans: 0, exp: 'Superposition allows a qubit to exist as a combination of 0 and 1 simultaneously, unlike classical bits.',
  },
  {
    q: 'What does the "chain rule" in calculus help us compute?',
    opts: ['Integrals of complex functions','Derivatives of composite functions','Limits of sequences','Matrix multiplication'],
    ans: 1, exp: 'The chain rule helps compute derivatives of composite functions: if y = f(g(x)), then dy/dx = f\'(g(x)) · g\'(x).',
  },
  {
    q: 'What is a blockchain\'s primary innovation?',
    opts: ['Faster transaction processing','Decentralized, tamper-evident record keeping','Unlimited storage capacity','End-to-end encryption'],
    ans: 1, exp: 'Blockchain\'s core innovation is a decentralized ledger where records are cryptographically linked, making tampering extremely difficult.',
  },
  {
    q: 'In neural networks, what does "backpropagation" do?',
    opts: ['Forward passes data through layers','Calculates and propagates gradients backward to update weights','Initializes network weights','Normalizes input data'],
    ans: 1, exp: 'Backpropagation calculates gradients of the loss function with respect to weights, propagating errors backward through layers to enable learning.',
  },
];

let quizIdx = 0;
let quizScore = 0;
let quizAnswered = false;

function openQuiz() {
  quizIdx = 0;
  quizScore = 0;
  quizAnswered = false;
  quizOverlay.style.display = 'flex';
  renderQuizQuestion();
}

function renderQuizQuestion() {
  if (quizIdx >= quizBank.length) {
    showQuizScore();
    return;
  }
  const q = quizBank[quizIdx];
  quizAnswered = false;
  quizBody.innerHTML = `
    <div class="quiz-q">
      <div class="quiz-question">Q${quizIdx + 1}/${quizBank.length}: ${q.q}</div>
      <div class="quiz-options">
        ${q.opts.map((opt, i) => `<button class="quiz-option" id="qopt${i}" onclick="answerQuiz(${i})">${opt}</button>`).join('')}
      </div>
      <div id="quizFeedback"></div>
    </div>`;
}

function answerQuiz(idx) {
  if (quizAnswered) return;
  quizAnswered = true;
  const q = quizBank[quizIdx];
  const correct = idx === q.ans;
  if (correct) quizScore++;

  document.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.ans) btn.classList.add('correct');
    else if (i === idx && !correct) btn.classList.add('wrong');
  });

  const fb = $('quizFeedback');
  fb.innerHTML = `<div class="quiz-feedback ${correct ? 'correct' : 'wrong'}">
    ${correct ? '✅ Correct! ' : '❌ Not quite. '}${q.exp}
  </div>
  <button class="quiz-next-btn" onclick="nextQuiz()">${quizIdx < quizBank.length - 1 ? 'Next Question →' : 'See Results'}</button>`;
}

function nextQuiz() {
  quizIdx++;
  renderQuizQuestion();
}

function showQuizScore() {
  state.quizzesTaken++;
  const pct = Math.round((quizScore / quizBank.length) * 100);
  const msg = pct >= 80 ? '🎉 Excellent mastery!' : pct >= 60 ? '👍 Good progress!' : '📚 Keep studying!';
  quizBody.innerHTML = `
    <div class="quiz-score">
      <div class="quiz-score-num">${pct}%</div>
      <div class="quiz-score-label">${quizScore} / ${quizBank.length} correct</div>
      <div class="quiz-score-msg">${msg}</div>
      <button class="quiz-next-btn" style="margin-top:20px" onclick="openQuiz()">Try Again</button>
      <button class="quiz-next-btn" style="margin-top:8px;background:var(--bg3);border:1px solid var(--border);color:var(--text2)" onclick="document.getElementById('quizOverlay').style.display='none'">Close</button>
    </div>`;
  updateProgress();
  showToast(`Quiz complete: ${pct}%`, pct >= 70 ? 'success' : 'warning');
}

// ── Msg action callbacks ───────────────────────────────────────────────────
function copyText(btn) {
  const bubble = btn.closest('.msg-body').querySelector('.msg-bubble');
  navigator.clipboard.writeText(bubble.textContent || bubble.innerText).then(() => showToast('Copied!', 'success'));
}

function thumbsUp(btn) {
  btn.textContent = '✅ Thanks!';
  btn.disabled = true;
  showToast('Glad that helped!', 'success');
}

function thumbsDown(btn) {
  btn.textContent = '🔄 Simplifying…';
  btn.disabled = true;
  userInput.value = 'Please explain that in a much simpler way, as if I have no background in this topic.';
  onInputChange();
  handleSend();
}

// ── Boot ───────────────────────────────────────────────────────────────────
if (typeof window !== 'undefined') {
  window.answerQuiz = answerQuiz;
  window.nextQuiz = nextQuiz;
  window.openQuiz = openQuiz;
  window.copyText = copyText;
  window.thumbsUp = thumbsUp;
  window.thumbsDown = thumbsDown;
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

// ── Exports for Testing ────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMarkdown, extractTopics, state, buildSystemPrompt };
}
