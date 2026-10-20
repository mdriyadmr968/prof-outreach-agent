"use client";

import { useEffect, useState } from "react";
import { 
  UserCircle, 
  Save, 
  CheckCircle2, 
  BookOpen, 
  Code2, 
  Globe, 
  DollarSign,
  GraduationCap
} from "lucide-react";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [university, setUniversity] = useState("");
  const [graduationYear, setGraduationYear] = useState(2024);
  const [cgpa, setCgpa] = useState("3.35");
  const [thesisTitle, setThesisTitle] = useState("");
  const [thesisAbstract, setThesisAbstract] = useState("");
  const [methods, setMethods] = useState("");
  const [skills, setSkills] = useState("");
  const [targetCountries, setTargetCountries] = useState("");
  const [fullyFundedOnly, setFullyFundedOnly] = useState(true);
  const [acceptTuitionWaiver, setAcceptTuitionWaiver] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
          setName(data.user?.name || "Mohammad Syied Bin Salim");
          setDegree(data.profile.degree);
          setUniversity(data.profile.university);
          setGraduationYear(data.profile.graduationYear);
          setCgpa(data.profile.cgpa.toString());
          setThesisTitle(data.profile.thesisTitle);
          setThesisAbstract(data.profile.thesisAbstract || "");
          setMethods(data.profile.thesisMethods?.join(", ") || "");
          setSkills(data.profile.skills?.join(", ") || "");
          setTargetCountries(data.profile.targetCountries?.join(", ") || "");
          setFullyFundedOnly(data.profile.fullyFundedOnly);
          setAcceptTuitionWaiver(data.profile.acceptTuitionWaiver);
        }
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          degree,
          university,
          graduationYear,
          cgpa,
          thesisTitle,
          thesisAbstract,
          thesisMethods: methods.split(",").map((s) => s.trim()).filter(Boolean),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          targetCountries: targetCountries.split(",").map((s) => s.trim()).filter(Boolean),
          fullyFundedOnly,
          acceptTuitionWaiver,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-400">Loading student profile...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Academic Profile</h1>
          <p className="text-sm text-slate-500 mt-1">
            This profile configures the AI matching algorithms, research overlap scoring, and email personalizations.
          </p>
        </div>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Academic profile updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-sm space-y-6">
        {/* Basic Academic Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
            <GraduationCap className="w-4 h-4 text-indigo-600" />
            <span>Academic Qualifications</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
              <input
                type="text"
                disabled
                value={name}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Degree</label>
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Undergraduate Institution</label>
              <input
                type="text"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">CGPA (Scale 4.0)</label>
              <input
                type="text"
                value={cgpa}
                onChange={(e) => setCgpa(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Thesis & Methods */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Undergraduate Thesis &amp; Research</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Thesis Title</label>
            <input
              type="text"
              value={thesisTitle}
              onChange={(e) => setThesisTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Thesis Abstract / Summary</label>
            <textarea
              rows={3}
              value={thesisAbstract}
              onChange={(e) => setThesisAbstract(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Thesis Algorithms &amp; Methods (Comma-separated)
            </label>
            <input
              type="text"
              value={methods}
              onChange={(e) => setMethods(e.target.value)}
              placeholder="Machine Learning, Deep Learning, XGBoost, Random Forest, ANN, PCA"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />
          </div>
        </div>

        {/* Engineering Skills */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Code2 className="w-4 h-4 text-indigo-600" />
            <span>Technical &amp; Engineering Skills (The Unfair Advantage)</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Production Skills (Comma-separated)
            </label>
            <input
              type="text"
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              placeholder="React, Next.js, Node.js, TypeScript, PostgreSQL, Prisma, Python"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Highlighting both ML modeling and full-stack software development gives applied labs a strong incentive to recruit you.
            </span>
          </div>
        </div>

        {/* Target Countries & Funding */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2 border-b border-slate-100 pb-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>Target Countries &amp; Funding Preferences</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Target Countries (Comma-separated)
            </label>
            <input
              type="text"
              value={targetCountries}
              onChange={(e) => setTargetCountries(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={fullyFundedOnly}
                onChange={(e) => setFullyFundedOnly(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Prioritize Fully Funded Master&apos;s (RA/TA/Stipend)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptTuitionWaiver}
                onChange={(e) => setAcceptTuitionWaiver(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span>Accept Tuition Fee Waivers</span>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving Changes..." : "Save Academic Profile"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
