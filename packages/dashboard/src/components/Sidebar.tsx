"use client";

import { usePathname, useRouter } from "next/navigation";

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user");
        router.push("/login");
    };

    const navItems = [
        { label: "Projects", href: "/", icon: "Grid" },
        { label: "Schedule", href: "#", icon: "Clock", disabled: true },
        { label: "Settings", href: "#", icon: "Settings", disabled: true },
    ];

    return (
        <div className="w-64 border-r border-white/10 flex flex-col justify-between bg-black/20 backdrop-blur-xl h-screen fixed left-0 top-0 z-50">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="h-8 w-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/20">
                        E
                    </div>
                    <span className="font-bold text-lg tracking-tight">Elasti</span>
                </div>

                <nav className="space-y-1">
                    {navItems.map((item) => (
                        <button
                            key={item.label}
                            disabled={item.disabled}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${pathname === item.href && !item.disabled
                                    ? "bg-white/10 text-white shadow-sm"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                                } ${item.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {/* Simple Icons */}
                            {item.icon === "Grid" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            )}
                            {item.icon === "Clock" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            )}
                            {item.icon === "Settings" && (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            )}
                            {item.label}
                            {item.disabled && <span className="ml-auto text-xs bg-white/5 px-1.5 py-0.5 rounded text-gray-500">Soon</span>}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="p-6 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 text-gray-400 hover:text-red-400 transition-colors text-sm font-medium w-full"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    Log Out
                </button>
            </div>
        </div>
    );
}
