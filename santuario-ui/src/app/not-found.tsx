import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-950 text-white min-h-[60vh]">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600/10 text-blue-500 mb-6 border border-blue-500/20 shadow-2xl">
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <h1 className="text-3xl font-black mb-2">404 - Página no encontrada</h1>
      <p className="text-sm text-zinc-400 max-w-md mb-8">
        El episodio o la ruta que intentas acceder no existe en la base de datos de tu Santuario.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </svg>
        Regresar al Catálogo Principal
      </Link>
    </main>
  );
}
