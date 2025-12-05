from fastapi import FastAPI
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch

# Load all three models ONCE at startup
GENERAL_MODEL_ID = "shri171981/general_classifier"
MED_DISCRIM_MODEL_ID = "shri171981/medical_general_discriminator"
MED_CLASS_MODEL_ID = "shri171981/medical_classifier"

print("🔄 Loading models... this may take a bit.")

# Helper to load model and tokenizer to avoid repetitive code
def load_stuff(model_id):
    t = AutoTokenizer.from_pretrained(model_id)
    m = AutoModelForSequenceClassification.from_pretrained(model_id)
    return t, m

gen_tokenizer, gen_model = load_stuff(GENERAL_MODEL_ID)
med_disc_tokenizer, med_disc_model = load_stuff(MED_DISCRIM_MODEL_ID)
med_class_tokenizer, med_class_model = load_stuff(MED_CLASS_MODEL_ID)

print("✅ Models loaded.")

app = FastAPI()

class Query(BaseModel):
    text: str

def run_model(text, tokenizer, model):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)
        probs = torch.softmax(outputs.logits, dim=1)
        pred = torch.argmax(probs, dim=1).item()
    return int(pred), probs.tolist()

@app.post("/classify/general")
def classify_general(q: Query):
    pred, probs = run_model(q.text, gen_tokenizer, gen_model)
    return {"pred": pred, "probs": probs}

@app.post("/classify/medical-discrim")
def classify_medical_discrim(q: Query):
    pred, probs = run_model(q.text, med_disc_tokenizer, med_disc_model)
    return {"pred": pred, "probs": probs}

@app.post("/classify/medical-harm")
def classify_medical_harm(q: Query):
    pred, probs = run_model(q.text, med_class_tokenizer, med_class_model)
    return {"pred": pred, "probs": probs}