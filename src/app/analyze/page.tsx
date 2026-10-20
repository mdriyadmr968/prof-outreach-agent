"use client";

import { useState } from "react";
import { 
  Sparkles, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  BookOpen, 
  DollarSign, 
  Mail, 
  ExternalLink,
  ShieldAlert,
  Clock,
  Layers,
  Edit3,
  RefreshCw
} from "lucide-react";

export default function AnalyzePage() {
  const [url, setUrl] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [country, setCountry] = useState("Canada");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any | null>(null);

  // Email draft state for editing
  const [editableSubject, setEditableSubject] = useState("");
  const [editableBody, setEditableBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function handleAnalyze(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setSendSuccess(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          professorNameInput: professorName || undefined,
          universityNameInput: universityName || undefined,
          countryInput: country,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to analyze page");
      }

      setResult(data.data);
      setEditableSubject(data.data.outreach.subject);
      setEditableBody(data.data.outreach.body);
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(scheduleForDate?: string) {
    if (!result?.outreach?.id) return;
    setSending(true);
    setSendSuccess(null);
    setError(null);

    try {
      // First save any edits made to draft
      if (isEditing) {
        await fetch(`/api/outreach/${result.outreach.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: editableSubject,
            body: editableBody,
          }),
        });
      }

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outreachId: result.outreach.id,
          scheduleForDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Sending failed");
      }

      setSendSuccess(data.message);
    } catch (err: any) {
      setError(err.message || "Could not complete send action.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Single-Professor Deep Analyzer &amp; Drafter
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Paste any faculty URL, lab page, or university directory link. The agent extracts verified research, computes the opportunity score, and writes a grounded outreach email.
        </p>
      </div>

      {/* Headed Browser Notice */}
      <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 text-blue-900 text-xs flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold">Playwright 1-Attempt Auto-Solve + Desktop Window Fallback Active</span>
          <p className="text-blue-800 leading-relaxed">
            The crawler will first attempt to solve any Cloudflare Turnstile or security verification once automatically. If it cannot solve it in 1 attempt, it will automatically launch a headed Playwright browser window on your desktop so you can solve it directly, then seamlessly persist clearance cookies.
          </p>
        </div>
      </div>

      {/* Analysis Input Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Professor Faculty or Lab Profile URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="url"
              required
              placeholder="https://www.cs.toronto.edu/~prof or https://ai.utoronto.ca/faculty/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Professor Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Jane Smith"
                value={professorName}
                onChange={(e) => setProfessorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                University (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. University of Toronto"
                value={universityName}
                onChange={(e) => setUniversityName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white"
              >
                <option value="Canada">Canada (Lab-Funded MSc)</option>
                <option value="Germany">Germany (Tuition-Free + HiWi)</option>
                <option value="USA">USA (Thesis MS / Assistantships)</option>
                <option value="South Korea">South Korea (BK21/NRF Lab)</option>
                <option value="Sweden">Sweden (Central Scholarship)</option>
                <option value="Finland">Finland (Central Scholarship)</option>
                <option value="UK">UK (MRes / MPhil)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading || !url}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Crawling &amp; Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze &amp; Generate Outreach Draft</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {sendSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold">{sendSuccess}</span>
            <p className="text-xs text-emerald-700">
              Outreach status updated to SENT. Follow-up scheduled automatically for 8 days from now.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results View */}
      {result && (
        <div className="space-y-6">
          {/* Prospective Student Easter Egg Warning Banner */}
          {result.professor.requiredSubjectTag && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start space-x-3 shadow-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-amber-800">
                  Secret Codeword / Subject Tag Detected!
                </span>
                <p className="text-amber-800">
                  Professor requires <span className="font-mono font-bold bg-amber-200/70 px-1 py-0.5 rounded">{result.professor.requiredSubjectTag}</span> in the email subject line. The AI has automatically prepended this to your email draft to pass their filter.
                </p>
              </div>
            </div>
          )}

          {result.professor.prospectiveStudentRules && (
            <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-800 text-xs flex items-start space-x-3">
              <Layers className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold uppercase tracking-wider text-slate-700">
                  Prospective Student Instructions Found on Page:
                </span>
                <p className="italic text-slate-600">&ldquo;{result.professor.prospectiveStudentRules}&rdquo;</p>
              </div>
            </div>
          )}

          {/* Professor & Opportunity Score Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-900">{result.professor.name}</h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-700">
                    {result.professor.country}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 font-semibold text-indigo-700 border border-indigo-100">
                    {result.professor.outreachArchetype === "PROFESSOR_LED"
                      ? "Lab Admission & Funding"
                      : result.professor.outreachArchetype === "CENTRAL_HIWI"
                      ? "Tuition-Free & HiWi"
                      : "Central Scholarship"}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">{result.professor.university}</p>
                <div className="flex items-center space-x-3 mt-2 text-xs text-slate-600">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{result.professor.email || "No verified email found"}</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-emerald-600">
                    {result.professor.emailConfidence}
                  </span>
                </div>
              </div>

              {/* Total Score Badge */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center min-w-[140px]">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Opportunity Score
                </div>
                <div className="text-3xl font-extrabold text-indigo-600 mt-1">
                  {result.opportunity.totalScore}
                  <span className="text-sm font-medium text-slate-400">/100</span>
                </div>
                <div className="text-xs font-bold text-emerald-600 mt-0.5">
                  Tier {result.opportunity.tier} Opportunity
                </div>
              </div>
            </div>

            {/* Score Breakdown Bars */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                Score Sub-Factor Breakdown
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="text-slate-500">Research Relevance</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {result.opportunity.breakdown.research}/30
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="text-slate-500">Technical Overlap</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {result.opportunity.breakdown.technical}/15
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="text-slate-500">Funding Evidence</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {result.opportunity.breakdown.funding}/20
                  </div>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <div className="text-slate-500">Master&apos;s Supervision</div>
                  <div className="font-bold text-slate-800 text-sm mt-0.5">
                    {result.opportunity.breakdown.supervision}/10
                  </div>
                </div>
              </div>
            </div>

            {/* Reasoning & Potential Concerns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
                <span className="font-bold text-indigo-900 block">Why this opportunity is strong:</span>
                <p className="text-indigo-800 leading-relaxed">{result.opportunity.reasoning}</p>
              </div>
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
                <span className="font-bold text-amber-900 block">Potential Considerations:</span>
                <p className="text-amber-800 leading-relaxed">{result.opportunity.potentialConcerns}</p>
              </div>
            </div>

            {/* Verified Recent Publications */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Verified Publications (OpenAlex / Sources)
              </h3>
              <div className="space-y-2">
                {result.publications.map((pub: any) => (
                  <div
                    key={pub.id}
                    className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs flex justify-between items-start gap-4"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">{pub.title}</span>
                      <span className="text-slate-400 ml-2 font-mono">({pub.publicationYear})</span>
                      {pub.abstract && (
                        <p className="text-slate-500 text-[11px] mt-1 line-clamp-2">
                          {pub.abstract}
                        </p>
                      )}
                    </div>
                    {pub.doi && (
                      <a
                        href={`https://doi.org/${pub.doi}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800 shrink-0 mt-0.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Generated Outreach Email Composer */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Evidence-Linked Outreach Email Draft
                </h3>
                <p className="text-xs text-slate-500">
                  Target: 150–250 words • Grounded in student thesis and verified papers
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditing ? "Done Editing" : "Edit Email"}</span>
                </button>
              </div>
            </div>

            {/* Email Subject Line */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Subject</label>
              <input
                type="text"
                disabled={!isEditing}
                value={editableSubject}
                onChange={(e) => setEditableSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 disabled:opacity-90"
              />
            </div>

            {/* Email Body */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-600">Email Body</label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {editableBody.trim().split(/\s+/).length} words
                </span>
              </div>
              <textarea
                rows={11}
                disabled={!isEditing}
                value={editableBody}
                onChange={(e) => setEditableBody(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-normal text-slate-800 bg-slate-50 disabled:opacity-90 leading-relaxed font-sans"
              />
            </div>

            {/* Claim Verification Badges */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Verified Grounded Claims (Hallucination Guard):
              </span>
              <div className="flex flex-wrap gap-2">
                {result.outreach.claimCitations?.map((c: any, idx: number) => (
                  <span
                    key={idx}
                    className="inline-flex items-center space-x-1 text-[11px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate max-w-xs">{c.claim}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Human Approval Action Bar */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-3">
              <span className="text-xs text-slate-500">
                Explicit human approval required before sending.
              </span>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => handleSend()}
                  className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sending ? "Sending..." : "Approve & Send Now"}</span>
                </button>

                <button
                  type="button"
                  disabled={sending}
                  onClick={() => {
                    // Schedule for tomorrow 8:30 AM
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(8, 30, 0, 0);
                    handleSend(d.toISOString());
                  }}
                  className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Queue for 8:30 AM (Prof Local Time)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
