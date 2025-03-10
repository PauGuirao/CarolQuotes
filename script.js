// ===============================
// Service Worker Registration
// ===============================
/*
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("/firebase-messaging-sw.js")
    .then((reg) => console.log("Service Worker registered:", reg))
    .catch((err) =>
      console.error("Error registering the Service Worker:", err)
    );
}

*/

// ===============================
// DOMContentLoaded: App Initialization
// ===============================
document.addEventListener("DOMContentLoaded", async () => {
  // Firebase configuration – replace with your own project config
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
  const messaging = firebase.messaging();
  const db = firebase.firestore();

  // Enable offline persistence
  db.enablePersistence().catch((err) => {
    if (err.code === "failed-precondition") {
      console.warn(
        "Multiple tabs open. Persistence can only be enabled in one tab."
      );
    } else if (err.code === "unimplemented") {
      console.warn("Persistence is not available in this browser.");
    }
  });

  // ===============================
  // Global Variables and DOM Elements
  // ===============================
  let currentUser = localStorage.getItem("currentUser") || null;
  const loginContainer = document.getElementById("login-container");
  const gameContainer = document.getElementById("game-container");
  const loginButton = document.getElementById("login-button");
  const usernameInput = document.getElementById("username-input");
  const userBtn = document.getElementById("user-btn");
  const userPopup = document.getElementById("user-popup");
  const userNameEl = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const userPopupClose = document.getElementById("user-popup-close");
  const streakCountElement = document.getElementById("streak-count");
  const carolCoinsElement = document.getElementById("carolCoins");

  // ===============================
  // Login and Profile Event Handlers
  // ===============================
  loginButton.addEventListener("click", async () => {
    const username = usernameInput.value.trim();
    const errorMsg = document.getElementById("login-error");
    errorMsg.innerText = "";
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

  // Profile popup and logout
  userBtn.addEventListener("click", (e) => {
    e.preventDefault();
    userNameEl.innerText = `Usuario: ${currentUser}`;
    userPopup.style.display = "flex";
  });
  userPopupClose.addEventListener("click", () => {
    userPopup.style.display = "none";
  });
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("currentUser");
    currentUser = null;
    location.reload();
  });

  if (currentUser) {
    showGame();
  }

  // ===============================
  // User Data Functions (Caching)
  // ===============================
  async function loadUserData() {
    const cacheKey = `userData_${currentUser}`;
    const cacheTimestampKey = `userData_${currentUser}_timestamp`;
    const now = Date.now();
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(cacheTimestampKey);
    if (cachedData && cachedTimestamp && now - cachedTimestamp < 300000) {
      console.log("Datos del usuario cargados desde cache.");
      return JSON.parse(cachedData);
    }
    const userDoc = await db.collection("users").doc(currentUser).get();
    let userData;
    if (userDoc.exists) {
      userData = userDoc.data();
    } else {
      userData = { mistakeCount: 0, streak: 0, solved: {}, carolCoins: 0 };
      await db.collection("users").doc(currentUser).set(userData);
    }
    localStorage.setItem(cacheKey, JSON.stringify(userData));
    localStorage.setItem(cacheTimestampKey, now);
    console.log("Datos del usuario cargados desde Firestore y cacheados.");
    return userData;
  }

  async function updateUserData(newData) {
    const cacheKey = `userData_${currentUser}`;
    const cacheTimestampKey = `userData_${currentUser}_timestamp`;
    const now = Date.now();
    let currentData = await loadUserData();
    const updatedData = { ...currentData, ...newData };
    await db.collection("users").doc(currentUser).update(newData);
    localStorage.setItem(cacheKey, JSON.stringify(updatedData));
    localStorage.setItem(cacheTimestampKey, now);
    console.log("Datos actualizados y caché refrescado manualmente.");
    return updatedData;
  }

  // ===============================
  // Leaderboard Functions
  // ===============================
  async function loadLeaderboard() {
    const leaderboardEl = document.getElementById("leaderboard");
    const cache = localStorage.getItem("leaderboardCache");
    const cacheTimestamp = localStorage.getItem("leaderboardCacheTimestamp");
    const now = Date.now();
    if (cache && cacheTimestamp && now - cacheTimestamp < 300000) {
      leaderboardEl.innerHTML = cache;
      console.log("Leaderboard loaded from cache.");
      return;
    }
    try {
      const snapshot = await db
        .collection("users")
        .orderBy("streak", "desc")
        .get();
      leaderboardEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const username = doc.id;
        const streak = data.streak || 0;
        const li = document.createElement("li");

        // Crea la estructura interna del ítem:
        li.innerHTML = `
          <div class="leaderboard-item">
            <img class="profile-photo" src="profile-1.png" alt="Foto de perfil">
            <span class="username">${username}</span>
            <span class="points">${streak}</span>
          </div>
        `;

        leaderboardEl.appendChild(li);
      });
      localStorage.setItem("leaderboardCache", leaderboardEl.innerHTML);
      localStorage.setItem("leaderboardCacheTimestamp", now);
      console.log("Leaderboard loaded from Firestore and cached.");
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  }

  async function updateLeaderboard() {
    const leaderboardEl = document.getElementById("leaderboard");
    const now = Date.now();
    try {
      const snapshot = await db
        .collection("users")
        .orderBy("streak", "desc")
        .get();
      leaderboardEl.innerHTML = "";
      snapshot.forEach((doc) => {
        const data = doc.data();
        const username = doc.id;
        const streak = data.streak || 0;
        const li = document.createElement("li");
        li.innerText = `${username}: ${streak}`;
        leaderboardEl.appendChild(li);
      });
      localStorage.setItem("leaderboardCache", leaderboardEl.innerHTML);
      localStorage.setItem("leaderboardCacheTimestamp", now);
      console.log("Leaderboard updated and cache refreshed.");
    } catch (error) {
      console.error("Error updating leaderboard:", error);
    }
  }

  // ===============================
  // Riddles and Keyboard Functions
  // ===============================
  async function loadRiddles() {
    try {
      const response = await fetch("riddles.json");
      if (!response.ok) {
        throw new Error("Error loading riddles.json");
      }
      const riddles = await response.json();
      return riddles;
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  function buildLetterInputs(answer, containerId) {
    const letters = answer
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    for (let i = 0; i < letters.length; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.classList.add("letter-input");
      input.dataset.index = i;
      input.readOnly = true;
      input.setAttribute("inputmode", "none");
      input.addEventListener("focus", (e) => e.target.blur());
      input.addEventListener("input", (e) => {
        if (e.target.value.length === 1) {
          const next = e.target.nextElementSibling;
          if (next && next.tagName.toLowerCase() === "input") {
            next.focus();
          }
        }
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && e.target.value === "") {
          const prev = e.target.previousElementSibling;
          if (prev && prev.tagName.toLowerCase() === "input") {
            prev.focus();
          }
        }
      });
      container.appendChild(input);
    }
  }

  function buildCustomKeyboard(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    const keyboardRows = [
      ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
      ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
      ["Z", "X", "C", "V", "B", "N", "M", "⌫"],
    ];
    keyboardRows.forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("keyboard-row");
      row.forEach((key) => {
        const button = document.createElement("button");
        button.classList.add("keyboard-key");
        button.innerText = key;
        button.dataset.key = key;
        if (key === "⌫") {
          button.classList.add("backspace-key");
        }
        rowDiv.appendChild(button);
      });
      container.appendChild(rowDiv);
    });
  }

  function attachKeyboardListeners(
    letterInputsContainerId,
    keyboardContainerId
  ) {
    const letterInputsContainer = document.getElementById(
      letterInputsContainerId
    );
    const keyboardContainer = document.getElementById(keyboardContainerId);
    const letterInputs =
      letterInputsContainer.querySelectorAll(".letter-input");

    function getFirstEmptyIndex() {
      for (let i = 0; i < letterInputs.length; i++) {
        if (!letterInputs[i].value) return i;
      }
      return -1;
    }

    function getLastFilledIndex() {
      for (let i = letterInputs.length - 1; i >= 0; i--) {
        if (letterInputs[i].value) return i;
      }
      return -1;
    }

    keyboardContainer.addEventListener("click", (e) => {
      const target = e.target;
      if (!target.classList.contains("keyboard-key")) return;
      const keyValue = target.dataset.key;
      if (keyValue === "✔") {
        console.log("Enter key pressed.");
        return;
      }
      if (keyValue === "⌫") {
        const lastIndex = getLastFilledIndex();
        if (lastIndex >= 0) {
          letterInputs[lastIndex].value = "";
          letterInputs[lastIndex].focus();
        }
        return;
      }
      const emptyIndex = getFirstEmptyIndex();
      if (emptyIndex >= 0) {
        letterInputs[emptyIndex].value = keyValue;
        if (emptyIndex + 1 < letterInputs.length) {
          letterInputs[emptyIndex + 1].focus();
        }
      }
    });
  }

  // ===============================
  // Modularized Game Initialization (showGame)
  // ===============================
  async function showGame() {
    hideLogin();
    showGameContainer();
    const userData = await loadUserData();
    updateUserInfo(userData);
    updateDayTitle();
    await loadLeaderboard();

    const riddles = await loadRiddles();
    if (!riddles.length) {
      console.error("No se pudieron cargar los acertijos.");
      return;
    }

    const dailyRiddle = selectDailyRiddle(riddles);
    initializeRiddleSection(dailyRiddle, userData);
    setupAnswerSubmission(dailyRiddle, userData);
    setupCalendar(userData, riddles);
    setupTimer();
  }

  function hideLogin() {
    loginContainer.style.display = "none";
  }

  function showGameContainer() {
    gameContainer.style.display = "flex";
    gameContainer.style.justifyContent = "center";
    gameContainer.style.alignItems = "center";
    gameContainer.style.flexDirection = "column";
  }

  function updateUserInfo(userData) {
    streakCountElement.innerHTML = `<i class="fas fa-fire"></i>${
      userData.streak || 0
    }`;
    carolCoinsElement.innerHTML = `<i class="fas fa-coins"></i>${
      userData.carolCoins || 0
    }`;
  }

  function updateDayTitle() {
    const dayTitle = document.getElementById("day-title");
    const today = new Date();
    const options = { year: "numeric", month: "long", day: "numeric" };
    dayTitle.innerText = today.toLocaleDateString("es-ES", options);
    dayTitle.style.display = "block";
  }

  function selectDailyRiddle(riddles) {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor((today - startOfYear) / oneDay);
    return riddles[dayOfYear % riddles.length];
  }

  function initializeRiddleSection(riddle, userData) {
    const riddleEl = document.getElementById("riddle");
    riddleEl.innerText = riddle.riddle;
    buildLetterInputs(riddle.answer, "letter-inputs");
    buildCustomKeyboard("custom-keyboard");
    attachKeyboardListeners("letter-inputs", "custom-keyboard");
    checkIfRiddleSolved(riddle, userData);
  }

  function checkIfRiddleSolved(riddle, userData) {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor((today - startOfYear) / oneDay);
    const solvedKey = getStorageKey(
      `riddleSolved_${today.getFullYear()}_${dayOfYear}`
    );
    if (userData.solved && userData.solved[solvedKey]) {
      // Update UI to reflect that today's riddle is solved.
      const answerCard = document.getElementById("answer-card");
      const answerElement = document.getElementById("answer");
      const submitButton = document.getElementById("submit-answer");
      const showAnswerButton = document.getElementById("show-answer");
      answerCard.classList.add("show");
      answerElement.innerText = riddle.answer;
      answerElement.style.display = "block";

      const letterInputs = document.querySelectorAll(
        "#letter-inputs .letter-input"
      );
      const letters = riddle.answer
        .trim()
        .replace(/\s+/g, "")
        .replace(/[^\p{L}\p{N}]/gu, "");
      letterInputs.forEach((input, index) => {
        input.value = letters[index] || "";
        input.disabled = true;
        input.classList.add("solved-letter");
      });
      submitButton.disabled = true;
      showAnswerButton.disabled = true;

      const resultElement = document.getElementById("result");
      resultElement.innerText =
        "Ya has solucionado el acertijo de hoy, vuelve mañana! Era:";
      resultElement.style.display = "block";
    }
  }

  function setupAnswerSubmission(riddle, userData) {
    const submitButton = document.getElementById("submit-answer");
    const showAnswerButton = document.getElementById("show-answer");
    const popup = document.getElementById("popup");
    const popupConfirm = document.getElementById("popup-confirm");
    const popupCancel = document.getElementById("popup-cancel");
    const resultElement = document.getElementById("result");
    const answerElement = document.getElementById("answer");

    submitButton.addEventListener("click", async () => {
      const userAnswer = getUserAnswer();
      if (isAnswerCorrect(userAnswer, riddle.answer)) {
        await handleCorrectAnswer(riddle, userData);
      } else {
        resultElement.className = "result-message fail";
        resultElement.innerText = "Respuesta incorrecta. Inténtalo de nuevo!";
        clearLetterInputs();
        handleWrongAnswer();
      }
      resultElement.style.display = "block";
      answerElement.style.display = "block";
    });

    showAnswerButton.addEventListener("click", () => {
      popup.style.display = "flex";
    });

    popupConfirm.addEventListener("click", async () => {
      await handleShowAnswer(riddle, userData);
      popup.style.display = "none";
    });

    popupCancel.addEventListener("click", () => {
      popup.style.display = "none";
    });
  }

  function getUserAnswer() {
    const inputs = document.querySelectorAll("#letter-inputs .letter-input");
    let answer = "";
    inputs.forEach((input) => (answer += input.value));
    return answer;
  }

  function clearLetterInputs() {
    const inputs = document.querySelectorAll("#letter-inputs .letter-input");
    inputs.forEach((input) => (input.value = ""));
  }

  function isAnswerCorrect(userAnswer, correctAnswer) {
    const normalize = (text) =>
      text
        .toUpperCase()
        .replace(/[^\w\s]|_/g, "")
        .trim();
    return normalize(userAnswer) === normalize(correctAnswer);
  }

  async function handleCorrectAnswer(riddle, userData) {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor((today - startOfYear) / oneDay);
    const solvedKey = getStorageKey(
      `riddleSolved_${today.getFullYear()}_${dayOfYear}`
    );
    userData.solved = userData.solved || {};
    userData.solved[solvedKey] = true;
    userData.streak = (userData.streak || 0) + 1;
    userData.carolCoins = (userData.carolCoins || 0) + 10;

    // Ensure the answer card is displayed immediately
    const answerCard = document.getElementById("answer-card");
    answerCard.classList.add("show");

    updateUserInfo(userData);
    const resultElement = document.getElementById("result");
    const answerElement = document.getElementById("answer");
    resultElement.className = "result-message success";
    resultElement.innerText = "Has acertado el acertijo hoy! Era:";
    answerElement.innerText = riddle.answer;
    answerElement.style.display = "block";

    const letterInputs = document.querySelectorAll(
      "#letter-inputs .letter-input"
    );
    letterInputs.forEach((input) => {
      input.disabled = true;
      input.classList.add("solved-letter");
    });
    document.getElementById("submit-answer").disabled = true;
    document.getElementById("show-answer").disabled = true;

    await updateUserData({
      solved: userData.solved,
      streak: userData.streak,
      carolCoins: userData.carolCoins,
    });
    updateLeaderboard();

    const successPopup = document.getElementById("success-popup");
    const successMessage = document.getElementById("success-message");
    successMessage.innerText = `¡Felicidades, has acertado! Has ganado +10 CarolCoins. La respuesta correcta es: ${riddle.answer}`;
    successPopup.style.display = "flex";
  }

  function handleWrongAnswer() {
    const letterInputs = document.querySelectorAll(".letter-input");

    // Añadir animación de sacudida y borde rojo
    letterInputs.forEach((input) => {
      input.classList.add("shake");
    });

    // Activar la vibración del dispositivo
    if ("vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]); // Vibra con un pequeño patrón
    }

    // Eliminar la clase de sacudida después de la animación
    setTimeout(() => {
      letterInputs.forEach((input) => {
        input.classList.remove("shake");
      });
    }, 500);
  }

  async function handleShowAnswer(riddle, userData) {
    const resultElement = document.getElementById("result");
    const answerElement = document.getElementById("answer");
    userData.mistakeCount = (userData.mistakeCount || 0) + 1;
    userData.streak = 0;
    updateUserInfo(userData);
    answerElement.innerText = riddle.answer;
    answerElement.style.display = "block";
    document.getElementById("submit-answer").disabled = true;
    document.getElementById("show-answer").disabled = true;
    resultElement.className = "result-message fail";
    resultElement.innerText = "Inténtalo de nuevo mañana :(!";
    await updateUserData({
      mistakeCount: userData.mistakeCount,
      streak: userData.streak,
    });
    updateLeaderboard();
  }

  // ===============================
  // Calendar Setup Functions
  // ===============================
  function buildCalendar(month, year, userData, riddles) {
    const calendarEl = document.getElementById("calendar");
    calendarEl.innerHTML = "";
    const today = new Date();
    const todayMidnight = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    function getDayOfYear(date) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start;
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const currentDate = new Date(year, month, d);
      const dayOfYear = getDayOfYear(currentDate);
      const solvedKey = getStorageKey(`riddleSolved_${year}_${dayOfYear}`);
      const solved = userData.solved && userData.solved[solvedKey];
      const dayDiv = document.createElement("div");
      dayDiv.classList.add("calendar-day");

      if (currentDate > todayMidnight) {
        dayDiv.classList.add("future");
      } else {
        if (currentDate.getTime() === todayMidnight.getTime()) {
          dayDiv.classList.add(solved ? "solved" : "today-unsolved");
        } else {
          dayDiv.classList.add(solved ? "solved" : "unsolved");
        }
        if (
          currentDate < todayMidnight ||
          (currentDate.getTime() === todayMidnight.getTime() && solved)
        ) {
          dayDiv.addEventListener("click", async () => {
            const clickedDate = new Date(year, month, d);
            const clickedDayOfYear = getDayOfYear(clickedDate);
            const docId = `${year}_${clickedDayOfYear}`;
            const docRef = db.collection("dailyRiddles").doc(docId);
            let data;
            let docSnap = await docRef.get();
            if (!docSnap.exists) {
              const index = clickedDayOfYear % riddles.length;
              data = {
                riddle: riddles[index].riddle,
                answer: riddles[index].answer,
                date: clickedDate.toISOString(),
              };
              await docRef.set(data);
            } else {
              data = docSnap.data();
            }
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
      }
      dayDiv.innerText = d;
      calendarEl.appendChild(dayDiv);
    }

    updateCalendarLabel(month, year);
    updateNavButtons(month);
  }

  function updateCalendarLabel(month, year) {
    const monthName = new Date(year, month, 1).toLocaleString("default", {
      month: "long",
    });
    document.getElementById(
      "calendar-label"
    ).innerText = `${monthName} ${year}`;
  }

  function updateNavButtons(month) {
    document.getElementById("prev-month").disabled = month === 0;
    document.getElementById("next-month").disabled = month === 11;
  }

  function setupCalendar(userData, riddles) {
    let currentCalendarMonth = new Date().getMonth();
    const allowedYear = 2025;
    let currentCalendarYear = allowedYear;

    buildCalendar(currentCalendarMonth, currentCalendarYear, userData, riddles);

    document.getElementById("prev-month").addEventListener("click", () => {
      if (currentCalendarMonth > 0) {
        currentCalendarMonth--;
        buildCalendar(
          currentCalendarMonth,
          currentCalendarYear,
          userData,
          riddles
        );
      }
    });
    document.getElementById("next-month").addEventListener("click", () => {
      if (currentCalendarMonth < 11) {
        currentCalendarMonth++;
        buildCalendar(
          currentCalendarMonth,
          currentCalendarYear,
          userData,
          riddles
        );
      }
    });
    document
      .getElementById("calendar-popup-close")
      .addEventListener("click", () => {
        document.getElementById("calendar-popup").style.display = "none";
      });
    // Add the success popup close event listener here:
    document
      .getElementById("success-popup-close")
      .addEventListener("click", () => {
        document.getElementById("success-popup").style.display = "none";
      });
  }
  // ===============================
  // Timer Setup Functions
  // ===============================
  function updateTimer() {
    const now = new Date();
    const tomorrow = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );
    const diffMs = tomorrow - now;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSeconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    const hoursStr = diffHours.toString().padStart(2, "0");
    const minutesStr = diffMinutes.toString().padStart(2, "0");
    const secondsStr = diffSeconds.toString().padStart(2, "0");
    const timerEl = document.getElementById("timer");
    if (timerEl) {
      timerEl.innerText = `${hoursStr}:${minutesStr}:${secondsStr}`;
    }
  }

  // ===============================
  // Timer Setup
  // ===============================
  function setupTimer() {
    updateTimer();
    setInterval(updateTimer, 1000);
  }

  // ===============================
  // Utility: Storage Key
  // ===============================
  function getStorageKey(key) {
    return `${currentUser}_${key}`;
  }
});
