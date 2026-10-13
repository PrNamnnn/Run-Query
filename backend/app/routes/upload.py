from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
from app.models.schemas import UploadResponse
from app.services.csv_service import csv_service

router = APIRouter(prefix="/api", tags=["upload"])

@router.post("/upload", response_model=List[UploadResponse])
async def upload_csv_files(files: List[UploadFile] = File(...)):
    results = []
    for file in files:
        if not file.filename.lower().endswith(".csv"):
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' is not a valid CSV file. Only .csv files are supported."
            )
        try:
            res = await csv_service.process_and_register_csv(file)
            results.append(UploadResponse(
                success=True,
                table_name=res["table_name"],
                row_count=res["row_count"],
                columns=res["columns"],
                message=f"Table '{res['table_name']}' created successfully with {res['row_count']} rows."
            ))
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to process '{file.filename}': {str(e)}"
            )
    return results
