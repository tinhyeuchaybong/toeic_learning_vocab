// App state
const state = {
  selectedTopicId: 1,
  wordOfTheDayIndex: 0,
  quizActive: false,
  quizStarted: false,        // true once user clicks "Bắt đầu kiểm tra"
  currentQuestion: null,
  answered: false,
  score: { correct: 0, total: 0 },
  streak: 0,                 // consecutive correct answers
  studied: new Set(),
  topicViewed: new Map(),
};

// Load studied words from localStorage into state.studied
function initStudied() {
  try {
    const stored = localStorage.getItem('studied_words');
    if (stored) {
      JSON.parse(stored).forEach(idx => state.studied.add(idx));
    }
  } catch (e) {
    // localStorage unavailable (e.g. private browsing) — operate in-memory
  }
}

// Mark a word as viewed within its topic, then update quiz unlock state
function markTopicWordViewed(topicId, wordIndex) {
  if (!state.topicViewed.has(topicId)) {
    state.topicViewed.set(topicId, new Set());
  }
  state.topicViewed.get(topicId).add(wordIndex);
  updateQuizUnlockState(topicId);
}

// Check if all words in a topic have been viewed
function isTopicComplete(topic) {
  const viewed = state.topicViewed.get(topic.id);
  if (!viewed) return false;
  return topic.words.every(w => viewed.has(w.index));
}

// Update the quiz button and progress hint based on topic completion
function updateQuizUnlockState(topicId) {
  const topic = TOPICS.find(t => t.id === topicId);
  if (!topic || topicId !== state.selectedTopicId) return;

  const btn = document.getElementById('btn-quiz');
  const hint = document.getElementById('quiz-unlock-hint');
  if (!btn) return;

  const viewed = state.topicViewed.get(topicId);
  const viewedCount = viewed ? viewed.size : 0;
  const total = topic.words.length;
  const complete = isTopicComplete(topic);

  // Quiz luôn bấm được — chỉ hiển thị gợi ý tiến độ học để khích lệ
  btn.classList.remove('disabled');
  btn.disabled = false;
  btn.title = '';
  if (hint) {
    hint.textContent = complete
      ? '✨ Đã xem hết — sẵn sàng kiểm tra!'
      : `Đã xem ${viewedCount} / ${total} từ trong chủ đề này`;
  }
}
// Mark a word as studied by its global index
function markStudied(wordIndex) {
  if (state.studied.has(wordIndex)) return;
  state.studied.add(wordIndex);
  try {
    localStorage.setItem('studied_words', JSON.stringify([...state.studied]));
  } catch (e) {
    // ignore storage errors
  }
  renderProgressBar();
}

// Update the progress bar fill and label
function renderProgressBar() {
  const fill = document.getElementById('progress-bar-fill');
  const label = document.getElementById('progress-bar-label');
  if (!fill || !label) return;
  const count = state.studied.size;
  const total = ALL_WORDS.length;
  fill.style.width = `${(count / total) * 100}%`;
  label.textContent = `👑 ${count} / ${total} từ đã chinh phục`;
}

// Speak a word using Web Speech API
function speakWord(word) {
  if (!('speechSynthesis' in window) || !word) return;
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

// Spawn floating heart particles at a given (x, y) position
function spawnHearts(x, y, count = 3) {
  for (let i = 0; i < count; i++) {
    const heart = document.createElement('span');
    heart.className = 'heart-particle';
    heart.textContent = '❤️';
    heart.style.left = `${x + (Math.random() - 0.5) * 60}px`;
    heart.style.top  = `${y + (Math.random() - 0.5) * 20}px`;
    heart.style.animationDelay = `${i * 0.1}s`;
    document.body.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove());
  }
}

// Update streak badge display
function renderStreakBadge() {
  const badge = document.getElementById('quiz-streak-badge');
  if (!badge) return;
  if (state.streak >= 2) {
    badge.innerHTML = `<span class="streak-badge">🔥 ${state.streak} liên tiếp</span>`;
  } else {
    badge.innerHTML = '';
  }
}

