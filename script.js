document.addEventListener('DOMContentLoaded', () => {
    // Global variable to hold the logged-in username.
    let currentUser = localStorage.getItem('currentUser') || null;
  
    // Elements for login and game containers.
    const loginContainer = document.getElementById('login-container');
    const gameContainer = document.getElementById('game-container');
    const welcomeMessage = document.getElementById('welcome-message');
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
  
    // Function that initializes and runs the game logic.
    function showGame() {
      loginContainer.style.display = 'none';
      gameContainer.style.display = 'block';
      welcomeMessage.innerText = `Welcome, ${currentUser}!`;
  
      // Constants and riddle definitions.
      const allowedYear = 2025; // Only allow viewing months in 2025
      const riddles = [
        {
          riddle: "What has keys but can't open locks?",
          answer: "A piano."
        },
        {
          riddle: "What has a head and a tail but no body?",
          answer: "A coin."
        },
        {
          riddle: "What gets wetter as it dries?",
          answer: "A towel."
        },
        {
          riddle: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
          answer: "An echo."
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
  
      // If today's riddle is already solved, update the UI.
      if (localStorage.getItem(solvedKeyToday) === "true") {
        answerElement.innerText = dailyRiddle.answer;
        answerElement.style.display = 'block';
        userAnswerInput.disabled = true;
        submitAnswerButton.disabled = true;
        resultElement.innerText = "You've already solved today's riddle!";
        resultElement.style.display = 'block';
      }
  
      // "Show Answer" button now triggers a custom in-page popup.
      showAnswerButton.addEventListener('click', () => {
        popup.style.display = 'flex';
      });
  
      // Popup confirm: record a mistake, show the answer, and disable further answering.
      popupConfirm.addEventListener('click', () => {
        let mistakes = parseInt(localStorage.getItem(getStorageKey('mistakeCount')) || "0", 10);
        mistakes++;
        localStorage.setItem(getStorageKey('mistakeCount'), mistakes);
        answerElement.innerText = dailyRiddle.answer;
        answerElement.style.display = 'block';
        userAnswerInput.disabled = true;
        submitAnswerButton.disabled = true;
        popup.style.display = 'none';
      });
  
      // Popup cancel: simply hide the popup.
      popupCancel.addEventListener('click', () => {
        popup.style.display = 'none';
      });
  
      // Submit answer button handler.
      submitAnswerButton.addEventListener('click', () => {
        const userAnswer = userAnswerInput.value;
        if (normalize(userAnswer) === normalize(dailyRiddle.answer)) {
          localStorage.setItem(solvedKeyToday, "true");
          resultElement.innerText = "Correct! You solved today's riddle.";
          resultElement.style.display = 'block';
          answerElement.innerText = dailyRiddle.answer;
          answerElement.style.display = 'block';
          userAnswerInput.disabled = true;
          submitAnswerButton.disabled = true;
          buildCalendar(currentCalendarMonth, currentCalendarYear); // update calendar
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
        const lastDay = new Date(year, month + 1, 0); // Last day
  
        for (let d = 1; d <= lastDay.getDate(); d++) {
          const currentDate = new Date(year, month, d);
          const dayOfYear = getDayOfYear(currentDate);
          const solvedKeyForDay = getStorageKey(`riddleSolved_${year}_${dayOfYear}`);
          const solved = localStorage.getItem(solvedKeyForDay) === "true";
  
          const dayDiv = document.createElement('div');
          dayDiv.classList.add('calendar-day');
  
          // If day is in the future relative to today, mark as future.
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
        document.getElementById('timer').innerText = `Time remaining: ${diffHours} hour(s) and ${diffMinutes} minute(s)`;
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
  });
  