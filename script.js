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
  const streakCountElement = document.getElementById("streak-count");
  const carolCoinsElement = document.getElementById("carolCoins");
  const loginButton = document.getElementById("login-button");
  const usernameInput = document.getElementById("username-input");
  const answerCard = document.getElementById("answer-card");
  const userBtn = document.getElementById("user-btn");
  const userPopup = document.getElementById("user-popup");
  const userNameEl = document.getElementById("user-name");
  const logoutBtn = document.getElementById("logout-btn");
  const userPopupClose = document.getElementById("user-popup-close");

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
  userBtn.addEventListener("click", (e) => {
    e.preventDefault(); // Evita la acción por defecto del enlace
    userNameEl.innerText = `Usuario: ${currentUser}`;
    userPopup.style.display = "flex";
  });

  // Botón para cerrar el popup
  userPopupClose.addEventListener("click", () => {
    userPopup.style.display = "none";
  });

  // Botón de logout
  logoutBtn.addEventListener("click", () => {
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

  ///////////////////////// Load riddles ///////////////////////////
  async function loadRiddles() {
    try {
      const response = await fetch("riddles.json");
      if (!response.ok) {
        throw new Error("Error al cargar el archivo riddles.json");
      }
      const riddles = await response.json();
      return riddles;
    } catch (error) {
      console.error(error);
      return []; // Devuelve un array vacío en caso de error
    }
  }

  //////////////////////////// Build the keyboard ////////////////////////////
  // Array of rows, each row is an array of keys
  const keyboardRows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
    ["✔", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ];

  // Build the keyboard inside the container with the given ID
  function buildCustomKeyboard(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Clear any existing keyboard

    keyboardRows.forEach((row) => {
      const rowDiv = document.createElement("div");
      rowDiv.classList.add("keyboard-row");

      row.forEach((key) => {
        const button = document.createElement("button");
        button.classList.add("keyboard-key");
        button.innerText = key;
        button.dataset.key = key; // Store the key value

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

    // Keep track of the letter inputs
    // (assuming buildLetterInputs already created them with class "letter-input")
    const letterInputs =
      letterInputsContainer.querySelectorAll(".letter-input");

    // Helper: find the index of the first empty input
    function getFirstEmptyIndex() {
      for (let i = 0; i < letterInputs.length; i++) {
        if (!letterInputs[i].value) {
          return i;
        }
      }
      return -1; // Means all filled
    }

    // Helper: find the index of the last filled input
    function getLastFilledIndex() {
      for (let i = letterInputs.length - 1; i >= 0; i--) {
        if (letterInputs[i].value) {
          return i;
        }
      }
      return -1; // Means all are empty
    }

    keyboardContainer.addEventListener("click", (e) => {
      const target = e.target;
      if (!target.classList.contains("keyboard-key")) return; // ignore if not a key

      const keyValue = target.dataset.key; // e.g. "A", "B", "⌫", "✔", etc.

      // If it's the check symbol
      if (keyValue === "✔") {
        // Trigger your "submit" logic here if you want
        console.log("Check/Enter key pressed. You can trigger a submit.");
        return;
      }

      // If it's backspace
      if (keyValue === "⌫") {
        const lastIndex = getLastFilledIndex();
        if (lastIndex >= 0) {
          letterInputs[lastIndex].value = "";
          letterInputs[lastIndex].focus();
        }
        return;
      }

      // Otherwise, it's a letter
      const emptyIndex = getFirstEmptyIndex();
      if (emptyIndex >= 0) {
        letterInputs[emptyIndex].value = keyValue;
        // Optionally move focus to next input
        if (emptyIndex + 1 < letterInputs.length) {
          letterInputs[emptyIndex + 1].focus();
        }
      }
    });
  }

  //////////////////////// Function that builds the game input. ////////////////////////
  function buildLetterInputs(answer, containerId) {
    // Eliminar espacios y limpiar la respuesta
    const letters = answer
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^\p{L}\p{N}]/gu, "");
    const container = document.getElementById(containerId);
    container.innerHTML = ""; // Limpia el contenedor

    // Crear un input por cada letra
    for (let i = 0; i < letters.length; i++) {
      const input = document.createElement("input");
      input.type = "text";
      input.maxLength = 1;
      input.classList.add("letter-input");
      input.dataset.index = i; // Guardamos la posición si se requiere

      // Prevent the native keyboard from appearing
      input.readOnly = true;
      input.setAttribute("inputmode", "none");

      input.addEventListener("focus", (e) => {
        e.target.blur();
      });

      // Listener para mover el foco automáticamente al siguiente input al escribir
      input.addEventListener("input", (e) => {
        const target = e.target;
        if (target.value.length === 1) {
          const nextInput = target.nextElementSibling;
          if (nextInput && nextInput.tagName.toLowerCase() === "input") {
            nextInput.focus();
          }
        }
      });

      // Listener para moverse al input anterior al presionar Backspace en un input vacío
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && e.target.value === "") {
          const prevInput = e.target.previousElementSibling;
          if (prevInput && prevInput.tagName.toLowerCase() === "input") {
            prevInput.focus();
          }
        }
      });

      container.appendChild(input);
    }
  }

  //////////////////////// Function that initializes and runs the game logic. ////////////////////////
  async function showGame() {
    loginContainer.style.display = "none";
    gameContainer.style.display = "flex";
    gameContainer.style.justifyContent = "center";
    gameContainer.style.alignItems = "center";
    gameContainer.style.flexDirection = "column";

    const userData = await loadUserData();
    // Display current streak.
    // Actualiza la interfaz con íconos y valores de racha y CarolCoins
    streakCountElement.innerHTML = `RACHA: ${
      userData.streak || 0
    } <i class="fas fa-fire"></i>`;
    carolCoinsElement.innerHTML = `CAROLOS: ${
      userData.carolCoins || 0
    } <i class="fas fa-coins"></i>`;

    updateDayTitle();
    await loadLeaderboard();
    // Constants and riddle definitions.
    const allowedYear = 2025; // Only allow viewing months in 2025
    // Cargar los acertijos desde el archivo JSON
    const riddles = await loadRiddles();
    if (!riddles.length) {
      console.error("No se pudieron cargar los acertijos.");
      return;
    }

    // DOM elements for the game.
    const riddleElement = document.getElementById("riddle");
    const showAnswerButton = document.getElementById("show-answer");
    const answerElement = document.getElementById("answer");
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
    // Supongamos que ya tienes dailyRiddle definido:
    buildLetterInputs(dailyRiddle.answer, "letter-inputs");
    // Build the keyboard
    buildCustomKeyboard("custom-keyboard");
    // Attach the keyboard logic
    attachKeyboardListeners("letter-inputs", "custom-keyboard");

    riddleElement.innerText = dailyRiddle.riddle;

    // If today's riddle is already solved for this user, update the UI.
    if (userData.solved && userData.solved[solvedKeyToday]) {
      // Mostrar mensaje de acertado y la respuesta
      answerCard.classList.add("show");
      answerElement.innerText = dailyRiddle.answer;
      answerElement.style.display = "block";

      // Rellenar y resaltar los inputs de letras
      const letterInputs = document.querySelectorAll(
        "#letter-inputs .letter-input"
      );
      // Limpiar la respuesta: quitamos espacios y signos para que coincida la cantidad de inputs
      const letters = dailyRiddle.answer
        .trim()
        .replace(/\s+/g, "")
        .replace(/[^\p{L}\p{N}]/gu, "");
      letterInputs.forEach((input, index) => {
        input.value = letters[index] || "";
        input.disabled = true;
        input.classList.add("solved-letter");
      });

      // Deshabilitar los botones de submit y show answer
      submitAnswerButton.disabled = true;
      showAnswerButton.disabled = true;

      // Mostrar mensaje en el resultado
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
      // Recoger todos los inputs de letras
      const letterInputs = document.querySelectorAll(
        "#letter-inputs .letter-input"
      );
      let userAnswer = "";
      letterInputs.forEach((input) => {
        userAnswer += input.value;
      });
      console.log("Respuesta formada:", userAnswer);
      // Función de normalización (ya definida)
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
        return (
          normalizedCorrect.includes(normalizedUser) ||
          normalizedUser.includes(normalizedCorrect)
        );
      }

      answerCard.classList.add("show");

      if (isAnswerCorrect(userAnswer, dailyRiddle.answer)) {
        userData.solved[solvedKeyToday] = true;
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
        answerElement.innerText = `${dailyRiddle.answer}`;

        answerElement.style.display = "block";
        // Deshabilitar y marcar inputs con estilo verde
        letterInputs.forEach((input) => {
          input.disabled = true;
          input.classList.add("solved-letter");
        });
        submitAnswerButton.disabled = true;
        showAnswerButton.disabled = true;

        await updateUserData({
          solved: userData.solved,
          streak: userData.streak,
          carolCoins: userData.carolCoins,
        });
        buildCalendar(currentCalendarMonth, currentCalendarYear);
        updateLeaderboard();

        const successPopup = document.getElementById("success-popup");
        const successMessage = document.getElementById("success-message");
        successMessage.innerText = `¡Felicidades, has acertado! Has ganado +10 CarolCoins. La respuesta correcta es: ${dailyRiddle.answer}`;
        successPopup.style.display = "flex";
      } else {
        resultElement.className = "result-message fail";
        resultElement.innerText = "Respuesta incorrecta. Inténtalo de nuevo!";
        // Opcional: limpiar inputs para que el usuario reintente
        letterInputs.forEach((input) => (input.value = ""));
      }

      resultElement.style.display = "block";
      answerElement.style.display = "block";
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
      // Fecha de hoy a medianoche para comparar solo la parte de la fecha
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

        if (currentDate > todayMidnight) {
          dayDiv.classList.add("future");
        } else {
          // Si es hoy, asignamos una clase especial
          if (currentDate.getTime() === todayMidnight.getTime()) {
            if (solved) {
              dayDiv.classList.add("solved");
            } else {
              dayDiv.classList.add("today-unsolved");
            }
          } else {
            // Para días pasados
            dayDiv.classList.add(solved ? "solved" : "unsolved");
          }

          // Agregar el listener de clic solo para:
          // - Días pasados (currentDate < todayMidnight)
          // - Día actual, pero solo si ya está resuelto.
          if (
            currentDate < todayMidnight ||
            (currentDate.getTime() === todayMidnight.getTime() && solved)
          ) {
            dayDiv.addEventListener("click", async () => {
              const clickedDate = new Date(year, month, d);
              const dayOfYearClicked = getDayOfYear(clickedDate);
              const docId = `${year}_${dayOfYearClicked}`;
              const docRef = db.collection("dailyRiddles").doc(docId);
              let data;
              let docSnap = await docRef.get();
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
              // Mostrar el popup con la información del día
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

function updateDayTitle() {
  const dayTitle = document.getElementById("day-title");
  const today = new Date();
  // Formato sin el día de la semana: "8 de marzo de 2025"
  const options = { year: "numeric", month: "long", day: "numeric" };
  dayTitle.innerText = today.toLocaleDateString("es-ES", options);
  dayTitle.style.display = "block"; // Se muestra solo cuando se está jugando
}
