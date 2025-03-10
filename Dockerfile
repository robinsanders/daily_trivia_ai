FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set environment variables
ENV FLASK_APP=backend/app.py
ENV FLASK_ENV=development
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Expose the port the app runs on
EXPOSE 5000

# Command to run the application
CMD ["python", "backend/app.py"]
