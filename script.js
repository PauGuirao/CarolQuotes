document.addEventListener('DOMContentLoaded', () => {
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
  
    // Get today's day of year and create a unique localStorage key for today's riddle
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 0);
    const diff = today - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const solvedKey = `riddleSolved_${today.getFullYear()}_${dayOfYear}`;
  
    // Select today's riddle based on the day of the year
    const dailyRiddle = riddles[dayOfYear % riddles.length];
    document.getElementById('riddle').innerText = dailyRiddle.riddle;
  
    const showAnswerButton = document.getElementById('show-answer');
    const answerElement = document.getElementById('answer');
    const userAnswerInput = document.getElementById('user-answer');
    const submitAnswerButton = document.getElementById('submit-answer');
    const resultElement = document.getElementById('result');
  
    // Normalize function to compare answers (ignores punctuation and case)
    function normalize(text) {
      return text.toLowerCase().replace(/[^\w\s]|_/g, "").trim();
    }
  
    // If today's riddle is already solved, update the UI accordingly
    if (localStorage.getItem(solvedKey) === "true") {
      answerElement.innerText = dailyRiddle.answer;
      answerElement.style.display = 'block';
      userAnswerInput.disabled = true;
      submitAnswerButton.disabled = true;
      resultElement.innerText = "You've already solved today's riddle!";
      resultElement.style.display = 'block';
    }
  
    // Show answer button handler
    showAnswerButton.addEventListener('click', () => {
      answerElement.innerText = dailyRiddle.answer;
      answerElement.style.display = 'block';
    });
  
    // Submit answer button handler
    submitAnswerButton.addEventListener('click', () => {
      const userAnswer = userAnswerInput.value;
      if (normalize(userAnswer) === normalize(dailyRiddle.answer)) {
        localStorage.setItem(solvedKey, "true");
        resultElement.innerText = "Correct! You solved today's riddle.";
        resultElement.style.display = 'block';
        answerElement.innerText = dailyRiddle.answer;
        answerElement.style.display = 'block';
        userAnswerInput.disabled = true;
        submitAnswerButton.disabled = true;
        buildCalendar(); // update calendar to show solved state
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
  
    // Build a simple calendar for the current month.
    // Days in the past (or today) are shown as solved (green) or unsolved (red),
    // while days that haven't occurred yet are marked with a "future" class.
    function buildCalendar() {
      const calendarEl = document.getElementById('calendar');
      calendarEl.innerHTML = ''; // Clear previous calendar entries
  
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // current month (0-indexed)
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0); // last day of current month
  
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const currentDate = new Date(year, month, d);
        const dayOfYear = getDayOfYear(currentDate);
        const solvedKeyForDay = `riddleSolved_${year}_${dayOfYear}`;
        const solved = localStorage.getItem(solvedKeyForDay) === "true";
        
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
  
        // For days in the future (in the current month), mark as "future"
        if (currentDate.getDate() > now.getDate()) {
          dayDiv.classList.add('future');
        } else {
          dayDiv.classList.add(solved ? 'solved' : 'unsolved');
        }
        dayDiv.innerText = d;
        calendarEl.appendChild(dayDiv);
      }
    }
  
    // Build the calendar when the page loads
    buildCalendar();
  
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
  });
  