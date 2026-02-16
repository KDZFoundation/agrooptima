
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

# Configure logging
logging.basicConfig()
logger = logging.getLogger("agrooptima.database")

# Force SQLite for local persistence as requested
USE_SQLITE = True
SQLITE_URL = "sqlite:///./agrooptima.db"

print("INFO: Connecting to SQLite database at ./agrooptima.db")
engine = create_engine(
    SQLITE_URL, 
    connect_args={"check_same_thread": False} # Required for SQLite with FastAPI
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency Injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
