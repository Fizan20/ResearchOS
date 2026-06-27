"use client";
import { useState, useRef } from "react";

const API = "https://researchos-backend-dlx4.onrender.com";

type AgentResults = {
  documents_processed: number;
  filenames: string[];
  total_characters: number;
  research_agent: string;
  fact_check_agent: string;
  contradiction_agent: string;
  executive_agent: string;
};

type AskResults = {
  question: string;
  research_agent: string;
  critic_agent: string;
  judge_agent: {
    verdict: string;
    confidence_score: number;
    final_recommendation: string;
  };
  citations: {
    sources: string[];
    confidence: string;
  };
};

type Phase = "idle" | "uploading" | "done";

// A helper to format inline bold, italics, and code blocks safely
function parseInline(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #F9FAFB; font-weight: 600;">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em style="color: #9CA3AF;">$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #E5E7EB;">$1</code>');
}

// Converts messy markdown into clean, structural React elements
function FormattedText({ text }: { text: string }) {
  if (!text) return null;
  
  const lines = text.split('\n');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((line, i) => {
        // Handle Headings (e.g., ### Heading)
        const headingMatch = line.match(/^#{1,6}\s+(.*)/);
        if (headingMatch) {
          return (
            <div key={i} style={{ color: '#F9FAFB', fontWeight: 600, marginTop: i === 0 ? '0' : '1.25rem', marginBottom: '4px', letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '13px' }}>
              <span dangerouslySetInnerHTML={{ __html: parseInline(headingMatch[1]) }} />
            </div>
          );
        }
        
        // Handle Bullet Points (*, +, -)
        const bulletMatch = line.match(/^\s*[\*\+\-]\s+(.*)/);
        if (bulletMatch) {
          return (
            <div key={i} style={{ display: 'flex', gap: '10px', paddingLeft: '4px' }}>
              <span style={{ color: '#3B82F6', flexShrink: 0 }}>•</span>
              <div dangerouslySetInnerHTML={{ __html: parseInline(bulletMatch[1]) }} />
            </div>
          );
        }

        // Handle Empty Lines
        if (!line.trim()) {
          return <div key={i} style={{ height: '4px' }} />;
        }

        // Standard Text
        return (
          <div key={i} dangerouslySetInnerHTML={{ __html: parseInline(line) }} />
        );
      })}
    </div>
  );
}

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeAgent, setActiveAgent] = useState<number>(-1);
  const [results, setResults] = useState<AgentResults | null>(null);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [askResult, setAskResult] = useState<AskResults | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const AGENTS = [
    { key: "research_agent", label: "Research Agent", desc: "Key findings, trends, statistics" },
    { key: "fact_check_agent", label: "Fact Check Agent", desc: "Claims, evidence, confidence" },
    { key: "contradiction_agent", label: "Contradiction Agent", desc: "Conflicts, gaps, inconsistencies" },
    { key: "executive_agent", label: "Executive Agent", desc: "Summary, risks, action plan" },
  ];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf").slice(0, 5);
    setFiles(prev => [...prev, ...dropped].slice(0, 5));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const picked = Array.from(e.target.files).filter(f => f.type === "application/pdf").slice(0, 5);
    setFiles(prev => [...prev, ...picked].slice(0, 5));
  }

  function removeFile(i: number) {
    setFiles(prev => prev.filter((_, idx) => idx !== i));
  }

  async function runAnalysis() {
    if (files.length < 1) { setError("Upload at least 1 PDF to run analysis."); return; }
    setError("");
    setPhase("uploading");
    setResults(null);
    setAskResult(null);
    setActiveAgent(0);

    const form = new FormData();
    form.append("pdf1", files[0]);
    form.append("pdf2", files[1] || files[0]);
    form.append("pdf3", files[2] || files[0]);
    if (files[3]) form.append("pdf4", files[3]);
    if (files[4]) form.append("pdf5", files[4]);

    const tick = (n: number) => new Promise(r => setTimeout(() => { setActiveAgent(n); r(null); }, n * 1800));

    try {
      const [res] = await Promise.all([
        fetch(`${API}/upload-documents`, { method: "POST", body: form }).then(r => r.json()),
        tick(1), tick(2), tick(3),
      ]);

      if (res.error) { setError(res.error); setPhase("idle"); return; }
      setActiveAgent(4);
      setResults(res);
      setPhase("done");
    } catch {
      setError("Could not reach the backend. Make sure it is running on localhost:8000.");
      setPhase("idle");
      setActiveAgent(-1);
    }
  }

  async function runAsk() {
    if (!question.trim()) return;
    setAsking(true);
    setAskResult(null);
    try {
      const res = await fetch(`${API}/ask?question=${encodeURIComponent(question)}`).then(r => r.json());
      if (res.error) { setError(res.error); } else { setAskResult(res); }
    } catch {
      setError("Query failed. Make sure documents are uploaded first.");
    }
    setAsking(false);
  }

  return (
    <main style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif", background: "#090E17", minHeight: "100vh", color: "#F9FAFB" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(37, 99, 235, 0.3); }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: #090E17; } 
        ::-webkit-scrollbar-thumb { background: #1F2937; border-radius: 3px; }

        .agent-card { background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 1.5rem; position: relative; overflow: hidden; transition: all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .agent-card.active { border-color: #3B82F6; box-shadow: 0 0 20px rgba(59, 130, 246, 0.15); }
        .agent-card.done { border-color: #1F2937; }
        .agent-card::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(to bottom, #2563EB, #60A5FA); transform: scaleY(0); transform-origin: top; transition: transform 0.6s cubic-bezier(0.16,1,0.3,1); }
        .agent-card.active::before, .agent-card.done::before { transform: scaleY(1); }
        .agent-card.done::before { background: #374151; }

        .upload-zone { background: #0F172A; border: 1px dashed #334155; border-radius: 12px; padding: 3.5rem 2rem; text-align: center; cursor: pointer; transition: all 0.2s ease; }
        .upload-zone:hover, .upload-zone.drag { border-color: #3B82F6; background: rgba(59, 130, 246, 0.05); }

        .file-chip { display: inline-flex; align-items: center; gap: 8px; background: #111827; border: 1px solid #1F2937; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-family: 'JetBrains Mono', monospace; color: #D1D5DB; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .file-chip button { background: none; border: none; color: #6B7280; cursor: pointer; font-size: 18px; line-height: 1; padding: 0 2px; transition: color 0.15s; }
        .file-chip button:hover { color: #EF4444; }

        .run-btn { background: linear-gradient(135deg, #1D4ED8, #2563EB); color: #fff; border: 1px solid #1E40AF; border-radius: 8px; padding: 14px 32px; font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25); letter-spacing: 0.02em; }
        .run-btn:hover { background: linear-gradient(135deg, #1E40AF, #1D4ED8); box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35); transform: translateY(-1px); }
        .run-btn:active { transform: translateY(1px); }
        .run-btn:disabled { background: #1F2937; border-color: #1F2937; color: #6B7280; cursor: not-allowed; transform: none; box-shadow: none; }

        .ask-btn { background: rgba(59, 130, 246, 0.1); color: #60A5FA; border: 1px solid #3B82F6; border-radius: 8px; padding: 12px 28px; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: all 0.2s ease; white-space: nowrap; }
        .ask-btn:hover:not(:disabled) { background: rgba(59, 130, 246, 0.2); color: #fff; box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
        .ask-btn:disabled { opacity: 0.5; border-color: #374151; color: #6B7280; cursor: not-allowed; }

        .output-text { font-family: 'JetBrains Mono', monospace; font-size: 13.5px; line-height: 1.8; color: #D1D5DB; word-break: break-word; }

        .section-label { font-size: 12px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; color: #6B7280; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 12px; }
        .section-label::after { content: ''; flex: 1; height: 1px; background: #1F2937; }

        .debate-col { background: #111827; border: 1px solid #1F2937; border-radius: 10px; padding: 1.75rem; flex: 1; min-width: 240px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }

        .confidence-bar-track { background: #1F2937; border-radius: 4px; height: 6px; margin-top: 8px; overflow: hidden; }
        .confidence-bar-fill { height: 100%; border-radius: 4px; background: linear-gradient(90deg, #2563EB, #D4AF37); transition: width 1s cubic-bezier(0.16,1,0.3,1); box-shadow: 0 0 10px rgba(212, 175, 55, 0.4); }

        .source-tag { display: inline-block; background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.3); border-radius: 4px; padding: 4px 12px; font-size: 12px; font-family: 'JetBrains Mono', monospace; color: #60A5FA; margin: 4px 6px 0 0; transition: all 0.2s; }
        .source-tag:hover { background: rgba(37, 99, 235, 0.2); border-color: rgba(37, 99, 235, 0.5); color: #fff; }

        .pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .divider { border: none; border-top: 1px solid #1F2937; margin: 3.5rem 0; }

        details summary::-webkit-details-marker { display: none; }
        details summary { padding: 1.25rem 1.75rem; cursor: pointer; list-style: none; display: flex; justify-content: space-between; align-items: center; user-select: none; transition: background 0.2s; }
        details summary:hover { background: rgba(255, 255, 255, 0.02); }
        details[open] summary span:last-child { color: #60A5FA; }

        input[type="text"] { background: #0F172A; border: 1px solid #334155; border-radius: 8px; color: #F9FAFB; font-family: inherit; font-size: 15px; padding: 14px 18px; width: 100%; transition: all 0.2s ease; outline: none; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); }
        input[type="text"]:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
        input[type="text"]::placeholder { color: #6B7280; }
        
        .verdict-box { background: #111827; border: 1px solid rgba(212, 175, 55, 0.25); border-radius: 12px; padding: 2rem; position: relative; overflow: hidden; box-shadow: 0 8px 30px rgba(212, 175, 55, 0.05); }
      `}</style>

      <nav style={{ padding: "0 2.5rem", height: "64px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: "rgba(9, 14, 23, 0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid #1F2937", zIndex: 100 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: "18px", letterSpacing: "-0.02em" }}>
          Research<span style={{ color: "#3B82F6" }}>OS</span>
        </span>
        <span style={{ fontSize: "13px", color: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace", background: "#111827", padding: "4px 12px", borderRadius: "12px", border: "1px solid #1F2937" }}>
          {results ? `${files.length} document${files.length !== 1 ? "s" : ""} loaded` : "No documents loaded"}
        </span>
      </nav>

      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "6rem 2rem 4rem" }}>
        <p style={{ fontSize: "12px", letterSpacing: "0.2em", textTransform: "uppercase", color: "#60A5FA", marginBottom: "1.25rem", fontWeight: 600 }}>
          Multi-Agent Research Intelligence
        </p>
        <h1 style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 600, lineHeight: 1.1, letterSpacing: "-0.03em", marginBottom: "1.5rem", color: "#F9FAFB" }}>
          Research that thinks<br />
          <span style={{ background: "linear-gradient(to right, #60A5FA, #D4AF37)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>before it answers.</span>
        </h1>
        <p style={{ fontSize: "18px", color: "#9CA3AF", lineHeight: 1.7, maxWidth: "580px" }}>
          Upload documents. Four specialized agents analyze, cross-check, and debate the findings. Then you ask anything.
        </p>
      </section>

      <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <div className="section-label">Source Documents</div>

        <div
          className={`upload-zone${dragOver ? " drag" : ""}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <input ref={fileRef} type="file" accept=".pdf" multiple style={{ display: "none" }} onChange={handleFileChange} />
          <div style={{ width: "48px", height: "48px", background: "#1E293B", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem", color: "#9CA3AF" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </div>
          <p style={{ fontSize: "16px", color: "#E5E7EB", marginBottom: "8px", fontWeight: 500 }}>Drop PDFs here or click to browse</p>
          <p style={{ fontSize: "13px", color: "#6B7280" }}>Supports up to 5 secure PDF uploads</p>
        </div>

        {files.length > 0 && (
          <div style={{ marginTop: "1.5rem", display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {files.map((f, i) => (
              <span key={i} className="file-chip">
                {f.name}
                <button onClick={e => { e.stopPropagation(); removeFile(i); }} aria-label={`Remove ${f.name}`}>&times;</button>
              </span>
            ))}
          </div>
        )}

        {error && (
          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "8px" }}>
            <p style={{ fontSize: "13px", color: "#FCA5A5", fontFamily: "'JetBrains Mono', monospace" }}>{error}</p>
          </div>
        )}

        <div style={{ marginTop: "2rem" }}>
          <button
            className="run-btn"
            onClick={runAnalysis}
            disabled={phase === "uploading" || files.length < 1}
          >
            {phase === "uploading" ? "Executing Analysis..." : "Initialize Analysis"}
          </button>
        </div>
      </section>

      {(phase === "uploading" || phase === "done") && (
        <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 2rem 4rem" }}>
          <div className="section-label">Agent Pipeline</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {AGENTS.map((agent, i) => {
              const isDone = activeAgent > i || phase === "done";
              const isActive = activeAgent === i && phase === "uploading";
              return (
                <div key={agent.key} className={`agent-card${isActive ? " active" : ""}${isDone ? " done" : ""}`}>
                  <p style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: isActive ? "#60A5FA" : isDone ? "#9CA3AF" : "#4B5563", marginBottom: "10px", fontWeight: 600 }}>
                    {isActive ? <span className="pulse">{agent.label}</span> : agent.label}
                  </p>
                  <p style={{ fontSize: "13px", color: "#9CA3AF", lineHeight: 1.5 }}>{agent.desc}</p>
                  {isDone && (
                    <p style={{ marginTop: "12px", fontSize: "12px", color: "#10B981", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ display: "inline-block", width: "6px", height: "6px", background: "#10B981", borderRadius: "50%" }}></span> Verified
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {results && (
        <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 2rem 4rem" }}>
          <div className="section-label">Executive Findings</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {AGENTS.map(agent => (
              <details key={agent.key} style={{ background: "#111827", border: "1px solid #1F2937", borderRadius: "10px", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}>
                <summary>
                  <span style={{ fontSize: "15px", fontWeight: 600, color: "#F9FAFB" }}>{agent.label}</span>
                  <span style={{ fontSize: "12px", color: "#6B7280", fontFamily: "'JetBrains Mono', monospace" }}>Expand Report</span>
                </summary>
                <div style={{ padding: "0 1.75rem 1.75rem", borderTop: "1px solid #1F2937", background: "#0F172A" }}>
                  <div className="output-text" style={{ paddingTop: "1.5rem" }}>
                    <FormattedText text={(results as Record<string, unknown>)[agent.key] as string} />
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {results && (
        <>
          <hr className="divider" />
          <section style={{ maxWidth: "900px", margin: "0 auto", padding: "0 2rem 6rem" }}>
            <div className="section-label">Interactive Query</div>

            <div style={{ display: "flex", gap: "16px" }}>
              <input
                type="text"
                placeholder="Ask about key risks, contradictions, or required actions..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runAsk()}
              />
              <button className="ask-btn" onClick={runAsk} disabled={asking || !question.trim()}>
                {asking ? "Synthesizing..." : "Submit Query"}
              </button>
            </div>

            {asking && (
              <p style={{ marginTop: "1.5rem", fontSize: "14px", color: "#9CA3AF", fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: "8px" }}>
                <span className="pulse" style={{ display: "inline-block", width: "8px", height: "8px", background: "#3B82F6", borderRadius: "50%" }}></span>
                Running consensus debate protocol...
              </p>
            )}

            {askResult && (
              <div style={{ marginTop: "2.5rem" }}>
                <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
                  <div className="debate-col">
                    <p style={{ fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#60A5FA", marginBottom: "1.25rem", fontWeight: 600 }}>Research Agent</p>
                    <div className="output-text"><FormattedText text={askResult.research_agent} /></div>
                  </div>
                  <div className="debate-col">
                    <p style={{ fontSize: "12px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#F87171", marginBottom: "1.25rem", fontWeight: 600 }}>Critic Agent</p>
                    <div className="output-text"><FormattedText text={askResult.critic_agent} /></div>
                  </div>
                </div>

                <div className="verdict-box">
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "4px", background: "linear-gradient(to bottom, #D4AF37, #F59E0B)" }} />
                  
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <p style={{ fontSize: "13px", letterSpacing: "0.15em", textTransform: "uppercase", color: "#D4AF37", fontWeight: 600, margin: 0 }}>Final Verdict</p>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", background: "rgba(0,0,0,0.2)", padding: "6px 12px", borderRadius: "20px", border: "1px solid #1F2937" }}>
                      <span style={{ fontSize: "12px", color: "#9CA3AF" }}>Confidence Map</span>
                      <div style={{ width: "100px" }}>
                        <div className="confidence-bar-track">
                          <div className="confidence-bar-fill" style={{ width: `${askResult.judge_agent.confidence_score}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: "14px", fontWeight: 600, color: "#D4AF37", fontFamily: "'JetBrains Mono', monospace" }}>
                        {askResult.judge_agent.confidence_score}%
                      </span>
                    </div>
                  </div>

                  <div className="output-text" style={{ marginBottom: "1.5rem", color: "#F3F4F6", fontSize: "14.5px" }}>
                    <FormattedText text={askResult.judge_agent.verdict} />
                  </div>
                  
                  <div style={{ background: "rgba(212, 175, 55, 0.05)", padding: "1.25rem", borderRadius: "8px", borderLeft: "2px solid #D4AF37" }}>
                    <div style={{ fontSize: "14px", color: "#D1D5DB", lineHeight: 1.7 }}>
                      <span style={{ color: "#D4AF37", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "6px", fontWeight: 600 }}>Action Recommendation</span>
                      <FormattedText text={askResult.judge_agent.final_recommendation} />
                    </div>
                  </div>
                </div>

                {askResult.citations?.sources?.length > 0 && (
                  <div style={{ marginTop: "16px", padding: "1.25rem 1.5rem", background: "#111827", border: "1px solid #1F2937", borderRadius: "10px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <p style={{ fontSize: "12px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6B7280", fontWeight: 600, margin: 0 }}>
                      Verified Sources <span style={{ color: "#10B981", marginLeft: "4px" }}>({askResult.citations.confidence})</span>
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", flex: 1 }}>
                      {askResult.citations.sources.map((s, i) => (
                        <span key={i} className="source-tag">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}

      <footer style={{ borderTop: "1px solid #1F2937", padding: "2.5rem", textAlign: "center", background: "#0B1120" }}>
        <p style={{ fontSize: "13px", color: "#4B5563", fontFamily: "'JetBrains Mono', monospace" }}>
          ResearchOS — Enterprise Grade Multi-Agent AI System
        </p>
      </footer>

    </main>
  );
}

