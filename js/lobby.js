// lobby.js — live quiz room
import { db } from './firebase.js';
import { doc, onSnapshot, runTransaction, updateDoc } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const ROOM_ID = localStorage.getItem('roomId');
const user = JSON.parse(localStorage.getItem('qv_user') || '{}');

const qEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const timerEl = document.getElementById('timer');
const leaderboardEl = document.getElementById('leaderboard');
const emojiBar = document.getElementById('emojiBar');
const floatingEmojis = document.getElementById('floatingEmojis');
const roomIdView = document.getElementById('roomIdView');
const topicView = document.getElementById('topicView');

const EMOJIS = ['😍','🤣','😭','🔥','😡','👍'];
const EMOJI_MS = 2000;
const PER_Q = 10; // seconds per question

roomIdView.textContent = `Room • ${ROOM_ID}`;

let questions = [];
let currentIndex = -1;
let localAnswered = false;
let timerInterval = null;
let remaining = PER_Q;
let localStreak = 0;

// Floating emojis
function createFloatingEmoji(e){
  const node = document.createElement('div');
  node.className='floating-emoji';
  node.textContent = e;
  node.style.left = `${20 + Math.random()*60}%`;
  floatingEmojis.appendChild(node);
  setTimeout(()=> node.classList.add('float'),10);
  setTimeout(()=> node.remove(), EMOJI_MS);
}

// Build emoji buttons
function buildEmojiBar(){
  emojiBar.innerHTML='';
  EMOJIS.forEach(e=>{
    const b=document.createElement('button');
    b.className='emoji-btn';
    b.textContent = e;
    b.addEventListener('click', async ()=>{
      createFloatingEmoji(e);
      const roomRef = doc(db,'rooms',ROOM_ID);
      await updateDoc(roomRef,{ lastReaction: Date.now() + '|' + (user.name||'') + '|' + e });
    });
    emojiBar.appendChild(b);
  });
}
buildEmojiBar();

// Room snapshot
const roomRef = doc(db,'rooms',ROOM_ID);
const unsub = onSnapshot(roomRef, snap=>{
  if(!snap.exists()){ alert('Room closed'); location.href='index.html'; return; }

  const data = snap.data();

  topicView.textContent = `${data.topic} · ${data.difficulty}`;

  // Load questions once
  if(Array.isArray(data.questions) && data.questions.length && questions.length === 0){
    questions = data.questions.slice();
  }

  // Update leaderboard — FIXED
  const players = (data.players||[]).slice().sort((a,b)=> (b.score||0)-(a.score||0));
  leaderboardEl.innerHTML = players.map(p=>{
    const av = p.avatar && p.avatar.startsWith('http')
      ? `<img src="${p.avatar}" style="width:20px;height:20px;border-radius:50%;vertical-align:middle;margin-right:4px">`
      : (p.avatar||'🙂');

    return `<div class="lb-row"><span>${av} ${p.name}</span><span>${p.score||0}</span></div>`;
  }).join('');

  // Show floating emoji if new reaction
  if(data.lastReaction){
    const parts = String(data.lastReaction).split('|');
    if(parts[2]) createFloatingEmoji(parts[2]);
  }

  // Questions logic
  if(typeof data.currentIndex === 'number'){
    if(currentIndex !== data.currentIndex){
      currentIndex = data.currentIndex;
      renderQuestion(currentIndex);
      startLocalTimer(PER_Q);
      localAnswered = false;
    }
  }

  // If quiz finished
  if(data.finished){
    setTimeout(()=> location.href='result.html', 500);
  }
});

// Timer
function startLocalTimer(sec){
  if(timerInterval) clearInterval(timerInterval);
  remaining = sec;
  timerEl.textContent = `⏳ ${remaining}s`;
  timerInterval = setInterval(async ()=>{
    remaining--;
    timerEl.textContent = `⏳ ${Math.max(remaining,0)}s`;
    if(remaining <= 0){
      clearInterval(timerInterval);
      lockOptions();
      emojiBar.style.display='flex';
      await advanceQuestion();
    }
  },1000);
}

function lockOptions(){
  document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
}



// Render question
function renderQuestion(idx){
  const q = questions[idx];
  if(!q) return;
  const total = questions.length;
  const qNumEl = document.getElementById('questionNumber');
  qNumEl.textContent = `Question ${idx + 1} of ${total}`;

  qEl.textContent = q.question;
  optionsEl.innerHTML = '';
  q.options.forEach(opt=>{
    const b = document.createElement('button');
    b.className='option-btn';
    b.textContent = opt;
    b.onclick = ()=> selectOption(opt, q.correct, b);
    optionsEl.appendChild(b);
  });
}

// Select option
async function selectOption(selected, correct, btn){
  if(localAnswered) return;
  localAnswered = true;
  lockOptions();

  // highlight result
  if(selected === correct){
    btn.classList.add('correct');
    await updateScore(10);
    localStreak++;
    if(localStreak >= 3){
      await updateScore(20);
      localStreak = 0;
    }
  } else {
    btn.classList.add('wrong');
    Array.from(document.querySelectorAll('.option-btn')).forEach(b=>{
      if(b.textContent === correct) b.classList.add('correct');
    });
    localStreak = 0;
  }

  // wait 1 second, then next question
  setTimeout(async ()=>{
    await advanceQuestion();
  }, 1000);
}



// Update score in Firestore
async function updateScore(delta){
  try{
    await runTransaction(db, async t=>{
      const s = await t.get(roomRef);
      if(!s.exists()) throw 'no room';
      const r = s.data();
      const players = (r.players||[]).map(p=> p.name === (user.name||'') ? {...p, score:(p.score||0)+delta} : p);
      t.update(roomRef,{ players });
    });
  }catch(e){ console.error(e); }
}

// Advance question (only host can increment)
async function advanceQuestion(){
  await runTransaction(db, async t=>{
    const r = await t.get(roomRef);
    if(!r.exists()) throw 'no room';
    const nextIndex = (r.data().currentIndex || 0) + 1;
    if(nextIndex >= questions.length){
      t.update(roomRef, { finished: true });
    } else {
      t.update(roomRef, { currentIndex: nextIndex, questionStart: Date.now() });
    }
  });
}

// START BUTTON logic — FIXED (no redirect)
const startBtn = document.getElementById("startBtn");

if(startBtn){
  startBtn.addEventListener("click", async ()=>{
    await updateDoc(roomRef, {
      currentIndex: 0,
      questionStart: Date.now()
    });
    startBtn.style.display = "none";
  });
}
