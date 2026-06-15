import type React from 'react';
import { AngelWings } from './angel-wings';
import { ArcaneAstralSigil } from './arcane-astral-sigil';
import { ArcaneMagicRunes } from './arcane-magic-runes';
import { ArcaneTimekeeper } from './arcane-timekeeper';
import { CatEars } from './cat-ears';
import { ChronoMatrixInfinity } from './chrono-matrix-infinity';
import { CosmicRingStars } from './cosmic-ring-stars';
import { Crown } from './crown';
import { CryoVaporNexus } from './cryo-vapor-nexus';
import { CrystalBastion } from './crystal-bastion';
import { CyberOrbitalShroud } from './cyber-orbital-shroud';
import { DevilHorns } from './devil-horns';
import { DivineRadiantSun } from './divine-radiant-sun';
import { DragonWings } from './dragon-wings';
import { EnchantedLeafWreath } from './enchanted-leaf-wreath';
import { EtherealHeavenVortex } from './ethereal-heaven-vortex';
import { EtherealSpiritDragons } from './ethereal-spirit-dragons';
import { FairyWings } from './fairy-wings';
import { Fakhma } from './fakhma';
import { FeatheryWings } from './feathery-wings';
import { FlowerCrown } from './flower-crown';
import { GalacticBlackHole } from './galactic-black-hole';
import { GeniusGeometricMatrix } from './genius-geometric-matrix';
import { GoldenHorusWings } from './golden-horus-wings';
import { Heart } from './heart';
import { HeartRing } from './heart-ring';
import { IceQueen } from './ice-queen';
import { LegendaryPhoenixAura } from './legendary-phoenix-aura';
import { MechanicalWings } from './mechanical-wings';
import { NeonCosmicVortex } from './neon-cosmic-vortex';
import { NeonCyberHex } from './neon-cyber-hex';
import { NoneDecoration } from './none';
import { OverlordChaosHorns } from './overlord-chaos-horns';
import { PhoenixWings } from './phoenix-wings';
import { QuantumAstralOrbitals } from './quantum-astral-orbitals';
import { RabbitEars } from './rabbit-ears';
import { RoyalFedoraHat } from './royal-fedora-hat';
import { SakuraBlossomWind } from './sakura-blossom-wind';
import { Snowflake } from './snowflake';
import { StarHalo } from './star-halo';
import { StellarConstellations } from './stellar-constellations';
import { ToxicSymbiote } from './toxic-symbiote';
import { TwinButterflies } from './twin-butterflies';
import { UltimateChronogearNexus } from './ultimate-chronogear-nexus';
import { UltraRainbowAura } from './ultra-rainbow-aura';

export { NoneDecoration };
export { CatEars };
export { RabbitEars };
export { Crown };
export { Fakhma };
export { RoyalFedoraHat };
export { GoldenHorusWings };
export { AngelWings };
export { FlowerCrown };
export { StarHalo };
export { CosmicRingStars };
export { ArcaneAstralSigil };
export { CyberOrbitalShroud };
export { EnchantedLeafWreath };
export { TwinButterflies };
export { DevilHorns };
export { OverlordChaosHorns };
export { Heart };
export { HeartRing };
export { Snowflake };
export { FairyWings };
export { DragonWings };
export { PhoenixWings };
export { MechanicalWings };
export { FeatheryWings };
export { LegendaryPhoenixAura };
export { ArcaneTimekeeper };
export { SakuraBlossomWind };
export { ToxicSymbiote };
export { QuantumAstralOrbitals };
export { NeonCosmicVortex };
export { StellarConstellations };
export { CrystalBastion };
export { IceQueen };
export { ChronoMatrixInfinity };
export { EtherealHeavenVortex };
export { UltimateChronogearNexus };
export { GalacticBlackHole };
export { NeonCyberHex };
export { ArcaneMagicRunes };
export { EtherealSpiritDragons };
export { DivineRadiantSun };
export { GeniusGeometricMatrix };
export { CryoVaporNexus };
export { UltraRainbowAura };

export interface DecorationDef {
  id: string;
  name: string;
  nameAr: string;
  svg: React.ReactNode;
  isAnimated?: boolean;
}

