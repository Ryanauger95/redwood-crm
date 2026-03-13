import { Sidebar } from "@/components/shared/Sidebar";
import { GlobalSearch } from "@/components/shared/GlobalSearch";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userName = session?.user?.name || "User";
  const userRole = (session?.user as { role?: string })?.role;
  const initials = userName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="flex min-h-screen">
      <Sidebar showAdmin={userRole === "admin"} />
      <div className="flex-1 ml-14 flex flex-col min-h-screen">
        {/* Top Header Bar */}
        <header className="h-[54px] bg-white/80 backdrop-blur-sm border-b border-gray-200/80 flex items-center px-6 gap-4 sticky top-0 z-20 flex-shrink-0">
          <div className="flex-1 max-w-xs">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2.5 pl-3 border-l border-gray-200">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1D4ED8] flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                {initials}
              </div>
              <span className="text-[13px] font-medium text-gray-600 hidden sm:block">{userName}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
