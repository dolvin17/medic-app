import Image from "next/image"

export default function Header() {
	return (
		<>
		  <header className="flex flex-col items-center gap-4 py-4 mb-4">
					<div className="p-3 rounded-2xl bg-white/[0.03] overflow-hidden border border-white/[0.08] shadow-inner">
					  <Image 
						src="/caduceo.svg" 
						height="48" 
						width="48" 
						alt="Logo Medicina"
						className="drop-shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-175  animate-in fade-in duration-1000"
					  />
					</div>
					<div className="text-center">
					  <h1 className="text-xs tracking-tight text-white">HECHO CON MUCHO AMOR</h1>
					  <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-medium">PANEL DE VISUALIZACIÓN</p>
					</div>
				  </header>
		</>
	)
}