// Generate a random quiz question from the current topic's words with 3 distractors
function generateQuestion() {
  const topic = TOPICS.find(t => t.id === state.selectedTopicId);
  const pool = topic ? topic.words : ALL_WORDS;
  const question = pool[Math.floor(Math.random() * pool.length)];
  const distPool = pool.length >= 4 ? pool : ALL_WORDS;
  const distractors = distPool
    .filter(w => w.index !== question.index)
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  const choices = [question, ...distractors]
    .sort(() => Math.random() - 0.5)
    .map(w => ({ meaning: w.meaning, isCorrect: w.index === question.index }));
  state.currentQuestion = { word: question, choices };
  state.answered = false;
}

// Render the navbar topic dropdown, grouped by TOEIC / Đời sống
function renderNavbar() {
  const menu = document.getElementById('dropdown-menu');
  menu.innerHTML = '';

  // Preserve group order as first seen in TOPICS
  const groups = [];
  TOPICS.forEach(t => {
    if (!groups.includes(t.group)) groups.push(t.group);
  });

  const groupIcon = { 'TOEIC': '📊', 'Đời sống': '🌸' };

  groups.forEach(group => {
    const label = document.createElement('span');
    label.className = 'dropdown__group-label';
    label.textContent = `${groupIcon[group] || ''} ${group}`.trim();
    menu.appendChild(label);

    TOPICS.filter(t => t.group === group).forEach(topic => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'topic-item' + (topic.id === state.selectedTopicId ? ' active' : '');
      item.setAttribute('role', 'menuitem');
      item.dataset.topicId = topic.id;
      item.textContent = `${topic.id}. ${topic.name}`;
      item.addEventListener('click', () => {
        selectTopic(topic.id);
        closeDropdown();
      });
      menu.appendChild(item);
    });
  });

  updateDropdownLabel();
}

// Update the dropdown toggle label to show the current topic
function updateDropdownLabel() {
  const current = document.getElementById('dropdown-current');
  const topic = TOPICS.find(t => t.id === state.selectedTopicId);
  if (current && topic) current.textContent = `${topic.id}. ${topic.name}`;
}

// Open / close the topic dropdown
function openDropdown() {
  document.getElementById('dropdown-menu').hidden = false;
  document.getElementById('dropdown-toggle').setAttribute('aria-expanded', 'true');
}

function closeDropdown() {
  document.getElementById('dropdown-menu').hidden = true;
  document.getElementById('dropdown-toggle').setAttribute('aria-expanded', 'false');
}

function toggleDropdown() {
  const isOpen = !document.getElementById('dropdown-menu').hidden;
  if (isOpen) closeDropdown();
  else openDropdown();
}

// Render the Word of the Day card for a given topic
function renderWordCard(topic, wordObj) {
  const word = wordObj || topic.words[0];
  const inner = document.getElementById('flashcard-inner');

  // Reset flip state on each new word
  if (inner) inner.classList.remove('is-flipped');

  if (!word) {
    document.getElementById('card-word').textContent = 'Chưa có từ vựng cho chủ đề này.';
    document.getElementById('card-ipa').textContent = '';
    document.getElementById('card-type').textContent = '';
    document.getElementById('card-meaning').textContent = '';
    updateQuizUnlockState(topic.id);
    return;
  }

  document.getElementById('card-word').textContent = word.word;
  document.getElementById('card-ipa').textContent = word.ipa;
  // Hiển thị từ loại đầy đủ bằng tiếng Việt trên mặt sau thẻ
  document.getElementById('card-type').textContent = TYPE_LABELS[word.type] || word.type;
  document.getElementById('card-meaning').textContent = word.meaning;

  // Mark as studied globally and viewed within topic
  if (word.index !== undefined) {
    markStudied(word.index);
    markTopicWordViewed(topic.id, word.index);
  }
}

