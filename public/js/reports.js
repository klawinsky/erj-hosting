// public/js/reports.js
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  runTransaction,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { app } from "./firebase-config.js";

const db = getFirestore(app);
const auth = getAuth(app);

const reportForm = document.getElementById("reportForm");
const reportMessage = document.getElementById("reportMessage");
const userInfo = document.getElementById("userInfo");
const logoutBtn = document.getElementById("logoutBtn");

// Pokaż info o użytkowniku i zabezpiecz stronę
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "/";
    return;
  }
  if (userInfo) userInfo.textContent = `Zalogowany jako: ${user.email}`;
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/";
  });
}

// Funkcja pobierająca kolejny numer raportu w transakcji
async function getNextReportNumberTransaction(tx) {
  const counterRef = doc(db, "counters", "reports");
  const counterSnap = await tx.get(counterRef);
  if (!counterSnap.exists()) {
    tx.set(counterRef, { last: 1 });
    return 1;
  } else {
    const last = counterSnap.data().last || 0;
    const next = last + 1;
    tx.update(counterRef, { last: next });
    return next;
  }
}

if (reportForm) {
  reportForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    reportMessage.textContent = "";
    const user = auth.currentUser;
    if (!user) {
      alert("Musisz być zalogowany.");
      return;
    }

    const trainNumber = document.getElementById("trainNumber").value.trim();
    const date = document.getElementById("date").value;
    const notes = document.getElementById("notes").value;

    try {
      // transakcja: pobierz i zaktualizuj licznik, potem dodaj dokument
      const newReportId = await runTransaction(db, async (tx) => {
        const nextNumber = await getNextReportNumberTransaction(tx);
        const reportsCol = collection(db, "reports");
        const docRef = await addDoc(reportsCol, {
          reportNumber: nextNumber,
          userId: user.uid,
          trainNumber,
          date,
          notes,
          createdAt: serverTimestamp()
        });
        return { id: docRef.id, number: nextNumber };
      });

      reportMessage.style.color = "green";
      reportMessage.textContent = `Raport zapisany. Numer raportu: ${newReportId.number}`;
      reportForm.reset();
    } catch (err) {
      console.error("Save report error", err);
      reportMessage.style.color = "red";
      reportMessage.textContent = "Błąd zapisu raportu: " + err.message;
    }
  });
}
