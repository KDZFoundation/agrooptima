
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import database
from pydantic import BaseModel, EmailStr, ConfigDict

app = FastAPI(title="AgroOptima API")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
models.Base.metadata.create_all(bind=database.engine)

@app.get("/health")
def health_check():
    return {"status": "online", "database": "sqlite", "app": "agrooptima"}

# --- SCHEMAS ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    fullName: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    fullName: str
    role: str

class AuthResponse(BaseModel):
    token: str
    user: UserSchema

class DocumentSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    type: str
    category: str
    campaignYear: str
    size: str
    uploadDate: str
    extractedText: Optional[str] = None

class FarmerClientSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    producerId: str
    firstName: str
    lastName: str
    totalArea: float
    status: str
    lastContact: str
    farmName: Optional[str] = None
    documents: List[DocumentSchema] = []

class CropPartSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    designation: str
    crop: str
    area: float
    ecoSchemes: List[str]
    designationZal: Optional[str] = None
    paymentList: Optional[str] = None
    plantMix: Optional[str] = None

class FieldHistorySchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    year: int
    crop: str
    appliedEcoSchemes: List[str]
    area: Optional[float] = None
    eligibleArea: Optional[float] = None
    cropParts: Optional[List[CropPartSchema]] = None
    limingDate: Optional[str] = None
    soilPh: Optional[float] = None

class FieldSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    registrationNumber: Optional[str] = None
    area: float
    eligibleArea: float
    crop: str
    history: List[FieldHistorySchema]
    voivodeship: Optional[str] = None
    district: Optional[str] = None
    commune: Optional[str] = None
    precinctName: Optional[str] = None
    precinctNumber: Optional[str] = None
    mapSheet: Optional[str] = None

class SubsidyRateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    rate: float
    unit: str
    category: str
    year: int
    shortName: Optional[str] = None
    points: Optional[float] = None
    combinableWith: Optional[str] = None
    description: Optional[str] = None

class CropDefinitionSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    type: str
    isLegume: bool
    isCatchCrop: bool

class CsvTemplateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    type: str
    year: int
    separator: str
    mappings: dict

# --- AUTH API ---

