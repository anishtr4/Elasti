"use client";

import { useState, useEffect } from "react";

interface Project {
    id: string;
    name: string;
    url: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function AnalyticsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedProject, setSelectedProject] = useState<string>("");
    const [question, setQuestion] = useState("");
    const [conversation, setConversation] = useState<Array<{ role: string, content: string, sources?: any[] }>>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        fetchProjects();
    }, []);

    async function fetchProjects() {
        try {
            const res = await fetch(`${API_URL}/api/projects`);
            const data = await res.json();
            setProjects(data);
            if (data.length > 0) setSelectedProject(data[0].id);
        } catch (error) {
            console.error("Failed to fetch projects:", error);
        }
    }

    async function askQuestion() {
        if (!question.trim() || !selectedProject) return;

        const userMessage = question;
        setQuestion("");
        setConversation(prev => [...prev, { role: "user", content: userMessage }]);
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectId: selectedProject, question: userMessage }),
            });
            const data = await res.json();
            setConversation(prev => [...prev, {
                role: "assistant",
                content: data.answer,
                sources: data.sources
            }]);
        } catch (error) {
            setConversation(prev => [...prev, {
                role: "assistant",
                content: "Error: Failed to get response"
            }]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Test Chat</h1>
                <p className="text-gray-600 mt-1">Test your Q&A bot before embedding</p>
            </div>

            {/* Project Selector */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Project
                </label>
                <select
                    value={selectedProject}
                    onChange={(e) => {
                        setSelectedProject(e.target.value);
                        setConversation([]);
                    }}
                    className="w-full md:w-auto border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500"
                >
                    {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                            {project.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Chat Window */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4">
                    <h3 className="text-white font-semibold">Chat Preview</h3>
                </div>

                <div className="h-96 overflow-y-auto p-4 bg-gray-50 space-y-4">
                    {conversation.length === 0 ? (
                        <div className="text-center text-gray-500 py-16">
                            Ask a question to test your bot
                        </div>
                    ) : (
                        conversation.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === "user"
                                            ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                                            : "bg-white shadow-sm border border-gray-100"
                                        }`}
                                >
                                    <p className="text-sm">{msg.content}</p>
                                    {msg.sources && msg.sources.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <p className="text-xs text-gray-500">Sources:</p>
                                            {msg.sources.map((source, j) => (
                                                <a
                                                    key={j}
                                                    href={source.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-xs text-indigo-600 hover:underline block"
                                                >
                                                    {source.title}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white shadow-sm border border-gray-100 rounded-2xl px-4 py-3">
                                <div className="flex space-x-2">
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 flex gap-3">
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && askQuestion()}
                        placeholder="Ask a question..."
                        className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                    <button
                        onClick={askQuestion}
                        disabled={isLoading || !question.trim()}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-full font-medium hover:opacity-90 transition disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>

            {/* Stats placeholder */}
            <div className="grid grid-cols-3 gap-4 mt-8">
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <div className="text-3xl font-bold text-indigo-600">-</div>
                    <div className="text-sm text-gray-600">Questions Today</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">-</div>
                    <div className="text-sm text-gray-600">Answered</div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                    <div className="text-3xl font-bold text-purple-600">-</div>
                    <div className="text-sm text-gray-600">Avg Response Time</div>
                </div>
            </div>
        </div>
    );
}
