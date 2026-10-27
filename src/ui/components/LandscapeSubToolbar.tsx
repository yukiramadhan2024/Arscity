import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SPRING_TACTILE } from '../motion/appleSprings';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { useUIStore } from '../state/useUIStore';
import { LandscapeType } from '../../world/LandscapeManager';
import {
  Trees,
  Flower2,
  Landmark,
  Armchair,
  Waves,
  Sparkles,
  Clock,
  Lamp,
  Grid,
  Droplets,
  Droplet,
  CircleDot,
  Spline,
  Castle,
  Footprints,
  Sun,
  X,
  LucideIcon
} from 'lucide-react';

export type LandscapeCategory = 'flora' | 'monument' | 'furniture' | 'waterfront';

export interface LandscapeItemOption {
  type: LandscapeType;
  category: LandscapeCategory;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  badge?: string;
  badgeColor?: string;
  desc: string;
}

export const LANDSCAPE_CATALOG: LandscapeItemOption[] = [
  // --- Category 1: Pohon & Flora ---
  {
    type: 'tree_tabebuya_pink',
    category: 'flora',
    label: 'Tabebuya Pink',
    sublabel: 'Sakura Tropis',
    icon: Flower2,
    badge: '-2.0 C',
    badgeColor: '#ec4899',
    desc: 'Handroanthus heptaphyllus kanopi bunga merah muda penurun suhu mikro'
  },
  {
    type: 'tree_tabebuya_gold',
    category: 'flora',
    label: 'Tabebuya Emas',
    sublabel: 'Kuning Tropis',
    icon: Sun,
    badge: '-2.0 C',
    badgeColor: '#eab308',
    desc: 'Handroanthus chrysotrichus guguran kelopak emas cerah bertekstur'
  },
  {
    type: 'tree_flamboyan',
    category: 'flora',
    label: 'Pohon Flamboyan',
    sublabel: 'Delonix Regia',
    icon: Flower2,
    badge: '-2.4 C',
    badgeColor: '#f97316',
    desc: 'Pohon peneduh payung lebar dengan kuntum bunga merah jingga menyala'
  },
  {
    type: 'tree_frangipani',
    category: 'flora',
    label: 'Kamboja Fosil Bali',
    sublabel: 'Plumeria Rubra',
    icon: Sparkles,
    badge: 'Estetika',
    badgeColor: '#a855f7',
    desc: 'Batang artistik berliuk dengan kelompok bunga putih semburat kuning'
  },
  {
    type: 'tree_banyan_kurung',
    category: 'flora',
    label: 'Beringin Kurung',
    sublabel: 'Ficus Benjamina',
    icon: Trees,
    badge: '-3.2 C',
    badgeColor: '#10b981',
    desc: 'Pohon beringin ikonik keraton dengan akar gantung dan pagar kurung bata putih'
  },
  {
    type: 'flora_bougainvillea_arch',
    category: 'flora',
    label: 'Arch Bugenvil',
    sublabel: 'Terowongan Bunga',
    icon: Flower2,
    badge: '+10 Poin',
    badgeColor: '#f43f5e',
    desc: 'Lengkungan teralis berkanopi lebat bunga bugenvil magenta untuk pedestrian'
  },
  {
    type: 'flora_yellow_bamboo',
    category: 'flora',
    label: 'Bambu Kuning',
    sublabel: 'Bambusa Vulgaris',
    icon: Trees,
    badge: '-5.0 dBA',
    badgeColor: '#84cc16',
    desc: 'Rumpun bambu beruas emas peredam kebisingan jalan raya dengan uplight malam'
  },
  {
    type: 'flora_lotus_water',
    category: 'flora',
    label: 'Teratai Air',
    sublabel: 'Nelumbo Nucifera',
    icon: Droplet,
    badge: '-2.5 C',
    badgeColor: '#06b6d4',
    desc: 'Kolam lilipad teratai mekar dengan pendinginan evaporatif dan iluminasi dasar'
  },
  {
    type: 'tree_asam_jawa',
    category: 'flora',
    label: 'Pohon Asem Jawa',
    sublabel: 'Tamarindus Indica',
    icon: Trees,
    badge: '-2.8 C',
    badgeColor: '#22c55e',
    desc: 'Pohon peneduh koridor Malioboro berkanopi rindang dan batang beralur'
  },
  {
    type: 'shade_tree',
    category: 'flora',
    label: 'Pohon Peneduh',
    sublabel: 'Standar KDH',
    icon: Trees,
    badge: '-1.8 C',
    badgeColor: '#10b981',
    desc: 'Pohon kanopi peneduh standar untuk pemenuhan Koefisien Dasar Hijau'
  },

  // --- Category 2: Patung & Monumen ---
  {
    type: 'monument_tugu_jogja',
    category: 'monument',
    label: 'Tugu Pal Putih',
    sublabel: 'Landmark Jogja',
    icon: Landmark,
    badge: '+15 Poin',
    badgeColor: '#f59e0b',
    desc: 'Monumen Golong-Gilig berornamen emas purnomo dengan 4 spotlight malam'
  },
  {
    type: 'sculpture_kinetic_steel',
    category: 'monument',
    label: 'Skulptur Kinetik',
    sublabel: 'Baja Mobius',
    icon: Sparkles,
    badge: '+12 Poin',
    badgeColor: '#38bdf8',
    desc: 'Karya seni kontemporer pita baja nirkarat berputar di atas pedestal granit hitam'
  },
  {
    type: 'sculpture_candi_stone',
    category: 'monument',
    label: 'Arca Totem Batu',
    sublabel: 'Andesit Merapi',
    icon: Landmark,
    badge: '+10 Poin',
    badgeColor: '#94a3b8',
    desc: 'Pahatan batu vulkanik tradisional andesit bersusun motif geometris klasik'
  },
  {
    type: 'sculpture_wayang_corten',
    category: 'monument',
    label: 'Wayang Gunungan',
    sublabel: 'Baja Corten Karat',
    icon: Landmark,
    badge: '+14 Poin',
    badgeColor: '#ea580c',
    desc: 'Plat baja corten berukir siluet Gunungan wayang dengan pendar hangat malam'
  },
  {
    type: 'fountain_reflecting_pool',
    category: 'monument',
    label: 'Air Mancur Geyser',
    sublabel: 'Kolam Oktagonal',
    icon: Waves,
    badge: '-2.5 C',
    badgeColor: '#0ea5e9',
    desc: 'Kolam granit bertingkat dengan jet air bertingkat dan lampu bawah air keemasan'
  },
  {
    type: 'monument_clock_tower',
    category: 'monument',
    label: 'Menara Jam Kota',
    sublabel: 'Art Deco Kolonial',
    icon: Clock,
    badge: '+12 Poin',
    badgeColor: '#6366f1',
    desc: 'Menara bata ekspos 12 meter bermahkota kupola tembaga dengan 4 piringan jam bercahaya'
  },

  // --- Category 3: Furnitur & Lampu ---
  {
    type: 'street_malioboro_bollards',
    category: 'furniture',
    label: 'Bollard & Bangku',
    sublabel: 'Ikonik Malioboro',
    icon: Armchair,
    badge: '+8 Poin',
    badgeColor: '#10b981',
    desc: 'Trio bola batu teraso, bangku kayu jati sandaran hijau kurva, dan pot terakota'
  },
  {
    type: 'street_festoon_lights',
    category: 'furniture',
    label: 'Lampu Festoon',
    sublabel: 'Untaian Warm Night',
    icon: Lamp,
    badge: '1.8 Lux',
    badgeColor: '#f59e0b',
    desc: 'Tiang besi hitam dengan kabel katenari menggantung bohlam pijar filamen 2700K'
  },
  {
    type: 'street_timber_pergola',
    category: 'furniture',
    label: 'Pergola Kisi Jati',
    sublabel: 'Peneduh Selasar',
    icon: Grid,
    badge: '-1.5 C',
    badgeColor: '#b45309',
    desc: 'Rangka balok jati pelindung terik dengan lantai dek kayu bertekstur timbul'
  },
  {
    type: 'gate_candi_bentar',
    category: 'furniture',
    label: 'Candi Bentar',
    sublabel: 'Gerbang Belah',
    icon: Castle,
    badge: '+12 Poin',
    badgeColor: '#d97706',
    desc: 'Sepasang gerbang belah khas arsitektur nusantara berbahan bata merah dan andesit'
  },
  {
    type: 'street_garden_lanterns',
    category: 'furniture',
    label: 'Lentera Pagoda',
    sublabel: 'Taman Batu Andesit',
    icon: Lamp,
    badge: 'Pendar 2700K',
    badgeColor: '#eab308',
    desc: 'Lentera batu bertingkat dengan jendela kisi batu berpendar hangat saat senja'
  },
  {
    type: 'paving_block',
    category: 'furniture',
    label: 'Paving Block',
    sublabel: 'Perkerasan Berpori',
    icon: Footprints,
    badge: 'Porus',
    badgeColor: '#64748b',
    desc: 'Perkerasan ramah pejalan kaki dengan pori peresapan air ke tanah'
  },

  // --- Category 4: Taman & Air ---
  {
    type: 'plaza_mini_amphitheater',
    category: 'waterfront',
    label: 'Amfiteater Mini',
    sublabel: 'Panggung Terbuka',
    icon: Sparkles,
    badge: '+15 Poin',
    badgeColor: '#8b5cf6',
    desc: 'Undakan setengah lingkaran batu dan rumput mengitari panggung kayu melingkar'
  },
  {
    type: 'waterfront_wood_deck',
    category: 'waterfront',
    label: 'Dek Kayu Boardwalk',
    sublabel: 'Tepian Air',
    icon: Waves,
    badge: '+10 Poin',
    badgeColor: '#0284c7',
    desc: 'Lantai papan kayu tepi air dengan railing kaca minimalis dan kursi santai lounger'
  },
  {
    type: 'bridge_green_pedestrian',
    category: 'waterfront',
    label: 'Jembatan Vegetasi',
    sublabel: 'Footbridge Berbunga',
    icon: Footprints,
    badge: '+12 Poin',
    badgeColor: '#059669',
    desc: 'Jembatan pedestrian melengkung dengan kotak tanaman bunga petunia menjuntai'
  },
  {
    type: 'pavilion_garden_gazebo',
    category: 'waterfront',
    label: 'Bale Bengong',
    sublabel: 'Gazebo Limasan',
    icon: Castle,
    badge: '+10 Poin',
    badgeColor: '#d97706',
    desc: 'Paviliun istirahat bertiang 4 dengan atap genteng limasan di atas plinth batu'
  },
  {
    type: 'river_segment',
    category: 'waterfront',
    label: 'Sungai & Talud',
    sublabel: 'Kanal Perkotaan',
    icon: Waves,
    badge: 'Air Alami',
    badgeColor: '#0284c7',
    desc: 'Segmen alur air alami dengan perkuatan talud bronjong batu kali'
  },
  {
    type: 'retention_pond',
    category: 'waterfront',
    label: 'Kolam Retensi',
    sublabel: 'Embung Hujan',
    icon: Droplet,
    badge: '25 m3/jam',
    badgeColor: '#0ea5e9',
    desc: 'Kolam embung penampung limpasan air hujan komunal pencegah genangan'
  },
  {
    type: 'bioswale_channel',
    category: 'waterfront',
    label: 'Bioswale',
    sublabel: 'Parit Resapan',
    icon: Spline,
    badge: '4 m3/jam',
    badgeColor: '#10b981',
    desc: 'Parit vegetasi pinggir jalan penapis polutan limpasan air'
  },
  {
    type: 'well',
    category: 'waterfront',
    label: 'Sumur Resapan',
    sublabel: 'Konservasi Air',
    icon: Droplets,
    badge: 'Peresap',
    badgeColor: '#38bdf8',
    desc: 'Sumur peresapan air hujan langsung ke akuifer tanah'
  },
  {
    type: 'biopore',
    category: 'waterfront',
    label: 'Biopori',
    sublabel: 'Lubang Silindris',
    icon: CircleDot,
    badge: 'Organik',
    badgeColor: '#84cc16',
    desc: 'Lubang resapan biopori silinder pembuat kompos dan peresap air'
  },
  {
    type: 'grass_garden',
    category: 'waterfront',
    label: 'Taman Rumput',
    sublabel: 'Ruang Terbuka Hijau',
    icon: Flower2,
    badge: 'KDH 100%',
    badgeColor: '#22c55e',
    desc: 'Hamparan rumput hijau alami berpori untuk pemenuhan KDH kawasan'
  }
];

