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
  
    // Get today's day of year and current year for a unique key
    const today = new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const solvedKey = `riddleSolved_${today.getFullYear()}_${dayOfYear}`;
  
    // Select a riddle based on the day of the year
    const dailyRiddle = riddles[dayOfYear % riddles.length];
    document.getElementById('riddle').innerText = dailyRiddle.riddle;
  
    const showAnswerButton = document.getElementById('show-answer');
    const answerElement = document.getElementById('answer');
    const userAnswerInput = document.getElementById('user-answer');
    const submitAnswerButton = document.getElementById('submit-answer');
    const resultElement = document.getElementById('result');
  
    // Normalize function to compare answers (ignores punctuation and letter case)
    function normalize(text) {
      return text.toLowerCase().replace(/[^\w\s]|_/g, "").trim();
    }
  
    // Check if today's riddle was already solved
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
      } else {
        resultElement.innerText = "Incorrect answer. Please try again.";
        resultElement.style.display = 'block';
      }
    });
  });
  