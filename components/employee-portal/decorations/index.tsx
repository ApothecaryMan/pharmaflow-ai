import React from 'react';

import { NoneDecoration } from './none';
import { CatEars } from './cat-ears';
import { RabbitEars } from './rabbit-ears';
import { Crown } from './crown';
import { Fakhma } from './fakhma';
import { RoyalFedoraHat } from './royal-fedora-hat';
import { GoldenHorusWings } from './golden-horus-wings';
import { AngelWings } from './angel-wings';
import { FlowerCrown } from './flower-crown';
import { StarHalo } from './star-halo';
import { CosmicRingStars } from './cosmic-ring-stars';
import { ArcaneAstralSigil } from './arcane-astral-sigil';
import { CyberOrbitalShroud } from './cyber-orbital-shroud';
import { EnchantedLeafWreath } from './enchanted-leaf-wreath';
import { TwinButterflies } from './twin-butterflies';
import { DevilHorns } from './devil-horns';
import { OverlordChaosHorns } from './overlord-chaos-horns';
import { Heart } from './heart';
import { HeartRing } from './heart-ring';
import { Snowflake } from './snowflake';
import { FairyWings } from './fairy-wings';
import { DragonWings } from './dragon-wings';
import { PhoenixWings } from './phoenix-wings';
import { MechanicalWings } from './mechanical-wings';
import { FeatheryWings } from './feathery-wings';
import { LegendaryPhoenixAura } from './legendary-phoenix-aura';
import { ArcaneTimekeeper } from './arcane-timekeeper';
import { SakuraBlossomWind } from './sakura-blossom-wind';
import { ToxicSymbiote } from './toxic-symbiote';
import { QuantumAstralOrbitals } from './quantum-astral-orbitals';
import { NeonCosmicVortex } from './neon-cosmic-vortex';
import { StellarConstellations } from './stellar-constellations';
import { CrystalBastion } from './crystal-bastion';
import { IceQueen } from './ice-queen';
import { ChronoMatrixInfinity } from './chrono-matrix-infinity';
import { EtherealHeavenVortex } from './ethereal-heaven-vortex';
import { UltimateChronogearNexus } from './ultimate-chronogear-nexus';

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


export interface DecorationDef {
  id: string;
  name: string;
  nameAr: string;
  svg: React.ReactNode;
}

