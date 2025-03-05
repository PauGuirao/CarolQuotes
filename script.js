document.addEventListener('DOMContentLoaded', () => {
    // Firebase configuration – replace with your own project config.
    const firebaseConfig = {
        apiKey: "AIzaSyDL0DkMeKuCbPSzDA0TT56q3pO1I08rT1k",
        authDomain: "carolquotes-eff2e.firebaseapp.com",
        projectId: "carolquotes-eff2e",
        storageBucket: "carolquotes-eff2e.firebasestorage.app",
        messagingSenderId: "251432655094",
        appId: "1:251432655094:web:5f20dd75c907500709b4d7",
        measurementId: "G-5JNTDYBL7B"
      };
  
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
  
    // Global variable to hold the logged-in username.
    let currentUser = localStorage.getItem('currentUser') || null;
  
    // Elements for login and game containers.
    const loginContainer = document.getElementById('login-container');
    const gameContainer = document.getElementById('game-container');
    const welcomeMessage = document.getElementById('welcome-message');
    const streakCountElement = document.getElementById('streak-count');
    const loginButton = document.getElementById('login-button');
    const usernameInput = document.getElementById('username-input');
    const logoutButton = document.getElementById('logout-button');
  
    // Login event handler.
    loginButton.addEventListener('click', () => {
      const username = usernameInput.value.trim();
      if (username) {
        currentUser = username;
        localStorage.setItem('currentUser', currentUser);
        showGame();
      } else {
        alert("Please enter a valid username.");
      }
    });
  
    // Logout event handler.
    logoutButton.addEventListener('click', () => {
      localStorage.removeItem('currentUser');
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
  
    // Load user data from Firestore.
    async function loadUserData() {
      const userDoc = await db.collection('users').doc(currentUser).get();
      if (userDoc.exists) {
        return userDoc.data();
      } else {
        // Create default data if the user doesn't exist.
        const defaultData = {
          mistakeCount: 0,
          streak: 0,
          solved: {} // Solved riddles keyed by unique day keys.
        };
        await db.collection('users').doc(currentUser).set(defaultData);
        return defaultData;
      }
    }
  
    // Update user data in Firestore.
    async function updateUserData(data) {
      await db.collection('users').doc(currentUser).update(data);
    }
  
    // Load and display the leaderboard.
    async function loadLeaderboard() {
      const leaderboardEl = document.getElementById('leaderboard');
      leaderboardEl.innerHTML = '';
      // Query all users ordered by 'streak' descending.
      const usersSnapshot = await db.collection('users').orderBy('streak', 'desc').get();
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        const username = doc.id; // Using the document ID as username.
        const streak = data.streak || 0;
        const li = document.createElement('li');
        li.innerText = `${username}: ${streak}`;
        leaderboardEl.appendChild(li);
      });
    }
  
    // Function that initializes and runs the game logic.
    async function showGame() {
      loginContainer.style.display = 'none';
      gameContainer.style.display = 'block';
      welcomeMessage.innerText = `Hola, ${currentUser}!`;
  
      const userData = await loadUserData();
      // Display current streak.
      streakCountElement.innerText = ` | Racha: ${userData.streak || 0}`;
  
      await loadLeaderboard();
      // Constants and riddle definitions.
      const allowedYear = 2025; // Only allow viewing months in 2025
      const riddles = [
        {
          riddle: "¿Qué tiene llaves pero no puede abrir cerraduras?",
          answer: "Un piano."
        },
        {
          riddle: "¿Qué se moja mientras seca?",
          answer: "Una toalla."
        },
        {
          riddle: "Sin boca hablo, sin oídos oigo, sin cuerpo existo, pero con el viento cobro vida. ¿Qué soy?",
          answer: "Un eco."
        },
        {
          riddle: "¿Qué cosa, cuanto más le quitas, más grande se vuelve?",
          answer: "Un agujero."
        },
        {
          riddle: "¿Qué sube y baja pero no se mueve?",
          answer: "Las escaleras."
        },
        {
          riddle: "¿Qué tiene un ojo pero no puede ver?",
          answer: "Una aguja."
        },
        {
          riddle: "¿Qué pesa más, un kilo de plumas o un kilo de plomo?",
          answer: "Pesan lo mismo."
        },
        {
          riddle: "¿Qué corre pero nunca camina?",
          answer: "El agua."
        },
        {
          riddle: "¿Quien es la futura mujer del Pau?",
          answer: "Carol"
        },
        {
          riddle: "¿Qué se rompe sin ser tocado?",
          answer: "El silencio."
        },
        {
          riddle: "¿Qué tiene 4 patas en la mañana, 2 patas al mediodía y 3 patas en la noche?",
          answer: "El hombre."
        },
        {
          riddle: "¿Qué tiene ciudades, pero no casas; montañas, pero no árboles; y agua, pero no peces?",
          answer: "Un mapa."
        },
        {
          riddle: "¿Qué puede llenar una habitación pero no ocupa espacio?",
          answer: "La luz."
        },
        {
          riddle: "¿Qué tiene agujeros por todas partes y aún puede retener agua?",
          answer: "Una esponja."
        },
        {
          riddle: "¿Qué se va y nunca regresa?",
          answer: "El tiempo."
        },
        {
          riddle: "¿Qué es lo que siempre viene pero nunca llega?",
          answer: "El mañana."
        },
        {
          riddle: "¿Qué tiene orejas pero no oye?",
          answer: "El maíz."
        },
        {
          riddle: "¿Qué va por el agua y no se moja?",
          answer: "La sombra."
        },
        {
          riddle: "¿Qué se abre y nunca cierra?",
          answer: "Una herida."
        }
      ];
      
  
      // DOM elements for the game.
      const riddleElement = document.getElementById('riddle');
      const showAnswerButton = document.getElementById('show-answer');
      const answerElement = document.getElementById('answer');
      const userAnswerInput = document.getElementById('user-answer');
      const submitAnswerButton = document.getElementById('submit-answer');
      const resultElement = document.getElementById('result');
      const popup = document.getElementById('popup');
      const popupConfirm = document.getElementById('popup-confirm');
      const popupCancel = document.getElementById('popup-cancel');
  
      // Set up today's date and calculate day of year.
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 0);
      const oneDay = 1000 * 60 * 60 * 24;
      const dayOfYearToday = Math.floor((today - startOfYear) / oneDay);
      const solvedKeyToday = getStorageKey(`riddleSolved_${today.getFullYear()}_${dayOfYearToday}`);
  
      // Select today's riddle (same for all users).
      const dailyRiddle = riddles[dayOfYearToday % riddles.length];

      riddleElement.innerText = dailyRiddle.riddle;
  
      // Normalize function (ignores punctuation and case).
      function normalize(text) {
        return text.toLowerCase().replace(/[^\w\s]|_/g, "").trim();
      }
  
      // If today's riddle is already solved for this user, update the UI.
      if (userData.solved[solvedKeyToday]) {
        answerElement.innerText = dailyRiddle.answer;
        answerElement.style.display = 'block';
        userAnswerInput.disabled = true;
        submitAnswerButton.disabled = true;
        showAnswerButton.disabled = true;
        resultElement.innerText = "Ya has solucionado el acertijo de hoy, vuelve mañana!";
        resultElement.style.display = 'block';
      }
  
      // "Show Answer" button triggers a custom popup.
      showAnswerButton.addEventListener('click', () => {
        popup.style.display = 'flex';
      });
  
      // Popup confirm: record a mistake, reset streak, show the answer, disable further answering.
      popupConfirm.addEventListener('click', async () => {
        userData.mistakeCount = (userData.mistakeCount || 0) + 1;
        // Reset streak on failure.
        userData.streak = 0;
        streakCountElement.innerText = ` | Streak: ${userData.streak}`;
        answerElement.innerText = dailyRiddle.answer;
        answerElement.style.display = 'block';
        userAnswerInput.disabled = true;
        submitAnswerButton.disabled = true;
        popup.style.display = 'none';
        await updateUserData({ mistakeCount: userData.mistakeCount, streak: userData.streak });
        loadLeaderboard(); // update leaderboard after streak change
      });
  
      // Popup cancel: hide the popup.
      popupCancel.addEventListener('click', () => {
        popup.style.display = 'none';
      });
  
      // Submit answer button handler.
      submitAnswerButton.addEventListener('click', async () => {
        const userAnswer = userAnswerInput.value;
        if (normalize(userAnswer) === normalize(dailyRiddle.answer)) {
          userData.solved[solvedKeyToday] = true;
          // Increase streak on correct answer.
          userData.streak = (userData.streak || 0) + 1;
          streakCountElement.innerText = ` | Racha: ${userData.streak}`;
          resultElement.innerText = "Correct! You solved today's riddle.";
          resultElement.style.display = 'block';
          answerElement.innerText = dailyRiddle.answer;
          answerElement.style.display = 'block';
          userAnswerInput.disabled = true;
          submitAnswerButton.disabled = true;
          await updateUserData({ solved: userData.solved, streak: userData.streak });
          buildCalendar(currentCalendarMonth, currentCalendarYear); // update calendar
          loadLeaderboard(); // update leaderboard
        } else {
          resultElement.innerText = "Incorrect answer. Please try again.";
          resultElement.style.display = 'block';
        }
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
        const monthName = new Date(currentCalendarYear, currentCalendarMonth, 1)
          .toLocaleString('default', { month: 'long' });
        document.getElementById('calendar-label').innerText = `${monthName} ${currentCalendarYear}`;
      }
  
      // Enable/disable navigation buttons based on current month.
      function updateNavButtons() {
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        prevBtn.disabled = (currentCalendarMonth === 0);
        nextBtn.disabled = (currentCalendarMonth === 11);
      }
  
      // Build the calendar for a given month and year.
      function buildCalendar(month, year) {
        const calendarEl = document.getElementById('calendar');
        calendarEl.innerHTML = ''; // Clear previous entries
  
        const now = new Date();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
  
        for (let d = 1; d <= lastDay.getDate(); d++) {
          const currentDate = new Date(year, month, d);
          const dayOfYear = getDayOfYear(currentDate);
          const solvedKeyForDay = getStorageKey(`riddleSolved_${year}_${dayOfYear}`);
          const solved = userData.solved[solvedKeyForDay];
  
          const dayDiv = document.createElement('div');
          dayDiv.classList.add('calendar-day');
  
          if (
            (year > today.getFullYear()) ||
            (year === today.getFullYear() && month > today.getMonth()) ||
            (year === today.getFullYear() && month === today.getMonth() && d > today.getDate())
          ) {
            dayDiv.classList.add('future');
          } else {
            dayDiv.classList.add(solved ? 'solved' : 'unsolved');
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
        const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const diffMs = tomorrow - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        // Ensure two digits by padding with zeros if necessary
        const hoursStr = diffHours.toString().padStart(2, '0');
        const minutesStr = diffMinutes.toString().padStart(2, '0');
        document.getElementById('timer').innerText = `${hoursStr}:${minutesStr}`;
      }
      
      
      updateTimer();
      setInterval(updateTimer, 1000);
  
      // Calendar month navigation.
      document.getElementById('prev-month').addEventListener('click', () => {
        if (currentCalendarMonth === 0) return;
        currentCalendarMonth--;
        buildCalendar(currentCalendarMonth, currentCalendarYear);
      });
  
      document.getElementById('next-month').addEventListener('click', () => {
        if (currentCalendarMonth === 11) return;
        currentCalendarMonth++;
        buildCalendar(currentCalendarMonth, currentCalendarYear);
      });
    } // end showGame()
  
    // Optionally, you could refresh the leaderboard periodically.
    // loadLeaderboard();
  });
  