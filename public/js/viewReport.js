// public/js/viewReport.js
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { app } from "./firebase-config.js";

const db = getFirestore(app);

const viewForm = document.getElementById("viewForm");
const reportResult = document.getElementById("reportResult");

if (viewForm) {
  viewForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    reportResult.textContent = "";
    const trainNumber = document.getElementById("viewTrainNumber").value.trim();
    const date = document.getElementById("viewDate").value;

    try {
      const q = query(
        collection(db, "reports"),
        where("trainNumber", "==", trainNumber),
        where("date", "==", date),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        reportResult.textContent = "Brak raportu dla tego pociągu i daty.";
        return;
      }
      // pokaż wszystkie dopasowania (zwykle 1)
      const html = snap.docs.map(d => {
        const r = d.data();
        return `<div style="border:1px solid #ccc;padding:8px;margin:8px 0">
          <strong>Raport #${r.reportNumber}</strong><br/>
          Data utworzenia: ${r.createdAt ? r.createdAt.toDate ? r.createdAt.toDate() : r.createdAt : 'brak'}<br/>
          Numer pociągu: ${r.trainNumber}<br/>
          Uwagi: ${r.notes || ''}<br/>
          Autor: ${r.userId}
        </div>`;
      }).join("");
      reportResult.innerHTML = html;
    } catch (err) {
      console.error("View report error", err);
      reportResult.textContent = "Błąd wyszukiwania: " + err.message;
    }
  });
}
