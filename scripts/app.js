// App state
const state = {
  selectedTopicId: 1,
  wordOfTheDayIndex: 0,
  quizActive: false,
};

// Render sidebar with topic list and active state
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');

  const titleEl = document.createElement('div');
  titleEl.className = 'sidebar-title';
  titleEl.textContent = 'Học tiếng Anh cho em bé 22 tuổi';

  const list = document.createElement('ul');
  list.className = 'topic-list';
  list.id = 'topic-list';

  TOPICS.forEach(topic => {
    const li = document.createElement('li');
    li.className = 'topic-item' + (topic.id === state.selectedTopicId ? ' active' : '');
    li.dataset.topicId = topic.id;
    li.textContent = `${topic.id}. ${topic.name}`;
    li.addEventListener('click', () => selectTopic(topic.id));
    list.appendChild(li);
  });

  sidebar.appendChild(titleEl);
  sidebar.appendChild(list);
}

// Render the Word of the Day card for a given topic
function renderWordCard(topic) {
  const word = topic.words[0];
  const card = document.getElementById('word-card');
  const btn = document.getElementById('btn-quiz');

  if (!word) {
    document.getElementById('card-word').textContent = 'Chưa có từ vựng cho chủ đề này.';
    document.getElementById('card-ipa').textContent = '';
    document.getElementById('card-type').textContent = '';
    document.getElementById('card-meaning').textContent = '';
    btn.classList.add('disabled');
    btn.disabled = true;
    btn.title = 'Không có từ để kiểm tra.';
    return;
  }

  document.getElementById('card-word').textContent = word.word;
  document.getElementById('card-ipa').textContent = word.ipa;
  document.getElementById('card-type').textContent = word.type;
  document.getElementById('card-meaning').textContent = word.meaning;
  btn.classList.remove('disabled');
  btn.disabled = false;
  btn.title = '';
}

// Close sidebar when a topic is selected on mobile
function closeMobileSidebar() {
  const sidebar = document.getElementById('sidebar');
  const btn = document.getElementById('hamburger-btn');
  if (sidebar && window.innerWidth <= 768) {
    sidebar.classList.remove('sidebar--open');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }
}

// Update selected topic and toggle active class
function selectTopic(topicId) {
  state.selectedTopicId = topicId;

  // Exit quiz if active when switching topics
  if (state.quizActive) exitQuiz();

  // Close mobile sidebar after selection
  closeMobileSidebar();

  document.querySelectorAll('.topic-item').forEach(item => {
    const isActive = Number(item.dataset.topicId) === topicId;
    item.classList.toggle('active', isActive);
  });

  const topic = TOPICS.find(t => t.id === topicId);
  if (topic) {
    renderWordCard(topic);
    renderVocabList(topic);
  }
}

// Render the vocabulary list for a given topic
function renderVocabList(topic) {
  const section = document.getElementById('vocab-section');
  const title = document.getElementById('vocab-section-title');
  const list = document.getElementById('vocab-list');

  title.textContent = `${topic.id}. ${topic.name}`;
  list.innerHTML = '';

  if (!topic.words.length) {
    list.innerHTML = '<p class="empty-state">Chưa có từ vựng cho chủ đề này.</p>';
    return;
  }

  topic.words.forEach(w => {
    const row = document.createElement('div');
    row.className = 'vocab-row';
    row.innerHTML = `
      <span class="vocab-row__word">${w.word}</span>
      <span class="vocab-row__ipa">${w.ipa}</span>
      <span class="vocab-row__type">${w.type}</span>
      <span class="vocab-row__meaning">${w.meaning}</span>
    `;
    list.appendChild(row);
  });
}

// Render the quiz placeholder view for the selected topic
function renderQuizView(topic) {
  const quizView = document.getElementById('quiz-view');
  const wordCard = document.getElementById('word-card');

  document.getElementById('quiz-view-title').textContent = `Quiz: ${topic.name}`;
  document.getElementById('quiz-view-subtitle').textContent =
    `Chủ đề này có ${topic.words.length} từ vựng. Tính năng quiz đang được phát triển.`;

  wordCard.hidden = true;
  quizView.hidden = false;
  document.getElementById('vocab-section').hidden = true;
}

// Exit quiz and return to word card
function exitQuiz() {
  state.quizActive = false;
  document.getElementById('quiz-view').hidden = true;
  document.getElementById('word-card').hidden = false;
  document.getElementById('vocab-section').hidden = false;
}

// Quiz button click handler
document.getElementById('btn-quiz').addEventListener('click', () => {
  const topic = TOPICS.find(t => t.id === state.selectedTopicId);
  if (!topic || topic.words.length === 0) return;
  state.quizActive = true;
  renderQuizView(topic);
});

// Back button inside quiz view
document.getElementById('btn-back-quiz').addEventListener('click', exitQuiz);

// Hamburger toggle for mobile sidebar
const hamburgerBtn = document.getElementById('hamburger-btn');
if (hamburgerBtn) {
  hamburgerBtn.addEventListener('click', () => {
    const sidebar = document.getElementById('sidebar');
    const isOpen = sidebar.classList.toggle('sidebar--open');
    hamburgerBtn.setAttribute('aria-expanded', String(isOpen));
  });
}

// Init
renderSidebar();
const defaultTopic = TOPICS.find(t => t.id === state.selectedTopicId);
renderWordCard(defaultTopic);
renderVocabList(defaultTopic);
