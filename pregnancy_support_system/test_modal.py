from transformers import pipeline

print("Loading model...")
llm_pipeline = pipeline("text-generation", model="C:/models/opt-1.3b", device="cpu")
print("Model loaded successfully!")
response = llm_pipeline("Hello, how are you?", max_length=50)
print("Generated Response:", response)
