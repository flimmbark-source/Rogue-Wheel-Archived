import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// RogueWheel — Consolidated (fix: hoisting/initialization order)
// This patch removes the runtime error "Cannot access 'drawOne' before initialization"
// by moving all pure fighter utilities OUTSIDE the component and using them
// both during initial state construction and runtime. Behavior is unchanged.

// ---------------- Constants ----------------
const SLICES = 16;
const GEOM = { compactSize: 260, comfortSize: 300, wheelInset: 20, iconRingOffset: 34 } as const;

// Timing (tempo-scaled via S())
export const PRE_EFFECT_MS      = 300;
export const POST_PRE_MS        = 500;
export const SPIN_BASE_MS       = 400;
export const SPIN_PER_STEP_MS   = 80;
export const SPIN_MIN_MS        = 300;
export const SPIN_MAX_MS        = 2000;
export const BETWEEN_MOVES_MS   = 240;
export const CARD_BADGE_SEC     = 0.45;

// ---------------- Types ----------------
type Side = "player" | "enemy";
type CardType = "Attack" | "Defense" | "Special";
type PreEffect = { id: string; run: (ctx: RoundContext, who: Side) => void; describe: (who: Side) => string; };
type Card = { id: string; name: string; type: CardType; number: number; description?: string; pre?: PreEffect[] };
type SectionId = "Largest Number" | "Biggest Reserve" | "Strongest Attack" | "Momentum";
type Section = { id: SectionId; color: string; start: number; end: number };
type Fighter = { name: string; hp: number; maxHp: number; block: number; deck: Card[]; hand: Card[]; discard: Card[]; previewType: CardType | null; lastWon: boolean; };
type RoundContext = { initiative: Side; adjust: { player: number; enemy: number }; flags?: Record<string, boolean>; immediateDamage: { target: Side; amount: number }[]; };

// ---------------- Helpers (generic) ----------------
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }
const typeIcon = (t: CardType) => t==="Attack"?"⚔️": t==="Defense"?"🛡️":"✨";
const uid = (()=>{ let i=0; return ()=>`c${++i}`; })();
const easeInOutCubic = (t:number)=> t<0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;
const SECTION_META: Record<SectionId,{icon:string; label:string, color:string}> = {
  "Largest Number":   { icon: "🔢", label: "Largest Number", color: "#10b981" },
  "Biggest Reserve":  { icon: "🗃️", label: "Biggest Reserve", color: "#0ea5e9" },
  "Strongest Attack": { icon: "💥", label: "Strongest Attack", color: "#f43f5e" },
  "Momentum":         { icon: "🌀", label: "Momentum", color: "#f59e0b" },
};

function inSection(index: number, s: Section){
  if (s.start<=s.end) return index>=s.start && index<=s.end;
  return index>=s.start || index<=s.end;
}
function totalMove(p:number,e:number,slices=SLICES){ return ((p % slices) + (e % slices)) % slices; }

// ---------------- Pre-effects ----------------
function PE_QuickJab(): PreEffect { return { id:"quickjab", run:(ctx,who)=>{ const t:Side=who==="player"?"enemy":"player"; ctx.immediateDamage.push({target:t,amount:1}); }, describe:()=>`Quick Jab: deal 1 now` }; }
function PE_Poison3(): PreEffect { return { id:"poison3", run:(ctx,who)=>{ const opp:Side=who==="player"?"enemy":"player"; ctx.adjust[opp]-=3; }, describe:()=>`Poison: -3 to opponent number` }; }
function PE_Focus2(): PreEffect { return { id:"focus2", run:(ctx,who)=>{ ctx.adjust[who]+=2; }, describe:()=>`Focus: +2 to your number` }; }

