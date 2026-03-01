FROM python:3.9-slim

# Install ffmpeg for universal audio format conversion
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port
EXPOSE 3000

# Start the application using gunicorn
CMD ["gunicorn", "--bind", "0.0.0.0:3000", "app:app"]