export const AVATAR_DECORATIONS: DecorationDef[] = [
  { id: 'none', name: 'None', nameAr: 'بدون', svg: <NoneDecoration /> },
  { id: 'cat_ears', name: 'Cat Ears', nameAr: 'آذان القط', svg: <CatEars /> },
  { id: 'rabbit_ears', name: 'Rabbit Ears', nameAr: 'آذان الأرنب', svg: <RabbitEars /> },
  { id: 'crown', name: 'Crown', nameAr: 'تاج', svg: <Crown /> },
  { id: 'fakhma', name: 'Fakhma', nameAr: 'فخامة', svg: <Fakhma /> },
  { id: 'royal_fedora_hat', name: 'Royal Hat', nameAr: 'قبعة فيدورا الملكية', svg: <RoyalFedoraHat /> },
  { id: 'golden_horus_wings', name: 'Golden Horus', nameAr: 'أجنحة حورس الذهبية', svg: <GoldenHorusWings /> },
  { id: 'angel_wings', name: 'Angel Wings', nameAr: 'أجنحة الملاك', svg: <AngelWings /> },
  { id: 'flower_crown', name: 'Flower Crown', nameAr: 'إكليل الزهور', svg: <FlowerCrown /> },
  { id: 'star_halo', name: 'Star Halo', nameAr: 'هالة النجوم', svg: <StarHalo /> },
  { id: 'cosmic_ring_stars', name: 'Cosmic Ring Stars', nameAr: 'طوق النجوم الكوني', svg: <CosmicRingStars /> },
  { id: 'arcane_astral_sigil', name: 'Arcane Astral Sigil', nameAr: 'ختم الأركين النجمي', svg: <ArcaneAstralSigil /> },
  { id: 'cyber_orbital_shroud', name: 'Cyber Orbital Shroud', nameAr: 'الغلاف المداري السميك', svg: <CyberOrbitalShroud /> },
  { id: 'enchanted_leaf_wreath', name: 'Enchanted Leaves', nameAr: 'إكليل الأوراق السحرية', svg: <EnchantedLeafWreath /> },
  { id: 'twin_butterflies', name: 'Twin Butterflies', nameAr: 'الفراشات التوأم', svg: <TwinButterflies /> },
  { id: 'devil_horns', name: 'Devil Horns', nameAr: 'قرون الشيطان', svg: <DevilHorns /> },
  { id: 'overlord_chaos_horns', name: 'Chaos Horns', nameAr: 'قرون سيد الفوضى', svg: <OverlordChaosHorns /> },
  { id: 'heart', name: 'Heart', nameAr: 'قلب', svg: <Heart /> },
  { id: 'heart_ring', name: 'Heart Ring', nameAr: 'حلقة قلب', svg: <HeartRing /> },
  { id: 'snowflake', name: 'Snowflake', nameAr: 'ندفة الثلج', svg: <Snowflake /> },
  { id: 'fairy_wings', name: 'Fairy Wings', nameAr: 'أجنحة الجنية', svg: <FairyWings /> },
  { id: 'dragon_wings', name: 'Dragon Wings', nameAr: 'أجنحة التنين', svg: <DragonWings /> },
  { id: 'phoenix_wings', name: 'Phoenix Wings', nameAr: 'أجنحة الفينيق', svg: <PhoenixWings /> },
  { id: 'mechanical_wings', name: 'Mechanical Wings', nameAr: 'أجنحة ميكانيكية', svg: <MechanicalWings /> },
  { id: 'feathery_wings', name: 'Feathery Wings', nameAr: 'أجنحة ريشية', svg: <FeatheryWings /> },
  { id: 'legendary_phoenix_aura', name: 'Phoenix Aura', nameAr: 'هالة العنقاء الأسطورية', svg: <LegendaryPhoenixAura /> },
  { id: 'arcane_timekeeper', name: 'Arcane Timekeeper', nameAr: 'أسطرلاب الزمن', svg: <ArcaneTimekeeper /> },
  { id: 'sakura_blossom_wind', name: 'Sakura Wind', nameAr: 'رياح الساكورا', svg: <SakuraBlossomWind /> },
  { id: 'toxic_symbiote', name: 'Toxic Symbiote', nameAr: 'السيمبيوت السام', svg: <ToxicSymbiote /> },
  { id: 'quantum_astral_orbitals', name: 'Quantum Orbitals', nameAr: 'المدارات الكمية', svg: <QuantumAstralOrbitals /> },
  { id: 'neon_cosmic_vortex', name: 'Cosmic Vortex', nameAr: 'دوامة المجرة', svg: <NeonCosmicVortex /> },
  { id: 'stellar_constellations', name: 'Stellar Constellation', nameAr: 'الكوكبة الفلكية', svg: <StellarConstellations /> },
  { id: 'neon_crystal_bastion', name: 'Crystal Bastion', nameAr: 'الحصن الكريستالي', svg: <CrystalBastion /> },
  { id: 'dynamic_ice_queen', name: 'Ice Queen', nameAr: 'ملكة الجليد', svg: <IceQueen /> },
  { id: 'chrono_matrix_infinity', name: 'Chrono Matrix', nameAr: 'مصفوفة التحكم بالزمن', svg: <ChronoMatrixInfinity /> },
  { id: 'ethereal_heaven_vortex', name: 'Ethereal Heaven', nameAr: 'الفردوس الأثيري المضيء', svg: <EtherealHeavenVortex /> },
  { id: 'ultimate_chronogear_nexus', name: 'Chronogear Nexus', nameAr: 'آلة الزمن السحرية', svg: <UltimateChronogearNexus /> },
];

