from pydantic import BaseModel
from typing import List

class OpenAIAnswer(BaseModel):
    text: str
    is_correct: bool

class OpenAIQuestion(BaseModel):
    text: str
    answers: List[OpenAIAnswer]

class OpenAIQuestionSet(BaseModel):
    questions: List[OpenAIQuestion]