import wikipediaapi
import json
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from datetime import date
import schedule
import time
from app import app, db, DailyQuestions
import os
from dotenv import load_dotenv
import logging
from jinja2 import Environment, FileSystemLoader
import tiktoken
from typing import List, Dict, Any
from pypdf import PdfReader
import aiohttp
from urllib.parse import urlparse
from youtube_transcript_api import YouTubeTranscriptApi
from pytube import YouTube
from bs4 import BeautifulSoup
import random

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure Jinja2 environment
template_env = Environment(
    loader=FileSystemLoader('prompts'),
    trim_blocks=True,
    lstrip_blocks=True
)

class QuestionGenerator:
    def __init__(self):
        self.encoder = tiktoken.encoding_for_model("gpt-4")
        self.max_tokens = 30000
        # Add debug logging to see what's happening
        logger.info("Initializing ChatOpenAI...")
        try:
            self.MODEL = ChatOpenAI(model_name="gpt-4o", api_key=os.getenv('OPENAI_API_KEY'))

            # self.MODEL = ChatOpenAI(
            #     model_name="gpt-3.5-turbo",
            #     temperature=0.7,
            #     api_key=os.getenv('OPENAI_API_KEY')
            # )
            logger.info("ChatOpenAI initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing ChatOpenAI: {str(e)}")
            raise

    def _chunk_text(self, text: str) -> List[str]:
        logger.info(f"Chunking text of length {len(text)}")
        tokens = self.encoder.encode(text)
        chunks = [
            self.encoder.decode(tokens[i:i + self.max_tokens])
            for i in range(0, len(tokens), self.max_tokens)
        ]
        logger.info(f"Split into {len(chunks)} chunks")
        return chunks

    def _is_youtube_url(self, url: str) -> bool:
        parsed_url = urlparse(url)
        return 'youtube.com' in parsed_url.netloc or 'youtu.be' in parsed_url.netloc

    def parse_pdf_to_text(self, pdf_file):
        """Parses the PDF file to extract text."""
        logger.info("Parsing PDF file")
        reader = PdfReader(pdf_file)
        doc_text = ""
        for page in reader.pages:
            doc_text += page.extract_text()
        logger.info(f"Extracted {len(doc_text)} characters from PDF")
        return doc_text

    async def _get_youtube_transcript(self, url: str) -> str:
        logger.info(f"Getting YouTube transcript for {url}")
        yt = YouTube(url)
        video_id = yt.video_id
        
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            transcript_text = ' '.join([entry['text'] for entry in transcript_list])
            logger.info(f"Retrieved transcript of length {len(transcript_text)}")
            return transcript_text
        except Exception as e:
            logger.error(f"Error getting YouTube transcript: {e}")
            raise

    async def _scrape_article(self, url: str) -> str:
        logger.info(f"Scraping article from {url}")
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                response.raise_for_status()
                soup = BeautifulSoup(await response.text(), 'html.parser')
                [s.decompose() for s in soup.find_all(['script', 'style'])]
                return ' '.join(p.get_text(strip=True) for p in soup.find_all('p') if p.get_text(strip=True))

    def get_random_wikipedia_article(self) -> Dict[str, str]:
        try:
            # Initialize Wikipedia API with a user agent
            wiki = wikipediaapi.Wikipedia(
                user_agent='TriviaAI/1.0 (contact@example.com)',
                language='en',
                extract_format=wikipediaapi.ExtractFormat.WIKI
            )
            
            # List of pirate-related search terms
            pirate_categories = [
                'Category:Pirates',
                'Category:Golden Age of Piracy',
                'Category:Caribbean pirates',
                'Category:Chinese pirates',
                'Category:Female pirates',
                'Category:Piracy in the Caribbean',
                'Category:Privateers'
            ]
            
            # Try up to 10 times to get a suitable article
            for _ in range(10):
                try:
                    # Randomly select a pirate category
                    category = random.choice(pirate_categories)
                    category_page = wiki.page(category)
                    
                    # Get all pages in the category
                    if hasattr(category_page, 'categorymembers'):
                        # Convert dictionary to list and get random article
                        articles = list(category_page.categorymembers.values())
                        if articles:
                            page = random.choice(articles)
                            
                            # Check if page meets our criteria
                            if (page.exists() 
                                and len(page.text) > 1000 
                                and not page.title.endswith('(disambiguation)')):
                                
                                logger.info(f"Successfully grabbed pirate article: {page.title}")
                                return {
                                    'title': page.title,
                                    'content': page.text[:2000],
                                    'url': page.fullurl
                                }
                            logger.info(f"Skipped article: {page.title} (too short or disambiguation)")
                    
                except Exception as e:
                    logger.error(f"Error fetching pirate article: {str(e)}")
                    continue
                
            # If we couldn't find a suitable article after 10 tries
            raise Exception("Could not find suitable pirate-related article after 10 attempts")
            
        except Exception as e:
            logger.error(f"Error in get_random_wikipedia_article: {str(e)}")
            raise

    def generate_questions_for_chunk(self, chunk: str, num_questions: int = 4) -> dict:
        """Generates questions for a given chunk using OpenAI API."""
        logger.info(f"Generating {num_questions} questions for chunk of length {len(chunk)}")
        
        try:
            # First synthesize the text
            synthesize_template = template_env.get_template('synthesize_text.jinja')
            synthesize_prompt = ChatPromptTemplate.from_template(
                synthesize_template.render(num_key_facts=9)
            )
            
            synthesize_messages = synthesize_prompt.format_messages(text=chunk)
            synthesized_text = self.MODEL.invoke(synthesize_messages).content
            
            # Then generate questions from synthesized text
            template = template_env.get_template('create_multiple_choice_quiz.jinja')
            prompt_text = template.render(
                num_quiz_questions=num_questions,
                num_total_possible_answers="4",
                tone="Southern Intelligence",
                synthesized_text=synthesized_text
            )
            
            prompt = ChatPromptTemplate.from_template(prompt_text)
            messages = prompt.format_messages(text=synthesized_text)
            
            logger.info("Sending request to OpenAI API...")
            response = self.MODEL.invoke(messages)
            questions = json.loads(response.content)
            
            logger.info(f"Generated questions successfully")
            logger.info(f"{questions}")

            return questions
            
        except Exception as e:
            logger.error(f"Error in generate_questions_for_chunk: {str(e)}")
            logger.error(f"Synthesized text: {synthesized_text if 'synthesized_text' in locals() else 'No synthesized text'}")
            logger.error(f"Response content: {response.content if 'response' in locals() else 'No response'}")
            raise

    def process_content(self, content_source: str) -> List[dict]:
        """Process content from various sources and generate questions."""
        logger.info(f"Processing content from source: {content_source}")
        
        try:
            # Get content based on source type
            if content_source.startswith('http'):
                if self._is_youtube_url(content_source):
                    doc_text = self._get_youtube_transcript(content_source)
                else:
                    doc_text = self._scrape_article(content_source)
            else:
                # Assume it's raw text content
                doc_text = content_source

            # Split text into chunks
            chunks = self._chunk_text(doc_text)
            all_questions = []
            
            # Generate questions for each chunk
            for i, chunk in enumerate(chunks):
                logger.info(f"Processing chunk {i+1} of {len(chunks)}")
                chunk_questions = self.generate_questions_for_chunk(chunk)
                all_questions.extend(chunk_questions)
            
            logger.info(f"Generated total of {len(all_questions)} questions")
            return all_questions
            
        except Exception as e:
            logger.error(f"Error processing content: {str(e)}", exc_info=True)
            raise

