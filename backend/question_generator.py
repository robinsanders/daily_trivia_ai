import json
import logging
import os
from datetime import date
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_core.prompts.chat import (
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
)
from langchain.output_parsers import PydanticOutputParser
from jinja2 import Environment, FileSystemLoader
from .app import app, db, DailyQuestions
from .article_ingestion import ArticleIngestion
from .article_processor import ArticleProcessor
from .openai_question_schema import OpenAIQuestionSet
from .jinja_helper import process_template

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configure Jinja2 environment
template_env = Environment(
    loader=FileSystemLoader('backend/prompts'),
    trim_blocks=True,
    lstrip_blocks=True
)

class QuestionGenerator:
    def __init__(self):
        self.article_ingestion = ArticleIngestion()
        self.article_processor = ArticleProcessor()
        self.questions = []
        
        logger.info("Initializing ChatOpenAI...")
        try:
            self.model = ChatOpenAI(
                model_name="gpt-4o",
                api_key=os.getenv('OPENAI_API_KEY')
            )
            logger.info("ChatOpenAI initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing ChatOpenAI: {str(e)}")
            raise

    def generate_questions_for_chunk(self, chunk: str, num_questions: int = 4) -> None:
        """Generates questions for a given chunk using OpenAI API."""
        try:
            # First synthesize the text to extract key information
            query_template = process_template("synthesize_text.jinja", {"num_key_facts": "10"})
            query = SystemMessagePromptTemplate.from_template(query_template)
            text = HumanMessagePromptTemplate.from_template(chunk)
            chat_prompt = ChatPromptTemplate.from_messages(messages=[query, text])    
            chat_prompt_formatted = chat_prompt.format_prompt()
            synthesized_text = self.model.invoke(chat_prompt_formatted.to_messages()).content
            
            # Generate quiz questions from synthesized text
            parser = PydanticOutputParser(pydantic_object=OpenAIQuestionSet)
            query_template = process_template(
                "create_multiple_choice_quiz.jinja",
                {
                    "num_quiz_questions": str(num_questions),
                    "num_total_possible_answers": "4", 
                    "tone": "short and to the point",
                    "format_instructions": parser.get_format_instructions()
                }
            )
            query = SystemMessagePromptTemplate.from_template(query_template)
            text = HumanMessagePromptTemplate.from_template(synthesized_text)
            chat_prompt = ChatPromptTemplate.from_messages(messages=[query, text])
            chat_prompt_formatted = chat_prompt.format_prompt()
            response = self.model.invoke(chat_prompt_formatted.to_messages())
            questions_data = parser.parse(response.content)
            
            # Update questions list with the parsed data
            self.questions.extend(questions_data.model_dump()['questions'])
            logger.info(f"Generated {len(questions_data.model_dump()['questions'])} questions from chunk")
            
        except Exception as e:
            logger.error(f"Error in generate_questions_for_chunk: {str(e)}")
            logger.error(f"Synthesized text: {synthesized_text if 'synthesized_text' in locals() else 'No synthesized text'}")
            logger.error(f"Response content: {response.content if 'response' in locals() else 'No response'}")
            raise

    async def process_article(self) -> None:
        """Process article and generate questions."""
        try:
            # Process the text into chunks
            self.article_processor.process_text(self.article_ingestion.article_text)
            
            # Generate questions for each chunk
            for i, chunk in enumerate(self.article_processor.chunks):
                logger.info(f"Processing chunk {i+1} of {len(self.article_processor.chunks)}")
                self.generate_questions_for_chunk(chunk)
            
            logger.info(f"Generated total of {len(self.questions)} questions")
            
        except Exception as e:
            logger.error(f"Error processing article: {str(e)}", exc_info=True)
            raise

async def generate_daily_questions():
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
            
            # Get random article
            logger.info("Fetching random Wikipedia article...")
            await question_gen.article_ingestion.get_random_article()
            
            # Process article and generate questions
            logger.info("Processing article content...")
            await question_gen.process_article()
            
            # Prepare data for storage
            questions_data = {
                'questions': question_gen.questions,
                'source': {
                    'title': question_gen.article_ingestion.article_title,
                    'preview': question_gen.article_ingestion.article_text[:200] + '...'
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
            logger.info(f"Generated {len(question_gen.questions)} questions from article: {question_gen.article_ingestion.article_title}")
            
        except Exception as e:
            logger.error(f"Error generating daily questions: {str(e)}", exc_info=True)
            raise
