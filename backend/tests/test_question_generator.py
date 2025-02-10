import pytest
import json
from src.question_generator import QuestionGenerator
from src.article_processor import ArticleProcessor
from src.jinja_helper import process_template
from src.openai_question_schema import OpenAIQuestionSet
from langchain_core.prompts.chat import (
    HumanMessagePromptTemplate,
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
)
from langchain.output_parsers import PydanticOutputParser

def read_test_article():
    """Read the test article from raw_scraped.txt"""
    with open('tests/test_data/raw_scraped.txt', 'r', encoding='utf-8') as f:
        lines = f.readlines()
        # Skip the title and URL lines and their following newline
        article_text = ''.join(lines[3:])
    return article_text

@pytest.mark.asyncio
async def test_question_generation_pipeline():
    """Test the entire question generation pipeline and save intermediate outputs"""
    
    # Initialize components
    question_gen = QuestionGenerator()
    article_processor = ArticleProcessor()
    
    # Read test article
    article_text = read_test_article()
    
    # Test article processing
    article_processor.process_text(article_text)
    
    # Save chunks for analysis
    with open('tests/test_data/test_output_chunks.txt', 'w', encoding='utf-8') as f:
        for i, chunk in enumerate(article_processor.chunks):
            f.write(f"\n{'='*80}\nChunk {i+1}:\n{'='*80}\n")
            f.write(chunk)
            f.write('\n')
    
    # Process each chunk and save outputs
    all_outputs = []

    for i, chunk in enumerate(article_processor.chunks):
        chunk_output = {
            'chunk_number': i + 1,
            'chunk_text': chunk
        }
        
        try:
            # Synthesize key facts from chunk
            query_template = process_template("synthesize_text.jinja", {"num_key_facts": "10"})
            query = SystemMessagePromptTemplate.from_template(query_template)
            text = HumanMessagePromptTemplate.from_template(chunk)
            chat_prompt = ChatPromptTemplate.from_messages(messages=[query, text])    
            chat_prompt_formatted = chat_prompt.format_prompt()
            synthesized_text = question_gen.model.invoke(chat_prompt_formatted.to_messages()).content
            chunk_output['synthesized_text'] = synthesized_text

            # Save the synthesized text for debugging
            with open(f'tests/test_data/test_synthesis_prompt_{i+1}.txt', 'w', encoding='utf-8') as f:
                f.write(str(chat_prompt_formatted))
            # Save the synthesized text for debugging
            with open(f'tests/test_data/test_synthesis_output_{i+1}.txt', 'w', encoding='utf-8') as f:
                f.write(str(synthesized_text))
            

            
            # Generate quiz questions from synthesized text
            question_gen.questions = []  # Reset questions for this chunk
            
            parser = PydanticOutputParser(pydantic_object=OpenAIQuestionSet)
            query_template = process_template(
                "create_multiple_choice_quiz.jinja",
                {
                    "num_quiz_questions": "5",
                    "num_total_possible_answers": "4", 
                    "tone": "short and to the point",
                    "format_instructions": parser.get_format_instructions()
                }
            )
            query = SystemMessagePromptTemplate.from_template(query_template)
            text = HumanMessagePromptTemplate.from_template(synthesized_text)
            chat_prompt = ChatPromptTemplate.from_messages(messages=[query, text])
            chat_prompt_formatted = chat_prompt.format_prompt()
            response = question_gen.model.invoke(chat_prompt_formatted.to_messages())
            questions_data = parser.parse(response.content)

            # Save the prompt for debugging
            with open(f'tests/test_data/test_question_prompt_{i+1}.txt', 'w', encoding='utf-8') as f:
                f.write(str(chat_prompt))
            
            # Save raw response for debugging
            with open(f'tests/test_data/test_output_raw_response_{i+1}.txt', 'w', encoding='utf-8') as f:
                f.write(str(questions_data.model_dump()['questions']))
            
            chunk_output['questions'] = questions_data.model_dump()['questions']
            
        except Exception as e:
            chunk_output['error'] = f"Error in processing: {str(e)}"
        
        all_outputs.append(chunk_output)

        # Only process one chunk for testing to save API calls
        break
    
    # Save all outputs to a JSON file for analysis
    with open('tests/test_data/all_outputs.json', 'w', encoding='utf-8') as f:
        json.dump(all_outputs, f, indent=2, ensure_ascii=False)
    
    # Print debug info if there are errors
    if 'error' in all_outputs[0]:
        print(f"\nError encountered: {all_outputs[0]['error']}")
        if 'raw_response' in all_outputs[0]:
            print(f"\nRaw response: {all_outputs[0]['raw_response']}")
    
    # Basic assertions
    assert len(article_processor.chunks) > 0, "No chunks were generated"
    assert all_outputs[0]['synthesized_text'], "Synthesized text is empty"
    
    # Check for errors before asserting questions
    if 'error' in all_outputs[0]:
        pytest.fail(f"Error in processing: {all_outputs[0]['error']}")
    assert len(all_outputs[0].get('questions', [])) > 0, "No questions generated for chunk"
