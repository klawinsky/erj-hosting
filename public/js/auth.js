// public/js/auth.js
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.textContent = "";
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // przekierowanie po sukcesie
      window.location.href = "/raporty.html";
    } catch (err) {
      console.error("Login error", err);
      if (err.code === "auth/wrong-password") loginError.textContent = "Nieprawidłowe hasło.";
      else if (err.code === "auth/user-not-found") loginError.textContent = "Użytkownik nie istnieje.";
      else loginError.textContent = "Błąd logowania: " + err.message;
    }
  });
}

// Jeśli jesteś już zalogowany i wejdziesz na index.html, przekieruj
onAuthStateChanged(auth, (user) => {
  if (user && window.location.pathname === "/") {
    window.location.href = "/raporty.html";
  }
});
