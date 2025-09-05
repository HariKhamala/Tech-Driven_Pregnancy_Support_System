from fastapi import FastAPI, UploadFile, File, HTTPException,Body,Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import requests
from typing import Dict, Any
import pdfplumber
import fitz
from ml_model import predict_risk_level
import torch
from transformers import pipeline, AutoTokenizer
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings, HuggingFacePipeline
from langchain.chains import ConversationalRetrievalChain

app = FastAPI(title="Pregnancy Support API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🔄 Initializing components...")
pdf_files = [
    "1-s2.0-S0002937821027289-main.pdf",
    "s40748-022-00139-9.pdf",
    "nutrients-12-01325.pdf"
]

#Research paper processing
research_text = ""
for file_path in pdf_files:
    with fitz.open(file_path) as doc:
        research_text += "".join(page.get_text("text") + "\n" for page in doc)

splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
text_chunks = splitter.split_text(research_text)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-MiniLM-L3-v2")
vectorstore = FAISS.from_texts(texts=text_chunks, embedding=embeddings)

# Initialize LLM
tokenizer = AutoTokenizer.from_pretrained("facebook/blenderbot-400M-distill")
llm_pipeline = pipeline(
    "text-generation",
    model="facebook/blenderbot-400M-distill",
    tokenizer=tokenizer,
    max_length=1024,
    max_new_tokens=500,
    truncation=True,
    device=0 if torch.cuda.is_available() else -1
)
qa_chain = ConversationalRetrievalChain.from_llm(
    llm=HuggingFacePipeline(pipeline=llm_pipeline),
    retriever=vectorstore.as_retriever(),
    max_tokens_limit=500
)
print("✅ All components initialized")

# Request Models
class PatientData(BaseModel):
    Age: float
    SystolicBP: float
    DiastolicBP: float
    BodyTemp: float
    HeartRate: float
    HRV: float
    Resp_Rate: float
    SpO2: float
    Sleep_Hours: float
    Step_Count: float
    Caloric_Burn: float
    Cycle_Length: float
    Hormonal_Symptoms: str
    BS: float

# --- API Endpoints ---

@app.post("/extract-report")
async def extract_report(file: UploadFile = File(...)):
    """Extract text from uploaded doctor's report"""
    try:
        with pdfplumber.open(file.file) as pdf:
            text = ' '.join(page.extract_text() for page in pdf.pages if page.extract_text())
        return {"text": text}
    except Exception as e:
        raise HTTPException(400, detail=f"Report extraction failed: {str(e)}")

@app.post("/predict-risk")
async def predict_risk(patient_data: PatientData):
    """Predict pregnancy risk level"""
    try:
        risk_level = predict_risk_level(patient_data.dict())
        return {"riskLevel": risk_level}
    except Exception as e:
        raise HTTPException(400, detail=f"Prediction failed: {str(e)}")

class NutritionRequest(BaseModel):
    risk_level: str
    doctor_notes: str


async def _generate_nutrition_plan_logic(risk_level: str, doctor_notes: str):
    try:
        query = f"""
        Generate a nutrition plan for a pregnant woman with {risk_level} risk.
        Medical conditions: {doctor_notes}.
        Focus on vitamins, minerals, macronutrient intake, and meal plans.
        """

        primer = """
        You are an expert pregnancy support assistant. You provide helpful, empathetic, and medically sound advice to pregnant individuals.
        Always base your answers on the given context.
        """

        res = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer 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",
                "Content-Type": "application/json"
            },
            data=json.dumps({
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": primer},
                    {"role": "user", "content": query}
                ]
            })
        )

        result = res.json()
        return {"plan": result['choices'][0]['message']['content']}
    
    except Exception as e:
        raise HTTPException(400, detail=f"Nutrition plan generation failed: {str(e)}")

@app.post("/generate-nutrition-plan")
async def generate_nutrition_plan(data: NutritionRequest = Body(...)):
    return await _generate_nutrition_plan_logic(data.risk_level, data.doctor_notes)


@app.post("/process-report")
async def process_report(
    file: UploadFile = File(...),
    patient_data: str = Form(...)
):
    try:
        patient_dict = json.loads(patient_data)

        with pdfplumber.open(file.file) as pdf:
            report_text = ' '.join(page.extract_text() for page in pdf.pages if page.extract_text())

        risk_level = predict_risk_level(patient_dict)

        nutrition_plan = await _generate_nutrition_plan_logic(risk_level, report_text)

        return {
            "report_text": report_text,
            "risk_level": risk_level,
            "nutrition_plan": nutrition_plan
        }

    except Exception as e:
        raise HTTPException(400, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)