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
});

// Game Functions
async function startGame() {
    try {
        console.log('Starting game...');
        const response = await fetch('/get_questions');
        console.log('Response:', response);
        
        if (response.status === 403) {
            showMessage('Please log in to play the daily quiz!', 'info');
            return;
        }
        
        if (!response.ok) {
            throw new Error('Failed to fetch questions');
        }

        currentQuestions = await response.json();
        console.log('Questions loaded:', currentQuestions);
        
        if (!currentQuestions || !currentQuestions.questions || currentQuestions.questions.length === 0) {
            showMessage('No questions available for today. Please check back later!', 'info');
            return;
        }

        // Reset game state
        currentQuestionIndex = 0;
        score = 0;
        
        // Show first question
        document.getElementById('welcome-screen').classList.add('hidden');
        document.getElementById('question-screen').classList.remove('hidden');
        showQuestion();
        
    } catch (error) {
        console.error('Error starting game:', error);
        showMessage('Log in or sign up to take the quiz!', 'error');
    }
}

function showQuestion() {
    try {
        console.log('Showing question:', currentQuestionIndex);
        console.log('Current questions:', currentQuestions);
        
        if (!currentQuestions || !currentQuestions.questions) {
            console.error('No questions data available');
            alert('Failed to load questions. Please try again.');
            return;
        }
        
        const question = currentQuestions.questions[currentQuestionIndex];
        if (!question) {
            console.error('Question not found at index:', currentQuestionIndex);
            alert('Error loading question. Please try again.');
            return;
        }
        console.log('Current question:', question);
        
        const progressPercent = (currentQuestionIndex / currentQuestions.questions.length) * 100;
        console.log('Progress:', progressPercent);
        
        // Animate progress bar
        const progressFill = document.getElementById('progress-fill');
        if (!progressFill) {
            console.error('Progress fill element not found');
            return;
        }
        console.log('Progress fill element:', progressFill);
        progressFill.style.width = `${progressPercent}%`;
        
        // Add fade-in animation for question
        const questionText = document.getElementById('question-text');
        if (!questionText) {
            console.error('Question text element not found');
            return;
        }
        console.log('Question text element:', questionText);
        questionText.style.opacity = '0';
        questionText.textContent = question.text;
        setTimeout(() => {
            questionText.style.opacity = '1';
        }, 50);
        
        const choicesContainer = document.getElementById('choices');
        if (!choicesContainer) {
            console.error('Choices container not found');
            return;
        }
        console.log('Choices container:', choicesContainer);
        choicesContainer.innerHTML = '';
        
        if (!Array.isArray(question.answers)) {
            console.error('Question answers is not an array:', question.answers);
            return;
        }
        
        // Add staggered animation for choices
        question.answers.forEach((choice, index) => {
            if (!choice || typeof choice.text !== 'string') {
                console.error('Invalid choice at index', index, ':', choice);
                return;
            }
            console.log('Creating choice button:', choice);
            const button = document.createElement('button');
            button.className = 'choice-button';
            button.textContent = choice.text;
            button.style.opacity = '0';
            button.style.transform = 'translateY(20px)';
            button.addEventListener('click', () => handleAnswer(index));
            choicesContainer.appendChild(button);
            
            setTimeout(() => {
                button.style.opacity = '1';
                button.style.transform = 'translateY(0)';
            }, 100 * (index + 1));
        });
    } catch (error) {
        console.error('Error in showQuestion:', error);
        alert('An error occurred while displaying the question. Please try again.');
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
    
    buttons.forEach(button => {
        button.disabled = true;
    });
    
    // Find the correct answer index
    const correctIndex = question.answers.findIndex(answer => answer.is_correct);
    console.log('Correct index:', correctIndex);
    
    // Add animation for correct/wrong answers
    if (choiceIndex === correctIndex) {
        console.log('Correct answer!');
        questionText.classList.add('correct');
        buttons[choiceIndex].classList.add('correct');
        score++;
        playSound('correct');
        createConfetti();
        showScoreIncrease();
        
        // Add success message
        const explanation = document.createElement('div');
        explanation.className = 'answer-explanation';
        explanation.style.background = 'var(--success-color)';
        explanation.innerHTML = `
            <p class="explanation-text">
                <strong>Excellent!</strong> That's the correct answer!
            </p>
        `;
        questionText.parentNode.insertBefore(explanation, questionText.nextSibling);
        
        proceedToNextQuestion(1500); // Give more time to celebrate correct answers
    } else {
        console.log('Wrong answer!');
        questionText.classList.add('incorrect');
        buttons[choiceIndex].classList.add('wrong');
        buttons[correctIndex].classList.add('correct');
        playSound('wrong');
        
        // Add explanation text below the question
        const explanation = document.createElement('div');
        explanation.className = 'answer-explanation';
        explanation.innerHTML = `
            <p class="explanation-text">
                <strong>Correct Answer:</strong> ${question.answers[correctIndex].text}
            </p>
        `;
        questionText.parentNode.insertBefore(explanation, questionText.nextSibling);
        
        proceedToNextQuestion(2650);
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
    // Optional: Add sound effects for correct/wrong answers
    const audio = new Audio();
    audio.volume = 0.5;
    if (type === 'correct') {
        audio.src = '/static/sounds/correct.mp3';
    } else {
        audio.src = '/static/sounds/wrong.mp3';
    }
    audio.play().catch(() => {}); // Ignore errors if sound can't play
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
        submitScore(Math.round(percentage));
        
        // Load and display calendar if user is logged in
        if (document.getElementById('calendar')) {
            loadUserScores();
        }
    } catch (error) {
        console.error('Error in showResults:', error);
        alert('An error occurred while displaying results. Your score may not have been saved.');
    }
}

async function submitScore(finalScore) {
    try {
        const response = await fetch('/submit_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score: finalScore })
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit score');
        }
        
        const data = await response.json();
        console.log('Score submitted successfully:', data);
    } catch (error) {
        console.error('Error submitting score:', error);
    }
}

// Authentication Functions
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

async function logout() {
    try {
        const response = await fetch('/logout');
        if (response.ok) {
            window.location.reload();
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during logout');
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

function displayCalendar(scores) {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    calendar.innerHTML = '';
    
    // Create a map of dates to scores
    const scoreMap = new Map(scores.map(score => [score.date, score.score]));
    
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
        const dateStr = new Date(today.getFullYear(), today.getMonth(), day).toISOFormat().split('T')[0];
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = day;
        
        if (scoreMap.has(dateStr)) {
            dayElement.classList.add('has-score');
            dayElement.title = `Score: ${scoreMap.get(dateStr)}`;
        }
        
        calendar.appendChild(dayElement);
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

// Helper function to format date as ISO string
Date.prototype.toISOFormat = function() {
    return this.toISOString();
};

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