// export const DECORATION_KEYFRAMES = `
// .decoration-carousel svg * {
//   animation-play-state: paused !important;
// }

// @keyframes vortex-spin-cw {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(360deg); }
// }
// @keyframes vortex-spin-ccw {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(-360deg); }
// }
// @keyframes particle-pulse {
//   0%, 100% { opacity: 0.5; transform: scale(0.8); }
//   50% { opacity: 1; transform: scale(1.2); }
// }
// .vortex-origin { transform-box: fill-box; transform-origin: 50% 50%; }
// .spin-fast { animation: vortex-spin-cw 4s linear infinite; }
// .spin-med-rev { animation: vortex-spin-ccw 6s linear infinite; }
// .spin-slow { animation: vortex-spin-cw 9s linear infinite; }
// .spin-slower-rev { animation: vortex-spin-ccw 12s linear infinite; }
// .pulse-glow { animation: particle-pulse 3s ease-in-out infinite; }

// @keyframes astral-spin {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(360deg); }
// }
// @keyframes star-twinkle {
//   0%, 100% { opacity: 0.6; transform: scale(0.85); }
//   50% { opacity: 1; transform: scale(1.15); filter: drop-shadow(0 0 4px rgba(253,230,138,0.8)); }
// }
// @keyframes slow-pulse {
//   0%, 100% { opacity: 0.3; }
//   50% { opacity: 0.8; }
// }
// .astral-origin { transform-box: fill-box; transform-origin: 50% 50%; }
// .spin-ring { animation: astral-spin 30s linear infinite; }
// .twinkle-fast { animation: star-twinkle 2s ease-in-out infinite; }
// .twinkle-slow { animation: star-twinkle 3.5s ease-in-out infinite; }
// .pulsing-line { animation: slow-pulse 4s ease-in-out infinite; }

