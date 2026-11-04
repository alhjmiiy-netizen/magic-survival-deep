import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, RadarData, RunSummary, GameMode } from './game/GameEngine';
import {
  INITIAL_PLAYER_STATS,
  BOSS_TEST_PLAYER_STATS,
  BOSS_TEST_ENEMIES_LEFT,
  INITIAL_BELT_ITEMS,
  INITIAL_QUESTS,
  INITIAL_EQUIPMENT,
} from './game/constants';
import {
  PlayerStats,
  Spell,
  QuickBeltItem,
  GameQuest,
  Enemy,
  EquipmentItem,
  CharacterHero,
  ArenaRealm,
} from './types/game';
import { HEROES_LIST } from './game/characters';
import { ARENAS_LIST } from './game/arenas';
import { MainMenu } from './components/MainMenu';
import { HUD, DeepHUD } from './components/HUD';
import { LevelUpModal, StartSpellModal, ChestModal } from './components/LevelUpModal';
import type { UpgradeChoice } from './game/spells';
import { InventoryModal } from './components/InventoryModal';
import { SkillsModal } from './components/SkillsModal';
import { UpgradeModal } from './components/UpgradeModal';
import { applyResearch, loadResearch, saveGold } from './game/research';
import { SettingsModal } from './components/SettingsModal';
import { GameOverModal } from './components/GameOverModal';
import { StoryModal } from './components/StoryModal';
import { CharacterSelectModal } from './components/CharacterSelectModal';
import { ArenaSelectModal } from './components/ArenaSelectModal';
import { ComboModal } from './components/ComboModal';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { ResearchLetterModal } from './components/ResearchLetterModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { MagicGlyph } from './components/MagicIcons';
import { sound } from './audio/soundEngine';
import { Play, RotateCcw, BookMarked, User, MapPin, Sparkles, Home, LogOut, BookOpen } from 'lucide-react';
import { Settings as SettingsIcon, X } from 'lucide-react';

