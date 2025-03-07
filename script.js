if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/service-worker.js")
    .then((reg) => {
      console.log("Service Worker registrado con éxito:", reg);
    })
    .catch((err) => {
      console.error("Error al registrar el Service Worker:", err);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  // Firebase configuration – replace with your own project config.
  const firebaseConfig = {
    apiKey: "AIzaSyDL0DkMeKuCbPSzDA0TT56q3pO1I08rT1k",
    authDomain: "carolquotes-eff2e.firebaseapp.com",
    projectId: "carolquotes-eff2e",
    storageBucket: "carolquotes-eff2e.firebasestorage.app",
    messagingSenderId: "251432655094",
    appId: "1:251432655094:web:5f20dd75c907500709b4d7",
    measurementId: "G-5JNTDYBL7B",
  };

  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // Enable offline persistence for Firestore
  db.enablePersistence().catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn(
        "Multiple tabs open. Persistence can only be enabled in one tab."
      );
    } else if (err.code === "unimplemented") {
      console.warn("Persistence is not available in this browser.");
    }
  });

  // Global variable to hold the logged-in username.
  let currentUser = localStorage.getItem("currentUser") || null;

  // Elements for login and game containers.
  const loginContainer = document.getElementById("login-container");
  const gameContainer = document.getElementById("game-container");
  const welcomeMessage = document.getElementById("welcome-message");
  const streakCountElement = document.getElementById("streak-count");
  const carolCoinsElement = document.getElementById("carolCoins");
  const loginButton = document.getElementById("login-button");
  const usernameInput = document.getElementById("username-input");
  const logoutButton = document.getElementById("logout-button");
  const answerCard = document.getElementById("answer-card");

  //////////////////////////////// Login event handler ////////////////////////////////
  loginButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const errorMsg = document.getElementById("login-error");
    errorMsg.innerText = ""; // Limpia el mensaje de error anterior

    if (username) {
      const userDoc = await db.collection("users").doc(username).get();
      if (userDoc.exists) {
        currentUser = username;
        localStorage.setItem("currentUser", currentUser);
        showGame();
      } else {
        errorMsg.innerText =
          "El usuario no existe. Por favor, ingresa un usuario válido.";
      }
    } else {
      errorMsg.innerText = "Por favor, introduce un usuario.";
    }
  });

  /////////////////////////////// Logout event handler ///////////////////////////////
  logoutButton.addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    currentUser = null;
    location.reload();
  });

  // If already logged in, show game.
  if (currentUser) {
    showGame();
  }

  // Helper: prefix a storage key with the current username.
  function getStorageKey(key) {
    return `${currentUser}_${key}`;
  }

  ///////////////////////////// Load user data from Firestore /////////////////////////////
  async function loadUserData() {
    const cacheKey = `userData_${currentUser}`;
    const cacheTimestampKey = `userData_${currentUser}_timestamp`;
    const now = Date.now();

    // Intenta recuperar datos cacheados
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    if (cachedData && cachedTimestamp && now - cachedTimestamp < 300000) {
      // 300000 ms = 5 minutos
      console.log("Datos del usuario cargados desde cache.");
      return JSON.parse(cachedData);
    }

    // Si no hay cache o está vencida, consulta Firestore
    const userDoc = await db.collection("users").doc(currentUser).get();
    let userData;
    if (userDoc.exists) {
      userData = userDoc.data();
    } else {
      // Crear datos por defecto si no existen
      userData = {
        mistakeCount: 0,
        streak: 0,
        solved: {},
        carolCoins: 0,
      };
      await db.collection("users").doc(currentUser).set(userData);
    }

    // Guarda en cache los datos y la marca de tiempo
    localStorage.setItem(cacheKey, JSON.stringify(userData));
    localStorage.setItem(cacheTimestampKey, now);

    console.log("Datos del usuario cargados desde Firestore y cacheados.");
    return userData;
  }

  /////////////////////////////// Update user data in Firestore /////////////////////////////
  async function updateUserData(newData) {
    const cacheKey = `userData_${currentUser}`;
    const cacheTimestampKey = `userData_${currentUser}_timestamp`;
    const now = Date.now();

    // Obtenemos la data actual (ya sea del caché o de Firestore)
    let currentData = await loadUserData();
    // Se combinan los datos: los atributos de newData sobrescriben los de currentData
    const updatedData = { ...currentData, ...newData };

    // Actualizamos Firestore con solo los datos nuevos
    await db.collection("users").doc(currentUser).update(newData);

    // Actualizamos el caché con la data combinada
    localStorage.setItem(cacheKey, JSON.stringify(updatedData));
    localStorage.setItem(cacheTimestampKey, now);

    console.log("Datos actualizados y caché refrescado manualmente.");
    return updatedData;
  }

  ///////////////////////////// Load and display the leaderboard /////////////////////////////
  async function loadLeaderboard() {
    const leaderboardEl = document.getElementById("leaderboard");
    // Check if cached data exists and is fresh (e.g., 5 minutes)
    const cache = localStorage.getItem("leaderboardCache");
    const cacheTimestamp = localStorage.getItem("leaderboardCacheTimestamp");
    const now = Date.now();

    if (cache && cacheTimestamp && now - cacheTimestamp < 300000) {
      leaderboardEl.innerHTML = cache;
      console.log("Leaderboard loaded from cache.");
      return;
    }

    // If no valid cache, query Firestore
    try {
      const usersSnapshot = await db
        .collection("users")
        .orderBy("streak", "desc")
        .get();
      leaderboardEl.innerHTML = ""; // Clear current content
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const username = doc.id;
        const streak = data.streak || 0;
        const li = document.createElement("li");
        li.innerText = `${username}: ${streak}`;
        leaderboardEl.appendChild(li);
      });
      // Cache the leaderboard HTML and timestamp in localStorage
      localStorage.setItem("leaderboardCache", leaderboardEl.innerHTML);
      localStorage.setItem("leaderboardCacheTimestamp", now);
      console.log("Leaderboard loaded from Firestore and cached.");
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  }

  //////////////////////////////// Update the leaderboard ////////////////////////////////
  async function updateLeaderboard() {
    const cacheKey = "leaderboardCache";
    const cacheTimestampKey = "leaderboardCacheTimestamp";
    const now = Date.now();
    const leaderboardEl = document.getElementById("leaderboard");

    try {
      const snapshot = await db
        .collection("users")
        .orderBy("streak", "desc")
        .get();

      // Limpia el contenido actual del leaderboard
      leaderboardEl.innerHTML = "";

      snapshot.forEach((doc) => {
        const data = doc.data();
        const username = doc.id;
        const streak = data.streak || 0;
        const li = document.createElement("li");
        li.innerText = `${username}: ${streak}`;
        leaderboardEl.appendChild(li);
      });

      // Guarda el HTML generado y la marca de tiempo en el cache
      localStorage.setItem(cacheKey, leaderboardEl.innerHTML);
      localStorage.setItem(cacheTimestampKey, now);
      console.log("Leaderboard actualizado y caché refrescado.");
    } catch (error) {
      console.error("Error al actualizar el leaderboard:", error);
    }
  }

  // Function that initializes and runs the game logic.
  async function showGame() {
    loginContainer.style.display = "none";
    gameContainer.style.display = "block";
    welcomeMessage.innerText = `Hola, ${currentUser}!`;

    const userData = await loadUserData();
    // Display current streak.
    // Actualiza la interfaz con íconos y valores de racha y CarolCoins
    streakCountElement.innerHTML = `RACHA: ${
      userData.streak || 0
    } <i class="fas fa-fire"></i>`;
    carolCoinsElement.innerHTML = `CAROLOS: ${
      userData.carolCoins || 0
    } <i class="fas fa-coins"></i>`;

    await loadLeaderboard();
    // Constants and riddle definitions.
    const allowedYear = 2025; // Only allow viewing months in 2025
    const riddles = [
      {
        riddle: "¿Qué tiene llaves pero no puede abrir cerraduras?",
        answer: "Un piano.",
      },
      {
        riddle: "¿Qué se moja mientras seca?",
        answer: "Una toalla.",
      },
      {
        riddle:
          "Sin boca hablo, sin oídos oigo, sin cuerpo existo, pero con el viento cobro vida. ¿Qué soy?",
        answer: "Un eco.",
      },
      {
        riddle: "¿Qué cosa, cuanto más le quitas, más grande se vuelve?",
        answer: "Un agujero.",
      },
      {
        riddle: "¿Qué sube y baja pero no se mueve?",
        answer: "Las escaleras.",
      },
      {
        riddle: "¿Qué tiene un ojo pero no puede ver?",
        answer: "Una aguja.",
      },
      {
        riddle: "¿Qué pesa más, un kilo de plumas o un kilo de plomo?",
        answer: "Pesan lo mismo.",
      },
      {
        riddle: "¿Qué corre pero nunca camina?",
        answer: "El agua.",
      },
      {
        riddle: "¿Quien es la futura mujer del Pau?",
        answer: "Carol",
      },
      {
        riddle: "¿Qué se rompe sin ser tocado?",
        answer: "El silencio.",
      },
      {
        riddle: "¿Qué se va y nunca regresa?",
        answer: "El tiempo.",
      },
      {
        riddle:
          "¿Qué tiene 4 patas en la mañana, 2 patas al mediodía y 3 patas en la noche?",
        answer: "El hombre.",
      },
      {
        riddle:
          "¿Qué tiene ciudades, pero no casas; montañas, pero no árboles; y agua, pero no peces?",
        answer: "Un mapa.",
      },
      {
        riddle: "¿Qué puede llenar una habitación pero no ocupa espacio?",
        answer: "La luz.",
      },
      {
        riddle:
          "¿Qué tiene agujeros por todas partes y aún puede retener agua?",
        answer: "Una esponja.",
      },
      {
        riddle: "¿Qué es lo que siempre viene pero nunca llega?",
        answer: "El mañana.",
      },
      {
        riddle: "¿Qué tiene orejas pero no oye?",
        answer: "El maíz.",
      },
      {
        riddle: "¿Qué va por el agua y no se moja?",
        answer: "La sombra.",
      },
      {
        riddle: "¿Qué se abre y nunca cierra?",
        answer: "Una herida.",
      },
    ];

    // DOM elements for the game.
    const riddleElement = document.getElementById("riddle");
    const showAnswerButton = document.getElementById("show-answer");
    const answerElement = document.getElementById("answer");
    const userAnswerInput = document.getElementById("user-answer");
    const submitAnswerButton = document.getElementById("submit-answer");
    const resultElement = document.getElementById("result");
    const popup = document.getElementById("popup");
    const popupConfirm = document.getElementById("popup-confirm");
    const popupCancel = document.getElementById("popup-cancel");

    // Set up today's date and calculate day of year.
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYearToday = Math.floor((today - startOfYear) / oneDay);
    const solvedKeyToday = getStorageKey(
      `riddleSolved_${today.getFullYear()}_${dayOfYearToday}`
    );

    // Select today's riddle (same for all users).
    const dailyRiddle = riddles[dayOfYearToday % riddles.length];

    riddleElement.innerText = dailyRiddle.riddle;

    // Normalize function (ignores punctuation and case).
    // Función de normalización: convierte a mayúsculas, elimina caracteres no alfanuméricos y espacios extra
    function normalize(text) {
      return text
        .toUpperCase()
        .replace(/[^\w\s]|_/g, "")
        .trim();
    }

    // Función para validar la respuesta
    function isAnswerCorrect(userAnswer, correctAnswer) {
      const normalizedUser = normalize(userAnswer);
      const normalizedCorrect = normalize(correctAnswer);

      // Si la respuesta del usuario es menor, se comprueba si está contenida en la respuesta correcta.
      // O viceversa.
      return (
        normalizedCorrect.includes(normalizedUser) ||
        normalizedUser.includes(normalizedCorrect)
      );
    }

    // If today's riddle is already solved for this user, update the UI.
    if (userData.solved[solvedKeyToday]) {
      answerCard.classList.add("show");
      answerElement.innerText = dailyRiddle.answer;
      answerElement.style.display = "block";
      userAnswerInput.disabled = true;
      submitAnswerButton.disabled = true;
      showAnswerButton.disabled = true;
      resultElement.innerText =
        "Ya has solucionado el acertijo de hoy, vuelve mañana! Era:";
      resultElement.style.display = "block";
    }

    // "Show Answer" button triggers a custom popup.
    showAnswerButton.addEventListener("click", () => {
      popup.style.display = "flex";
    });

    // Popup confirm: record a mistake, reset streak, show the answer, disable further answering.
    popupConfirm.addEventListener("click", async () => {
      userData.mistakeCount = (userData.mistakeCount || 0) + 1;
      // Reset streak on failure.
      userData.streak = 0;
      streakCountElement.innerHTML = `RACHA: ${
        userData.streak || 0
      } <i class="fas fa-fire"></i>`;
      carolCoinsElement.innerHTML = `CAROLOS: ${
        userData.carolCoins || 0
      } <i class="fas fa-coins"></i>`;
      answerElement.innerText = dailyRiddle.answer;
      answerElement.style.display = "block";
      userAnswerInput.disabled = true;
      submitAnswerButton.disabled = true;
      showAnswerButton.disabled = true;
      popup.style.display = "none";

      resultElement.className = "result-message fail";
      resultElement.innerText = "Inténtalo de nuevo mañana :(!";
      answerElement.innerText = `La respuesta correcta era: ${dailyRiddle.answer}`;
      await updateUserData({
        mistakeCount: userData.mistakeCount,
        streak: userData.streak,
      });
      updateLeaderboard(); // update leaderboard after streak change
    });

    // Popup cancel: hide the popup.
    popupCancel.addEventListener("click", () => {
      popup.style.display = "none";
    });

    // Submit answer button handler.
    submitAnswerButton.addEventListener("click", async () => {
      const userAnswer = userAnswerInput.value;
      answerCard.classList.add("show"); // Muestra la tarjeta con animación

      if (isAnswerCorrect(userAnswer, dailyRiddle.answer)) {
        userData.solved[solvedKeyToday] = true;
        // Incrementar racha y sumar 10 CarolCoins
        userData.streak = (userData.streak || 0) + 1;
        userData.carolCoins = (userData.carolCoins || 0) + 10;

        streakCountElement.innerHTML = `RACHA: ${
          userData.streak || 0
        } <i class="fas fa-fire"></i>`;
        carolCoinsElement.innerHTML = `CAROLOS: ${
          userData.carolCoins || 0
        } <i class="fas fa-coins"></i>`;

        resultElement.className = "result-message success";
        resultElement.innerText = "Has acertado el acertijo hoy! Era:";
        answerElement.innerText = `Respuesta: ${dailyRiddle.answer}`;

        answerElement.style.display = "block";
        userAnswerInput.disabled = true;
        submitAnswerButton.disabled = true;
        showAnswerButton.disabled = true;

        await updateUserData({
          solved: userData.solved,
          streak: userData.streak,
          carolCoins: userData.carolCoins,
        });
        buildCalendar(currentCalendarMonth, currentCalendarYear); // Actualiza el calendario
        updateLeaderboard(); // Actualiza el leaderboard

        // Mostrar popup de éxito
        const successPopup = document.getElementById("success-popup");
        const successMessage = document.getElementById("success-message");
        successMessage.innerText = `¡Felicidades, has acertado! Has ganado +10 CarolCoins. La respuesta correcta es: ${dailyRiddle.answer}`;
        successPopup.style.display = "flex";
      } else {
        resultElement.className = "result-message fail";
        resultElement.innerText = "Respuesta incorrecta. Inténtalo de nuevo!";
        //answerElement.innerText = `La respuesta correcta era: ${dailyRiddle.answer}`;
      }
      // Muestra los elementos de respuesta
      answerElement.style.display = "block";
      resultElement.style.display = "block";
    });

    // Utility: compute day of year for any date.
    function getDayOfYear(date) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start;
      return Math.floor(diff / oneDay);
    }

    // Calendar variables (months restricted to allowedYear).
    let currentCalendarMonth = today.getMonth();
    let currentCalendarYear = allowedYear;

    // Update the calendar label.
    function updateCalendarLabel() {
      const monthName = new Date(
        currentCalendarYear,
        currentCalendarMonth,
        1
      ).toLocaleString("default", { month: "long" });
      document.getElementById(
        "calendar-label"
      ).innerText = `${monthName} ${currentCalendarYear}`;
    }

    // Enable/disable navigation buttons based on current month.
    function updateNavButtons() {
      const prevBtn = document.getElementById("prev-month");
      const nextBtn = document.getElementById("next-month");
      prevBtn.disabled = currentCalendarMonth === 0;
      nextBtn.disabled = currentCalendarMonth === 11;
    }

    // Build the calendar for a given month and year.
    function buildCalendar(month, year) {
      const calendarEl = document.getElementById("calendar");
      calendarEl.innerHTML = ""; // Limpiar entradas previas

      const now = new Date();
      // Obtén la fecha de hoy a medianoche para comparar solo la parte de la fecha
      const todayMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      );
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      for (let d = 1; d <= lastDay.getDate(); d++) {
        const currentDate = new Date(year, month, d);
        const dayOfYear = getDayOfYear(currentDate);
        const solvedKeyForDay = getStorageKey(
          `riddleSolved_${year}_${dayOfYear}`
        );
        const solved = userData.solved[solvedKeyForDay];

        const dayDiv = document.createElement("div");
        dayDiv.classList.add("calendar-day");

        // Determina si el día es futuro comparándolo con todayMidnight
        if (currentDate > todayMidnight) {
          dayDiv.classList.add("future");
        } else {
          dayDiv.classList.add(solved ? "solved" : "unsolved");
          // Solo se añade el listener si el día ya pasó o es el actual
          dayDiv.addEventListener("click", async () => {
            // Creamos un ID de documento para el día, por ejemplo "2025_150"
            const clickedDate = new Date(year, month, d);
            const dayOfYearClicked = getDayOfYear(clickedDate);
            const docId = `${year}_${dayOfYearClicked}`;
            const docRef = db.collection("dailyRiddles").doc(docId);
            let docSnap = await docRef.get();
            let data;
            if (!docSnap.exists) {
              // Si no existe, obtenemos el acertijo de nuestro arreglo (repetido cíclicamente)
              const index = dayOfYearClicked % riddles.length;
              data = {
                riddle: riddles[index].riddle,
                answer: riddles[index].answer,
                date: clickedDate.toISOString(),
              };
              await docRef.set(data);
            } else {
              data = docSnap.data();
            }
            // Mostrar el popup del calendario con la información
            document.getElementById(
              "calendar-popup-title"
            ).innerText = `Acertijo del día ${d}/${month + 1}/${year}`;
            document.getElementById("calendar-popup-question").innerText =
              data.riddle;
            document.getElementById("calendar-popup-answer").innerText =
              data.answer;
            document.getElementById("calendar-popup").style.display = "flex";
          });
        }
        dayDiv.innerText = d;
        calendarEl.appendChild(dayDiv);
      }
      updateCalendarLabel();
      updateNavButtons();
    }

    // Initial build of the calendar.
    buildCalendar(currentCalendarMonth, currentCalendarYear);

    // Timer to display remaining time until midnight.
    function updateTimer() {
      const now = new Date();
      const tomorrow = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1
      );
      const diffMs = tomorrow - now;

      // Calcula horas, minutos y segundos restantes
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      // Asegura que el formato sea siempre de dos dígitos
      const hoursStr = diffHours.toString().padStart(2, "0");
      const minutesStr = diffMinutes.toString().padStart(2, "0");
      const secondsStr = diffSeconds.toString().padStart(2, "0");

      // Actualiza el texto del temporizador con el formato HH:MM:SS
      document.getElementById(
        "timer"
      ).innerText = `${hoursStr}:${minutesStr}:${secondsStr}`;
    }

    updateTimer();
    setInterval(updateTimer, 1000);

    // Calendar month navigation.
    document.getElementById("prev-month").addEventListener("click", () => {
      if (currentCalendarMonth === 0) return;
      currentCalendarMonth--;
      buildCalendar(currentCalendarMonth, currentCalendarYear);
    });

    document.getElementById("next-month").addEventListener("click", () => {
      if (currentCalendarMonth === 11) return;
      currentCalendarMonth++;
      buildCalendar(currentCalendarMonth, currentCalendarYear);
    });

    document
      .getElementById("calendar-popup-close")
      .addEventListener("click", () => {
        document.getElementById("calendar-popup").style.display = "none";
      });

    document
      .getElementById("success-popup-close")
      .addEventListener("click", () => {
        document.getElementById("success-popup").style.display = "none";
      });
  } // end showGame()

  // Optionally, you could refresh the leaderboard periodically.
  // loadLeaderboard();
});