// Update selected topic and toggle active class
function selectTopic(topicId) {
  state.selectedTopicId = topicId;

  // Exit quiz if active when switching topics
  if (state.quizActive) exitQuiz();

  document.querySelectorAll('.topic-item').forEach(item => {
    const isActive = Number(item.dataset.topicId) === topicId;
    item.classList.toggle('active', isActive);
  });

  updateDropdownLabel();

  const topic = TOPICS.find(t => t.id === topicId);
  if (topic) {
    renderWordCard(topic);
    renderVocabList(topic);
    updateQuizUnlockState(topicId);
  }
}

// Render the vocabulary list for a given topic
function renderVocabList(topic) {
  const title = document.getElementById('vocab-section-title');
  const list = document.getElementById('vocab-list');

  // Show topic name and word count in heading (Requirement 6.5)
  title.textContent = `${topic.id}. ${topic.name} — ${topic.words.length} từ`;
  list.innerHTML = '';

  if (!topic.words.length) {
    list.innerHTML = '<p class="empty-state">Chưa có từ vựng cho chủ đề này.</p>';
    return;
  }

  topic.words.forEach(w => {
    const row = document.createElement('div');
    row.className = 'vocab-row';
    row.innerHTML = `
      <span class="vocab-row__index">${w.index}</span>
      <span class="vocab-row__word">${w.word}</span>
      <span class="vocab-row__ipa">${w.ipa}</span>
      <span class="vocab-row__type" title="${TYPE_LABELS[w.type] || w.type}">${w.type}</span>
      <span class="vocab-row__meaning">${w.meaning}</span>
      <button class="vocab-row__speak" type="button" aria-label="Phát âm ${w.word}" title="Phát âm">🔊</button>
    `;
    // Speak button — stop row click from firing
    row.querySelector('.vocab-row__speak').addEventListener('click', (e) => {
      e.stopPropagation();
      speakWord(w.word);
    });
    // Click handler: update Word Card with this word (Requirement 6.3)
    row.addEventListener('click', () => {
      renderWordCard(topic, w);
      markTopicWordViewed(topic.id, w.index);
      const flashcard = document.getElementById('word-card');
      if (flashcard) {
        flashcard.classList.remove('animate-fade-slide-up');
        void flashcard.offsetWidth;
        flashcard.classList.add('animate-fade-slide-up');
      }
    });
    list.appendChild(row);
  });

  // Apply fadeSlideUp animation to the vocab list on render (Requirement 8.2)
  list.classList.remove('animate-fade-slide-up');
  void list.offsetWidth;
  list.classList.add('animate-fade-slide-up');
}

// Show the quiz entry screen (before questions start)
function renderQuizEntry() {
  const topic = TOPICS.find(t => t.id === state.selectedTopicId);
  document.getElementById('quiz-entry-subtitle').textContent =
    `${topic ? topic.name : ''} — ${topic ? topic.words.length : 0} từ`;
  document.getElementById('quiz-entry').hidden = false;
  document.getElementById('quiz-question').hidden = true;
  document.getElementById('quiz-view').hidden = false;
  document.getElementById('study-view').hidden = true;

  const quizCard = document.querySelector('.quiz-card');
  if (quizCard) {
    quizCard.classList.remove('animate-scale-in');
    void quizCard.offsetWidth;
    quizCard.classList.add('animate-scale-in');
  }
}

// Render the full quiz question view
function renderQuiz() {
  const { word, choices } = state.currentQuestion;

  document.getElementById('quiz-word').textContent = word.word;
  document.getElementById('quiz-ipa').textContent = word.ipa;

  const topic = TOPICS.find(t => t.words.some(w => w.index === word.index));
  document.getElementById('quiz-topic-label').textContent = topic ? topic.name : '';
  document.getElementById('quiz-score').textContent =
    `✅ ${state.score.correct} / ${state.score.total}`;
  renderStreakBadge();

  const choicesEl = document.getElementById('quiz-choices');
  choicesEl.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'quiz-answer-btn';
    btn.type = 'button';
    btn.textContent = choice.meaning;
    btn.dataset.correct = choice.isCorrect ? 'true' : 'false';
    btn.addEventListener('click', handleAnswerClick);
    choicesEl.appendChild(btn);
  });

  document.getElementById('btn-next-question').hidden = true;
  document.getElementById('quiz-entry').hidden = true;
  document.getElementById('quiz-question').hidden = false;
  document.getElementById('quiz-view').hidden = false;
  document.getElementById('study-view').hidden = true;

  const quizCard = document.querySelector('.quiz-card');
  if (quizCard) {
    quizCard.classList.remove('animate-scale-in');
    void quizCard.offsetWidth;
    quizCard.classList.add('animate-scale-in');
  }
}

