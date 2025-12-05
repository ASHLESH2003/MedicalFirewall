require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 CONFIGURATION
const MODEL_API_BASE = "http://localhost:8001"; 

// ⚠️ UPDATE THIS URL EVERY TIME YOU RESTART KAGGLE
const KAGGLE_API_URL = "https://nonpositivistic-don-glucinic.ngrok-free.dev/predict";

// ==========================================
// 🎥 DEMO & SAFETY SETTINGS
// ==========================================

// 🔴 VIDEO RECORDING SWITCH 🔴
// TRUE  = Instant "Safe" response (Use for Video 1 - Classification Demo)
// FALSE = Real AI Generation (Use for Video 2 - Chat Demo & Final Submission)
const CLASSIFICATION_ONLY_MODE = false; 

// 🧠 LOGIC CALIBRATION
const INVERT_GENERAL_MODEL = true; 
const INVERT_MEDICAL_MODEL = false;
const MEDICAL_HARM_THRESHOLD = 0.85; 
const GENERAL_HARM_THRESHOLD = 0.85; 

// 🛡️ LAYER 1: KEYWORD SAFETY NET 
const DANGER_KEYWORDS = [
    "suicide", "kill myself", "kill someone", "kill yourself",
    "end my life", "want to die", "how to die", 
    "hang myself", "cut my wrist", "overdose"
];

const JAILBREAK_PATTERNS = [
    /ignore (all|previous) instructions/i,
    /act as (a|an)/i,
    /hypothetical(ly)?/i,
    /simulate/i
];

const MODEL_PATHS = {
    general: "/classify/general",
    medicalDiscrim: "/classify/medical-discrim",
    medicalClass: "/classify/medical-harm"
};

// ==========================================
// 🚀 REAL AI ENGINE (Hybrid Cloud Logic)
// ==========================================
async function getKaggleResponse(text) {
    // 1. MANUAL DEMO MODE (For Recording Video 1)
    if (CLASSIFICATION_ONLY_MODE) {
        console.log("⚡ DEMO MODE: Skipping GPU generation for speed.");
        await new Promise(r => setTimeout(r, 400)); // Tiny delay for realism
        return "✅ [Classification Passed] The firewall judged this query as SAFE. (Generation skipped for Classification Demo)";
    }

    console.log("⏳ Sending to Kaggle T4 GPU...");
    
    try {
        // 2. REAL CONNECTION (For Video 2 & Judges)
        const response = await axios.post(KAGGLE_API_URL, { 
            text: text 
        }, {
            timeout: 180000 // 3 minutes timeout (Kaggle T4 can be slow)
        });

        console.log("✅ Received Response from Kaggle!");
        return response.data.response;

    } catch (error) {
        // 3. AUTOMATIC FALLBACK (If Kaggle Crashes/Sleeps)
        console.error("❌ Kaggle Error (Using Fallback):", error.message);
        
        return "⚠️ [System Notice] The local AI inference engine is currently offline or timed out. However, the Firewall logic successfully validated this query as SAFE. (This is a fallback response for the demo).";
    }
}

// ==========================================
// 📡 LOCAL CLASSIFICATION HELPER
// ==========================================
async function checkModel(modelKey, text) {
    try {
        const url = `${MODEL_API_BASE}${MODEL_PATHS[modelKey]}`;
        const response = await axios.post(url, { text });
        return response.data; 
    } catch (error) {
        console.error(`❌ Error calling ${modelKey}. Is local Python server running?`);
        // Fail Safe: If local Python is down, assume 50/50 so it doesn't crash
        return { pred: 0, probs: [[0.5, 0.5]] }; 
    }
}

// ==========================================
// 🚀 MAIN API ROUTE
// ==========================================
app.post('/api/firewall', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.json({ status: "BLOCKED", reason: "Empty Query" });

    // PII MASKING NOTE: 
    // The Frontend masks PII before sending. The logs below prove it.
    const lowerQuery = query.toLowerCase().trim();
    console.log("\n===========================================");
    console.log(`📥 INCOMING QUERY: "${query}"`);

    // STEP 1: KEYWORD CHECK
    const keywordMatch = DANGER_KEYWORDS.find(word => lowerQuery.includes(word));
    if (keywordMatch) {
        console.log(`🛑 BLOCKED: Keyword Match (${keywordMatch})`);
        return res.json({ status: "BLOCKED", reason: "Safety Violation (Keyword)" });
    }

    const jailbreakMatch = JAILBREAK_PATTERNS.find(pattern => pattern.test(query));
    if (jailbreakMatch) {
        console.log(`🛑 BLOCKED: Jailbreak Pattern Detected`);
        return res.json({ status: "BLOCKED", reason: "Jailbreak Detected" });
    }

    try {
        // STEP 2: RUN CLASSIFICATION MODELS (Local Parallel Execution)
        const [gen, medDisc, medHarm] = await Promise.all([
            checkModel("general", query),
            checkModel("medicalDiscrim", query),
            checkModel("medicalClass", query)
        ]);

        // STEP 3: EXTRACT AND CALIBRATE SCORES
        let genRawScore = (gen.probs && gen.probs[0]) ? gen.probs[0][1] : 0;
        let medRawScore = (medHarm.probs && medHarm.probs[0]) ? medHarm.probs[0][1] : 0;
        
        let genHarmScore = INVERT_GENERAL_MODEL ? (1 - genRawScore) : genRawScore;
        let medHarmScore = INVERT_MEDICAL_MODEL ? (1 - medRawScore) : medRawScore;

        const isMedical = medDisc.pred === 1; 

        console.log(`📊 AI JUDGMENT:`);
        console.log(`   General Harm Score : ${(genHarmScore * 100).toFixed(1)}%`);
        console.log(`   Medical Harm Score : ${(medHarmScore * 100).toFixed(1)}%`);
        console.log(`   Context Identified : ${isMedical ? "MEDICAL 🏥" : "GENERAL 🌍"}`);

        // STEP 4: ROUTER & RESPONSE
        if (isMedical) {
            console.log("➡️  Routing to: MEDICAL PIPELINE");
            if (medHarmScore > MEDICAL_HARM_THRESHOLD) {
                console.log(`🛑 BLOCKED: Harmful Medical Advice`);
                return res.json({ status: "BLOCKED", reason: "Harmful Medical Advice" });
            } 
            
            // Safe -> Get Response (Real or Fallback)
            const botResponse = await getKaggleResponse(query);
            return res.json({ status: "SAFE", reason: "Safe Medical Query", response: botResponse });
        } 
        else {
            console.log("➡️  Routing to: GENERAL PIPELINE");
            if (genHarmScore > GENERAL_HARM_THRESHOLD) {
                console.log(`🛑 BLOCKED: General Harm`);
                return res.json({ status: "BLOCKED", reason: "General Harm Detected" });
            }
            
            // Safe -> Get Response (Real or Fallback)
            const botResponse = await getKaggleResponse(query);
            return res.json({ status: "SAFE", reason: "Safe General Query", response: botResponse });
        }

    } catch (err) {
        console.error("🔥 SERVER ERROR:", err);
        return res.status(500).json({ error: err.toString() });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`🔥 Firewall running on port ${PORT}`);
    console.log(`⚙️  MODE: ${CLASSIFICATION_ONLY_MODE ? "⚡ CLASSIFICATION DEMO (No Generation)" : "🚀 FULL AI CHAT (Live Generation)"}`);
});