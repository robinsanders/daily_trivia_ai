let currentQuestions = null;
let currentQuestionIndex = 0;
let score = 0;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-game');
    if (startButton) {
        startButton.addEventListener('click', startGame);
    }

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
});

// Game Functions
async function startGame() {
    try {
        console.log('Starting game...');
        const response = await fetch('/get_questions', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (response.status === 403) {
            console.error('Authentication error');
            showMessage('Please log in to play the daily quiz!', 'info');
            return;
        }
        
        if (response.status === 404) {
            console.error('No questions found');
            showMessage('No questions available for today. Please check back later!', 'info');
            return;
        }
        
        if (!response.ok) {
            console.error('Response not OK:', response.status, response.statusText);
            throw new Error(`Failed to fetch questions: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);
        
        // Validate the data structure
        if (!data || typeof data !== 'object') {
            console.error('Invalid response data structure:', data);
            showMessage('An error occurred while loading the quiz. Please try again later.', 'error');
            return;
        }

        // Check if we have valid questions array
        if (!data.questions || !Array.isArray(data.questions)) {
            console.error('No valid questions array found:', data.questions);
            showMessage('No questions available for today. Please check back later!', 'info');
            return;
        }

        if (data.questions.length === 0) {
            console.error('Questions array is empty');
            showMessage('No questions available for today. Please check back later!', 'info');
            return;
        }

        // Store questions and source information
        currentQuestions = data;
        console.log('Current questions set:', currentQuestions);
        
        // Reset game state
        currentQuestionIndex = 0;
        score = 0;
        
        // Show first question
        const welcomeScreen = document.getElementById('welcome-screen');
        const questionScreen = document.getElementById('question-screen');
        if (!welcomeScreen || !questionScreen) {
            console.error('Required screen elements not found:', { welcomeScreen, questionScreen });
            return;
        }
        welcomeScreen.classList.add('hidden');
        questionScreen.classList.remove('hidden');
        showQuestion();
        
    } catch (error) {
        console.error('Error starting game:', error);
        showMessage('An error occurred while loading the quiz. Please try again later.', 'error');
    }
}

function showQuestion() {
    console.log('showQuestion called');
    console.log('currentQuestions:', currentQuestions);
    console.log('currentQuestionIndex:', currentQuestionIndex);
    
    if (!currentQuestions?.questions) {
        console.error('No questions data available');
        showMessage('An error occurred while loading the questions. Please try again later.', 'error');
        return;
    }
    
    if (!Array.isArray(currentQuestions.questions)) {
        console.error('Questions is not an array:', currentQuestions.questions);
        showMessage('An error occurred while loading the questions. Please try again later.', 'error');
        return;
    }
    
    if (currentQuestionIndex >= currentQuestions.questions.length) {
        console.log('No more questions, showing results');
        showResults();
        return;
    }
    
    const question = currentQuestions.questions[currentQuestionIndex];
    console.log('Current question:', question);
    
    if (!question || !question.text || !Array.isArray(question.answers)) {
        console.error('Invalid question structure:', question);
        showMessage('An error occurred while displaying the question. Please try again later.', 'error');
        return;
    }

    // Update question text
    const questionText = document.getElementById('question-text');
    if (!questionText) {
        console.error('Question text element not found');
        return;
    }
    questionText.textContent = question.text;

    // Update choices
    const choicesContainer = document.getElementById('choices');
    if (!choicesContainer) {
        console.error('Choices container element not found');
        return;
    }
    
    // Add source information if it's the first question
    if (currentQuestionIndex === 0 && currentQuestions.source) {
        const sourceInfo = document.createElement('div');
        sourceInfo.className = 'source-info';
        sourceInfo.innerHTML = `<small>Source: ${currentQuestions.source.title}</small>`;
        questionText.parentNode.insertBefore(sourceInfo, questionText);
    }
    
    // Create answer buttons
    choicesContainer.innerHTML = question.answers.map((answer, index) => `
        <button class="choice-button" onclick="handleAnswer(${index})">
            ${answer.text}
        </button>
    `).join('');
    
    // Update progress bar
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        const progress = ((currentQuestionIndex + 1) / currentQuestions.questions.length) * 100;
        progressFill.style.width = `${progress}%`;
    }
}

function createConfetti() {
    const colors = ['#3FB950', '#1A7F37', '#238636', '#2EA043'];
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw';
        confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 1 + 1) + 's'; // Random duration between 1-2s
        document.body.appendChild(confetti);
        
        // Remove confetti after animation
        setTimeout(() => {
            confetti.remove();
        }, 2000);
    }
}

function handleAnswer(choiceIndex) {
    console.log('Handling answer:', choiceIndex);
    const question = currentQuestions.questions[currentQuestionIndex];
    console.log('Current question:', question);
    const buttons = document.querySelectorAll('.choice-button');
    const questionText = document.getElementById('question-text');
    const choicesContainer = document.getElementById('choices');
    
    // Prevent multiple clicks
    if (buttons[0].disabled) {
        return;
    }
    
    buttons.forEach(button => {
        button.disabled = true;
    });
    
    // Find the correct answer index
    const correctIndex = question.answers.findIndex(answer => answer.is_correct);
    console.log('Correct index:', correctIndex);
    
    // Calculate current score
    const totalQuestions = currentQuestionIndex + 1;
    const isCorrect = choiceIndex === correctIndex;
    if (isCorrect) {
        score++;
    }
    
    // Update score displays immediately for feedback
    const correctPoints = score * 99;
    const incorrectPoints = (totalQuestions - score) * 25;
    const lifeScore = correctPoints - incorrectPoints;
    const isLastQuestion = totalQuestions === currentQuestions.questions.length;
    const isPerfectScore = score === totalQuestions && isLastQuestion;
    
    // Only add perfect bonus on the last question if all answers were correct
    const perfectBonus = isPerfectScore ? 1000 : 0;
    
    updateScoreDisplays({
        correct_answers: score,
        total_questions: totalQuestions,
        life_score: lifeScore + perfectBonus
    });
    
    // Add animation classes
    choicesContainer.classList.add('reveal-mode');
    
    // Fade out unselected answers
    buttons.forEach((button, index) => {
        if (index !== choiceIndex && index !== correctIndex) {
            button.classList.add('fade-out');
        }
    });

    // Short delay before sliding answers
    setTimeout(() => {
        // Remove faded out buttons
        buttons.forEach((button, index) => {
            if (index !== choiceIndex && index !== correctIndex) {
                button.style.display = 'none';
            }
        });
        
        // Add success/error classes and animations
        if (isCorrect) {
            buttons[choiceIndex].classList.add('correct');
            playSound('correct');
            createConfetti();
            showScoreIncrease();
            
            // Show perfect score animation if this is the last question and all answers were correct
            if (isPerfectScore) {
                setTimeout(() => {
                    showPerfectScore();
                }, 1000); // Delay to let the regular score increase finish
            }
            
            const explanation = document.createElement('div');
            explanation.className = 'answer-explanation';
            explanation.style.background = 'var(--success-color)';
            explanation.innerHTML = `
                <p class="explanation-text">
                    <strong>Excellent!</strong> That's the correct answer!
                </p>
            `;
            questionText.parentNode.insertBefore(explanation, questionText.nextSibling);
            
            proceedToNextQuestion(1230);
        } else {
            // Show both the wrong and correct answers
            buttons[choiceIndex].classList.add('wrong');
            buttons[correctIndex].classList.add('correct', 'highlight');
            playSound('wrong');
            showScoreDecrease();
            
            const explanation = document.createElement('div');
            explanation.className = 'answer-explanation';
            explanation.style.background = 'var(--error-color)';
            explanation.innerHTML = `
                <p class="explanation-text">
                    <strong>The correct answer was:</strong> ${question.answers[correctIndex].text}
                </p>
            `;
            questionText.parentNode.insertBefore(explanation, questionText.nextSibling);
            
            // Ensure we proceed to next question after showing the correct answer
            proceedToNextQuestion(2173);
        }
    }, 150);
}

function updateScoreDisplays(scoreData) {
    // Update current score percentage
    const currentScoreDisplay = document.getElementById('current-score');
    const lifeScoreDisplay = document.getElementById('life-score-value');
    
    if (currentScoreDisplay) {
        const percentage = Math.round((scoreData.correct_answers / scoreData.total_questions) * 100);
        currentScoreDisplay.textContent = `${percentage}%`;
        currentScoreDisplay.classList.add('updating');
        setTimeout(() => currentScoreDisplay.classList.remove('updating'), 410);
        
        if (percentage > 50) {
            // Create good score message
            const goodMessage = document.createElement('div');
            goodMessage.className = 'good-score-message';
            goodMessage.innerHTML = `
                <div class="good-score-content">
                    <h2>Keep Going! 👍</h2>
                    <p>+${scoreData.life_score} Life Points!</p>
                </div>
            `;
            document.body.appendChild(goodMessage);
            
            // Remove message after animation
            setTimeout(() => {
                goodMessage.remove();
            }, 960);
        }
    }
    
    if (lifeScoreDisplay) {
        const oldValue = parseInt(lifeScoreDisplay.textContent) || 0;
        const newValue = scoreData.life_score;
        
        // Animate the life score change
        if (oldValue !== newValue) {
            lifeScoreDisplay.classList.add('updating');
            
            // Create a counting animation
            const duration = 820;
            const steps = 20;
            const stepValue = (newValue - oldValue) / steps;
            let currentStep = 0;
            
            const interval = setInterval(() => {
                currentStep++;
                const currentValue = Math.round(oldValue + (stepValue * currentStep));
                lifeScoreDisplay.textContent = currentValue;
                
                if (currentStep >= steps) {
                    clearInterval(interval);
                    lifeScoreDisplay.textContent = newValue;
                    lifeScoreDisplay.classList.remove('updating');
                }
            }, duration / steps);
        }
    }
}

function proceedToNextQuestion(delay) {
    // Show loading animation
    const loader = document.getElementById('next-question-loader');
    const loaderText = loader.querySelector('.loader-text');
    const isLastQuestion = currentQuestionIndex === currentQuestions.questions.length - 1;
    loaderText.textContent = isLastQuestion ? 'Preparing your quiz results...' : 'Loading next question...';
    
    setTimeout(() => {
        loader.classList.remove('hidden');
        loader.classList.add('visible');
    }, delay - 200);
    
    setTimeout(() => {
        currentQuestionIndex++;
        
        if (currentQuestionIndex < currentQuestions.questions.length) {
            // Hide loader before showing next question
            loader.classList.remove('visible');
            setTimeout(() => {
                loader.classList.add('hidden');
                // Remove any explanation from previous question
                const explanation = document.querySelector('.answer-explanation');
                if (explanation) {
                    explanation.remove();
                }
                // Remove correct/incorrect classes from question
                const questionText = document.getElementById('question-text');
                questionText.classList.remove('incorrect', 'correct');
                showQuestion();
            }, 300);
        } else {
            showResults();
        }
    }, delay);
}

function playSound(type) {
    try {
        const audio = new Audio(`/static/sounds/${type}.mp3`);
        audio.play().catch(error => {
            console.log(`Sound effect not available: ${type}.mp3`);
        });
    } catch (error) {
        console.log('Sound playback not supported');
    }
}

function showResults() {
    try {
        console.log('Showing results. Final score:', score);
        
        document.getElementById('question-screen').classList.add('hidden');
        const resultsScreen = document.getElementById('results-screen');
        if (!resultsScreen) {
            console.error('Results screen element not found');
            return;
        }
        resultsScreen.classList.remove('hidden');
        
        const scoreDisplay = document.getElementById('score-display');
        if (!scoreDisplay) {
            console.error('Score display element not found');
            return;
        }
        const percentage = (score / currentQuestions.questions.length) * 100;
        scoreDisplay.textContent = `You scored ${Math.round(percentage)}%`;
        
        // Show perfect score visual element if score is 100%
        const perfectScoreElement = document.querySelector('.perfect-bonus');
        if (perfectScoreElement && Math.round(percentage) === 100) {
            perfectScoreElement.classList.remove('hidden');
        }
        
        // Display source information
        const sourceInfo = document.getElementById('source-info');
        if (sourceInfo && currentQuestions.source) {
            const wikipediaUrl = `https://wikipedia.org/wiki/${encodeURIComponent(currentQuestions.source.title)}`;
            sourceInfo.innerHTML = `
                <h3>Source</h3>
                <p>Questions generated from Wikipedia article: 
                    <a href="${wikipediaUrl}" target="_blank" rel="noopener noreferrer">
                        ${currentQuestions.source.title}
                    </a>
                </p>
            `;
        }
        
        // Submit score to backend (now sending percentage instead of raw score)
        submitScore(Math.round(percentage), currentQuestions.questions.length);
        
        // Load and display calendar if user is logged in
        if (document.getElementById('calendar')) {
            loadUserScores();
        }
    } catch (error) {
        console.error('Error in showResults:', error);
        alert('An error occurred while displaying results. Your score may not have been saved.');
    }
}

async function submitScore(finalScore, totalQuestions) {
    try {
        const response = await fetch('/submit_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                score: finalScore,
                total_questions: totalQuestions,
                correct_answers: score,  
                incorrect_answers: totalQuestions - score  
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit score');
        }
        
        const data = await response.json();
        updateLifeScore(data);
        return data;
    } catch (error) {
        console.error('Error submitting score:', error);
        showError('Failed to submit score');
    }
}

function createLifeScoreDisplay() {
    const container = document.createElement('div');
    container.className = 'life-score-container';
    container.innerHTML = `
        <div class="life-score-header">Life Score</div>
        <div class="life-score-value">0</div>
        <div class="life-score-detail">
            <span class="life-adds">+0</span>
            <span class="life-subs">-0</span>
        </div>
        <div class="perfect-bonus hidden">+1000 PERFECT!</div>
    `;
    document.body.appendChild(container);
    return container;
}

function updateLifeScore(scoreData) {
    const container = document.querySelector('.life-score-container') || createLifeScoreDisplay();
    const valueDisplay = container.querySelector('.life-score-value');
    const addsDisplay = container.querySelector('.life-adds');
    const subsDisplay = container.querySelector('.life-subs');
    const bonusDisplay = container.querySelector('.perfect-bonus');
    
    // Create slot machine effect for life score
    const oldValue = parseInt(valueDisplay.textContent) || 0;
    const newValue = scoreData.life_score;
    
    // Clear previous content
    valueDisplay.innerHTML = '';
    
    // Create spinning digits
    String(newValue).padStart(5, '0').split('').forEach((digit, index) => {
        const digitContainer = document.createElement('div');
        digitContainer.className = 'slot-digit';
        
        const digitInner = document.createElement('div');
        digitInner.className = 'slot-digit-inner slot-spin';
        digitInner.style.animationDelay = `${index * 0.1}s`;
        
        // Generate random numbers for spinning effect
        for (let i = 0; i < 10; i++) {
            const span = document.createElement('span');
            span.textContent = Math.floor(Math.random() * 10);
            digitInner.appendChild(span);
        }
        
        // Add final digit
        const finalDigit = document.createElement('span');
        finalDigit.textContent = digit;
        digitInner.appendChild(finalDigit);
        
        digitContainer.appendChild(digitInner);
        valueDisplay.appendChild(digitContainer);
    });
    
    // Animate adds and subs
    addsDisplay.textContent = `+${scoreData.life_adds}`;
    subsDisplay.textContent = `-${scoreData.life_subs}`;
    
    // Show perfect bonus if applicable
    if (scoreData.perfect_bonus) {
        bonusDisplay.classList.remove('hidden');
        // Play special bonus sound
        const bonusSound = new Audio('/static/sounds/jackpot.mp3');
        bonusSound.volume = 0.4;
        bonusSound.play();
    } else {
        bonusDisplay.classList.add('hidden');
    }
}

// Authentication Functions
async function handleSignup(event) {
    event.preventDefault();
    
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    const formData = {
        username: document.getElementById('username').value,
        password: password
    };
    
    try {
        const response = await fetch('/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            window.location.href = '/';
        } else {
            const data = await response.json();
            alert(data.error || 'Signup failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const formData = {
        username: document.getElementById('username').value,
        password: document.getElementById('password').value
    };
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        if (response.ok) {
            window.location.href = '/';
        } else {
            const data = await response.json();
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
    }
}

async function logout() {
    try {
        const response = await fetch('/logout', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin'
        });

        if (response.ok) {
            // Redirect to home page after successful logout
            window.location.href = '/';
        } else {
            console.error('Logout failed:', response.status);
            showMessage('Failed to logout. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Error during logout:', error);
        showMessage('An error occurred during logout. Please try again.', 'error');
    }
}

// Calendar Functions
async function loadUserScores() {
    try {
        const response = await fetch('/get_user_scores');
        const scores = await response.json();
        
        if (response.ok) {
            displayCalendar(scores);
        }
    } catch (error) {
        console.error('Error loading scores:', error);
    }
}

function formatDateToYYYYMMDD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function displayCalendar(scores) {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    calendar.innerHTML = '';
    
    try {
        // Validate scores data
        if (!Array.isArray(scores)) {
            console.error('Invalid scores data:', scores);
            showMessage('Error loading calendar data', 'error');
            return;
        }
        
        // Create a map of dates to scores, with validation
        const scoreMap = new Map();
        scores.forEach(score => {
            if (score && typeof score.date === 'string' && !isNaN(score.score)) {
                scoreMap.set(score.date, score.score);
            }
        });
        
        // Get the current date and start of month
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        
        // Add day labels
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        days.forEach(day => {
            const dayLabel = document.createElement('div');
            dayLabel.className = 'calendar-day day-label';
            dayLabel.textContent = day;
            calendar.appendChild(dayLabel);
        });
        
        // Add empty cells for days before start of month
        for (let i = 0; i < startOfMonth.getDay(); i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(today.getFullYear(), today.getMonth(), day);
            const dateStr = formatDateToYYYYMMDD(date);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            if (scoreMap.has(dateStr)) {
                const score = scoreMap.get(dateStr);
                dayElement.classList.add('has-score');
                dayElement.title = `Score: ${score}%`;
                
                // Add color coding based on score
                if (score >= 80) dayElement.classList.add('high-score');
                else if (score >= 50) dayElement.classList.add('medium-score');
                else dayElement.classList.add('low-score');
            }
            
            calendar.appendChild(dayElement);
        }
    } catch (error) {
        console.error('Error displaying calendar:', error);
        showMessage('Error displaying calendar', 'error');
    }
}

// Profile Functions
async function loadUserProfile() {
    try {
        const response = await fetch('/get_user_scores');
        if (!response.ok) {
            throw new Error('Failed to fetch user scores');
        }
        
        const scores = await response.json();
        
        // Calculate statistics
        const percentages = scores.map(score => score.score);
        const average = percentages.length > 0 
            ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) 
            : 0;
        const best = percentages.length > 0 ? Math.max(...percentages) : 0;
        
        // Update statistics display
        document.getElementById('average-score').textContent = `${average}%`;
        document.getElementById('best-score').textContent = `${best}%`;
        document.getElementById('total-quizzes').textContent = scores.length;
        
        // Create score chart
        const ctx = document.getElementById('score-chart');
        if (ctx) {
            const chartData = scores.slice(-10).reverse(); // Get last 10 scores
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartData.map(score => new Date(score.date).toLocaleDateString()),
                    datasets: [{
                        label: 'Score History',
                        data: chartData.map(score => score.score),
                        borderColor: '#4CAF50',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            title: {
                                display: true,
                                text: 'Score (%)'
                            }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Date'
                            }
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('Failed to load profile data', 'error');
    }
}

function showMessage(message, type = 'error') {
    const messageBox = document.createElement('div');
    messageBox.className = `message ${type}`;
    messageBox.textContent = message;
    
    // Remove any existing messages
    const existingMessages = document.querySelectorAll('.message');
    existingMessages.forEach(msg => msg.remove());
    
    // Add new message
    document.body.appendChild(messageBox);
    
    // Add fade-in animation
    setTimeout(() => messageBox.classList.add('visible'), 10);
    
    // Remove after 5 seconds
    setTimeout(() => {
        messageBox.classList.remove('visible');
        setTimeout(() => messageBox.remove(), 300);
    }, 5000);
}

function createScoreParticles() {
    const center = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2
    };
    
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'score-increase-particles';
        
        // Random angle and distance
        const angle = (Math.random() * 360) * (Math.PI / 180);
        const distance = 100 + Math.random() * 100;
        
        // Calculate end position
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.left = `${center.x}px`;
        particle.style.top = `${center.y}px`;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 1000);
    }
}

function showScoreIncrease() {
    const scoreIncrease = document.createElement('div');
    scoreIncrease.className = 'score-increase';
    
    // Start the counter animation
    let startValue = 0;
    const endValue = 100;
    const duration = 1220; // 1.22 seconds
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth slowdown
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);
        
        scoreIncrease.textContent = `+${currentValue}`;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
    document.body.appendChild(scoreIncrease);
    
    // Create particles
    createScoreParticles();
    
    // Play a slot machine sound
    const slotSound = new Audio('/static/sounds/slot-win.mp3');
    slotSound.volume = 0.3;
    slotSound.play();
    
    setTimeout(() => scoreIncrease.remove(), 1220);
}

function showScoreDecrease() {
    const scoreDecrease = document.createElement('div');
    scoreDecrease.className = 'score-decrease';
    
    // Start the counter animation
    let startValue = 0;
    const endValue = 25;
    const duration = 1000; // 1 second
    const startTime = performance.now();
    
    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth slowdown
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easeOut);
        
        scoreDecrease.textContent = `-${currentValue}`;
        
        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        }
    }
    
    requestAnimationFrame(updateCounter);
    document.body.appendChild(scoreDecrease);
    
    // Remove the element after animation
    setTimeout(() => {
        document.body.removeChild(scoreDecrease);
    }, 1100);
}

function showPerfectScore() {
    const perfectScore = document.createElement('div');
    perfectScore.className = 'score-increase';
    perfectScore.style.fontSize = '3rem';
    perfectScore.style.background = 'rgba(148, 0, 211, 0.85)';  // Deep purple
    perfectScore.innerHTML = `
        <div style="text-align: center">
            <div style="font-size: 2.5rem">🏆 PERFECT! 🏆</div>
            <div style="color: #FFD700">+1000</div>
        </div>
    `;
    
    document.body.appendChild(perfectScore);
    
    // Create extra celebratory confetti
    for (let i = 0; i < 3; i++) {
        setTimeout(() => createConfetti(), i * 300);
    }
    
    // Play celebratory sound
    const perfectSound = new Audio('/static/sounds/slot-win.mp3');
    perfectSound.volume = 0.4;
    perfectSound.play();
    
    // Remove the element after animation
    setTimeout(() => {
        document.body.removeChild(perfectScore);
    }, 2000);
}
