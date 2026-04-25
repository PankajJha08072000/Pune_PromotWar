# 🧠 NeuralLearn — Intelligent Learning Assistant

> An adaptive AI-powered tutor that personalizes your learning journey through intelligent pacing, Socratic dialogue, and formative assessments.

## 🌟 Features

| Feature | Description |
|---|---|
| **Adaptive Teaching** | Adjusts explanation depth and complexity based on your responses |
| **Multiple Learning Styles** | Visual, Practical, Theoretical, and Socratic modes |
| **Difficulty Calibration** | 5 levels from Beginner to Expert with a live slider |
| **Progress Tracking** | Real-time mastery score, topic coverage, streaks |
| **Built-in Quizzes** | Instant knowledge checks with detailed explanations |
| **Quick Actions** | One-click prompts — Simplify, Example, Go Deeper, Summary |
| **Topic Discovery** | Automatically detects and tracks topics as you learn |
| **Conversation Memory** | Maintains context across the session for coherent tutoring |

## 🚀 Live Demo

Open `index.html` directly in any modern browser — **no build step required**.

## 🛠️ Tech Stack

- **HTML5** — Semantic, accessible structure
- **Vanilla CSS** — Custom design system with CSS variables, glassmorphism, animations
- **Vanilla JavaScript** — Zero dependencies, ES2020+
- **Gemini 1.5 Flash API** — Powers the adaptive AI tutor (bring your own key)

## 📦 Project Structure

```
.
├── index.html   # App shell, layout, modals
├── style.css    # Full design system, dark theme, animations
└── app.js       # State management, Gemini API, quiz engine, markdown parser
```

## ⚡ Getting Started

1. Clone or download this repository
2. Open `index.html` in your browser
3. On first message, enter your **Gemini API key** when prompted
   - Get a free key at [Google AI Studio](https://aistudio.google.com/apikey)
   - Key is saved in `localStorage` — never sent anywhere except Google's API
4. Start learning! 🎉

## 🎓 How It Works

```
You type a topic  →  NeuralLearn builds a personalized system prompt
                       (learning style + difficulty + conversation history)
                  →  Sends to Gemini 1.5 Flash API
                  →  Renders adaptive response with rich formatting
                  →  Updates your progress, topics, and mastery score
```

## 🧩 Prompt Engineering Highlights

The AI tutor prompt dynamically injects:
- **Learning style preference** (Visual / Practical / Theoretical / Socratic)
- **Difficulty level** (Beginner → Expert)
- **Topics already covered** for continuity
- **Teaching principles**: Socratic method, analogies, prerequisite building, scaffolding
- **Format instructions**: headers, bold terms, code blocks, follow-up questions

## 📜 License

MIT — free to use, modify, and distribute.

---

*Built for Pune PromptWar — Intelligent Learning Assistant Challenge*
