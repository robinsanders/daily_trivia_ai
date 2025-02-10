import schedule
import time
import logging
import asyncio
from .question_generator import generate_daily_questions

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

async def run_daily_questions():
    """Run the daily question generation process."""
    try:
        await generate_daily_questions()
    except Exception as e:
        logger.error(f"Error in daily question generation: {str(e)}")

def run_scheduler():
    """Configure and run the scheduler for daily question generation."""
    logger.info("Starting question generator scheduler")
    
    # Run immediately
    asyncio.run(run_daily_questions())
    
    # Schedule for daily runs
    schedule.every().day.at("00:00").do(lambda: asyncio.run(run_daily_questions()))
    
    while True:
        try:
            schedule.run_pending()
            time.sleep(60)
        except Exception as e:
            logger.error(f"Error in scheduler: {str(e)}")
            time.sleep(60)  # Wait before retrying

if __name__ == "__main__":
    logger.info("Question Generator Service Starting")
    run_scheduler()
