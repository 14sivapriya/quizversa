// dashboard.js — create room

import { db } from './firebase.js';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const topicInput = document.getElementById('topicInput');
const difficultySelect = document.getElementById('difficultySelect');
const numQ = document.getElementById('numQ');
const createBtn = document.getElementById('createBtn');
const status = document.getElementById('status');

const user = JSON.parse(localStorage.getItem('qv_user') || '{}');

function decodeHTML(html){ const t=document.createElement('textarea'); t.innerHTML=html; return t.value; }
function shuffle(a){ return a.sort(()=>Math.random()-0.5); }

async function fetchQuestions(topic, difficulty, count){
  const url = `https://opentdb.com/api.php?amount=${count}&type=multiple&difficulty=${difficulty}`;
  const r = await fetch(url);
  const j = await r.json();
  return (j.results||[]).map(q=>({
    question: decodeHTML(q.question),
    correct: decodeHTML(q.correct_answer),
    options: shuffle([...q.incorrect_answers, q.correct_answer].map(decodeHTML))
  })).slice(0,count);
}

createBtn.addEventListener('click', async ()=>{
  const topic = topicInput.value.trim() || 'General Knowledge';
  const difficulty = difficultySelect.value;
  const count = parseInt(numQ.value,10)||10;

  status.textContent = 'Creating room...';

  try{
    // host as first player
    const roomDoc = await addDoc(collection(db,'rooms'),{
      hostUid: user.uid,
      topic,
      difficulty,
      players:[{
        uid: user.uid,
        name: user.name,
        avatar: user.avatar || '🙂',
        score:0
      }],
      createdAt: serverTimestamp(),
      currentIndex:-1,
      finished:false,
      lastReaction:null
    });

    status.textContent = 'Fetching questions...';

    const questions = await fetchQuestions(topic, difficulty, count);

    await setDoc(doc(db,'rooms',roomDoc.id),{ questions },{ merge:true });

    localStorage.setItem('roomId', roomDoc.id);
    localStorage.setItem('isHost','1');

    location.href = 'lobby.html';
  }catch(err){
    console.error(err);
    status.textContent = 'Create failed';
  }
});