// Handle answer button click
function handleAnswerClick(e) {
  if (state.answered) return;
  state.answered = true;
  state.score.total += 1;

  const clicked = e.currentTarget;
  const isCorrect = clicked.dataset.correct === 'true';
  const allBtns = document.querySelectorAll('.quiz-answer-btn');

  allBtns.forEach(btn => { btn.disabled = true; });

  if (isCorrect) {
    clicked.classList.add('answer--correct');
    state.score.correct += 1;
    state.streak += 1;

    // Spawn hearts at click position
    const rect = clicked.getBoundingClientRect();
    const heartCount = state.streak >= 3 ? 6 : 3;
    spawnHearts(rect.left + rect.width / 2, rect.top, heartCount);
  } else {
    clicked.classList.add('answer--incorrect');
    state.streak = 0;
    allBtns.forEach(btn => {
      if (btn.dataset.correct === 'true') btn.classList.add('answer--correct');
    });
  }

  document.getElementById('quiz-score').textContent =
    `✅ ${state.score.correct} / ${state.score.total}`;
  renderStreakBadge();
  document.getElementById('btn-next-question').hidden = false;
}

// Exit quiz and return to word card + vocab list
function exitQuiz() {
  state.quizActive = false;
  state.quizStarted = false;
  state.score = { correct: 0, total: 0 };
  state.streak = 0;
  document.getElementById('quiz-view').hidden = true;
  document.getElementById('quiz-entry').hidden = false;
  document.getElementById('quiz-question').hidden = true;
  document.getElementById('study-view').hidden = false;
}

// Quiz button click handler — show entry screen first
document.getElementById('btn-quiz').addEventListener('click', (e) => {
  e.stopPropagation();
  const topic = TOPICS.find(t => t.id === state.selectedTopicId);
  if (!topic || topic.words.length === 0) return;
  state.quizActive = true;
  state.quizStarted = false;
  state.score = { correct: 0, total: 0 };
  state.streak = 0;
  renderQuizEntry();
});

// "Bắt đầu kiểm tra" button inside entry screen
document.getElementById('btn-start-quiz').addEventListener('click', () => {
  state.quizStarted = true;
  generateQuestion();
  renderQuiz();
});

// Next question button
document.getElementById('btn-next-question').addEventListener('click', () => {
  generateQuestion();
  renderQuiz();
});

// Back button inside quiz view
document.getElementById('btn-back-quiz').addEventListener('click', exitQuiz);

// 3D Flashcard flip — clicking the card toggles .is-flipped on the inner wrapper
document.getElementById('word-card').addEventListener('click', () => {
  const inner = document.getElementById('flashcard-inner');
  if (inner) inner.classList.toggle('is-flipped');
});

// Speaker button on flashcard
const btnSpeak = document.getElementById('btn-speak');
if (btnSpeak) {
  if (!('speechSynthesis' in window)) {
    btnSpeak.hidden = true;
  } else {
    btnSpeak.addEventListener('click', (e) => {
      e.stopPropagation();
      speakWord(document.getElementById('card-word').textContent);
    });
  }
}

// Topic dropdown toggle
const dropdownToggle = document.getElementById('dropdown-toggle');
if (dropdownToggle) {
  dropdownToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });
}

// Close dropdown on outside click or Escape
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('topic-dropdown');
  if (dropdown && !dropdown.contains(e.target)) closeDropdown();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDropdown();
});

// Init
initStudied();
renderNavbar();
const defaultTopic = TOPICS.find(t => t.id === state.selectedTopicId);
renderWordCard(defaultTopic);
renderVocabList(defaultTopic);
renderProgressBar();
updateQuizUnlockState(state.selectedTopicId);
