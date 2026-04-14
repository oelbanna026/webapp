import { AppShell } from "../components/layout/AppShell";

export function NotImplemented({ title, subtitle }) {
  return (
    <AppShell>
      <div className="p-8 max-w-[1200px] mx-auto">
        <div className="glass-card rounded-xl p-6">
          <h1 className="font-headline font-black text-2xl tracking-tight uppercase">{title}</h1>
          <p className="mt-2 text-sm text-on-surface-variant">{subtitle || "UI placeholder wired into the app shell."}</p>
          <div className="mt-8 bg-surface-container-highest/60 border border-outline-variant/20 rounded-xl p-5">
            <div className="text-[10px] font-headline font-bold uppercase tracking-widest text-on-surface-variant">
              API Status
            </div>
            <div className="mt-2 font-headline font-black text-sm">
              This feature has route stubs on the backend returning 501.
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

