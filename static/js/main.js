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
        const response = await fetch('/get_questions');
        const data = await response.json();
        
        if (response.ok) {
            currentQuestions = data;
            currentQuestionIndex = 0;
            score = 0;
            
            document.getElementById('welcome-screen').classList.add('hidden');
            document.getElementById('question-screen').classList.remove('hidden');
            
            showQuestion();
        } else {
            alert('Failed to load questions. Please try again later.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again later.');
    }
}

function showQuestion() {
    const question = currentQuestions.questions[currentQuestionIndex];
    const progressPercent = (currentQuestionIndex / currentQuestions.questions.length) * 100;
    
    document.getElementById('progress-fill').style.width = `${progressPercent}%`;
    document.getElementById('question-text').textContent = question.question_text;
    
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    question.choices.forEach((choice, index) => {
        const button = document.createElement('button');
        button.className = 'choice-button';
        button.textContent = choice;
        button.addEventListener('click', () => handleAnswer(index));
        choicesContainer.appendChild(button);
    });
}

function handleAnswer(choiceIndex) {
    const question = currentQuestions.questions[currentQuestionIndex];
    const buttons = document.querySelectorAll('.choice-button');
    
    buttons.forEach(button => button.disabled = true);
    
    if (choiceIndex === question.correct_answer) {
        buttons[choiceIndex].classList.add('correct');
        score++;
    } else {
        buttons[choiceIndex].classList.add('wrong');
        buttons[question.correct_answer].classList.add('correct');
    }
    
    setTimeout(() => {
        currentQuestionIndex++;
        
        if (currentQuestionIndex < currentQuestions.questions.length) {
            showQuestion();
        } else {
            showResults();
        }
    }, 1500);
}

async function showResults() {
    document.getElementById('question-screen').classList.add('hidden');
    document.getElementById('results-screen').classList.remove('hidden');
    
    const scoreDisplay = document.getElementById('score-display');
    const percentage = (score / currentQuestions.questions.length) * 100;
    scoreDisplay.innerHTML = `
        <h3>Your Score: ${score}/${currentQuestions.questions.length} (${percentage}%)</h3>
    `;
    
    const sourceInfo = document.getElementById('source-info');
    sourceInfo.innerHTML = `
        <p>Questions generated from: 
            <a href="${currentQuestions.source.url}" target="_blank">
                ${currentQuestions.source.title}
            </a>
        </p>
    `;
    
    // Submit score if user is logged in
    try {
        const response = await fetch('/submit_score', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ score })
        });
        
        if (response.ok) {
            loadUserScores();
        }
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

// Helper function to format date as ISO string
Date.prototype.toISOFormat = function() {
    return this.toISOString();
};