function applyHeroBonuses(e: GameEngine, from: CharacterHero | null, to: CharacterHero) {
  const st = e.stats;
  const d = (k: 'bonusHp' | 'bonusMana' | 'bonusPower' | 'bonusSpeed') => to[k] - (from ? from[k] : 0);
  st.maxHp = Math.max(50, st.maxHp + d('bonusHp')); st.hp = st.maxHp;
  st.maxMana = Math.max(0, st.maxMana + d('bonusMana')); st.mana = st.maxMana;
  st.spellPower += d('bonusPower');
  st.speed = Math.max(1, st.speed + d('bonusSpeed'));
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const getEngineCb = useCallback(() => engineRef.current, []);

  // View state: Home Page Main Menu vs Active Gameplay
  const [gameView, setGameView] = useState<'MAIN_MENU' | 'PLAYING'>('MAIN_MENU');
  const startAtWave8 = false;
  const [gameMode, setGameMode] = useState<GameMode>(() => (localStorage.getItem('msdeep_mode') === 'endless' ? 'endless' : 'regions'));
  const [chest, setChest] = useState<{ title: string; sub: string; choices: UpgradeChoice[] } | null>(null);
  const [deep, setDeep] = useState<DeepHUD | null>(null);
  const [notice, setNotice] = useState<{ text: string; color: string; k: number; kind: string } | null>(null);
  const [regionBanner, setRegionBanner] = useState<{ text: string; color: string; k: number } | null>(null);

  // Character & Arena selection
  const [currentHero, setCurrentHero] = useState<CharacterHero>(HEROES_LIST[0]);
  const heroRef = useRef<CharacterHero>(HEROES_LIST[0]);
  const [currentArena, setCurrentArena] = useState<ArenaRealm>(ARENAS_LIST[0]);

  // Game state
  const [stats, setStats] = useState<PlayerStats>(() => ({ ...INITIAL_PLAYER_STATS, gold: loadResearch().gold }));
  const [spells, setSpells] = useState<Spell[]>([]);
  const [pickingSpell, setPickingSpell] = useState(false);
  const [upgradeChoices, setUpgradeChoices] = useState<UpgradeChoice[]>([]);
  const [fastCasting, setFastCasting] = useState(0);
  const [beltItems, setBeltItems] = useState<QuickBeltItem[]>(INITIAL_BELT_ITEMS);
  const [quests, setQuests] = useState<GameQuest[]>(INITIAL_QUESTS);
  const [equipment] = useState<EquipmentItem[]>(INITIAL_EQUIPMENT);

  const [wave, setWave] = useState(1);
  const [enemiesRemaining, setEnemiesRemaining] = useState(40);
  const [timeStr, setTimeStr] = useState('00:00');
  const [radarData, setRadarData] = useState<RadarData | null>(null);
  const [currentBoss, setCurrentBoss] = useState<Enemy | null>(null);
  const [weatherBanner, setWeatherBanner] = useState<string | null>('Glacial Frost Descends');

  // Modals
  const [isPaused, setIsPaused] = useState(false);
  const [levelUpLevel, setLevelUpLevel] = useState<number | null>(null);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStoryOpen, setIsStoryOpen] = useState(false);
  const [isCharacterSelectOpen, setIsCharacterSelectOpen] = useState(false);
  const startRegionRef = useRef(0);
  const [isArenaSelectOpen, setIsArenaSelectOpen] = useState(false);
  const [isComboOpen, setIsComboOpen] = useState(false);
  const [isEncyclopediaOpen, setIsEncyclopediaOpen] = useState(false);
  const [researchLetterData, setResearchLetterData] = useState<{
    time: string;
    wave: number;
    demons: number;
  } | null>(null);
  const [gameOverData, setGameOverData] = useState<{ victory: boolean; summary: RunSummary } | null>(null);

  // Settings state
  const [showDamageNumbers, setShowDamageNumbers] = useState(true);
  const [enableScreenShake, setEnableScreenShake] = useState(true);
  const [autoAim, setAutoAim] = useState(true);

  // Initialize and run the GameEngine
  const initializeEngine = useCallback(() => {
    if (!canvasRef.current || gameView !== 'PLAYING') return;
    if (engineRef.current) {
      engineRef.current.destroy();
    }

    const startWave = startAtWave8 ? 8 : 1;
    if (startWave === 1) {
      setWave(1);
      setEnemiesRemaining(40);
      setTimeStr('00:00');
    } else {
      setWave(8);
      setEnemiesRemaining(BOSS_TEST_ENEMIES_LEFT);
      setTimeStr('08:00');
    }

    const engine = new GameEngine(
      canvasRef.current,
      startWave === 8 ? BOSS_TEST_PLAYER_STATS : INITIAL_PLAYER_STATS,
      [],
      {
        onStatsUpdate: (newStats) => setStats(newStats),
        onQuestUpdate: (updater) => setQuests(updater),
        onWaveUpdate: (w, left, t) => {
          setWave(w);
          setEnemiesRemaining(left);
          setTimeStr(t);
        },
        onLevelUp: (newLevel) => {
          setUpgradeChoices(engine.getUpgradeChoices(4));
          setLevelUpLevel(newLevel);
        },
        onSpellsUpdate: (sp) => {
          setSpells(sp);
          setFastCasting(engine.fastCasting);
        },
        onGameOver: (victory, summary) => {
          setGameOverData({ victory, summary });
        },
        onBossState: (boss) => {
          setCurrentBoss(boss);
        },
        onRadarUpdate: (data) => {
          setRadarData(data);
        },
        onWeatherChange: (title) => {
          setWeatherBanner(title);
          setTimeout(() => setWeatherBanner(null), 4000);
        },
        onChest: (title, sub, choices) => setChest({ title, sub, choices }),
        onSurvivalMilestone: (time, waveReached, demons) => {
          setResearchLetterData({ time, wave: waveReached, demons });
        },
      },
      startWave
    );

    engine.currentHero = heroRef.current;
    applyResearch(engine.stats); // persistent Altar research + saved gold wallet
    applyHeroBonuses(engine, null, heroRef.current);
    setStats({ ...engine.stats });
    engine.currentArena = currentArena;
    engine.showDamageNumbers = showDamageNumbers;
    engine.enableScreenShake = enableScreenShake;
    engine.autoAim = autoAim;
    engine.setMode(gameMode);

    engine.start();
    if (gameMode === 'regions' && startRegionRef.current > 0) { const ri = startRegionRef.current; startRegionRef.current = 0; engine.skipToRegion(ri); }
    engine.pause(); // nothing runs until the starting magic is picked
    setSpells([]);
    setFastCasting(0);
    setPickingSpell(true);
    engineRef.current = engine;
    (window as unknown as { __engine?: GameEngine }).__engine = engine;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameView, gameMode, currentArena, showDamageNumbers, autoAim]);
  // shake toggle must not rebuild the engine (v4 fix)
  useEffect(() => { if (engineRef.current) engineRef.current.enableScreenShake = enableScreenShake; }, [enableScreenShake]);

  useEffect(() => {
    if (gameView === 'PLAYING') {
      initializeEngine();
    }
    return () => {
      engineRef.current?.destroy();
    };
  }, [gameView, initializeEngine]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const key = e.key.toLowerCase();
      if (key === 'p' || key === 'escape') {
        if (
          levelUpLevel !== null ||
          isInventoryOpen ||
          isSkillsOpen ||
          isUpgradeOpen ||
          isSettingsOpen ||
          isStoryOpen ||
          isCharacterSelectOpen ||
          isArenaSelectOpen ||
          isComboOpen
        ) {
          setLevelUpLevel(null);
          setIsInventoryOpen(false);
          setIsSkillsOpen(false);
          setIsUpgradeOpen(false);
          setIsSettingsOpen(false);
          setIsStoryOpen(false);
          setIsCharacterSelectOpen(false);
          setIsArenaSelectOpen(false);
          setIsComboOpen(false);
          engineRef.current?.resume();
          setIsPaused(false);
        } else if (gameView === 'PLAYING') {
          togglePause();
        }
      } else if (key === '1') {
        useBeltItem('soul_shard');
      } else if (key === '2') {
        useBeltItem('mana_elixir');
      } else if (key === '3') {
        useBeltItem('vitality_emerald');
      } else if (key === '4') {
        useBeltItem('fire_rune');
      } else if (key === '5') {
        useBeltItem('ancient_grimoire');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    gameView,
    levelUpLevel,
    isInventoryOpen,
    isSkillsOpen,
    isUpgradeOpen,
    isSettingsOpen,
    isStoryOpen,
    isCharacterSelectOpen,
    isArenaSelectOpen,
    isComboOpen,
  ]);

  const togglePause = () => {
    if (isPaused) {
      engineRef.current?.resume();
      setIsPaused(false);
    } else {
      engineRef.current?.pause();
      setIsPaused(true);
    }
  };

  const returnToMainMenu = () => {
    sound.playItemUse();
    engineRef.current?.destroy();
    engineRef.current = null;
    setIsPaused(false);
    setLevelUpLevel(null);
    setGameOverData(null);
    setGameView('MAIN_MENU');
  };

  const useBeltItem = (itemId: string) => {
    const item = beltItems.find((b) => b.id === itemId);
    if (!item || item.count <= 0) return;

    setBeltItems((prev) =>
      prev.map((b) => (b.id === itemId ? { ...b, count: b.count - 1 } : b))
    );
    engineRef.current?.useBeltItem(itemId);
  };

  const getCooldowns = useCallback(() => {
    const out: Record<string, number> = {};
    const e = engineRef.current;
    if (!e) return out;
    const fc = Math.pow(0.9, e.fastCasting);
    for (const sp of e.spells) out[sp.id] = sp.cooldown > 0 ? Math.min(1, sp.currentCooldown / (sp.cooldown * fc)) : 0;
    return out;
  }, []);

  // Poll deep-run state (region/timer/synergies/artifacts/notices) — cheap, 4x/sec
  useEffect(() => {
    if (gameView !== 'PLAYING') return;
    let k = 0;
    const id = window.setInterval(() => {
      const e = engineRef.current; if (!e) return;
      setDeep(e.deepState() as DeepHUD);
      const n = e.notices.shift();
      if (n) {
        k++;
        if (n.kind === 'region') setRegionBanner({ text: n.text, color: n.color, k });
        else setNotice({ ...n, k });
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [gameView]);
  useEffect(() => { if (!regionBanner) return; const t = setTimeout(() => setRegionBanner(null), 3200); return () => clearTimeout(t); }, [regionBanner]);
  useEffect(() => { if (!notice) return; const t = setTimeout(() => setNotice(null), 2600); return () => clearTimeout(t); }, [notice]);

  const handleChestPick = (id: string) => {
    setChest(null);
    const e = engineRef.current; if (!e) return;
    e.applyUpgrade(id);
    e.afterChest();
    if (levelUpLevel === null) e.resume();
  };

  const handleSelectUpgrade = (upgradeId: string) => {
    setLevelUpLevel(null);
    engineRef.current?.applyUpgrade(upgradeId);
    if (!chest) engineRef.current?.resume();
  };

  const handlePickStartSpell = (spellId: string) => {
    const e = engineRef.current;
    if (!e) return;
    e.learnSpell(spellId, startAtWave8 ? 5 : 1);
    setPickingSpell(false);
    e.announceMode();
    e.resume();
    setTimeout(() => setWeatherBanner(null), 3500);
  };
  (window as unknown as { __pickSpell?: (id: string) => void }).__pickSpell = handlePickStartSpell;

  const handleSelectHero = (hero: CharacterHero) => {
    const prev = heroRef.current;
    heroRef.current = hero;
    setCurrentHero(hero);
    const e = engineRef.current;
    if (e && gameView === 'PLAYING') {
      // live switch mid-run: swap bonus deltas, keep level/xp progress
      e.currentHero = hero;
      applyHeroBonuses(e, prev, hero);
      setStats({ ...e.stats });
    }
    setIsCharacterSelectOpen(false);
    if (gameView === 'PLAYING') {
      engineRef.current?.resume();
    }
  };

  const handleSelectArena = (arena: ArenaRealm) => {
    setCurrentArena(arena);
    if (engineRef.current) {
      engineRef.current.currentArena = arena;
      engineRef.current.weatherSystem.forceWeather(arena.primaryWeather);
    }
    setWeatherBanner(`Realm Entered: ${arena.name}`);
    setTimeout(() => setWeatherBanner(null), 3500);
    setIsArenaSelectOpen(false);
    if (gameView === 'PLAYING') {
      engineRef.current?.resume();
    }
  };

  useEffect(() => { saveGold(stats.gold); }, [stats.gold]);

  const handleRestart = () => {
    setGameOverData(null);
    setIsPaused(false);
    setLevelUpLevel(null);
    setStats({ ...INITIAL_PLAYER_STATS, gold: loadResearch().gold });
    setSpells([]);
    setBeltItems(INITIAL_BELT_ITEMS);
    setQuests(INITIAL_QUESTS);
    initializeEngine();
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none font-sans">
      {/* 1. Main Menu / Home Page View */}
      {gameView === 'MAIN_MENU' && (
        <MainMenu
          currentHero={currentHero}
          currentArena={currentArena}
          stats={stats}
          onStartGame={(mode, regionIdx) => {
            startRegionRef.current = regionIdx || 0;
            setGameMode(mode);
            localStorage.setItem('msdeep_mode', mode);
            setGameView('PLAYING');
          }}
          onOpenCharacters={() => setIsCharacterSelectOpen(true)}
          onOpenArenas={() => setIsArenaSelectOpen(true)}
          onOpenCombos={() => setIsComboOpen(true)}
          onOpenUpgrades={() => setIsUpgradeOpen(true)}
          onOpenStory={() => setIsStoryOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenEncyclopedia={() => setIsEncyclopediaOpen(true)}
          onQuickSwitchHero={(h) => handleSelectHero(h)}
        />
      )}

      {/* 2. Active Gameplay Battlefield View */}
      {gameView === 'PLAYING' && (
        <>
          {/* Main Game 2D Canvas (Pristine procedural battlefield, 3D Isometric POV, zero overlapping ghost UI) */}
          <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

          {/* Dynamic Weather Transition & Realm Banner */}
          {weatherBanner && (
            <div className="absolute top-[60%] left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5 bg-slate-950/90 border border-sky-400/60 px-5 py-2 rounded-full shadow-[0_0_25px_rgba(56,189,248,0.4)] backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span className="text-xs font-cinzel font-bold tracking-widest text-sky-200 uppercase">
                  ✦ {weatherBanner}
                </span>
              </div>
            </div>
          )}

          {/* Boss Alert Warning Banner */}
          {currentBoss && !gameOverData && (
            <div className="absolute top-[32%] left-1/2 -translate-x-1/2 z-20 pointer-events-none animate-pulse">
              <div className="flex items-center gap-2 bg-red-950/90 border border-red-500/80 px-3 py-1 rounded-full shadow-[0_0_20px_rgba(239,68,68,0.5)] scale-90">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-cinzel font-black tracking-widest text-red-200 uppercase">
                  Boss: {currentBoss.name}
                </span>
              </div>
            </div>
          )}

          {/* Top In-Game Quick Bar: Home, Story, Hero, Realm, Combos */}
          <div className="absolute top-4 left-1/2 translate-x-32 hidden xl:flex items-center gap-2 z-20 pointer-events-auto">
            <button
              onClick={returnToMainMenu}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/90 gold-border text-amber-300 hover:text-white text-xs font-cinzel font-bold shadow-lg cursor-pointer hover:bg-slate-900 transition-colors"
              title="Return to Main Menu"
            >
              <Home className="w-3.5 h-3.5 text-amber-400" />
              <span>Menu</span>
            </button>

            <button
              onClick={() => {
                engineRef.current?.pause();
                setIsStoryOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/90 gold-border text-slate-300 hover:text-white text-xs font-cinzel font-bold shadow-lg cursor-pointer hover:bg-slate-900 transition-colors"
              title="Campaign Story & Chronicles"
            >
              <BookMarked className="w-3.5 h-3.5 text-amber-400" />
              <span>Story</span>
            </button>

            <button
              onClick={() => {
                engineRef.current?.pause();
                setIsCharacterSelectOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/90 gold-border text-sky-300 hover:text-white text-xs font-cinzel font-bold shadow-lg cursor-pointer hover:bg-slate-900 transition-colors"
              title="Switch Archmage Hero"
            >
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>{currentHero.name}</span>
            </button>

            <button
              onClick={() => {
                engineRef.current?.pause();
                setIsArenaSelectOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/90 gold-border text-emerald-300 hover:text-white text-xs font-cinzel font-bold shadow-lg cursor-pointer hover:bg-slate-900 transition-colors"
              title="Switch Battleground Realm"
            >
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>{currentArena.name}</span>
            </button>

            <button
              onClick={() => {
                engineRef.current?.pause();
                setIsComboOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/90 gold-border text-purple-300 hover:text-white text-xs font-cinzel font-bold shadow-lg cursor-pointer hover:bg-slate-900 transition-colors"
              title="Combo Magic & Spell Fusions"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span>Fusions</span>
            </button>

            <button
              onClick={() => {
                engineRef.current?.pause();
                setIsEncyclopediaOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/90 gold-border text-amber-300 hover:text-white text-xs font-cinzel font-bold shadow-lg cursor-pointer hover:bg-slate-900 transition-colors"
              title="Magic Survival Grimoire & Encyclopedia"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Grimoire</span>
            </button>
          </div>

          {regionBanner && (
            <div key={regionBanner.k} data-hud="region-banner" className="absolute top-[18%] left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-500 text-center">
              <div className="px-6 py-2 rounded-xl bg-slate-950/85 border-y-2 backdrop-blur-md" style={{ borderColor: regionBanner.color, boxShadow: `0 0 30px ${regionBanner.color}66` }}>
                <div className="text-[9px] tracking-[0.35em] font-bold text-slate-400">{regionBanner.text.startsWith('REGION') ? regionBanner.text.split(':')[0] : 'MODE'}</div>
                <div className="text-lg font-cinzel font-black tracking-widest uppercase" style={{ color: regionBanner.color }}>{regionBanner.text.includes(':') ? regionBanner.text.split(':')[1].trim() : regionBanner.text.split('—')[0]}</div>
              </div>
            </div>
          )}

          {/* Main HUD Overlay (Clear layout, ZERO overlaps) */}
          <HUD
            hero={currentHero}
            stats={stats}
            spells={spells}
            beltItems={beltItems}
            quests={quests}
            wave={wave}
            enemiesRemaining={enemiesRemaining}
            timeStr={timeStr}
            radarData={radarData}
            onPause={togglePause}
            onOpenInventory={() => {
              engineRef.current?.pause();
              setIsInventoryOpen(true);
            }}
            onOpenSkills={() => {
              engineRef.current?.pause();
              setIsSkillsOpen(true);
            }}
            onOpenUpgrades={() => {
              engineRef.current?.pause();
              setIsUpgradeOpen(true);
            }}
            onOpenSettings={() => {
              engineRef.current?.pause();
              setIsSettingsOpen(true);
            }}
            onUseBeltItem={useBeltItem}
            fastCasting={fastCasting}
            onTriggerDash={() => engineRef.current?.triggerDash()}
            onJoystickMove={(vx, vy) => engineRef.current?.setJoystickVector(vx, vy)}
            getCooldowns={getCooldowns}
            getEngine={getEngineCb}
            deep={deep}
            notice={notice}
          />

          {/* Pause Menu Overlay */}
          {isPaused &&
            !isInventoryOpen &&
            !isSkillsOpen &&
            !isUpgradeOpen &&
            !isSettingsOpen &&
            !isStoryOpen &&
            !isCharacterSelectOpen &&
            !isArenaSelectOpen &&
            !isComboOpen &&
            !isEncyclopediaOpen &&
            !researchLetterData &&
            !gameOverData &&
            levelUpLevel === null && (
              <div className="ms-screen ps" data-screen="pause" style={{ zIndex: 40, background: 'rgba(0,0,0,.94)' }}>
                <h2 className="ps-title ms-brush">Pause</h2>
                <div className="ms-card ps-stats">
                  {([
                    ['Level', stats.level, '#fff'], ['Max HP', Math.round(stats.maxHp), '#ff5a5a'],
                    ['Spell Power', `${Math.round(stats.spellPower)}%`, '#5ef08a'], ['Crit', `${Math.round(stats.critChance)}%`, '#ffd700'],
                    ['Crit Dmg', `x${stats.critMultiplier.toFixed(1)}`, '#ffd700'], ['Cooldown', `-${Math.round(stats.cooldownReduction)}%`, '#21e6e6'],
                    ['Speed', Math.round(stats.speed), '#5ef08a'], ['Pickup', Math.round(stats.pickupRadius), '#21e6e6'],
                    ['Gold', stats.gold, '#ffd700'], ['Gems', stats.crystals, '#21e6e6'],
                  ] as [string, React.ReactNode, string][]).map(([k, v, c]) => (
                    <div key={k} className="ps-row"><span>{k}</span><b style={{ color: c }}>{v}</b></div>
                  ))}
                </div>
                {(() => { const arts = engineRef.current?.deepState().artifacts ?? []; return (
                  <div className="ms-card" data-pause="artifacts" style={{ maxWidth: 420, padding: '8px 10px', margin: '8px auto' }}>
                    <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 2, color: '#fbbf24', marginBottom: 4 }}>ARTIFACTS ({arts.length})</div>
                    {arts.length === 0 ? <div style={{ fontSize: 11, color: '#94a3b8' }}>None yet — open treasure chests to collect relics.</div> :
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{arts.map((a) => (
                        <div key={a.id} data-pause-artifact={a.id} title={a.desc} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#e2e8f0', border: `1px solid ${a.color}`, borderRadius: 6, padding: '2px 6px' }}>
                          <MagicGlyph k={`art:${a.id}`} size={18} color={a.color} /><b style={{ color: a.color }}>{a.name}</b>{a.level > 1 ? ` ${a.level}` : ''}
                        </div>))}</div>}
                  </div>); })()}
                <button className="ms-glowtext" data-action="resume" onClick={togglePause}>Resume Game</button>
                <div className="ps-icons">
                  <button className="ms-ibtn" aria-label="Story" onClick={() => setIsStoryOpen(true)}><BookMarked /></button>
                  <button className="ms-ibtn" aria-label="Combos" onClick={() => setIsComboOpen(true)}><Sparkles /></button>
                  <button className="ms-ibtn" aria-label="Hero" onClick={() => setIsCharacterSelectOpen(true)}><User /></button>
                  <button className="ms-ibtn" aria-label="Settings" onClick={() => setIsSettingsOpen(true)}><SettingsIcon /></button>
                  <button className="ms-ibtn gold" aria-label="Restart run" onClick={handleRestart}><RotateCcw /></button>
                  <button className="ms-ibtn red" aria-label="Quit to menu" onClick={returnToMainMenu}><X /></button>
                </div>
              </div>
            )}
        </>
      )}

      {/* 3. Global Modals (Accessible from both MainMenu and Gameplay) */}
      {/* Level Up Modal */}
      {gameView === 'PLAYING' && pickingSpell && (
        <StartSpellModal bossTest={startAtWave8} onPick={handlePickStartSpell} />
      )}
      {chest && levelUpLevel === null && !gameOverData && (
        <ChestModal title={chest.title} sub={chest.sub} choices={chest.choices} onSelect={handleChestPick} />
      )}
      {levelUpLevel !== null && (
        <LevelUpModal level={levelUpLevel} choices={upgradeChoices} onSelectUpgrade={handleSelectUpgrade} />
      )}

      {/* Freestanding Character Selection Stage */}
      {isCharacterSelectOpen && (
        <CharacterSelectModal
          currentHero={currentHero}
          gold={stats.gold}
          crystals={stats.crystals}
          onSelectHero={handleSelectHero}
          onClose={() => {
            setIsCharacterSelectOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Arena Realm Selection Modal */}
      {isArenaSelectOpen && (
        <ArenaSelectModal
          currentArena={currentArena}
          onSelectArena={handleSelectArena}
          onClose={() => {
            setIsArenaSelectOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Story & Campaign Modal */}
      {isStoryOpen && (
        <StoryModal
          currentWave={wave}
          onClose={() => {
            setIsStoryOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Combo Magic / Fusions Modal */}
      {isComboOpen && (
        <ComboModal
          spells={spells}
          gold={stats.gold}
          crystals={stats.crystals}
          getEngine={() => engineRef.current as never}
          onClose={() => {
            setIsComboOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Magic Survival Grimoire & Encyclopedia Modal */}
      {isEncyclopediaOpen && (
        <EncyclopediaModal
          gold={stats.gold}
          crystals={stats.crystals}
          onClose={() => {
            setIsEncyclopediaOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Classified Laboratory Research Dispatch Letter (Story Milestone Demanded) */}
      {researchLetterData && (
        <ResearchLetterModal
          survivalTime={researchLetterData.time}
          waveReached={researchLetterData.wave}
          demonsSlain={researchLetterData.demons}
          onProceed={() => {
            // Reward player for surviving the experimental demands
            setStats((prev) => ({
              ...prev,
              gold: prev.gold + 500,
              crystals: prev.crystals + 25,
            }));
            setResearchLetterData(null);
            if (engineRef.current && !isPaused) {
              engineRef.current.resume();
            }
          }}
          onClose={() => {
            setResearchLetterData(null);
            if (engineRef.current && !isPaused) {
              engineRef.current.resume();
            }
          }}
        />
      )}

      {/* Inventory Modal */}
      {isInventoryOpen && (
        <InventoryModal
          stats={stats}
          equipment={equipment}
          onClose={() => {
            setIsInventoryOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Skills & Evolution Modal */}
      {isSkillsOpen && (
        <SkillsModal
          spells={spells}
          onClose={() => {
            setIsSkillsOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Permanent Upgrade / Talents Modal */}
      {isUpgradeOpen && (
        <UpgradeModal
          stats={stats}
          onUpdateStats={(newStats) => {
            setStats(newStats);
            if (engineRef.current) engineRef.current.stats = { ...newStats };
          }}
          onClose={() => {
            setIsUpgradeOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          showDamageNumbers={showDamageNumbers}
          enableScreenShake={enableScreenShake}
          autoAim={autoAim}
          onToggleDamageNumbers={(v) => {
            setShowDamageNumbers(v);
            if (engineRef.current) engineRef.current.showDamageNumbers = v;
          }}
          onToggleScreenShake={(v) => {
            setEnableScreenShake(v);
            if (engineRef.current) engineRef.current.enableScreenShake = v;
          }}
          onToggleAutoAim={(v) => {
            setAutoAim(v);
            if (engineRef.current) engineRef.current.autoAim = v;
          }}
          onClose={() => {
            setIsSettingsOpen(false);
            if (gameView === 'PLAYING' && !isPaused) engineRef.current?.resume();
          }}
        />
      )}

      {/* Game Over / Victory Modal */}
      {gameOverData && (
        <GameOverModal
          victory={gameOverData.victory}
          summary={gameOverData.summary}
          onRestart={handleRestart}
          onHome={returnToMainMenu}
        />
      )}
    </div>
  );
}
