document.addEventListener('DOMContentLoaded', () => {
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
  
    // Get today's date and day of year for today's riddle and localStorage key
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYearToday = Math.floor((today - startOfYear) / oneDay);
    const solvedKeyToday = `riddleSolved_${today.getFullYear()}_${dayOfYearToday}`;
  
    // Set today's riddle based on day of year
    const dailyRiddle = riddles[dayOfYearToday % riddles.length];
    document.getElementById('riddle').innerText = dailyRiddle.riddle;
  
    const showAnswerButton = document.getElementById('show-answer');
    const answerElement = document.getElementById('answer');
    const userAnswerInput = document.getElementById('user-answer');
    const submitAnswerButton = document.getElementById('submit-answer');
    const resultElement = document.getElementById('result');
  
    // Popup elements
    const popup = document.getElementById('popup');
    const popupConfirm = document.getElementById('popup-confirm');
    const popupCancel = document.getElementById('popup-cancel');
  
    // Normalize function to compare answers (ignores punctuation and case)
    function normalize(text) {
      return text.toLowerCase().replace(/[^\w\s]|_/g, "").trim();
    }
  
    // If today's riddle is already solved, update the UI accordingly
    if (localStorage.getItem(solvedKeyToday) === "true") {
      answerElement.innerText = dailyRiddle.answer;
      answerElement.style.display = 'block';
      userAnswerInput.disabled = true;
      submitAnswerButton.disabled = true;
      resultElement.innerText = "You've already solved today's riddle!";
      resultElement.style.display = 'block';
    }
  
    // Show answer button handler triggers the custom popup
    showAnswerButton.addEventListener('click', () => {
      popup.style.display = 'flex';
    });
  
    // Popup confirm button: record a mistake, show the answer, disable input, and hide the popup
    popupConfirm.addEventListener('click', () => {
      let mistakes = parseInt(localStorage.getItem('mistakeCount') || "0", 10);
      mistakes++;
      localStorage.setItem('mistakeCount', mistakes);
      answerElement.innerText = dailyRiddle.answer;
      answerElement.style.display = 'block';
      // Disable answer input and submit button so no further answers can be submitted
      userAnswerInput.disabled = true;
      submitAnswerButton.disabled = true;
      popup.style.display = 'none';
    });
  
    // Popup cancel button: simply hide the popup
    popupCancel.addEventListener('click', () => {
      popup.style.display = 'none';
    });
  
    // Submit answer button handler
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
  
    // Utility to compute the day of the year for any given date
    function getDayOfYear(date) {
      const start = new Date(date.getFullYear(), 0, 0);
      const diff = date - start;
      return Math.floor(diff / oneDay);
    }
  
    // Set up calendar month/year variables; default is current month/year but force year to allowedYear.
    let currentCalendarMonth = today.getMonth();
    let currentCalendarYear = allowedYear;
  
    // Update the calendar label display
    function updateCalendarLabel() {
      const monthName = new Date(currentCalendarYear, currentCalendarMonth, 1)
        .toLocaleString('default', { month: 'long' });
      document.getElementById('calendar-label').innerText = `${monthName} ${currentCalendarYear}`;
    }
  
    // Update the navigation buttons based on the current calendar month
    function updateNavButtons() {
      const prevBtn = document.getElementById('prev-month');
      const nextBtn = document.getElementById('next-month');
      prevBtn.disabled = (currentCalendarMonth === 0);
      nextBtn.disabled = (currentCalendarMonth === 11);
    }
  
    // Build the calendar for the specified month/year.
    // Past days (or today in current month) show solved/unsolved,
    // while future days are marked with a "future" class.
    function buildCalendar(month, year) {
      const calendarEl = document.getElementById('calendar');
      calendarEl.innerHTML = ''; // Clear previous calendar entries
  
      const now = new Date();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0); // Last day of selected month
  
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const currentDate = new Date(year, month, d);
        const dayOfYear = getDayOfYear(currentDate);
        const solvedKeyForDay = `riddleSolved_${year}_${dayOfYear}`;
        const solved = localStorage.getItem(solvedKeyForDay) === "true";
        
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
  
        // Determine if the day is in the future relative to today
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
  
    // Initial build of the calendar for the allowed year (2025)
    buildCalendar(currentCalendarMonth, currentCalendarYear);
  
    // Timer to display the remaining time until midnight
    function updateTimer() {
      const now = new Date();
      // Next midnight
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const diffMs = tomorrow - now;
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      document.getElementById('timer').innerText = `Time remaining: ${diffHours} hour(s) and ${diffMinutes} minute(s)`;
    }
    
    // Initial call and update timer every second
    updateTimer();
    setInterval(updateTimer, 1000);
  
    // Calendar month navigation handlers
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
  });
  