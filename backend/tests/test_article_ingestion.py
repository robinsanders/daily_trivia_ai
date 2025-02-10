import pytest
import asyncio
from src.article_ingestion import ArticleIngestion

@pytest.mark.asyncio
async def test_get_random_article():
    """Test that we can successfully fetch a random article."""
    article_ingestion = ArticleIngestion()
    await article_ingestion.get_random_article()
    
    # Check that we got an article with content
    assert article_ingestion.article_text != ""
    assert len(article_ingestion.article_text) > 1000
    assert article_ingestion.article_title != ""
    assert not article_ingestion.article_title.lower().endswith('(disambiguation)')
    
    # Get the Wikipedia URL for the article
    page = article_ingestion.wiki.page(article_ingestion.article_title)
    article_url = page.fullurl
    
    # Save the article text to a file
    with open('raw_scraped.txt', 'w', encoding='utf-8') as f:
        f.write(f"Title: {article_ingestion.article_title}\n")
        f.write(f"URL: {article_url}\n\n")
        f.write(article_ingestion.article_text)

@pytest.mark.asyncio
async def test_get_random_article_multiple_attempts():
    """Test that we can fetch multiple random articles successfully."""
    article_ingestion = ArticleIngestion()
    
    # Try fetching 3 different articles
    for _ in range(3):
        await article_ingestion.get_random_article()
        assert article_ingestion.article_text != ""
        assert len(article_ingestion.article_text) > 1000
        assert article_ingestion.article_title != ""
