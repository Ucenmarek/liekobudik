import { BottomNav } from "@/components/ui";

export default function Page() {
  return (
    <>
      <main className="screen has-nav">
        <h1 className="h1">Merania</h1>
        <div className="card muted" style={{ padding: 16, fontSize: 16 }}>
          Zápis tlaku ráno a večer a prehľad pre lekára pribudnú v ďalšej etape.
        </div>
      </main>
      <BottomNav />
    </>
  );
}
