from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from datetime import date
import os
from dotenv import load_dotenv
import json
import bcrypt
import logging

load_dotenv()

app = Flask(__name__, 
           template_folder='../frontend/templates',
           static_folder='../frontend/static')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev')
app.config['PERMANENT_SESSION_LIFETIME'] = 60 * 60 * 24 * 30  # 30 days
app.config['SESSION_COOKIE_SECURE'] = False  # Allow non-HTTPS in development
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['REMEMBER_COOKIE_DURATION'] = 60 * 60 * 24 * 30  # 30 days
app.config['REMEMBER_COOKIE_SECURE'] = False
app.config['REMEMBER_COOKIE_HTTPONLY'] = True
app.config['REMEMBER_COOKIE_SAMESITE'] = 'Lax'
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    'postgresql://trivia_user:trivia_password@db:5432/trivia_db'
)
db = SQLAlchemy(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'
logger = logging.getLogger(__name__)

# Database Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.LargeBinary, nullable=False)
    scores = db.relationship('Score', backref='user', lazy=True)

class Score(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    date = db.Column(db.Date, nullable=False)
    total_questions = db.Column(db.Integer, nullable=False)
    correct_answers = db.Column(db.Integer, nullable=False)
    incorrect_answers = db.Column(db.Integer, nullable=False)
    life_score = db.Column(db.Integer, nullable=False)

class DailyQuestions(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    questions = db.Column(db.Text, nullable=False)  # JSON string of questions

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

@app.before_request
def before_request():
    if current_user.is_authenticated:
        session.permanent = True  # Make the session permanent

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        new_user = User(username=username, password=hashed)
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user)
        return jsonify({'message': 'User created successfully'})
    
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        user = User.query.filter_by(username=data['username']).first()
        
        if user and bcrypt.checkpw(data['password'].encode('utf-8'), user.password):
            login_user(user, remember=True)  # Enable remember me
            return jsonify({'message': 'Logged in successfully'})
        
        return jsonify({'error': 'Invalid username or password'}), 401
    
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/get_questions')
@login_required
def get_questions():
    if not current_user.is_authenticated:
        return jsonify({'error': 'Authentication required'}), 403
        
    today = date.today()
    daily_questions = DailyQuestions.query.filter_by(date=today).first()
    
    if daily_questions:
        try:
            questions_data = json.loads(daily_questions.questions)
            if not questions_data or not questions_data.get('questions'):
                raise ValueError('Invalid question data format')
            return jsonify(questions_data)
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Error loading questions: {e}")
            db.session.delete(daily_questions)
            db.session.commit()
            # Continue to generate new questions
    
    # If no questions available or invalid, generate them
    try:
        from question_generator import generate_daily_questions
        questions_data = generate_daily_questions()
        
        if not questions_data:
            logger.error("Question generation failed: No questions returned")
            return jsonify({'error': 'No questions available for today. Please try again later.'}), 404
            
        return jsonify(questions_data)
    except Exception as e:
        logger.error(f"Error generating questions: {e}", exc_info=True)
        return jsonify({'error': 'An error occurred while generating questions. Please try again later.'}), 500

@app.route('/profile')
@login_required
def profile():
    return render_template('profile.html')

@app.route('/submit_score', methods=['POST'])
@login_required
def submit_score():
    data = request.get_json()
    
    if not all(key in data for key in ['score', 'total_questions', 'correct_answers', 'incorrect_answers']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    try:
        today = date.today()
        existing_score = Score.query.filter_by(user_id=current_user.id, date=today).first()
        
        if existing_score:
            return jsonify({'error': 'Score already submitted for today'}), 400
        
        # Calculate life score
        all_scores = Score.query.filter_by(user_id=current_user.id).all()
        total_life_score = sum(score.score for score in all_scores)
        new_life_score = total_life_score + data['score']
        
        new_score = Score(
            user_id=current_user.id,
            score=data['score'],
            date=today,
            total_questions=data['total_questions'],
            correct_answers=data['correct_answers'],
            incorrect_answers=data['incorrect_answers'],
            life_score=new_life_score
        )
        
        db.session.add(new_score)
        db.session.commit()
        
        return jsonify({
            'message': 'Score submitted successfully',
            'score': data['score'],
            'life_score': new_life_score
        })
        
    except Exception as e:
        logger.error(f"Error submitting score: {e}")
        db.session.rollback()
        return jsonify({'error': 'An error occurred while submitting your score'}), 500

@app.route('/get_user_scores')
@login_required
def get_user_scores():
    scores = Score.query.filter_by(user_id=current_user.id).all()
    score_data = [{'date': score.date.isoformat(), 'score': score.score, 'life_score': score.life_score} for score in scores]
    return jsonify(score_data)

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', debug=True)
