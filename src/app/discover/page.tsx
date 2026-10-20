"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Search, 
  Sparkles, 
  BookOpen, 
  Globe, 
  Award, 
  ArrowRight,
  ExternalLink,
  RefreshCw,
  Building,
  GraduationCap
} from "lucide-react";

export default function DiscoverPage() {
  const [topic, setTopic] = useState("Machine Learning Healthcare");
  const [country, setCountry] = useState("Canada");
  const [limit, setLimit] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, country, limit }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Discovery search failed");
      }

      setResults(data.data || []);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  const quickCountries = [
    { name: "Canada", note: "Guaranteed Lab MSc Funding" },
    { name: "Germany", note: "Tuition-Free + HiWi RA" },
    { name: "USA", note: "Thesis MS / GRA / GTA" },
    { name: "South Korea", note: "BK21 / NRF Lab Stipend" },
    { name: "Sweden", note: "Central Scholarship Track" },
    { name: "Finland", note: "Central Scholarship Track" },
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Automated Academic Discovery Engine
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Discovers actively publishing professors from OpenAlex and institutional databases matching your research focus and target countries without fragile scraping.
        </p>
      </div>

      {/* Query Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Research Focus or Keywords
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Machine Learning Healthcare or Clinical Prediction"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
              >
                <option value="Canada">Canada (Lab-Funded MSc)</option>
                <option value="Germany">Germany (Tuition-Free + HiWi)</option>
                <option value="USA">USA (Thesis MS / Assistantships)</option>
                <option value="South Korea">South Korea (BK21/NRF Lab)</option>
                <option value="Sweden">Sweden (Scholarships / MRes)</option>
                <option value="Finland">Finland (Scholarships)</option>
                <option value="UK">UK (MRes / MPhil)</option>
                <option value="Japan">Japan (MEXT / Lab)</option>
              </select>
            </div>
          </div>

          {/* Quick country pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-400 font-medium">Quick Select:</span>
            {quickCountries.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setCountry(c.name)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  country === c.name
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-colors"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Searching Academic Graph...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Discover Matching Professors</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm">
          {error}
        </div>
      )}

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-slate-900">
              Discovered Researchers ({results.length})
            </h2>
            <span className="text-xs text-slate-500">
              Filtered for active publications &amp; citations in {country}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {results.map((author) => (
              <div
                key={author.openAlexId}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 hover:border-indigo-200 transition-colors"
              >
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{author.name}</h3>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-0.5">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{author.university}</span>
                    </div>
                  </div>

                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 shrink-0">
                    {author.outreachArchetype === "PROFESSOR_LED"
                      ? "Lab Funding"
                      : author.outreachArchetype === "CENTRAL_HIWI"
                      ? "Tuition-Free + HiWi"
                      : "Scholarship Track"}
                  </span>
                </div>

                {/* Research Topics */}
                <div>
                  <div className="flex flex-wrap gap-1.5">
                    {author.topics?.slice(0, 3).map((t: string, i: number) => (
                      <span
                        key={i}
                        className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-700"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recent publication */}
                {author.recentPublications?.[0] && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Recent Key Publication ({author.recentPublications[0].year}):
                    </span>
                    <span className="font-medium text-slate-800 line-clamp-2">
                      {author.recentPublications[0].title}
                    </span>
                  </div>
                )}

                {/* Card Action */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-400 font-medium">
                    {author.worksCount} works • {author.citedByCount} citations
                  </span>

                  <Link
                    href={`/analyze`}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <span>Analyze &amp; Draft Email</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
