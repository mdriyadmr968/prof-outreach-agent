"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Users, 
  Sparkles, 
  Send, 
  Clock, 
  ArrowRight, 
  Search,
  ExternalLink,
  ShieldCheck,
  Award
} from "lucide-react";

interface Stats {
  totalProfessors: number;
  highRelevance: number;
  pendingDrafts: number;
  approvedDrafts: number;
  sentEmails: number;
  sentToday: number;
  dailyLimit: number;
  followUpsDue: number;
  repliesCount: number;
  positiveReplies: number;
}

interface ProfessorItem {
  id: string;
  name: string;
  email?: string;
  university: { name: string; country: string; outreachArchetype: string };
  opportunity?: { totalScore: number; tier: string; reasoning: string };
  outreach?: { status: string; subject: string }[];
}

interface StudentProfile {
  name: string;
  university: string;
  degree: string;
  cgpa: number;
  thesisTitle: string;
  skills: string[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentProfessors, setRecentProfessors] = useState<ProfessorItem[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, profsRes, profileRes] = await Promise.all([
          fetch("/api/stats"),
          fetch("/api/professors"),
          fetch("/api/profile"),
        ]);
        const statsData = await statsRes.json();
        const profsData = await profsRes.json();
        const profileData = await profileRes.json();

        if (statsData.success) setStats(statsData.stats);
        if (profsData.success) setRecentProfessors(profsData.data.slice(0, 5));
        if (profileData.user && profileData.profile) {
          setStudentProfile({
            name: profileData.user.name,
            university: profileData.profile.university,
            degree: profileData.profile.degree,
            cgpa: profileData.profile.cgpa,
            thesisTitle: profileData.profile.thesisTitle,
            skills: profileData.profile.skills || [],
          });
        }
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-700/60 text-indigo-200 text-xs font-semibold tracking-wide border border-indigo-500/30">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
            <span>Anti-Spam Academic Outreach Agent Active</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            AI Professor Discovery &amp; Master&apos;s Outreach
          </h1>
          <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
            Targeting fully funded Master&apos;s research assistantships, lab supervision, and tuition waivers across Canada, Germany, USA, South Korea, and Northern Europe.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/analyze"
            className="inline-flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-900/40 transition-all hover:-translate-y-0.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Analyze Single URL</span>
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-xl border border-white/20 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span>Bulk Discovery</span>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Discovered
            </span>
            <Users className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.totalProfessors ?? 0}
            </span>
            <span className="ml-2 text-xs text-slate-500">professors</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              High Relevance
            </span>
            <Award className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
              {stats?.highRelevance ?? 0}
            </span>
            <span className="ml-2 text-xs text-emerald-700 font-medium">Tier A &amp; B</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Daily Quota
            </span>
            <Send className="w-5 h-5 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">
              {stats?.sentToday ?? 0}
            </span>
            <span className="ml-1 text-xs text-slate-500 font-medium">
              / {stats?.dailyLimit ?? 5} max
            </span>
          </div>
          <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{
                width: `${Math.min(100, ((stats?.sentToday ?? 0) / (stats?.dailyLimit ?? 5)) * 100)}%`,
              }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Follow-ups Due
            </span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline">
            <span className="text-2xl sm:text-3xl font-bold text-amber-600">
              {stats?.followUpsDue ?? 0}
            </span>
            <span className="ml-2 text-xs text-slate-500">pending</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Profile Synergy + Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Student Academic Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Configured Student Profile</h2>
              <p className="text-xs text-slate-500">Active baseline for AI matching</p>
            </div>
            <Link
              href="/profile"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Edit Profile →
            </Link>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-xs font-medium text-slate-400 block uppercase">Student</span>
              <span className="font-semibold text-slate-800">
                {studentProfile?.name || "Mohammad Syied Bin Salim"}
              </span>
              <span className="text-xs text-slate-500 block">
                {studentProfile?.university || "Port City International University, Bangladesh"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase">CGPA</span>
                <span className="font-semibold text-slate-800">
                  {studentProfile?.cgpa ? `${studentProfile.cgpa} / 4.0` : "3.35 / 4.0"}
                </span>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400 block uppercase">Target Degree</span>
                <span className="font-semibold text-indigo-600">Thesis Master&apos;s</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-medium text-slate-400 block uppercase mb-1">
                Undergraduate Thesis
              </span>
              <p className="text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
                &ldquo;{studentProfile?.thesisTitle || "Early Prediction of Chronic Kidney Disease Using Machine Learning and Deep Learning"}&rdquo;
              </p>
            </div>

            <div className="pt-2">
              <span className="text-xs font-medium text-slate-400 block uppercase mb-1.5">
                Configured Skills &amp; Strengths
              </span>
              <div className="flex flex-wrap gap-1.5">
                {studentProfile?.skills && studentProfile.skills.length > 0 ? (
                  studentProfile.skills.slice(0, 6).map((skill, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <>
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-100">
                      Machine Learning
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                      Full-Stack TypeScript
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Opportunities & Pipeline */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Professor Opportunities</h2>
              <p className="text-xs text-slate-500">Sorted by calculated opportunity score</p>
            </div>
            <Link
              href="/professors"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All ({stats?.totalProfessors ?? 0}) →
            </Link>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-slate-400">Loading opportunities...</div>
          ) : recentProfessors.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No professors analyzed yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Paste a faculty profile URL into the Analyzer or run a bulk discovery search to get started.
              </p>
              <Link
                href="/analyze"
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-3.5 py-2 rounded-lg shadow-sm"
              >
                <span>Analyze First Professor URL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentProfessors.map((prof) => (
                <div key={prof.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-900 text-sm">{prof.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                        {prof.university.country}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                        {prof.university.outreachArchetype === "PROFESSOR_LED"
                          ? "Lab Funding"
                          : prof.university.outreachArchetype === "CENTRAL_HIWI"
                          ? "Tuition-Free + HiWi"
                          : "Central Scholarship"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{prof.university.name}</p>
                    {prof.opportunity?.reasoning && (
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {prof.opportunity.reasoning}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-bold text-indigo-600">
                        {prof.opportunity?.totalScore ?? 0}/100
                      </div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Tier {prof.opportunity?.tier ?? "C"}
                      </span>
                    </div>
                    <Link
                      href={`/professors`}
                      className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
