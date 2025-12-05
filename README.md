# 🛡️ MedGuard: Context-Aware AI Firewall

![Status](https://img.shields.io/badge/Status-Hackathon_Prototype-orange)
![Tech](https://img.shields.io/badge/Stack-Node.js_|_Python_|_React-blue)
![AI](https://img.shields.io/badge/AI-BERT_&_Llama_Quantized-purple)

> **A multi-stage, fail-closed safety layer designed to secure Large Language Models in high-risk healthcare environments.**

---

## 🚨 The Problem
Generic safety filters in LLMs fail in medical contexts.
* **False Positives:** They flag legitimate medical terms (e.g., "incision," "bleeding," "drugs") as violent or illegal, rendering the AI useless for doctors.
* **False Negatives:** They often fail to detect subtle adversarial attacks disguised as medical inquiries (e.g., asking for "lethal dosages" under the guise of pain management).

## 💡 The Solution: MedGuard
MedGuard is a **Context-Aware Firewall** that sits between the user and the LLM. It does not rely on a single model. Instead, it uses a **Cascading Ensemble** of local BERT classifiers to dynamically adjust safety thresholds based on the semantic context of the query.

### Key Capabilities
* **🩺 Semantic Routing:** Distinguishes between a "General" query and a "Medical" query using a domain discriminator.
* **🔒 Fail-Closed Architecture:** If any component fails or confidence is low, the system defaults to **BLOCKED**.
* **⚡ PII Masking Engine:** Automatically detects and redacts Names, MRNs, and PIDs *before* data leaves the local environment.
* **🚀 Hybrid Cloud Inference:** Runs safety checks locally (low latency) and routes safe queries to a **4-bit Quantized LLM** running on a T4 GPU (Kaggle).

---

## 🏗️ System Architecture

MedGuard operates on a **"0-1-0" Logic Pipeline**:

1.  **Layer 1: General Harm Filter (Local)**
    * Blocks obvious hate speech, harassment, and non-medical violence.
2.  **Layer 2: Medical Discriminator (Local)**
    * Classifies if the query is medical or general.
3.  **Layer 3: Medical Harm Classifier (Local)**
    * A specialized model trained on synthetic adversarial medical data (e.g., overdose attempts, toxic combinations).

Only if a query passes the specific checks for its context is it forwarded to the LLM.

```mermaid
graph TD
    User[User Query] --> PII[PII Masking Engine]
    PII --> Gateway[Node.js Gateway]
    
    subgraph "Local Safety Cluster (Parallel Execution)"
        Gateway --> ModelA[General Harm Model]
        Gateway --> ModelB[Medical Discriminator]
        Gateway --> ModelC[Medical Harm Model]
    end
    
    ModelA & ModelB & ModelC --> Router{Decision Router}
    
    Router -- "Harm Detected" --> Block[🛑 Block Response]
    
    Router -- "Safe Medical" --> Cloud[☁️ Kaggle T4 GPU]
    Router -- "Safe General" --> Cloud
    
    Cloud --> Response[Generative Response]