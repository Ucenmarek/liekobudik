import { BottomNav } from "@/components/ui";

export default function Page() {
  return (
    <>
      <main className="screen has-nav">
        <h1 className="h1">Lekári</h1>
        <div className="card muted" style={{ padding: 16, fontSize: 16 }}>
          Návštevy, preventívne prehliadky a kontakty na lekárov pribudnú v ďalšej etape.
        </div>
      </main>
      <BottomNav />
    </>
  );
}
