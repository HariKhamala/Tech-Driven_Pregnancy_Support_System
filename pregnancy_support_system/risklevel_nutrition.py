import pdfplumber
import fitz
import pandas as pd
from transformers import pipeline,AutoTokenizer
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_huggingface import HuggingFacePipeline
from langchain.chains import ConversationalRetrievalChain
from ml_model import train_and_save_model, predict_risk_level
import faiss
import traceback
import os
import torch
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"


# 📌 Step 1: Extract Text from Research Papers
def extract_text_from_pdfs(pdf_files):
    text_data = ""
    try:
        for file_path in pdf_files:
            with fitz.open(file_path) as doc:
                for page in doc:
                    text_data += page.get_text("text") + "\n"
        print("✅ Research papers extracted successfully.")
    except Exception as e:
        print("❌ Error extracting research papers:", e)
        traceback.print_exc()
    return text_data

pdf_files = [
    "1-s2.0-S0002937821027289-main.pdf",
    "s40748-022-00139-9.pdf",
    "nutrients-12-01325.pdf"
]
research_text = extract_text_from_pdfs(pdf_files)

# 📌 Step 2: Convert Research Papers into a Searchable Database
try:
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    text_chunks = splitter.split_text(research_text)
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/paraphrase-MiniLM-L3-v2")
    vectorstore = FAISS.from_texts(texts=text_chunks, embedding=embeddings)
    print("✅ Research papers processed into FAISS database.")
except Exception as e:
    print("❌ Error creating FAISS database:", e)
    traceback.print_exc()

# 📌 Step 3: Use Open-Source LLM (Hugging Face) for Recommendation Generation
try:
    print("🔍 Debug: Starting LLM pipeline initialization...")
    tokenizer = AutoTokenizer.from_pretrained("facebook/blenderbot-400M-distill")
    
    llm_pipeline = pipeline(
        "text-generation",
        model="facebook/blenderbot-400M-distill",
        tokenizer=tokenizer,
        max_length=1024,  # Total length (input + output)
        max_new_tokens=500,  # Maximum tokens to generate
        truncation=True,  # Explicitly enable truncation
        device=0 if torch.cuda.is_available() else -1  # Use GPU if available
    )
    
    llm = HuggingFacePipeline(pipeline=llm_pipeline)
    
    qa_chain = ConversationalRetrievalChain.from_llm(
        llm=llm,
        retriever=vectorstore.as_retriever(),
        max_tokens_limit=500  # Limit the number of tokens for the QA chain
    )
    
    print("✅ LLM and QA pipeline initialized successfully.")

except Exception as e:
    print("❌ Error initializing LLM:", e)
    traceback.print_exc()

# 📌 Step 4: Extract Text from Doctor's Report (PDF)
def extract_text_from_report(file_path):
    try:
        with pdfplumber.open(file_path) as pdf:
            text = ' '.join([page.extract_text() for page in pdf.pages if page.extract_text()])
        print("✅ Doctor's report extracted successfully.")
        return text
    except Exception as e:
        print("❌ Error extracting doctor's report:", e)
        traceback.print_exc()
        return ""


# 📌 Step 5: Generate Nutrition Recommendations Using Research Papers
import requests
import json

def get_nutrition_recommendations(risk_level, doctor_notes):
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

        # Send the request to OpenRouter.ai
        res = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer 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",  # Replace with your OpenRouter API key
            },
            data=json.dumps({
                "model": "gpt-3.5-turbo",  # Specify the model
                "messages": [
                    {"role": "system", "content": primer},
                    {"role": "user", "content": query}
                ]
            })
        )

        data = res.json()
        nutrition_plan = data['choices'][0]['message']['content']
        print("✅ Nutrition recommendations generated.")
        return nutrition_plan

    except Exception as e:
        print("❌ Error generating nutrition recommendations:", e)
        traceback.print_exc()
        return "Error generating recommendations."
# 📌 Step 6: Full Pipeline Function
def process_patient_report(file_path, patient_data):
    try:
        report_text = extract_text_from_report(file_path)
        predicted_risk = predict_risk_level(patient_data)
        nutrition_plan = get_nutrition_recommendations(predicted_risk, report_text)

        print("\n📌 **Doctor's Report Extracted:**", report_text)
        print("📌 **Predicted Pregnancy Risk Level:**", predicted_risk)
        print("📌 **Advanced Nutrition Plan:**", nutrition_plan)

        embedding_dim = 128
        index = faiss.IndexFlatL2(embedding_dim)
        print(index) 
    except Exception as e:
        print("❌ Error in execution:", e)
        traceback.print_exc()
try:
    X_test = train_and_save_model()

    sample_patient_data = X_test.iloc[1].to_dict()  # Use the second row of X_test
    process_patient_report("sample_doctor_report.pdf", sample_patient_data)

except Exception as e:
    print("❌ Error in execution:", e)
    traceback.print_exc()