def generate_daily_questions():
    with app.app_context():
        today = date.today()
        logger.info(f"Starting daily question generation for {today}")
        
        # Check if questions already exist for today
        existing = DailyQuestions.query.filter_by(date=today).first()
        if existing:
            logger.info("Questions already exist for today")
            return
        
        try:
            question_gen = QuestionGenerator()
            
            logger.info("Fetching random Wikipedia article...")
            article = question_gen.get_random_wikipedia_article()
            
            logger.info("Processing article content...")
            questions = question_gen.process_content(article['content'])
            
            questions_data = {
                'questions': questions,
                'source': {
                    'title': article['title'],
                    'url': article['url']
                }
            }
            
            # Store in database
            daily_questions = DailyQuestions(
                date=today,
                questions=json.dumps(questions_data)
            )
            db.session.add(daily_questions)
            db.session.commit()
            logger.info(f"Successfully stored questions for {today}")
            
            # Log a summary
            logger.info("Daily Questions Summary:")
            logger.info(f"Source Article: {questions_data['source']['title']}")
            logger.info(f"Number of questions: {len(questions_data['questions'])}")
            logger.info(f"Article URL: {questions_data['source']['url']}")
            
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}", exc_info=True)

def run_scheduler():
    logger.info("Starting question generator scheduler")
    generate_daily_questions()  # Generate questions immediately
    
    # Schedule to run every 9 minutes
    schedule.every(5).minutes.do(generate_daily_questions)
    logger.info("Scheduled generation for every 9 minutes")
    
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    logger.info("Question Generator Service Starting")
    run_scheduler()
