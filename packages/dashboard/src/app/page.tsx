"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "../components/Sidebar";

interface Project {
  id: string;
  name: string;
  url: string;
  crossReferenceIds?: string[];
  createdAt: string;
  crawlSchedule?: string | null;
  nextCrawlAt?: string | null;
  lastCrawledAt?: string | null;
}

interface CrawlStatus {
  status: string;
  progress?: number;
  result?: {
    pagesProcessed: number;
    chunksCreated: number;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCrossRefModalOpen, setIsCrossRefModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [newProject, setNewProject] = useState({ name: "", url: "" });

  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false);
  const [embedCode, setEmbedCode] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState<string>("manual");

  const [isAuthorized, setIsAuthorized] = useState(false);

  const [crawlStatuses, setCrawlStatuses] = useState<Record<string, CrawlStatus>>({});
  const [crawlJobs, setCrawlJobs] = useState<Record<string, string>>({});
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  useEffect(() => {
    if (isAuthorized) {
      fetchProjects();
    }
  }, [isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    const interval = setInterval(() => {
      Object.entries(crawlJobs).forEach(async ([projectId, jobId]) => {
        try {
          const res = await fetch(`${API_URL}/api/crawl/status/${jobId}`);
          if (res.ok) {
            const status = await res.json();
            setCrawlStatuses((prev) => ({ ...prev, [projectId]: status }));

            if (status.status === "completed" || status.status === "failed") {
              setCrawlJobs((prev) => {
                const updated = { ...prev };
                delete updated[projectId];
                return updated;
              });
              fetchProjects();
            }
          }
        } catch (e) {
          console.error("Poll error", e);
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [crawlJobs, isAuthorized]);

  async function fetchProjects() {
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Failed to fetch projects:", error);
    }
  }

  async function createProject() {
    try {
      const res = await fetch(`${API_URL}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProject),
      });
      const project = await res.json();
      setProjects([...projects, project]);
      setIsModalOpen(false);
      setNewProject({ name: "", url: "" });
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  }

  async function updateCrossReferences(projectId: string, crossReferenceIds: string[]) {
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ crossReferenceIds }),
      });
      const updatedProject = await res.json();
      setProjects(projects.map(p => p.id === projectId ? updatedProject : p));
      setIsCrossRefModalOpen(false);
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  }

  async function saveSchedule() {
    if (!selectedProject) return;
    const isManual = scheduleFrequency === 'manual';
    const payload = {
      crawlSchedule: isManual ? null : scheduleFrequency,
      nextCrawlAt: isManual ? null : new Date().toISOString()
    };
    try {
      const res = await fetch(`${API_URL}/api/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const updatedProject = await res.json();
      setProjects(projects.map(p => p.id === selectedProject.id ? updatedProject : p));
      setIsScheduleModalOpen(false);
    } catch (error) {
      console.error("Failed to update schedule:", error);
    }
  }

  async function startCrawl(projectId: string, url: string) {
    try {
      const res = await fetch(`${API_URL}/api/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, url, maxPages: 50 }),
      });
      const data = await res.json();
      setCrawlJobs((prev) => ({ ...prev, [projectId]: data.jobId }));
      setCrawlStatuses((prev) => ({ ...prev, [projectId]: { status: "active" } }));
    } catch (error) {
      console.error("Failed to start crawl:", error);
    }
  }

  async function deleteProject(id: string) {
    try {
      await fetch(`${API_URL}/api/projects/${id}`, { method: "DELETE" });
      setProjects(projects.filter((p) => p.id !== id));
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  }

  function getEmbedCode(projectId: string) {
    return `<script src="${API_URL}/widget.js" data-project-id="${projectId}" data-api-url="${API_URL}"></script>`;
  }

  function handleShowEmbed(projectId: string) {
    setEmbedCode(getEmbedCode(projectId));
    setCopySuccess(false);
    setIsEmbedModalOpen(true);
  }

  function openCrossRefModal(project: Project) {
    setSelectedProject(project);
    setIsCrossRefModalOpen(true);
  }

  function openScheduleModal(project: Project) {
    setSelectedProject(project);
    setScheduleFrequency(project.crawlSchedule || 'manual');
    setIsScheduleModalOpen(true);
  }

  if (!isAuthorized) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="relative">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 animate-spin"></div>
          <div className="absolute inset-0 bg-white/20 blur-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-indigo-500/30">
      <Sidebar />

      <main className="ml-64 p-8 min-h-screen">
        {/* Header Section */}
        <header className="flex justify-between items-end mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 mb-2">
              Command Center
            </h1>
            <p className="text-indigo-200/60 font-medium">Manage your crawl agents and knowledge bases</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="group relative px-6 py-3 rounded-xl font-semibold text-white shadow-xl shadow-indigo-500/20 overflow-hidden transition-all hover:scale-105 hover:shadow-indigo-500/40"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 transition-all group-hover:opacity-90"></div>
            <div className="relative flex items-center gap-2">
              <span className="text-lg">+</span> New Project
            </div>
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
          {[
            { label: "Active Projects", value: projects.length, color: "text-emerald-400" },
            { label: "Total Pages", value: projects.reduce((acc, p) => acc + (crawlStatuses[p.id]?.result?.pagesProcessed || 0), 0), color: "text-blue-400" },
            { label: "System Status", value: "Optimal", color: "text-purple-400" },
            { label: "Next Crawl", value: "2m", color: "text-amber-400" }
          ].map((stat, i) => (
            <div key={i} className="glass-card p-5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="text-slate-400 text-sm font-medium mb-1">{stat.label}</div>
              <div className={`text-2xl font-bold ${stat.color} drop-shadow-sm`}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 glass-card rounded-2xl border-dashed border-2 border-white/10 animate-in fade-in duration-700">
            <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 text-4xl shadow-inner">
              🤖
            </div>
            <h3 className="text-xl font-medium text-white">No projects initialized</h3>
            <p className="text-slate-400 mt-2 max-w-sm text-center">Your agent fleet is empty. Create a new project to start building your knowledge base.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 hover:bg-white/[0.08] hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300"
              >
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="overflow-hidden">
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-200 transition-colors truncate">
                      {project.name}
                    </h3>
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-300/80 hover:text-indigo-300 truncate block mt-1 hover:underline decoration-indigo-500/30"
                    >
                      {project.url}
                    </a>
                  </div>
                  <button
                    onClick={() => deleteProject(project.id)}
                    className="text-slate-600 hover:text-rose-500 p-2 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>

                {/* Status Indicator Bar */}
                <div className="mb-6 bg-black/20 rounded-lg p-3 border border-white/5">
                  {crawlStatuses[project.id]?.status === "active" ? (
                    <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                      </span>
                      Crawling in progress...
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                        Active
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {project.lastCrawledAt ? new Date(project.lastCrawledAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'Never'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Schedule</span>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${project.crawlSchedule ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {project.crawlSchedule || "Manual"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-500 text-xs uppercase tracking-wider font-semibold">Refs</span>
                    <span className="mt-1 text-slate-300">{project.crossReferenceIds?.length || 0} External</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => startCrawl(project.id, project.url)}
                    disabled={crawlJobs[project.id] !== undefined}
                    className="col-span-2 bg-white/5 hover:bg-white/10 text-white py-2 rounded-lg text-sm font-medium transition-all border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {crawlJobs[project.id] ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Processing
                      </>
                    ) : (
                      "Trigger Crawl"
                    )}
                  </button>
                  <button
                    onClick={() => openCrossRefModal(project)}
                    className="bg-black/20 hover:bg-black/40 text-slate-300 py-2 rounded-lg text-xs font-medium transition-colors border border-transparent hover:border-white/10"
                  >
                    References
                  </button>
                  <button
                    onClick={() => openScheduleModal(project)}
                    className="bg-black/20 hover:bg-black/40 text-slate-300 py-2 rounded-lg text-xs font-medium transition-colors border border-transparent hover:border-white/10"
                  >
                    Schedule
                  </button>
                </div>

                <button
                  onClick={() => handleShowEmbed(project.id)}
                  className="absolute top-6 right-6 text-slate-600 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Modals - Dark Mode Styling */}
        {/* Create Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-[#0f172a] rounded-2xl border border-white/10 p-8 w-full max-w-md mx-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white">✕</button>
              </div>
              <h2 className="text-2xl font-bold text-white mb-6">New Knowledge Base</h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Project Name</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                    placeholder="e.g. Documentation Bot"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Target URL</label>
                  <input
                    type="url"
                    value={newProject.url}
                    onChange={(e) => setNewProject({ ...newProject, url: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder-slate-600"
                    placeholder="https://docs.example.com"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl font-medium transition-colors">Cancel</button>
                <button onClick={createProject} disabled={!newProject.name || !newProject.url} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50">Create Agent</button>
              </div>
            </div>
          </div>
        )}

        {/* Schedule Modal */}
        {isScheduleModalOpen && selectedProject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#0f172a] rounded-2xl border border-white/10 p-8 w-full max-w-sm mx-4 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-2">Crawl Schedule</h2>
              <p className="text-slate-400 text-sm mb-6">Automate updates for <span className="text-indigo-400">{selectedProject.name}</span></p>

              <div className="space-y-2">
                {['manual', 'daily', 'weekly', 'monthly'].map((type) => (
                  <label key={type} className={`flex items-center p-4 rounded-xl cursor-pointer transition-all border ${scheduleFrequency === type
                      ? 'bg-indigo-600/20 border-indigo-500/50'
                      : 'bg-white/5 border-transparent hover:bg-white/10'
                    }`}>
                    <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${scheduleFrequency === type ? 'border-indigo-500' : 'border-slate-500'
                      }`}>
                      {scheduleFrequency === type && <div className="h-2 w-2 rounded-full bg-indigo-500"></div>}
                    </div>
                    <input type="radio" name="schedule" value={type} checked={scheduleFrequency === type} onChange={(e) => setScheduleFrequency(e.target.value)} className="hidden" />
                    <span className={`ml-3 font-medium capitalize ${scheduleFrequency === type ? 'text-white' : 'text-slate-400'}`}>{type}</span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setIsScheduleModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl font-medium transition-colors">Cancel</button>
                <button onClick={saveSchedule} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-colors">Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Embed Modal */}
        {isEmbedModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#0f172a] rounded-2xl border border-white/10 p-8 w-full max-w-lg mx-4 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Integration Code</h2>
              <p className="text-slate-400 mb-4 text-sm">Add this snippet to your site's <code className="bg-white/10 px-1 py-0.5 rounded text-indigo-300 text-xs">body</code> tag.</p>
              <div className="bg-black/50 rounded-xl border border-white/5 p-4 mb-6 relative group">
                <pre className="text-indigo-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap break-all pr-12">{embedCode}</pre>
                <button
                  onClick={() => { navigator.clipboard.writeText(embedCode); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }}
                  className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition"
                >
                  {copySuccess ? <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>}
                </button>
              </div>
              <button onClick={() => setIsEmbedModalOpen(false)} className="w-full bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl font-medium transition-colors">Close</button>
            </div>
          </div>
        )}

        {/* Cross Ref Modal */}
        {isCrossRefModalOpen && selectedProject && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-[#0f172a] rounded-2xl border border-white/10 p-8 w-full max-w-md mx-4 shadow-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Linked Knowledge</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {projects.filter(p => p.id !== selectedProject.id).map((p) => (
                  <label key={p.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 border border-transparent hover:border-white/10 transition-all">
                    <input
                      type="checkbox"
                      checked={selectedProject.crossReferenceIds?.includes(p.id)}
                      onChange={(e) => {
                        const currentIds = selectedProject.crossReferenceIds || [];
                        const newIds = e.target.checked ? [...currentIds, p.id] : currentIds.filter(id => id !== p.id);
                        setSelectedProject({ ...selectedProject, crossReferenceIds: newIds });
                      }}
                      className="h-5 w-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
                    />
                    <div>
                      <div className="text-sm font-medium text-white">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[200px]">{p.url}</div>
                    </div>
                  </label>
                ))}
                {projects.length <= 1 && <p className="text-slate-500 text-sm text-center py-4">No other projects available.</p>}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsCrossRefModalOpen(false)} className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-3 rounded-xl font-medium transition-colors">Cancel</button>
                <button onClick={() => updateCrossReferences(selectedProject.id, selectedProject.crossReferenceIds || [])} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-medium transition-colors">Save Relations</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
