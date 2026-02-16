
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date, JSON, Boolean, Text
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
    farm_name = Column(String, nullable=True) # Optional display name

    # Relacje
    advisor = relationship("User", back_populates="farmers")
    documents = relationship("FarmerDocument", back_populates="farmer", cascade="all, delete-orphan")
    fields = relationship("Field", back_populates="farmer", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="farmer", cascade="all, delete-orphan")


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
    extracted_text = Column(Text, nullable=True) # Przechowywanie OCR/Tekstu

    farmer = relationship("FarmerClient", back_populates="documents")


class Field(Base):
    __tablename__ = "fields"

    id = Column(String, primary_key=True, index=True)
    farmer_id = Column(String, ForeignKey("farmers.producer_id"))
    
    # Podstawowe dane
    name = Column(String) # Identyfikator działki ewidencyjnej (pełny TERYT)
    registration_number = Column(String, nullable=True) # Nr działki ewidencyjnej (krótki, np. 123/4)
    area = Column(Float) # Pow. gruntów ornych ogółem
    eligible_area = Column(Float) # Hektar kwalifikujący się ogółem (PEG)
    crop = Column(String) # Main/Current crop name

    # Nowe kolumny Ewidencji Gruntów (z pliku CSV)
    voivodeship = Column(String, nullable=True)
    district = Column(String, nullable=True) # Powiat
    commune = Column(String, nullable=True) # Gmina
    precinct_name = Column(String, nullable=True) # Nazwa obrębu
    precinct_number = Column(String, nullable=True) # Nr obrębu
    map_sheet = Column(String, nullable=True) # Nr arkusza mapy

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
    
    # Stores all extended CSV properties (designation, paymentList, packages, etc.)
    # Includes cropParts logic for split parcels
    extended_data = Column(JSON, default={})

    field = relationship("Field", back_populates="history")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(String, primary_key=True, index=True)
    farmer_id = Column(String, ForeignKey("farmers.producer_id"))
    year = Column(Integer)
    amount = Column(Float, default=0.0)
    currency = Column(String, default="PLN")
    status = Column(String, default="PLANNED") # PLANNED, APPROVED, PAID
    details = Column(JSON, nullable=True) # Snapshot of calculations

    farmer = relationship("FarmerClient", back_populates="payments")


class SubsidyRate(Base):
    """
    Tabela przechowująca stawki płatności oraz definicje Ekoschematów.
    """
    __tablename__ = "subsidy_rates"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    rate = Column(Float)
    unit = Column(String) 
    category = Column(String) # 'EKOSCHEMAT', 'DOPLATA', 'DOBROSTAN'
    year = Column(Integer, default=2026)
    
    # New fields for Eco-schemes details
    short_name = Column(String, nullable=True)
    points = Column(Float, nullable=True)
    combinable_with = Column(String, nullable=True) # Stores as string "E_OPN, E_PN"
    description = Column(String, nullable=True)


class CropDefinition(Base):
    """
    Słownik Upraw (Crop Dictionary) - definicje roślin.
    """
    __tablename__ = "crop_definitions"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    type = Column(String) # np. Zboża, Okopowe
    is_legume = Column(Boolean, default=False)
    is_catch_crop = Column(Boolean, default=False)


class CsvTemplate(Base):
    """
    Szablony mapowania plików CSV dla importu danych (Admin Panel).
    """
    __tablename__ = "csv_templates"

    id = Column(String, primary_key=True, index=True)
    name = Column(String)
    type = Column(String) # 'PARCELS' (Ewidencja) or 'CROPS' (Struktura Zasiewów)
    year = Column(Integer)
    separator = Column(String, default=";")
    
    # Mapuje klucze systemowe na nagłówki CSV, np. {"area": "Powierzchnia Ha", "crop": "Roślina"}
    mappings = Column(JSON, default={})