// @keyframes cat-twitch-left {
//   0%, 90%, 94%, 98%, 100% { transform: rotate(0deg); }
//   92%, 96% { transform: rotate(-5deg) scaleY(0.96); }
// }
// @keyframes cat-twitch-right {
//   0%, 86%, 90%, 94%, 100% { transform: rotate(0deg); }
//   88%, 92% { transform: rotate(5deg) scaleY(0.96); }
// }
// .cat-ear-left {
//   transform-origin: 35px 35px;
//   animation: cat-twitch-left 4.5s ease-in-out infinite;
// }
// .cat-ear-right {
//   transform-origin: 93px 35px;
//   animation: cat-twitch-right 4.5s ease-in-out infinite;
// }
// @keyframes crown-float {
//   0%, 100% { transform: translateY(-25px) rotate(0deg); }
//   50% { transform: translateY(-10px) rotate(0.5deg); }
// }
// @keyframes gem-shimmer {
//   0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 2px rgba(255,255,255,0.5)); }
//   50% { opacity: 1; filter: drop-shadow(0 0 6px rgba(255,255,255,0.9)); }
// }
// .main-crown-group {
//   transform-origin: 64px 35px;
//   animation: crown-float 3.5s ease-in-out infinite;
// }
// .shimmering-gem {
//   animation: gem-shimmer 2s ease-in-out infinite;
// }
// @keyframes angel-flap-left {
//   0%, 100% { transform: scaleX(1) rotate(0deg); }
//   50% { transform: scaleX(0.88) rotate(3deg); }
// }
// @keyframes angel-flap-right {
//   0%, 100% { transform: scaleX(1) rotate(0deg); }
//   50% { transform: scaleX(0.88) rotate(-3deg); }
// }
// .angel-wing-left {
//   transform-origin: 26px 76px;
//   animation: angel-flap-left 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
// }
// .angel-wing-right {
//   transform-origin: 102px 76px;
//   animation: angel-flap-right 4.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
// }
// @keyframes dragon-flap-left {
//   0%, 100% { transform: scaleX(1) rotate(0deg); }
//   50% { transform: scaleX(0.72) rotate(6deg); }
// }
// @keyframes dragon-flap-right {
//   0%, 100% { transform: scaleX(1) rotate(0deg); }
//   50% { transform: scaleX(0.72) rotate(-6deg); }
// }
// .wing-group-left {
//   transform-origin: 24px 82px;
//   animation: dragon-flap-left 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
// }
// .wing-group-right {
//   transform-origin: 104px 82px;
//   animation: dragon-flap-right 2.8s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;
// }
// @keyframes ice-float {
//   0%, 100% { transform: translateY(0px) rotate(0deg); }
//   50% { transform: translateY(-3.5px) rotate(0.8deg); }
// }
// @keyframes frost-shimmer {
//   0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 2px #60A5FA); }
//   50% { opacity: 1; filter: drop-shadow(0 0 8px #FFFFFF); }
// }
// @keyframes crystal-pulse {
//   0%, 100% { transform: scale(1); opacity: 0.8; }
//   50% { transform: scale(1.1); opacity: 1; }
// }
// .ice-tiara-group {
//   transform-box: view-box;
//   transform-origin: 64px 30px;
//   animation: ice-float 4s ease-in-out infinite;
// }
// .shimmering-frost {
//   animation: frost-shimmer 2.5s ease-in-out infinite;
// }
// .pulsing-shard {
//   transform-origin: center;
//   animation: crystal-pulse 3s ease-in-out infinite;
// }
// @keyframes cloud-spin-slow {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(360deg); }
// }
// @keyframes cloud-spin-rev {
//   0% { transform: rotate(0deg); }
//   100% { transform: rotate(-360deg); }
// }
// @keyframes star-twinkle {
//   0%, 100% { opacity: 0.4; transform: scale(0.8); }
//   50% { opacity: 1; transform: scale(1.2); filter: drop-shadow(0 0 3px rgba(255,255,255,0.8)); }
// }
// .heaven-origin { transform-box: view-box; transform-origin: 64px 64px; }
// .spin-clouds { animation: cloud-spin-slow 25s linear infinite; }
// .spin-clouds-rev { animation: cloud-spin-rev 15s linear infinite; }
// .twinkle { animation: star-twinkle 2.5s ease-in-out infinite; }
// @keyframes spin-cw { 100% { transform: rotate(360deg); } }
// @keyframes spin-ccw { 100% { transform: rotate(-360deg); } }
// @keyframes local-spin-cw { 100% { transform: rotate(360deg); } }
// @keyframes local-spin-ccw { 100% { transform: rotate(-360deg); } }
// @keyframes glow-pulse {
//   0%, 100% { opacity: 0.5; filter: drop-shadow(0 0 2px #06B6D4); transform: scale(0.99); }
//   50% { opacity: 1; filter: drop-shadow(0 0 6px #22D3EE); transform: scale(1.01); }
// }
// .center-org { transform-box: view-box; transform-origin: 64px 64px; }
// .gear-slow { animation: spin-cw 20s linear infinite; }
// .gear-rev { animation: spin-ccw 16s linear infinite; }
// .cog-cw { animation: local-spin-cw 6s linear infinite; }
// .cog-ccw { animation: local-spin-ccw 6s linear infinite; }
// .time-sweep { animation: spin-cw 3s linear infinite; }
// .time-tick { animation: spin-cw 12s steps(12, end) infinite; }
// .power-glow { animation: glow-pulse 2s ease-in-out infinite; }
// `;

export const DECORATION_MAP = new Map(AVATAR_DECORATIONS.map((d) => [d.id, d]));

export const getDecoration = (id: string | null | undefined): React.ReactNode => {
  if (!id) return null;
  return DECORATION_MAP.get(id)?.svg ?? null;
};
