from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from groq import Groq
import os
import json
from pathlib import Path
from pypdf import PdfReader
import tempfile

env_path = Path(".env")
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DOCUMENT_STORE = {}


def ask_groq(prompt):
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def extract_pdf_text(pdf_path):
    reader = PdfReader(pdf_path)
    extracted_text = ""
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            extracted_text += page_text + "\n"
    return extracted_text


def build_combined_text():
    combined = ""
    for filename, text in DOCUMENT_STORE.items():
        combined += f"""
========================================
DOCUMENT: {filename}
========================================

{text}

"""
    return combined


def research_agent(text):
    return ask_groq(
        f"""
        You are an expert research analyst.

        Analyze all documents and provide:

        1. Key Findings
        2. Important Trends
        3. Critical Statistics
        4. Major Insights

        DOCUMENTS:

        {text}
        """
    )


def fact_check_agent(text):
    return ask_groq(
        f"""
        You are a fact-checking agent.

        Analyze all documents and provide:

        1. Major Claims
        2. Supporting Evidence
        3. Confidence Level (High/Medium/Low)

        DOCUMENTS:

        {text}
        """
    )


def contradiction_agent(text):
    return ask_groq(
        f"""
        You are a contradiction detection agent.

        Analyze all documents and find:

        1. Contradictions
        2. Conflicting Statements
        3. Missing Information
        4. Areas Needing Clarification

        DOCUMENTS:

        {text}
        """
    )


def executive_agent(research_report, fact_report, contradiction_report):
    return ask_groq(
        f"""
        You are a senior executive advisor.

        Use the outputs from the following agents:

        RESEARCH AGENT:
        {research_report}

        FACT CHECK AGENT:
        {fact_report}

        CONTRADICTION AGENT:
        {contradiction_report}

        Create:

        1. Executive Summary
        2. Opportunities
        3. Risks
        4. Recommendations
        5. Action Plan
        """
    )


def debate_agent(question, initial_answer):
    response_text = ask_groq(
        f"""
        You are a multi-perspective research panel analyzing a question.

        QUESTION:
        {question}

        INITIAL RESEARCH:
        {initial_answer}

        Respond in exactly this JSON format:
        {{
            "research_view": "...",
            "critic_view": "...",
            "judge_verdict": "...",
            "confidence_score": "...",
            "final_recommendation": "..."
        }}

        research_view: Summarize the key answer from the documents.
        critic_view: Challenge assumptions and point out weaknesses.
        judge_verdict: Final balanced conclusion weighing both sides.
        confidence_score: 0-100 integer.
        final_recommendation: One clear action or conclusion.

        Return ONLY valid JSON, no markdown, no backticks.
        """
    )
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        return json.loads(cleaned.strip())


def citation_agent(question, answer, filenames):
    filenames_list = ", ".join(filenames)
    response_text = ask_groq(
        f"""
        You are a citation detection agent.

        QUESTION:
        {question}

        ANSWER:
        {answer}

        AVAILABLE DOCUMENTS:
        {filenames_list}

        Your job:
        Look at the answer and identify which documents
        from the list above were actually used to
        generate that answer.

        Respond in exactly this JSON format:
        {{
            "sources": ["filename1.pdf", "filename2.pdf"],
            "confidence": "High"
        }}

        sources: list only filenames from AVAILABLE DOCUMENTS
        that directly contributed to the answer.
        confidence: High, Medium, or Low.

        Return ONLY valid JSON, no markdown, no backticks.
        """
    )
    try:
        return json.loads(response_text)
    except json.JSONDecodeError:
        cleaned = response_text.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("```")[1]
            if cleaned.startswith("json"):
                cleaned = cleaned[4:]
        return json.loads(cleaned.strip())


@app.get("/")
def home():
    return {"message": "ResearchOS Backend Running"}


@app.get("/test-ai")
def test_ai():
    return {"response": ask_groq("Say hello to ResearchOS.")}


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            temp_file.write(await file.read())
            temp_pdf_path = temp_file.name

        extracted_text = extract_pdf_text(temp_pdf_path)
        extracted_text = extracted_text[:15000]

        analysis = ask_groq(
            f"""
            Analyze this document.

            Provide:

            1. Executive Summary
            2. Key Findings
            3. Insights
            4. Risks

            DOCUMENT:

            {extracted_text}
            """
        )

        return {
            "filename": file.filename,
            "characters_extracted": len(extracted_text),
            "analysis": analysis
        }

    except Exception as e:
        return {"error": str(e)}


@app.post("/upload-documents")
async def upload_documents(
    pdf1: UploadFile = File(...),
    pdf2: UploadFile = File(...),
    pdf3: UploadFile = File(...),
    pdf4: UploadFile = File(None),
    pdf5: UploadFile = File(None)
):
    try:
        global DOCUMENT_STORE
        DOCUMENT_STORE = {}

        all_files = [
            f for f in [pdf1, pdf2, pdf3, pdf4, pdf5]
            if f is not None and f.filename != ""
        ]

        seen = set()
        uploaded_files = []
        for f in all_files:
            if f.filename not in seen:
                seen.add(f.filename)
                uploaded_files.append(f)

        total_characters = 0
        filenames = []
        chars_per_doc = 30000 // len(uploaded_files)

        for file in uploaded_files:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
                temp_file.write(await file.read())
                temp_pdf_path = temp_file.name

            document_text = extract_pdf_text(temp_pdf_path)
            total_characters += len(document_text)
            filenames.append(file.filename)
            DOCUMENT_STORE[file.filename] = document_text[:chars_per_doc]

        combined_text = build_combined_text()

        research_report = research_agent(combined_text)
        fact_report = fact_check_agent(combined_text)
        contradiction_report = contradiction_agent(combined_text)
        executive_report = executive_agent(research_report, fact_report, contradiction_report)

        return {
            "documents_processed": len(uploaded_files),
            "filenames": filenames,
            "total_characters": total_characters,
            "research_agent": research_report,
            "fact_check_agent": fact_report,
            "contradiction_agent": contradiction_report,
            "executive_agent": executive_report
        }

    except Exception as e:
        return {"error": str(e)}


@app.get("/ask")
def ask_question(question: str):
    global DOCUMENT_STORE

    if not DOCUMENT_STORE:
        return {"error": "No documents uploaded yet. Upload documents first."}

    combined_text = build_combined_text()
    filenames = list(DOCUMENT_STORE.keys())

    initial_answer = ask_groq(
        f"""
        You are a research assistant.

        DOCUMENTS:

        {combined_text}

        QUESTION:

        {question}

        Answer using only the documents provided.
        Be thorough and specific.
        """
    )

    debate_result = debate_agent(question, initial_answer)
    citation_result = citation_agent(question, initial_answer, filenames)

    return {
        "question": question,
        "research_agent": initial_answer,
        "critic_agent": debate_result.get("critic_view"),
        "judge_agent": {
            "verdict": debate_result.get("judge_verdict"),
            "confidence_score": debate_result.get("confidence_score"),
            "final_recommendation": debate_result.get("final_recommendation")
        },
        "citations": {
            "sources": citation_result.get("sources", []),
            "confidence": citation_result.get("confidence", "Low")
        }
    }