// ---------------- Decks ----------------
function makePlayerStarterDeck(): Card[] {
  const cards: Card[] = [
    { id: uid(), name: "Quick Jab", type: "Attack", number: 2, description: "Deal 1 now.", pre: [PE_QuickJab()] },
    { id: uid(), name: "Poison Strike", type: "Attack", number: 5, description: "-3 to foe number (pre)", pre: [PE_Poison3()] },
    { id: uid(), name: "Focus", type: "Special", number: 3, description: "+2 to your number (pre)", pre: [PE_Focus2()] },
    { id: uid(), name: "Strike", type: "Attack", number: 9 },
    { id: uid(), name: "Lunge", type: "Attack", number: 7 },
    { id: uid(), name: "Heavy Blow", type: "Attack", number: 13 },
    { id: uid(), name: "Guard", type: "Defense", number: 6 },
    { id: uid(), name: "Brace", type: "Defense", number: 8 },
    { id: uid(), name: "Feint", type: "Special", number: 4 },
    { id: uid(), name: "Tactics", type: "Special", number: 1 },
  ];
  return shuffle(cards);
}
function makeEnemyDeck(archetype: "bandit" | "sorcerer" | "beast" = "bandit"): Card[] {
  const common: Card[] = [
    { id: uid(), name: "Claw", type: "Attack", number: 8 },
    { id: uid(), name: "Bite", type: "Attack", number: 10 },
    { id: uid(), name: "Howl", type: "Special", number: 1 },
    { id: uid(), name: "Prowl", type: "Defense", number: 6 },
    { id: uid(), name: "Lash", type: "Attack", number: 7 },
    { id: uid(), name: "Dodge", type: "Defense", number: 5 },
  ];
  const bandit: Card[] = [
    { id: uid(), name: "Ambush", type: "Attack", number: 2, pre: [PE_QuickJab()] },
    { id: uid(), name: "Curse", type: "Special", number: 4, pre: [PE_Poison3()] },
  ];
  const sorcerer: Card[] = [
    { id: uid(), name: "Hex", type: "Special", number: 6, pre: [PE_Poison3()] },
    { id: uid(), name: "Channel", type: "Special", number: 3, pre: [PE_Focus2()] },
  ];
  const beast: Card[] = [
    { id: uid(), name: "Rend", type: "Attack", number: 12 },
    { id: uid(), name: "Pounce", type: "Attack", number: 3, pre: [PE_QuickJab()] },
  ];
  const pool = archetype === "bandit" ? bandit : archetype === "sorcerer" ? sorcerer : beast;
  return shuffle([...common, ...pool]);
}

// ---------------- Fighter PURE utilities (no React state, safe before component) ----------------
function F_copy(f:Fighter):Fighter { return { ...f, hand:[...f.hand], deck:[...f.deck], discard:[...f.discard] }; }
function F_drawOne(f:Fighter){ const q=F_copy(f); if(q.deck.length===0){ q.deck = shuffle(q.discard); q.discard=[]; } if(q.deck.length) q.hand.push(q.deck.shift()!); return q; }
function F_drawN(f:Fighter, n:number){ let q=f; for(let i=0;i<n;i++) q=F_drawOne(q); return q; }
function F_refillTo(f:Fighter, target:number){ let q=f; while(q.hand.length<target){ const before=q.hand.length; q=F_drawOne(q); if(q.hand.length===before) break; } return q; }

// ---------------- Sections (randomized per encounter) ----------------
function generateSections(archetype: "bandit" | "sorcerer" | "beast"): Section[] {
  function roll(min:number,max:number){ return Math.floor(Math.random()*(max-min+1))+min; }
  let sizes: Record<SectionId, number>;
  if (archetype === "bandit") {
    const largest = roll(5,7), strong=roll(4,6), reserve=roll(2,4); let momentum=SLICES-largest-strong-reserve; momentum=Math.max(1,Math.min(5,momentum));
    sizes = { "Largest Number": largest, "Strongest Attack": strong, "Biggest Reserve": reserve, "Momentum": momentum } as Record<SectionId, number>;
  } else if (archetype === "sorcerer") {
    const momentum=roll(5,7), reserve=roll(4,6), largest=roll(2,4); let strong=SLICES-momentum-reserve-largest; strong=Math.max(1,Math.min(5,strong));
    sizes = { "Momentum": momentum, "Biggest Reserve": reserve, "Largest Number": largest, "Strongest Attack": strong } as Record<SectionId, number>;
  } else {
    const strong=roll(6,8), largest=roll(3,5), reserve=roll(1,3); let momentum=SLICES-strong-largest-reserve; momentum=Math.max(1,Math.min(5,momentum));
    sizes = { "Strongest Attack": strong, "Largest Number": largest, "Biggest Reserve": reserve, "Momentum": momentum } as Record<SectionId, number>;
  }
  const order: SectionId[] = shuffle(["Largest Number","Biggest Reserve","Strongest Attack","Momentum"]);
  let start=0; const color:Record<SectionId,string> = { "Largest Number":"#10b981","Biggest Reserve":"#0ea5e9","Strongest Attack":"#f43f5e","Momentum":"#f59e0b" } as any;
  return order.map(id=>{ const len=sizes[id]; const sec:Section={ id, color: color[id], start, end:(start+len-1)%SLICES }; start=(start+len)%SLICES; return sec; });
}

