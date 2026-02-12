
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
            crop=f.crop,
            # Map Schema to DB columns
            voivodeship=f.voivodeship,
            district=f.district,
            commune=f.commune,
            precinct_name=f.precinctName,
            precinct_number=f.precinctNumber,
            map_sheet=f.mapSheet
        )
        db.add(field_db)
        db.flush() 

        for h in f.history:
            # Pack all extra fields into extended_data JSON
            extended_payload = {
                "area": h.area,
                "eligibleArea": h.eligibleArea,
                # Pack cropParts if they exist
                "cropParts": [part.dict() for part in h.cropParts] if h.cropParts else None,
                "designation": h.designation,
                "designationZal": h.designationZal,
                "paymentList": h.paymentList,
                "isUnreported": h.isUnreported,
                "plantMix": h.plantMix,
                "seedQuantity": h.seedQuantity,
                "organic": h.organic,
                "onwType": h.onwType,
                "onwArea": h.onwArea,
                "prskPackage": h.prskPackage,
                "prskPractice": h.prskPractice,
                "prskFruitTreeVariety": h.prskFruitTreeVariety,
                "prskFruitTreeCount": h.prskFruitTreeCount,
                "prskIntercropPlant": h.prskIntercropPlant,
                "prskUsage": h.prskUsage,
                "prskVariety": h.prskVariety,
                "zrskPackage": h.zrskPackage,
                "zrskPractice": h.zrskPractice,
                "zrskFruitTreeVariety": h.zrskFruitTreeVariety,
                "zrskFruitTreeCount": h.zrskFruitTreeCount,
                "zrskUsage": h.zrskUsage,
                "zrskVariety": h.zrskVariety,
                "rePackage": h.rePackage,
                "notes": h.notes
            }
            # Remove None values to save space
            extended_payload = {k: v for k, v in extended_payload.items() if v is not None}

            hist_db = models.FieldHistory(
                field_id=f.id,
                year=h.year,
                crop=h.crop,
                applied_eco_schemes=h.appliedEcoSchemes,
                liming_date=h.limingDate,
                soil_ph=h.soilPh,
                extended_data=extended_payload if extended_payload else {} 
            )
            db.add(hist_db)
        new_fields_db.append(field_db)

    db.commit()
    return fields
