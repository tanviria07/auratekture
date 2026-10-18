import { Link, Outlet } from 'react-router-dom';

export default function SiteLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-gutter py-6 max-w-7xl w-full mx-auto">
        <Link to="/" className="font-heading text-xl font-medium">Auratekture</Link>
      </header>
      <main className="flex-1"><Outlet /></main>
      <footer className="px-gutter py-8 max-w-7xl w-full mx-auto flex justify-between text-sm text-muted-foreground border-t">
        <span>© Auratekture</span>
        <Link to="/diagnostics" className="hover:text-primary transition-colors">Diagnostics</Link>
      </footer>
    </div>
  );
}