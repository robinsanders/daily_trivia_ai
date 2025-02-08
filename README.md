# Daily Trivia AI

A daily trivia game that generates questions from random Wikipedia articles using AI. Similar to Wordle, users can play once per day and track their progress over time.

## Features
- Daily trivia questions generated from Wikipedia articles
- AI-powered question generation using ChatGPT
- User authentication and progress tracking
- Calendar view of past scores
- 4 multiple choice questions per day

## Development Setup

### Using Docker (Recommended)
1. Make sure you have Docker and Docker Compose installed on your system.

2. Set up environment variables in `.env`:
```
OPENAI_API_KEY=your_api_key
SECRET_KEY=your_secret_key
```

3. Build and start the containers:
```bash
docker-compose up --build
```

The application will be available at `http://localhost:5000`

### Manual Setup
1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables in `.env`:
```
OPENAI_API_KEY=your_api_key
SECRET_KEY=your_secret_key
```

3. Initialize the database:
```bash
flask db init
flask db migrate
flask db upgrade
```

4. Run the application:
```bash
python app.py
```

## Technologies Used
- Flask (Backend)
- SQLAlchemy (Database)
- LangChain (AI Integration)
- OpenAI GPT (Question Generation)
- Wikipedia API (Content Source)
- PostgreSQL (Database)
- Docker (Containerization)
