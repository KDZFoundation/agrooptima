FROM python:3.10-slim
WORKDIR /app
# Kopiujemy z podfolderu 'main'
COPY main/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main/ .
EXPOSE 8080
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
