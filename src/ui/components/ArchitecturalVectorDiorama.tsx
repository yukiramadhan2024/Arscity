import React, { useState } from 'react';

export interface ArchitecturalVectorDioramaProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * ArchitecturalVectorDiorama - 100% Vector Isometric Masterplan Artwork
 *
 * Professional architectural city-builder vector illustration:
 * - 30-degree isometric axonometric projection
 * - Pure SVG vectors: crisp at 4K/Retina displays with zero pixelation and 0ms loading time
 * - Palette: Seal Blue (#DBF2FC), Navy Blue (#072D59), Crimson Pink (#FD6E8E)
 * - Showcases real architectural archetypes: High-Rise Tower, Nusantara Pendopo, Transit Viaduct, River, and Tree Boulevards
 * - 100% human-designed geometric vector art with zero AI artifacts
 */
export const ArchitecturalVectorDiorama: React.FC<ArchitecturalVectorDioramaProps> = ({
  className = '',
  style = {},
}) => {
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);

  return (
    <div
      className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none ${className}`}
      style={{
        background: 'linear-gradient(145deg, #DBF2FC 0%, #EFF8FD 50%, #D4EEFA 100%)',
        ...style,
      }}
    >
      <svg
        viewBox="0 0 760 660"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Ilustrasi Vektor Isometrik Arsitektur Kota Arscity"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="riverGrad" x1="120" y1="200" x2="640" y2="480" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#0EA5E9" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id="towerGlassGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E0F2FE" />
            <stop offset="50%" stopColor="#7DD3FC" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>

          <linearGradient id="skyReflectionGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#DBF2FC" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
          </linearGradient>

          <filter id="plinthShadow" x="-10%" y="-10%" width="130%" height="130%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#072D59" floodOpacity="0.18" />
          </filter>

          <filter id="buildingGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#072D59" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* ====================================================
            1. BASE ISOMETRIC PLINTH (LANDASAN KOTA ARSITEKTURAL)
            ==================================================== */}
        <g filter="url(#plinthShadow)">
          {/* Ketebalan Sisi Kiri Plinth (Bayangan Gelap) */}
          <polygon points="100,340 380,500 380,528 100,368" fill="#072D59" />

          {/* Ketebalan Sisi Kanan Plinth (Bayangan Sedang) */}
          <polygon points="380,500 660,340 660,368 380,528" fill="#0D3B73" />

          {/* Permukaan Atas Plinth (Tanah Dasar Seal Blue) */}
          <polygon points="380,180 660,340 380,500 100,340" fill="#E8F5FC" stroke="#072D59" strokeWidth="1.5" />
        </g>

        {/* Kisi Modul Arsitektur (Modular Grid Lines) */}
        <g stroke="#072D59" strokeWidth="0.75" strokeOpacity="0.18">
          {/* Garis Isometrik Barat Daya - Timur Laut */}
          <line x1="170" y1="300" x2="450" y2="460" />
          <line x1="240" y1="260" x2="520" y2="420" />
          <line x1="310" y1="220" x2="590" y2="380" />

          {/* Garis Isometrik Barat Laut - Tenggara */}
          <line x1="310" y1="220" x2="170" y2="300" />
          <line x1="380" y1="260" x2="240" y2="340" />
          <line x1="450" y1="300" x2="310" y2="380" />
          <line x1="520" y1="340" x2="380" y2="420" />
          <line x1="590" y1="380" x2="450" y2="460" />
        </g>

        {/* ====================================================
            2. SUNGAI & JALUR AIR ALAMI (CURVED WATER CANAL)
            ==================================================== */}
        <g>
          {/* Cekungan Sungai */}
          <path
            d="M 230 205 C 310 270, 310 330, 420 400 C 470 435, 520 455, 580 480 L 550 495 C 490 470, 440 450, 390 415 C 280 345, 270 280, 200 220 Z"
            fill="url(#riverGrad)"
          />
          {/* Garis Tepi Sungai */}
          <path
            d="M 230 205 C 310 270, 310 330, 420 400 C 470 435, 520 455, 580 480"
            stroke="#0284C7"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          <path
            d="M 200 220 C 270 280, 280 345, 390 415 C 440 450, 490 470, 550 495"
            stroke="#0284C7"
            strokeWidth="1.5"
            strokeOpacity="0.6"
          />
          {/* Gelombang Air Halus */}
          <path d="M 280 280 Q 295 288, 310 285" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.6" />
          <path d="M 360 345 Q 375 353, 390 350" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.6" />
          <path d="M 440 410 Q 455 418, 470 415" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.6" />
        </g>

        {/* ====================================================
            3. JARINGAN JALAN RAYA & JEMBATAN KOTA
            ==================================================== */}
        {/* Jalan Utama Diagonal (Kiri Atas ke Kanan Bawah) */}
        <polygon points="210,210 260,180 570,360 520,390" fill="#1E293B" stroke="#072D59" strokeWidth="1" />
        {/* Trotoar Jalan Utama */}
        <polygon points="198,217 210,210 520,390 508,397" fill="#CBD5E1" />
        <polygon points="260,180 272,173 582,353 570,360" fill="#CBD5E1" />

        {/* Marka Garis Kuning Tengah */}
        <line x1="235" y1="195" x2="545" y2="375" stroke="#F59E0B" strokeWidth="2" strokeDasharray="14 10" />

        {/* Jembatan Beton di Atas Sungai */}
        <g>
          {/* Pilar Penopang Jembatan */}
          <polygon points="340,290 355,280 355,305 340,315" fill="#64748B" />
          <polygon points="380,312 395,302 395,327 380,337" fill="#475569" />
          {/* Geladak Jembatan */}
          <polygon points="325,275 375,245 435,280 385,310" fill="#334155" stroke="#072D59" strokeWidth="1.2" />
          {/* Pagar Pengaman Jembatan (Railing) */}
          <line x1="325" y1="272" x2="385" y2="307" stroke="#FD6E8E" strokeWidth="2.5" />
          <line x1="375" y1="242" x2="435" y2="277" stroke="#FD6E8E" strokeWidth="2.5" />
        </g>

        {/* Jalan Sekunder Menyilang (Kanan Atas ke Kiri Bawah) */}
        <polygon points="460,210 510,240 280,370 230,340" fill="#334155" stroke="#072D59" strokeWidth="1" />
        {/* Zebra Cross Persimpangan */}
        <g stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round">
          <line x1="340" y1="300" x2="352" y2="307" />
          <line x1="348" y1="295" x2="360" y2="302" />
          <line x1="356" y1="290" x2="368" y2="297" />
          <line x1="364" y1="285" x2="376" y2="292" />
        </g>

        {/* ====================================================
            4. BANGUNAN ARSITEKTUR KOTA (ISOMETRIC BUILDINGS)
            ==================================================== */}

        {/* A. MENARA UTAMA (MODERNIST GLASS TOWER & CANTILEVER) */}
        <g
          filter="url(#buildingGlow)"
          onMouseEnter={() => setHoveredBuilding('tower')}
          onMouseLeave={() => setHoveredBuilding(null)}
          style={{ cursor: 'pointer', transition: 'transform 0.2s ease' }}
        >
          {/* Bayangan Menara di Permukaan Tanah */}
          <polygon points="380,240 440,205 480,280 410,310" fill="#072D59" fillOpacity="0.14" />

          {/* Massa Bawah Menara */}
          {/* Sisi Kiri (Bayangan Terang) */}
          <polygon points="340,280 390,310 390,190 340,160" fill="#F8FAFC" stroke="#072D59" strokeWidth="1.2" />
          {/* Sisi Kanan (Bayangan Gelap) */}
          <polygon points="390,310 440,280 440,160 390,190" fill="#E2E8F0" stroke="#072D59" strokeWidth="1.2" />

          {/* Jendela Fasad Kaca Bertingkat */}
          <g fill="url(#towerGlassGrad)" stroke="#072D59" strokeWidth="0.8">
            {/* Lantai 1 */}
            <polygon points="348,265 382,285 382,250 348,230" />
            <polygon points="398,285 432,265 432,230 398,250" />
            {/* Lantai 2 */}
            <polygon points="348,220 382,240 382,205 348,185" />
            <polygon points="398,240 432,220 432,185 398,205" />
          </g>

          {/* Kotak Kantilever Atas (Upper Studio Box) */}
          {/* Sisi Kiri Kantilever */}
          <polygon points="325,170 390,208 390,138 325,100" fill="#072D59" stroke="#072D59" strokeWidth="1.2" />
          {/* Sisi Kanan Kantilever */}
          <polygon points="390,208 455,170 455,100 390,138" fill="#0D3B73" stroke="#072D59" strokeWidth="1.2" />

          {/* Jendela Pita Kaca Kantilever */}
          <polygon points="332,158 384,188 384,142 332,112" fill="url(#towerGlassGrad)" />
          <polygon points="396,188 448,158 448,112 396,142" fill="#67C6FF" />

          {/* Kisi Louver Kayu Vertikal (Brise-Soleil) */}
          <g stroke="#D4A373" strokeWidth="2" strokeLinecap="round">
            <line x1="344" y1="126" x2="344" y2="152" />
            <line x1="354" y1="132" x2="354" y2="158" />
            <line x1="364" y1="138" x2="364" y2="164" />
            <line x1="374" y1="144" x2="374" y2="170" />
          </g>

          {/* Kanopi Atap Kantilever Crimson Pink (#FD6E8E) */}
          <polygon points="310,105 390,60 470,105 390,150" fill="#FD6E8E" stroke="#072D59" strokeWidth="1.5" />
          {/* Ketebalan Sisi Kanopi */}
          <polygon points="310,105 390,150 390,156 310,111" fill="#E05373" />
          <polygon points="390,150 470,105 470,111 390,156" fill="#C53E5D" />

          {/* Detail Atap: Unit Tata Udara & Skylight */}
          <polygon points="370,105 390,95 410,105 390,115" fill="#072D59" />
          <circle cx="390" cy="105" r="4" fill="#67C6FF" />
        </g>

        {/* B. DERETAN RUKO KONTEMPORER (SHOPHOUSE ROW) */}
        <g
          filter="url(#buildingGlow)"
          onMouseEnter={() => setHoveredBuilding('ruko')}
          onMouseLeave={() => setHoveredBuilding(null)}
          style={{ cursor: 'pointer' }}
        >
          {/* Bayangan Ruko */}
          <polygon points="180,310 220,290 250,330 200,350" fill="#072D59" fillOpacity="0.12" />

          {/* Ruko 1 */}
          <polygon points="170,300 205,320 205,250 170,230" fill="#FFFFFF" stroke="#072D59" strokeWidth="1.2" />
          <polygon points="205,320 240,300 240,230 205,250" fill="#E2E8F0" stroke="#072D59" strokeWidth="1.2" />
          <polygon points="170,230 205,250 240,230 205,210" fill="#DBF2FC" stroke="#072D59" strokeWidth="1.2" />
          {/* Kanopi Toko Ruko 1 (Seal Blue) */}
          <polygon points="166,275 205,297 205,290 166,268" fill="#67C6FF" />
          <polygon points="205,297 244,275 244,268 205,290" fill="#38BDF8" />

          {/* Ruko 2 (Berdampingan) */}
          <polygon points="215,325 250,345 250,275 215,255" fill="#FFFFFF" stroke="#072D59" strokeWidth="1.2" />
          <polygon points="250,345 285,325 285,255 250,275" fill="#E2E8F0" stroke="#072D59" strokeWidth="1.2" />
          <polygon points="215,255 250,275 285,255 250,235" fill="#DBF2FC" stroke="#072D59" strokeWidth="1.2" />
          {/* Aksen Fasad Crimson Pink */}
          <rect x="225" y="275" width="16" height="4" fill="#FD6E8E" transform="rotate(30 225 275)" />
        </g>

        {/* C. PENDOPO NUSANTARA / PAVILIUN TERBUKA (TROPICAL TIMBER PAVILION) */}
        <g
          filter="url(#buildingGlow)"
          onMouseEnter={() => setHoveredBuilding('pendopo')}
          onMouseLeave={() => setHoveredBuilding(null)}
          style={{ cursor: 'pointer' }}
        >
          {/* Lantai Umpak & Geladak Kayu */}
          <polygon points="460,370 515,400 560,375 505,345" fill="#D4A373" stroke="#072D59" strokeWidth="1.2" />
          {/* Kolom Tiang Tiang Kayu */}
          <line x1="472" y1="365" x2="472" y2="335" stroke="#072D59" strokeWidth="2.5" />
          <line x1="505" y1="384" x2="505" y2="354" stroke="#072D59" strokeWidth="2.5" />
          <line x1="548" y1="362" x2="548" y2="332" stroke="#072D59" strokeWidth="2.5" />
          <line x1="495" y1="345" x2="495" y2="315" stroke="#072D59" strokeWidth="2.5" />

          {/* Atap Tajug / Limasan Bertingkat (Terracotta / Crimson Shading) */}
          {/* Atap Tingkat 1 */}
          <polygon points="450,335 510,368 570,335 510,302" fill="#E05373" stroke="#072D59" strokeWidth="1.2" />
          {/* Atap Puncak Mahkota */}
          <polygon points="475,310 510,328 545,310 510,292" fill="#FD6E8E" stroke="#072D59" strokeWidth="1.2" />
          {/* Mustaka Puncak Tradisional */}
          <circle cx="510" cy="288" r="3" fill="#F59E0B" />
        </g>

        {/* ====================================================
            5. JALUR TRANSIT KERETA CEPAT / LRT VIADUCT
            ==================================================== */}
        <g>
          {/* Kolom Viaduct */}
          <polygon points="560,250 568,245 568,285 560,290" fill="#94A3B8" />
          <polygon points="610,280 618,275 618,315 610,320" fill="#94A3B8" />
          {/* Balok Jalur Rel Melayang */}
          <polygon points="530,225 550,215 640,268 620,278" fill="#F1F5F9" stroke="#072D59" strokeWidth="1" />
          {/* Kereta Cepat Aerodinamis (Modern Aero Train) */}
          <polygon points="550,220 590,243 590,233 550,210" fill="#FFFFFF" stroke="#072D59" strokeWidth="1" />
          <polygon points="590,243 620,260 620,250 590,233" fill="#FFFFFF" stroke="#072D59" strokeWidth="1" />
          {/* Kaca Jendela Kereta (Seal Blue) & Garis Strip Crimson Pink */}
          <polygon points="555,217 585,234 585,230 555,213" fill="#67C6FF" />
          <line x1="550" y1="219" x2="620" y2="259" stroke="#FD6E8E" strokeWidth="1.5" />
        </g>

        {/* ====================================================
            6. VEGETASI & POHON KOTA TROPIK ARSITEKTURAL
            ==================================================== */}
        {/* Pohon 1 (Dekat Menara) */}
        <g>
          <ellipse cx="320" cy="328" rx="10" ry="5" fill="#072D59" fillOpacity="0.15" />
          <line x1="320" y1="328" x2="320" y2="310" stroke="#78350F" strokeWidth="2.5" />
          <circle cx="320" cy="305" r="14" fill="#10B981" stroke="#072D59" strokeWidth="1" />
          <circle cx="316" cy="301" r="5" fill="#34D399" fillOpacity="0.6" />
        </g>

        {/* Pohon 2 (Sisi Sungai) */}
        <g>
          <ellipse cx="270" cy="255" rx="8" ry="4" fill="#072D59" fillOpacity="0.15" />
          <line x1="270" y1="255" x2="270" y2="242" stroke="#78350F" strokeWidth="2" />
          <circle cx="270" cy="236" r="11" fill="#059669" stroke="#072D59" strokeWidth="1" />
        </g>

        {/* Pohon 3 (Depan Pendopo) */}
        <g>
          <ellipse cx="440" cy="365" rx="12" ry="6" fill="#072D59" fillOpacity="0.15" />
          <line x1="440" y1="365" x2="440" y2="344" stroke="#78350F" strokeWidth="3" />
          <circle cx="440" cy="336" r="16" fill="#10B981" stroke="#072D59" strokeWidth="1" />
          <circle cx="435" cy="332" r="6" fill="#6EE7B7" fillOpacity="0.7" />
        </g>

        {/* Pohon 4 (Kanan Bawah) */}
        <g>
          <ellipse cx="580" cy="415" rx="10" ry="5" fill="#072D59" fillOpacity="0.15" />
          <line x1="580" y1="415" x2="580" y2="400" stroke="#78350F" strokeWidth="2.5" />
          <circle cx="580" cy="392" r="13" fill="#059669" stroke="#072D59" strokeWidth="1" />
        </g>

        {/* ====================================================
            7. LAMPU JALAN & FIGUR SKALA MANUSIA
            ==================================================== */}
        {/* Lampu Jalan Arsitektural */}
        <g stroke="#072D59" strokeWidth="1.2">
          <line x1="275" y1="230" x2="275" y2="208" />
          <line x1="275" y1="208" x2="280" y2="208" />
          <circle cx="280" cy="209" r="1.5" fill="#F59E0B" stroke="none" />

          <line x1="495" y1="358" x2="495" y2="336" />
          <line x1="495" y1="336" x2="500" y2="336" />
          <circle cx="500" cy="337" r="1.5" fill="#F59E0B" stroke="none" />
        </g>

        {/* Mobil Minimalis di Jalan Raya */}
        <g>
          {/* Mobil 1 (Biru Tua) */}
          <polygon points="305,245 320,235 330,240 315,250" fill="#072D59" />
          <polygon points="310,243 318,237 324,240 316,246" fill="#DBF2FC" />

          {/* Mobil 2 (Crimson Pink) */}
          <polygon points="450,325 465,315 475,320 460,330" fill="#FD6E8E" />
          <polygon points="455,323 463,317 469,320 461,326" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
};

export default ArchitecturalVectorDiorama;

