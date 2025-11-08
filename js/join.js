import { db } from './firebase.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js';

const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const status = document.getElementById('status');

joinBtn.addEventListener('click', async ()=>{
  const id = roomInput.value.trim();
  if(!id) return status.textContent='Enter room id';
  const roomRef = doc(db,'rooms',id);
  const snap = await getDoc(roomRef);
  if(!snap.exists()) return status.textContent='Room not found';
  const room = snap.data();
  const players = room.players || [];
  const user = JSON.parse(localStorage.getItem('qv_user')||'{}');
  players.push({ name: user.name || 'Player', score:0, avatar: (user.photo?user.photo:user.name?user.name[0]:'🙂') });
  await updateDoc(roomRef, { players });
  localStorage.setItem('roomId', id);
  localStorage.setItem('isHost','0');
  location.href = 'lobby.html';
});