@app.post("/api/auth/register", response_model=AuthResponse)
def register(user_data: UserRegister, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = models.User(
        email=user_data.email,
        hashed_password=f"hashed_{user_data.password}",
        full_name=user_data.fullName,
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {
        "token": f"token_{new_user.id}",
        "user": UserSchema.model_validate(new_user)
    }

@app.post("/api/auth/login", response_model=AuthResponse)
def login(login_data: UserLogin, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == login_data.email).first()
    if not user or user.hashed_password != f"hashed_{login_data.password}":
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {
        "token": f"token_{user.id}",
        "user": UserSchema.model_validate(user)
    }

# --- CLIENTS API ---

@app.get("/api/clients", response_model=List[FarmerClientSchema])
def get_clients(db: Session = Depends(database.get_db)):
    clients = db.query(models.FarmerClient).all()
    return clients

@app.post("/api/clients", response_model=FarmerClientSchema)
def create_client(client: FarmerClientSchema, db: Session = Depends(database.get_db)):
    db_client = db.query(models.FarmerClient).filter(models.FarmerClient.producer_id == client.producerId).first()
    if db_client:
        db_client.first_name = client.firstName
        db_client.last_name = client.lastName
        db_client.total_area = client.totalArea
        db_client.status = client.status
        db_client.last_contact = client.lastContact
        db_client.farm_name = client.farmName
    else:
        db_client = models.FarmerClient(
            producer_id=client.producerId, first_name=client.firstName,
            last_name=client.lastName, total_area=client.totalArea,
            status=client.status, last_contact=client.lastContact,
            farm_name=client.farmName
        )
        db.add(db_client)
    db.commit()
    db.refresh(db_client)
    return db_client

@app.delete("/api/clients/{producer_id}")
def delete_client(producer_id: str, db: Session = Depends(database.get_db)):
    db.query(models.FarmerClient).filter(models.FarmerClient.producer_id == producer_id).delete()
    db.commit()
    return {"ok": True}

# --- DOCUMENTS API ---

@app.post("/api/clients/{producer_id}/documents", response_model=DocumentSchema)
def add_document(producer_id: str, doc: DocumentSchema, db: Session = Depends(database.get_db)):
    client = db.query(models.FarmerClient).filter(models.FarmerClient.producer_id == producer_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    db_doc = models.FarmerDocument(
        id=doc.id,
        farmer_id=producer_id,
        name=doc.name,
        type=doc.type,
        category=doc.category,
        campaign_year=doc.campaignYear,
        size=doc.size,
        upload_date=doc.uploadDate,
        extracted_text=doc.extractedText
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.delete("/api/clients/{producer_id}/documents/{doc_id}")
def delete_document(producer_id: str, doc_id: str, db: Session = Depends(database.get_db)):
    db.query(models.FarmerDocument).filter(
        models.FarmerDocument.farmer_id == producer_id,
        models.FarmerDocument.id == doc_id
    ).delete()
    db.commit()
    return {"ok": True}

# --- FIELDS API ---

@app.get("/api/clients/{producer_id}/fields", response_model=List[FieldSchema])
def get_fields(producer_id: str, db: Session = Depends(database.get_db)):
    fields = db.query(models.Field).filter(models.Field.farmer_id == producer_id).all()
    return fields

@app.post("/api/clients/{producer_id}/fields")
def save_fields(producer_id: str, fields: List[FieldSchema], db: Session = Depends(database.get_db)):
    existing_fields = db.query(models.Field).filter(models.Field.farmer_id == producer_id).all()
    for f in existing_fields:
        db.delete(f)
    db.commit()
    
    for f_data in fields:
        db_field = models.Field(
            id=f_data.id, farmer_id=producer_id, name=f_data.name,
            registration_number=f_data.registrationNumber, area=f_data.area,
            eligible_area=f_data.eligibleArea, crop=f_data.crop,
            voivodeship=f_data.voivodeship, district=f_data.district,
            commune=f_data.commune, precinct_name=f_data.precinctName,
            precinct_number=f_data.precinctNumber, map_sheet=f_data.mapSheet
        )
        db.add(db_field)
        for h_data in f_data.history:
            db_hist = models.FieldHistory(
                field_id=f_data.id, year=h_data.year, crop=h_data.crop,
                applied_eco_schemes=h_data.appliedEcoSchemes, liming_date=h_data.limingDate,
                soil_ph=h_data.soilPh, extended_data={
                    "area": h_data.area,
                    "eligibleArea": h_data.eligibleArea,
                    "cropParts": [p.model_dump() for p in h_data.cropParts] if h_data.cropParts else None
                }
            )
            db.add(db_hist)
    db.commit()
    return {"ok": True}

# --- TEMPLATES API ---

@app.get("/api/templates", response_model=List[CsvTemplateSchema])
def get_templates(db: Session = Depends(database.get_db)):
    return db.query(models.CsvTemplate).all()

@app.post("/api/templates", response_model=CsvTemplateSchema)
def save_template(tpl: CsvTemplateSchema, db: Session = Depends(database.get_db)):
    db_tpl = db.query(models.CsvTemplate).filter(models.CsvTemplate.id == tpl.id).first()
    if db_tpl:
        db_tpl.name = tpl.name
        db_tpl.type = tpl.type
        db_tpl.year = tpl.year
        db_tpl.separator = tpl.separator
        db_tpl.mappings = tpl.mappings
    else:
        db_tpl = models.CsvTemplate(
            id=tpl.id, name=tpl.name, type=tpl.type, year=tpl.year,
            separator=tpl.separator, mappings=tpl.mappings
        )
        db.add(db_tpl)
    db.commit()
    db.refresh(db_tpl)
    return db_tpl

# --- RATES API ---

@app.get("/api/rates", response_model=List[SubsidyRateSchema])
def get_rates(db: Session = Depends(database.get_db)):
    return db.query(models.SubsidyRate).all()

@app.post("/api/rates", response_model=SubsidyRateSchema)
def save_rate(rate: SubsidyRateSchema, db: Session = Depends(database.get_db)):
    db_rate = db.query(models.SubsidyRate).filter(models.SubsidyRate.id == rate.id).first()
    if db_rate:
        db_rate.name = rate.name
        db_rate.rate = rate.rate
        db_rate.unit = rate.unit
        db_rate.category = rate.category
        db_rate.year = rate.year
        db_rate.short_name = rate.shortName
        db_rate.points = rate.points
        db_rate.combinable_with = rate.combinableWith
        db_rate.description = rate.description
    else:
        db_rate = models.SubsidyRate(
            id=rate.id, name=rate.name, rate=rate.rate, unit=rate.unit,
            category=rate.category, year=rate.year, short_name=rate.shortName,
            points=rate.points, stone_rate=rate.stoneRate if hasattr(rate, 'stoneRate') else None,
            combinable_with=rate.combinableWith,
            description=rate.description
        )
        db.add(db_rate)
    db.commit()
    db.refresh(db_rate)
    return db_rate

@app.delete("/api/rates/{id}")
def delete_rate(id: str, db: Session = Depends(database.get_db)):
    db.query(models.SubsidyRate).filter(models.SubsidyRate.id == id).delete()
    db.commit()
    return {"ok": True}

# --- CROPS API ---

@app.get("/api/crops", response_model=List[CropDefinitionSchema])
def get_crops(db: Session = Depends(database.get_db)):
    return db.query(models.CropDefinition).all()

@app.post("/api/crops", response_model=CropDefinitionSchema)
def save_crop(crop: CropDefinitionSchema, db: Session = Depends(database.get_db)):
    db_crop = db.query(models.CropDefinition).filter(models.CropDefinition.id == crop.id).first()
    if db_crop:
        db_crop.name = crop.name
        db_crop.type = crop.type
        db_crop.is_legume = crop.isLegume
        db_crop.is_catch_crop = crop.isCatchCrop
    else:
        db_crop = models.CropDefinition(
            id=crop.id, name=crop.name, type=crop.type,
            is_legume=crop.isLegume, is_catch_crop=crop.isCatchCrop
        )
        db.add(db_crop)
    db.commit()
    db.refresh(db_crop)
    return db_crop

@app.delete("/api/crops/{id}")
def delete_crop(id: str, db: Session = Depends(database.get_db)):
    db.query(models.CropDefinition).filter(models.CropDefinition.id == id).delete()
    db.commit()
    return {"ok": True}
