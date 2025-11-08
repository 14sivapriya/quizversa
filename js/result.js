// js/result.js
import { db } from './firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const ROOM_ID = localStorage.getItem('roomId');
const resultList = document.getElementById('resultList'); // assume an element in result.html
const winnerNameEl = document.getElementById('winnerName');

if(!ROOM_ID){ location.href = 'index.html'; }

const roomRef = doc(db, 'rooms', ROOM_ID);

(async function showResults(){
  const s = await getDoc(roomRef);
  if(!s.exists()){ resultList.innerHTML = '<p>Room not found</p>'; return; }
  const data = s.data();
  const players = (data.players || []).slice().sort((a,b)=> (b.score||0) - (a.score||0));
  resultList.innerHTML = players.map((p, i) => `<div class="lb-row"><strong>#${i+1}</strong> ${p.name} <span>${p.score||0}</span></div>`).join('');
  if(players.length) winnerNameEl.textContent = players[0].name;

  // confetti (emoji float)
  const container = document.getElementById('confetti');
  if(container){
    const EMOJ = ['🎉','✨','🥳','🎊'];
    for(let i=0;i<30;i++){
      const el = document.createElement('div');
      el.className = 'floating-emoji';
      el.textContent = EMOJ[Math.floor(Math.random()*EMOJ.length)];
      el.style.left = `${Math.random()*90}%`;
      container.appendChild(el);
      setTimeout(()=> el.classList.add('float'), 50);
      setTimeout(()=> el.remove(), 3500);
    }
  }
})();
