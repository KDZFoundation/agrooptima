
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, JSON, Boolean
from sqlalchemy.orm import relationship

# Support both relative and absolute imports
try:
    from .database import Base
except ImportError:
    from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(String, default="ADVISOR") # 'ADMIN' or 'ADVISOR'
    is_active = Column(Boolean, default=True)

    # Relacja: Jeden doradca ma wielu rolników
    farmers = relationship("FarmerClient", back_populates="advisor")


class FarmerClient(Base):
    __tablename__ = "farmers"

    # Klucz główny to 9-cyfrowy numer producenta (EP)
    producer_id = Column(String(9), primary_key=True, index=True)
    
    # Klucz obcy do doradcy (User)
    advisor_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    total_area = Column(Float, default=0.0)
    status = Column(String, default="ACTIVE")
    last_contact = Column(String) # YYYY-MM-DD

    # Relacje
    advisor = relationship("User", back_populates="farmers")
    documents = relationship("FarmerDocument", back_populates="farmer", cascade="all, delete-orphan")
    fields = relationship("Field", back_populates="farmer", cascade="all, delete-orphan")


class FarmerDocument(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, index=True)
    farmer_id = Column(String, ForeignKey("farmers.producer_id"))
    name = Column(String)
    type = Column(String)
    category = Column(String)
    campaign_year = Column(String)
    size = Column(String)
    upload_date = Column(String)

    farmer = relationship("FarmerClient", back_populates="documents")


class Field(Base):
    __tablename__ = "fields"

    id = Column(String, primary_key=True, index=True)
    farmer_id = Column(String, ForeignKey("farmers.producer_id"))
    name = Column(String)
    registration_number = Column(String, nullable=True)
    area = Column(Float)
    eligible_area = Column(Float)
    crop = Column(String)

    farmer = relationship("FarmerClient", back_populates="fields")
    history = relationship("FieldHistory", back_populates="field", cascade="all, delete-orphan")


class FieldHistory(Base):
    __tablename__ = "field_history"

    id = Column(Integer, primary_key=True, index=True) 
    field_id = Column(String, ForeignKey("fields.id"))
    year = Column(Integer)
    crop = Column(String)
    applied_eco_schemes = Column(JSON, default=[]) 
    liming_date = Column(String, nullable=True)
    soil_ph = Column(Float, nullable=True)

    field = relationship("Field", back_populates="history")


class SubsidyRate(Base):
    __tablename__ = "subsidy_rates"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    rate = Column(Float)
    unit = Column(String) 
    category = Column(String) 
    year = Column(Integer, default=2026)
