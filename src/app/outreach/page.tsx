"use client";

import { useEffect, useState, useCallback } from "react";
import { 
  Send, 
  Clock, 
  CheckCircle2, 
  Mail, 
  Calendar, 
  Trash2
} from "lucide-react";

interface OutreachRecord {
  id: string;
  emailTo: string;
  subject: string;
  body: string;
  status: string;
  sentAt?: string | null;
  scheduledFor?: string | null;
  followUpDate?: string | null;
  professor: {
    name: string;
    university: {
      name: string;
      country: string;
    };
  };
}

export default function OutreachPage() {
  const [outreaches, setOutreaches] = useState<OutreachRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const loadOutreaches = useCallback(async () => {
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
  }, [filterStatus]);

  useEffect(() => {
    let ignore = false;
    const url = filterStatus ? `/api/outreach?status=${filterStatus}` : `/api/outreach`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (!ignore && data.success) {
          setOutreaches(data.data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Outreach fetch error:", err);
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sending failed";
      alert(message);
    }
  }

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/outreach/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Pipeline stage updated to ${newStatus.replace(/_/g, " ")}`);
        setTimeout(() => setActionMessage(null), 3000);
        setOutreaches((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status: newStatus } : o))
        );
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update status";
      alert(message);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this outreach record?")) return;
    try {
      await fetch(`/api/outreach/${id}`, { method: "DELETE" });
      loadOutreaches();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Deletion failed";
      alert(message);
    }
  }

  function getStatusBadgeClass(status: string) {
    switch (status) {
      case "OFFER_RECEIVED":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "INTERVIEW_SCHEDULED":
      case "FUNDING_DISCUSSION":
        return "bg-purple-100 text-purple-800 border-purple-300";
      case "REPLY_RECEIVED":
      case "INTERESTED":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "SENT":
        return "bg-teal-100 text-teal-800 border-teal-300";
      case "APPROVED":
        return "bg-indigo-100 text-indigo-800 border-indigo-300";
      case "FOLLOW_UP_DUE":
        return "bg-amber-100 text-amber-900 border-amber-300 font-bold";
      case "REJECTED":
      case "CLOSED":
        return "bg-slate-100 text-slate-600 border-slate-300";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Outreach Pipeline &amp; CRM Stages</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track communication status, manage interactive CRM stage transitions, and automate 8-day follow-ups.
          </p>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { label: "All Pipeline", val: "" },
          { label: "Drafts", val: "DRAFT" },
          { label: "Approved / Scheduled", val: "APPROVED" },
          { label: "Sent", val: "SENT" },
          { label: "Replies", val: "REPLY_RECEIVED" },
          { label: "Interviews", val: "INTERVIEW_SCHEDULED" },
          { label: "Offers", val: "OFFER_RECEIVED" },
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
          <div className="py-16 text-center text-sm text-slate-400">Loading outreach pipeline...</div>
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
                      className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(item.status)}`}
                    >
                      {item.status.replace(/_/g, " ")}
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
                        <span>Follow-up: {new Date(item.followUpDate).toLocaleDateString()}</span>
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

                {/* Actions & Interactive Stage Changer */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 shrink-0">
                  {/* Interactive Stage Dropdown */}
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">Stage:</span>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                    >
                      <option value="DRAFT">Draft</option>
                      <option value="APPROVED">Approved / Queued</option>
                      <option value="SENT">Sent</option>
                      <option value="FOLLOW_UP_DUE">Follow-up Due</option>
                      <option value="FOLLOW_UP_SENT">Follow-up Sent</option>
                      <option value="REPLY_RECEIVED">Reply Received 📩</option>
                      <option value="INTERESTED">Interested ⭐</option>
                      <option value="INTERVIEW_SCHEDULED">Interview Scheduled 🗓️</option>
                      <option value="FUNDING_DISCUSSION">Funding Discussion 💰</option>
                      <option value="APPLICATION_SUBMITTED">App Submitted 📝</option>
                      <option value="OFFER_RECEIVED">Offer Received 🎉</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="CLOSED">Closed / Archived</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
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
                      title="Delete outreach record"
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
