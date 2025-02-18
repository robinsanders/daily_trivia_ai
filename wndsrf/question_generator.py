import wikipediaapi
import random
from langchain_community.chat_models import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from datetime import date
import json
import schedule
import time
from app import app, db, DailyQuestions
import os
from dotenv import load_dotenv

load_dotenv()

def get_random_wikipedia_article():
    wiki = wikipediaapi.Wikipedia('TriviaAI/1.0 (your@email.com)', 'en')
    print("Getting random Wikipedia article...")
    while True:
        random_page = wiki.page('Special:Random')
        
        # Check if the article is long enough and not a disambiguation page
        if len(random_page.text) > 1000 and not random_page.title.endswith('(disambiguation)'):
            return {
                'title': random_page.title,
                'content': random_page.text[:2000],  # Limit content length
                'url': random_page.fullurl
            }

def generate_questions(article):
    llm = ChatOpenAI(
        model_name="gpt-3.5-turbo",
        temperature=0.7,
        api_key=os.getenv('OPENAI_API_KEY')
    )
    
    template = """
    Generate 4 multiple choice trivia questions based on this Wikipedia article. 
    Format the response as a JSON array where each question object has:
    - question_text
    - choices (array of 4 strings)
    - correct_answer (index of correct answer, 0-3)
    
    Article Title: {title}
    Content: {content}
    
    Make sure the questions are interesting and vary in difficulty.
    """
    
    prompt = ChatPromptTemplate.from_template(template)
    
    messages = prompt.format_messages(
        title=article['title'],
        content=article['content']
    )
    
    response = llm.invoke(messages)
    questions = json.loads(response.content)
    
    # Add source information
    return {
        'questions': questions,
        'source': {
            'title': article['title'],
            'url': article['url']
        }
    }

def generate_daily_questions():
    with app.app_context():
        today = date.today()
        
        # Check if questions already exist for today
        if DailyQuestions.query.filter_by(date=today).first():
            return
        
        try:
            article = get_random_wikipedia_article()
            questions_data = generate_questions(article)
            
            # Store in database
            daily_questions = DailyQuestions(
                date=today,
                questions=json.dumps(questions_data)
            )
            db.session.add(daily_questions)
            db.session.commit()
            print(f"Generated questions for {today}")
        except Exception as e:
            print(f"Error generating questions: {e}")

def run_scheduler():
    # Generate questions immediately if none exist for today
    generate_daily_questions()
    
    # Schedule to run daily at midnight
    schedule.every().day.at("00:00").do(generate_daily_questions)
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    run_scheduler()
