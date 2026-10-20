"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Search, 
  Filter, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Award
} from "lucide-react";

export default function ProfessorsPage() {
  const [professors, setProfessors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedTier, setSelectedTier] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfessors() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedCountry) params.set("country", selectedCountry);
        if (selectedTier) params.set("tier", selectedTier);

        const res = await fetch(`/api/professors?${params.toString()}`);
        const data = await res.json();
        if (data.success) {
          setProfessors(data.data);
        }
      } catch (err) {
        console.error("Error fetching professors:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfessors();
  }, [selectedCountry, selectedTier]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Professors CRM &amp; Pipeline</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track all discovered professors, research compatibility scores, verified institutional emails, and outreach progress.
          </p>
        </div>

        <Link
          href="/analyze"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-sm transition-colors"
        >
          <span>Analyze New Professor</span>
        </Link>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter by:</span>
          </div>

          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="">All Countries</option>
            <option value="Canada">Canada</option>
            <option value="Germany">Germany</option>
            <option value="USA">USA</option>
            <option value="South Korea">South Korea</option>
            <option value="Sweden">Sweden</option>
            <option value="Finland">Finland</option>
          </select>

          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
          >
            <option value="">All Tiers</option>
            <option value="A">Tier A (90-100: Excellent)</option>
            <option value="B">Tier B (80-89: Very Good)</option>
            <option value="C">Tier C (70-79: Good)</option>
            <option value="D">Tier D (60-69: Possible)</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-medium">
          Showing {professors.length} professor(s)
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading professors...</div>
        ) : professors.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">No professors found</p>
            <p className="text-xs text-slate-400">
              Try adjusting your filter or paste a professor URL in the analyzer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {professors.map((prof) => {
              const isExpanded = expandedId === prof.id;
              const latestOutreach = prof.outreach?.[0];

              return (
                <div key={prof.id} className="transition-colors hover:bg-slate-50/50">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : prof.id)}
                    className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-base">{prof.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-medium text-slate-700">
                          {prof.university.country}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 font-medium text-indigo-700 border border-indigo-100">
                          {prof.university.outreachArchetype === "PROFESSOR_LED"
                            ? "Lab Funding"
                            : prof.university.outreachArchetype === "CENTRAL_HIWI"
                            ? "Tuition-Free + HiWi"
                            : "Scholarship Track"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{prof.university.name}</p>

                      <div className="flex items-center space-x-3 text-xs text-slate-600 pt-0.5">
                        <span className="flex items-center space-x-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{prof.email || "No email"}</span>
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-semibold text-emerald-600">
                          {prof.emailConfidence}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-5 shrink-0">
                      {/* Outreach status badge */}
                      <div>
                        {latestOutreach ? (
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                              latestOutreach.status === "SENT"
                                ? "bg-emerald-100 text-emerald-800"
                                : latestOutreach.status === "APPROVED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {latestOutreach.status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Not Drafted</span>
                        )}
                      </div>

                      {/* Opportunity Score */}
                      <div className="text-right min-w-[70px]">
                        <div className="text-base font-extrabold text-indigo-600">
                          {prof.opportunity?.totalScore ?? 0}/100
                        </div>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          Tier {prof.opportunity?.tier ?? "C"}
                        </span>
                      </div>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 bg-slate-50/80 border-t border-slate-100 space-y-4 text-xs">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700 block">
                            Research Compatibility Notes:
                          </span>
                          <p className="text-slate-600 leading-relaxed">
                            {prof.opportunity?.reasoning || "No detailed notes recorded."}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-700 block">
                            Potential Outreach Considerations:
                          </span>
                          <p className="text-slate-600 leading-relaxed">
                            {prof.opportunity?.potentialConcerns || "None flagged."}
                          </p>
                        </div>
                      </div>

                      {/* Recent Publications */}
                      {prof.publications && prof.publications.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 block mb-1">
                            Associated Publications:
                          </span>
                          <div className="space-y-1.5">
                            {prof.publications.map((pub: any) => (
                              <div
                                key={pub.id}
                                className="p-2 bg-white rounded-lg border border-slate-200/60 flex justify-between items-center"
                              >
                                <span className="font-medium text-slate-800">
                                  {pub.title} ({pub.year})
                                </span>
                                {pub.url && (
                                  <a
                                    href={pub.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Link
                          href={`/analyze`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Open in Single-Professor Analyzer →
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