export const AVATAR_DECORATIONS: DecorationDef[] = [
  { id: 'none', name: 'None', nameAr: 'بدون', svg: <NoneDecoration /> },

  // --- Ears & Horns (آذان وقرون) ---
  { id: 'cat_ears', name: 'Cat Ears', nameAr: 'آذان القط', svg: <CatEars />, isAnimated: true },
  { id: 'rabbit_ears', name: 'Rabbit Ears', nameAr: 'آذان الأرنب', svg: <RabbitEars /> },
  { id: 'devil_horns', name: 'Devil Horns', nameAr: 'قرون الشيطان', svg: <DevilHorns /> },
  {
    id: 'overlord_chaos_horns',
    name: 'Chaos Horns',
    nameAr: 'قرون سيد الفوضى',
    svg: <OverlordChaosHorns />,
  },

  // --- Headwear & Crowns (قبعات وتيجان) ---
  { id: 'crown', name: 'Crown', nameAr: 'تاج', svg: <Crown />, isAnimated: true },
  { id: 'dynamic_ice_queen', name: 'Ice Queen', nameAr: 'ملكة الجليد', svg: <IceQueen /> },
  { id: 'star_halo', name: 'Star Halo', nameAr: 'هالة النجوم', svg: <StarHalo /> },
  { id: 'fakhma', name: 'Fakhma', nameAr: 'فخامة', svg: <Fakhma />, isAnimated: true },
  {
    id: 'royal_fedora_hat',
    name: 'Royal Hat',
    nameAr: 'قبعة فيدورا الملكية',
    svg: <RoyalFedoraHat />,
  },
  { id: 'flower_crown', name: 'Flower Crown', nameAr: 'إكليل الزهور', svg: <FlowerCrown /> },
  {
    id: 'enchanted_leaf_wreath',
    name: 'Enchanted Leaves',
    nameAr: 'إكليل الأوراق السحرية',
    svg: <EnchantedLeafWreath />,
  },

  // --- Wings (أجنحة) ---
  {
    id: 'angel_wings',
    name: 'Angel Wings',
    nameAr: 'أجنحة الملاك',
    svg: <AngelWings />,
    isAnimated: true,
  },
  { id: 'fairy_wings', name: 'Fairy Wings', nameAr: 'أجنحة الجنية', svg: <FairyWings /> },
  {
    id: 'dragon_wings',
    name: 'Dragon Wings',
    nameAr: 'أجنحة التنين',
    svg: <DragonWings />,
    isAnimated: true,
  },
  { id: 'phoenix_wings', name: 'Phoenix Wings', nameAr: 'أجنحة الفينيق', svg: <PhoenixWings /> },
  {
    id: 'mechanical_wings',
    name: 'Mechanical Wings',
    nameAr: 'أجنحة ميكانيكية',
    svg: <MechanicalWings />,
  },
  { id: 'feathery_wings', name: 'Feathery Wings', nameAr: 'أجنحة ريشية', svg: <FeatheryWings /> },
  {
    id: 'golden_horus_wings',
    name: 'Golden Horus',
    nameAr: 'أجنحة حورس الذهبية',
    svg: <GoldenHorusWings />,
  },

  // --- Auras & Halos (هالات وإشعاعات) ---
  {
    id: 'cosmic_ring_stars',
    name: 'Cosmic Ring Stars',
    nameAr: 'طوق النجوم الكوني',
    svg: <CosmicRingStars />,
  },
  {
    id: 'cyber_orbital_shroud',
    name: 'Cyber Orbital Shroud',
    nameAr: 'الغلاف المداري السميك',
    svg: <CyberOrbitalShroud />,
  },
  {
    id: 'legendary_phoenix_aura',
    name: 'Phoenix Aura',
    nameAr: 'هالة العنقاء الأسطورية',
    svg: <LegendaryPhoenixAura />,
  },
  {
    id: 'quantum_astral_orbitals',
    name: 'Quantum Orbitals',
    nameAr: 'المدارات الكمية',
    svg: <QuantumAstralOrbitals />,
  },
  {
    id: 'arcane_astral_sigil',
    name: 'Arcane Astral Sigil',
    nameAr: 'ختم الأركين النجمي',
    svg: <ArcaneAstralSigil />,
  },

  // --- Nature & Magic (طبيعة وسحر) ---
  {
    id: 'twin_butterflies',
    name: 'Twin Butterflies',
    nameAr: 'الفراشات التوأم',
    svg: <TwinButterflies />,
  },
  { id: 'heart', name: 'Heart', nameAr: 'قلب', svg: <Heart /> },
  { id: 'heart_ring', name: 'Heart Ring', nameAr: 'حلقة قلب', svg: <HeartRing /> },
  { id: 'snowflake', name: 'Snowflake', nameAr: 'ندفة الثلج', svg: <Snowflake /> },
  {
    id: 'sakura_blossom_wind',
    name: 'Sakura Wind',
    nameAr: 'رياح الساكورا',
    svg: <SakuraBlossomWind />,
  },
  {
    id: 'toxic_symbiote',
    name: 'Toxic Symbiote',
    nameAr: 'السيمبيوت السام',
    svg: <ToxicSymbiote />,
  },
  {
    id: 'arcane_timekeeper',
    name: 'Arcane Timekeeper',
    nameAr: 'أسطرلاب الزمن',
    svg: <ArcaneTimekeeper />,
  },
  {
    id: 'neon_crystal_bastion',
    name: 'Crystal Bastion',
    nameAr: 'الحصن الكريستالي',
    svg: <CrystalBastion />,
  },
  {
    id: 'chrono_matrix_infinity',
    name: 'Chrono Matrix',
    nameAr: 'مصفوفة التحكم بالزمن',
    svg: <ChronoMatrixInfinity />,
  },

  // --- Epic & Animated (أسطورية ومتحركة) ---
  {
    id: 'neon_cosmic_vortex',
    name: 'Cosmic Vortex',
    nameAr: 'دوامة المجرة',
    svg: <NeonCosmicVortex />,
    isAnimated: true,
  },
  {
    id: 'stellar_constellations',
    name: 'Stellar Constellation',
    nameAr: 'الكوكبة الفلكية',
    svg: <StellarConstellations />,
    isAnimated: true,
  },
  {
    id: 'ethereal_heaven_vortex',
    name: 'Ethereal Heaven',
    nameAr: 'الفردوس الأثيري المضيء',
    svg: <EtherealHeavenVortex />,
    isAnimated: true,
  },
  {
    id: 'ultimate_chronogear_nexus',
    name: 'Chronogear Nexus',
    nameAr: 'آلة الزمن السحرية',
    svg: <UltimateChronogearNexus />,
    isAnimated: true,
  },
  {
    id: 'galactic_black_hole',
    name: 'Galactic Black Hole',
    nameAr: 'الثقب الأسود المجري',
    svg: <GalacticBlackHole />,
    isAnimated: true,
  },
  {
    id: 'neon_cyber_hex',
    name: 'Neon Cyber Hex',
    nameAr: 'مصفوفة السايبر-بانك السداسية',
    svg: <NeonCyberHex />,
    isAnimated: true,
  },
  {
    id: 'arcane_magic_runes',
    name: 'Arcane Magic Runes',
    nameAr: 'حلقات السحر الرونية',
    svg: <ArcaneMagicRunes />,
    isAnimated: true,
  },
  {
    id: 'ethereal_spirit_dragons',
    name: 'Ethereal Spirit Dragons',
    nameAr: 'تنانين الروح الأثيرية',
    svg: <EtherealSpiritDragons />,
    isAnimated: true,
  },
  {
    id: 'divine_radiant_sun',
    name: 'Divine Radiant Sun',
    nameAr: 'شمس الإشعاع الإلهي',
    svg: <DivineRadiantSun />,
    isAnimated: true,
  },
  {
    id: 'genius_geometric_matrix',
    name: 'Genius Matrix',
    nameAr: 'مصفوفة العبقرية الهندسية',
    svg: <GeniusGeometricMatrix />,
    isAnimated: true,
  },
  {
    id: 'cryo_vapor_nexus',
    name: 'Cryo-Vapor Nexus',
    nameAr: 'رابطة الجليد والبخار',
    svg: <CryoVaporNexus />,
    isAnimated: true,
  },
  {
    id: 'ultra_rainbow_aura',
    name: 'Ultra Rainbow Aura',
    nameAr: 'هالة قوس قزح الخارقة',
    svg: <UltraRainbowAura />,
    isAnimated: true,
  },
];

export const DECORATION_KEYFRAMES = `
.pause-animations * {
  animation-play-state: paused !important;
}
`;

export const DECORATION_MAP = new Map(AVATAR_DECORATIONS.map((d) => [d.id, d]));

export const getDecoration = (id: string | null | undefined): React.ReactNode => {
  if (!id) return null;
  return DECORATION_MAP.get(id)?.svg ?? null;
};
