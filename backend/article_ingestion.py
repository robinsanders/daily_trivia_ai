import wikipediaapi
import logging
import random
import requests

logger = logging.getLogger(__name__)

class ArticleIngestion:
    def __init__(self):
        user_agent = "DailyTriviaAI/1.0 (https://github.com/robinsanders/daily_trivia_ai; contact@dailytriviaai.com)"
        self.wiki = wikipediaapi.Wikipedia(
            language='en',
            user_agent=user_agent
        )
        self.article_text = ""
        self.article_title = ""
        self.api_url = "https://en.wikipedia.org/w/api.php"
        self.user_agent = user_agent

    def _get_random_article_from_category(self, category: str) -> str:
        """Get a random article from a category using the MediaWiki API."""
        params = {
            "action": "query",
            "format": "json",
            "list": "categorymembers",
            "cmtitle": f"Category:{category}",
            "cmtype": "page",
            "cmlimit": "50"  # Get 50 articles at a time
        }
        
        headers = {
            "User-Agent": self.user_agent
        }
        
        try:
            response = requests.get(self.api_url, params=params, headers=headers)
            response.raise_for_status()
            data = response.json()
            
            if "query" in data and "categorymembers" in data["query"]:
                members = data["query"]["categorymembers"]
                if members:
                    random_page = random.choice(members)
                    return random_page["title"]
        except Exception as e:
            logger.warning(f"Error getting category members: {str(e)}")
        
        return None

    async def get_random_article(self) -> None:
        """Fetch and store text content from a random Wikipedia article."""
        logger.info("Fetching random Wikipedia article")
        
        categories = ['Pirates', 'Association_football', 'Basketball', 'Artificial_intelligence', 'Personal_finance']
        max_retries = 10
        attempts = 0
        
        while attempts < max_retries:
            try:
                # Get a random category and article
                random_category = random.choice(categories)
                logger.info(f"Trying category: {random_category}")
                
                article_title = self._get_random_article_from_category(random_category)
                if not article_title:
                    logger.warning(f"No articles found in category: {random_category}")
                    attempts += 1
                    continue
                
                page = self.wiki.page(article_title)
                
                # If we got a valid page with enough content
                if (page and page.exists() and 
                    len(page.text) > 1000 and 
                    not page.title.lower().endswith('(disambiguation)')):
                    logger.info(f"Selected article: {page.title}")
                    self.article_text = page.text
                    self.article_title = page.title
                    return
                
                logger.info(f"Skipping incompatible article: {page.title if page else 'None'}")
            except Exception as e:
                logger.warning(f"Error fetching article: {str(e)}")
            
            attempts += 1
        
        raise Exception(f"Failed to find suitable article after {max_retries} attempts")