const CATEGORIES: Array<{ id: LandscapeCategory; label: string; icon: LucideIcon }> = [
  { id: 'flora', label: 'Pohon & Flora', icon: Trees },
  { id: 'monument', label: 'Patung & Monumen', icon: Landmark },
  { id: 'furniture', label: 'Furnitur & Lampu', icon: Armchair },
  { id: 'waterfront', label: 'Taman & Air', icon: Waves }
];

export const LandscapeSubToolbar: React.FC = () => {
  const { activeTool, setActiveTool, engine } = useUIStore();
  const [activeCategory, setActiveCategory] = useState<LandscapeCategory>('flora');
  const [activeType, setActiveType] = useState<LandscapeType>('tree_tabebuya_pink');

  if (activeTool !== 'nature') return null;

  const currentItems = LANDSCAPE_CATALOG.filter((item) => item.category === activeCategory);

  const handleSelect = (t: LandscapeType) => {
    setActiveType(t);
    engine?.landscapeTool.setType(t);
  };

  return (
    <div
      className="arscity-glass-bar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '10px 14px',
        borderRadius: '20px',
        maxWidth: '820px',
        width: '100%'
      }}
    >
      {/* Category Tabs Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isCatActive = activeCategory === cat.id;

            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.95 }}
                onPointerDown={() => proceduralAudio.playTaptic('selection')}
                onClick={() => setActiveCategory(cat.id)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'transparent',
                  color: isCatActive ? '#007AFF' : '#475569',
                  fontSize: '11px',
                  fontWeight: isCatActive ? 700 : 500,
                  cursor: 'pointer',
                  zIndex: 1
                }}
              >
                {isCatActive && (
                  <motion.div
                    layoutId="activeLandscapeCategoryPill"
                    transition={SPRING_TACTILE}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '9999px',
                      background: 'rgba(10, 132, 255, 0.14)',
                      border: '1px solid rgba(10, 132, 255, 0.35)',
                      zIndex: -1
                    }}
                  />
                )}
                <Icon size={13} strokeWidth={1.8} style={{ color: isCatActive ? '#007AFF' : '#64748B' }} />
                <span>{cat.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Close Button */}
        <button
          onClick={() => setActiveTool('select')}
          onPointerDown={() => proceduralAudio.playTaptic('light')}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.06)',
            border: 'none',
            color: '#64748B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title="Tutup Palet Lansekap (Esc / V)"
          aria-label="Tutup"
        >
          <X size={13} />
        </button>
      </div>

      {/* Item Shelf */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px',
          scrollbarWidth: 'none'
        }}
      >
        {currentItems.map((item) => {
          const Icon = item.icon;
          const isSel = activeType === item.type;

          return (
            <motion.button
              key={item.type}
              whileTap={{ scale: 0.95 }}
              onPointerDown={() => proceduralAudio.playTaptic('selection')}
              onClick={() => handleSelect(item.type)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '12px',
                background: isSel ? 'rgba(10, 132, 255, 0.12)' : 'rgba(255, 255, 255, 0.85)',
                border: isSel ? '1.5px solid #007AFF' : '1px solid rgba(15, 23, 42, 0.08)',
                boxShadow: isSel ? '0 0 12px rgba(10, 132, 255, 0.25)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                color: '#0F172A',
                cursor: 'pointer',
                flexShrink: 0,
                textAlign: 'left'
              }}
              title={item.desc}
              aria-label={item.label}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '8px',
                  background: isSel ? 'rgba(10, 132, 255, 0.20)' : 'rgba(15, 23, 42, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isSel ? '#007AFF' : '#475569'
                }}
              >
                <Icon size={15} strokeWidth={1.8} />
              </div>

              <span style={{ fontSize: '11px', fontWeight: isSel ? 700 : 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
