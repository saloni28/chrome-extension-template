# Use Python image
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy code
COPY . .

# Set the Flask entrypoint
ENV PYTHONUNBUFFERED=1
CMD ["python", "main.py"]
