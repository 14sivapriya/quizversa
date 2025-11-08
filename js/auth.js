import { auth, provider } from './firebase.js';
import { signInWithPopup, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js';

const btn = document.getElementById('googleSignIn');
const msg = document.getElementById('msg');

// Google sign-in
btn.addEventListener('click', async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    localStorage.setItem('qv_user', JSON.stringify({
      uid: user.uid,
      name: user.displayName,
      photo: user.photoURL
    }));
    // redirect to host page after login
    location.href = 'host.html';
  } catch (e) {
    console.error(e);
    msg.textContent = 'Sign-in failed. Check console for details.';
  }
});

// If already logged in, store user info
onAuthStateChanged(auth, user => {
  if (user) {
    localStorage.setItem('qv_user', JSON.stringify({
      uid: user.uid,
      name: user.displayName,
      photo: user.photoURL
    }));
    // optional: auto redirect from login page
    // location.href = 'host.html';
  }
});
