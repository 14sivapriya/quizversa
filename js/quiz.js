// quiz.js — works for both host & players
import { db } from './firebase.js';
import { doc, onSnapshot, updateDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const ROOM_ID = localStorage.getItem('roomId');
const user = JSON.parse(localStorage.getItem('qv_user')||'{}');

const EMOJIS = ['😍','🤣','😭','🔥','😡','👍'];
const EMOJI_MS = 2000;
const PER_Q = 15; // seconds per question

const qEl = document.getElementById('question');
const optionsEl = document.getElementById('options');
const timerEl = document.getElementById('timer');
const leaderboardEl = document.getElementById('leaderboard');
const emojiBar = document.getElementById('emojiBar');
const floatingEmojis = document.getElementById('floatingEmojis');
const roomIdView = document.getElementById('roomIdView');
const topicView = document.getElementById('topicView');

roomIdView.textContent = `Room • ${ROOM_ID}`;

let questions = [];
let currentIndex = -1;
let localAnswered = false;
let timerInterval = null;
let remaining = PER_Q;
let localStreak = 0;

function createFloatingEmoji(e){
  const node = document.createElement('div');
  node.className='floating-emoji';
  node.textContent = e;
  node.style.left = `${20 + Math.random()*60}%`;
  floatingEmojis.appendChild(node);
  setTimeout(()=> node.classList.add('float'), 10);
  setTimeout(()=> node.remove(), EMOJI_MS);
}

function buildEmojiBar(){
  emojiBar.innerHTML = '';
  EMOJIS.forEach(e=>{
    const b=document.createElement('button');
    b.className='emoji-btn';
    b.textContent = e;
    b.addEventListener('click', async ()=> {
      createFloatingEmoji(e);
      const roomRef = doc(db,'rooms',ROOM_ID);
      await updateDoc(roomRef, { lastReaction: Date.now() + '|' + user.uid + '|' + e });
    });
    emojiBar.appendChild(b);
  });
}
buildEmojiBar();

// Listen for room updates
const roomRef = doc(db,'rooms',ROOM_ID);
const unsub = onSnapshot(roomRef, snap => {
  if(!snap.exists()){ alert('Room closed'); location.href='index.html'; return; }
  const data = snap.data();

  // Show topic & difficulty
  topicView.textContent = `${data.topic} · ${data.difficulty}`;

  // Initialize questions for players if host already created them
  if(Array.isArray(data.questions) && data.questions.length && questions.length===0){
    questions = data.questions.slice();
  }

  // Show leaderboard
  const players = (data.players || []).slice().sort((a,b)=> (b.score||0) - (a.score||0));
  leaderboardEl.innerHTML = players.map(p=>`<div class="lb-row"><span>${p.avatar||'🙂'} ${p.name}</span><span>${p.score||0}</span></div>`).join('');

  // Show floating emoji from lastReaction
  if(data.lastReaction){
    const parts = String(data.lastReaction).split('|');
    if(parts[2]) createFloatingEmoji(parts[2]);
  }

  // Current question handling
  if(typeof data.currentIndex === 'number'){
    if(currentIndex !== data.currentIndex){
      currentIndex = data.currentIndex;
      renderQuestion(currentIndex);
    }
    const startMs = data.questionStart || null;
    const rem = startMs ? Math.max(0, PER_Q - Math.floor((Date.now() - startMs)/1000)) : PER_Q;
    startLocalTimer(rem);

    // Show emoji bar only when timer ended
    emojiBar.style.display = (rem<=0) ? 'flex' : 'none';
  }

  if(data.finished){
    // Go to result page after 1s
    setTimeout(()=> location.href='result.html', 1000);
  }
});

// Render a question
function renderQuestion(idx){
  localAnswered = false;
  const q = questions[idx];
  if(!q) return;
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

// Timer
function startLocalTimer(sec){
  if(timerInterval) clearInterval(timerInterval);
  remaining = sec;
  timerEl.textContent = `⏳ ${remaining}s`;
  timerInterval = setInterval(()=>{
    remaining--;
    timerEl.textContent = `⏳ ${Math.max(remaining,0)}s`;
    if(remaining<=0){
      clearInterval(timerInterval);
      lockOptions();
      emojiBar.style.display='flex';
      // If host, auto move next question
      autoAdvance();
    }
  },1000);
}

function lockOptions(){ document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true); }

// Handle selecting an option
async function selectOption(selected, correct, btn){
  if(localAnswered) return;
  localAnswered=true;
  lockOptions();
  if(selected===correct){
    btn.classList.add('correct');
    await updateScore(10);
    localStreak++;
    if(localStreak>=3){
      await updateScore(20);
      localStreak=0;
    }
  } else {
    btn.classList.add('wrong');
    // Reveal correct
    Array.from(document.querySelectorAll('.option-btn')).forEach(b=>{ if(b.textContent===correct) b.classList.add('correct'); });
    localStreak=0;
  }
}

// Update score in Firestore transaction
async function updateScore(delta){
  try{
    await runTransaction(db, async (t)=>{
      const s = await t.get(roomRef);
      if(!s.exists()) throw 'no room';
      const r = s.data();
      const players = (r.players||[]).map(p=> p.uid===user.uid ? {...p, score:(p.score||0)+delta} : p);
      t.update(roomRef, { players });
    });
  }catch(e){ console.error('score tx',e); }
}

// Auto-advance question (host only)
async function autoAdvance(){
  const r = await roomRef.get(); // for host check
  const snap = await roomRef.get();
  const data = snap.data();
  if(!data) return;
  if(data.hostUid !== user.uid) return; // only host advances
  if(currentIndex+1 >= questions.length){
    await updateDoc(roomRef, { finished:true });
  } else {
    await updateDoc(roomRef, { 
      currentIndex: currentIndex+1,
      questionStart: Date.now()
    });
  }
}