// ---------------- Component ----------------
export default function RogueWheel(){
  // Density + tempo
  const [compact, setCompact] = useState(true);
  const [tempo, setTempo] = useState(1);
  const S = (ms:number)=> Math.round(ms * tempo);

  // Fighters (safe: uses PURE utilities)
  const [player, setPlayer] = useState<Fighter>(()=>{ const deck=makePlayerStarterDeck(); const f:Fighter={name:"Wanderer", hp:40,maxHp:40,block:0,deck,hand:[],discard:[],previewType:null,lastWon:false}; return F_refillTo(f,5); });
  const [enemy, setEnemy] = useState<Fighter>(()=>{ const deck=makeEnemyDeck("bandit"); const e:Fighter={name:"Shade Bandit", hp:32,maxHp:32,block:0,deck,hand:[],discard:[],previewType:null,lastWon:false}; return F_refillTo(e,5); });

  // Board
  const [sections, setSections] = useState<Section[]>(generateSections("bandit"));
  const [token, setToken] = useState(0);
  const [initiative, setInitiative] = useState<Side>(Math.random()<0.5?"player":"enemy");

  // Round
  const [log, setLog] = useState<string[]>(["A Shade Bandit eyes your purse..."]);
  const [round, setRound] = useState(1);
  const [pendingPlayerCard, setPendingPlayerCard] = useState<Card|null>(null);
  const [pendingEnemyCard, setPendingEnemyCard] = useState<Card|null>(null);
  const [phase, setPhase] = useState<"preview"|"choose"|"reveal"|"anim"|"ended">("preview");
  const [resStep, setResStep] = useState<"idle"|"show"|"pre"|"pMove"|"eMove">("idle");
  const [preEvents, setPreEvents] = useState<string[]>([]);
  const [readout, setReadout] = useState<{ p:number; e:number; move:number; target:number }|null>(null);
  const [lastRes, setLastRes] = useState<null | { numbers?: { p:number; e:number; move:number; target:number }, section?: SectionId, winner?: Side }>(null);
  const [flying, setFlying] = useState<null|Side>(null);

  // Geometry (derived)
  const wheelSize = compact ? GEOM.compactSize : GEOM.comfortSize; 
  const radius = wheelSize/2-8; 
  const center = { x: wheelSize/2, y: wheelSize/2 };
  const wheelR = radius - GEOM.wheelInset;
  const iconR = wheelR + GEOM.iconRingOffset;

  // -------------- Fighter state helpers (use setState) --------------
  const updateF = (side:Side, fn:(f:Fighter)=>Fighter)=> side==='player'? setPlayer(p=>fn(p)) : setEnemy(e=>fn(e));
  function dealTo(side:Side, raw:number){ updateF(side, f=>{ const dmg=Math.max(0, raw - f.block); return {...f, hp: clamp(f.hp - dmg, 0, f.maxHp), block: Math.max(0, f.block - raw)}; }); }
  function blockTo(side:Side, amt:number){ updateF(side, f=>({...f, block:f.block+amt})); }
  function setLastWonFlags(winner:Side){ setPlayer(p=>({...p, lastWon: winner==='player'})); setEnemy(e=>({...e, lastWon: winner==='enemy'})); }
  function discardPlayed(){ if(pendingPlayerCard) setPlayer(p=>({...p, hand:p.hand.filter(c=>c.id!==pendingPlayerCard.id), discard:[...p.discard, pendingPlayerCard]})); if(pendingEnemyCard) setEnemy(e=>({...e, hand:e.hand.filter(c=>c.id!==pendingEnemyCard.id), discard:[...e.discard, pendingEnemyCard]})); }

  // ---------------- UI helpers ----------------
  function appendLog(s:string){ setLog(prev=>[s,...prev].slice(0,8)); }
  function polar(cx:number,cy:number,r:number,aDeg:number){ const a=(aDeg-90)*(Math.PI/180); return {x:cx+r*Math.cos(a), y:cy+r*Math.sin(a)}; }
  function describeSlice(i:number){ const ang=360/SLICES; const s=i*ang, e=(i+1)*ang; const p1=polar(center.x,center.y,wheelR,e); const p0=polar(center.x,center.y,wheelR,s); const laf=e-s<=180?0:1; return `M ${center.x} ${center.y} L ${p1.x} ${p1.y} A ${wheelR} ${wheelR} 0 ${laf} 0 ${p0.x} ${p0.y} Z`; }
  const sliceColor = (i:number)=> (sections.find(sec=>inSection(i,sec))?.color ?? "#94a3b8");
  const secAngle = (sec:Section)=> ((sec.start+sec.end+1)/2)*(360/SLICES);

  const Badge = ({card, who}:{card:Card; who:Side}) => (
    <motion.div
      initial={who==='player'?{opacity:0,x:-140,y:80}:{opacity:0,x:140,y:-80}}
      animate={{opacity:1,x:0,y:0}}
      exit={{opacity:0}}
      transition={{duration: CARD_BADGE_SEC}}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded border bg-slate-900/90 border-slate-600"
    >
      {typeIcon(card.type)} <span className="font-semibold">{card.name}</span> <span>[{card.number}]</span>
    </motion.div>
  );

  // ---------------- Core steps ----------------
  function startPreview(){
    const types = Array.from(new Set(enemy.hand.map(c=>c.type)));
    const fallback:CardType = ["Attack","Defense","Special"][Math.floor(Math.random()*3)] as CardType;
    const t:CardType = (types[Math.floor(Math.random()*Math.max(1,types.length))] as CardType) || fallback;
    setEnemy(e=>({ ...e, previewType: t }));
    setPendingEnemyCard(null); setPendingPlayerCard(null);
    setReadout(null); setLastRes(null); setPreEvents([]); setResStep("idle");
    setPhase("choose");
  }

  function applyImmediateDamage(queue:{target:Side;amount:number}[]){
    for(const it of queue){ dealTo(it.target, it.amount); appendLog(`${it.target==="enemy"?enemy.name:"You"} take ${it.amount} immediate damage.`); }
  }

  function computeNumbers(ctx:RoundContext, pCard:Card, eCard:Card){
    const pNum = Math.max(0, Math.floor(pCard.number + (ctx.adjust?.player||0)));
    const eNum = Math.max(0, Math.floor(eCard.number + (ctx.adjust?.enemy||0)));
    return { pNum, eNum };
  }

  function onChoosePlayerCard(card:Card){ if(phase!=="choose") return; setPendingPlayerCard(card); setPendingEnemyCard(null); setPhase("reveal"); }

  async function spinSteps(steps:number){
    if(steps<=0) return;
    const startIndex = token;
    const raw = SPIN_BASE_MS + SPIN_PER_STEP_MS*steps;
    const duration = Math.max(SPIN_MIN_MS, Math.min(SPIN_MAX_MS, raw));
    const total = S(duration);
    const t0 = performance.now();
    await new Promise<void>((resolve)=>{
      const frame = (now:number)=>{
        const t = Math.max(0, Math.min(1, (now - t0)/total ));
        const progressed = Math.floor(easeInOutCubic(t) * steps);
        const idx = (startIndex + progressed) % SLICES;
        setToken(idx);
        if(t < 1) requestAnimationFrame(frame); else { setToken((startIndex + steps)%SLICES); resolve(); }
      };
      requestAnimationFrame(frame);
    });
  }

  function pickEnemyCard(): Card | null {
    const candidates = enemy.hand.filter(c=>c.type === (enemy.previewType||c.type));
    const pool = (candidates.length?candidates:enemy.hand);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random()*pool.length)];
  }

  async function revealAndResolve(){
    if(!pendingPlayerCard){ appendLog("No player card selected."); return; }
    const eChoice = pickEnemyCard();
    if(!eChoice){ appendLog("Enemy has no cards to play."); return; }
    setPendingEnemyCard(eChoice);

    const ctx:RoundContext = { initiative, adjust:{player:0,enemy:0}, flags:{}, immediateDamage:[] };
    setResStep("show");

    // Pre-effects
    await new Promise(r=>setTimeout(r, S(PRE_EFFECT_MS)));
    const order:{who:Side;card:Card}[] = [ {who:"player",card:pendingPlayerCard}, {who:"enemy",card:eChoice} ]
      .sort((a,b)=> a.card.number-b.card.number || (initiative===a.who?-1:1));
    const events:string[]=[];
    for(const entry of order){ for(const pe of (entry.card.pre||[])){ pe.run(ctx, entry.who); const line=`${entry.who==="player"?"You":enemy.name} pre: ${pe.describe(entry.who)}`; events.push(line); appendLog(line);} }
    setPreEvents(events);

    await new Promise(r=>setTimeout(r, S(POST_PRE_MS)));

    // Numbers + 0-step check
    applyImmediateDamage(ctx.immediateDamage);
    const { pNum, eNum } = computeNumbers(ctx, pendingPlayerCard, eChoice);
    const pStep = pNum % SLICES; const eStep = eNum % SLICES; const total = totalMove(pNum, eNum, SLICES);
    if (total === 0){
      appendLog("No movement this round (0-step).");
      setReadout({ p:pNum, e:eNum, move: 0, target: token });
      setLastRes({ numbers: { p:pNum, e:eNum, move: 0, target: token } });
      discardPlayed();
      advanceRound(initiative);
      return;
    }

    // Sequential spin
    setFlying("player"); setResStep("pMove");
    await spinSteps(pStep); setFlying(null);
    await new Promise(r=>setTimeout(r, S(BETWEEN_MOVES_MS)));
    setFlying("enemy"); setResStep("eMove");
    await spinSteps(eStep); setFlying(null);

    const target = token; const move = total; setReadout({ p:pNum, e:eNum, move, target });
    setLastRes({ numbers: { p:pNum, e:eNum, move, target } });
    finishResolution(target, pNum, eNum, pendingPlayerCard, eChoice);
  }

  function advanceRound(nextInit: Side){
    // Death check
    if (player.hp <= 0 || enemy.hp <= 0) { setPhase("ended"); return; }

    // Refill + block decay (both sides) using PURE utils
    const decay = (f:Fighter)=> ({...F_refillTo(F_copy(f),5), block: Math.max(0, f.block - 1)});
    setPlayer(p=>decay(p));
    setEnemy(e=>decay(e));

    // Reset round
    setInitiative(nextInit);
    setPendingPlayerCard(null); setPendingEnemyCard(null);
    setPreEvents([]); setReadout(null);
    setRound(r => r + 1);
    setPhase("preview");
  }

  function computeWinner(section:Section, pCard:Card|null, eCard:Card|null, pNum:number, eNum:number): Side {
    if (!pCard || !eCard) return initiative;
    switch(section.id){
      case "Largest Number": return pNum>eNum?"player": eNum>pNum?"enemy": initiative;
      case "Biggest Reserve": { const pRes=player.hand.length-1; const eRes=enemy.hand.length-1; return pRes>eRes?"player": eRes>pRes?"enemy": initiative; }
      case "Strongest Attack": { const pAtk=pCard.type==="Attack"?pCard.number:0; const eAtk=eCard.type==="Attack"?eCard.number:0; const pDef=pCard.type==="Defense"?pCard.number:0; const eDef=eCard.type==="Defense"?eCard.number:0; const pScore=pAtk-eDef; const eScore=eAtk-pDef; return pScore>eScore?"player": eScore>pScore?"enemy": initiative; }
      case "Momentum": if(player.lastWon&&!enemy.lastWon) return "player"; if(enemy.lastWon&&!player.lastWon) return "enemy"; return initiative;
      default: return initiative;
    }
  }

  function applyEffectWithBands(winner:Side, pCard:Card, eCard:Card){
    const wCard = winner==="player"?pCard:eCard; const loser:Side = winner==="player"?"enemy":"player";
    if(wCard.type==="Attack"){ const base=Math.floor(wCard.number/2)+2; dealTo(loser, base); if(wCard.number>=12){ dealTo(loser,2); appendLog(`Critical hit! +2 damage.`);} }
    else if(wCard.type==="Defense"){ const amt=Math.floor(wCard.number/2)+2; blockTo(winner, amt); if(wCard.number>=8){ dealTo(loser,1); appendLog(`Shield bash for 1.`);} }
    else { const mod=wCard.number%3; if(mod===0){ setInitiative(winner); appendLog(`${winner==="player"?"You":enemy.name} seize initiative.`);} else if(mod===1){ if(winner==="player") setPlayer(p=>F_drawOne(F_copy(p))); else setEnemy(e=>F_drawOne(F_copy(e))); appendLog(`${winner==="player"?"You":enemy.name} draw a card.`);} else { if(loser==="enemy") setEnemy(e=>({...e, block: Math.max(0, e.block-2) })); else setPlayer(p=>({...p, block: Math.max(0, p.block-2) })); appendLog(`Block is sapped by 2.`);} }
    discardPlayed();
    setLastWonFlags(winner);
    advanceRound(winner);
  }

  function finishResolution(finalPos:number, pNum:number, eNum:number, pCard:Card|null, eCard:Card|null){
    if (!pCard || !eCard){ appendLog("Resolution skipped: missing card"); advanceRound(initiative); return; }
    const section = sections.find(s=>inSection(finalPos,s));
    if (!section){ appendLog("No section found."); advanceRound(initiative); return; }
    appendLog(`Token lands on ${finalPos} (${section.id}).`);
    const winner = computeWinner(section, pCard, eCard, pNum, eNum);
    setLastRes(prev => ({ ...(prev||{}), section: section.id, winner }));
    applyEffectWithBands(winner, pCard, eCard);
  }

  useEffect(()=>{ if(phase==="preview") startPreview(); },[phase]);

  // ---------------- Render ----------------
  function CardView({ card, onClick, disabled }:{ card:Card; onClick?:()=>void; disabled?:boolean; }){
    const base="rounded-xl shadow p-2 border border-slate-700 bg-slate-800/70 hover:bg-slate-800 transition-all";
    const cursor=disabled?"cursor-not-allowed opacity-50":"cursor-pointer";
    return (
      <button disabled={disabled} onClick={onClick} className={`${base} ${cursor} ${compact?'w-28':'w-36'} text-left hover:scale-[1.04]`}>
        <div className="flex items-center justify-between">
          <div className="font-semibold">{card.name}</div>
          <div className="font-bold">{card.number}</div>
        </div>
        <div className="text-[11px] text-slate-300">{typeIcon(card.type)} {card.type}</div>
        {card.description && <div className="text-[10px] text-slate-400 mt-0.5">{card.description}</div>}
        {card.pre && card.pre.length>0 && (<div className="text-[10px] text-amber-300 mt-0.5">Pre: {card.pre.map(p=>p.id).join(", ")}</div>)}
      </button>
    );
  }

  return (
    <div className="h-screen overflow-hidden w-full bg-slate-900 text-slate-100 p-2 grid grid-rows-[auto,auto,auto] gap-2 text-xs">
      {/* Controls */}
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <div className="flex items-center gap-2">
          <span className="opacity-70">View:</span>
          <button className={`px-2 py-1 rounded ${compact ? 'bg-slate-700 text-white' : 'bg-slate-800'}`} onClick={()=>setCompact(true)}>Compact</button>
          <button className={`px-2 py-1 rounded ${!compact ? 'bg-slate-700 text-white' : 'bg-slate-800'}`} onClick={()=>setCompact(false)}>Comfort</button>
        </div>
        <div className="flex items-center gap-3">
          <div className="opacity-60">Round {round} • Phase {phase}{resStep!=='idle'?`/${resStep}`:''}</div>
          <div className="flex items-center gap-2">
            <label className="opacity-70">Speed</label>
            <input type="range" min="0.5" max="2" step="0.1" value={tempo} onChange={e=>setTempo(parseFloat(e.target.value))} />
            <span className="w-8 text-right">{tempo.toFixed(1)}x</span>
          </div>
          <div title={`PRE:${S(PRE_EFFECT_MS)}ms • POST:${S(POST_PRE_MS)}ms • SPIN base≈${S(SPIN_BASE_MS)}ms + ${S(SPIN_PER_STEP_MS)}ms/step`} className="px-2 py-0.5 rounded bg-slate-800/60 border border-slate-700">⛭ timings</div>
        </div>
      </div>

      {/* Top Row: Player / Wheel / Enemy */}
      <div className="grid grid-cols-3 gap-2">
        {/* Player */}
        <div className="rounded-xl p-2 bg-slate-800/70 border border-slate-700 shadow">
          <div className="font-bold text-sm">{player.name} {initiative==="player" && <span className="ml-1">(Init)</span>}</div>
          <div>HP {player.hp}/{player.maxHp} • 🛡 {player.block}</div>
          <div className="h-1 bg-slate-700 rounded-full mb-1"><div className="h-1 bg-emerald-500" style={{width:`${(player.hp/player.maxHp)*100}%`}} /></div>
          <div className="text-[10px] text-slate-400">Deck {player.deck.length} • Hand {player.hand.length} • Discard {player.discard.length}</div>
          {/* Reveal slot */}
          <div className="mt-1 h-12 flex items-center justify-start">
            {pendingPlayerCard && (phase!=="choose") ? (
              <motion.div
                initial={{opacity:0, x:-140, y:60, scale:0.95}}
                animate={{opacity:1, x:0, y:0, scale:1}}
                exit={{opacity:0}}
                transition={{duration: CARD_BADGE_SEC, ease: 'easeOut'}}
                className={`px-2 py-1 rounded border ${resStep==='show'?'animate-pulse':''} bg-slate-700/60 border-slate-600`}
              >
                {typeIcon(pendingPlayerCard.type)} <span className="font-semibold">{pendingPlayerCard.name}</span> <span className="ml-1 text-slate-300">[{pendingPlayerCard.number}]</span>
              </motion.div>
            ) : (<div className="text-slate-500 text-[11px]">(pick a card)</div>)}
          </div>
        </div>

        {/* Wheel */}
        <div className="relative flex flex-col items-center justify-center rounded-xl p-1 bg-slate-800/70 border border-slate-700 shadow">
          <svg width={compact?GEOM.compactSize:GEOM.comfortSize} height={compact?GEOM.compactSize:GEOM.comfortSize} viewBox={`0 0 ${compact?GEOM.compactSize:GEOM.comfortSize} ${compact?GEOM.compactSize:GEOM.comfortSize}`}>
            {Array.from({length:SLICES}).map((_,i)=>{
              const sec=sections.find(sec=>inSection(i,sec));
              return (
                <path key={i} d={describeSlice(i)} fill={sliceColor(i)} opacity={0.9} stroke="#0f172a" strokeWidth={1}>
                  <title>{`Slice ${i} • ${sec?sec.id:'Neutral'}`}</title>
                </path>
              );
            })}
            {Array.from({length:SLICES}).map((_,i)=>{ const ang=(i+0.5)*(360/SLICES); const pos=polar(center.x,center.y,wheelR*0.72,ang); return <text key={`n${i}`} x={pos.x} y={pos.y} fontSize={12} textAnchor="middle" dominantBaseline="middle" fill="#0f172a" fontWeight={700}>{i}</text>; })}
            {(() => { const ang=(token+0.5)*(360/SLICES); const pos=polar(center.x,center.y,wheelR*0.92,ang); return <circle cx={pos.x} cy={pos.y} r={7} fill="#fff" stroke="#0f172a" strokeWidth={2} />; })()}
            {sections.map((sec)=>{ const ang=secAngle(sec); const pos=polar(center.x,center.y,iconR,ang); return (
              <g key={sec.id} transform={`translate(${pos.x},${pos.y})`}>
                <circle r={20} fill="#fff" stroke={SECTION_META[sec.id].color} strokeWidth={4} />
                <text x={0} y={5} fontSize={20} textAnchor="middle" dominantBaseline="middle">{SECTION_META[sec.id].icon}</text>
                <title>{sec.id}</title>
              </g>
            ); })}
          </svg>

          {/* Flying badges */}
          <AnimatePresence>
            {flying==="player" && pendingPlayerCard && (<Badge card={pendingPlayerCard} who="player" />)}
            {flying==="enemy" && pendingEnemyCard && (<Badge card={pendingEnemyCard} who="enemy" />)}
          </AnimatePresence>

          {/* Readout & Pre-events */}
          {readout && (
            <div className="mt-1 flex items-center gap-2">
              <span>You {readout.p} + Enemy {readout.e} ⇒ {readout.move} → {readout.target}</span>
            </div>
          )}
          {preEvents.length>0 && (
            <div className="mt-1 text-amber-300 text-[11px] text-center">{preEvents.join(" • ")}</div>
          )}
        </div>

        {/* Enemy */}
        <div className="rounded-xl p-2 bg-slate-800/70 border border-slate-700 shadow text-right">
          <div className="font-bold text-sm">{enemy.name} {initiative==="enemy" && <span className="ml-1">(Init)</span>}</div>
          <div>HP {enemy.hp}/{enemy.maxHp} • 🛡 {enemy.block}</div>
          <div className="h-1 bg-slate-700 rounded-full mb-1"><div className="h-1 bg-rose-500" style={{width:`${(enemy.hp/enemy.maxHp)*100}%`}} /></div>
          <div className="text-[10px] text-slate-400">Deck {enemy.deck.length} • Hand {enemy.hand.length} • Discard {enemy.discard.length}</div>
          <div className="mt-1">Enemy shows: {enemy.previewType?`${typeIcon(enemy.previewType)} ${enemy.previewType}`:"?"}</div>
          <div className="mt-1 h-12 flex items-center justify-end">
            {pendingEnemyCard && (phase!=="choose") ? (
              <motion.div
                initial={{opacity:0, x:140, y:-60, scale:0.95}}
                animate={{opacity:1, x:0, y:0, scale:1}}
                exit={{opacity:0}}
                transition={{duration: CARD_BADGE_SEC, ease: 'easeOut'}}
                className={`px-2 py-1 rounded border ${resStep==='show'?'animate-pulse':''} bg-slate-700/60 border-slate-600`}
              >
                {typeIcon(pendingEnemyCard.type)} <span className="font-semibold">{pendingEnemyCard.name}</span> <span className="ml-1 text-slate-300">[{pendingEnemyCard.number}]</span>
              </motion.div>
            ) : (<div className="text-slate-500 text-[11px]">&nbsp;</div>)}
          </div>
        </div>
      </div>

      {/* Middle Row: Log + Recap + Legend */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl p-2 bg-slate-800/70 border border-slate-700 shadow overflow-y-auto max-h-[120px]">
          <div className="font-semibold mb-1">Log</div>
          {log.slice(0,6).map((line,i)=>(<div key={i}>• {line}</div>))}
        </div>
        <div className="rounded-xl p-2 bg-slate-800/70 border border-slate-700 shadow">
          <div className="font-semibold mb-1">Recap</div>
          {lastRes ? (
            <div>
              {lastRes.numbers && (<span>You {lastRes.numbers.p} + Enemy {lastRes.numbers.e} ⇒ {lastRes.numbers.move} → {lastRes.numbers.target}</span>)}
              {lastRes.section && (<span className="ml-1">• <span aria-label={lastRes.section}>{SECTION_META[lastRes.section].icon}</span> → {lastRes.winner==='player'?"You":enemy.name}</span>)}
            </div>
          ):(<div className="text-slate-400">(play a card)</div>)}
        </div>
        <div className="rounded-xl p-2 bg-slate-800/70 border border-slate-700 shadow grid grid-cols-2 gap-1 text-[12px]">
          {(Object.keys(SECTION_META) as SectionId[]).map((id)=> (
            <div key={id} className="flex items-center gap-2"><span>{SECTION_META[id].icon}</span><span className="font-medium">{SECTION_META[id].label}</span></div>
          ))}
        </div>
      </div>

      {/* Bottom Row: Hand + Controls */}
      <div className="rounded-xl p-2 bg-slate-800/70 border border-slate-700 shadow relative">
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold">Hand ({phase})</div>
          {phase==="reveal" && (
            <button onClick={revealAndResolve} className="px-3 py-1 rounded bg-amber-400 text-slate-900 font-bold text-xs">Play</button>
          )}
          {phase==="anim" && <div className="text-amber-300 text-xs">resolving…</div>}
          {phase==="ended" && (
            <button onClick={startNextEncounter} className="px-3 py-1 rounded bg-sky-500 text-slate-900 font-semibold text-xs">Next</button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {player.hand.map(card => (
            <div key={card.id} className="transform transition hover:scale-110">
              <CardView card={card} disabled={phase!=="choose"} onClick={()=>onChoosePlayerCard(card)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Dev Self-Tests (non-blocking console checks) ----------------
(function selfTests(){
  try { console.debug("[SelfTest] totalMove(8,8)=", totalMove(8,8)); } catch(e){ console.error("[SelfTest] totalMove calc failed", e); }
  try { console.debug("[SelfTest] totalMove(6,10)=", totalMove(6,10)); } catch(e){ console.error("[SelfTest] totalMove calc failed", e); }
  try {
    const secs = generateSections("bandit");
    const lens = secs.map(s=> (s.start<=s.end? (s.end-s.start+1) : (SLICES-s.start + (s.end+1)) ));
    const sum = lens.reduce((a,b)=>a+b,0);
    console.debug("[SelfTest] sections cover slices:", lens, "sum=", sum);
  } catch(e){ console.error("[SelfTest] sections generation failed", e); }
  try {
    const s:any = {start:14,end:1};
    const elems = [14,15,0,1];
    const ok = elems.every(i=> inSection(i, s));
    console.debug("[SelfTest] inSection wrap-around ok:", ok);
  } catch(e){ console.error("[SelfTest] inSection test failed", e); }
  // New: utility tests (pure)
  try {
    const f:Fighter = {name:"T", hp:10, maxHp:10, block:3, deck:[], hand:[], discard:[{id:"x",name:"N",type:"Attack",number:1}], previewType:null, lastWon:false};
    const tmp = (function(){ let q=f; q=F_drawOne(q); return q; })();
    console.debug("[SelfTest] F_drawOne wrap moves card:", tmp.hand.length===1 && tmp.discard.length===0);
  } catch(e){ console.error("[SelfTest] F_drawOne utility failed", e); }
  try {
    const f2:Fighter = {name:"U", hp:10, maxHp:10, block:0, deck:[{id:"a",name:"A",type:"Attack",number:1}], hand:[], discard:[], previewType:null, lastWon:false};
    const after = F_refillTo(f2, 2);
    console.debug("[SelfTest] F_refillTo stops when no cards:", after.hand.length===1);
  } catch(e){ console.error("[SelfTest] F_refillTo utility failed", e); }
})();
