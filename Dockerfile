# 1. Używamy lekkiego obrazu Pythona
FROM python:3.10-slim

# 2. Ustawiamy katalog roboczy
WORKDIR /app

# 3. Kopiujemy plik requirements.txt z GŁÓWNEGO KATALOGU
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Kopiujemy CAŁĄ RESZTĘ plików z głównego katalogu do kontenera
COPY . .

# 5. Otwieramy port
EXPOSE 8080

# 6. Komenda startowa uruchamiająca serwer
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080}"]
