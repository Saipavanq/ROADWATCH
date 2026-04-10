"""
RoadWatch AI Microservice
FastAPI mock service — returns realistic AI analysis results
Can be swapped with a real PyTorch/TensorFlow model
"""

import os
import random
import time
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── FastAPI App ───────────────────────────────────────────────
app = FastAPI(
    title="RoadWatch AI Service",
    description="Image analysis microservice for road issue detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic Models ───────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    image_path: str
    complaint_id: Optional[str] = None

class AnalysisResult(BaseModel):
    issue_type: str
    severity: str
    confidence: float
    notes: str
    processing_time_ms: int
    model_version: str = "mock-v1.0"

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

# ── Issue Types & Severity Logic ──────────────────────────────
ISSUE_TYPES    = ["pothole", "crack", "waterlogging", "broken_divider", "missing_signage", "other"]
ISSUE_WEIGHTS  = [0.40, 0.25, 0.15, 0.08, 0.07, 0.05]

SEVERITY_MAP = {
    "pothole":        ["medium", "high", "critical"],
    "crack":          ["low", "medium", "high"],
    "waterlogging":   ["medium", "high"],
    "broken_divider": ["high", "critical"],
    "missing_signage":["low", "medium"],
    "other":          ["low", "medium"],
}

NOTES_MAP = {
    "pothole": [
        "Deep surface depression detected (est. 8-15cm). Immediate repair required to prevent vehicle damage.",
        "Multiple pothole clusters identified. High-traffic zone — prioritize urgent patching.",
        "Fresh pothole formation detected. Early intervention could prevent escalation.",
    ],
    "crack": [
        "Longitudinal cracking pattern detected along wheel path. Fatigue-induced structural issue.",
        "Transverse cracking visible — possible thermal contraction or base failure.",
        "Alligator cracking pattern detected. Indicates advanced pavement distress.",
    ],
    "waterlogging": [
        "Standing water accumulation detected. Poor drainage or blocked storm inlet suspected.",
        "Water ponding visible — risk of aquaplaning. Drainage infrastructure assessment needed.",
    ],
    "broken_divider": [
        "Road divider structural damage identified. Active traffic safety hazard.",
        "Missing divider section detected. Immediate barrier placement recommended.",
    ],
    "missing_signage": [
        "Traffic sign absence detected at junction. Road safety compromise.",
        "Speed/warning sign missing — requires urgent replacement.",
    ],
    "other": [
        "General road surface anomaly detected. On-site inspection recommended.",
        "Unclassified road infrastructure issue detected.",
    ],
}

# ── Endpoints ─────────────────────────────────────────────────
@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok", service="RoadWatch AI Service", version="1.0.0")


@app.post("/analyze", response_model=AnalysisResult)
def analyze_image(request: AnalyzeRequest):
    """
    Analyze a road image and return issue classification.
    
    In production, this would:
    1. Load the image from disk / object storage
    2. Preprocess it (resize, normalize)
    3. Run inference through a CNN/ViT model
    4. Return structured classification results
    
    Currently returns realistic mock data.
    """
    start = time.time()

    # Validate image file exists (if accessible)
    image_path = Path(request.image_path)

    # Simulate processing time (100–800ms)
    processing_delay = random.uniform(0.1, 0.8)
    time.sleep(processing_delay)

    # Weighted random issue type selection
    issue_type = random.choices(ISSUE_TYPES, weights=ISSUE_WEIGHTS, k=1)[0]

    # Severity selection based on issue type
    severity = random.choice(SEVERITY_MAP[issue_type])

    # Confidence: 0.72 – 0.97
    confidence = round(random.uniform(0.72, 0.97), 3)

    # Random note from the issue's notes pool
    notes = random.choice(NOTES_MAP[issue_type])

    processing_time_ms = int((time.time() - start) * 1000)

    return AnalysisResult(
        issue_type=issue_type,
        severity=severity,
        confidence=confidence,
        notes=notes,
        processing_time_ms=processing_time_ms,
    )


@app.get("/model-info")
def model_info():
    return {
        "model": "RoadWatch-CNN-Mock",
        "version": "1.0.0",
        "classes": ISSUE_TYPES,
        "input_size": [224, 224, 3],
        "framework": "mock",
        "note": "Replace with real PyTorch/TensorFlow model for production",
    }


# ── Dev server ────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
