// script-leaderboard.js

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDL0DkMeKuCbPSzDA0TT56q3pO1I08rT1k",
  authDomain: "carolquotes-eff2e.firebaseapp.com",
  projectId: "carolquotes-eff2e",
  storageBucket: "carolquotes-eff2e.firebasestorage.app",
  messagingSenderId: "251432655094",
  appId: "1:251432655094:web:5f20dd75c907500709b4d7",
  measurementId: "G-5JNTDYBL7B",
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);

// Inicializa Firestore y habilita la persistencia offline
const db = firebase.firestore();
db.enablePersistence().catch((err) => {
  if (err.code === "failed-precondition") {
    console.warn(
      "Persistencia offline no se pudo habilitar porque hay múltiples pestañas abiertas."
    );
  } else if (err.code === "unimplemented") {
    console.warn("Persistencia offline no está disponible en este navegador.");
  }
});

// Función para cargar el leaderboard con cache manual
function loadLeaderboard() {
  const leaderboardEl = document.getElementById("leaderboard");

  // Revisa si hay datos cacheados y si son recientes (por ejemplo, 5 minutos)
  const cache = localStorage.getItem("leaderboardCache");
  const cacheTimestamp = localStorage.getItem("leaderboardCacheTimestamp");
  const now = Date.now();

  if (cache && cacheTimestamp && now - cacheTimestamp < 300000) {
    // 300000 ms = 5 minutos
    leaderboardEl.innerHTML = cache;
    console.log("Leaderboard cargado desde cache.");
    return;
  }

  // Si no hay cache o está vencida, se consulta Firestore
  db.collection("users")
    .orderBy("streak", "desc")
    .get()
    .then((snapshot) => {
      leaderboardEl.innerHTML = ""; // Limpia la lista
      snapshot.forEach((doc) => {
        const data = doc.data();
        const username = doc.id;
        const streak = data.streak || 0;
        const li = document.createElement("li");
        // Crea span para el nombre del usuario y otro para la racha
        const userSpan = document.createElement("span");
        userSpan.className = "leaderboard-user";
        userSpan.innerText = username;

        const streakSpan = document.createElement("span");
        streakSpan.className = "leaderboard-streak";
        streakSpan.innerText = streak;

        li.appendChild(userSpan);
        li.appendChild(streakSpan);
        leaderboardEl.appendChild(li);
      });
      // Guarda el HTML generado y la marca de tiempo en el cache
      localStorage.setItem("leaderboardCache", leaderboardEl.innerHTML);
      localStorage.setItem("leaderboardCacheTimestamp", now);
      console.log("Leaderboard cargado desde Firestore y cacheado.");
    })
    .catch((error) => {
      console.error("Error al obtener el leaderboard:", error);
    });
}

// Ejecuta la carga del leaderboard cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  loadLeaderboard();
});
