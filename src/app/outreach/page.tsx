"use client";

import { useEffect, useState } from "react";
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  Mail, 
  AlertCircle, 
  ArrowRight,
  Calendar,
  MessageSquare,
  Trash2
} from "lucide-react";

export default function OutreachPage() {
  const [outreaches, setOutreaches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function loadOutreaches() {
    try {
      setLoading(true);
      const url = filterStatus ? `/api/outreach?status=${filterStatus}` : `/api/outreach`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOutreaches(data.data);
      }
    } catch (err) {
      console.error("Outreach fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOutreaches();
  }, [filterStatus]);

  async function handleSendNow(id: string) {
    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachId: id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(data.message);
        loadOutreaches();
      } else {
        alert(data.error || "Sending failed");
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this draft?")) return;
    try {
      await fetch(`/api/outreach/${id}`, { method: "DELETE" });
      loadOutreaches();
    } catch (err: any) {
      alert(err.message);
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outreach Pipeline &amp; Follow-ups</h1>
          <p className="text-sm text-slate-500 mt-1">
            Human-in-the-loop email tracking, scheduled delivery, and 7-day automated follow-up control.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { label: "All Records", val: "" },
          { label: "Drafts", val: "DRAFT" },
          { label: "Approved / Scheduled", val: "APPROVED" },
          { label: "Sent", val: "SENT" },
          { label: "Replies", val: "REPLY_RECEIVED" },
        ].map((tab) => (
          <button
            key={tab.val}
            onClick={() => setFilterStatus(tab.val)}
            className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold transition-colors ${
              filterStatus === tab.val
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-sm text-slate-400">Loading outreach records...</div>
        ) : outreaches.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-800">No outreach records found</p>
            <p className="text-xs text-slate-400">
              Analyze a professor URL to create your first grounded draft.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {outreaches.map((item) => (
              <div key={item.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {item.professor.name}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {item.professor.university.name} ({item.professor.university.country})
                    </span>
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        item.status === "SENT"
                          ? "bg-emerald-100 text-emerald-800"
                          : item.status === "APPROVED"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 text-xs flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item.subject}</span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.body}
                  </p>

                  <div className="flex items-center space-x-4 text-[11px] text-slate-400 pt-1">
                    {item.sentAt && (
                      <span className="flex items-center space-x-1">
                        <Send className="w-3 h-3 text-emerald-600" />
                        <span>Sent: {new Date(item.sentAt).toLocaleDateString()}</span>
                      </span>
                    )}

                    {item.followUpDate && (
                      <span className="flex items-center space-x-1 text-amber-700 font-medium">
                        <Calendar className="w-3 h-3 text-amber-600" />
                        <span>Follow-up due: {new Date(item.followUpDate).toLocaleDateString()}</span>
                      </span>
                    )}

                    {item.scheduledFor && item.status === "APPROVED" && (
                      <span className="flex items-center space-x-1 text-blue-700 font-medium">
                        <Clock className="w-3 h-3 text-blue-600" />
                        <span>Scheduled: {new Date(item.scheduledFor).toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                  {item.status === "DRAFT" && (
                    <button
                      onClick={() => handleSendNow(item.id)}
                      className="inline-flex items-center space-x-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-sm"
                    >
                      <Send className="w-3 h-3" />
                      <span>Send Now</span>
                    </button>
                  )}

                  {item.status === "SENT" && (
                    <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Delivered</span>
                    </span>
                  )}

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
