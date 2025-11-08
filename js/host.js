// js/host.js
import { db } from './firebase.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const topicInput = document.getElementById('topicInput');
const difficultySelect = document.getElementById('difficultySelect');
const numQuestionsSelect = document.getElementById('numQ');
const createBtn = document.getElementById('createBtn');
const statusMsg = document.getElementById('status');

const user = JSON.parse(localStorage.getItem('qv_user') || '{}');

// Map some common topic keywords -> OpenTDB category IDs (optional)
const categoryMap = {
  general: 9,
  books: 10,
  film: 11,
  music: 12,
  musicals: 13,
  television: 14,
  videogames: 15,
  boardgames: 16,
  science: 17,
  computers: 18,
  math: 19,
  mythology: 20,
  sports: 21,
  geography: 22,
  history: 23,
  politics: 24,
  art: 25,
  celebrities: 26,
  animals: 27,
  vehicles: 28
};

function decodeHTML(html){
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}
function shuffle(arr){ return arr.sort(()=> Math.random() - 0.5); }

async function fetchQuestions(topic, difficulty, amount){
  // try to pick a category from topic string
  const key = Object.keys(categoryMap).find(k => topic.toLowerCase().includes(k));
  const categoryParam = key ? `&category=${categoryMap[key]}` : '';
  const url = `https://opentdb.com/api.php?amount=${amount}&type=multiple&difficulty=${encodeURIComponent(difficulty)}${categoryParam}`;

  const res = await fetch(url);
  const data = await res.json();
  if(!data.results || !data.results.length) throw new Error('No questions returned');
  return data.results.map(q => {
    const correct = decodeHTML(q.correct_answer);
    const options = shuffle([ ...q.incorrect_answers.map(decodeHTML), correct ]);
    return { question: decodeHTML(q.question), correct, options };
  });
}

createBtn.addEventListener('click', async () => {
  const topic = topicInput.value.trim() || 'General';
  const difficulty = difficultySelect.value || 'medium';
  const numQ = parseInt(numQuestionsSelect.value || '10', 10) || 10;

  if(!user || !user.uid){
    statusMsg.textContent = 'You must be signed in to create a room.';
    return;
  }

  statusMsg.textContent = 'Creating room and fetching questions...';
  createBtn.disabled = true;

  try {
    const questions = await fetchQuestions(topic, difficulty, numQ);

    // create a stable ID
    const roomId = 'room-' + Date.now();

    const roomDocRef = doc(db, 'rooms', roomId);
    await setDoc(roomDocRef, {
      hostUid: user.uid,
      hostName: user.name || '',
      topic,
      difficulty,
      numQuestions: numQ,
      players: [{ uid: user.uid, name: user.name || 'Host', avatar: user.photo || '🙂', score: 0 }],
      questions,
      currentIndex: -1,
      questionStart: null,
      finished: false,
      lastReaction: null,
      createdAt: Date.now()
    });

    localStorage.setItem('roomId', roomId);
    statusMsg.textContent = `Room created — ${roomId} — redirecting...`;
    setTimeout(()=> location.href = 'lobby.html', 700);

  } catch(err){
    console.error('Create room error', err);
    statusMsg.textContent = 'Error creating room: ' + (err.message || err);
    createBtn.disabled = false;
  }
});
