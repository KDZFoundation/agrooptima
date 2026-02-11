
from fastapi import FastAPI, HTTPException, Body, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field as PydanticField
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
import os
import uvicorn
import logging

# Handle imports whether run as module or script
try:
    from . import models, database
except ImportError:
    import models
    import database

# Logger setup
logger = logging.getLogger("uvicorn")

app = FastAPI(title="AgroOptima API")

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False, 
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- SEED DATA FUNCTION ---
def seed_initial_data(db: Session):
    """
    Populates the database with demo data if empty.
    """
    try:
        user_count = db.query(models.User).count()
        if user_count > 0:
            logger.info("Startup: Database already has data. Skipping seed.")
            return

        logger.info("Startup: Database empty. Seeding demo data...")

        # 1. Create Default Advisor (User)
        advisor = models.User(
            email="user@agrooptima.pl",
            hashed_password="password", 
            full_name="Anna Nowak",
            role="ADVISOR",
            is_active=True
        )
        db.add(advisor)
        db.flush() # Flush to get advisor.id
        advisor_id = advisor.id

        # 2. Farmers (Assigned to Advisor)
        farmers = [
            models.FarmerClient(producer_id="065432109", advisor_id=advisor_id, first_name="Jan", last_name="Kowalski", total_area=11.0, status="ACTIVE", last_contact="2023-10-05"),
            models.FarmerClient(producer_id="077123456", advisor_id=advisor_id, first_name="Piotr", last_name="Nowak", total_area=45.5, status="PENDING", last_contact="2023-09-28"),
            models.FarmerClient(producer_id="055987654", advisor_id=advisor_id, first_name="Maria", last_name="Wiśniewska", total_area=8.2, status="COMPLETED", last_contact="2023-10-01"),
            models.FarmerClient(producer_id="088456123", advisor_id=advisor_id, first_name="Tadeusz", last_name="Wójcik", total_area=124.0, status="ACTIVE", last_contact="2023-10-10"),
        ]
        db.add_all(farmers)
        db.flush() 

        # 3. Fields for Jan Kowalski (065432109)
        fields_kowalski = [
            models.Field(id="f1", farmer_id="065432109", name="Działka za lasem", registration_number="145/2", area=5.4, eligible_area=5.4, crop="Pszenica"),
            models.Field(id="f2", farmer_id="065432109", name="Przy drodze", registration_number="88/1", area=2.1, eligible_area=2.05, crop="Rzepak"),
            models.Field(id="f3", farmer_id="065432109", name="Łąka nad rzeką", registration_number="12/4", area=3.5, eligible_area=3.5, crop="Trawy"),
        ]
        db.add_all(fields_kowalski)
        db.flush()

        # 4. History for Fields
        history_entries = [
            # History for f1
            models.FieldHistory(field_id="f1", year=2025, crop="Rzepak", applied_eco_schemes=["E_IPR"], soil_ph=5.5),
            models.FieldHistory(field_id="f1", year=2024, crop="Pszenica", applied_eco_schemes=[], liming_date="2024-09-10"),
            models.FieldHistory(field_id="f1", year=2023, crop="Kukurydza", applied_eco_schemes=["E_OPN"]),
            # History for f2
            models.FieldHistory(field_id="f2", year=2025, crop="Jęczmień", applied_eco_schemes=[], soil_ph=6.2),
            models.FieldHistory(field_id="f2", year=2024, crop="Mieszanka", applied_eco_schemes=["E_USU"]),
            # History for f3
            models.FieldHistory(field_id="f3", year=2025, crop="Trawy", applied_eco_schemes=["E_WOD"]),
        ]
        db.add_all(history_entries)

        # 5. Documents for Jan Kowalski
        docs = [
            models.FarmerDocument(id="d1", farmer_id="065432109", name="Wniosek_2026_Kowalski.pdf", type="PDF", category="WNIOSEK", campaign_year="2026", size="2.4 MB", upload_date="2023-10-05"),
            models.FarmerDocument(id="d2", farmer_id="065432109", name="Mapa_Gospodarstwa.gml", type="GML", category="MAPA", campaign_year="2026", size="156 KB", upload_date="2023-10-01"),
        ]
        db.add_all(docs)

        # 6. Default Rates (Subsidy Rates)
        rates = [
            # 2026 DEMO RATES
            models.SubsidyRate(id='S01', name='Rośliny bobowate', rate=700, unit='PLN/ha', category='EKOSCHEMAT', year=2026),
            models.SubsidyRate(id='S02', name='Międzyplony ozime', rate=700, unit='PLN/ha', category='EKOSCHEMAT', year=2026),
            models.SubsidyRate(id='S03', name='Integrowana Produkcja', rate=650, unit='PLN/ha', category='EKOSCHEMAT', year=2026),
            models.SubsidyRate(id='S04', name='Wymieszanie obornika', rate=200, unit='PLN/ha', category='EKOSCHEMAT', year=2026),
            models.SubsidyRate(id='S05', name='Dobrostan (Bydło)', rate=380, unit='PLN/DJP', category='DOBROSTAN', year=2026),
            models.SubsidyRate(id='S06', name='Wartość punktu', rate=100, unit='PLN/pkt', category='EKOSCHEMAT', year=2026),

            # 2025 OFFICIAL RATES (TABLE 1: DIRECT PAYMENTS)
            models.SubsidyRate(id='P25_01', name='Podstawowe wsparcie dochodów', rate=488.55, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_02', name='Płatność redystrybucyjna', rate=176.84, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_03', name='Płatność dla młodych rolników', rate=248.16, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_04', name='Płatność do bydła', rate=322.49, unit='PLN/szt.', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_05', name='Płatność do krów', rate=412.63, unit='PLN/szt.', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_06', name='Płatność do owiec', rate=110.16, unit='PLN/szt.', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_07', name='Płatność do kóz', rate=48.12, unit='PLN/szt.', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_08', name='Płatność do roślin strączkowych na nasiona', rate=879.96, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_09', name='Płatność do roślin pastewnych', rate=430.18, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_10', name='Płatność do chmielu', rate=1864.49, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_11', name='Płatność do ziemniaków skrobiowych', rate=1580.89, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_12', name='Płatność do buraków cukrowych', rate=1284.14, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_13', name='Płatność do pomidorów', rate=2097.56, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_14', name='Płatność do truskawek', rate=1495.79, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_15', name='Płatność do lnu', rate=542.69, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_16', name='Płatność do konopi włóknistych', rate=168.99, unit='PLN/ha', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_17', name='Płatność niezwiązana do tytoniu - Virginia', rate=2.24, unit='PLN/kg', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_18', name='Płatność niezwiązana do tytoniu - pozostałe', rate=2.24, unit='PLN/kg', category='DOPLATA', year=2025),
            models.SubsidyRate(id='P25_19', name='Uzupełniająca płatność podstawowa', rate=55.95, unit='PLN/ha', category='DOPLATA', year=2025),

            # 2025 OFFICIAL RATES (TABLE 2: ECO-SCHEMES)
            models.SubsidyRate(id='E25_01', name='Ekstensywne użytkowanie TUZ z obsadą zwierząt', rate=437.60, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_02', name='Międzyplony ozime lub wsiewki śródplonowe', rate=437.60, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_03', name='Plan nawożenia - wariant podstawowy', rate=87.52, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_04', name='Plan nawożenia - wariant z wapnowaniem', rate=262.56, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_05', name='Zróżnicowana struktura upraw', rate=233.13, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_06', name='Wymieszanie obornika na gruntach ornych (12h)', rate=175.04, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_07', name='Stosowanie nawozów płynnych (nierozbryzgowo)', rate=262.56, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_08', name='Uproszczone systemy uprawy', rate=262.56, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_09', name='Wymieszanie słomy z glebą', rate=87.52, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_10', name='Obszary z roślinami miododajnymi', rate=931.07, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_11', name='Integrowana Produkcja Roślin (Sadownicze)', rate=1185.24, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_12', name='Integrowana Produkcja Roślin (Jagodowe)', rate=1069.41, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_13', name='Integrowana Produkcja Roślin (Rolnicze)', rate=505.18, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_14', name='Integrowana Produkcja Roślin (Warzywne)', rate=1069.41, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_15', name='Biologiczna uprawa (Środki ochrony)', rate=310.88, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_16', name='Biologiczna uprawa (Prep. mikrobiologiczne)', rate=87.52, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_17', name='Retencjonowanie wody na TUZ', rate=245.98, unit='PLN/ha', category='EKOSCHEMAT', year=2025),
            models.SubsidyRate(id='E25_18', name='Grunty wyłączone z produkcji', rate=437.57, unit='PLN/ha', category='EKOSCHEMAT', year: 2025),
            models.SubsidyRate(id='E25_19', name='Materiał siewny (Zboża)', rate=104.15, unit='PLN/ha', category='EKOSCHEMAT', year: 2025),
            models.SubsidyRate(id='E25_20', name='Materiał siewny (Strączkowe)', rate=168.93, unit='PLN/ha', category='EKOSCHEMAT', year: 2025),
            models.SubsidyRate(id='E25_21', name='Materiał siewny (Ziemniaki)', rate=436.76, unit='PLN/ha', category='EKOSCHEMAT', year: 2025),
        ]
        if db.query(models.SubsidyRate).count() == 0:
            db.add_all(rates)

        db.commit()
        logger.info("Startup: Demo data seeded successfully.")
    except Exception as e:
        logger.error(f"Startup: Seeding failed: {e}")
        db.rollback()

# --- Database Initialization ---
@app.on_event("startup")
def startup_db_check():
    try:
        logger.info("Startup: Checking database connection and schema...")
        models.Base.metadata.create_all(bind=database.engine)
        
        with database.engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        
        db = database.SessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()

    except Exception as e:
        logger.error(f"Startup: Database connection/creation FAILED: {e}")

# --- ADMIN / DEBUG ENDPOINTS ---
@app.post("/api/admin/reset-db")
def reset_database():
    try:
        logger.warning("Admin: Resetting database schema...")
        models.Base.metadata.drop_all(bind=database.engine)
        models.Base.metadata.create_all(bind=database.engine)
        db = database.SessionLocal()
        seed_initial_data(db)
        db.close()
        return {"status": "success", "message": "Database schema reset and seeded."}
    except Exception as e:
        logger.error(f"Admin: Reset failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to reset DB: {str(e)}")

@app.get("/api/admin/tables")
def list_tables():
    try:
        inspector = inspect(database.engine)
        tables = inspector.get_table_names()
        return {"status": "success", "tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to inspect DB: {str(e)}")

# --- Pydantic Schemas ---

class FieldHistoryEntrySchema(BaseModel):
    year: int
    crop: str
    appliedEcoSchemes: List[str] = []
    limingDate: Optional[str] = None
    soilPh: Optional[float] = None
    class Config:
        from_attributes = True

class FieldSchema(BaseModel):
    id: str
    name: str
    registrationNumber: Optional[str] = None
    area: float
    eligibleArea: float
    crop: str
    history: List[FieldHistoryEntrySchema] = []
    class Config:
        from_attributes = True

class FarmerDocumentSchema(BaseModel):
    id: str
    name: str
    type: str
    category: str
    campaignYear: str
    size: str
    uploadDate: str
    class Config:
        from_attributes = True

class FarmerClientSchema(BaseModel):
    producerId: str = PydanticField(..., min_length=9, max_length=9)
    advisorId: Optional[int] = None
    firstName: str
    lastName: str
    totalArea: float
    status: str
    lastContact: str
    documents: List[FarmerDocumentSchema] = []
    class Config:
        from_attributes = True

class SubsidyRateSchema(BaseModel):
    id: str
    name: str
    rate: float
    unit: str
    category: str
    year: int = 2026
    class Config:
        from_attributes = True

class UserSchema(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    class Config:
        from_attributes = True

# --- Endpoints ---

@app.get("/")
def read_root():
    return {"status": "online", "message": "AgroOptima API is operational"}

@app.get("/health")
def health_check(db: Session = Depends(database.get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database disconnected: {str(e)}")

# Clients
@app.get("/api/clients", response_model=List[FarmerClientSchema])
def get_clients(db: Session = Depends(database.get_db)):
    clients = db.query(models.FarmerClient).all()
    result = []
    for c in clients:
        docs = [
            FarmerDocumentSchema(
                id=d.id, name=d.name, type=d.type, category=d.category,
                campaignYear=d.campaign_year, size=d.size, uploadDate=d.upload_date
            ) for d in c.documents
        ]
        result.append(FarmerClientSchema(
            producerId=c.producer_id,
            advisorId=c.advisor_id,
            firstName=c.first_name,
            lastName=c.last_name,
            totalArea=c.total_area,
            status=c.status,
            lastContact=c.last_contact,
            documents=docs
        ))
    return result

@app.post("/api/clients", response_model=FarmerClientSchema)
def create_client(client: FarmerClientSchema, db: Session = Depends(database.get_db)):
    try:
        logger.info(f"API: Received create_client request for {client.producerId} ({client.lastName})")
        db_client = db.query(models.FarmerClient).filter(models.FarmerClient.producer_id == client.producerId).first()
        
        if db_client:
            logger.info("API: Updating existing client")
            db_client.first_name = client.firstName
            db_client.last_name = client.lastName
            db_client.total_area = client.totalArea
            db_client.status = client.status
            db_client.last_contact = client.lastContact
            db.commit()
            db.refresh(db_client)
            return client
        else:
            logger.info("API: Creating new client")
            # If advisorId is not provided in payload, default to the first advisor found
            adv_id = client.advisorId
            if adv_id is None:
                first_advisor = db.query(models.User).filter(models.User.role == "ADVISOR").first()
                if first_advisor:
                    adv_id = first_advisor.id
            
            # Note: We do NOT pass 'documents' here to avoid issues with Pydantic vs SQLAlchemy relationship assignment
            new_client = models.FarmerClient(
                producer_id=client.producerId,
                advisor_id=adv_id,
                first_name=client.firstName,
                last_name=client.lastName,
                total_area=client.totalArea,
                status=client.status,
                last_contact=client.lastContact
            )
            db.add(new_client)
            db.commit()
            db.refresh(new_client)
            return client
    except Exception as e:
        logger.error(f"API Error in create_client: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create/update client: {str(e)}")

@app.delete("/api/clients/{producer_id}")
def delete_client(producer_id: str, db: Session = Depends(database.get_db)):
    client = db.query(models.FarmerClient).filter(models.FarmerClient.producer_id == producer_id).first()
    if client:
        db.delete(client)
        db.commit()
    return {"status": "success"}

# Fields
@app.get("/api/clients/{producer_id}/fields", response_model=List[FieldSchema])
def get_client_fields(producer_id: str, db: Session = Depends(database.get_db)):
    fields = db.query(models.Field).filter(models.Field.farmer_id == producer_id).all()
    result = []
    for f in fields:
        history_mapped = [
            FieldHistoryEntrySchema(
                year=h.year, crop=h.crop, appliedEcoSchemes=h.applied_eco_schemes,
                limingDate=h.liming_date, soilPh=h.soil_ph
            ) for h in f.history
        ]
        result.append(FieldSchema(
            id=f.id, name=f.name, registrationNumber=f.registration_number,
            area=f.area, eligibleArea=f.eligible_area, crop=f.crop,
            history=history_mapped
        ))
    return result

@app.post("/api/clients/{producer_id}/fields", response_model=List[FieldSchema])
def update_client_fields(producer_id: str, fields: List[FieldSchema], db: Session = Depends(database.get_db)):
    client = db.query(models.FarmerClient).filter(models.FarmerClient.producer_id == producer_id).first()
    if not client:
         raise HTTPException(status_code=404, detail="Farmer not found")

    # synchronize_session=False is crucial here to avoid errors when deleting related objects in same transaction
    db.query(models.Field).filter(models.Field.farmer_id == producer_id).delete(synchronize_session=False)
    
    new_fields_db = []
    for f in fields:
        field_db = models.Field(
            id=f.id,
            farmer_id=producer_id,
            name=f.name,
            registration_number=f.registrationNumber,
            area=f.area,
            eligible_area=f.eligibleArea,
            crop=f.crop
        )
        db.add(field_db)
        db.flush() 

        for h in f.history:
            hist_db = models.FieldHistory(
                field_id=f.id,
                year=h.year,
                crop=h.crop,
                applied_eco_schemes=h.appliedEcoSchemes,
                liming_date=h.liming_date,
                soil_ph=h.soilPh
            )
            db.add(hist_db)
        new_fields_db.append(field_db)

    db.commit()
    return fields

# Documents
@app.post("/api/clients/{producer_id}/documents", response_model=FarmerDocumentSchema)
def add_document(producer_id: str, doc: FarmerDocumentSchema, db: Session = Depends(database.get_db)):
    new_doc = models.FarmerDocument(
        id=doc.id,
        farmer_id=producer_id,
        name=doc.name,
        type=doc.type,
        category=doc.category,
        campaign_year=doc.campaignYear,
        size=doc.size,
        upload_date=doc.uploadDate
    )
    db.add(new_doc)
    db.commit()
    return doc

@app.delete("/api/clients/{producer_id}/documents/{doc_id}")
def delete_document(producer_id: str, doc_id: str, db: Session = Depends(database.get_db)):
    doc = db.query(models.FarmerDocument).filter(models.FarmerDocument.id == doc_id).first()
    if doc:
        db.delete(doc)
        db.commit()
    return {"status": "success"}

# Rates
@app.get("/api/rates", response_model=List[SubsidyRateSchema])
def get_rates(db: Session = Depends(database.get_db)):
    return db.query(models.SubsidyRate).all()

@app.post("/api/rates", response_model=SubsidyRateSchema)
def create_or_update_rate(rate: SubsidyRateSchema, db: Session = Depends(database.get_db)):
    db_rate = db.query(models.SubsidyRate).filter(models.SubsidyRate.id == rate.id).first()
    if db_rate:
        db_rate.name = rate.name
        db_rate.rate = rate.rate
        db_rate.unit = rate.unit
        db_rate.category = rate.category
        db_rate.year = rate.year
        db.commit()
        db.refresh(db_rate)
        return db_rate
    else:
        new_rate = models.SubsidyRate(
            id=rate.id,
            name=rate.name,
            rate=rate.rate,
            unit=rate.unit,
            category=rate.category,
            year=rate.year
        )
        db.add(new_rate)
        db.commit()
        db.refresh(new_rate)
        return new_rate

@app.delete("/api/rates/{rate_id}")
def delete_rate(rate_id: str, db: Session = Depends(database.get_db)):
    rate = db.query(models.SubsidyRate).filter(models.SubsidyRate.id == rate_id).first()
    if rate:
        db.delete(rate)
        db.commit()
    return {"status": "success"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
