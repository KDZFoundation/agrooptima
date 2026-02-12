
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import logging

# Configure logging
logging.basicConfig()
logger = logging.getLogger("agrooptima.database")

# Get configuration
db_user = os.environ.get("DB_USER", "postgres")
db_pass = os.environ.get("DB_PASS", "postgres")
db_name = os.environ.get("DB_NAME", "agrooptima")
db_host = os.environ.get("DB_HOST", "localhost")
db_port = os.environ.get("DB_PORT", "5432")
instance_connection_name = os.environ.get("INSTANCE_CONNECTION_NAME") # e.g. "project:region:instance"

# Construct Postgres URL for local/TCP
POSTGRES_URL = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
SQLITE_URL = "sqlite:///./agrooptima.db"

# Determine preference
USE_SQLITE = os.environ.get("USE_SQLITE", "False").lower() == "true"

engine = None
connector = None # Keep reference to prevent GC

if not USE_SQLITE:
    try:
        if instance_connection_name:
            print(f"INFO: Detected Cloud SQL Instance: {instance_connection_name}")
            print(f"INFO: Initializing Cloud SQL Connector for user: {db_user}...")
            
            from google.cloud.sql.connector import Connector, IPTypes
            import pg8000

            # Initialize Connector
            connector = Connector()

            def getconn():
                conn = connector.connect(
                    instance_connection_name,
                    "pg8000",
                    user=db_user,
                    password=db_pass,
                    db=db_name,
                    ip_type=IPTypes.PUBLIC  # Uses public IP of Cloud SQL
                )
                return conn

            engine = create_engine(
                "postgresql+pg8000://",
                creator=getconn,
                pool_pre_ping=True
            )
            print("INFO: Engine created using Cloud SQL Connector.")
        else:
            print(f"INFO: Attempting to connect to Postgres via TCP at {db_host}...")
            # pool_pre_ping=True helps with dropped connections
            engine = create_engine(POSTGRES_URL, pool_pre_ping=True)
        
        # Test connection immediately
        with engine.connect() as connection:
            print("INFO: Postgres connection successful.")

    except Exception as e:
        print(f"WARNING: Postgres connection failed. Reason: {e}")
        engine = None

# Fallback to SQLite if Postgres failed or if explicitly requested
if engine is None:
    print("INFO: Using SQLite fallback database.")
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
