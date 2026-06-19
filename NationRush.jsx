import { useState, useEffect, useRef, useCallback } from "react";

/* ═══════════════════════════════════════════════════════
   MOTEUR AUDIO — sons synthétisés (Web Audio API)
   100% généré en code → aucun fichier, aucun droit d'auteur.
═══════════════════════════════════════════════════════ */
const AudioEngine = (() => {
  let ctx = null;
  let masterSfx = null, masterMusic = null;
  let sfxOn = true, musicOn = true;
  let musicStop = null;        // fonction pour arrêter la musique en cours
  let currentTrack = null;

  const ensure = () => {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterSfx = ctx.createGain();   masterSfx.gain.value = 0.5;  masterSfx.connect(ctx.destination);
      masterMusic = ctx.createGain(); masterMusic.gain.value = 0.22; masterMusic.connect(ctx.destination);
    } catch (e) { /* audio indisponible */ }
    return ctx;
  };
  const resume = () => { const c = ensure(); if (c && c.state === "suspended") c.resume(); };

  // — brique de base : une note —
  const tone = (freq, t0, dur, type = "sine", vol = 1, dest) => {
    if (!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest || masterSfx);
    o.start(t0); o.stop(t0 + dur + 0.03);
  };

  // — effets sonores —
  const SFX = {
    click:   () => { if(!ctx)return; const t=ctx.currentTime; tone(420,t,0.06,"square",0.25); },
    tap:     () => { if(!ctx)return; const t=ctx.currentTime; tone(300,t,0.05,"sine",0.3); },
    correct: () => { if(!ctx)return; const t=ctx.currentTime; [523,659,784].forEach((f,i)=>tone(f,t+i*0.08,0.18,"triangle",0.35)); },
    wrong:   () => { if(!ctx)return; const t=ctx.currentTime; tone(220,t,0.18,"sawtooth",0.25); tone(160,t+0.09,0.22,"sawtooth",0.22); },
    reveal:  () => { if(!ctx)return; const t=ctx.currentTime; [392,523].forEach((f,i)=>tone(f,t+i*0.07,0.16,"sine",0.3)); },
    tick:    () => { if(!ctx)return; const t=ctx.currentTime; tone(880,t,0.04,"square",0.18); },
    tickUrgent:()=>{ if(!ctx)return; const t=ctx.currentTime; tone(1100,t,0.05,"square",0.3); },
    levelUp: () => { if(!ctx)return; const t=ctx.currentTime; [523,659,784,1047].forEach((f,i)=>tone(f,t+i*0.1,0.25,"triangle",0.4)); },
    win:     () => { if(!ctx)return; const t=ctx.currentTime; [523,659,784,1047,784,1047].forEach((f,i)=>tone(f,t+i*0.11,0.3,"triangle",0.4)); },
    lose:    () => { if(!ctx)return; const t=ctx.currentTime; [392,330,262].forEach((f,i)=>tone(f,t+i*0.14,0.3,"sawtooth",0.3)); },
    combo:   () => { if(!ctx)return; const t=ctx.currentTime; tone(660,t,0.08,"square",0.3); tone(990,t+0.06,0.1,"square",0.28); },
    coin:    () => { if(!ctx)return; const t=ctx.currentTime; tone(988,t,0.06,"square",0.3); tone(1319,t+0.05,0.12,"square",0.3); },
  };

  const playSfx = (name) => { if (!sfxOn) return; resume(); if (SFX[name]) SFX[name](); };

  // ── MUSIQUE DE FOND ──────────────────────────────────
  // Chaque "track" = une fonction qui programme une boucle et renvoie un stopper.
  const NOTE = { C3:130.81,D3:146.83,E3:164.81,F3:174.61,G3:196,A3:220,B3:246.94,
                 C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,
                 C5:523.25,D5:587.33,E5:659.25,G5:783.99,A5:880 };

  const makeLoop = (steps, bpm, voice) => {
    if (!ctx) return () => {};
    const stepDur = 60 / bpm / 2;     // doubles-croches
    let timer = null, step = 0, stopped = false;
    const tick = () => {
      if (stopped) return;
      const t = ctx.currentTime + 0.05;
      voice(steps, step % steps.length, t, stepDur);
      step++;
      timer = setTimeout(tick, stepDur * 1000);
    };
    tick();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  };

  // Voix mélodique + basse simple
  const TRACKS = {
    // 1 — "Explorer" : ambiance posée, arpèges doux
    explorer: () => {
      const mel = ["C4","E4","G4","B4","A4","G4","E4","D4","C4","E4","A4","G4","F4","E4","D4","C4"].map(n=>NOTE[n]);
      const bass= ["C3","C3","A3","A3","F3","F3","G3","G3"].map(n=>NOTE[n]);
      const stop1 = makeLoop(mel, 96, (s,i,t,d)=>tone(s[i], t, d*1.6, "triangle", 0.5, masterMusic));
      const stop2 = makeLoop(bass, 48, (s,i,t,d)=>tone(s[i], t, d*1.4, "sine", 0.6, masterMusic));
      return () => { stop1(); stop2(); };
    },
    // 2 — "Arcade" : énergique, chiptune
    arcade: () => {
      const mel = ["C4","C4","G4","G4","A4","A4","G4","E4","F4","F4","E4","E4","D4","D4","C4","G4"].map(n=>NOTE[n]);
      const bass= ["C3","G3","C3","G3","F3","C4","F3","G3"].map(n=>NOTE[n]);
      const stop1 = makeLoop(mel, 124, (s,i,t,d)=>tone(s[i], t, d*0.9, "square", 0.35, masterMusic));
      const stop2 = makeLoop(bass, 62, (s,i,t,d)=>tone(s[i], t, d*1.1, "triangle", 0.55, masterMusic));
      return () => { stop1(); stop2(); };
    },
    // 3 — "Lounge" : lent, jazzy/chill
    lounge: () => {
      const mel = ["E4","G4","B4","C5","B4","G4","A4","F4","D4","F4","A4","G4","E4","C4","D4","E4"].map(n=>NOTE[n]);
      const bass= ["A3","E3","F3","C3","D3","A3","E3","E3"].map(n=>NOTE[n]);
      const stop1 = makeLoop(mel, 80, (s,i,t,d)=>tone(s[i], t, d*2, "sine", 0.45, masterMusic));
      const stop2 = makeLoop(bass, 40, (s,i,t,d)=>tone(s[i], t, d*1.8, "triangle", 0.5, masterMusic));
      return () => { stop1(); stop2(); };
    },
    // 4 — "Tension" : sombre, pour l'ambiance Imposteur
    tension: () => {
      const mel = ["A3","C4","E4","A4","G4","E4","F4","D4","E4","C4","D4","B3","C4","A3","B3","E4"].map(n=>NOTE[n]);
      const bass= ["A3","A3","F3","F3","G3","G3","E3","E3"].map(n=>NOTE[n]);
      const stop1 = makeLoop(mel, 108, (s,i,t,d)=>tone(s[i], t, d*1.2, "sawtooth", 0.22, masterMusic));
      const stop2 = makeLoop(bass, 54, (s,i,t,d)=>tone(s[i], t, d*1.5, "sine", 0.55, masterMusic));
      return () => { stop1(); stop2(); };
    },
  };
  const TRACK_LIST = [
    { id:"explorer", name:"Explorer", emoji:"🌍" },
    { id:"arcade",   name:"Arcade",   emoji:"🕹️" },
    { id:"lounge",   name:"Lounge",   emoji:"🛋️" },
    { id:"tension",  name:"Tension",  emoji:"🕵️" },
    { id:"off",      name:"Aucune",   emoji:"🔇" },
  ];

  const playMusic = (trackId) => {
    resume();
    if (musicStop) { musicStop(); musicStop = null; }
    currentTrack = trackId;
    if (!musicOn || trackId === "off" || !ctx || !TRACKS[trackId]) return;
    musicStop = TRACKS[trackId]();
  };
  const stopMusic = () => { if (musicStop) { musicStop(); musicStop = null; } };

  return {
    init: () => { ensure(); resume(); },
    playSfx,
    playMusic, stopMusic,
    tracks: TRACK_LIST,
    setSfxOn: (v) => { sfxOn = v; },
    setMusicOn: (v) => { musicOn = v; if (!v) stopMusic(); else if (currentTrack) playMusic(currentTrack); },
    isReady: () => !!ctx,
  };
})();

/* ─── UTILS ─── */
const shuf  = a => [...a].sort(() => Math.random() - .5);
const pick  = a => a[Math.floor(Math.random() * a.length)];
const scram = s => shuf(s.split("")).join("");
const norm  = s => s.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const clamp = (v,a,b) => Math.min(b,Math.max(a,v));
const fmtN  = n => Math.round(n).toLocaleString("fr-FR");
// Formatte une valeur Plus ou Moins selon son type
const fmtHL = (v,fmt,unit)=>{
  if(fmt==="M"){ // millions (la valeur est déjà en millions)
    if(v>=1000) return (v/1000).toLocaleString("fr-FR",{maximumFractionDigits:2})+" milliards";
    if(v<1) return Math.round(v*1000).toLocaleString("fr-FR")+" 000";
    return v.toLocaleString("fr-FR",{maximumFractionDigits:1})+" M";
  }
  if(fmt==="B") return v.toLocaleString("fr-FR")+" Mds $";
  if(fmt==="km2") return v.toLocaleString("fr-FR")+" km²";
  if(fmt==="$") return v.toLocaleString("fr-FR")+" $";
  if(fmt==="%") return v.toLocaleString("fr-FR",{maximumFractionDigits:1})+" %";
  if(fmt==="y") return v.toLocaleString("fr-FR",{maximumFractionDigits:1})+" ans";
  return v.toLocaleString("fr-FR",{maximumFractionDigits:2})+(unit&&!["habitants","visiteurs/an","militaires","restaurants","milliardaires","prix","véhicules","médailles"].includes(unit)?" "+unit:"");
};

/* ═══════════════════════════════════════════════════════
   WORLD — 90 pays
═══════════════════════════════════════════════════════ */
const C=(nm,d,f,tg,ci,nb,tz,ar,po,cl,cu,lg,l2,an,sp,ce,cap,mon,rel,mer)=>
  ({nm,d,f,tg,ci,nb,tz,ar,po,cl,cu,lg,l2,an,sp,ce,cap,mon,rel,mer,_type:"world"});

const WORLD=[
C("France",1,"🇫🇷",["eu"],["Lyon","Bordeaux","Marseille","Toulouse","Nice","Strasbourg"],["Espagne","Italie","Suisse","Allemagne","Belgique"],"UTC+1","551 695 km²","68 millions","Tempéré océanique / méditerranéen",["Croissant","Ratatouille","Bouillabaisse","Cassoulet"],["Français"],["Breton","Occitan","Basque"],"Coq gaulois",["Football","Cyclisme","Rugby","Tennis"],["Zinédine Zidane","Édith Piaf","Victor Hugo","Napoléon"],"Paris","Euro (€)","Christianisme","Méditerranée / Atlantique / Manche"),
C("Italie",1,"🇮🇹",["eu"],["Milan","Naples","Turin","Bologne","Florence","Venise"],["France","Suisse","Autriche","Slovénie"],"UTC+1","301 340 km²","60 millions","Méditerranéen / alpin",["Pizza Margherita","Pasta carbonara","Tiramisu","Gelato"],["Italien"],["Sarde","Sicilien"],"Loup gris",["Football","Cyclisme","Formule 1"],["Leonardo da Vinci","Dante","Pavarotti","Michelangelo"],"Rome","Euro (€)","Christianisme","Méditerranée / Adriatique"),
C("Espagne",1,"🇪🇸",["eu"],["Barcelone","Séville","Valence","Saragosse","Bilbao"],["France","Portugal","Andorre"],"UTC+1","505 990 km²","47 millions","Méditerranéen / semi-aride",["Paella","Tortilla española","Jamón ibérico","Gazpacho"],["Espagnol"],["Catalan","Basque","Galicien"],"Taureau",["Football","Tennis","Basketball"],["Salvador Dalí","Picasso","Rafael Nadal","Penélope Cruz"],"Madrid","Euro (€)","Christianisme","Atlantique / Méditerranée"),
C("Allemagne",1,"🇩🇪",["eu"],["Munich","Hambourg","Cologne","Francfort","Stuttgart","Leipzig"],["France","Pays-Bas","Belgique","Suisse","Autriche","Pologne","Tchéquie"],"UTC+1","357 114 km²","84 millions","Tempéré continental",["Bratwurst","Currywurst","Bretzel","Sauerbraten"],["Allemand"],["Sorabe","Frison"],"Aigle",["Football","Handball","Formule 1"],["Beethoven","Goethe","Merkel","Einstein"],"Berlin","Euro (€)","Christianisme","Mer du Nord / Baltique"),
C("Royaume-Uni",1,"🇬🇧",["eu"],["Manchester","Birmingham","Glasgow","Liverpool","Édimbourg"],["Irlande"],"UTC+0","243 610 km²","67 millions","Tempéré océanique",["Fish and chips","Full English","Yorkshire pudding"],["Anglais"],["Gallois","Gaélique écossais"],"Lion",["Football","Cricket","Rugby"],["Shakespeare","The Beatles","Newton","J.K. Rowling"],"Londres","Livre sterling (£)","Christianisme","Atlantique / Mer du Nord"),
C("Portugal",2,"🇵🇹",["eu"],["Porto","Braga","Coimbra","Faro"],["Espagne"],"UTC+0","92 212 km²","10 millions","Méditerranéen / océanique",["Pastéis de nata","Bacalhau","Caldo verde"],["Portugais"],["Mirandais"],"Coq de Barcelos",["Football","Surf"],["Cristiano Ronaldo","Fernando Pessoa","Mourinho"],"Lisbonne","Euro (€)","Christianisme","Atlantique"),
C("Pays-Bas",2,"🇳🇱",["eu"],["Rotterdam","La Haye","Utrecht","Eindhoven"],["Allemagne","Belgique"],"UTC+1","41 543 km²","17 millions","Tempéré océanique",["Stroopwafel","Bitterballen","Haring"],["Néerlandais"],["Frison"],"Lion",["Football","Cyclisme","Patinage"],["Rembrandt","Van Gogh","Johan Cruyff"],"Amsterdam","Euro (€)","Christianisme","Mer du Nord"),
C("Belgique",2,"🇧🇪",["eu"],["Anvers","Gand","Bruges","Liège"],["France","Pays-Bas","Allemagne","Luxembourg"],"UTC+1","30 528 km²","11 millions","Tempéré océanique",["Gaufre","Moules-frites","Waterzooi","Speculoos"],["Français","Néerlandais","Allemand"],["Wallon"],"Lion",["Football","Cyclisme"],["Hergé","René Magritte","Jacques Brel"],"Bruxelles","Euro (€)","Christianisme","Mer du Nord"),
C("Suisse",2,"🇨🇭",["eu"],["Genève","Bâle","Lausanne","Lugano"],["France","Allemagne","Autriche","Italie"],"UTC+1","41 285 km²","8,7 millions","Alpin / tempéré",["Fondue","Raclette","Rösti"],["Français","Allemand","Italien","Romanche"],["Suisse-allemand"],"Vache",["Ski","Tennis"],["Roger Federer","Carl Jung"],"Berne","Franc suisse (CHF)","Christianisme","Pays sans accès à la mer"),
C("Autriche",2,"🇦🇹",["eu"],["Graz","Salzbourg","Linz","Innsbruck"],["Allemagne","Suisse","Italie","Slovénie","Hongrie"],"UTC+1","83 871 km²","9 millions","Continental / alpin",["Wiener Schnitzel","Sachertorte","Kaiserschmarrn"],["Allemand"],["Slovène"],"Aigle",["Ski","Football"],["Mozart","Freud","Schwarzenegger"],"Vienne","Euro (€)","Christianisme","Pays sans accès à la mer"),
C("Suède",2,"🇸🇪",["eu"],["Göteborg","Malmö","Uppsala","Västerås"],["Norvège","Finlande"],"UTC+1","450 295 km²","10 millions","Tempéré / subarctique",["Köttbullar","Gravlax","Cinnamon roll"],["Suédois"],["Same"],"Élan",["Football","Hockey sur glace"],["ABBA","Astrid Lindgren","Avicii","Zlatan"],"Stockholm","Couronne SEK","Luthéranisme","Baltique"),
C("Norvège",2,"🇳🇴",["eu"],["Bergen","Stavanger","Trondheim","Tromsø"],["Suède","Finlande","Russie"],"UTC+1","385 207 km²","5,4 millions","Océanique / subarctique",["Rakfisk","Brunost","Fårikål"],["Norvégien"],["Same"],"Lion",["Ski","Biathlon"],["Edvard Grieg","Henrik Ibsen","Magnus Carlsen"],"Oslo","Couronne NOK","Luthéranisme","Atlantique / Mer du Nord"),
C("Danemark",2,"🇩🇰",["eu"],["Aarhus","Odense","Aalborg"],["Allemagne"],"UTC+1","42 924 km²","5,9 millions","Tempéré océanique",["Smørrebrød","Æbleskiver","Frikadeller"],["Danois"],["Féroïen"],"Cygne",["Football","Handball"],["Hans Christian Andersen","Søren Kierkegaard"],"Copenhague","Couronne DKK","Luthéranisme","Mer du Nord / Baltique"),
C("Finlande",2,"🇫🇮",["eu"],["Tampere","Turku","Oulu"],["Suède","Norvège","Russie"],"UTC+2","338 424 km²","5,5 millions","Subarctique",["Karjalanpiirakka","Lohikeitto","Salmiak"],["Finnois","Suédois"],["Same"],"Ours brun",["Hockey sur glace","Ski de fond"],["Jean Sibelius","Kimi Räikkönen"],"Helsinki","Euro (€)","Luthéranisme","Baltique"),
C("Pologne",2,"🇵🇱",["eu"],["Cracovie","Wrocław","Łódź","Gdańsk"],["Allemagne","Tchéquie","Slovaquie","Ukraine"],"UTC+1","312 679 km²","38 millions","Continental tempéré",["Pierogi","Żurek","Bigos"],["Polonais"],["Kashoube"],"Aigle blanc",["Football","Volleyball"],["Marie Curie","Chopin","Lech Wałęsa"],"Varsovie","Złoty PLN","Catholicisme","Baltique"),
C("Grèce",2,"🇬🇷",["eu"],["Thessalonique","Patras","Héraklion"],["Albanie","Macédoine du Nord","Bulgarie","Turquie"],"UTC+2","131 957 km²","10,4 millions","Méditerranéen",["Moussaka","Souvlaki","Tzatziki","Baklava"],["Grec"],[],"Dauphin",["Football","Basketball"],["Aristote","Platon","Maria Callas"],"Athènes","Euro (€)","Orthodoxie","Méditerranée / Mer Égée"),
C("Russie",2,"🇷🇺",["eu","as"],["Saint-Pétersbourg","Novossibirsk","Iekaterinbourg","Kazan"],["Norvège","Finlande","Ukraine","Géorgie","Kazakhstan","Chine"],"UTC+2 à +12","17 098 242 km²","144 millions","Continental / subarctique",["Bortsch","Pelmeni","Blinis"],["Russe"],["Tatar","Tchétchène"],"Ours brun",["Football","Hockey sur glace","Échecs"],["Tolstoï","Dostoïevski","Tchaïkovski","Gagarine"],"Moscou","Rouble RUB","Orthodoxie","Arctique / Pacifique / Mer Noire"),
C("Turquie",2,"🇹🇷",["eu","as"],["Ankara","Izmir","Bursa","Antalya"],["Grèce","Bulgarie","Géorgie","Iran","Irak","Syrie"],"UTC+3","783 562 km²","85 millions","Méditerranéen / continental",["Baklava","Döner kebab","Köfte","Börek"],["Turc"],["Kurde"],"Loup gris",["Football","Basketball"],["Atatürk","Orhan Pamuk"],"Ankara","Lire turque TRY","Islam","Méditerranée / Mer Noire"),
C("Roumanie",2,"🇷🇴",["eu"],["Cluj-Napoca","Timișoara","Iași"],["Ukraine","Bulgarie","Serbie","Hongrie"],"UTC+2","238 397 km²","19 millions","Continental tempéré",["Mămăligă","Sarmale","Mici"],["Roumain"],["Hongrois"],"Lynx des Carpates",["Football","Tennis"],["Brâncuși","Nadia Comăneci"],"Bucarest","Leu RON","Orthodoxie","Mer Noire"),
C("Islande",3,"🇮🇸",["eu"],["Akureyri","Kópavogur"],[],"UTC+0","103 000 km²","370 000","Subarctique / volcanique",["Hákarl","Skyr","Plokkfiskur"],["Islandais"],[],"Gerfaut",["Football","Handball"],["Björk","Halldór Laxness"],"Reykjavik","Couronne ISK","Luthéranisme","Atlantique Nord"),
C("Hongrie",3,"🇭🇺",["eu"],["Debrecen","Miskolc","Pécs"],["Autriche","Slovaquie","Ukraine","Roumanie","Serbie"],"UTC+1","93 028 km²","9,7 millions","Continental tempéré",["Goulash","Lángos","Kürtőskalács"],["Hongrois"],["Romani"],"Aigle",["Football","Water-polo"],["Franz Liszt","Harry Houdini","Ernő Rubik"],"Budapest","Forint HUF","Christianisme","Pays sans accès à la mer"),
C("République tchèque",3,"🇨🇿",["eu"],["Brno","Ostrava","Plzeň"],["Allemagne","Pologne","Slovaquie","Autriche"],"UTC+1","78 866 km²","10,9 millions","Continental tempéré",["Svíčková","Trdelník","Guláš"],["Tchèque"],[],"Lion à deux queues",["Football","Hockey sur glace"],["Franz Kafka","Dvořák","Václav Havel"],"Prague","Couronne CZK","Christianisme","Pays sans accès à la mer"),
C("Ukraine",3,"🇺🇦",["eu"],["Kharkiv","Odessa","Dnipro","Lviv"],["Pologne","Hongrie","Roumanie","Russie"],"UTC+2","603 550 km²","43 millions","Continental tempéré",["Bortsch ukrainien","Varenyky","Holubtsi"],["Ukrainien"],["Russe"],"Cigogne",["Football","Boxe"],["Taras Shevchenko","Vitali Klitschko"],"Kyiv","Hryvnia UAH","Orthodoxie","Mer Noire"),
C("Serbie",3,"🇷🇸",["eu"],["Novi Sad","Niš","Kragujevac"],["Hongrie","Roumanie","Bulgarie","Bosnie","Croatie"],"UTC+1","77 474 km²","6,8 millions","Continental tempéré",["Ćevapi","Sarma","Ajvar"],["Serbe"],["Hongrois"],"Aigle blanc bicéphale",["Football","Tennis"],["Novak Djokovic","Nikola Tesla"],"Belgrade","Dinar serbe RSD","Orthodoxie","Pas d'accès à la mer"),
C("Croatie",3,"🇭🇷",["eu"],["Split","Rijeka","Osijek","Dubrovnik"],["Slovénie","Hongrie","Serbie","Bosnie"],"UTC+1","56 594 km²","3,9 millions","Méditerranéen / continental",["Peka","Pasticada","Soparnik"],["Croate"],[],"Martre",["Football","Basketball"],["Luka Modrić","Ivan Meštrović"],"Zagreb","Euro (€)","Catholicisme","Adriatique"),
C("Géorgie",3,"🇬🇪",["as"],["Batumi","Kutaisi","Rustavi"],["Russie","Azerbaïdjan","Arménie","Turquie"],"UTC+4","69 700 km²","3,7 millions","Subtropical / montagnard",["Khinkali","Khachapuri","Churchkhela"],["Géorgien"],["Russe"],"Cerf du Caucase",["Football","Rugby"],["Joseph Staline (d'origine)"],"Tbilissi","Lari GEL","Orthodoxie","Mer Noire"),
C("Luxembourg",3,"🇱🇺",["eu","micro"],["Esch-sur-Alzette","Differdange"],["France","Belgique","Allemagne"],"UTC+1","2 586 km²","660 000","Tempéré océanique",["Judd mat Gaardebounen","Gromperekichelcher"],["Luxembourgeois","Français","Allemand"],[],"Lion",["Football","Cyclisme"],["Jean-Claude Juncker"],"Luxembourg","Euro (€)","Christianisme","Pas d'accès à la mer"),
C("Monaco",4,"🇲🇨",["eu","micro"],["Monte-Carlo","La Condamine"],["France"],"UTC+1","2,02 km²","36 000","Méditerranéen",["Barbajuan","Pissaladière"],["Français"],[],"Lion",["Formule 1"],["Grace Kelly","Albert II","Charles Leclerc"],"Monaco","Euro (€)","Catholicisme","Méditerranée"),
C("Malte",4,"🇲🇹",["eu","micro"],["Birkirkara","Mosta"],[],"UTC+1","316 km²","530 000","Méditerranéen",["Fenek","Pastizzi"],["Maltais","Anglais"],[],"Agneau",["Football"],["Jean de la Valette"],"La Valette","Euro (€)","Catholicisme","Méditerranée"),
C("États-Unis",1,"🇺🇸",["na"],["Los Angeles","Chicago","Houston","Phœnix","Dallas","Seattle"],["Canada","Mexique"],"UTC-5 à -10","9 833 517 km²","335 millions","Très varié",["Hamburger","Barbecue","Mac and cheese"],["Anglais"],["Espagnol","Navajo"],"Aigle à tête blanche",["Football américain","Baseball","Basketball"],["Martin Luther King","Marilyn Monroe","Lincoln","Elvis"],"Washington D.C.","Dollar USD","Christianisme","Atlantique / Pacifique"),
C("Canada",1,"🇨🇦",["na"],["Montréal","Calgary","Ottawa","Edmonton"],["États-Unis"],"UTC-3,5 à -8","9 984 670 km²","39 millions","Subarctique / tempéré",["Poutine","Tourtière","Sirop d'érable"],["Anglais","Français"],["Cri","Inuktitut"],"Castor",["Hockey sur glace","Football canadien"],["Céline Dion","Wayne Gretzky","Drake"],"Ottawa","Dollar canadien CAD","Christianisme","Atlantique / Pacifique / Arctique"),
C("Mexique",2,"🇲🇽",["na"],["Guadalajara","Monterrey","Puebla"],["États-Unis","Guatemala"],"UTC-6 à -8","1 964 375 km²","130 millions","Tropical / semi-aride",["Tacos al pastor","Mole negro","Guacamole"],["Espagnol"],["Nahuatl","Maya"],"Aigle royal",["Football","Baseball","Boxe"],["Frida Kahlo","Diego Rivera","Octavio Paz"],"Mexico","Peso mexicain MXN","Catholicisme","Pacifique / Golfe du Mexique"),
C("Brésil",1,"🇧🇷",["sa"],["Rio de Janeiro","Salvador","Fortaleza","Curitiba","Manaus"],["Argentine","Bolivie","Pérou","Colombie","Venezuela"],"UTC-3 à -5","8 515 767 km²","215 millions","Tropical / équatorial",["Feijoada","Churrasco","Pão de queijo","Brigadeiro"],["Portugais"],["Guarani"],"Jaguar",["Football","Volleyball"],["Pelé","Ronaldo","Ayrton Senna"],"Brasília","Real brésilien BRL","Christianisme","Atlantique"),
C("Argentine",2,"🇦🇷",["sa"],["Córdoba","Rosario","Mendoza"],["Chili","Bolivie","Paraguay","Uruguay","Brésil"],"UTC-3","2 780 400 km²","46 millions","Subtropical / tempéré",["Asado","Empanadas","Dulce de leche"],["Espagnol"],["Guarani"],"Puma",["Football","Rugby","Polo"],["Messi","Borges","Che Guevara","Maradona"],"Buenos Aires","Peso argentin ARS","Catholicisme","Atlantique"),
C("Colombie",2,"🇨🇴",["sa"],["Medellín","Cali","Barranquilla"],["Venezuela","Brésil","Pérou","Équateur"],"UTC-5","1 141 748 km²","52 millions","Tropical / montagnard",["Bandeja paisa","Ajiaco","Arepas"],["Espagnol"],["Wayuu"],"Condor des Andes",["Football","Cyclisme"],["García Márquez","Shakira","Fernando Botero"],"Bogotá","Peso colombien COP","Catholicisme","Pacifique / Atlantique"),
C("Pérou",2,"🇵🇪",["sa"],["Arequipa","Trujillo","Cuzco"],["Équateur","Colombie","Brésil","Bolivie","Chili"],"UTC-5","1 285 216 km²","33 millions","Tropical / aride",["Ceviche","Lomo saltado","Ají de gallina"],["Espagnol"],["Quechua","Aymara"],"Vigogne",["Football","Volleyball"],["Mario Vargas Llosa"],"Lima","Sol péruvien PEN","Catholicisme","Pacifique"),
C("Chili",2,"🇨🇱",["sa"],["Valparaíso","Concepción","La Serena"],["Argentine","Bolivie","Pérou"],"UTC-4","756 102 km²","19 millions","Désertique / méditerranéen",["Empanadas","Cazuela","Sopaipillas"],["Espagnol"],["Mapuche"],"Huemul",["Football","Tennis","Ski"],["Pablo Neruda","Isabel Allende"],"Santiago","Peso chilien CLP","Catholicisme","Pacifique"),
C("Venezuela",3,"🇻🇪",["sa"],["Maracaibo","Valencia"],["Colombie","Brésil","Guyana"],"UTC-4","916 445 km²","28 millions","Tropical",["Arepas","Pabellón criollo"],["Espagnol"],[],"Troupiale",["Baseball","Football"],["Simón Bolívar","Gustavo Dudamel"],"Caracas","Bolívar VED","Christianisme","Atlantique"),
C("Uruguay",3,"🇺🇾",["sa"],["Salto","Paysandú"],["Argentine","Brésil"],"UTC-3","176 215 km²","3,5 millions","Subtropical océanique",["Asado","Chivito","Mate"],["Espagnol"],[],"Nandou",["Football","Basketball"],["Luis Suárez","José Mujica"],"Montevideo","Peso uruguayen UYU","Laïcité","Atlantique"),
C("Cuba",3,"🇨🇺",["na"],["Santiago de Cuba","Camagüey"],[],"UTC-5","109 884 km²","11 millions","Tropical humide",["Ropa vieja","Moros y cristianos"],["Espagnol"],[],"Tocororo",["Baseball","Boxe"],["Fidel Castro","Celia Cruz"],"La Havane","Peso cubain CUP","Laïcité","Caraïbes"),
C("Maroc",2,"🇲🇦",["af"],["Fès","Marrakech","Tanger","Agadir"],["Algérie","Mauritanie"],"UTC+1","446 550 km²","37 millions","Méditerranéen / saharien",["Tajine","Couscous","Pastilla","Harira"],["Arabe","Amazigh"],["Français"],"Lion de l'Atlas",["Football","Handball"],["Ibn Battuta","Mohammed VI"],"Rabat","Dirham MAD","Islam","Méditerranée / Atlantique"),
C("Égypte",2,"🇪🇬",["af"],["Alexandrie","Gizeh","Port-Saïd"],["Libye","Soudan","Israël"],"UTC+2","1 001 450 km²","105 millions","Désertique aride",["Koshari","Ful medames","Molokheyya"],["Arabe"],["Copte"],"Aigle de Saladin",["Football","Squash"],["Ramsès II","Cléopâtre","Mohamed Salah"],"Le Caire","Livre égyptienne EGP","Islam","Méditerranée / Mer Rouge"),
C("Afrique du Sud",2,"🇿🇦",["af"],["Cape Town","Durban","Port Elizabeth"],["Namibie","Botswana","Zimbabwe","Mozambique"],"UTC+2","1 219 090 km²","60 millions","Méditerranéen / subtropical",["Braai","Bobotie","Biltong"],["Zoulou","Xhosa","Afrikaans","Anglais"],["Tswana"],"Springbok",["Rugby","Football","Cricket"],["Mandela","Desmond Tutu","Elon Musk","Trevor Noah"],"Pretoria","Rand ZAR","Christianisme","Atlantique / Indien"),
C("Nigeria",2,"🇳🇬",["af"],["Lagos","Kano","Ibadan","Port Harcourt"],["Bénin","Niger","Tchad","Cameroun"],"UTC+1","923 768 km²","220 millions","Tropical / semi-aride",["Jollof rice","Egusi soup","Suya"],["Anglais"],["Haoussa","Yoruba","Igbo"],"Aigle",["Football","Basketball"],["Wole Soyinka","Chinua Achebe","Fela Kuti"],"Abuja","Naira NGN","Islam / Christianisme","Atlantique"),
C("Algérie",2,"🇩🇿",["af"],["Oran","Constantine","Annaba"],["Maroc","Mali","Niger","Libye","Tunisie"],"UTC+1","2 381 741 km²","46 millions","Méditerranéen / saharien",["Couscous","Chorba","Rechta"],["Arabe","Tamazight"],["Français"],"Fennec",["Football","Handball"],["Albert Camus","Zinédine Zidane (ascendance)"],"Alger","Dinar algérien DZD","Islam","Méditerranée"),
C("Tunisie",2,"🇹🇳",["af"],["Sfax","Sousse","Kairouan"],["Algérie","Libye"],"UTC+1","163 610 km²","12 millions","Méditerranéen / semi-aride",["Couscous","Brik","Lablabi"],["Arabe"],["Berbère"],"Aigle",["Football","Handball"],["Ibn Khaldoun","Hannibal"],"Tunis","Dinar tunisien TND","Islam","Méditerranée"),
C("Kenya",3,"🇰🇪",["af"],["Mombasa","Kisumu","Nakuru"],["Éthiopie","Somalie","Tanzanie","Ouganda"],"UTC+3","580 367 km²","55 millions","Tropical / semi-aride",["Ugali","Nyama choma","Githeri"],["Swahili","Anglais"],["Kikuyu"],"Lion",["Athlétisme","Football"],["Wangari Maathai","Eliud Kipchoge","Lupita Nyong'o"],"Nairobi","Shilling kényan KES","Christianisme","Indien"),
C("Éthiopie",3,"🇪🇹",["af"],["Dire Dawa","Gondar","Mekele"],["Érythrée","Djibouti","Somalie","Kenya","Soudan"],"UTC+3","1 104 300 km²","126 millions","Tropical / semi-aride",["Injera","Doro wat","Tibs"],["Amharique"],["Oromo","Tigrigna"],"Lion de Juda",["Athlétisme","Football"],["Haïlé Sélassié","Haile Gebrselassie"],"Addis-Abeba","Birr ETB","Orthodoxie","Enclavé"),
C("Sénégal",3,"🇸🇳",["af"],["Touba","Thiès","Ziguinchor"],["Mauritanie","Mali","Guinée","Gambie"],"UTC+0","196 722 km²","18 millions","Tropical semi-aride",["Thiéboudienne","Mafé","Yassa"],["Français"],["Wolof","Sérère"],"Lion",["Football","Lutte sénégalaise"],["Youssou N'Dour","Sadio Mané","Senghor"],"Dakar","Franc CFA XOF","Islam","Atlantique"),
C("Ghana",3,"🇬🇭",["af"],["Kumasi","Tamale","Cape Coast"],["Côte d'Ivoire","Burkina Faso","Togo"],"UTC+0","238 533 km²","33 millions","Tropical humide",["Fufu","Jollof rice","Kelewele"],["Anglais"],["Akan","Ewe"],"Aigle",["Football","Boxe"],["Kofi Annan","Kwame Nkrumah","Michael Essien"],"Accra","Cedi GHS","Christianisme","Atlantique"),
C("Cameroun",3,"🇨🇲",["af"],["Douala","Garoua","Bamenda"],["Nigeria","Tchad","RCA","Congo","Gabon"],"UTC+1","475 442 km²","27 millions","Équatorial / tropical",["Ndolé","Eru","Kati kati"],["Français","Anglais"],["Ewondo"],"Lion",["Football","Athlétisme"],["Roger Milla","Samuel Eto'o"],"Yaoundé","Franc CFA XAF","Christianisme / Islam","Atlantique"),
C("Tanzanie",3,"🇹🇿",["af"],["Dar es Salaam","Mwanza","Arusha"],["Kenya","Ouganda","Rwanda","Mozambique"],"UTC+3","945 087 km²","65 millions","Tropical / semi-aride",["Ugali","Nyama choma","Pilau"],["Swahili","Anglais"],["Sukuma"],"Girafe",["Football","Athlétisme"],["Julius Nyerere","Diamond Platnumz"],"Dodoma","Shilling tanzanien TZS","Islam / Christianisme","Indien"),
C("Japon",1,"🇯🇵",["as"],["Osaka","Kyoto","Yokohama","Nagoya","Sapporo","Fukuoka"],[],"UTC+9","377 930 km²","125 millions","Tempéré / subtropical",["Ramen","Sushi","Tempura","Yakitori"],["Japonais"],[],"Grue du Japon",["Baseball","Football","Judo","Sumo"],["Kurosawa","Miyazaki","Haruki Murakami"],"Tokyo","Yen ¥","Shintoïsme / Bouddhisme","Pacifique / Mer du Japon"),
C("Chine",1,"🇨🇳",["as"],["Shanghai","Chongqing","Shenzhen","Guangzhou","Chengdu"],["Russie","Mongolie","Inde","Népal","Vietnam"],"UTC+8","9 596 960 km²","1,4 milliard","Très varié",["Canard laqué","Dim sum","Mapo tofu","Hot pot"],["Mandarin"],["Cantonais","Tibétain"],"Panda géant",["Football","Basketball","Ping-pong"],["Confucius","Mao Zedong","Yao Ming"],"Pékin","Yuan CNY","Athéisme / Bouddhisme","Pacifique"),
C("Inde",1,"🇮🇳",["as"],["Mumbai","Kolkata","Bangalore","Chennai","Hyderabad"],["Pakistan","Chine","Népal","Bangladesh"],"UTC+5:30","3 287 263 km²","1,4 milliard","Tropical de mousson",["Butter chicken","Biryani","Samosa","Dosa"],["Hindi","Anglais"],["Bengali","Tamil","Ourdou"],"Tigre du Bengale",["Cricket","Hockey sur gazon"],["Mahatma Gandhi","Nehru","A.R. Rahman","Sachin Tendulkar"],"New Delhi","Roupie indienne INR","Hindouisme","Indien"),
C("Corée du Sud",2,"🇰🇷",["as"],["Busan","Incheon","Daegu","Daejeon"],["Corée du Nord"],"UTC+9","100 210 km²","51 millions","Tempéré continental",["Bibimbap","Kimchi","Bulgogi","Tteokbokki"],["Coréen"],[],"Tigre",["Football","Baseball","E-sport","Taekwondo"],["BTS","PSY","Bong Joon-ho","Son Heung-min"],"Séoul","Won KRW","Christianisme / Bouddhisme","Mer Jaune / Mer du Japon"),
C("Thaïlande",2,"🇹🇭",["as"],["Chiang Mai","Pattaya","Nonthaburi"],["Myanmar","Laos","Cambodge","Malaisie"],"UTC+7","513 120 km²","72 millions","Tropical de mousson",["Pad Thaï","Tom yum","Green curry"],["Thaï"],["Malay"],"Éléphant blanc",["Football","Muay Thai"],["Tony Jaa","Lisa (BLACKPINK)"],"Bangkok","Baht THB","Bouddhisme","Golfe de Thaïlande"),
C("Vietnam",2,"🇻🇳",["as"],["Da Nang","Hanoï","Hai Phong"],["Chine","Laos","Cambodge"],"UTC+7","331 212 km²","98 millions","Tropical / subtropical",["Phở","Banh mi","Bun bo Hue"],["Vietnamien"],["Tày"],"Buffle d'eau",["Football","Badminton"],["Hô Chi Minh"],"Hanoï","Dông VND","Bouddhisme","Mer de Chine"),
C("Indonésie",2,"🇮🇩",["as"],["Surabaya","Bandung","Medan"],["Malaisie","Papouasie-Nouvelle-Guinée"],"UTC+7 à +9","1 904 569 km²","275 millions","Équatorial / tropical",["Nasi goreng","Satay","Rendang"],["Indonésien"],["Javanais"],"Garuda",["Football","Badminton"],["Sukarno"],"Jakarta","Roupie IDR","Islam","Pacifique / Indien"),
C("Malaisie",2,"🇲🇾",["as"],["George Town","Ipoh","Johor Bahru"],["Thaïlande","Indonésie"],"UTC+8","329 847 km²","33 millions","Équatorial humide",["Nasi lemak","Laksa","Roti canai"],["Malais"],["Chinois malaisien","Tamil"],"Tigre de Malaisie",["Football","Badminton"],["Lee Chong Wei"],"Kuala Lumpur","Ringgit MYR","Islam","Mer de Chine"),
C("Singapour",2,"🇸🇬",["as","micro"],["Jurong East","Woodlands"],[],"UTC+8","728,6 km²","5,9 millions","Équatorial humide",["Chicken rice","Laksa","Chili crab"],["Anglais","Mandarin","Malais","Tamil"],[],"Lion (Merlion)",["Football","Badminton"],["Lee Kuan Yew"],"Singapour","Dollar SGD","Bouddhisme","Détroit de Malacca"),
C("Philippines",2,"🇵🇭",["as"],["Davao","Cebu","Zamboanga"],[],"UTC+8","300 000 km²","115 millions","Tropical de mousson",["Adobo","Sinigang","Lechón"],["Filipino","Anglais"],["Cebuano"],"Aigle des Philippines",["Basketball","Football","Boxe"],["Manny Pacquiao","José Rizal"],"Manille","Peso philippin PHP","Catholicisme","Mer de Chine / Pacifique"),
C("Arabie saoudite",3,"🇸🇦",["as"],["Djeddah","La Mecque","Médine"],["Jordanie","Irak","Qatar","Émirats","Oman","Yémen"],"UTC+3","2 149 690 km²","35 millions","Désertique aride",["Kabsa","Harees","Mutabbaq"],["Arabe"],[],"Faucon",["Football","Équitation"],["Ibn Battuta","Mohammed ben Salmane"],"Riyad","Riyal saoudien SAR","Islam","Mer Rouge / Golfe Persique"),
C("Émirats arabes unis",3,"🇦🇪",["as"],["Dubaï","Sharjah"],["Arabie saoudite","Oman"],"UTC+4","83 600 km²","10 millions","Désertique aride",["Shawarma","Machboos"],["Arabe"],["Anglais"],"Faucon Gerfaut",["Football","Cricket"],["Sheikh Zayed"],"Abou Dhabi","Dirham AED","Islam","Golfe Persique"),
C("Iran",3,"🇮🇷",["as"],["Ispahan","Chiraz","Tabriz"],["Turquie","Azerbaïdjan","Afghanistan","Pakistan","Irak"],"UTC+3:30","1 648 195 km²","87 millions","Semi-aride / désertique",["Ghormeh sabzi","Fesenjan","Chelo kabab"],["Persan"],["Azéri","Kurde"],"Lion (historique)",["Football","Lutte"],["Omar Khayyam","Rumi","Avicenne"],"Téhéran","Rial iranien IRR","Islam chiite","Caspienne / Golfe Persique"),
C("Pakistan",3,"🇵🇰",["as"],["Lahore","Faisalabad","Rawalpindi"],["Inde","Chine","Afghanistan","Iran"],"UTC+5","881 913 km²","230 millions","Semi-aride / montagnard",["Biryani","Nihari","Karahi"],["Ourdou","Anglais"],["Pendjabi"],"Markhor",["Cricket","Hockey","Squash"],["Malala Yousafzai","Imran Khan"],"Islamabad","Roupie PKR","Islam","Mer d'Oman"),
C("Népal",3,"🇳🇵",["as"],["Pokhara","Lalitpur"],["Inde","Chine"],"UTC+5:45","147 181 km²","30 millions","Subtropical / himalayan",["Dal bhat","Momo","Thukpa"],["Népalais"],["Maithili"],"Vache",["Football","Cricket"],["Edmund Hillary & Tensing Norgay"],"Katmandou","Roupie népalaise NPR","Hindouisme","Enclavé"),
C("Sri Lanka",3,"🇱🇰",["as"],["Dehiwala","Kandy"],[],"UTC+5:30","65 610 km²","22 millions","Tropical de mousson",["Rice and curry","Hoppers","Kottu"],["Cingalais","Tamoul"],["Anglais"],"Lion",["Cricket","Football"],["Kumar Sangakkara"],"Sri Jayawardenepura Kotte","Roupie LKR","Bouddhisme","Indien"),
C("Mongolie",4,"🇲🇳",["as"],["Erdenet","Darkhan"],["Russie","Chine"],"UTC+7 à +8","1 564 116 km²","3,3 millions","Continental aride",["Buuz","Khuushuur","Tsuivan"],["Mongol"],[],"Cheval de Przewalski",["Lutte","Tir à l'arc"],["Gengis Khan"],"Oulan-Bator","Tögrög MNT","Bouddhisme","Enclavé"),
C("Kazakhstan",4,"🇰🇿",["as"],["Almaty","Shymkent"],["Russie","Chine","Kirghizistan","Ouzbékistan"],"UTC+5 / +6","2 724 900 km²","19 millions","Continental sec",["Beshbarmak","Kuyrdak"],["Kazakh","Russe"],[],"Aigle des steppes",["Football","Lutte"],["Nursultan Nazarbaïev"],"Astana","Tenge KZT","Islam","Caspienne"),
C("Bhoutan",4,"🇧🇹",["as"],["Paro","Punakha"],["Inde","Chine"],"UTC+6","38 394 km²","800 000","Subtropical / himalayan",["Ema datshi","Phaksha paa"],["Dzongkha"],[],"Takin",["Tir à l'arc"],["Jigme Singye Wangchuck"],"Thimphou","Ngultrum BTN","Bouddhisme","Enclavé"),
C("Australie",1,"🇦🇺",["oc"],["Melbourne","Brisbane","Perth","Adelaide"],[],"UTC+8 à +11","7 692 024 km²","26 millions","Aride / subtropical",["Meat pie","Vegemite","Tim Tam","Pavlova"],["Anglais"],["Warlpiri"],"Kangourou",["Cricket","Football australien","Rugby"],["Kylie Minogue","Hugh Jackman","Cate Blanchett"],"Canberra","Dollar australien AUD","Christianisme","Pacifique / Indien"),
C("Nouvelle-Zélande",2,"🇳🇿",["oc"],["Wellington","Christchurch","Hamilton"],[],"UTC+12","268 021 km²","5 millions","Tempéré océanique",["Hāngī","Pavlova","Lamington"],["Anglais","Maori"],[],"Kiwi",["Rugby","Cricket","Voile"],["Peter Jackson","Lorde","Edmund Hillary"],"Wellington","Dollar NZD","Christianisme","Pacifique"),
/* ── NOUVEAUX PAYS ── */
C("Irlande",2,"🇮🇪",["eu"],["Cork","Galway","Limerick","Waterford"],["Royaume-Uni"],"UTC+0","70 273 km²","5,1 millions","Tempéré océanique",["Irish stew","Soda bread","Boxty","Colcannon"],["Anglais","Irlandais"],["Gaélique"],"Cerf élaphe / Harpe",["Rugby","Football gaélique","Hurling"],["James Joyce","Oscar Wilde","U2","Conor McGregor"],"Dublin","Euro (€)","Catholicisme","Atlantique / Mer d'Irlande"),
C("Israël",2,"🇮🇱",["as"],["Tel Aviv","Haïfa","Jérusalem","Eilat"],["Liban","Syrie","Jordanie","Égypte"],"UTC+2","22 145 km²","9,8 millions","Méditerranéen / désertique",["Houmous","Falafel","Shakshuka","Sabich"],["Hébreu","Arabe"],["Anglais"],"Guêpier",["Football","Basketball"],["Gal Gadot","Natalie Portman"],"Jérusalem","Shekel (₪)","Judaïsme","Méditerranée / Mer Rouge"),
C("Qatar",3,"🇶🇦",["as","micro"],["Doha","Al Rayyan","Al Wakrah"],["Arabie saoudite"],"UTC+3","11 586 km²","2,7 millions","Désertique aride",["Machboos","Harees","Balaleet"],["Arabe"],["Anglais"],"Oryx d'Arabie",["Football","Athlétisme"],["Cheikh Tamim"],"Doha","Riyal qatari","Islam","Golfe Persique"),
C("Bolivie",3,"🇧🇴",["sa"],["La Paz","Santa Cruz","Cochabamba","Sucre"],["Brésil","Paraguay","Argentine","Chili","Pérou"],"UTC-4","1 098 581 km²","12 millions","Andin / tropical",["Salteñas","Silpancho","Pique macho"],["Espagnol","Quechua","Aymara"],[],"Lama / Condor",["Football"],["Evo Morales","Jaime Laredo"],"Sucre / La Paz","Boliviano","Catholicisme","Enclavé"),
C("Slovaquie",3,"🇸🇰",["eu"],["Košice","Prešov","Žilina","Nitra"],["Tchéquie","Pologne","Ukraine","Hongrie","Autriche"],"UTC+1","49 035 km²","5,4 millions","Continental tempéré",["Bryndzové halušky","Kapustnica","Lokše"],["Slovaque"],["Hongrois"],"Ours brun",["Hockey sur glace","Football","Canoë"],["Andy Warhol (origine)","Peter Sagan"],"Bratislava","Euro (€)","Catholicisme","Enclavé"),
C("Bulgarie",3,"🇧🇬",["eu"],["Plovdiv","Varna","Bourgas","Ruse"],["Roumanie","Serbie","Macédoine du Nord","Grèce","Turquie"],"UTC+2","110 994 km²","6,5 millions","Continental / méditerranéen",["Banitsa","Shopska salata","Kavarma","Yaourt bulgare"],["Bulgare"],[],"Lion",["Volleyball","Lutte","Football"],["Hristo Stoichkov","Veselin Topalov"],"Sofia","Lev bulgare","Orthodoxie","Mer Noire"),
C("Bangladesh",3,"🇧🇩",["as"],["Dhaka","Chittagong","Khulna","Sylhet"],["Inde","Birmanie"],"UTC+6","147 570 km²","171 millions","Tropical / mousson",["Biryani","Hilsa","Bhuna","Pitha"],["Bengali"],[],"Tigre du Bengale",["Cricket","Kabaddi","Football"],["Muhammad Yunus","Sheikh Mujibur Rahman"],"Dhaka","Taka","Islam","Golfe du Bengale"),
];

/* ═══════════════════════════════════════════════════════
   VILLES DE FRANCE — 32 villes
═══════════════════════════════════════════════════════ */
const V=(nm,d,rg,dp,po,rv,cu,cl,ce,ec,su,un)=>
  ({nm,d,rg,dp,po,rv,cu,cl,ce,ec,su,un,_type:"france"});
const FRANCE=[
V("Paris",1,"Île-de-France","Paris (75)","2,1 millions","Seine",["Croissant","Baguette","Steak-frites","Escargots"],"Paris Saint-Germain",["Édith Piaf","Victor Hugo","Napoléon","Coco Chanel"],"Finance, mode, tourisme","La Ville Lumière","Sorbonne / Sciences Po"),
V("Lyon",1,"Auvergne-Rhône-Alpes","Rhône (69)","520 000","Rhône et Saône",["Quenelles","Andouillette","Cervelle de canut","Tarte à la praline"],"Olympique Lyonnais",["Paul Bocuse","Lumière","Tony Parker"],"Gastronomie, pharmacie","La Capitale de la gastronomie","Université de Lyon"),
V("Marseille",1,"PACA","Bouches-du-Rhône (13)","870 000","Mer Méditerranée",["Bouillabaisse","Navette","Pastis"],"Olympique de Marseille",["Marcel Pagnol"],"Port, tourisme","La Cité Phocéenne","Aix-Marseille Université"),
V("Bordeaux",1,"Nouvelle-Aquitaine","Gironde (33)","260 000","Garonne",["Entrecôte bordelaise","Cannelé","Huîtres d'Arcachon"],"Girondins de Bordeaux",["Montesquieu","François Mauriac"],"Viticulture, aérospatial","La Perle d'Aquitaine","Université de Bordeaux"),
V("Nice",1,"PACA","Alpes-Maritimes (06)","342 000","Mer",["Socca","Pan bagnat","Salade niçoise","Pissaladière"],"OGC Nice",["Matisse (résidait)","Yves Klein"],"Tourisme, technologie","La Côte d'Azur","Université Côte d'Azur"),
V("Toulouse",1,"Occitanie","Haute-Garonne (31)","490 000","Garonne",["Cassoulet","Saucisse de Toulouse","Foie gras"],"Toulouse FC / Stade Toulousain",["Jean Jaurès","Claude Nougaro"],"Aéronautique (Airbus), spatial","La Ville Rose","Paul Sabatier / Sup'Aéro"),
V("Strasbourg",2,"Grand Est","Bas-Rhin (67)","285 000","Rhin et Ill",["Choucroute","Bretzel","Flammekueche","Kouglof"],"RC Strasbourg",["Gutenberg","Gustave Doré"],"Parlement européen, brasseries","La Capitale de Noël","Université de Strasbourg"),
V("Nantes",2,"Pays de la Loire","Loire-Atlantique (44)","320 000","Loire",["Muscadet","Beurre blanc nantais"],"FC Nantes",["Jules Verne","Anne de Bretagne"],"Agroalimentaire, numérique","La Venise de l'Ouest","Université de Nantes"),
V("Montpellier",2,"Occitanie","Hérault (34)","290 000","Lez",["Tielle sétoise","Vins du Languedoc"],"Montpellier HSC",["Georges Frêche"],"Enseignement, santé","La Surdouée","Université de Montpellier"),
V("Rennes",2,"Bretagne","Ille-et-Vilaine (35)","220 000","Vilaine",["Galette-saucisse","Crêpe","Cidre","Kouign-amann"],"Stade Rennais",["Bertrand du Guesclin"],"Télécoms, numérique","La Capitale de la Bretagne","Université de Rennes"),
V("Lille",2,"Hauts-de-France","Nord (59)","235 000","Deûle",["Carbonnade flamande","Potjevleesch","Maroilles"],"LOSC Lille",["Charles de Gaulle"],"Commerce, logistique","La Capitale des Flandres","Université de Lille"),
V("Grenoble",2,"Auvergne-Rhône-Alpes","Isère (38)","160 000","Isère",["Gratin dauphinois","Ravioles du Dauphiné"],"Grenoble Foot 38",["Stendhal","Michel Petrucciani"],"Haute technologie, ski","La Capitale des Alpes","Université Grenoble Alpes"),
V("Dijon",2,"Bourgogne-Franche-Comté","Côte-d'Or (21)","155 000","Suzon",["Moutarde de Dijon","Cassis","Pain d'épices"],"Dijon FCO",["Philippe le Hardi","Félix Kir"],"Moutarde, vins de Bourgogne","La Cité des Ducs","Université de Bourgogne"),
V("Reims",3,"Grand Est","Marne (51)","185 000","Vesle",["Champagne","Biscuit rose","Ratafia"],"Stade de Reims",["Dom Pérignon","Clovis (baptisé ici)"],"Champagne, tourisme","La Cité des Sacres","Université de Reims"),
V("Le Havre",3,"Normandie","Seine-Maritime (76)","170 000","Seine",["Homard normand","Calvados","Coquilles Saint-Jacques"],"Le Havre AC",["Raymond Devos"],"Port, pétrochimie","La Porte Océane","Université Le Havre Normandie"),
V("Toulon",3,"PACA","Var (83)","175 000","Mer Méditerranée",["Daube provençale","Soupe de poisson"],"RC Toulon (rugby)",["Lazare Carnot"],"Marine nationale, tourisme","La Rade","Université de Toulon"),
V("Angers",3,"Pays de la Loire","Maine-et-Loire (49)","155 000","Maine",["Poires Belle Angevine","Cointreau"],"SCO Angers",["René d'Anjou"],"Horticulture, électronique","La Cité des Fleurs","Université d'Angers"),
V("Nîmes",3,"Occitanie","Gard (30)","150 000","Vistre",["Brandade de morue","Croquants de Villaret"],"Nîmes Olympique",["Alphonse Daudet"],"Tourisme (arènes)","La Rome française","Université de Nîmes"),
V("Clermont-Ferrand",3,"Auvergne-Rhône-Alpes","Puy-de-Dôme (63)","145 000","Allier",["Truffade","Aligot","Saint-Nectaire"],"ASM Clermont (rugby)",["Pascal Blaise","Vercingétorix"],"Michelin, pharmaceutique","La Cité Noire","Université Clermont Auvergne"),
V("Brest",3,"Bretagne","Finistère (29)","145 000","Penfeld (mer)",["Homard breton","Crêpe au beurre salé"],"Stade Brestois 29",["-"],"Marine, océanographie","La Ville de la Mer","Université de Bretagne Occidentale"),
V("Caen",3,"Normandie","Calvados (14)","105 000","Orne",["Tripes à la mode de Caen","Calvados","Camembert"],"SM Caen",["Guillaume le Conquérant"],"Tourisme D-Day, industrie","La Cité Guillaume le Conquérant","Université de Caen"),
V("Nancy",3,"Grand Est","Meurthe-et-Moselle (54)","105 000","Moselle",["Macarons de Nancy","Bergamotes","Quiche lorraine"],"AS Nancy-Lorraine",["Stanislas Leszczynski"],"Industrie, services","La Ville de Stanislas","Université de Lorraine"),
V("Metz",3,"Grand Est","Moselle (57)","120 000","Moselle",["Mirabelles","Quiche lorraine"],"FC Metz",["Paul Verlaine"],"Sidérurgie, culture","La Ville d'Art et d'Histoire","Université de Lorraine"),
V("Rouen",3,"Normandie","Seine-Maritime (76)","110 000","Seine",["Canard rouennais","Ficelle normande"],"FC Rouen",["Gustave Flaubert","Jeanne d'Arc (suppliciée)"],"Logistique portuaire","La Ville aux Cent Clochers","Université de Rouen"),
V("Perpignan",3,"Occitanie","Pyrénées-Orientales (66)","120 000","Têt",["Anchois de Collioure","Cargolade"],"USA Perpignan (rugby)",["-"],"Tourisme, viticulture","La Capitale du Roussillon","Université de Perpignan"),
V("Tours",3,"Centre-Val de Loire","Indre-et-Loire (37)","135 000","Loire",["Rillons de Tours","Vouvray"],"Tours FC",["Honoré de Balzac"],"Tourisme châteaux, pharma","La Cité des Rois","Université de Tours"),
V("Amiens",3,"Hauts-de-France","Somme (80)","135 000","Somme",["Ficelle picarde","Pâté de canard"],"Amiens SC",["Jules Verne"],"Logistique, agroalimentaire","La Venise du Nord","Université de Picardie"),
V("Limoges",4,"Nouvelle-Aquitaine","Haute-Vienne (87)","130 000","Vienne",["Clafoutis","Mouton limousin"],"CSP Limoges (basket)",["Renoir"],"Porcelaine, arts du feu","La Cité de la Porcelaine","Université de Limoges"),
V("Besançon",4,"Bourgogne-Franche-Comté","Doubs (25)","115 000","Doubs",["Cancoillotte","Saucisse de Morteau","Comté"],"-",["Victor Hugo","Charles Fourier"],"Microtechnique, horlogerie","La Cité de Vauban","Université de Franche-Comté"),
V("La Rochelle",4,"Nouvelle-Aquitaine","Charente-Maritime (17)","78 000","Mer Atlantique",["Huîtres de Marennes","Pineau des Charentes"],"Stade Rochelais (rugby)",["Pierre Loti"],"Tourisme, port","La Ville aux Tours","Université de La Rochelle"),
V("Pau",4,"Nouvelle-Aquitaine","Pyrénées-Atlantiques (64)","80 000","Gave de Pau",["Garbure","Ossau-Iraty"],"Pau FC",["Henri IV"],"Pétrole, tourisme","Le Belvédère des Pyrénées","Université de Pau"),
V("Avignon",4,"PACA","Vaucluse (84)","93 000","Rhône",["Anchoïade","Tapenade","Berlingot"],"Avignon FA",["Benoît XII"],"Tourisme (Festival, Papes)","La Cité des Papes","Université d'Avignon"),

/* ── VILLES SUPPLÉMENTAIRES ── */
V("Aix-en-Provence",2,"PACA","Bouches-du-Rhône (13)","143 000","Arc",["Calisson d'Aix","Tapenade","Navettes"],"SC Aix",["Paul Cézanne","Émile Zola","Mirabeau"],"Université, tourisme, high-tech","Le pays de Cézanne","Université Aix-Marseille"),
V("Saint-Étienne",2,"Auvergne-Rhône-Alpes","Loire (42)","170 000","Furan",["Fourme de Montbrison","Charcuterie forézienne"],"AS Saint-Étienne",["Michel Platini (a joué)"],"Industrie, design","La Ville des Verts","Université Jean Monnet"),
V("Orléans",2,"Centre-Val de Loire","Loiret (45)","115 000","Loire",["Vinaigre d'Orléans","Cotignac d'Orléans"],"Orléans Loiret HB",["Jeanne d'Arc","Charles de Gaulle (a étudié)"],"Cosmétiques, logistique","La Cité de Jeanne d'Arc","Université d'Orléans"),
V("Mulhouse",2,"Grand Est","Haut-Rhin (68)","110 000","Ill",["Bibeleskaes","Flammekueche","Presskopf"],"FC Mulhouse",["Alfred Dreyfus (originaire)"],"Industrie, chimie, automobile","La Cité du Textile","Université Haute-Alsace"),
V("Villeurbanne",2,"Auvergne-Rhône-Alpes","Rhône (69)","150 000","Rhône",["Bugnes","Cervelle de canut","Grattons"],"ASVEL basket",["Bertrand Tavernier","Raymond Barre"],"Industrie, culture","La Ville ouvrière","Université Lumière Lyon 2"),
V("Boulogne-Billancourt",2,"Île-de-France","Hauts-de-Seine (92)","120 000","Seine",["Crêpe","Steak-frites"],"Racing 92 (rugby)",["Marcel Renault","Georges Braque","Louis Renault"],"Automobile, médias, audiovisuel","La Commune la plus peuplée hors Paris","Université Paris Saclay"),
V("Versailles",3,"Île-de-France","Yvelines (78)","85 000","Étang de Marly",["Poire Belle Hélène","Macarons"],"Versailles FC",["Louis XIV","Marie-Antoinette","Racine"],"Tourisme (Château), administration","La Ville Royale","Université de Versailles"),
V("Colmar",3,"Grand Est","Haut-Rhin (68)","70 000","Lauch",["Choucroute","Baeckeoffe","Munster","Kougelhopf"],"Colmar FC",["Frédéric Auguste Bartholdi (sculpteur de la Statue de la Liberté)"],"Vins d'Alsace, tourisme","La Petite Venise","IUT Colmar"),
V("Quimper",3,"Bretagne","Finistère (29)","63 000","Odet",["Crêpe au beurre salé","Galette sarrasin","Far breton"],"Quimper FC",["Max Jacob"],"Faïences, tourisme breton","La Capitale de la Cornouaille","Université Bretagne Occidentale"),
V("Poitiers",3,"Nouvelle-Aquitaine","Vienne (86)","89 000","Clain",["Mogette de Vendée","Chabichou","Fromage poitevin"],"Poitiers FC",["René Descartes (a étudié)","Aliénor d'Aquitaine"],"Université, tourisme, Futuroscope","La Cité du Futuroscope","Université de Poitiers"),
V("Bayonne",3,"Nouvelle-Aquitaine","Pyrénées-Atlantiques (64)","50 000","Adour",["Jambon de Bayonne","Gâteau basque","Chocolat de Bayonne"],"Aviron Bayonnais (rugby)",["Jean Bart (corsaire)"],"Port, chocolat, Pays Basque","La Capitale du Pays Basque","Université de Pau (antenne)"),
V("Angoulême",3,"Nouvelle-Aquitaine","Charente (16)","42 000","Charente",["Cognac","Cagouilles","Charentais melon"],"Angoulême FC",["Ingres (né ici) / Francis Cabrel"],"Bande dessinée, papier, multimédia","La Capitale de la BD","Université de Poitiers"),
V("Troyes",3,"Grand Est","Aube (10)","60 000","Seine",["Andouillette de Troyes","Chaource","Champagne"],"ESTAC Troyes",["Chrétien de Troyes"],"Textile, bonneterie, champagne","La Cité des Andouillettes","Université de Reims"),
V("Chartres",3,"Centre-Val de Loire","Eure-et-Loir (28)","40 000","Eure",["Mentchikoff","Pâté de Chartres"],"C'Chartres Football",["-"],"Cosmétiques, électronique, tourisme","La Cité de la Cathédrale","Université d'Orléans"),
V("Calais",3,"Hauts-de-France","Pas-de-Calais (62)","73 000","Mer du Nord",["Hareng fumé","Moules-frites"],"Racing Club de Lens (proche)",["Auguste Rodin (Les Bourgeois de Calais)"],"Dentelle, port, tunnel sous la Manche","La Porte de l'Angleterre","Université Littoral Côte d'Opale"),
V("Dunkerque",3,"Hauts-de-France","Nord (59)","88 000","Mer du Nord",["Potjevleesch","Carbonnade flamande","Hochepot"],"USL Dunkerque",["Jean Bart (amiral)"],"Port industriel, pétrochimie","La Cité du Carnaval","Université Littoral Côte d'Opale"),
V("Valenciennes",3,"Hauts-de-France","Nord (59)","43 000","Escaut",["Carbonnade flamande","Maroilles","Ch'ti"],"Valenciennes FC",["Antoine Watteau"],"Métallurgie, automobile, université","La Cité du Valenciennois","Université Polytechnique Hauts-de-France"),
V("Lorient",3,"Bretagne","Morbihan (56)","57 000","Scorff",["Homard breton","Langoustines","Crêpe"],"FC Lorient",["-"],"Port de pêche, festival interceltique","La Cité des Cinq Ports","Université de Bretagne Sud"),
V("Vannes",3,"Bretagne","Morbihan (56)","55 000","Golfe du Morbihan",["Kouign-amann","Crêpe bretonne","Homard"],"Vannes Agglo Basket",["-"],"Tourisme, marine, agriculture","La Cité Corsaire","Université de Bretagne Sud"),
V("Saint-Nazaire",3,"Pays de la Loire","Loire-Atlantique (44)","72 000","Loire",["Galette-saucisse","Muscadet"],"FC Nantes (proche)",["Jules Verne (a habité)"],"Construction navale, port","La Cité des Chantiers Navals","IUT de Saint-Nazaire"),
V("Béziers",3,"Occitanie","Hérault (34)","78 000","Orb",["Fougasse","Vins de l'Hérault"],"AS Béziers Hérault (rugby)",["Jean Moulin (résistant)"],"Viticulture, négoce","La Ville du Rugby","Université Paul-Valéry"),
V("Arles",4,"PACA","Bouches-du-Rhône (13)","52 000","Rhône",["Saucisson d'Arles","Taureau de Camargue","Gardiane"],"FC Arles",["Vincent Van Gogh (a vécu)","Paul Gauguin (a séjourné)","Frédéric Mistral"],"Tourisme, riz, photographie (festival)","La Petite Rome","Université Aix-Marseille"),
V("Hyères",4,"PACA","Var (83)","57 000","Mer Méditerranée",["Daube varoise","Capoun","Tapenade"],"Hyères FC",["Alexis de Tocqueville (a séjourné)"],"Tourisme, mer","La Cité des Palmiers","Université de Toulon"),
V("Montauban",4,"Occitanie","Tarn-et-Garonne (82)","60 000","Tarn",["Chasselas de Moissac","Foie gras"],"Union Rugby Montauban",["Jean-Auguste-Dominique Ingres","Antoine Bourdelle"],"Agriculture, tourisme","La Cité d'Ingres","Université de Toulouse (antenne)"),
V("Gap",4,"PACA","Hautes-Alpes (05)","40 000","Luye",["Tourtons","Sisteron agneau rôti"],"FC Gap",["-"],"Tourisme alpin, agriculture","La Préfecture des Hautes-Alpes","IUT Gap"),
V("Albi",4,"Occitanie","Tarn (81)","50 000","Tarn",["Cassoulet","Jambon sec de montagne"],"SC Albi (rugby)",["Toulouse-Lautrec"],"Tourisme, agroalimentaire","La Cité Épiscopale","Université Champollion"),
V("Périgueux",4,"Nouvelle-Aquitaine","Dordogne (24)","30 000","Isle",["Foie gras","Truffe du Périgord","Confit de canard"],"Section Paloise (proche)",["Brantôme","Jean-Baptiste Detailleur"],"Foie gras, truffe, tourisme","La Capitale du Périgord","Université de Bordeaux (antenne)"),
V("Auxerre",4,"Bourgogne-Franche-Comté","Yonne (89)","35 000","Yonne",["Chablis","Gougères","Epoisses"],"AJ Auxerre",["Paul Bert","Michel Valbrun"],"Viticulture, Chablis, services","La Porte de la Bourgogne","Université de Bourgogne (antenne)"),
V("Châteauroux",4,"Centre-Val de Loire","Indre (36)","44 000","Indre",["Pâté de Pâques berrichon","Crottin de Chavignol","Fromage de chèvre"],"LB Châteauroux (anciennement en Ligue 2)",["George Sand (Berry)"],"Industrie, agro-alimentaire","La Cité du Berry","Université de Poitiers (antenne)"),
V("Agen",4,"Nouvelle-Aquitaine","Lot-et-Garonne (47)","34 000","Garonne",["Pruneaux d'Agen","Foie gras","Confit"],"SU Agen (rugby)",["Joachim du Bellay (proche)"],"Pruneaux, agriculture, rugby","La Capitale de la Prune","Université de Bordeaux (antenne)"),
V("Laval",4,"Pays de la Loire","Mayenne (53)","50 000","Mayenne",["Andouille de Vire","Rillettes","Cidre"],"Stade Lavallois",["Henri Rousseau (dit le Douanier Rousseau)"],"Agro-alimentaire, PME","La Ville du Douanier Rousseau","Université du Maine (antenne)"),
V("Évreux",4,"Normandie","Eure (27)","50 000","Iton",["Bourdelots normands","Camembert","Calvados"],"FC Évreux 27",["Archambaud d'Évreux"],"Pharmaceutique, logistique","La Cité Normande","Université de Rouen (antenne)"),
V("Maubeuge",4,"Hauts-de-France","Nord (59)","32 000","Sambre",["Maroilles","Carbonnade","Ch'ti"],"UMA Maubeuge",["-"],"Métallurgie, automobile","La Porte du Hainaut","Université Polytechnique HdF"),
V("Chalon-sur-Saône",4,"Bourgogne-Franche-Comté","Saône-et-Loire (71)","45 000","Saône",["Volaille de Bresse","Jambon persillé","Vins de Bourgogne"],"Chalon FC",["Nicéphore Niépce (inventeur de la photographie)"],"Industrie, viticulture","La Cité de la Photo","Université de Bourgogne"),
V("Montélimar",4,"Auvergne-Rhône-Alpes","Drôme (26)","40 000","Roubion",["Nougat de Montélimar","Lavande","Olives de la Drôme"],"FC Montélimar",["-"],"Nougat, tourisme, agroalimentaire","La Cité du Nougat","Université Grenoble Alpes (antenne)"),
V("Fougères",4,"Bretagne","Ille-et-Vilaine (35)","20 000","Nançon",["Galette bretonne","Crêpe","Far breton"],"FC Fougères",["Honoré de Balzac (y a séjourné)"],"Chaussure, agroalimentaire","La Cité Médiévale","Université de Rennes (antenne)"),
V("Rodez",4,"Occitanie","Aveyron (12)","24 000","Dourdou",["Aligot","Tripoux","Estofinado","Fouace"],"Rugby Club Aveyronnais",["Pierre Soulages (peintre)"],"Agroalimentaire, services, musée Soulages","La Cité de Soulages","Institut National Universitaire Champollion"),
V("Figeac",4,"Occitanie","Lot (46)","10 000","Célé",["Noix du Lot","Rocamadour (fromage)","Cassoulet"],"SC Figeac",["-"],"Aéronautique (Ratier-Figeac), tourisme","La Cité Champollion","IUT Figeac"),
V("Saintes",4,"Nouvelle-Aquitaine","Charente-Maritime (17)","25 000","Charente",["Cognac","Pineau des Charentes","Melon charentais"],"SC Saintes",["-"],"Cognac, tourisme, agriculture","La Cité Romaine","Université de Poitiers (antenne)"),
V("Thionville",4,"Grand Est","Moselle (57)","41 000","Moselle",["Mirabelles","Quiche lorraine","Bière lorraine"],"FC Metz (proche)",["Paul-Henri Spaak (origine proche)"],"Sidérurgie, logistique, frontalier Luxembourg","La Porte du Luxembourg","Université de Lorraine"),
];


/* ═══════════════════════════════════════════════════════
   TOP 10 MONDIAL — 25 catégories (données réelles)
═══════════════════════════════════════════════════════ */
// R(id, label, emoji, difficulty 1-3, source, top10[{nm,f}])
const R=(id,lb,e,d,s,t)=>({id,lb,e,d,s,t});

const RANKINGS=[
R("pop","Pays les plus peuplés","👥",1,"ONU 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Pakistan",f:"🇵🇰"},{nm:"Nigeria",f:"🇳🇬"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Bangladesh",f:"🇧🇩"},{nm:"Éthiopie",f:"🇪🇹"},{nm:"Russie",f:"🇷🇺"},{nm:"Mexique",f:"🇲🇽"}]),

R("area","Pays les plus grands (superficie)","📐",1,"Géographie mondiale",[
  {nm:"Russie",f:"🇷🇺"},{nm:"Canada",f:"🇨🇦"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Brésil",f:"🇧🇷"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Argentine",f:"🇦🇷"},{nm:"Kazakhstan",f:"🇰🇿"},{nm:"Algérie",f:"🇩🇿"}]),

R("pib","Économies les plus riches (PIB nominal)","💰",1,"FMI 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Inde",f:"🇮🇳"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"France",f:"🇫🇷"},{nm:"Italie",f:"🇮🇹"},{nm:"Brésil",f:"🇧🇷"},{nm:"Canada",f:"🇨🇦"}]),

R("tourisme","Pays les plus visités (arrivées)","✈️",2,"OMT 2023",[
  {nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Turquie",f:"🇹🇷"},{nm:"Italie",f:"🇮🇹"},{nm:"Mexique",f:"🇲🇽"},
  {nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Grèce",f:"🇬🇷"},{nm:"Allemagne",f:"🇩🇪"}]),

R("jo24","Médailles Jeux Olympiques Paris 2024","🥇",2,"CIO 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Australie",f:"🇦🇺"},{nm:"France",f:"🇫🇷"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Pays-Bas",f:"🇳🇱"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Italie",f:"🇮🇹"},{nm:"Allemagne",f:"🇩🇪"}]),

R("bonheur","Pays les plus heureux","😊",2,"World Happiness Report 2024",[
  {nm:"Finlande",f:"🇫🇮"},{nm:"Danemark",f:"🇩🇰"},{nm:"Islande",f:"🇮🇸"},
  {nm:"Suède",f:"🇸🇪"},{nm:"Israël",f:"🇮🇱"},{nm:"Pays-Bas",f:"🇳🇱"},
  {nm:"Norvège",f:"🇳🇴"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"Suisse",f:"🇨🇭"},{nm:"Australie",f:"🇦🇺"}]),

R("propres","Pays les moins corrompus","🧼",2,"Transparency International 2023",[
  {nm:"Danemark",f:"🇩🇰"},{nm:"Finlande",f:"🇫🇮"},{nm:"Nouvelle-Zélande",f:"🇳🇿"},
  {nm:"Norvège",f:"🇳🇴"},{nm:"Singapour",f:"🇸🇬"},{nm:"Suède",f:"🇸🇪"},
  {nm:"Suisse",f:"🇨🇭"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"Allemagne",f:"🇩🇪"}]),

R("co2","Pays les plus polluants (CO₂)","🏭",2,"Global Carbon Project 2023",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Japon",f:"🇯🇵"},{nm:"Iran",f:"🇮🇷"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Canada",f:"🇨🇦"},{nm:"Allemagne",f:"🇩🇪"}]),

R("milliardaires","Pays avec le plus de milliardaires","💎",2,"Forbes 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Russie",f:"🇷🇺"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Suisse",f:"🇨🇭"},{nm:"Brésil",f:"🇧🇷"},{nm:"Australie",f:"🇦🇺"}]),

R("alcool","Pays qui boivent le plus d'alcool (par hab.)","🍺",3,"OMS 2023",[
  {nm:"Moldavie",f:"🇲🇩"},{nm:"Lituanie",f:"🇱🇹"},{nm:"Tchéquie",f:"🇨🇿"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"Irlande",f:"🇮🇪"},
  {nm:"Lettonie",f:"🇱🇻"},{nm:"Bulgarie",f:"🇧🇬"},{nm:"Roumanie",f:"🇷🇴"},{nm:"Slovénie",f:"🇸🇮"}]),

R("salaires","Pays avec les salaires moyens les plus élevés","💼",2,"OCDE 2023",[
  {nm:"Suisse",f:"🇨🇭"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Islande",f:"🇮🇸"},{nm:"Danemark",f:"🇩🇰"},{nm:"Norvège",f:"🇳🇴"},
  {nm:"Belgique",f:"🇧🇪"},{nm:"Australie",f:"🇦🇺"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Autriche",f:"🇦🇹"}]),

R("securite","Pays les plus sûrs","🕊️",2,"Global Peace Index 2024",[
  {nm:"Islande",f:"🇮🇸"},{nm:"Irlande",f:"🇮🇪"},{nm:"Autriche",f:"🇦🇹"},
  {nm:"Nouvelle-Zélande",f:"🇳🇿"},{nm:"Singapour",f:"🇸🇬"},{nm:"Portugal",f:"🇵🇹"},
  {nm:"Danemark",f:"🇩🇰"},{nm:"Slovénie",f:"🇸🇮"},{nm:"Malaisie",f:"🇲🇾"},{nm:"Canada",f:"🇨🇦"}]),

R("dangereux","Pays les plus dangereux","⚠️",2,"Global Peace Index 2024",[
  {nm:"Yémen",f:"🇾🇪"},{nm:"Soudan du Sud",f:"🇸🇸"},{nm:"Soudan",f:"🇸🇩"},
  {nm:"Syrie",f:"🇸🇾"},{nm:"Russie",f:"🇷🇺"},{nm:"Somalie",f:"🇸🇴"},
  {nm:"Libye",f:"🇱🇾"},{nm:"République du Congo",f:"🇨🇩"},{nm:"Centrafrique",f:"🇨🇫"},{nm:"Irak",f:"🇮🇶"}]),

R("passeport","Passeports les plus puissants","🛂",2,"Henley Passport Index 2024",[
  {nm:"Singapour",f:"🇸🇬"},{nm:"France",f:"🇫🇷"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Espagne",f:"🇪🇸"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Autriche",f:"🇦🇹"},{nm:"Finlande",f:"🇫🇮"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Suède",f:"🇸🇪"}]),

R("volcans","Pays avec le plus de volcans","🌋",3,"Smithsonian GVP",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Russie",f:"🇷🇺"},{nm:"Indonésie",f:"🇮🇩"},
  {nm:"Islande",f:"🇮🇸"},{nm:"Japon",f:"🇯🇵"},{nm:"Chili",f:"🇨🇱"},
  {nm:"Éthiopie",f:"🇪🇹"},{nm:"Papouasie-Nouvelle-Guinée",f:"🇵🇬"},{nm:"Philippines",f:"🇵🇭"},{nm:"Mexique",f:"🇲🇽"}]),

R("mcdo","Pays avec le plus de McDonald's","🍔",2,"McDonald's Corp. 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Canada",f:"🇨🇦"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Australie",f:"🇦🇺"},{nm:"Brésil",f:"🇧🇷"},{nm:"Corée du Sud",f:"🇰🇷"}]),

R("starbucks","Pays avec le plus de Starbucks","☕",2,"Starbucks Corp. 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Canada",f:"🇨🇦"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Turquie",f:"🇹🇷"},{nm:"Mexique",f:"🇲🇽"},{nm:"Taïwan",f:"🇹🇼"},{nm:"Thaïlande",f:"🇹🇭"}]),

R("internet","Vitesse internet fixe la plus rapide","⚡",3,"Ookla Speedtest 2024",[
  {nm:"Singapour",f:"🇸🇬"},{nm:"Chine",f:"🇨🇳"},{nm:"Chili",f:"🇨🇱"},
  {nm:"Roumanie",f:"🇷🇴"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"France",f:"🇫🇷"},
  {nm:"Espagne",f:"🇪🇸"},{nm:"Danemark",f:"🇩🇰"},{nm:"Hongrie",f:"🇭🇺"},{nm:"Corée du Sud",f:"🇰🇷"}]),

R("grands","Pays avec les gens les plus grands (taille moyenne)","📏",3,"NCD RisC",[
  {nm:"Monténégro",f:"🇲🇪"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Danemark",f:"🇩🇰"},
  {nm:"Islande",f:"🇮🇸"},{nm:"Norvège",f:"🇳🇴"},{nm:"Serbie",f:"🇷🇸"},
  {nm:"Croatie",f:"🇭🇷"},{nm:"Finlande",f:"🇫🇮"},{nm:"Suède",f:"🇸🇪"},{nm:"Lettonie",f:"🇱🇻"}]),

R("travail","Pays qui travaillent le plus (heures/an)","⏰",3,"OCDE 2023",[
  {nm:"Mexique",f:"🇲🇽"},{nm:"Costa Rica",f:"🇨🇷"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Grèce",f:"🇬🇷"},{nm:"Chili",f:"🇨🇱"},
  {nm:"Israël",f:"🇮🇱"},{nm:"Pologne",f:"🇵🇱"},{nm:"Lettonie",f:"🇱🇻"},{nm:"États-Unis",f:"🇺🇸"}]),

R("petrole","Pays produisant le plus de pétrole","🛢️",2,"AIE 2023",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Irak",f:"🇮🇶"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Émirats arabes unis",f:"🇦🇪"},{nm:"Brésil",f:"🇧🇷"},{nm:"Iran",f:"🇮🇷"},{nm:"Koweït",f:"🇰🇼"}]),

R("froid","Pays les plus froids (température moyenne)","🥶",3,"World Meteorological Org.",[
  {nm:"Russie",f:"🇷🇺"},{nm:"Canada",f:"🇨🇦"},{nm:"Mongolie",f:"🇲🇳"},
  {nm:"Islande",f:"🇮🇸"},{nm:"Finlande",f:"🇫🇮"},{nm:"Norvège",f:"🇳🇴"},
  {nm:"Estonie",f:"🇪🇪"},{nm:"Lettonie",f:"🇱🇻"},{nm:"Suède",f:"🇸🇪"},{nm:"Biélorussie",f:"🇧🇾"}]),

R("football","Pays avec le plus de footballeurs professionnels","⚽",3,"CIES Football Observatory 2024",[
  {nm:"Brésil",f:"🇧🇷"},{nm:"Argentine",f:"🇦🇷"},{nm:"France",f:"🇫🇷"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Espagne",f:"🇪🇸"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Portugal",f:"🇵🇹"},{nm:"Colombie",f:"🇨🇴"},{nm:"Nigeria",f:"🇳🇬"},{nm:"Ghana",f:"🇬🇭"}]),

R("nobel","Pays avec le plus de prix Nobel","🏆",3,"Nobel Foundation 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Suède",f:"🇸🇪"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Suisse",f:"🇨🇭"},{nm:"Japon",f:"🇯🇵"},{nm:"Canada",f:"🇨🇦"},{nm:"Pays-Bas",f:"🇳🇱"}]),

R("passport_soft","Pays les moins stricts aux visas (accueil)","🔓",3,"Migration Policy Institute",[
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Suède",f:"🇸🇪"},{nm:"Canada",f:"🇨🇦"},
  {nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},{nm:"Portugal",f:"🇵🇹"},
  {nm:"Irlande",f:"🇮🇪"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Belgique",f:"🇧🇪"},{nm:"Autriche",f:"🇦🇹"}]),

/* ── ÉCONOMIE & FINANCES ── */
R("pib_hab","PIB par habitant le plus élevé","💵",2,"FMI 2024",[
  {nm:"Luxembourg",f:"🇱🇺"},{nm:"Singapour",f:"🇸🇬"},{nm:"Suisse",f:"🇨🇭"},
  {nm:"Norvège",f:"🇳🇴"},{nm:"Irlande",f:"🇮🇪"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Islande",f:"🇮🇸"},{nm:"Danemark",f:"🇩🇰"},{nm:"Australie",f:"🇦🇺"},{nm:"Pays-Bas",f:"🇳🇱"}]),

R("inflation","Pays avec l'inflation la plus forte","📈",3,"FMI 2023",[
  {nm:"Zimbabwe",f:"🇿🇼"},{nm:"Venezuela",f:"🇻🇪"},{nm:"Liban",f:"🇱🇧"},
  {nm:"Syrie",f:"🇸🇾"},{nm:"Soudan",f:"🇸🇩"},{nm:"Turquie",f:"🇹🇷"},
  {nm:"Argentine",f:"🇦🇷"},{nm:"Éthiopie",f:"🇪🇹"},{nm:"Ghana",f:"🇬🇭"},{nm:"Iran",f:"🇮🇷"}]),

R("tourisme_recettes","Pays avec le plus de recettes touristiques","🤑",2,"OMT 2023",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Espagne",f:"🇪🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"France",f:"🇫🇷"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Turquie",f:"🇹🇷"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Émirats arabes unis",f:"🇦🇪"},{nm:"Italie",f:"🇮🇹"},{nm:"Autriche",f:"🇦🇹"}]),

R("reserves","Pays avec les plus grandes réserves de change","🏦",3,"FMI / Banque Mondiale 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Japon",f:"🇯🇵"},{nm:"Suisse",f:"🇨🇭"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Russie",f:"🇷🇺"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Singapour",f:"🇸🇬"},{nm:"Brésil",f:"🇧🇷"},{nm:"Hong Kong",f:"🇭🇰"}]),

R("smic","Pays avec le salaire minimum le plus élevé","💸",2,"OCDE 2024",[
  {nm:"Australie",f:"🇦🇺"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"Belgique",f:"🇧🇪"},
  {nm:"Pays-Bas",f:"🇳🇱"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Nouvelle-Zélande",f:"🇳🇿"},
  {nm:"France",f:"🇫🇷"},{nm:"Irlande",f:"🇮🇪"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Canada",f:"🇨🇦"}]),

R("impots","Pays avec la fiscalité la plus lourde (taux marginal)","🏛️",3,"OCDE 2023",[
  {nm:"Finlande",f:"🇫🇮"},{nm:"Danemark",f:"🇩🇰"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Autriche",f:"🇦🇹"},{nm:"Suède",f:"🇸🇪"},{nm:"Belgique",f:"🇧🇪"},
  {nm:"Israël",f:"🇮🇱"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"France",f:"🇫🇷"},{nm:"Allemagne",f:"🇩🇪"}]),

R("licorne","Pays avec le plus de start-ups licornes","🦄",3,"CB Insights 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"},
  {nm:"Israël",f:"🇮🇱"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Singapour",f:"🇸🇬"},{nm:"Brésil",f:"🇧🇷"}]),

R("or","Pays avec les plus grandes réserves d'or","🥇",3,"World Gold Council 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Italie",f:"🇮🇹"},
  {nm:"France",f:"🇫🇷"},{nm:"Russie",f:"🇷🇺"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Suisse",f:"🇨🇭"},{nm:"Japon",f:"🇯🇵"},{nm:"Inde",f:"🇮🇳"},{nm:"Pays-Bas",f:"🇳🇱"}]),

R("ecommerce","Pays avec le plus de ventes e-commerce","🛒",2,"eMarketer 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Inde",f:"🇮🇳"},{nm:"Canada",f:"🇨🇦"},{nm:"Australie",f:"🇦🇺"}]),

/* ── TECHNOLOGIE & NUMÉRIQUE ── */
R("smartphones","Pays avec le plus d'utilisateurs de smartphones","📱",2,"Statista 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Mexique",f:"🇲🇽"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Bangladesh",f:"🇧🇩"}]),

R("youtube","Pays avec le plus d'utilisateurs YouTube","▶️",2,"Statista 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Mexique",f:"🇲🇽"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Pakistan",f:"🇵🇰"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Turquie",f:"🇹🇷"}]),

R("tiktok","Pays avec le plus d'utilisateurs TikTok","🎵",2,"Statista 2024",[
  {nm:"Indonésie",f:"🇮🇩"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Vietnam",f:"🇻🇳"},{nm:"Philippines",f:"🇵🇭"},
  {nm:"Thaïlande",f:"🇹🇭"},{nm:"Turquie",f:"🇹🇷"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Pakistan",f:"🇵🇰"}]),

R("instagram","Pays avec le plus d'utilisateurs Instagram","📸",2,"Statista 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Turquie",f:"🇹🇷"},{nm:"Mexique",f:"🇲🇽"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Argentine",f:"🇦🇷"},{nm:"Russie",f:"🇷🇺"}]),

R("cyberattaques","Pays ciblés par le plus de cyberattaques","💻",3,"Check Point 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Ukraine",f:"🇺🇦"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Israël",f:"🇮🇱"},{nm:"Japon",f:"🇯🇵"},{nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"}]),

R("ia_publications","Pays avec le plus de publications sur l'IA","🤖",3,"Stanford AI Index 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"France",f:"🇫🇷"},{nm:"Japon",f:"🇯🇵"},{nm:"Australie",f:"🇦🇺"},{nm:"Canada",f:"🇨🇦"}]),

R("fibre","Pays avec le plus de couverture fibre optique","🌐",3,"OCDE Broadband 2024",[
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Japon",f:"🇯🇵"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"Portugal",f:"🇵🇹"},{nm:"Chine",f:"🇨🇳"},{nm:"Suède",f:"🇸🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Danemark",f:"🇩🇰"},{nm:"Singapour",f:"🇸🇬"},{nm:"Finlande",f:"🇫🇮"}]),

/* ── ENVIRONNEMENT & NATURE ── */
R("energies_renouv","Pays avec le plus d'énergies renouvelables (%)","🌱",2,"IEA 2024",[
  {nm:"Islande",f:"🇮🇸"},{nm:"Norvège",f:"🇳🇴"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Nouvelle-Zélande",f:"🇳🇿"},{nm:"Danemark",f:"🇩🇰"},{nm:"Suède",f:"🇸🇪"},
  {nm:"Autriche",f:"🇦🇹"},{nm:"Portugal",f:"🇵🇹"},{nm:"Costa Rica",f:"🇨🇷"},{nm:"Éthiopie",f:"🇪🇹"}]),

R("forets","Pays avec le plus de forêts (superficie)","🌳",2,"FAO 2024",[
  {nm:"Russie",f:"🇷🇺"},{nm:"Brésil",f:"🇧🇷"},{nm:"Canada",f:"🇨🇦"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Australie",f:"🇦🇺"},
  {nm:"République du Congo",f:"🇨🇩"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Pérou",f:"🇵🇪"},{nm:"Inde",f:"🇮🇳"}]),

R("dechets","Pays qui produisent le plus de déchets par habitant","🗑️",3,"Banque Mondiale 2024",[
  {nm:"Canada",f:"🇨🇦"},{nm:"Bulgarie",f:"🇧🇬"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Estonie",f:"🇪🇪"},{nm:"Finlande",f:"🇫🇮"},{nm:"Chypre",f:"🇨🇾"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Lettonie",f:"🇱🇻"},{nm:"Suisse",f:"🇨🇭"},{nm:"Danemark",f:"🇩🇰"}]),

R("biodiversite","Pays les plus riches en biodiversité","🦜",2,"IUCN / Index de Biodiversité 2024",[
  {nm:"Brésil",f:"🇧🇷"},{nm:"Colombie",f:"🇨🇴"},{nm:"Indonésie",f:"🇮🇩"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Mexique",f:"🇲🇽"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Madagascar",f:"🇲🇬"},{nm:"Pérou",f:"🇵🇪"},{nm:"Congo",f:"🇨🇬"},{nm:"Inde",f:"🇮🇳"}]),

R("nucleaire","Pays avec le plus de centrales nucléaires","⚛️",3,"AIEA 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Ukraine",f:"🇺🇦"},{nm:"Japon",f:"🇯🇵"},{nm:"Royaume-Uni",f:"🇬🇧"}]),

R("seismes","Pays avec le plus de séismes","🌍",3,"USGS Earthquake Hazards",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Iran",f:"🇮🇷"},
  {nm:"Turquie",f:"🇹🇷"},{nm:"Japon",f:"🇯🇵"},{nm:"Pérou",f:"🇵🇪"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Italie",f:"🇮🇹"},{nm:"Mexique",f:"🇲🇽"},{nm:"Pakistan",f:"🇵🇰"}]),

R("eau_douce","Pays avec le plus de ressources en eau douce","💧",2,"FAO AQUASTAT 2024",[
  {nm:"Brésil",f:"🇧🇷"},{nm:"Russie",f:"🇷🇺"},{nm:"Canada",f:"🇨🇦"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Colombie",f:"🇨🇴"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Pérou",f:"🇵🇪"},{nm:"Inde",f:"🇮🇳"},{nm:"Venezuela",f:"🇻🇪"}]),

/* ── SPORT ── */
R("fifa","Pays les mieux classés au classement FIFA","⚽",2,"FIFA World Ranking 2024",[
  {nm:"Argentine",f:"🇦🇷"},{nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"Angleterre",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},{nm:"Brésil",f:"🇧🇷"},{nm:"Portugal",f:"🇵🇹"},
  {nm:"Belgique",f:"🇧🇪"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Croatie",f:"🇭🇷"}]),

R("jo_all_time","Pays avec le plus de médailles olympiques (historique)","🏅",2,"CIO 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Russie",f:"🇷🇺"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"France",f:"🇫🇷"},{nm:"Italie",f:"🇮🇹"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Australie",f:"🇦🇺"},{nm:"Hongrie",f:"🇭🇺"},{nm:"Suède",f:"🇸🇪"}]),

R("marathon","Pays avec le plus de victoires en marathon olympique","🏃",3,"World Athletics 2024",[
  {nm:"Éthiopie",f:"🇪🇹"},{nm:"Kenya",f:"🇰🇪"},{nm:"Japon",f:"🇯🇵"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"},{nm:"Belgique",f:"🇧🇪"},
  {nm:"Argentine",f:"🇦🇷"},{nm:"Finlande",f:"🇫🇮"},{nm:"Portugal",f:"🇵🇹"},{nm:"Corée du Sud",f:"🇰🇷"}]),

R("tennis_atp","Pays avec le plus de top 100 tennismen ATP","🎾",3,"ATP 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"Argentine",f:"🇦🇷"},{nm:"Australie",f:"🇦🇺"},{nm:"Italie",f:"🇮🇹"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Serbie",f:"🇷🇸"},{nm:"Canada",f:"🇨🇦"},{nm:"Russie",f:"🇷🇺"}]),

R("natation","Pays avec le plus de titres olympiques en natation","🏊",3,"FINA / World Aquatics",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Australie",f:"🇦🇺"},{nm:"Hongrie",f:"🇭🇺"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Japon",f:"🇯🇵"},{nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"}]),

R("esport","Pays avec le plus de gains en e-sport","🎮",3,"Esports Earnings 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"Danemark",f:"🇩🇰"},{nm:"Canada",f:"🇨🇦"},{nm:"Suède",f:"🇸🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Finlande",f:"🇫🇮"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Russie",f:"🇷🇺"}]),

R("rugby_classement","Pays les mieux classés au rugby (World Rugby)","🏉",3,"World Rugby 2024",[
  {nm:"Irlande",f:"🇮🇪"},{nm:"Afrique du Sud",f:"🇿🇦"},{nm:"France",f:"🇫🇷"},
  {nm:"Nouvelle-Zélande",f:"🇳🇿"},{nm:"Argentine",f:"🇦🇷"},{nm:"Angleterre",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {nm:"Écosse",f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿"},{nm:"Australie",f:"🇦🇺"},{nm:"Géorgie",f:"🇬🇪"},{nm:"Japon",f:"🇯🇵"}]),

R("cyclisme_victoires","Pays avec le plus de victoires au Tour de France","🚴",3,"Tour de France Historic Data",[
  {nm:"France",f:"🇫🇷"},{nm:"Belgique",f:"🇧🇪"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Italie",f:"🇮🇹"},{nm:"Luxembourg",f:"🇱🇺"},
  {nm:"Pays-Bas",f:"🇳🇱"},{nm:"Danemark",f:"🇩🇰"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Slovénie",f:"🇸🇮"}]),

/* ── SANTÉ & SOCIÉTÉ ── */
R("esperance","Pays avec l'espérance de vie la plus élevée","👴",1,"OMS 2024",[
  {nm:"Japon",f:"🇯🇵"},{nm:"Suisse",f:"🇨🇭"},{nm:"Singapour",f:"🇸🇬"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Espagne",f:"🇪🇸"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Israël",f:"🇮🇱"},{nm:"Suède",f:"🇸🇪"},{nm:"Norvège",f:"🇳🇴"}]),

R("obesite","Pays avec le plus fort taux d'obésité","🍔",2,"OMS 2024",[
  {nm:"Nauru",f:"🇳🇷"},{nm:"Palaos",f:"🇵🇼"},{nm:"Îles Marshall",f:"🇲🇭"},
  {nm:"Tuvalu",f:"🇹🇻"},{nm:"Niue",f:"🇳🇺"},{nm:"Tonga",f:"🇹🇴"},
  {nm:"Samoa",f:"🇼🇸"},{nm:"Kiribati",f:"🇰🇮"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Koweït",f:"🇰🇼"}]),

R("medecins","Pays avec le plus de médecins par habitant","🩺",2,"OMS 2024",[
  {nm:"Cuba",f:"🇨🇺"},{nm:"Monaco",f:"🇲🇨"},{nm:"Géorgie",f:"🇬🇪"},
  {nm:"Grèce",f:"🇬🇷"},{nm:"Russie",f:"🇷🇺"},{nm:"Portugal",f:"🇵🇹"},
  {nm:"Autriche",f:"🇦🇹"},{nm:"Suède",f:"🇸🇪"},{nm:"Lituanie",f:"🇱🇹"},{nm:"Suisse",f:"🇨🇭"}]),

R("alcool_absolu","Pays totalement interdits d'alcool","🚫",3,"OMS / Données nationales",[
  {nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Iran",f:"🇮🇷"},{nm:"Koweït",f:"🇰🇼"},
  {nm:"Libye",f:"🇱🇾"},{nm:"Mauritanie",f:"🇲🇷"},{nm:"Somalie",f:"🇸🇴"},
  {nm:"Yémen",f:"🇾🇪"},{nm:"Bangladesh",f:"🇧🇩"},{nm:"Brunei",f:"🇧🇳"},{nm:"Afghanistan",f:"🇦🇫"}]),

R("suicide","Pays avec le plus de suicides (taux)","🏥",3,"OMS 2023",[
  {nm:"Lituanie",f:"🇱🇹"},{nm:"Russie",f:"🇷🇺"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"Belarus",f:"🇧🇾"},{nm:"Lettonie",f:"🇱🇻"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Hongrie",f:"🇭🇺"},{nm:"Belgique",f:"🇧🇪"},{nm:"Finlande",f:"🇫🇮"},{nm:"Ukraine",f:"🇺🇦"}]),

R("tabac","Pays où l'on fume le plus","🚬",2,"OMS Tobacco Report 2024",[
  {nm:"Kiribati",f:"🇰🇮"},{nm:"Nauru",f:"🇳🇷"},{nm:"Grèce",f:"🇬🇷"},
  {nm:"Tunisie",f:"🇹🇳"},{nm:"Jordanie",f:"🇯🇴"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Bulgarie",f:"🇧🇬"},{nm:"Turquie",f:"🇹🇷"},{nm:"Indonésie",f:"🇮🇩"}]),

R("divorce","Pays avec le plus de divorces (taux)","💔",2,"ONU 2023",[
  {nm:"Maldives",f:"🇲🇻"},{nm:"Russie",f:"🇷🇺"},{nm:"Bélarus",f:"🇧🇾"},
  {nm:"Lettonie",f:"🇱🇻"},{nm:"Lituanie",f:"🇱🇹"},{nm:"Cuba",f:"🇨🇺"},
  {nm:"Belgique",f:"🇧🇪"},{nm:"Portugal",f:"🇵🇹"},{nm:"Finlande",f:"🇫🇮"},{nm:"Luxembourg",f:"🇱🇺"}]),

R("natalite","Pays avec le taux de natalité le plus élevé","👶",2,"ONU 2024",[
  {nm:"Niger",f:"🇳🇪"},{nm:"Mali",f:"🇲🇱"},{nm:"Tchad",f:"🇹🇩"},
  {nm:"Angola",f:"🇦🇴"},{nm:"Nigeria",f:"🇳🇬"},{nm:"Burkina Faso",f:"🇧🇫"},
  {nm:"Guinée",f:"🇬🇳"},{nm:"Uganda",f:"🇺🇬"},{nm:"Somalie",f:"🇸🇴"},{nm:"RDC",f:"🇨🇩"}]),

R("immigration","Pays accueillant le plus d'immigrés","🌐",2,"ONU DESA 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Arabie saoudite",f:"🇸🇦"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Émirats arabes unis",f:"🇦🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"},{nm:"Australie",f:"🇦🇺"},{nm:"Espagne",f:"🇪🇸"}]),

R("prison","Pays avec le plus grand nombre de prisonniers (taux)","🔒",2,"Prison Policy Initiative 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"El Salvador",f:"🇸🇻"},{nm:"Turkménistan",f:"🇹🇲"},
  {nm:"Cuba",f:"🇨🇺"},{nm:"Russie",f:"🇷🇺"},{nm:"Panama",f:"🇵🇦"},
  {nm:"Rwanda",f:"🇷🇼"},{nm:"Palau",f:"🇵🇼"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Costa Rica",f:"🇨🇷"}]),

/* ── CULTURE & SOCIÉTÉ ── */
R("cinema","Pays produisant le plus de films","🎬",2,"UNESCO 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Nigeria",f:"🇳🇬"},{nm:"Japon",f:"🇯🇵"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},{nm:"Italie",f:"🇮🇹"},{nm:"Royaume-Uni",f:"🇬🇧"}]),

R("langues","Pays avec le plus de langues officielles","🗣️",3,"Ethnologue 2024",[
  {nm:"Zimbabwe",f:"🇿🇼"},{nm:"Afrique du Sud",f:"🇿🇦"},{nm:"Bolivie",f:"🇧🇴"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Singapour",f:"🇸🇬"},{nm:"Suisse",f:"🇨🇭"},
  {nm:"Belgique",f:"🇧🇪"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"Canada",f:"🇨🇦"},{nm:"Finlande",f:"🇫🇮"}]),

R("langues_totales","Pays avec le plus de langues parlées (total)","🌐",3,"Ethnologue 2024",[
  {nm:"Papouasie-Nouvelle-Guinée",f:"🇵🇬"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Nigeria",f:"🇳🇬"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Cameroun",f:"🇨🇲"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Chine",f:"🇨🇳"},{nm:"République du Congo",f:"🇨🇩"},{nm:"Brésil",f:"🇧🇷"}]),

R("musees","Pays avec le plus de musées","🏛️",2,"UNESCO 2024",[
  {nm:"Allemagne",f:"🇩🇪"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"France",f:"🇫🇷"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Espagne",f:"🇪🇸"},{nm:"Japon",f:"🇯🇵"},{nm:"Mexique",f:"🇲🇽"}]),

R("livres","Pays qui lisent le plus (heures/semaine)","📚",3,"NOP World Culture Score",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Philippines",f:"🇵🇭"},{nm:"Égypte",f:"🇪🇬"},{nm:"Tchéquie",f:"🇨🇿"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Suède",f:"🇸🇪"},{nm:"France",f:"🇫🇷"},{nm:"Hongrie",f:"🇭🇺"}]),

R("restaurants_michelin","Pays avec le plus d'étoiles Michelin","🌟",2,"Guide Michelin 2024",[
  {nm:"Japon",f:"🇯🇵"},{nm:"France",f:"🇫🇷"},{nm:"Italie",f:"🇮🇹"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Espagne",f:"🇪🇸"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Belgique",f:"🇧🇪"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Suisse",f:"🇨🇭"}]),

R("biere","Pays brassant le plus de bière","🍺",2,"Kirin Institute 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Pologne",f:"🇵🇱"},{nm:"Espagne",f:"🇪🇸"},{nm:"Japon",f:"🇯🇵"}]),

R("vin","Pays produisant le plus de vin","🍷",2,"Organisation Internationale de la Vigne 2024",[
  {nm:"Italie",f:"🇮🇹"},{nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Argentine",f:"🇦🇷"},{nm:"Chili",f:"🇨🇱"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Afrique du Sud",f:"🇿🇦"},{nm:"Chine",f:"🇨🇳"},{nm:"Allemagne",f:"🇩🇪"}]),

R("cafe","Pays consommant le plus de café par habitant","☕",2,"ICO 2024",[
  {nm:"Finlande",f:"🇫🇮"},{nm:"Norvège",f:"🇳🇴"},{nm:"Islande",f:"🇮🇸"},
  {nm:"Danemark",f:"🇩🇰"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Suède",f:"🇸🇪"},
  {nm:"Suisse",f:"🇨🇭"},{nm:"Belgique",f:"🇧🇪"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"Canada",f:"🇨🇦"}]),

R("chocolat","Pays consommant le plus de chocolat par habitant","🍫",3,"World Cocoa Foundation 2024",[
  {nm:"Suisse",f:"🇨🇭"},{nm:"Autriche",f:"🇦🇹"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Belgique",f:"🇧🇪"},{nm:"Norvège",f:"🇳🇴"},
  {nm:"Irlande",f:"🇮🇪"},{nm:"Suède",f:"🇸🇪"},{nm:"Finlande",f:"🇫🇮"},{nm:"Pays-Bas",f:"🇳🇱"}]),

R("fast_food","Pays avec le plus de chaînes de fast-food","🍟",2,"Statista 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Inde",f:"🇮🇳"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"France",f:"🇫🇷"},{nm:"Australie",f:"🇦🇺"},{nm:"Mexique",f:"🇲🇽"}]),

/* ── MILITAIRE & GÉOPOLITIQUE ── */
R("armee","Pays avec les armées les plus puissantes","⚔️",2,"Global Firepower Index 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Russie",f:"🇷🇺"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"Pakistan",f:"🇵🇰"},{nm:"France",f:"🇫🇷"},{nm:"Italie",f:"🇮🇹"},{nm:"Japon",f:"🇯🇵"}]),

R("budget_militaire","Pays dépensant le plus pour leur armée","🪖",2,"SIPRI 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Japon",f:"🇯🇵"}]),

R("armes_exportations","Principaux exportateurs d'armes","🔫",3,"SIPRI 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Espagne",f:"🇪🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Pays-Bas",f:"🇳🇱"}]),

R("soldats","Pays avec les plus grandes armées actives","👮",2,"Global Firepower 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Corée du Nord",f:"🇰🇵"},{nm:"Russie",f:"🇷🇺"},{nm:"Pakistan",f:"🇵🇰"},
  {nm:"Iran",f:"🇮🇷"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Vietnam",f:"🇻🇳"},{nm:"Égypte",f:"🇪🇬"}]),

/* ── ÉDUCATION & SCIENCE ── */
R("education","Pays avec les meilleurs systèmes éducatifs (PISA)","📐",2,"OCDE PISA 2023",[
  {nm:"Singapour",f:"🇸🇬"},{nm:"Japon",f:"🇯🇵"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"Taïwan",f:"🇹🇼"},{nm:"Macao",f:"🇲🇴"},{nm:"Estonie",f:"🇪🇪"},
  {nm:"Suisse",f:"🇨🇭"},{nm:"Canada",f:"🇨🇦"},{nm:"Chine",f:"🇨🇳"},{nm:"Finlande",f:"🇫🇮"}]),

R("universites","Pays avec le plus d'universités classées (QS Top 500)","🎓",2,"QS Rankings 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Japon",f:"🇯🇵"},
  {nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"},{nm:"Italie",f:"🇮🇹"},{nm:"Corée du Sud",f:"🇰🇷"}]),

R("brevets","Pays déposant le plus de brevets","💡",3,"OMPI 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"},
  {nm:"Suisse",f:"🇨🇭"},{nm:"Suède",f:"🇸🇪"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Royaume-Uni",f:"🇬🇧"}]),

/* ── TRANSPORTS & INFRASTRUCTURE ── */
R("voitures","Pays avec le plus de voitures (parc automobile)","🚗",2,"OICA 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Russie",f:"🇷🇺"},{nm:"Italie",f:"🇮🇹"},
  {nm:"France",f:"🇫🇷"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Brésil",f:"🇧🇷"},{nm:"Espagne",f:"🇪🇸"}]),

R("electrique","Pays avec le plus de voitures électriques","🔋",2,"IEA EV Outlook 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"France",f:"🇫🇷"},{nm:"Norvège",f:"🇳🇴"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Australie",f:"🇦🇺"},{nm:"Suède",f:"🇸🇪"}]),

R("train","Pays avec le plus long réseau ferroviaire","🚄",2,"UIC 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Canada",f:"🇨🇦"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Argentine",f:"🇦🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Brésil",f:"🇧🇷"},{nm:"France",f:"🇫🇷"}]),

R("aeroports","Pays avec le plus de passagers aériens","✈️",2,"IATA 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Espagne",f:"🇪🇸"},{nm:"Émirats arabes unis",f:"🇦🇪"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Turquie",f:"🇹🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"}]),

R("metro","Pays avec le réseau de métro le plus fréquenté","🚇",3,"UITP 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Japon",f:"🇯🇵"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Inde",f:"🇮🇳"},{nm:"France",f:"🇫🇷"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Mexique",f:"🇲🇽"}]),

/* ── AMUSANTS & INSOLITES ── */
R("chats","Pays avec le plus de chats domestiques","🐱",2,"Statista 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"France",f:"🇫🇷"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Japon",f:"🇯🇵"},{nm:"Ukraine",f:"🇺🇦"}]),

R("chiens","Pays avec le plus de chiens domestiques","🐶",2,"Statista 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Argentine",f:"🇦🇷"},{nm:"Inde",f:"🇮🇳"},
  {nm:"France",f:"🇫🇷"},{nm:"Mexique",f:"🇲🇽"},{nm:"Japon",f:"🇯🇵"},{nm:"Thaïlande",f:"🇹🇭"}]),

R("sommeil","Pays qui dorment le plus","😴",3,"Fitbit / Sleep Cycle 2024",[
  {nm:"Finlande",f:"🇫🇮"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Belgique",f:"🇧🇪"},{nm:"Australie",f:"🇦🇺"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Nouvelle-Zélande",f:"🇳🇿"},{nm:"Danemark",f:"🇩🇰"},{nm:"Suède",f:"🇸🇪"}]),

R("couverts","Pays avec le coût de la vie le plus élevé","🛍️",2,"Numbeo 2024",[
  {nm:"Bermudes",f:"🇧🇲"},{nm:"Suisse",f:"🇨🇭"},{nm:"Îles Caïmans",f:"🇰🇾"},
  {nm:"Norvège",f:"🇳🇴"},{nm:"Islande",f:"🇮🇸"},{nm:"Bahamas",f:"🇧🇸"},
  {nm:"Singapour",f:"🇸🇬"},{nm:"Danemark",f:"🇩🇰"},{nm:"Barbade",f:"🇧🇧"},{nm:"Japon",f:"🇯🇵"}]),

R("tatouages","Pays avec le plus grand pourcentage de personnes tatouées","🎨",3,"Dalia Research 2024",[
  {nm:"Suède",f:"🇸🇪"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"France",f:"🇫🇷"},
  {nm:"Espagne",f:"🇪🇸"},{nm:"Danemark",f:"🇩🇰"},{nm:"Brésil",f:"🇧🇷"},{nm:"Allemagne",f:"🇩🇪"}]),

R("selfies","Pays où l'on prend le plus de selfies","🤳",3,"Prism / Instagram Geo-data 2024",[
  {nm:"Philippines",f:"🇵🇭"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Inde",f:"🇮🇳"},{nm:"Mexique",f:"🇲🇽"},
  {nm:"Turquie",f:"🇹🇷"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Espagne",f:"🇪🇸"},{nm:"Brésil",f:"🇧🇷"}]),

R("pizzas","Pays consommant le plus de pizza par habitant","🍕",3,"USDA / Euromonitor 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Norvège",f:"🇳🇴"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Brésil",f:"🇧🇷"},{nm:"Japon",f:"🇯🇵"},{nm:"Italie",f:"🇮🇹"}]),

R("longevite_mariage","Pays avec le plus faible taux de divorce","💍",3,"ONU 2023",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Sri Lanka",f:"🇱🇰"},{nm:"Vietnam",f:"🇻🇳"},
  {nm:"Géorgie",f:"🇬🇪"},{nm:"Arménie",f:"🇦🇲"},{nm:"Chili",f:"🇨🇱"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Maroc",f:"🇲🇦"},{nm:"Colombie",f:"🇨🇴"},{nm:"Pérou",f:"🇵🇪"}]),

R("pluie","Pays les plus pluvieux (précipitations annuelles)","🌧️",3,"World Meteorological Organization",[
  {nm:"Colombie",f:"🇨🇴"},{nm:"São Tomé-et-Príncipe",f:"🇸🇹"},{nm:"Papouasie-Nouvelle-Guinée",f:"🇵🇬"},
  {nm:"Îles Salomon",f:"🇸🇧"},{nm:"Brunei",f:"🇧🇳"},{nm:"Îles Marshall",f:"🇲🇭"},
  {nm:"Malaisie",f:"🇲🇾"},{nm:"Fidji",f:"🇫🇯"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Vanuatu",f:"🇻🇺"}]),

R("chaleur","Pays les plus chauds (température moyenne annuelle)","🌡️",3,"World Meteorological Organization",[
  {nm:"Burkina Faso",f:"🇧🇫"},{nm:"Mali",f:"🇲🇱"},{nm:"Djibouti",f:"🇩🇯"},
  {nm:"Mauritanie",f:"🇲🇷"},{nm:"Érythrée",f:"🇪🇷"},{nm:"Sénégal",f:"🇸🇳"},
  {nm:"Niger",f:"🇳🇪"},{nm:"Tchad",f:"🇹🇩"},{nm:"Gambie",f:"🇬🇲"},{nm:"Soudan",f:"🇸🇩"}]),

/* ══ ÉDUCATIVES — GÉOGRAPHIE ══ */
R("plus_hauts","Pays avec les plus hauts sommets","🏔️",2,"Données géographiques",[
  {nm:"Népal",f:"🇳🇵"},{nm:"Chine",f:"🇨🇳"},{nm:"Pakistan",f:"🇵🇰"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Bhoutan",f:"🇧🇹"},{nm:"Tadjikistan",f:"🇹🇯"},
  {nm:"Argentine",f:"🇦🇷"},{nm:"Chili",f:"🇨🇱"},{nm:"Pérou",f:"🇵🇪"},{nm:"Bolivie",f:"🇧🇴"}]),

R("iles","Pays composés du plus grand nombre d'îles","🏝️",3,"Données géographiques",[
  {nm:"Suède",f:"🇸🇪"},{nm:"Norvège",f:"🇳🇴"},{nm:"Finlande",f:"🇫🇮"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Philippines",f:"🇵🇭"},{nm:"Japon",f:"🇯🇵"},{nm:"Chili",f:"🇨🇱"},{nm:"Royaume-Uni",f:"🇬🇧"}]),

R("frontieres","Pays avec le plus de pays voisins","🛂",2,"Données géographiques",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Russie",f:"🇷🇺"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"République du Congo",f:"🇨🇩"},{nm:"Autriche",f:"🇦🇹"},
  {nm:"France",f:"🇫🇷"},{nm:"Tanzanie",f:"🇹🇿"},{nm:"Turquie",f:"🇹🇷"},{nm:"Serbie",f:"🇷🇸"}]),

R("cotes","Pays avec le plus long littoral","🌊",3,"World Resources Institute",[
  {nm:"Canada",f:"🇨🇦"},{nm:"Norvège",f:"🇳🇴"},{nm:"Indonésie",f:"🇮🇩"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Philippines",f:"🇵🇭"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Australie",f:"🇦🇺"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Nouvelle-Zélande",f:"🇳🇿"},{nm:"Chine",f:"🇨🇳"}]),

R("deserts","Pays abritant les plus grands déserts","🏜️",3,"Données géographiques",[
  {nm:"Algérie",f:"🇩🇿"},{nm:"Chine",f:"🇨🇳"},{nm:"Arabie saoudite",f:"🇸🇦"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Libye",f:"🇱🇾"},{nm:"Mongolie",f:"🇲🇳"},
  {nm:"Égypte",f:"🇪🇬"},{nm:"Soudan",f:"🇸🇩"},{nm:"Tchad",f:"🇹🇩"},{nm:"Niger",f:"🇳🇪"}]),

R("lacs","Pays avec le plus de lacs","🏞️",3,"Données géographiques",[
  {nm:"Canada",f:"🇨🇦"},{nm:"Russie",f:"🇷🇺"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Suède",f:"🇸🇪"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Finlande",f:"🇫🇮"},{nm:"Norvège",f:"🇳🇴"},{nm:"Kazakhstan",f:"🇰🇿"},{nm:"Australie",f:"🇦🇺"}]),

R("altitude","Pays avec l'altitude moyenne la plus élevée","⛰️",3,"Données géographiques",[
  {nm:"Bhoutan",f:"🇧🇹"},{nm:"Népal",f:"🇳🇵"},{nm:"Tadjikistan",f:"🇹🇯"},
  {nm:"Kirghizistan",f:"🇰🇬"},{nm:"Lesotho",f:"🇱🇸"},{nm:"Andorre",f:"🇦🇩"},
  {nm:"Afghanistan",f:"🇦🇫"},{nm:"Chili",f:"🇨🇱"},{nm:"Chine",f:"🇨🇳"},{nm:"Arménie",f:"🇦🇲"}]),

/* ══ ÉDUCATIVES — HISTOIRE & PATRIMOINE ══ */
R("unesco","Pays avec le plus de sites au patrimoine mondial UNESCO","🏛️",2,"UNESCO 2024",[
  {nm:"Italie",f:"🇮🇹"},{nm:"Chine",f:"🇨🇳"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Russie",f:"🇷🇺"},{nm:"Iran",f:"🇮🇷"}]),

R("anciennes_civ","Berceaux des plus anciennes civilisations","📜",3,"Données historiques",[
  {nm:"Irak",f:"🇮🇶"},{nm:"Égypte",f:"🇪🇬"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Grèce",f:"🇬🇷"},{nm:"Iran",f:"🇮🇷"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Pérou",f:"🇵🇪"},{nm:"Turquie",f:"🇹🇷"},{nm:"Italie",f:"🇮🇹"}]),

R("monarchies","Pays encore dirigés par une monarchie","👑",2,"Données politiques 2024",[
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Japon",f:"🇯🇵"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Suède",f:"🇸🇪"},
  {nm:"Belgique",f:"🇧🇪"},{nm:"Norvège",f:"🇳🇴"},{nm:"Danemark",f:"🇩🇰"},{nm:"Maroc",f:"🇲🇦"}]),

R("vieux_drapeaux","Pays avec les plus vieux drapeaux nationaux","🎌",3,"Données vexillologiques",[
  {nm:"Danemark",f:"🇩🇰"},{nm:"Autriche",f:"🇦🇹"},{nm:"Lettonie",f:"🇱🇻"},
  {nm:"Pays-Bas",f:"🇳🇱"},{nm:"Suisse",f:"🇨🇭"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Suède",f:"🇸🇪"},{nm:"Espagne",f:"🇪🇸"},{nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"}]),

/* ══ ÉDUCATIVES — SCIENCE & DÉMOGRAPHIE ══ */
R("alphabetisation","Pays avec le meilleur taux d'alphabétisation","📖",2,"UNESCO 2024",[
  {nm:"Finlande",f:"🇫🇮"},{nm:"Norvège",f:"🇳🇴"},{nm:"Corée du Nord",f:"🇰🇵"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Japon",f:"🇯🇵"},{nm:"Pologne",f:"🇵🇱"},
  {nm:"Estonie",f:"🇪🇪"},{nm:"Lettonie",f:"🇱🇻"},{nm:"Cuba",f:"🇨🇺"},{nm:"Lituanie",f:"🇱🇹"}]),

R("astronautes","Pays ayant envoyé le plus d'astronautes dans l'espace","🚀",3,"Agences spatiales 2024",[
  {nm:"Russie",f:"🇷🇺"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Japon",f:"🇯🇵"},{nm:"France",f:"🇫🇷"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Italie",f:"🇮🇹"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Inde",f:"🇮🇳"}]),

R("satellites","Pays avec le plus de satellites en orbite","🛰️",3,"UCS Satellite Database 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Japon",f:"🇯🇵"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Canada",f:"🇨🇦"},{nm:"Luxembourg",f:"🇱🇺"},{nm:"France",f:"🇫🇷"}]),

R("recherche","Pays investissant le plus en recherche (% PIB)","🔬",3,"OCDE / UNESCO 2024",[
  {nm:"Israël",f:"🇮🇱"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Taïwan",f:"🇹🇼"},
  {nm:"Suède",f:"🇸🇪"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Autriche",f:"🇦🇹"},{nm:"Suisse",f:"🇨🇭"},{nm:"Belgique",f:"🇧🇪"}]),

R("agees","Pays avec la population la plus âgée","👵",2,"ONU 2024",[
  {nm:"Japon",f:"🇯🇵"},{nm:"Italie",f:"🇮🇹"},{nm:"Finlande",f:"🇫🇮"},
  {nm:"Portugal",f:"🇵🇹"},{nm:"Grèce",f:"🇬🇷"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Bulgarie",f:"🇧🇬"},{nm:"Croatie",f:"🇭🇷"},{nm:"Espagne",f:"🇪🇸"},{nm:"Slovénie",f:"🇸🇮"}]),

R("jeunes","Pays avec la population la plus jeune","🧒",2,"ONU 2024",[
  {nm:"Niger",f:"🇳🇪"},{nm:"Mali",f:"🇲🇱"},{nm:"Tchad",f:"🇹🇩"},
  {nm:"Angola",f:"🇦🇴"},{nm:"Ouganda",f:"🇺🇬"},{nm:"Somalie",f:"🇸🇴"},
  {nm:"RDC",f:"🇨🇩"},{nm:"Burkina Faso",f:"🇧🇫"},{nm:"Mozambique",f:"🇲🇿"},{nm:"Zambie",f:"🇿🇲"}]),

R("densite","Pays les plus densément peuplés","🏙️",3,"ONU 2024",[
  {nm:"Monaco",f:"🇲🇨"},{nm:"Singapour",f:"🇸🇬"},{nm:"Bahreïn",f:"🇧🇭"},
  {nm:"Malte",f:"🇲🇹"},{nm:"Maldives",f:"🇲🇻"},{nm:"Bangladesh",f:"🇧🇩"},
  {nm:"Liban",f:"🇱🇧"},{nm:"Barbade",f:"🇧🇧"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Corée du Sud",f:"🇰🇷"}]),

/* ══ ORIGINALES & INSOLITES ══ */
R("happy_meal","Pays consommant le plus de Coca-Cola par habitant","🥤",3,"Coca-Cola Company 2024",[
  {nm:"Mexique",f:"🇲🇽"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Chili",f:"🇨🇱"},{nm:"Argentine",f:"🇦🇷"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Espagne",f:"🇪🇸"},{nm:"Norvège",f:"🇳🇴"},{nm:"Belgique",f:"🇧🇪"},{nm:"Brésil",f:"🇧🇷"}]),

R("fromage","Pays consommant le plus de fromage par habitant","🧀",3,"International Dairy Federation 2024",[
  {nm:"France",f:"🇫🇷"},{nm:"Islande",f:"🇮🇸"},{nm:"Finlande",f:"🇫🇮"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Suisse",f:"🇨🇭"},{nm:"Italie",f:"🇮🇹"},
  {nm:"Pays-Bas",f:"🇳🇱"},{nm:"Autriche",f:"🇦🇹"},{nm:"Suède",f:"🇸🇪"},{nm:"Danemark",f:"🇩🇰"}]),

R("epices","Pays consommant le plus épicé","🌶️",3,"Données culinaires",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Mexique",f:"🇲🇽"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Éthiopie",f:"🇪🇹"},{nm:"Malaisie",f:"🇲🇾"},{nm:"Sri Lanka",f:"🇱🇰"},{nm:"Pérou",f:"🇵🇪"}]),

R("the","Pays consommant le plus de thé par habitant","🍵",3,"Statista 2024",[
  {nm:"Turquie",f:"🇹🇷"},{nm:"Irlande",f:"🇮🇪"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Iran",f:"🇮🇷"},{nm:"Russie",f:"🇷🇺"},{nm:"Maroc",f:"🇲🇦"},
  {nm:"Nouvelle-Zélande",f:"🇳🇿"},{nm:"Égypte",f:"🇪🇬"},{nm:"Pologne",f:"🇵🇱"},{nm:"Japon",f:"🇯🇵"}]),

R("ronald","Pays avec le plus de fêtes nationales / jours fériés","🎉",3,"Données nationales 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Colombie",f:"🇨🇴"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Philippines",f:"🇵🇭"},{nm:"Japon",f:"🇯🇵"},{nm:"Thaïlande",f:"🇹🇭"},
  {nm:"Argentine",f:"🇦🇷"},{nm:"Liban",f:"🇱🇧"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Malaisie",f:"🇲🇾"}]),

R("velo","Pays avec le plus de vélos par habitant","🚲",3,"World Cycling Data 2024",[
  {nm:"Pays-Bas",f:"🇳🇱"},{nm:"Danemark",f:"🇩🇰"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Suède",f:"🇸🇪"},{nm:"Norvège",f:"🇳🇴"},{nm:"Finlande",f:"🇫🇮"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Belgique",f:"🇧🇪"},{nm:"Suisse",f:"🇨🇭"},{nm:"Chine",f:"🇨🇳"}]),

R("piscines","Pays avec le plus de piscines par habitant","🏊‍♂️",3,"Données loisirs 2024",[
  {nm:"Australie",f:"🇦🇺"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"France",f:"🇫🇷"},{nm:"Afrique du Sud",f:"🇿🇦"},{nm:"Italie",f:"🇮🇹"},
  {nm:"Grèce",f:"🇬🇷"},{nm:"Brésil",f:"🇧🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Mexique",f:"🇲🇽"}]),

R("rire","Pays considérés comme les plus optimistes","😄",3,"Ipsos Global Happiness 2024",[
  {nm:"Colombie",f:"🇨🇴"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Brésil",f:"🇧🇷"},{nm:"Pays-Bas",f:"🇳🇱"},
  {nm:"Philippines",f:"🇵🇭"},{nm:"Argentine",f:"🇦🇷"},{nm:"Chine",f:"🇨🇳"},{nm:"Arabie saoudite",f:"🇸🇦"}]),

R("ovni","Pays avec le plus d'observations d'OVNI","🛸",3,"National UFO Reporting Center 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Canada",f:"🇨🇦"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Inde",f:"🇮🇳"},{nm:"France",f:"🇫🇷"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Mexique",f:"🇲🇽"},{nm:"Brésil",f:"🇧🇷"},{nm:"Russie",f:"🇷🇺"}]),

R("chateaux","Pays avec le plus de châteaux","🏰",3,"Données patrimoniales",[
  {nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Espagne",f:"🇪🇸"},{nm:"Autriche",f:"🇦🇹"},
  {nm:"Tchéquie",f:"🇨🇿"},{nm:"Pologne",f:"🇵🇱"},{nm:"Irlande",f:"🇮🇪"},{nm:"Belgique",f:"🇧🇪"}]),

R("metal","Pays avec le plus de groupes de metal par habitant","🤘",3,"Encyclopaedia Metallum 2024",[
  {nm:"Finlande",f:"🇫🇮"},{nm:"Suède",f:"🇸🇪"},{nm:"Norvège",f:"🇳🇴"},
  {nm:"Islande",f:"🇮🇸"},{nm:"Danemark",f:"🇩🇰"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Grèce",f:"🇬🇷"},{nm:"Belgique",f:"🇧🇪"},{nm:"Autriche",f:"🇦🇹"},{nm:"Estonie",f:"🇪🇪"}]),

R("emoji","Pays utilisant le plus d'emojis en ligne","😂",3,"Adobe Emoji Trend 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"France",f:"🇫🇷"},{nm:"Mexique",f:"🇲🇽"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Philippines",f:"🇵🇭"},{nm:"Australie",f:"🇦🇺"},{nm:"Espagne",f:"🇪🇸"}]),

R("licornes_jeux","Pays produisant le plus de jeux vidéo","🕹️",3,"Newzoo 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Canada",f:"🇨🇦"},
  {nm:"France",f:"🇫🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Pologne",f:"🇵🇱"},{nm:"Suède",f:"🇸🇪"}]),

R("aquariums","Pays avec le plus de zoos et aquariums","🐠",3,"WAZA 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"France",f:"🇫🇷"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Espagne",f:"🇪🇸"},{nm:"Australie",f:"🇦🇺"},{nm:"Canada",f:"🇨🇦"}]),

R("parcs","Pays avec le plus de parcs d'attractions","🎢",3,"AECOM Theme Index 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Japon",f:"🇯🇵"},
  {nm:"France",f:"🇫🇷"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Italie",f:"🇮🇹"},{nm:"Espagne",f:"🇪🇸"},{nm:"Pays-Bas",f:"🇳🇱"}]),

R("gratte_ciel","Pays avec le plus de gratte-ciels","🏗️",2,"Council on Tall Buildings 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Émirats arabes unis",f:"🇦🇪"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Japon",f:"🇯🇵"},{nm:"Malaisie",f:"🇲🇾"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Australie",f:"🇦🇺"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Indonésie",f:"🇮🇩"}]),

R("ponts","Pays avec les plus longs ponts","🌉",3,"Données d'ingénierie 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Thaïlande",f:"🇹🇭"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Turquie",f:"🇹🇷"},{nm:"Danemark",f:"🇩🇰"},{nm:"France",f:"🇫🇷"},{nm:"Norvège",f:"🇳🇴"}]),

R("influenceurs","Pays avec le plus d'influenceurs sur les réseaux","📲",3,"HypeAuditor 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Inde",f:"🇮🇳"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Russie",f:"🇷🇺"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Turquie",f:"🇹🇷"},{nm:"Mexique",f:"🇲🇽"},{nm:"France",f:"🇫🇷"},{nm:"Allemagne",f:"🇩🇪"}]),

R("musique_export","Pays exportant le plus de musique","🎶",3,"IFPI Global Music Report 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"Suède",f:"🇸🇪"},{nm:"Canada",f:"🇨🇦"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Japon",f:"🇯🇵"},{nm:"Australie",f:"🇦🇺"},{nm:"Porto Rico",f:"🇵🇷"}]),

R("ramen","Pays consommant le plus de nouilles instantanées","🍜",3,"World Instant Noodles Association 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Vietnam",f:"🇻🇳"},{nm:"Japon",f:"🇯🇵"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Philippines",f:"🇵🇭"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Brésil",f:"🇧🇷"}]),

R("riz","Pays produisant le plus de riz","🌾",2,"FAO 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"Indonésie",f:"🇮🇩"},
  {nm:"Bangladesh",f:"🇧🇩"},{nm:"Vietnam",f:"🇻🇳"},{nm:"Thaïlande",f:"🇹🇭"},
  {nm:"Myanmar",f:"🇲🇲"},{nm:"Philippines",f:"🇵🇭"},{nm:"Brésil",f:"🇧🇷"},{nm:"Pakistan",f:"🇵🇰"}]),

R("the_prod","Pays produisant le plus de thé","🫖",2,"FAO 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"Kenya",f:"🇰🇪"},
  {nm:"Sri Lanka",f:"🇱🇰"},{nm:"Turquie",f:"🇹🇷"},{nm:"Vietnam",f:"🇻🇳"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Argentine",f:"🇦🇷"},{nm:"Japon",f:"🇯🇵"},{nm:"Iran",f:"🇮🇷"}]),

R("cafe_prod","Pays produisant le plus de café","☕",2,"OIC 2024",[
  {nm:"Brésil",f:"🇧🇷"},{nm:"Vietnam",f:"🇻🇳"},{nm:"Colombie",f:"🇨🇴"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Éthiopie",f:"🇪🇹"},{nm:"Honduras",f:"🇭🇳"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Ouganda",f:"🇺🇬"},{nm:"Mexique",f:"🇲🇽"},{nm:"Pérou",f:"🇵🇪"}]),

R("cacao","Pays produisant le plus de cacao","🍫",2,"ICCO 2024",[
  {nm:"Côte d'Ivoire",f:"🇨🇮"},{nm:"Ghana",f:"🇬🇭"},{nm:"Indonésie",f:"🇮🇩"},
  {nm:"Équateur",f:"🇪🇨"},{nm:"Cameroun",f:"🇨🇲"},{nm:"Nigeria",f:"🇳🇬"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"Pérou",f:"🇵🇪"},{nm:"République dominicaine",f:"🇩🇴"},{nm:"Colombie",f:"🇨🇴"}]),

R("bananes","Pays produisant le plus de bananes","🍌",2,"FAO 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Chine",f:"🇨🇳"},{nm:"Indonésie",f:"🇮🇩"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"Équateur",f:"🇪🇨"},{nm:"Philippines",f:"🇵🇭"},
  {nm:"Guatemala",f:"🇬🇹"},{nm:"Angola",f:"🇦🇴"},{nm:"Tanzanie",f:"🇹🇿"},{nm:"Colombie",f:"🇨🇴"}]),

R("miel","Pays produisant le plus de miel","🍯",3,"FAO 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Turquie",f:"🇹🇷"},{nm:"Iran",f:"🇮🇷"},
  {nm:"Argentine",f:"🇦🇷"},{nm:"Ukraine",f:"🇺🇦"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Russie",f:"🇷🇺"},{nm:"Mexique",f:"🇲🇽"},{nm:"Éthiopie",f:"🇪🇹"}]),

R("ble","Pays produisant le plus de blé","🌾",2,"FAO 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"Russie",f:"🇷🇺"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Ukraine",f:"🇺🇦"},{nm:"Pakistan",f:"🇵🇰"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Australie",f:"🇦🇺"}]),

R("animaux_ferme","Pays avec le plus de moutons","🐑",3,"FAO 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Nigeria",f:"🇳🇬"},{nm:"Iran",f:"🇮🇷"},{nm:"Tchad",f:"🇹🇩"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Soudan",f:"🇸🇩"},{nm:"Turquie",f:"🇹🇷"},{nm:"Nouvelle-Zélande",f:"🇳🇿"}]),

R("vaches","Pays avec le plus de bovins","🐄",3,"FAO 2024",[
  {nm:"Brésil",f:"🇧🇷"},{nm:"Inde",f:"🇮🇳"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Éthiopie",f:"🇪🇹"},{nm:"Argentine",f:"🇦🇷"},
  {nm:"Pakistan",f:"🇵🇰"},{nm:"Mexique",f:"🇲🇽"},{nm:"Australie",f:"🇦🇺"},{nm:"Soudan",f:"🇸🇩"}]),

R("aeroports_nb","Pays avec le plus d'aéroports","🛫",3,"CIA World Factbook 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},{nm:"Mexique",f:"🇲🇽"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Russie",f:"🇷🇺"},{nm:"Argentine",f:"🇦🇷"},
  {nm:"Bolivie",f:"🇧🇴"},{nm:"Colombie",f:"🇨🇴"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Australie",f:"🇦🇺"}]),

R("routes","Pays avec le plus long réseau routier","🛣️",3,"CIA World Factbook 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Inde",f:"🇮🇳"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"Russie",f:"🇷🇺"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Canada",f:"🇨🇦"},{nm:"France",f:"🇫🇷"},{nm:"Australie",f:"🇦🇺"},{nm:"Espagne",f:"🇪🇸"}]),

/* ── LOT SUPPLÉMENTAIRE ── */
R("rivieres","Pays avec les plus longs fleuves","🏞️",3,"Données géographiques",[
  {nm:"Brésil",f:"🇧🇷"},{nm:"Égypte",f:"🇪🇬"},{nm:"Chine",f:"🇨🇳"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Russie",f:"🇷🇺"},{nm:"RD Congo",f:"🇨🇩"},
  {nm:"Soudan",f:"🇸🇩"},{nm:"Pérou",f:"🇵🇪"},{nm:"Argentine",f:"🇦🇷"},{nm:"Mali",f:"🇲🇱"}]),
R("smartphones","Pays avec le plus de smartphones","📱",2,"Statista 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Brésil",f:"🇧🇷"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Nigeria",f:"🇳🇬"},{nm:"Pakistan",f:"🇵🇰"},{nm:"Bangladesh",f:"🇧🇩"}]),
R("chocolat","Pays consommant le plus de chocolat","🍫",2,"Statista 2024",[
  {nm:"Suisse",f:"🇨🇭"},{nm:"Autriche",f:"🇦🇹"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Irlande",f:"🇮🇪"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Suède",f:"🇸🇪"},
  {nm:"Norvège",f:"🇳🇴"},{nm:"Danemark",f:"🇩🇰"},{nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"}]),
R("pizza","Pays consommant le plus de pizza","🍕",3,"Données sectorielles 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Italie",f:"🇮🇹"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"France",f:"🇫🇷"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Canada",f:"🇨🇦"},{nm:"Australie",f:"🇦🇺"},{nm:"Espagne",f:"🇪🇸"}]),
R("vin","Pays produisant le plus de vin","🍷",2,"OIV 2024",[
  {nm:"Italie",f:"🇮🇹"},{nm:"France",f:"🇫🇷"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chili",f:"🇨🇱"},{nm:"Argentine",f:"🇦🇷"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Afrique du Sud",f:"🇿🇦"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Portugal",f:"🇵🇹"}]),
R("biere","Pays produisant le plus de bière","🍺",2,"Kirin 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},
  {nm:"Mexique",f:"🇲🇽"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Vietnam",f:"🇻🇳"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Pologne",f:"🇵🇱"}]),
R("cafe","Pays produisant le plus de café","☕",2,"OIC 2024",[
  {nm:"Brésil",f:"🇧🇷"},{nm:"Vietnam",f:"🇻🇳"},{nm:"Colombie",f:"🇨🇴"},
  {nm:"Indonésie",f:"🇮🇩"},{nm:"Éthiopie",f:"🇪🇹"},{nm:"Ouganda",f:"🇺🇬"},
  {nm:"Inde",f:"🇮🇳"},{nm:"Honduras",f:"🇭🇳"},{nm:"Mexique",f:"🇲🇽"},{nm:"Pérou",f:"🇵🇪"}]),
R("riz","Pays produisant le plus de riz","🌾",2,"FAO 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"Indonésie",f:"🇮🇩"},
  {nm:"Bangladesh",f:"🇧🇩"},{nm:"Vietnam",f:"🇻🇳"},{nm:"Thaïlande",f:"🇹🇭"},
  {nm:"Birmanie",f:"🇲🇲"},{nm:"Philippines",f:"🇵🇭"},{nm:"Pakistan",f:"🇵🇰"},{nm:"Brésil",f:"🇧🇷"}]),
R("ble","Pays produisant le plus de blé","🌾",2,"FAO 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},{nm:"Russie",f:"🇷🇺"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Ukraine",f:"🇺🇦"},{nm:"Pakistan",f:"🇵🇰"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Australie",f:"🇦🇺"}]),
R("petrole","Pays produisant le plus de pétrole","🛢️",2,"AIE 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Irak",f:"🇮🇶"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Émirats arabes unis",f:"🇦🇪"},{nm:"Iran",f:"🇮🇷"},{nm:"Brésil",f:"🇧🇷"},{nm:"Koweït",f:"🇰🇼"}]),
R("gaz","Pays produisant le plus de gaz naturel","🔥",3,"AIE 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Russie",f:"🇷🇺"},{nm:"Iran",f:"🇮🇷"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Canada",f:"🇨🇦"},{nm:"Qatar",f:"🇶🇦"},
  {nm:"Australie",f:"🇦🇺"},{nm:"Norvège",f:"🇳🇴"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Algérie",f:"🇩🇿"}]),
R("nucleaire","Pays avec le plus de réacteurs nucléaires","☢️",3,"AIEA 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"France",f:"🇫🇷"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Ukraine",f:"🇺🇦"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Japon",f:"🇯🇵"},{nm:"Inde",f:"🇮🇳"}]),
R("electricite","Pays produisant le plus d'électricité","⚡",3,"AIE 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Japon",f:"🇯🇵"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"}]),
R("solaire","Pays avec le plus d'énergie solaire","🔆",3,"IRENA 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Inde",f:"🇮🇳"},{nm:"Australie",f:"🇦🇺"},
  {nm:"Italie",f:"🇮🇹"},{nm:"Espagne",f:"🇪🇸"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Pays-Bas",f:"🇳🇱"}]),
R("aeroports","Pays avec le plus d'aéroports","🛫",3,"CIA World Factbook 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Brésil",f:"🇧🇷"},{nm:"Mexique",f:"🇲🇽"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Russie",f:"🇷🇺"},{nm:"Argentine",f:"🇦🇷"},
  {nm:"Bolivie",f:"🇧🇴"},{nm:"Colombie",f:"🇨🇴"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Australie",f:"🇦🇺"}]),
R("gratte_ciel","Pays avec le plus de gratte-ciels","🏙️",2,"CTBUH 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Émirats arabes unis",f:"🇦🇪"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"Malaisie",f:"🇲🇾"},
  {nm:"Canada",f:"🇨🇦"},{nm:"Australie",f:"🇦🇺"},{nm:"Thaïlande",f:"🇹🇭"},{nm:"Indonésie",f:"🇮🇩"}]),
R("universites","Pays avec les meilleures universités (top 200)","🎓",3,"QS Rankings 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Chine",f:"🇨🇳"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Australie",f:"🇦🇺"},{nm:"Canada",f:"🇨🇦"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Corée du Sud",f:"🇰🇷"},{nm:"France",f:"🇫🇷"},{nm:"Pays-Bas",f:"🇳🇱"}]),
R("brevets","Pays déposant le plus de brevets","💡",3,"OMPI 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Russie",f:"🇷🇺"},{nm:"France",f:"🇫🇷"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Suisse",f:"🇨🇭"}]),
R("startups","Pays avec le plus de licornes (startups)","🦄",3,"CB Insights 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Allemagne",f:"🇩🇪"},{nm:"France",f:"🇫🇷"},
  {nm:"Israël",f:"🇮🇱"},{nm:"Canada",f:"🇨🇦"},{nm:"Brésil",f:"🇧🇷"},{nm:"Corée du Sud",f:"🇰🇷"}]),
R("chomage","Pays avec le plus faible taux de chômage","💼",3,"OIT 2024",[
  {nm:"Qatar",f:"🇶🇦"},{nm:"Émirats arabes unis",f:"🇦🇪"},{nm:"Thaïlande",f:"🇹🇭"},
  {nm:"Japon",f:"🇯🇵"},{nm:"Suisse",f:"🇨🇭"},{nm:"Singapour",f:"🇸🇬"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Pays-Bas",f:"🇳🇱"},{nm:"Norvège",f:"🇳🇴"}]),
R("dette","Pays avec la plus forte dette publique (% PIB)","📉",3,"FMI 2024",[
  {nm:"Japon",f:"🇯🇵"},{nm:"Grèce",f:"🇬🇷"},{nm:"Italie",f:"🇮🇹"},
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Portugal",f:"🇵🇹"},{nm:"Espagne",f:"🇪🇸"},
  {nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Belgique",f:"🇧🇪"}]),
R("naissance","Pays avec le plus de naissances par an","👶",3,"ONU 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Chine",f:"🇨🇳"},{nm:"Nigeria",f:"🇳🇬"},
  {nm:"Pakistan",f:"🇵🇰"},{nm:"Indonésie",f:"🇮🇩"},{nm:"RD Congo",f:"🇨🇩"},
  {nm:"Éthiopie",f:"🇪🇹"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Bangladesh",f:"🇧🇩"},{nm:"Égypte",f:"🇪🇬"}]),
R("obesite","Pays avec le plus fort taux d'obésité","🍔",3,"OMS 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Émirats arabes unis",f:"🇦🇪"},
  {nm:"Égypte",f:"🇪🇬"},{nm:"Mexique",f:"🇲🇽"},{nm:"Argentine",f:"🇦🇷"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Australie",f:"🇦🇺"},{nm:"Canada",f:"🇨🇦"},{nm:"Turquie",f:"🇹🇷"}]),
R("medecins","Pays avec le plus de médecins par habitant","🩺",3,"OMS 2024",[
  {nm:"Cuba",f:"🇨🇺"},{nm:"Grèce",f:"🇬🇷"},{nm:"Portugal",f:"🇵🇹"},
  {nm:"Autriche",f:"🇦🇹"},{nm:"Norvège",f:"🇳🇴"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Espagne",f:"🇪🇸"},{nm:"Suisse",f:"🇨🇭"},{nm:"Italie",f:"🇮🇹"},{nm:"Suède",f:"🇸🇪"}]),
R("immigration","Pays accueillant le plus d'immigrés","🌐",2,"ONU 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Arabie saoudite",f:"🇸🇦"},
  {nm:"Russie",f:"🇷🇺"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Émirats arabes unis",f:"🇦🇪"},
  {nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"},{nm:"Australie",f:"🇦🇺"},{nm:"Espagne",f:"🇪🇸"}]),
R("films","Pays produisant le plus de films","🎬",3,"UNESCO 2024",[
  {nm:"Inde",f:"🇮🇳"},{nm:"Nigeria",f:"🇳🇬"},{nm:"États-Unis",f:"🇺🇸"},
  {nm:"Chine",f:"🇨🇳"},{nm:"Japon",f:"🇯🇵"},{nm:"Corée du Sud",f:"🇰🇷"},
  {nm:"France",f:"🇫🇷"},{nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Espagne",f:"🇪🇸"},{nm:"Italie",f:"🇮🇹"}]),
R("musique","Pays avec le plus gros marché musical","🎵",3,"IFPI 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Allemagne",f:"🇩🇪"},{nm:"Chine",f:"🇨🇳"},{nm:"France",f:"🇫🇷"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Canada",f:"🇨🇦"},{nm:"Brésil",f:"🇧🇷"},{nm:"Australie",f:"🇦🇺"}]),
R("jeuxvideo","Pays avec le plus gros marché du jeu vidéo","🎮",3,"Newzoo 2024",[
  {nm:"Chine",f:"🇨🇳"},{nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Allemagne",f:"🇩🇪"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"France",f:"🇫🇷"},{nm:"Canada",f:"🇨🇦"},{nm:"Italie",f:"🇮🇹"},{nm:"Brésil",f:"🇧🇷"}]),
R("twitter","Pays avec le plus d'utilisateurs X (Twitter)","🐦",3,"Statista 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Japon",f:"🇯🇵"},{nm:"Inde",f:"🇮🇳"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"Indonésie",f:"🇮🇩"},{nm:"Royaume-Uni",f:"🇬🇧"},
  {nm:"Turquie",f:"🇹🇷"},{nm:"Arabie saoudite",f:"🇸🇦"},{nm:"Mexique",f:"🇲🇽"},{nm:"France",f:"🇫🇷"}]),
R("chats","Pays avec le plus de chats domestiques","🐱",3,"Statista 2024",[
  {nm:"États-Unis",f:"🇺🇸"},{nm:"Chine",f:"🇨🇳"},{nm:"Russie",f:"🇷🇺"},
  {nm:"Brésil",f:"🇧🇷"},{nm:"France",f:"🇫🇷"},{nm:"Allemagne",f:"🇩🇪"},
  {nm:"Royaume-Uni",f:"🇬🇧"},{nm:"Italie",f:"🇮🇹"},{nm:"Japon",f:"🇯🇵"},{nm:"Ukraine",f:"🇺🇦"}]),
R("forets_pct","Pays les plus boisés (% du territoire)","🌲",3,"FAO 2024",[
  {nm:"Suriname",f:"🇸🇷"},{nm:"Gabon",f:"🇬🇦"},{nm:"Laos",f:"🇱🇦"},
  {nm:"Finlande",f:"🇫🇮"},{nm:"Suède",f:"🇸🇪"},{nm:"Japon",f:"🇯🇵"},
  {nm:"Corée du Sud",f:"🇰🇷"},{nm:"Brésil",f:"🇧🇷"},{nm:"RD Congo",f:"🇨🇩"},{nm:"Pérou",f:"🇵🇪"}]),
];

/* ═══════════════════════════════════════════════════════
   PLUS OU MOINS — Top 50 par classement (rangs réels)
   HL50(id,label,emoji,difficulty,source,[50 pays ordonnés])
═══════════════════════════════════════════════════════ */
const HL50=(id,lb,e,d,s,arr)=>({id,lb,e,d,s,t:arr.map(x=>({nm:x[0],f:x[1]}))});

const HIGHLOW=[
HL50("pop","Population","👥",1,"ONU 2024",[
  ["Inde","🇮🇳"],["Chine","🇨🇳"],["États-Unis","🇺🇸"],["Indonésie","🇮🇩"],
  ["Pakistan","🇵🇰"],["Nigeria","🇳🇬"],["Brésil","🇧🇷"],["Bangladesh","🇧🇩"],
  ["Russie","🇷🇺"],["Mexique","🇲🇽"],["Éthiopie","🇪🇹"],["Japon","🇯🇵"],
  ["Philippines","🇵🇭"],["Égypte","🇪🇬"],["RD Congo","🇨🇩"],["Vietnam","🇻🇳"],
  ["Iran","🇮🇷"],["Turquie","🇹🇷"],["Allemagne","🇩🇪"],["Thaïlande","🇹🇭"],
  ["Royaume-Uni","🇬🇧"],["Tanzanie","🇹🇿"],["France","🇫🇷"],["Afrique du Sud","🇿🇦"],
  ["Italie","🇮🇹"],["Kenya","🇰🇪"],["Birmanie","🇲🇲"],["Colombie","🇨🇴"],
  ["Corée du Sud","🇰🇷"],["Soudan","🇸🇩"],["Ouganda","🇺🇬"],["Espagne","🇪🇸"],
  ["Algérie","🇩🇿"],["Irak","🇮🇶"],["Argentine","🇦🇷"],["Afghanistan","🇦🇫"],
  ["Yémen","🇾🇪"],["Canada","🇨🇦"],["Pologne","🇵🇱"],["Maroc","🇲🇦"],
  ["Angola","🇦🇴"],["Ukraine","🇺🇦"],["Ouzbékistan","🇺🇿"],["Malaisie","🇲🇾"],
  ["Mozambique","🇲🇿"],["Ghana","🇬🇭"],["Pérou","🇵🇪"],["Arabie saoudite","🇸🇦"],
  ["Madagascar","🇲🇬"],["Népal","🇳🇵"]]),
HL50("area","Superficie","📐",1,"Données géographiques",[
  ["Russie","🇷🇺"],["Canada","🇨🇦"],["États-Unis","🇺🇸"],["Chine","🇨🇳"],
  ["Brésil","🇧🇷"],["Australie","🇦🇺"],["Inde","🇮🇳"],["Argentine","🇦🇷"],
  ["Kazakhstan","🇰🇿"],["Algérie","🇩🇿"],["RD Congo","🇨🇩"],["Arabie saoudite","🇸🇦"],
  ["Mexique","🇲🇽"],["Indonésie","🇮🇩"],["Soudan","🇸🇩"],["Libye","🇱🇾"],
  ["Iran","🇮🇷"],["Mongolie","🇲🇳"],["Pérou","🇵🇪"],["Tchad","🇹🇩"],
  ["Niger","🇳🇪"],["Angola","🇦🇴"],["Mali","🇲🇱"],["Afrique du Sud","🇿🇦"],
  ["Colombie","🇨🇴"],["Éthiopie","🇪🇹"],["Bolivie","🇧🇴"],["Mauritanie","🇲🇷"],
  ["Égypte","🇪🇬"],["Tanzanie","🇹🇿"],["Nigeria","🇳🇬"],["Venezuela","🇻🇪"],
  ["Pakistan","🇵🇰"],["Mozambique","🇲🇿"],["Turquie","🇹🇷"],["Birmanie","🇲🇲"],
  ["Afghanistan","🇦🇫"],["Ukraine","🇺🇦"],["France","🇫🇷"],["Madagascar","🇲🇬"],
  ["Kenya","🇰🇪"],["Thaïlande","🇹🇭"],["Espagne","🇪🇸"],["Turkménistan","🇹🇲"],
  ["Cameroun","🇨🇲"],["Maroc","🇲🇦"],["Irak","🇮🇶"],["Suède","🇸🇪"],
  ["Japon","🇯🇵"],["Allemagne","🇩🇪"]]),
HL50("pib","Économie (PIB)","💰",1,"FMI 2024",[
  ["États-Unis","🇺🇸"],["Chine","🇨🇳"],["Allemagne","🇩🇪"],["Japon","🇯🇵"],
  ["Inde","🇮🇳"],["Royaume-Uni","🇬🇧"],["France","🇫🇷"],["Italie","🇮🇹"],
  ["Brésil","🇧🇷"],["Canada","🇨🇦"],["Russie","🇷🇺"],["Mexique","🇲🇽"],
  ["Australie","🇦🇺"],["Corée du Sud","🇰🇷"],["Espagne","🇪🇸"],["Indonésie","🇮🇩"],
  ["Turquie","🇹🇷"],["Pays-Bas","🇳🇱"],["Arabie saoudite","🇸🇦"],["Suisse","🇨🇭"],
  ["Pologne","🇵🇱"],["Argentine","🇦🇷"],["Taïwan","🇹🇼"],["Belgique","🇧🇪"],
  ["Suède","🇸🇪"],["Irlande","🇮🇪"],["Thaïlande","🇹🇭"],["Norvège","🇳🇴"],
  ["Israël","🇮🇱"],["Singapour","🇸🇬"],["Autriche","🇦🇹"],["Nigeria","🇳🇬"],
  ["Émirats arabes unis","🇦🇪"],["Vietnam","🇻🇳"],["Malaisie","🇲🇾"],["Philippines","🇵🇭"],
  ["Bangladesh","🇧🇩"],["Danemark","🇩🇰"],["Afrique du Sud","🇿🇦"],["Égypte","🇪🇬"],
  ["Hong Kong","🇭🇰"],["Iran","🇮🇷"],["Colombie","🇨🇴"],["Roumanie","🇷🇴"],
  ["Tchéquie","🇨🇿"],["Chili","🇨🇱"],["Finlande","🇫🇮"],["Portugal","🇵🇹"],
  ["Pérou","🇵🇪"],["Nouvelle-Zélande","🇳🇿"]]),
HL50("life","Espérance de vie","🧬",2,"OMS 2024",[
  ["Japon","🇯🇵"],["Suisse","🇨🇭"],["Singapour","🇸🇬"],["Italie","🇮🇹"],
  ["Espagne","🇪🇸"],["Australie","🇦🇺"],["Corée du Sud","🇰🇷"],["Israël","🇮🇱"],
  ["Norvège","🇳🇴"],["Islande","🇮🇸"],["Suède","🇸🇪"],["France","🇫🇷"],
  ["Malte","🇲🇹"],["Canada","🇨🇦"],["Irlande","🇮🇪"],["Pays-Bas","🇳🇱"],
  ["Nouvelle-Zélande","🇳🇿"],["Luxembourg","🇱🇺"],["Royaume-Uni","🇬🇧"],["Autriche","🇦🇹"],
  ["Belgique","🇧🇪"],["Finlande","🇫🇮"],["Portugal","🇵🇹"],["Chypre","🇨🇾"],
  ["Allemagne","🇩🇪"],["Danemark","🇩🇰"],["Grèce","🇬🇷"],["Slovénie","🇸🇮"],
  ["Chili","🇨🇱"],["Costa Rica","🇨🇷"],["Qatar","🇶🇦"],["Émirats arabes unis","🇦🇪"],
  ["Cuba","🇨🇺"],["États-Unis","🇺🇸"],["Pologne","🇵🇱"],["Chine","🇨🇳"],
  ["Tchéquie","🇨🇿"],["Croatie","🇭🇷"],["Estonie","🇪🇪"],["Turquie","🇹🇷"],
  ["Thaïlande","🇹🇭"],["Brésil","🇧🇷"],["Mexique","🇲🇽"],["Iran","🇮🇷"],
  ["Vietnam","🇻🇳"],["Colombie","🇨🇴"],["Pérou","🇵🇪"],["Arabie saoudite","🇸🇦"],
  ["Maroc","🇲🇦"],["Égypte","🇪🇬"]]),
HL50("tour","Tourisme (visiteurs)","✈️",2,"OMT 2023",[
  ["France","🇫🇷"],["Espagne","🇪🇸"],["États-Unis","🇺🇸"],["Chine","🇨🇳"],
  ["Italie","🇮🇹"],["Turquie","🇹🇷"],["Mexique","🇲🇽"],["Allemagne","🇩🇪"],
  ["Thaïlande","🇹🇭"],["Royaume-Uni","🇬🇧"],["Autriche","🇦🇹"],["Grèce","🇬🇷"],
  ["Japon","🇯🇵"],["Malaisie","🇲🇾"],["Arabie saoudite","🇸🇦"],["Portugal","🇵🇹"],
  ["Canada","🇨🇦"],["Pologne","🇵🇱"],["Pays-Bas","🇳🇱"],["Croatie","🇭🇷"],
  ["Hong Kong","🇭🇰"],["Émirats arabes unis","🇦🇪"],["Hongrie","🇭🇺"],["Maroc","🇲🇦"],
  ["Singapour","🇸🇬"],["Inde","🇮🇳"],["Égypte","🇪🇬"],["Russie","🇷🇺"],
  ["République tchèque","🇨🇿"],["Suisse","🇨🇭"],["Indonésie","🇮🇩"],["Vietnam","🇻🇳"],
  ["Danemark","🇩🇰"],["Irlande","🇮🇪"],["Corée du Sud","🇰🇷"],["Belgique","🇧🇪"],
  ["Suède","🇸🇪"],["Bulgarie","🇧🇬"],["Afrique du Sud","🇿🇦"],["Brésil","🇧🇷"],
  ["Argentine","🇦🇷"],["Tunisie","🇹🇳"],["Australie","🇦🇺"],["Roumanie","🇷🇴"],
  ["Norvège","🇳🇴"],["Chili","🇨🇱"],["Israël","🇮🇱"],["Jordanie","🇯🇴"],
  ["Finlande","🇫🇮"],["Pérou","🇵🇪"]]),
HL50("co2","Émissions CO₂","🏭",2,"Global Carbon Project 2023",[
  ["Chine","🇨🇳"],["États-Unis","🇺🇸"],["Inde","🇮🇳"],["Russie","🇷🇺"],
  ["Japon","🇯🇵"],["Iran","🇮🇷"],["Allemagne","🇩🇪"],["Arabie saoudite","🇸🇦"],
  ["Indonésie","🇮🇩"],["Corée du Sud","🇰🇷"],["Canada","🇨🇦"],["Brésil","🇧🇷"],
  ["Turquie","🇹🇷"],["Afrique du Sud","🇿🇦"],["Mexique","🇲🇽"],["Australie","🇦🇺"],
  ["Royaume-Uni","🇬🇧"],["Italie","🇮🇹"],["Vietnam","🇻🇳"],["Pologne","🇵🇱"],
  ["France","🇫🇷"],["Égypte","🇪🇬"],["Kazakhstan","🇰🇿"],["Thaïlande","🇹🇭"],
  ["Espagne","🇪🇸"],["Malaisie","🇲🇾"],["Émirats arabes unis","🇦🇪"],["Pakistan","🇵🇰"],
  ["Irak","🇮🇶"],["Ukraine","🇺🇦"],["Argentine","🇦🇷"],["Pays-Bas","🇳🇱"],
  ["Algérie","🇩🇿"],["Philippines","🇵🇭"],["Ouzbékistan","🇺🇿"],["Nigeria","🇳🇬"],
  ["Qatar","🇶🇦"],["Bangladesh","🇧🇩"],["Belgique","🇧🇪"],["Koweït","🇰🇼"],
  ["Venezuela","🇻🇪"],["Colombie","🇨🇴"],["Tchéquie","🇨🇿"],["Maroc","🇲🇦"],
  ["Chili","🇨🇱"],["Roumanie","🇷🇴"],["Pérou","🇵🇪"],["Israël","🇮🇱"],
  ["Autriche","🇦🇹"],["Grèce","🇬🇷"]]),
HL50("mil","Budget militaire","🪖",2,"SIPRI 2024",[
  ["États-Unis","🇺🇸"],["Chine","🇨🇳"],["Russie","🇷🇺"],["Inde","🇮🇳"],
  ["Arabie saoudite","🇸🇦"],["Royaume-Uni","🇬🇧"],["Allemagne","🇩🇪"],["Ukraine","🇺🇦"],
  ["France","🇫🇷"],["Japon","🇯🇵"],["Corée du Sud","🇰🇷"],["Italie","🇮🇹"],
  ["Australie","🇦🇺"],["Pologne","🇵🇱"],["Israël","🇮🇱"],["Canada","🇨🇦"],
  ["Espagne","🇪🇸"],["Brésil","🇧🇷"],["Algérie","🇩🇿"],["Koweït","🇰🇼"],
  ["Turquie","🇹🇷"],["Pays-Bas","🇳🇱"],["Singapour","🇸🇬"],["Taïwan","🇹🇼"],
  ["Émirats arabes unis","🇦🇪"],["Mexique","🇲🇽"],["Colombie","🇨🇴"],["Iran","🇮🇷"],
  ["Norvège","🇳🇴"],["Pakistan","🇵🇰"],["Indonésie","🇮🇩"],["Thaïlande","🇹🇭"],
  ["Égypte","🇪🇬"],["Qatar","🇶🇦"],["Suède","🇸🇪"],["Vietnam","🇻🇳"],
  ["Grèce","🇬🇷"],["Roumanie","🇷🇴"],["Danemark","🇩🇰"],["Belgique","🇧🇪"],
  ["Suisse","🇨🇭"],["Chili","🇨🇱"],["Argentine","🇦🇷"],["Afrique du Sud","🇿🇦"],
  ["Finlande","🇫🇮"],["Philippines","🇵🇭"],["Portugal","🇵🇹"],["Malaisie","🇲🇾"],
  ["Maroc","🇲🇦"],["République tchèque","🇨🇿"]]),
HL50("med","Médailles olympiques","🥇",2,"CIO 2024",[
  ["États-Unis","🇺🇸"],["Russie","🇷🇺"],["Allemagne","🇩🇪"],["Royaume-Uni","🇬🇧"],
  ["France","🇫🇷"],["Italie","🇮🇹"],["Chine","🇨🇳"],["Australie","🇦🇺"],
  ["Hongrie","🇭🇺"],["Suède","🇸🇪"],["Japon","🇯🇵"],["Pays-Bas","🇳🇱"],
  ["Corée du Sud","🇰🇷"],["Roumanie","🇷🇴"],["Canada","🇨🇦"],["Pologne","🇵🇱"],
  ["Finlande","🇫🇮"],["Cuba","🇨🇺"],["Bulgarie","🇧🇬"],["Suisse","🇨🇭"],
  ["Norvège","🇳🇴"],["Danemark","🇩🇰"],["Espagne","🇪🇸"],["Brésil","🇧🇷"],
  ["Kenya","🇰🇪"],["Tchéquie","🇨🇿"],["Grèce","🇬🇷"],["Belgique","🇧🇪"],
  ["Ukraine","🇺🇦"],["Jamaïque","🇯🇲"],["Nouvelle-Zélande","🇳🇿"],["Autriche","🇦🇹"],
  ["Afrique du Sud","🇿🇦"],["Iran","🇮🇷"],["Turquie","🇹🇷"],["Mexique","🇲🇽"],
  ["Inde","🇮🇳"],["Argentine","🇦🇷"],["Éthiopie","🇪🇹"],["Égypte","🇪🇬"],
  ["Indonésie","🇮🇩"],["Croatie","🇭🇷"],["Portugal","🇵🇹"],["Irlande","🇮🇪"],
  ["Serbie","🇷🇸"],["Maroc","🇲🇦"],["Nigeria","🇳🇬"],["Thaïlande","🇹🇭"],
  ["Slovaquie","🇸🇰"],["Slovénie","🇸🇮"]]),
HL50("gold","Réserves d'or","🥇",3,"World Gold Council 2024",[
  ["États-Unis","🇺🇸"],["Allemagne","🇩🇪"],["Italie","🇮🇹"],["France","🇫🇷"],
  ["Russie","🇷🇺"],["Chine","🇨🇳"],["Suisse","🇨🇭"],["Japon","🇯🇵"],
  ["Inde","🇮🇳"],["Pays-Bas","🇳🇱"],["Turquie","🇹🇷"],["Taïwan","🇹🇼"],
  ["Portugal","🇵🇹"],["Ouzbékistan","🇺🇿"],["Arabie saoudite","🇸🇦"],["Royaume-Uni","🇬🇧"],
  ["Liban","🇱🇧"],["Espagne","🇪🇸"],["Autriche","🇦🇹"],["Kazakhstan","🇰🇿"],
  ["Thaïlande","🇹🇭"],["Belgique","🇧🇪"],["Singapour","🇸🇬"],["Suède","🇸🇪"],
  ["Afrique du Sud","🇿🇦"],["Mexique","🇲🇽"],["Libye","🇱🇾"],["Grèce","🇬🇷"],
  ["Pologne","🇵🇱"],["Philippines","🇵🇭"],["Irak","🇮🇶"],["Égypte","🇪🇬"],
  ["Australie","🇦🇺"],["Koweït","🇰🇼"],["Indonésie","🇮🇩"],["Brésil","🇧🇷"],
  ["Corée du Sud","🇰🇷"],["Danemark","🇩🇰"],["Pakistan","🇵🇰"],["Argentine","🇦🇷"],
  ["Qatar","🇶🇦"],["Finlande","🇫🇮"],["Bolivie","🇧🇴"],["Bulgarie","🇧🇬"],
  ["Malaisie","🇲🇾"],["Pérou","🇵🇪"],["Slovaquie","🇸🇰"],["Ukraine","🇺🇦"],
  ["Maroc","🇲🇦"],["Hongrie","🇭🇺"]]),
HL50("net","Internautes","🌐",2,"ITU 2024",[
  ["Chine","🇨🇳"],["Inde","🇮🇳"],["États-Unis","🇺🇸"],["Indonésie","🇮🇩"],
  ["Brésil","🇧🇷"],["Russie","🇷🇺"],["Nigeria","🇳🇬"],["Japon","🇯🇵"],
  ["Mexique","🇲🇽"],["Pakistan","🇵🇰"],["Allemagne","🇩🇪"],["Philippines","🇵🇭"],
  ["Vietnam","🇻🇳"],["Royaume-Uni","🇬🇧"],["Turquie","🇹🇷"],["Égypte","🇪🇬"],
  ["Iran","🇮🇷"],["France","🇫🇷"],["Thaïlande","🇹🇭"],["Italie","🇮🇹"],
  ["Corée du Sud","🇰🇷"],["Espagne","🇪🇸"],["Bangladesh","🇧🇩"],["Colombie","🇨🇴"],
  ["Argentine","🇦🇷"],["Canada","🇨🇦"],["Pologne","🇵🇱"],["Afrique du Sud","🇿🇦"],
  ["Ukraine","🇺🇦"],["Arabie saoudite","🇸🇦"],["Malaisie","🇲🇾"],["Maroc","🇲🇦"],
  ["Pérou","🇵🇪"],["Ouzbékistan","🇺🇿"],["Australie","🇦🇺"],["Taïwan","🇹🇼"],
  ["Pays-Bas","🇳🇱"],["Irak","🇮🇶"],["Venezuela","🇻🇪"],["Kazakhstan","🇰🇿"],
  ["Roumanie","🇷🇴"],["Chili","🇨🇱"],["Népal","🇳🇵"],["Sri Lanka","🇱🇰"],
  ["Belgique","🇧🇪"],["Équateur","🇪🇨"],["Cuba","🇨🇺"],["Guatemala","🇬🇹"],
  ["Tchéquie","🇨🇿"],["Suède","🇸🇪"]]),
HL50("car","Parc automobile","🚗",2,"OICA 2024",[
  ["Chine","🇨🇳"],["États-Unis","🇺🇸"],["Japon","🇯🇵"],["Russie","🇷🇺"],
  ["Allemagne","🇩🇪"],["Inde","🇮🇳"],["Italie","🇮🇹"],["France","🇫🇷"],
  ["Royaume-Uni","🇬🇧"],["Brésil","🇧🇷"],["Mexique","🇲🇽"],["Espagne","🇪🇸"],
  ["Indonésie","🇮🇩"],["Canada","🇨🇦"],["Pologne","🇵🇱"],["Corée du Sud","🇰🇷"],
  ["Australie","🇦🇺"],["Iran","🇮🇷"],["Turquie","🇹🇷"],["Thaïlande","🇹🇭"],
  ["Argentine","🇦🇷"],["Malaisie","🇲🇾"],["Ukraine","🇺🇦"],["Pays-Bas","🇳🇱"],
  ["Arabie saoudite","🇸🇦"],["Afrique du Sud","🇿🇦"],["Belgique","🇧🇪"],["Égypte","🇪🇬"],
  ["Philippines","🇵🇭"],["Vietnam","🇻🇳"],["Suède","🇸🇪"],["Autriche","🇦🇹"],
  ["Portugal","🇵🇹"],["Grèce","🇬🇷"],["Roumanie","🇷🇴"],["Suisse","🇨🇭"],
  ["Tchéquie","🇨🇿"],["Colombie","🇨🇴"],["Chili","🇨🇱"],["Maroc","🇲🇦"],
  ["Pakistan","🇵🇰"],["Nigeria","🇳🇬"],["Kazakhstan","🇰🇿"],["Hongrie","🇭🇺"],
  ["Israël","🇮🇱"],["Danemark","🇩🇰"],["Finlande","🇫🇮"],["Norvège","🇳🇴"],
  ["Irlande","🇮🇪"],["Pérou","🇵🇪"]]),
HL50("forest","Couverture forestière","🌳",3,"FAO 2024",[
  ["Russie","🇷🇺"],["Brésil","🇧🇷"],["Canada","🇨🇦"],["États-Unis","🇺🇸"],
  ["Chine","🇨🇳"],["RD Congo","🇨🇩"],["Australie","🇦🇺"],["Indonésie","🇮🇩"],
  ["Pérou","🇵🇪"],["Inde","🇮🇳"],["Mexique","🇲🇽"],["Colombie","🇨🇴"],
  ["Angola","🇦🇴"],["Bolivie","🇧🇴"],["Zambie","🇿🇲"],["Venezuela","🇻🇪"],
  ["Tanzanie","🇹🇿"],["Birmanie","🇲🇲"],["Argentine","🇦🇷"],["Papouasie-Nouvelle-Guinée","🇵🇬"],
  ["Suède","🇸🇪"],["Japon","🇯🇵"],["Mozambique","🇲🇿"],["Soudan","🇸🇩"],
  ["Finlande","🇫🇮"],["Espagne","🇪🇸"],["Cameroun","🇨🇲"],["Gabon","🇬🇦"],
  ["Centrafrique","🇨🇫"],["Congo","🇨🇬"],["Suriname","🇸🇷"],["Chili","🇨🇱"],
  ["Nigeria","🇳🇬"],["Allemagne","🇩🇪"],["Turquie","🇹🇷"],["Thaïlande","🇹🇭"],
  ["Norvège","🇳🇴"],["Malaisie","🇲🇾"],["Paraguay","🇵🇾"],["France","🇫🇷"],
  ["Vietnam","🇻🇳"],["Italie","🇮🇹"],["Laos","🇱🇦"],["Guyana","🇬🇾"],
  ["Éthiopie","🇪🇹"],["Cambodge","🇰🇭"],["Pologne","🇵🇱"],["Ukraine","🇺🇦"],
  ["Kenya","🇰🇪"],["Ghana","🇬🇭"]]),
HL50("bil","Milliardaires","💎",3,"Forbes 2024",[
  ["États-Unis","🇺🇸"],["Chine","🇨🇳"],["Inde","🇮🇳"],["Allemagne","🇩🇪"],
  ["Russie","🇷🇺"],["Italie","🇮🇹"],["Brésil","🇧🇷"],["Canada","🇨🇦"],
  ["Hong Kong","🇭🇰"],["Royaume-Uni","🇬🇧"],["France","🇫🇷"],["Suisse","🇨🇭"],
  ["Australie","🇦🇺"],["Suède","🇸🇪"],["Taïwan","🇹🇼"],["Japon","🇯🇵"],
  ["Singapour","🇸🇬"],["Corée du Sud","🇰🇷"],["Israël","🇮🇱"],["Indonésie","🇮🇩"],
  ["Espagne","🇪🇸"],["Turquie","🇹🇷"],["Thaïlande","🇹🇭"],["Mexique","🇲🇽"],
  ["Malaisie","🇲🇾"],["Philippines","🇵🇭"],["Autriche","🇦🇹"],["Égypte","🇪🇬"],
  ["Norvège","🇳🇴"],["Vietnam","🇻🇳"],["Tchéquie","🇨🇿"],["Chili","🇨🇱"],
  ["Liban","🇱🇧"],["Chypre","🇨🇾"],["Irlande","🇮🇪"],["Nouvelle-Zélande","🇳🇿"],
  ["Pologne","🇵🇱"],["Argentine","🇦🇷"],["Danemark","🇩🇰"],["Pays-Bas","🇳🇱"],
  ["Belgique","🇧🇪"],["Grèce","🇬🇷"],["Ukraine","🇺🇦"],["Monaco","🇲🇨"],
  ["Colombie","🇨🇴"],["Pérou","🇵🇪"],["Nigeria","🇳🇬"],["Afrique du Sud","🇿🇦"],
  ["Kazakhstan","🇰🇿"],["Roumanie","🇷🇴"]]),
];

/* ─── All countries for rankings autocomplete ─── */
const EXTRA=[
  {nm:"Bangladesh",f:"🇧🇩"},{nm:"Yémen",f:"🇾🇪"},{nm:"Soudan du Sud",f:"🇸🇸"},
  {nm:"Moldavie",f:"🇲🇩"},{nm:"Lituanie",f:"🇱🇹"},{nm:"Lettonie",f:"🇱🇻"},
  {nm:"Slovénie",f:"🇸🇮"},{nm:"Monténégro",f:"🇲🇪"},{nm:"Estonie",f:"🇪🇪"},
  {nm:"Koweït",f:"🇰🇼"},{nm:"Papouasie-Nouvelle-Guinée",f:"🇵🇬"},{nm:"Somalie",f:"🇸🇴"},
  {nm:"Libye",f:"🇱🇾"},{nm:"Centrafrique",f:"🇨🇫"},{nm:"Irak",f:"🇮🇶"},
  {nm:"Soudan",f:"🇸🇩"},{nm:"Syrie",f:"🇸🇾"},{nm:"Bulgarie",f:"🇧🇬"},
  {nm:"Biélorussie",f:"🇧🇾"},{nm:"Belarus",f:"🇧🇾"},{nm:"Bélarus",f:"🇧🇾"},
  {nm:"Taïwan",f:"🇹🇼"},{nm:"Haïti",f:"🇭🇹"},{nm:"Erythrée",f:"🇪🇷"},
  {nm:"Érythrée",f:"🇪🇷"},{nm:"Burundi",f:"🇧🇮"},{nm:"Costa Rica",f:"🇨🇷"},
  {nm:"Nouvelle-Zélande",f:"🇳🇿"},{nm:"Irlande",f:"🇮🇪"},{nm:"Israël",f:"🇮🇱"},
  {nm:"Belgique",f:"🇧🇪"},{nm:"Portugal",f:"🇵🇹"},{nm:"République du Congo",f:"🇨🇩"},
  {nm:"RDC",f:"🇨🇩"},{nm:"Congo",f:"🇨🇬"},{nm:"Hongrie",f:"🇭🇺"},
  {nm:"Pologne",f:"🇵🇱"},{nm:"Grèce",f:"🇬🇷"},{nm:"Zimbabwe",f:"🇿🇼"},
  {nm:"Venezuela",f:"🇻🇪"},{nm:"Liban",f:"🇱🇧"},{nm:"Afghanistan",f:"🇦🇫"},
  {nm:"Niger",f:"🇳🇪"},{nm:"Mali",f:"🇲🇱"},{nm:"Tchad",f:"🇹🇩"},
  {nm:"Angola",f:"🇦🇴"},{nm:"Burkina Faso",f:"🇧🇫"},{nm:"Guinée",f:"🇬🇳"},
  {nm:"Uganda",f:"🇺🇬"},{nm:"Ouganda",f:"🇺🇬"},{nm:"Madagascar",f:"🇲🇬"},
  {nm:"Nauru",f:"🇳🇷"},{nm:"Palaos",f:"🇵🇼"},{nm:"Îles Marshall",f:"🇲🇭"},
  {nm:"Tuvalu",f:"🇹🇻"},{nm:"Niue",f:"🇳🇺"},{nm:"Tonga",f:"🇹🇴"},
  {nm:"Samoa",f:"🇼🇸"},{nm:"Kiribati",f:"🇰🇮"},{nm:"Bermudes",f:"🇧🇲"},
  {nm:"Îles Caïmans",f:"🇰🇾"},{nm:"Bahamas",f:"🇧🇸"},{nm:"Barbade",f:"🇧🇧"},
  {nm:"Jordanie",f:"🇯🇴"},{nm:"Corée du Nord",f:"🇰🇵"},{nm:"Macédoine du Nord",f:"🇲🇰"},
  {nm:"Brunei",f:"🇧🇳"},{nm:"Fidji",f:"🇫🇯"},{nm:"Vanuatu",f:"🇻🇺"},
  {nm:"Îles Salomon",f:"🇸🇧"},{nm:"São Tomé-et-Príncipe",f:"🇸🇹"},
  {nm:"Turkménistan",f:"🇹🇲"},{nm:"Albanie",f:"🇦🇱"},{nm:"Bosnie",f:"🇧🇦"},
  {nm:"Kosovo",f:"🇽🇰"},{nm:"Macédoine",f:"🇲🇰"},{nm:"Chypre",f:"🇨🇾"},
  {nm:"Malte",f:"🇲🇹"},{nm:"Liechtenstein",f:"🇱🇮"},{nm:"San Marin",f:"🇸🇲"},
  {nm:"Andorre",f:"🇦🇩"},{nm:"El Salvador",f:"🇸🇻"},{nm:"Panama",f:"🇵🇦"},
  {nm:"Rwanda",f:"🇷🇼"},{nm:"Arménie",f:"🇦🇲"},{nm:"Azerbaïdjan",f:"🇦🇿"},
  {nm:"Hong Kong",f:"🇭🇰"},{nm:"Macao",f:"🇲🇴"},{nm:"Gambie",f:"🇬🇲"},
  {nm:"Djibouti",f:"🇩🇯"},{nm:"Mauritanie",f:"🇲🇷"},{nm:"Angleterre",f:"🏴󠁧󠁢󠁥󠁮󠁧󠁿"},
  {nm:"Écosse",f:"🏴󠁧󠁢󠁳󠁣󠁴󠁿"},{nm:"Galles",f:"🏴󠁧󠁢󠁷󠁬󠁳󠁿"},
  {nm:"Tadjikistan",f:"🇹🇯"},{nm:"Kirghizistan",f:"🇰🇬"},{nm:"Lesotho",f:"🇱🇸"},
  {nm:"Bolivie",f:"🇧🇴"},{nm:"Mozambique",f:"🇲🇿"},{nm:"Zambie",f:"🇿🇲"},
  {nm:"Bahreïn",f:"🇧🇭"},{nm:"Maldives",f:"🇲🇻"},{nm:"Liban",f:"🇱🇧"},
  {nm:"Myanmar",f:"🇲🇲"},{nm:"Honduras",f:"🇭🇳"},{nm:"Guatemala",f:"🇬🇹"},
  {nm:"République dominicaine",f:"🇩🇴"},{nm:"Équateur",f:"🇪🇨"},{nm:"Porto Rico",f:"🇵🇷"},
  {nm:"Corée du Nord",f:"🇰🇵"},{nm:"Cuba",f:"🇨🇺"},{nm:"Côte d'Ivoire",f:"🇨🇮"},
  {nm:"Ghana",f:"🇬🇭"},{nm:"Cameroun",f:"🇨🇲"},{nm:"Nigeria",f:"🇳🇬"},
  {nm:"Sri Lanka",f:"🇱🇰"},{nm:"Kenya",f:"🇰🇪"},{nm:"Éthiopie",f:"🇪🇹"},
  {nm:"Tanzanie",f:"🇹🇿"},{nm:"Ouganda",f:"🇺🇬"},{nm:"Pérou",f:"🇵🇪"},
  {nm:"Colombie",f:"🇨🇴"},{nm:"Chili",f:"🇨🇱"},{nm:"Argentine",f:"🇦🇷"},
  {nm:"Tchéquie",f:"🇨🇿"},{nm:"Palau",f:"🇵🇼"},
  {nm:"RD Congo",f:"🇨🇩"},{nm:"Birmanie",f:"🇲🇲"},{nm:"Suriname",f:"🇸🇷"},
  {nm:"Gabon",f:"🇬🇦"},{nm:"Laos",f:"🇱🇦"},
];
const ALL_C = [...WORLD.map(c=>({nm:c.nm,f:c.f})),...EXTRA]
  .filter((c,i,a)=>a.findIndex(x=>norm(x.nm)===norm(c.nm))===i);

/* ═══════════════════════════════════════════════════════
   INDICES — WORLD / FRANCE
═══════════════════════════════════════════════════════ */
const WORLD_HINTS=[
  {id:"city",icon:"🏙️",label:"Ville",col:"#0066FF",fn:c=>c.ci},
  {id:"neighbor",icon:"🗺️",label:"Pays voisin",col:"#007AFF",fn:c=>c.nb.length?c.nb.map(v=>`Frontalier : ${v}`):["Pays insulaire (aucun voisin terrestre)"]},
  {id:"climate",icon:"🌡️",label:"Climat",col:"#34AADC",fn:c=>[c.cl]},
  {id:"cuisine",icon:"🍽️",label:"Spécialité culinaire",col:"#32D74B",fn:c=>c.cu},
  {id:"lang",icon:"🗣️",label:"Langue officielle",col:"#30D158",fn:c=>c.lg},
  {id:"lang2",icon:"🔤",label:"Langue secondaire",col:"#34C759",fn:c=>c.l2.length?c.l2:["Pays largement monolingue"]},
  {id:"animal",icon:"🦁",label:"Animal national",col:"#FFD60A",fn:c=>[c.an]},
  {id:"sport",icon:"⚽",label:"Sport populaire",col:"#FF9F0A",fn:c=>c.sp},
  {id:"celeb",icon:"⭐",label:"Personnalité célèbre",col:"#FF2D55",fn:c=>c.ce},
  {id:"capital",icon:"🏛️",label:"Capitale",col:"#BF5AF2",fn:c=>[c.cap]},
  {id:"currency",icon:"💱",label:"Monnaie",col:"#64D2FF",fn:c=>[c.mon]},
  {id:"religion",icon:"🕌",label:"Religion majoritaire",col:"#FFD60A",fn:c=>[c.rel]},
  {id:"sea",icon:"🌊",label:"Mer ou océan adjacent",col:"#5AC8FA",fn:c=>[c.mer]},
  {id:"tz",icon:"🕐",label:"Fuseau horaire",col:"#AC8E68",fn:c=>[c.tz]},
  {id:"area",icon:"📐",label:"Superficie",col:"#FF6961",fn:c=>[c.ar]},
  {id:"pop",icon:"👥",label:"Population",col:"#6E6E73",fn:c=>[c.po]},
  {id:"continent",icon:"🌍",label:"Continent",col:"#30B0C7",
    fn:c=>{const m={eu:"Europe",na:"Amérique du Nord",sa:"Amérique du Sud",af:"Afrique",as:"Asie",oc:"Océanie",micro:"Micro-état"};return[...new Set(c.tg.map(t=>m[t]).filter(Boolean))];}},
  {id:"flag",icon:"🚩",label:"Drapeau",col:"#32D74B",fn:c=>[c.f]},
  {id:"scramble",icon:"🔀",label:"Lettres mélangées",col:"#FF2D55",fn:c=>[scram(c.nm)]},
];
const FRANCE_HINTS=[
  {id:"region",icon:"🗺️",label:"Région administrative",col:"#0066FF",fn:c=>[c.rg]},
  {id:"dept",icon:"🏛️",label:"Département",col:"#007AFF",fn:c=>[c.dp]},
  {id:"river",icon:"🌊",label:"Fleuve ou rivière",col:"#5AC8FA",fn:c=>[c.rv]},
  {id:"cuisine",icon:"🍽️",label:"Spécialité culinaire",col:"#FF9F0A",fn:c=>c.cu},
  {id:"club",icon:"⚽",label:"Club de sport",col:"#32D74B",fn:c=>[c.cl]},
  {id:"celeb",icon:"⭐",label:"Célébrité née ou liée",col:"#FF2D55",fn:c=>c.ce},
  {id:"economy",icon:"🏭",label:"Économie locale",col:"#FFD60A",fn:c=>[c.ec]},
  {id:"nickname",icon:"🎭",label:"Surnom de la ville",col:"#BF5AF2",fn:c=>[c.su]},
  {id:"univ",icon:"🎓",label:"Université ou école",col:"#34AADC",fn:c=>[c.un]},
  {id:"pop",icon:"👥",label:"Population",col:"#6E6E73",fn:c=>[c.po]},
  {id:"letters",icon:"🔢",label:"Nombre de lettres",col:"#AC8E68",fn:c=>[`${c.nm.replace(/[- ']/g,"").length} lettres`]},
  {id:"scramble",icon:"🔀",label:"Lettres mélangées",col:"#FF6961",fn:c=>[scram(c.nm)]},
];

function buildHints(entry,maxH,chaosMode,fakeMode,hintDefs){
  const regular=hintDefs.filter(h=>h.id!=="flag"&&h.id!=="scramble");
  const tail=hintDefs.filter(h=>h.id==="flag"||h.id==="scramble");
  let seq=chaosMode?shuf([...regular]):[...regular];
  seq=[...seq.slice(0,Math.max(1,maxH-tail.length)),...tail].slice(0,maxH);
  const db=entry._type==="world"?WORLD:FRANCE;
  return seq.map((def,idx)=>{
    const vals=def.fn(entry).filter(Boolean);
    let value=pick(vals.length?vals:["—"]);
    if(fakeMode&&idx===1&&def.id!=="flag"&&def.id!=="scramble"){
      const other=db.filter(x=>x.nm!==entry.nm);
      if(other.length){const ov=def.fn(pick(other)).filter(Boolean);if(ov.length)value=pick(ov);}
    }
    return{...def,value,isFake:fakeMode&&idx===1};
  });
}

/* ─── Score NationRush — 10/8/6/4/2/1 selon l'indice ─── */
const PTS_TABLE=[10,8,6,4,2];
function roundPoints(hi){ return hi<PTS_TABLE.length?PTS_TABLE[hi]:1; }

/* ─── NationRush Presets (lancement rapide) ─── */
const PRESETS=[
  {id:"speed",icon:"⚡",name:"Speed",col:"#FF9F0A",rounds:10,maxH:11,timer:7,chaos:false,fake:false},
  {id:"hardcore",icon:"💀",name:"Hardcore",col:"#FF6961",rounds:10,maxH:3,timer:0,chaos:false,fake:false},
];
function filterDB(diff,region,gt){
  if(gt==="france") return FRANCE;
  return WORLD.filter(c=>{
    if(!diff.includes(c.d)) return false;
    if(region==="all") return true;
    if(region==="micro") return c.tg.includes("micro");
    if(region==="rare") return c.d>=3;
    if(region==="am") return c.tg.includes("na")||c.tg.includes("sa");
    return c.tg.includes(region);
  });
}

/* ═══════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════ */
const CSS=`
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%;background:#0a0e1a;color:#1C1C1E;-webkit-font-smoothing:antialiased}
body,input,button{font-family:'Helvetica Neue',Helvetica,-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif}
input,button{outline:none;border:none;background:none;-webkit-tap-highlight-color:transparent}
button{cursor:pointer}
::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:rgba(0,0,0,.1);border-radius:2px}
:root{
  --bg:#EFEFF2;--s0:#FFF;--s1:#F9F9FB;--s2:#F1F1F4;--s3:#E3E3E8;
  --bd:rgba(0,0,0,.1);--bd2:rgba(0,0,0,.16);
  --t1:#1C1C1E;--t2:#3A3A3C;--t3:#6E6E73;--t4:#AEAEB2;--t5:#C7C7CC;
  --blue:#0066FF;--green:#32D74B;--red:#FF3B30;--orange:#FF9F0A;--yellow:#FFD60A;--purple:#BF5AF2;--cyan:#5AC8FA;
  /* Ombres "bloc" voxel : une face latérale nette + profondeur douce */
  --sh:0 2px 0 rgba(0,0,0,.06),0 3px 8px rgba(0,0,0,.07);
  --sh2:0 4px 0 rgba(0,0,0,.07),0 6px 16px rgba(0,0,0,.09);
  --sh3:0 6px 0 rgba(0,0,0,.08),0 12px 32px rgba(0,0,0,.12);
  /* rayons légèrement carrés */
  --r1:7px;--r2:10px;--r3:13px;
}
/* fond géré par le composant scène animée */
@keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes sr{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:translateX(0)}}
@keyframes sp{0%{opacity:0;transform:scale(.82)translateY(18px)}65%{transform:scale(1.04)translateY(-2px)}100%{opacity:1;transform:scale(1)translateY(0)}}
@keyframes flt{0%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-56px)}}
@keyframes shk{0%,100%{transform:translateX(0)}25%{transform:translateX(-9px)}75%{transform:translateX(9px)}}
@keyframes shrink{from{width:100%}to{width:0}}
@keyframes shu{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
@keyframes blk{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes badge{0%{transform:scale(1)}40%{transform:scale(1.2)}100%{transform:scale(1)}}
@keyframes slotReveal{0%{background:rgba(50,215,75,.25);transform:scale(1.02)}100%{background:var(--s0);transform:scale(1)}}
@keyframes wrongFlash{0%{background:rgba(255,59,48,.15)}100%{background:var(--s2)}}
@keyframes confetti{0%{opacity:1;transform:scale(1)translateY(0)}100%{opacity:0;transform:scale(1.5)translateY(-30px)}}
@keyframes xpfill{from{width:0}}
@keyframes flagFloat{0%{transform:translateY(0) rotate(var(--rot,0deg))}50%{transform:translateY(-26px) rotate(calc(var(--rot,0deg) + 6deg))}100%{transform:translateY(0) rotate(var(--rot,0deg))}}
@keyframes flagDrift{0%{transform:translate(0,0)}100%{transform:translate(var(--dx,40px),var(--dy,-60px))}}
@keyframes auroraShift{0%{transform:translate(0,0) scale(1)}33%{transform:translate(6%,-4%) scale(1.12)}66%{transform:translate(-5%,5%) scale(.95)}100%{transform:translate(0,0) scale(1)}}
@keyframes gridScroll{from{background-position:0 0}to{background-position:0 44px}}

.afu{animation:fu .4s cubic-bezier(.4,0,.2,1) both}
.asr{animation:sr .36s cubic-bezier(.4,0,.2,1) both}
.asp{animation:sp .52s cubic-bezier(.34,1.56,.64,1) both}
.aflt{animation:flt 1.4s ease-out forwards;pointer-events:none;position:absolute}
.ashk{animation:shk .38s ease-in-out}
.ashu{animation:shu .44s cubic-bezier(.34,1.56,.64,1) both}
.abadge{animation:badge .3s cubic-bezier(.34,1.56,.64,1)}
.arev{animation:slotReveal .55s cubic-bezier(.4,0,.2,1) forwards}
.awrong{animation:wrongFlash .5s ease-out forwards}

.surface{background:var(--s0);border:1.5px solid var(--bd);border-radius:var(--r2);box-shadow:var(--sh)}
.surface-lg{background:var(--s0);border:1.5px solid var(--bd);border-radius:var(--r3);box-shadow:var(--sh2)}
.surface-hint{background:var(--s0);border:2px solid var(--bd2);border-radius:var(--r3);box-shadow:var(--sh2)}
.surface-ok{background:linear-gradient(135deg,rgba(50,215,75,.07),rgba(48,209,88,.04));border:2px solid rgba(50,215,75,.22);border-radius:var(--r2)}
.surface-fail{background:rgba(255,59,48,.04);border:2px solid rgba(255,59,48,.18);border-radius:var(--r2)}

.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:var(--r2);font-weight:700;font-size:.95rem;letter-spacing:-.01em;transition:transform .08s cubic-bezier(.4,0,.2,1),box-shadow .08s,opacity .12s}
.btn:active{transform:translateY(2px)!important;box-shadow:0 0 0 rgba(0,0,0,.2)!important}
.btn-blue{background:var(--blue);color:#fff;box-shadow:0 4px 0 #0048b3,0 5px 10px rgba(0,102,255,.3)}
.btn-blue:hover{transform:translateY(-1px);box-shadow:0 5px 0 #0048b3,0 7px 14px rgba(0,102,255,.36)}
.btn-gold{background:linear-gradient(135deg,#FF9F0A,#FFD60A);color:#fff;box-shadow:0 4px 0 #cc7a00,0 5px 10px rgba(255,159,10,.3)}
.btn-gold:hover{transform:translateY(-1px);box-shadow:0 5px 0 #cc7a00,0 7px 14px rgba(255,159,10,.36)}
.btn-green{background:var(--green);color:#fff;box-shadow:0 4px 0 #239636,0 5px 10px rgba(50,215,75,.28)}
.btn-green:hover{transform:translateY(-1px);box-shadow:0 5px 0 #239636,0 7px 14px rgba(50,215,75,.36)}
.btn-purple{background:var(--purple);color:#fff;box-shadow:0 4px 0 #8e3fc4,0 5px 10px rgba(191,90,242,.3)}
.btn-purple:hover{transform:translateY(-1px);box-shadow:0 5px 0 #8e3fc4,0 7px 14px rgba(191,90,242,.36)}
.btn-ghost{background:var(--s0);border:2px solid var(--bd2);color:var(--t2);box-shadow:0 3px 0 var(--s3)}
.btn-ghost:hover{background:var(--s1);transform:translateY(-1px);box-shadow:0 4px 0 var(--s3)}

.hint-btn{background:var(--s0);border:2px solid var(--bd);border-radius:var(--r3);width:100%;padding:18px 20px;display:flex;align-items:center;justify-content:space-between;gap:14px;cursor:pointer;transition:all .12s cubic-bezier(.4,0,.2,1);box-shadow:var(--sh)}
.hint-btn:hover{box-shadow:var(--sh2);transform:translateY(-2px);border-color:var(--bd2)}
.hint-btn:active{transform:translateY(1px);box-shadow:var(--sh)}
.hint-btn-last{border-color:rgba(255,59,48,.3);background:rgba(255,59,48,.04)}

.inp{width:100%;background:var(--s0);border:2px solid var(--bd2);border-radius:var(--r2);padding:15px 18px;color:var(--t1);font-size:1rem;font-weight:600;transition:border-color .18s,box-shadow .18s;box-shadow:inset 0 2px 0 rgba(0,0,0,.03)}
.inp:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(0,102,255,.14)}
.inp::placeholder{color:var(--t5);font-weight:500}

.sugg{background:var(--s0);border:2px solid var(--bd2);border-radius:var(--r2);overflow:hidden;box-shadow:var(--sh3)}
.sugg-row{padding:12px 17px;cursor:pointer;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--bd);transition:background .1s}
.sugg-row:hover{background:var(--s2)}
.sugg-row:last-child{border-bottom:none}

.lbox{display:inline-flex;align-items:center;justify-content:center;width:2.15rem;height:2.55rem;margin:2px;background:var(--s2);border:2px solid var(--bd2);border-radius:5px;font-size:1.22rem;font-weight:800;color:var(--blue);box-shadow:0 2px 0 var(--bd2)}

.dot{height:7px;border-radius:2px;transition:all .28s cubic-bezier(.4,0,.2,1)}
.chip{display:inline-flex;align-items:center;padding:.2rem .6rem;border-radius:5px;font-size:.62rem;font-weight:800;letter-spacing:.4px}
.overlay{position:fixed;inset:0;background:rgba(239,239,242,.82);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);z-index:60;display:flex;align-items:flex-end;justify-content:center;padding:12px}
.sheet{background:var(--s0);border:2px solid var(--bd2);border-radius:var(--r3);width:100%;max-width:450px;padding:26px 22px;box-shadow:var(--sh3)}
.tag{padding:.44rem .9rem;border-radius:6px;font-size:.8rem;font-weight:700;cursor:pointer;transition:all .12s;border:2px solid var(--bd2);background:var(--s2);color:var(--t3);box-shadow:0 2px 0 var(--bd)}
.tag.on{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 2px 0 #0048b3}
.tag:hover:not(.on){background:var(--s3);color:var(--t1)}
.tag:active{transform:translateY(2px);box-shadow:none}
.mcard{border-radius:var(--r3);padding:1.2rem 1rem;text-align:center;cursor:pointer;transition:all .15s cubic-bezier(.4,0,.2,1);background:var(--s0);border:2px solid var(--bd);box-shadow:var(--sh2);flex:1}
.mcard:hover{transform:translateY(-3px);box-shadow:var(--sh3)}
.mcard:active{transform:translateY(0);box-shadow:var(--sh)}
.pill{border-radius:var(--r2);padding:.7rem 1.1rem;cursor:pointer;transition:all .12s;border:2px solid var(--bd);background:var(--s0);box-shadow:0 3px 0 var(--bd);display:flex;align-items:center;gap:.55rem}
.pill:hover{transform:translateY(-1px);box-shadow:0 4px 0 var(--bd)}
.pill:active{transform:translateY(3px);box-shadow:none}
.slbl{font-size:.7rem;font-weight:800;color:rgba(255,255,255,.5);letter-spacing:.12em;text-transform:uppercase;display:block;margin-bottom:.6rem}
.blob{position:fixed;border-radius:50%;filter:blur(80px);pointer-events:none;z-index:0}
/* ── Arrière-plan animé sombre par mode ── */
.scene{position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none}
.scene-base{position:absolute;inset:0;transition:background .6s ease}
.aurora{position:absolute;border-radius:50%;filter:blur(90px);opacity:.4;will-change:transform}
.scene-grid{position:absolute;inset:0;opacity:.5;
  background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);
  background-size:44px 44px;animation:gridScroll 9s linear infinite}
.flag-float{position:absolute;will-change:transform;user-select:none;filter:drop-shadow(0 4px 10px rgba(0,0,0,.5));animation:flagFloat var(--dur,7s) ease-in-out infinite}
.scene-vignette{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(0,0,0,.55) 100%)}
.score-num{font-variant-numeric:tabular-nums;font-feature-settings:'tnum'}

/* Rankings specific */
.rank-slot{border-radius:var(--r2);padding:12px 15px;display:flex;align-items:center;gap:12px;transition:all .3s cubic-bezier(.4,0,.2,1);border:2px solid var(--bd);background:var(--s1)}
.rank-slot.revealed{background:var(--s0);border-color:rgba(50,215,75,.35);box-shadow:0 3px 0 rgba(50,215,75,.15)}
.rank-slot.just-revealed{animation:slotReveal .55s cubic-bezier(.4,0,.2,1) forwards}
.rank-slot.hidden{background:var(--s2);border-color:var(--bd)}
.rank-num{width:30px;height:30px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.82rem;flex-shrink:0}
.wrong-pill{display:inline-flex;align-items:center;gap:5px;padding:.28rem .65rem;background:rgba(255,59,48,.08);border:1.5px solid rgba(255,59,48,.2);border-radius:6px;font-size:.75rem;font-weight:700;color:var(--red)}
.diff-badge{display:inline-flex;align-items:center;padding:.2rem .6rem;border-radius:5px;font-size:.62rem;font-weight:800}
/* XP bar voxel */
.xpbar{height:14px;background:var(--s3);border:2px solid var(--bd2);border-radius:5px;overflow:hidden;position:relative}
.xpfill{height:100%;background:linear-gradient(90deg,var(--green),#5be36a);border-right:2px solid #239636;transition:width .5s cubic-bezier(.4,0,.2,1)}
.chal-card{background:var(--s0);border:2px solid var(--bd);border-radius:var(--r2);padding:.85rem 1rem;display:flex;align-items:center;gap:.8rem;box-shadow:var(--sh);transition:all .15s}
.chal-card.done{background:linear-gradient(135deg,rgba(50,215,75,.1),rgba(50,215,75,.04));border-color:rgba(50,215,75,.35)}
.chal-check{width:30px;height:30px;border-radius:6px;border:2px solid var(--bd2);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem;font-weight:800;transition:all .2s}
.chal-check.on{background:var(--green);border-color:#239636;color:#fff;box-shadow:0 2px 0 #239636}
`;

/* ═══════════════════════════════════════════════════════
   XP, NIVEAUX & DÉFIS QUOTIDIENS
═══════════════════════════════════════════════════════ */
// Courbe de niveau : XP cumulée pour atteindre un niveau. Niveau 1 = 0 XP.
const xpForLevel = lvl => lvl<=1?0:Math.round(70*Math.pow(lvl-1,1.55));
const levelFromXP = xp => { let l=1; while(xp>=xpForLevel(l+1)) l++; return l; };

// Pool de défis. type = condition vérifiée à la fin d'une partie.
// ctx = {mode, score, rounds, found, accuracy, combo, perfect, win, rankFound, impFound, impRank}
const CHALLENGE_POOL=[
  // ── Simples ──
  {id:"play1",   t:"Joue une partie",                  xp:20, icon:"🎮", chk:c=>true},
  {id:"world_play",t:"Joue en Pays du Monde",           xp:25, icon:"🌍", chk:c=>c.mode==="world"},
  {id:"fr_play", t:"Joue aux Villes de France",         xp:25, icon:"🇫🇷", chk:c=>c.mode==="france"},
  {id:"hl_play", t:"Joue une partie de Plus ou Moins",  xp:25, icon:"⬆️", chk:c=>c.mode==="highlow"},
  {id:"imp_play",t:"Joue une partie d'Imposteur",       xp:25, icon:"🕵️", chk:c=>c.mode==="impostor"},
  {id:"rank_play",t:"Joue un Top 10 Mondial",           xp:25, icon:"🏆", chk:c=>c.mode==="rankings"},
  {id:"find3",   t:"Trouve 3 bonnes réponses",          xp:30, icon:"✅", chk:c=>c.found>=3},
  // ── Moyens ──
  {id:"score30", t:"Marque 30 points en une partie",    xp:45, icon:"💯", chk:c=>c.score>=30},
  {id:"combo3",  t:"Atteins une série de 3",            xp:40, icon:"🔥", chk:c=>c.combo>=3},
  {id:"hl5",     t:"Fais 5 bonnes réponses en Plus/Moins",xp:45,icon:"⬆️",chk:c=>c.mode==="highlow"&&c.score>=5},
  {id:"imp3",    t:"Démasque 3 imposteurs",             xp:45, icon:"🕵️", chk:c=>c.mode==="impostor"&&c.impFound>=3},
  {id:"acc70",   t:"Termine avec 70% de précision",     xp:50, icon:"🎯", chk:c=>c.accuracy>=70&&c.rounds>=5},
  {id:"rank5",   t:"Trouve 5 pays dans un Top 10",      xp:45, icon:"🏆", chk:c=>c.mode==="rankings"&&c.rankFound>=5},
  // ── Difficiles ──
  {id:"score60", t:"Marque 60 points en une partie",    xp:80, icon:"🚀", chk:c=>c.score>=60},
  {id:"combo6",  t:"Atteins une série de 6",            xp:75, icon:"⚡", chk:c=>c.combo>=6},
  {id:"perfect", t:"Termine une partie sans erreur",    xp:90, icon:"💎", chk:c=>c.perfect&&c.rounds>=5},
  {id:"hl10",    t:"Fais 10 bonnes réponses en Plus/Moins",xp:85,icon:"🌟",chk:c=>c.mode==="highlow"&&c.score>=10},
  {id:"imp_rank",t:"Devine le rang exact en Imposteur", xp:80, icon:"🎖️", chk:c=>c.mode==="impostor"&&c.impRank>=1},
  {id:"rank_full",t:"Complète un Top 10 entier",        xp:100,icon:"👑", chk:c=>c.mode==="rankings"&&c.rankFound>=10},
];

// Sélectionne 4 défis du jour de façon déterministe (même pour tout le monde un jour donné)
function dailyChallenges(dateStr){
  // hash simple de la date
  let h=0; for(let i=0;i<dateStr.length;i++){h=(h*31+dateStr.charCodeAt(i))>>>0;}
  const pool=[...CHALLENGE_POOL];
  // mélange déterministe (Fisher-Yates avec PRNG seedé)
  let seed=h;
  const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  // garantir un mix : 1 simple, 2 moyens, 1 difficile si possible
  const simple=pool.filter(c=>c.xp<=30);
  const medium=pool.filter(c=>c.xp>30&&c.xp<70);
  const hard=pool.filter(c=>c.xp>=70);
  const pick=(arr,n)=>arr.slice(0,n);
  const chosen=[...pick(simple,1),...pick(medium,2),...pick(hard,1)];
  // compléter à 4 si une catégorie manque
  while(chosen.length<4){const c=pool.find(x=>!chosen.includes(x));if(!c)break;chosen.push(c);}
  return chosen.slice(0,4);
}

const todayStr = () => new Date().toISOString().slice(0,10);

/* ═══════════════════════════════════════════════════════
   ARRIÈRE-PLAN ANIMÉ — sombre, varié selon le mode
═══════════════════════════════════════════════════════ */
const BG_THEMES={
  menu:    {base:"radial-gradient(ellipse at 30% 20%,#15203a 0%,#0a0e1a 60%)", auroras:["#1e3a8a","#0066FF","#3b1d6e"], flags:["🌍","🗺️","🧭","🏔️","🌐","🛬","🏝️","🗽"]},
  world:   {base:"radial-gradient(ellipse at 70% 25%,#0d2547 0%,#070d1c 65%)", auroras:["#0066FF","#1e40af","#0ea5e9"], flags:["🇫🇷","🇯🇵","🇧🇷","🇪🇬","🇮🇳","🇨🇦","🇦🇺","🇿🇦","🇩🇪","🇲🇽"]},
  rankings:{base:"radial-gradient(ellipse at 25% 30%,#3a2410 0%,#160d05 65%)", auroras:["#FF9F0A","#b45309","#FFD60A"], flags:["🥇","🏆","🇺🇸","🇨🇳","🇷🇺","🇬🇧","📊","🇮🇹","🇯🇵","🇩🇪"]},
  highlow: {base:"radial-gradient(ellipse at 70% 25%,#0c3320 0%,#04140c 65%)", auroras:["#32D74B","#15803d","#5be36a"], flags:["⬆️","⬇️","🇰🇷","🇸🇪","🇳🇴","🇨🇭","📈","🇳🇱","🇪🇸","🇨🇱"]},
  impostor:{base:"radial-gradient(ellipse at 30% 25%,#2a1245 0%,#10061f 65%)", auroras:["#BF5AF2","#7e22ce","#a855f7"], flags:["🕵️","❓","🎭","🇹🇷","🇮🇷","🇵🇱","🇦🇷","🇹🇭","🇻🇳","🇵🇭"]},
  france:  {base:"radial-gradient(ellipse at 70% 20%,#0b1c3f 0%,#06101f 65%)", auroras:["#1B4FBB","#0066FF","#dc2626"], flags:["🇫🇷","🥐","🗼","🧀","🍷","⚜️","🥖","🏰","🚲","⛪"]},
};
// positions/tailles pseudo-aléatoires stables pour les drapeaux
const FLAG_SPOTS=[
  {l:"8%", t:"18%", s:"2.1rem",dur:"7s", del:"0s",  rot:"-8deg"},
  {l:"82%",t:"12%", s:"1.6rem",dur:"9s", del:"1.2s",rot:"10deg"},
  {l:"16%",t:"68%", s:"1.8rem",dur:"8s", del:".6s", rot:"6deg"},
  {l:"72%",t:"72%", s:"2.3rem",dur:"6.5s",del:"2s", rot:"-12deg"},
  {l:"45%",t:"8%",  s:"1.4rem",dur:"10s",del:".3s", rot:"4deg"},
  {l:"90%",t:"45%", s:"1.7rem",dur:"7.5s",del:"1.8s",rot:"-6deg"},
  {l:"4%", t:"44%", s:"1.5rem",dur:"8.5s",del:"1s",  rot:"8deg"},
  {l:"38%",t:"82%", s:"1.9rem",dur:"7.2s",del:".9s", rot:"-10deg"},
  {l:"60%",t:"40%", s:"1.3rem",dur:"11s",del:"2.4s",rot:"5deg"},
  {l:"26%",t:"34%", s:"1.5rem",dur:"9.5s",del:"1.5s",rot:"-5deg"},
];
function AnimatedBG({mode}){
  const th=BG_THEMES[mode]||BG_THEMES.menu;
  const flags=th.flags;
  return(
    <div className="scene" aria-hidden="true">
      <div className="scene-base" style={{background:th.base}}/>
      {/* auroras colorées animées */}
      {th.auroras.map((c,i)=>(
        <div key={i} className="aurora" style={{
          width:["46vw","38vw","52vw"][i%3],height:["46vw","38vw","52vw"][i%3],
          background:c,
          left:[`${-8+i*30}%`,`${55-i*10}%`,`${20+i*18}%`][i%3],
          top:[`${-6+i*8}%`,`${50-i*6}%`,`${30+i*4}%`][i%3],
          animation:`auroraShift ${14+i*4}s ease-in-out ${i*1.5}s infinite`,
        }}/>
      ))}
      <div className="scene-grid"/>
      {/* drapeaux flottants */}
      {FLAG_SPOTS.map((sp,i)=>(
        <span key={i} className="flag-float" style={{
          left:sp.l,top:sp.t,fontSize:sp.s,
          ["--dur"]:sp.dur,["--rot"]:sp.rot,
          animationDelay:sp.del,
          opacity:.32,
        }}>{flags[i%flags.length]}</span>
      ))}
      <div className="scene-vignette"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════ */
export default function NationRush(){
  /* ─ screens & game type ─ */
  const [scr,  setScrn] = useState("menu");
  const [gt,   setGT]   = useState("world");  // "world"|"rankings"|"france"

  /* ─ NationRush state ─ */
  const [cfg,  setCfg]  = useState({id:"custom",icon:"⚙️",name:"Partie",col:"#0066FF",rounds:10,maxH:11,timer:0,chaos:false,fake:false});
  const [q,    setQ]    = useState([]);
  const [qi,   setQi]   = useState(0);
  const [hints,setHI]   = useState([]);
  const [hi,   setHi]   = useState(0);
  const [phase,setPh]   = useState("playing");
  const [score,setSc]   = useState(0);
  const [guess,setGs]   = useState("");
  const [sugg, setSg]   = useState([]);
  const [shake,setShk]  = useState(false);
  const [revC, setRC]   = useState(null);
  const [bkd,  setBkd]  = useState(null);
  const [sheet,setSht]  = useState(false);
  const [flt,  setFlt]  = useState(null);
  const [spT,  setSpT]  = useState(0);
  const [rOk,  setROk]  = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [paused,setPaused]=useState(false);
  const [canResume,setCanResume]=useState(false);
  const [cx,   setCx]   = useState({rounds:10,timer:0,maxH:11,diff:[1,2,3,4],region:"all",chaos:false,fake:false});

  /* ─ Rankings state ─ */
  const [rCat,   setRCat]   = useState(null);
  const [rSlots, setRSlots] = useState([]);
  const [rLives, setRLives] = useState(3);
  const [rScore, setRScore] = useState(0);   // total accumulé
  const [rRoundSc,setRRoundSc]=useState(0);  // score manche en cours (avant bonus)
  const [rRound, setRRound] = useState(1);   // 1..3
  const [rGuess, setRGuess] = useState("");
  const [rSugg,  setRSugg]  = useState([]);
  const [rWrong, setRWrong] = useState([]);
  const [rShake, setRShake] = useState(false);
  const [rPhase, setRPhase] = useState("playing"); // "playing"|"round_end"|"game_end"
  const [rHist,  setRHist]  = useState([]);
  const [showMissing, setShowMissing] = useState(false);

  /* ─ Plus ou Moins state ─ */
  const [hlCat,   setHlCat]   = useState(null);
  const [hlLeft,  setHlLeft]  = useState(null);   // pays affiché (révélé)
  const [hlRight, setHlRight] = useState(null);   // pays à deviner
  const [hlScore, setHlScore] = useState(0);
  const [hlCombo, setHlCombo] = useState(0);
  const [hlLives, setHlLives] = useState(3);
  const [hlPhase, setHlPhase] = useState("playing"); // "playing"|"reveal"|"over"
  const [hlPick,  setHlPick]  = useState(null);   // "higher"|"lower" choisi
  const [hlResult,setHlResult]= useState(null);   // true=bon, false=mauvais
  const [hlUsed,  setHlUsed]  = useState([]);      // noms déjà utilisés cette partie

  /* ─ Imposteur state ─ */
  const [imCat,   setImCat]   = useState(null);    // catégorie en cours
  const [imChoices,setImChoices]=useState([]);     // 3 pays proposés {nm,f,rank|null}
  const [imRound, setImRound] = useState(1);       // 1..7
  const [imScore, setImScore] = useState(0);
  const [imPhase, setImPhase] = useState("guess"); // "guess"|"found"|"rankGuess"|"reveal"|"over"
  const [imPick,  setImPick]  = useState(null);    // index choisi
  const [imCorrect,setImCorrect]=useState(null);   // index du bon pays
  const [imRankPick,setImRankPick]=useState(null); // rang deviné
  const [imRankOK,setImRankOK]= useState(null);    // bonus rang réussi ?
  const [imTimer, setImTimer] = useState(10);
  const [imHist,  setImHist]  = useState([]);      // catégories déjà vues
  const imTimerRef = useRef(null);

  /* ─ High scores ─ */
  const [hsW, setHsW] = useState(()=>{try{return+localStorage.getItem("nr_hs_w")||0}catch{return 0}});
  const [hsR, setHsR] = useState(()=>{try{return+localStorage.getItem("nr_hs_r")||0}catch{return 0}});
  const [hsF, setHsF] = useState(()=>{try{return+localStorage.getItem("nr_hs_f")||0}catch{return 0}});
  const [hsHL,setHsHL]= useState(()=>{try{return+localStorage.getItem("nr_hs_hl")||0}catch{return 0}});
  const [hsIM,setHsIM]= useState(()=>{try{return+localStorage.getItem("nr_hs_im")||0}catch{return 0}});

  /* ─ Audio (sons + musique) ─ */
  const [sfxOn, setSfxOn] = useState(()=>{try{return localStorage.getItem("nr_sfx")!=="0"}catch{return true}});
  const [musicOn, setMusicOn] = useState(()=>{try{return localStorage.getItem("nr_music")!=="0"}catch{return true}});
  const [musicTrack, setMusicTrack] = useState(()=>{try{return localStorage.getItem("nr_track")||"explorer"}catch{return "explorer"}});
  const [showAudio, setShowAudio] = useState(false);
  const audioStarted = useRef(false);
  const sfx = useCallback((name)=>{ AudioEngine.playSfx(name); },[]);

  // Synchronise les réglages avec le moteur audio + persistance
  useEffect(()=>{ AudioEngine.setSfxOn(sfxOn); try{localStorage.setItem("nr_sfx",sfxOn?"1":"0")}catch{} },[sfxOn]);
  useEffect(()=>{ AudioEngine.setMusicOn(musicOn); try{localStorage.setItem("nr_music",musicOn?"1":"0")}catch{} },[musicOn]);
  useEffect(()=>{ try{localStorage.setItem("nr_track",musicTrack)}catch{}; if(audioStarted.current&&musicOn) AudioEngine.playMusic(musicTrack); },[musicTrack,musicOn]);

  // Démarre l'audio au premier geste de l'utilisateur (politique navigateur)
  const startAudio = useCallback(()=>{
    if(audioStarted.current) return;
    audioStarted.current=true;
    AudioEngine.init();
    if(musicOn) AudioEngine.playMusic(musicTrack);
  },[musicOn,musicTrack]);
  useEffect(()=>{
    const h=()=>{ startAudio(); window.removeEventListener("pointerdown",h); window.removeEventListener("keydown",h); };
    window.addEventListener("pointerdown",h); window.addEventListener("keydown",h);
    return ()=>{ window.removeEventListener("pointerdown",h); window.removeEventListener("keydown",h); };
  },[startAudio]);

  /* ─ XP / niveaux ─ */
  const [xp, setXp] = useState(()=>{try{return+localStorage.getItem("nr_xp")||0}catch{return 0}});
  const [xpGain, setXpGain] = useState(null);     // animation de gain
  const [levelUp, setLevelUp] = useState(null);   // niveau atteint (popup)
  const level = levelFromXP(xp);
  const lvlBase = xpForLevel(level), lvlNext = xpForLevel(level+1);
  const lvlPct = Math.min(100,Math.round(((xp-lvlBase)/(lvlNext-lvlBase))*100));

  /* ─ Défis du jour ─ */
  const [chalDone, setChalDone] = useState(()=>{
    try{
      const raw=JSON.parse(localStorage.getItem("nr_chal")||"{}");
      if(raw.date===todayStr()) return raw.done||[];
    }catch{}
    return [];
  });
  const todaysChals = dailyChallenges(todayStr());
  const persistChals = useCallback((doneArr)=>{
    try{localStorage.setItem("nr_chal",JSON.stringify({date:todayStr(),done:doneArr}));}catch{}
  },[]);

  // Ajoute de l'XP, gère la montée de niveau
  const awardXp = useCallback((amount)=>{
    if(amount<=0) return;
    setXp(prev=>{
      const before=levelFromXP(prev), after=levelFromXP(prev+amount);
      const nv=prev+amount;
      try{localStorage.setItem("nr_xp",nv);}catch{}
      if(after>before) setTimeout(()=>{setLevelUp(after);AudioEngine.playSfx("levelUp");},400);
      return nv;
    });
    setXpGain(amount);
    setTimeout(()=>setXpGain(null),2200);
  },[]);

  // Vérifie les défis du jour à la fin d'une partie ; renvoie le total d'XP gagné
  const checkChallenges = useCallback((ctx)=>{
    let earned=0; const newly=[];
    todaysChals.forEach(ch=>{
      if(chalDone.includes(ch.id)) return;
      try{ if(ch.chk(ctx)){ earned+=ch.xp; newly.push(ch.id); } }catch{}
    });
    if(newly.length){
      const upd=[...chalDone,...newly];
      setChalDone(upd); persistChals(upd);
      awardXp(earned);
    }
    return earned;
  },[todaysChals,chalDone,persistChals,awardXp]);

  /* ─ Refs ─ */
  const inpRef   = useRef(null);
  const rInpRef  = useRef(null);
  const spRef    = useRef(null);
  const t0       = useRef(Date.now());
  const G        = useRef({});
  G.current={scr,gt,cfg,q,qi,hints,hi,phase,score,hsW,hsR,hsF,hsHL,hsIM,imScore,imRound,rOk,maxCombo};

  /* ─ Derived ─ */
  const cc   = q[qi];
  const hs   = gt==="france"?hsF:gt==="rankings"?hsR:hsW;
  const hDefs= gt==="france"?FRANCE_HINTS:WORLD_HINTS;
  const accent= gt==="france"?"#1B4FBB":gt==="rankings"?"#FF9F0A":"#0066FF";
  const dInfo=d=>d===1?{c:"#32D74B",l:"Facile"}:d===2?{c:"#FFD60A",l:"Moyen"}:d===3?{c:"#FF9F0A",l:"Difficile"}:{c:"#FF3B30",l:"Expert"};
  const rankDiff=d=>d===1?"😊":d===2?"🤔":"🔥";

  useEffect(()=>{if(phase==="playing")t0.current=Date.now();},[hi,phase]);
  useEffect(()=>{
    clearInterval(spRef.current);
    if(scr!=="playing"||!cfg.timer||phase!=="playing") return;
    setSpT(cfg.timer); let t=cfg.timer;
    spRef.current=setInterval(()=>{t--;setSpT(t);if(t<=0){clearInterval(spRef.current);doSkip();}},1000);
    return()=>clearInterval(spRef.current);
  },[scr,cfg,hi,phase]); // eslint-disable-line

  /* ═══════════ NATION RUSH LOGIC ═══════════ */
  const saveHs=useCallback((sc,g)=>{
    const cur=g==="france"?G.current.hsF:G.current.hsW;
    const best=Math.max(cur,sc);
    if(g==="france"){setHsF(best);try{localStorage.setItem("nr_hs_f",best)}catch{}}
    else{setHsW(best);try{localStorage.setItem("nr_hs_w",best)}catch{}}
  },[]);

  const endGame=useCallback(sc=>{
    saveHs(sc,G.current.gt);
    setCanResume(false);
    // Défis : on lit les compteurs via G.current
    const g=G.current, rounds=g.q.length, found=g.rOk||0;
    checkChallenges({
      mode:g.gt, score:sc, rounds, found,
      accuracy: rounds?Math.round((found/rounds)*100):0,
      combo: g.maxCombo||0, perfect: rounds>0&&found===rounds,
      win:true, rankFound:0, impFound:0, impRank:0,
    });
    setScrn("over");
    AudioEngine.playSfx(found>=Math.ceil(rounds*0.5)?"win":"lose");
  },[saveHs,checkChallenges]);

  const nextRound=useCallback(()=>{
    const{qi:i,q:cq,cfg:c,gt:g,score:sc}=G.current;
    if(i>=cq.length-1){endGame(sc);return;}
    const ni=i+1;
    const hd=g==="france"?FRANCE_HINTS:WORLD_HINTS;
    const h=buildHints(cq[ni],c.maxH,c.chaos,c.fake,hd);
    setQi(ni);setHI(h);setHi(0);setPh("playing");
    setGs("");setSg([]);setRC(null);setSht(false);setBkd(null);
    setTimeout(()=>inpRef.current?.focus(),100);
  },[endGame]);

  // Indice suivant (avance les indices, ne quitte pas la manche)
  const doSkip=useCallback(()=>{
    const{hi:h,hints:hs2,q:cq,qi:i,phase:ph}=G.current;
    if(ph!=="playing") return;
    if(h>=hs2.length-1){ // dernier indice → révéler, 0 point
      setPh("revealed");setRC(cq[i]);
      setTimeout(nextRound,2400);
    } else{setHi(h+1);}
  },[nextRound]);

  // Passer entièrement le pays/ville → 0 point, manche suivante
  const skipEntry=useCallback(()=>{
    const{q:cq,qi:i,phase:ph}=G.current;
    if(ph!=="playing") return;
    setPh("revealed");setRC(cq[i]);
    setTimeout(nextRound,2000);
  },[nextRound]);

  const startGame=useCallback((c,g)=>{
    AudioEngine.playSfx("click");
    const gType=g||G.current.gt;
    const pool=filterDB(c.diff||[1,2,3,4],c.region||"all",gType);
    if(!pool.length){alert("Aucun pays pour cette configuration.");return;}
    const newQ=shuf(pool).slice(0,Math.min(c.rounds||10,pool.length));
    const hd=gType==="france"?FRANCE_HINTS:WORLD_HINTS;
    const h0=buildHints(newQ[0],c.maxH,c.chaos,c.fake,hd);
    if(g)setGT(g);
    setCfg(c);setQ(newQ);setQi(0);setHI(h0);setHi(0);
    setSc(0);setROk(0);setMaxCombo(0);G.current._combo=0;
    setPh("playing");setGs("");setSg([]);setRC(null);setSht(false);setBkd(null);
    setPaused(false);setCanResume(true);
    setScrn("playing");
    setTimeout(()=>inpRef.current?.focus(),280);
  },[]);

  const submit=useCallback(()=>{
    const{hi:h,q:cq,qi:i,score:sc,phase:ph}=G.current;
    if(!guess.trim()||ph!=="playing") return;
    const entry=cq[i];if(!entry) return;
    if(norm(guess)===norm(entry.nm)){
      const pts=roundPoints(h);
      const ns=sc+pts;
      setSc(ns);setROk(r=>r+1);
      setMaxCombo(mc=>{const nc=(G.current._combo||0)+1;G.current._combo=nc;return Math.max(mc,nc);});
      sfx(h===0?"correct":"reveal");
      setPh("revealed");setRC(entry);setBkd({pts,hi:h});setSht(true);
      setGs("");setSg([]);
      setFlt(`+${pts}`);setTimeout(()=>setFlt(null),1400);
      setTimeout(()=>{setSht(false);nextRound();},2600);
    } else{
      G.current._combo=0;
      sfx("wrong");
      setShk(true);setTimeout(()=>setShk(false),400);
      setGs("");setSg([]);doSkip();
    }
  },[guess,nextRound,doSkip,sfx]);

  const onInput=useCallback(v=>{
    setGs(v);
    if(v.length>=1){
      const pool=gt==="france"?FRANCE:WORLD;
      setSg(pool.filter(c=>norm(c.nm).startsWith(norm(v))).slice(0,6));
    } else setSg([]);
  },[gt]);

  /* ═══════════ RANKINGS LOGIC ═══════════
     Score : 2 pts/pays + 3 si ≥5 trouvés + 10 si les 10. Max 3 manches. */
  const roundBonus=(found)=>{
    let s=found*2;
    if(found>=5) s+=3;
    if(found===10) s+=10;
    return s;
  };

  const loadRoundCat=useCallback((histArr)=>{
    const available=RANKINGS.filter(r=>!histArr.includes(r.id));
    const pool=available.length>0?available:RANKINGS;
    return pick(pool);
  },[]);

  const startRanking=useCallback(()=>{
    AudioEngine.playSfx("click");
    const cat=loadRoundCat(rHist);
    setRCat(cat);
    setRSlots(cat.t.map(c=>({...c,revealed:false,justRevealed:false})));
    setRLives(3);setRScore(0);setRRoundSc(0);setRRound(1);
    setRGuess("");setRSugg([]);setRWrong([]);
    setRPhase("playing");setShowMissing(false);
    setCanResume(false);
    setScrn("ranking_play");
    setTimeout(()=>rInpRef.current?.focus(),300);
  },[rHist,loadRoundCat]);

  // Termine la manche en cours (victoire ou défaite), calcule bonus
  const finishRound=useCallback((slots)=>{
    const found=slots.filter(s=>s.revealed).length;
    const rs=roundBonus(found);
    setRScore(prev=>{
      const nt=prev+rs;
      const best=Math.max(G.current.hsR,nt);
      setHsR(best);try{localStorage.setItem("nr_hs_r",best)}catch{}
      return nt;
    });
    setRRoundSc(rs);
    setRPhase("round_end");
    setRHist(h=>[...h,rCat.id]);
    // Défis (mode rankings) — basé sur la manche
    checkChallenges({mode:"rankings",score:G.current.rScore||rs,rounds:10,found,
      accuracy:Math.round((found/10)*100),combo:0,perfect:found===10,win:true,
      rankFound:found,impFound:0,impRank:0});
  },[rCat,checkChallenges]);

  const nextRanking=useCallback(()=>{
    if(rRound>=3){setRPhase("game_end");return;}
    const newHist=[...rHist];
    const cat=loadRoundCat(newHist);
    setRCat(cat);
    setRSlots(cat.t.map(c=>({...c,revealed:false,justRevealed:false})));
    setRLives(3);setRRoundSc(0);setRRound(r=>r+1);
    setRGuess("");setRSugg([]);setRWrong([]);
    setRPhase("playing");setShowMissing(false);
    setTimeout(()=>rInpRef.current?.focus(),200);
  },[rRound,rHist,loadRoundCat]);

  const submitRanking=useCallback(()=>{
    if(!rGuess.trim()||rPhase!=="playing") return;
    const g=norm(rGuess);
    if(rSlots.some(s=>norm(s.nm)===g&&s.revealed)){setRGuess("");setRSugg([]);return;}
    const idx=rSlots.findIndex(s=>norm(s.nm)===g&&!s.revealed);
    if(idx>=0){
      const newSlots=rSlots.map((s,i)=>i===idx?{...s,revealed:true,justRevealed:true}:s);
      setRSlots(newSlots);
      setTimeout(()=>setRSlots(sl=>sl.map((s,i)=>i===idx?{...s,justRevealed:false}:s)),700);
      setRGuess("");setRSugg([]);
      AudioEngine.playSfx("coin");
      setFlt("+2");setTimeout(()=>setFlt(null),1200);
      if(newSlots.every(s=>s.revealed)){ finishRound(newSlots); }
    } else {
      AudioEngine.playSfx("wrong");
      setRShake(true);setTimeout(()=>setRShake(false),400);
      setRWrong(w=>[...w,{nm:rGuess}]);
      const nl=rLives-1; setRLives(nl);
      setRGuess("");setRSugg([]);
      if(nl<=0){ finishRound(rSlots); }
    }
  },[rGuess,rPhase,rSlots,rLives,finishRound]);

  const onRInput=useCallback(v=>{
    setRGuess(v);
    if(v.length>=1) setRSugg(ALL_C.filter(c=>norm(c.nm).startsWith(norm(v))).slice(0,6));
    else setRSugg([]);
  },[]);

  const revealed=rSlots.filter(s=>s.revealed).length;

  /* ═══════════ IMPOSTEUR LOGIC ═══════════
     3 pays, 1 seul est dans le Top 10 de la catégorie.
     Les 2 imposteurs sont crédibles (présents dans d'autres Top 10). */
  const buildImRound=useCallback((hist)=>{
    const avail=RANKINGS.filter(r=>!hist.includes(r.id));
    const cat=pick(avail.length?avail:RANKINGS);
    const topNames=cat.t.map(c=>norm(c.nm));
    // bon pays : un membre du top 10 (siège réel)
    const realIdx=Math.floor(Math.random()*cat.t.length);
    const real={...cat.t[realIdx],rank:realIdx+1};
    // imposteurs : pays crédibles = présents dans d'AUTRES classements, absents de celui-ci
    const pool=[];
    RANKINGS.forEach(r=>{if(r.id!==cat.id) r.t.forEach(c=>{
      if(!topNames.includes(norm(c.nm)) && !pool.some(x=>norm(x.nm)===norm(c.nm)))
        pool.push({nm:c.nm,f:c.f});
    });});
    const imposters=shuf(pool).slice(0,2).map(c=>({...c,rank:null}));
    const choices=shuf([real,...imposters]);
    return {cat,choices,correctIdx:choices.findIndex(c=>c.rank!==null)};
  },[]);

  const clearImTimer=useCallback(()=>{if(imTimerRef.current){clearInterval(imTimerRef.current);imTimerRef.current=null;}},[]);

  const imLaunchTimer=useCallback(()=>{
    clearImTimer();setImTimer(10);
    let t=10;
    imTimerRef.current=setInterval(()=>{
      t--;setImTimer(t);
      if(t>0&&t<=3) AudioEngine.playSfx("tickUrgent");
      else if(t>0) AudioEngine.playSfx("tick");
      if(t<=0){ clearImTimer(); imAnswer(-1); } // temps écoulé = mauvaise réponse
    },1000);
  },[]); // eslint-disable-line

  const startImpostor=useCallback(()=>{
    AudioEngine.playSfx("click");
    const {cat,choices,correctIdx}=buildImRound([]);
    setImCat(cat);setImChoices(choices);setImCorrect(correctIdx);
    setImRound(1);setImScore(0);
    G.current._impFound=0;G.current._impRank=0;
    setImPhase("guess");setImPick(null);setImRankPick(null);setImRankOK(null);
    setImHist([cat.id]);
    setCanResume(false);
    setScrn("im_play");
    setTimeout(imLaunchTimer,300);
  },[buildImRound,imLaunchTimer]);

  const imNextRound=useCallback(()=>{
    const cur=G.current.imRound;
    if(cur>=7){
      setImPhase("over");
      const best=Math.max(G.current.hsIM,G.current.imScore);
      setHsIM(best);try{localStorage.setItem("nr_hs_im",best)}catch{}
      checkChallenges({mode:"impostor",score:G.current.imScore,rounds:7,
        found:G.current._impFound||0,accuracy:Math.round(((G.current._impFound||0)/7)*100),
        combo:0,perfect:false,win:true,rankFound:0,
        impFound:G.current._impFound||0,impRank:G.current._impRank||0});
      return;
    }
    setImHist(h=>{
      const {cat,choices,correctIdx}=buildImRound(h);
      setImCat(cat);setImChoices(choices);setImCorrect(correctIdx);
      setImPhase("guess");setImPick(null);setImRankPick(null);setImRankOK(null);
      setTimeout(imLaunchTimer,250);
      return [...h,cat.id];
    });
    setImRound(r=>r+1);
  },[buildImRound,imLaunchTimer,checkChallenges]);

  // réponse à "quel pays est dans le top 10"
  const imAnswer=useCallback((idx)=>{
    clearImTimer();
    setImPick(idx);
    setImChoices(ch=>{
      const ci=ch.findIndex(c=>c.rank!==null);
      const ok = idx===ci;
      if(ok){
        setImScore(s=>s+1);
        G.current._impFound=(G.current._impFound||0)+1;
        AudioEngine.playSfx("correct");
        setImPhase("found"); // propose de deviner le rang
      } else {
        AudioEngine.playSfx("wrong");
        setImPhase("reveal"); // montre la bonne réponse, 0 pt
        setTimeout(imNextRound,2200);
      }
      return ch;
    });
  },[imNextRound,clearImTimer]);

  // tentative de bonus : deviner le rang exact
  const imGuessRank=useCallback((rank)=>{
    setImRankPick(rank);
    setImChoices(ch=>{
      const real=ch.find(c=>c.rank!==null);
      const ok = real && rank===real.rank;
      setImRankOK(ok);
      if(ok){ setImScore(s=>s+3); G.current._impRank=(G.current._impRank||0)+1; AudioEngine.playSfx("coin"); }
      else AudioEngine.playSfx("reveal");
      setImPhase("reveal");
      setTimeout(imNextRound,2400);
      return ch;
    });
  },[imNextRound]);

  // passer le bonus rang (garder juste le point)
  const imSkipRank=useCallback(()=>{
    setImRankOK(null);setImPhase("reveal");
    setTimeout(imNextRound,1600);
  },[imNextRound]);


  /* ═══════════ PLUS OU MOINS LOGIC ═══════════
     On compare le RANG de deux pays dans un classement (RANKINGS).
     rang = index dans cat.t (0 = #1 = meilleur classement).
     "higher" = mieux classé (rang plus haut dans le top, index plus petit)
     "lower"  = moins bien classé (index plus grand) */
  const hlDrawPair=useCallback((cat)=>{
    const pool=shuf(cat.t.map((c,i)=>({...c,rank:i+1})));
    return [pool[0],pool[1]];
  },[]);

  const startHL=useCallback(()=>{
    AudioEngine.playSfx("click");
    const cat=pick(HIGHLOW);
    const [a,b]=hlDrawPair(cat);
    setHlCat(cat);
    setHlLeft(a);setHlRight(b);
    setHlScore(0);setHlCombo(0);setHlLives(3);
    setHlPhase("playing");setHlPick(null);setHlResult(null);
    setHlUsed([]);
    setCanResume(false);
    setScrn("hl_play");
  },[hlDrawPair]);

  // tire un nouveau pays de la même catégorie, différent du pays de référence
  const hlNextRight=useCallback((cat,leftRank,excludeRanks)=>{
    const pool=cat.t.map((c,i)=>({...c,rank:i+1})).filter(c=>!excludeRanks.includes(c.rank));
    return pool.length?pick(pool):pick(cat.t.map((c,i)=>({...c,rank:i+1})));
  },[]);

  const hlGuess=useCallback((choice)=>{
    if(hlPhase!=="playing"||!hlLeft||!hlRight) return;
    // rang plus petit = meilleur classement = "plus haut/supérieur"
    // égalité impossible (rangs distincts)
    const rightBetter = hlRight.rank < hlLeft.rank; // droite mieux classée
    const correct = choice==="higher" ? rightBetter : !rightBetter;
    setHlPick(choice);setHlResult(correct);setHlPhase("reveal");
    AudioEngine.playSfx(correct?"correct":"wrong");

    setTimeout(()=>{
      if(correct){
        const ns=hlScore+1; setHlScore(ns);setHlCombo(c=>c+1);
        // le pays de droite devient la nouvelle référence à gauche
        const newLeft=hlRight;
        const used=[hlLeft.rank,hlRight.rank];
        // 1 chance sur 4 de changer de catégorie pour varier
        if(Math.random()<0.25){
          const nc=pick(HIGHLOW.filter(c=>c.id!==hlCat.id))||hlCat;
          const [a,b]=hlDrawPair(nc);
          setHlCat(nc);setHlLeft(a);setHlRight(b);setHlUsed([]);
        } else {
          const nr=hlNextRight(hlCat,newLeft.rank,used);
          setHlLeft(newLeft);setHlRight(nr);setHlUsed(used);
        }
        setHlPhase("playing");setHlPick(null);setHlResult(null);
      } else {
        const nl=hlLives-1; setHlLives(nl);setHlCombo(0);
        if(nl<=0){
          setHlPhase("over");
          const best=Math.max(G.current.hsHL,hlScore);
          setHsHL(best);try{localStorage.setItem("nr_hs_hl",best)}catch{}
          checkChallenges({mode:"highlow",score:hlScore,rounds:hlScore,found:hlScore,
            accuracy:100,combo:hlScore,perfect:false,win:true,rankFound:0,impFound:0,impRank:0});
        } else {
          // nouvelle paire fraîche dans une nouvelle catégorie
          const nc=pick(HIGHLOW);
          const [a,b]=hlDrawPair(nc);
          setHlCat(nc);setHlLeft(a);setHlRight(b);setHlUsed([]);
          setHlPhase("playing");setHlPick(null);setHlResult(null);
        }
      }
    },1600);
  },[hlPhase,hlLeft,hlRight,hlScore,hlLives,hlCat,hlDrawPair,hlNextRight,checkChallenges]);



  /* ═══════════════════════════════════════════════════════
     MENU
  ═══════════════════════════════════════════════════════ */
  /* Overlay XP gagnée + montée de niveau (réutilisé sur plusieurs écrans) */
  const xpOverlay=(
    <>
      {xpGain&&(
        <div style={{position:"fixed",top:"16px",left:"50%",transform:"translateX(-50%)",zIndex:90,
          background:"var(--green)",color:"#fff",padding:".55rem 1.1rem",borderRadius:"var(--r2)",
          fontWeight:800,fontSize:".9rem",boxShadow:"0 4px 0 #239636,0 6px 16px rgba(50,215,75,.3)",
          animation:"shu .4s cubic-bezier(.34,1.56,.64,1) both"}}>
          +{xpGain} XP 🎯
        </div>
      )}
      {levelUp&&(
        <div className="overlay" style={{alignItems:"center",zIndex:95}} onClick={()=>setLevelUp(null)}>
          <div className="sheet ashu" style={{textAlign:"center",maxWidth:"320px"}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"3.2rem",marginBottom:".4rem"}}>⭐</div>
            <div style={{fontSize:".7rem",fontWeight:800,color:"var(--green)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".3rem"}}>Niveau supérieur !</div>
            <div style={{fontWeight:800,fontSize:"2.6rem",color:"var(--t1)",letterSpacing:"-.03em",lineHeight:1}}>Niveau {levelUp}</div>
            <div style={{fontSize:".82rem",color:"var(--t3)",fontWeight:500,margin:"0.7rem 0 1.2rem"}}>Continue à relever les défis du jour pour grimper encore.</div>
            <button className="btn btn-green" onClick={()=>setLevelUp(null)} style={{padding:"13px 32px",fontSize:".95rem",width:"100%"}}>Continuer</button>
          </div>
        </div>
      )}
    </>
  );

  /* Panneau réglages audio (sons + sélecteur de musique) */
  const audioPanel = showAudio && (
    <div className="overlay" style={{alignItems:"center",zIndex:96}} onClick={()=>{setShowAudio(false);sfx("tap");}}>
      <div className="sheet ashu" style={{maxWidth:"360px"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.1rem"}}>
          <div style={{fontWeight:800,fontSize:"1.25rem",color:"var(--t1)",letterSpacing:"-.02em"}}>🎵 Audio</div>
          <button className="btn btn-ghost" style={{padding:"6px 13px",fontSize:".85rem"}} onClick={()=>{setShowAudio(false);sfx("tap");}}>Fermer</button>
        </div>

        {/* Toggles */}
        <div style={{display:"flex",flexDirection:"column",gap:".6rem",marginBottom:"1.2rem"}}>
          <button className="chal-card" style={{cursor:"pointer",justifyContent:"space-between"}}
            onClick={()=>{const v=!sfxOn;setSfxOn(v);if(v){AudioEngine.setSfxOn(true);AudioEngine.playSfx("correct");}}}>
            <span style={{display:"flex",alignItems:"center",gap:".7rem",fontWeight:700,fontSize:".9rem",color:"var(--t1)"}}>
              <span style={{fontSize:"1.2rem"}}>🔔</span> Effets sonores
            </span>
            <span style={{fontWeight:800,fontSize:".82rem",color:sfxOn?"var(--green)":"var(--t4)"}}>{sfxOn?"Activés":"Coupés"}</span>
          </button>
          <button className="chal-card" style={{cursor:"pointer",justifyContent:"space-between"}}
            onClick={()=>{const v=!musicOn;setMusicOn(v);startAudio();}}>
            <span style={{display:"flex",alignItems:"center",gap:".7rem",fontWeight:700,fontSize:".9rem",color:"var(--t1)"}}>
              <span style={{fontSize:"1.2rem"}}>🎶</span> Musique de fond
            </span>
            <span style={{fontWeight:800,fontSize:".82rem",color:musicOn?"var(--green)":"var(--t4)"}}>{musicOn?"Activée":"Coupée"}</span>
          </button>
        </div>

        {/* Sélecteur de musique */}
        <div style={{fontSize:".7rem",fontWeight:800,color:"var(--t4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".5rem"}}>Ambiance musicale</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
          {AudioEngine.tracks.map(tr=>{
            const active = musicTrack===tr.id || (tr.id==="off"&&!musicOn);
            return(
              <button key={tr.id} className="btn"
                onClick={()=>{
                  startAudio();
                  if(tr.id==="off"){ setMusicOn(false); }
                  else { setMusicOn(true); setMusicTrack(tr.id); AudioEngine.setMusicOn(true); AudioEngine.playMusic(tr.id); }
                  sfx("tap");
                }}
                style={{padding:".8rem .5rem",borderRadius:"var(--r2)",flexDirection:"column",gap:".25rem",
                  background:active?"var(--blue)":"var(--s2)",
                  border:`2px solid ${active?"var(--blue)":"var(--bd2)"}`,
                  color:active?"#fff":"var(--t1)",
                  boxShadow:active?"0 3px 0 #0048b3":"0 3px 0 var(--bd)"}}>
                <span style={{fontSize:"1.3rem"}}>{tr.emoji}</span>
                <span style={{fontWeight:800,fontSize:".8rem"}}>{tr.name}</span>
              </button>
            );
          })}
        </div>
        <div style={{fontSize:".68rem",color:"var(--t4)",fontWeight:500,marginTop:"1rem",textAlign:"center",lineHeight:1.4}}>
          Musiques générées en direct, libres de droits.<br/>Change d'ambiance quand tu veux.
        </div>
      </div>
    </div>
  );

  if(scr==="menu") return(
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2.5rem 1.25rem",position:"relative",zIndex:1}}>
      <style>{CSS}</style>
      {xpOverlay}
      {audioPanel}
      <AnimatedBG mode="menu"/>

      {/* Bouton audio flottant */}
      <button onClick={()=>{startAudio();setShowAudio(true);sfx("tap");}}
        style={{position:"fixed",top:"14px",right:"14px",zIndex:50,width:"42px",height:"42px",borderRadius:"var(--r2)",
          background:"rgba(255,255,255,.1)",border:"1.5px solid rgba(255,255,255,.2)",backdropFilter:"blur(8px)",
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",color:"#fff"}}
        aria-label="Réglages audio">{musicOn||sfxOn?"🔊":"🔇"}</button>

      <div className="afu" style={{textAlign:"center",marginBottom:"1.6rem"}}>
        {/* App icon badge */}
        <div style={{width:"68px",height:"68px",margin:"0 auto 1.1rem",borderRadius:"19px",
          background:"linear-gradient(145deg,#0066FF,#3B9EFF)",display:"flex",alignItems:"center",justifyContent:"center",
          boxShadow:"0 8px 28px rgba(0,102,255,.4),inset 0 1px 1px rgba(255,255,255,.4)",position:"relative"}}>
          <span style={{fontSize:"2.1rem",filter:"drop-shadow(0 1px 2px rgba(0,0,0,.2))"}}>🌍</span>
        </div>
        <div style={{fontSize:".68rem",fontWeight:700,letterSpacing:".16em",color:"rgba(255,255,255,.55)",marginBottom:".5rem",textTransform:"uppercase"}}>Jeu de culture générale</div>
        <div style={{fontWeight:800,fontSize:"clamp(2.6rem,11vw,5.2rem)",letterSpacing:"-.04em",lineHeight:.9,color:"#fff",textShadow:"0 2px 20px rgba(0,0,0,.4)"}}>
          Nation<span style={{color:"#5AC8FA"}}>Rush</span>
        </div>
        <div style={{color:"rgba(255,255,255,.6)",fontSize:".85rem",marginTop:".7rem",fontWeight:400}}>Devinez · Classements · Plus ou Moins</div>
      </div>

      {/* Stats banner */}
      <div className="afu" style={{animationDelay:".03s",display:"flex",gap:".6rem",marginBottom:"1.5rem",width:"100%",maxWidth:"380px"}}>
        {[
          {v:fmtN(WORLD.length+FRANCE.length),l:"pays & villes",c:"var(--blue)"},
          {v:RANKINGS.length,l:"classements",c:"var(--orange)"},
          {v:fmtN(Math.max(hsW,hsR,hsF,hsHL)),l:"meilleur score",c:"var(--green)"},
        ].map(st=>(
          <div key={st.l} className="surface" style={{flex:1,padding:".7rem .4rem",textAlign:"center",borderRadius:"14px"}}>
            <div className="score-num" style={{fontWeight:800,fontSize:"1.15rem",color:st.c,letterSpacing:"-.02em"}}>{st.v}</div>
            <div style={{fontSize:".6rem",color:"var(--t4)",fontWeight:600,marginTop:".1rem"}}>{st.l}</div>
          </div>
        ))}
      </div>

      {/* Niveau + barre XP */}
      <div className="afu surface" style={{animationDelay:".04s",width:"100%",maxWidth:"380px",marginBottom:"1rem",padding:".9rem 1.05rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".5rem"}}>
          <div style={{display:"flex",alignItems:"center",gap:".55rem"}}>
            <div style={{width:"34px",height:"34px",borderRadius:"7px",background:"linear-gradient(145deg,#32D74B,#28a83c)",
              display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:"#fff",fontSize:".95rem",
              boxShadow:"0 2px 0 #1e8a30"}}>{level}</div>
            <div>
              <div style={{fontWeight:800,fontSize:".82rem",color:"var(--t1)"}}>Niveau {level}</div>
              <div style={{fontSize:".64rem",color:"var(--t4)",fontWeight:600}}>{fmtN(xp-lvlBase)} / {fmtN(lvlNext-lvlBase)} XP</div>
            </div>
          </div>
          <div style={{fontSize:".66rem",color:"var(--green)",fontWeight:800}}>{lvlPct}%</div>
        </div>
        <div className="xpbar"><div className="xpfill" style={{width:lvlPct+"%"}}/></div>
      </div>

      {/* Défis du jour */}
      <div className="afu" style={{animationDelay:".05s",width:"100%",maxWidth:"380px",marginBottom:"1.5rem"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".55rem"}}>
          <span className="slbl" style={{margin:0}}>🎯 Défis du jour</span>
          <span style={{fontSize:".66rem",fontWeight:700,color:chalDone.length===4?"var(--green)":"rgba(255,255,255,.5)"}}>
            {chalDone.length}/4 {chalDone.length===4?"✓":""}
          </span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:".45rem"}}>
          {todaysChals.map(ch=>{
            const done=chalDone.includes(ch.id);
            return(
              <div key={ch.id} className={`chal-card${done?" done":""}`}>
                <div className={`chal-check${done?" on":""}`}>{done?"✓":ch.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:".8rem",color:done?"var(--t3)":"var(--t1)",textDecoration:done?"line-through":"none",lineHeight:1.25}}>{ch.t}</div>
                </div>
                <div style={{fontSize:".7rem",fontWeight:800,color:done?"var(--green)":"var(--t4)",flexShrink:0,whiteSpace:"nowrap"}}>+{ch.xp} XP</div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Reprendre la partie */}
      {canResume&&q.length>0&&(
        <button className="btn btn-blue afu" style={{animationDelay:".055s",padding:"14px 36px",fontSize:"1rem",borderRadius:"var(--r2)",marginBottom:"1.3rem"}}
          onClick={()=>{setScrn("playing");setPaused(false);setTimeout(()=>inpRef.current?.focus(),200);}}>
          ▶ Reprendre la partie ({qi+1}/{q.length})
        </button>
      )}

      {/* Mode selector */}
      <div className="afu" style={{animationDelay:".06s",width:"100%",maxWidth:"520px",marginBottom:"1.5rem"}}>
        <span className="slbl" style={{textAlign:"center"}}>Choisir un mode</span>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".7rem"}}>
          {[
            {g:"world",  icon:"🌍",name:"Pays du Monde",  sub:`${WORLD.length} pays · 19 indices`,    col:"#0066FF",hs:hsW},
            {g:"rankings",icon:"🏆",name:"Top 10 Mondial", sub:`${RANKINGS.length} classements · 3 manches`, col:"#FF9F0A",hs:hsR},
            {g:"highlow",icon:"⬆️",name:"Plus ou Moins",  sub:`${HIGHLOW.length} classements · Top 50`, col:"#32D74B",hs:hsHL},
            {g:"impostor",icon:"🕵️",name:"Imposteur",    sub:`Trouve le bon · 7 manches`, col:"#BF5AF2",hs:hsIM},
            {g:"france", icon:"🇫🇷",name:"Villes de France",sub:`${FRANCE.length} villes · 12 indices`, col:"#1B4FBB",hs:hsF},
          ].map(m=>(
            <div key={m.g} className={`mcard${gt===m.g?" sel":""}`}
              onClick={()=>{setGT(m.g);sfx("tap");}}
              style={{borderColor:gt===m.g?m.col:"var(--bd)",boxShadow:gt===m.g?`0 0 0 1px ${m.col},0 8px 24px ${m.col}22`:undefined}}>
              <div style={{fontSize:"1.65rem",marginBottom:".4rem"}}>{m.icon}</div>
              <div style={{fontWeight:800,fontSize:".78rem",color:gt===m.g?m.col:"var(--t1)",marginBottom:".2rem"}}>{m.name}</div>
              <div style={{fontSize:".7rem",color:"var(--t4)",fontWeight:500,lineHeight:1.3}}>{m.sub}</div>
              {m.hs>0&&<div style={{fontSize:".66rem",fontWeight:700,color:"var(--yellow)",marginTop:".35rem"}}>🏆 {fmtN(m.hs)}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      {gt==="rankings"?(
        <div className="afu" style={{animationDelay:".1s",display:"flex",flexDirection:"column",alignItems:"center",gap:".9rem",marginBottom:"1.5rem",width:"100%",maxWidth:"400px"}}>
          <button className="btn btn-gold" style={{padding:"17px 52px",fontSize:"1.1rem",borderRadius:"50px",width:"100%"}}
            onClick={startRanking}>🏆 Lancer un classement →</button>
          <div style={{fontSize:".78rem",color:"rgba(255,255,255,.6)",fontWeight:500,textAlign:"center"}}>
            3 manches · Top 10 réels · 3 vies par manche
          </div>
        </div>
      ):gt==="highlow"?(
        <div className="afu" style={{animationDelay:".1s",display:"flex",flexDirection:"column",alignItems:"center",gap:".9rem",marginBottom:"1.5rem",width:"100%",maxWidth:"400px"}}>
          <button className="btn btn-green" style={{padding:"17px 52px",fontSize:"1.1rem",borderRadius:"50px",width:"100%"}}
            onClick={startHL}>⬆️⬇️ Lancer Plus ou Moins →</button>
          <div style={{fontSize:".78rem",color:"rgba(255,255,255,.6)",fontWeight:500,textAlign:"center"}}>
            Plus ou moins que le pays affiché ? · 3 vies · combo infini
          </div>
        </div>
      ):gt==="impostor"?(
        <div className="afu" style={{animationDelay:".1s",display:"flex",flexDirection:"column",alignItems:"center",gap:".9rem",marginBottom:"1.5rem",width:"100%",maxWidth:"400px"}}>
          <button className="btn btn-purple" style={{padding:"17px 52px",fontSize:"1.1rem",borderRadius:"50px",width:"100%"}}
            onClick={startImpostor}>🕵️ Lancer Imposteur →</button>
          <div style={{fontSize:".78rem",color:"rgba(255,255,255,.6)",fontWeight:500,textAlign:"center"}}>
            Trouve le pays du Top 10 · 10 s/manche · 7 manches · bonus rang
          </div>
        </div>
      ):(
        <div className="afu" style={{animationDelay:".1s",width:"100%",maxWidth:"520px",marginBottom:"1.2rem"}}>
          <span className="slbl" style={{textAlign:"center"}}>Lancement rapide</span>
          <div style={{display:"flex",flexWrap:"wrap",gap:".55rem",justifyContent:"center"}}>
            {PRESETS.map(p=>(
              <button key={p.id} className="pill" onClick={()=>startGame({...p,diff:[1,2,3,4],region:"all"},gt)}
                style={{borderColor:`${p.col}30`}}>
                <span style={{fontSize:"1.1rem"}}>{p.icon}</span>
                <span style={{fontWeight:700,fontSize:".82rem",color:p.col}}>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {(gt==="world"||gt==="france")&&(
        <button className="btn btn-ghost afu" style={{animationDelay:".13s",padding:"13px 28px",fontSize:".9rem",marginBottom:"1.5rem"}}
          onClick={()=>setScrn("custom")}>⚙️ Partie personnalisée</button>
      )}

      <div className="afu" style={{animationDelay:".16s",display:"flex",gap:"1.4rem",color:"rgba(255,255,255,.55)",fontSize:".72rem",flexWrap:"wrap",justifyContent:"center",fontWeight:500}}>
        {gt==="rankings"
          ? ["Données réelles & vérifiables","Score selon le rang","3 manches","Catégorie différente à chaque partie"].map(t=>(<span key={t} style={{display:"flex",alignItems:"center",gap:".3rem"}}><span style={{color:"var(--orange)"}}>·</span>{t}</span>))
          : gt==="highlow"
          ? ["Mêmes données que le Top 10","Score = bonnes réponses","Combo illimité","3 vies"].map(t=>(<span key={t} style={{display:"flex",alignItems:"center",gap:".3rem"}}><span style={{color:"var(--green)"}}>·</span>{t}</span>))
          : gt==="impostor"
          ? ["1 vrai pays · 2 imposteurs","10 secondes par manche","7 manches","Bonus +3 si rang exact"].map(t=>(<span key={t} style={{display:"flex",alignItems:"center",gap:".3rem"}}><span style={{color:"var(--purple)"}}>·</span>{t}</span>))
          : [`${WORLD.length+FRANCE.length} entrées`,"Indices aléatoires à chaque partie","Score détaillé · Combos","Records par mode"].map(t=>(<span key={t} style={{display:"flex",alignItems:"center",gap:".3rem"}}><span style={{color:"var(--cyan)"}}>·</span>{t}</span>))
        }
      </div>

      {/* Footer version */}
      <div className="afu" style={{animationDelay:".2s",marginTop:"2rem",textAlign:"center"}}>
        <div style={{fontSize:".64rem",color:"rgba(255,255,255,.45)",fontWeight:600,letterSpacing:".04em"}}>NATION RUSH · v2.0</div>
        <div style={{fontSize:".6rem",color:"rgba(255,255,255,.35)",fontWeight:500,marginTop:".2rem"}}>Données ONU · FMI · OMS · CIO · Forbes</div>
      </div>
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     IMPOSTEUR PLAY
  ═══════════════════════════════════════════════════════ */
  if(scr==="im_play"&&imCat&&imChoices.length===3){
    const real=imChoices.find(c=>c.rank!==null);
    const reveal = imPhase==="reveal";
    const found = imPhase==="found"||imPhase==="rankGuess";
    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",padding:"1rem 1.1rem",maxWidth:"480px",margin:"0 auto",gap:".7rem",position:"relative",zIndex:1}}>
        <style>{CSS}</style>
        {xpOverlay}
        <AnimatedBG mode="impostor"/>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".3rem 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:".4rem"}}>
            <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:".82rem",borderRadius:"10px"}}
              onClick={()=>{clearImTimer();setScrn("menu");}}>← Menu</button>
            <div className="surface" style={{padding:".24rem .65rem",fontSize:".74rem",color:"var(--t3)",fontWeight:600,borderRadius:"10px"}}>
              Manche <span style={{color:"var(--t1)",fontWeight:800}}>{imRound}</span>/7
            </div>
          </div>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:".57rem",fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".12em",textTransform:"uppercase"}}>SCORE</div>
            <div className="score-num" style={{fontWeight:800,fontSize:"1.8rem",letterSpacing:"-.04em",color:"#fff",lineHeight:1}}>{imScore}</div>
          </div>
          {/* Timer */}
          <div style={{position:"relative",width:"48px",height:"48px"}}>
            <svg width="48" height="48" style={{transform:"rotate(-90deg)"}}>
              <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="4"/>
              <circle cx="24" cy="24" r="20" fill="none" stroke={imTimer<=3?"var(--red)":"var(--purple)"} strokeWidth="4"
                strokeDasharray={2*Math.PI*20} strokeDashoffset={2*Math.PI*20*(1-imTimer/10)}
                strokeLinecap="round" style={{transition:"stroke-dashoffset 1s linear"}}/>
            </svg>
            <div className="score-num" style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:"1.05rem",color:imTimer<=3?"var(--red)":"#fff"}}>
              {imPhase==="guess"?imTimer:"–"}
            </div>
          </div>
        </div>

        {/* Consigne */}
        <div className="surface" style={{padding:".75rem 1rem",textAlign:"center"}}>
          <div style={{fontSize:".62rem",fontWeight:700,color:"var(--purple)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".2rem"}}>
            🕵️ Qui est dans le Top 10 ?
          </div>
          <div style={{fontWeight:800,fontSize:"1.05rem",color:"var(--t1)",letterSpacing:"-.01em"}}>
            <span style={{marginRight:".4rem"}}>{imCat.e}</span>{imCat.lb}
          </div>
        </div>

        {/* 3 choix */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:".7rem",justifyContent:"center"}}>
          {imChoices.map((c,i)=>{
            const isReal=c.rank!==null;
            const picked=imPick===i;
            let bg="var(--s0)",bd="var(--bd2)",badge=null;
            if(reveal||found){
              if(isReal){bg="rgba(50,215,75,.1)";bd="var(--green)";badge="✓ Top 10 (#"+c.rank+")";}
              else if(picked){bg="rgba(255,59,48,.08)";bd="var(--red)";badge="✗ Imposteur";}
              else {badge="Imposteur";}
            }
            return(
              <button key={i} disabled={imPhase!=="guess"} onClick={()=>imAnswer(i)}
                className="btn" style={{padding:"1.1rem 1.2rem",borderRadius:"18px",background:bg,border:`2px solid ${bd}`,
                  boxShadow:"var(--sh)",display:"flex",alignItems:"center",gap:"14px",justifyContent:"flex-start",
                  opacity:(reveal||found)&&!isReal&&!picked?.5:1,transition:"all .25s"}}>
                <span style={{fontSize:"2.2rem",lineHeight:1}}>{c.f}</span>
                <span style={{fontWeight:800,fontSize:"1.15rem",color:"var(--t1)",flex:1,textAlign:"left"}}>{c.nm}</span>
                {badge&&<span style={{fontSize:".72rem",fontWeight:700,color:isReal?"var(--green)":"var(--red)"}}>{badge}</span>}
              </button>
            );
          })}
        </div>

        {/* Phase "found" : deviner le rang pour bonus */}
        {found&&real&&(
          <div className="surface-lg ashu" style={{padding:"1.1rem",textAlign:"center"}}>
            <div style={{fontSize:".7rem",fontWeight:800,color:"var(--green)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:".15rem"}}>✓ Trouvé ! +1 point</div>
            <div style={{fontSize:".82rem",color:"var(--t2)",fontWeight:600,marginBottom:".7rem"}}>Devine son rang exact pour <span style={{color:"var(--purple)",fontWeight:800}}>+3 points bonus</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:".4rem",marginBottom:".7rem"}}>
              {[1,2,3,4,5,6,7,8,9,10].map(r=>(
                <button key={r} onClick={()=>imGuessRank(r)} className="btn"
                  style={{padding:".7rem 0",borderRadius:"11px",background:"var(--s2)",border:"1.5px solid var(--bd2)",
                    fontWeight:800,fontSize:".95rem",color:"var(--t1)"}}>
                  {r<=3?["🥇","🥈","🥉"][r-1]:"#"+r}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={imSkipRank} style={{padding:"10px 20px",fontSize:".82rem",borderRadius:"12px"}}>
              Garder mon point · passer
            </button>
          </div>
        )}

        {/* Reveal du résultat bonus */}
        {reveal&&imRankOK!==null&&real&&(
          <div className="surface-lg ashu" style={{padding:"1rem",textAlign:"center",
            background:imRankOK?"rgba(191,90,242,.08)":"var(--s0)",border:`2px solid ${imRankOK?"var(--purple)":"var(--bd)"}`}}>
            {imRankOK
              ? <div style={{fontWeight:800,fontSize:"1rem",color:"var(--purple)"}}>🎯 Rang exact ! +3 points bonus</div>
              : <div style={{fontWeight:700,fontSize:".9rem",color:"var(--t3)"}}>Raté — {real.nm} était #{real.rank}. Tu gardes ton point.</div>}
          </div>
        )}

        <div style={{textAlign:"center",color:"var(--t5)",fontSize:".64rem",fontWeight:600}}>
          1 bon pays · 2 imposteurs crédibles · trouve le vrai
        </div>

        {/* Game over */}
        {imPhase==="over"&&(
          <div className="overlay">
            <div className="sheet ashu" style={{textAlign:"center"}}>
              <div style={{fontSize:"3rem",marginBottom:".6rem"}}>{imScore>=hsIM&&imScore>0?"🏆":imScore>=14?"🕵️":"🎮"}</div>
              <div style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-.03em",color:"var(--t1)",marginBottom:".3rem"}}>
                {imScore>=hsIM&&imScore>0?"Nouveau record !":"Partie terminée"}
              </div>
              <div style={{fontWeight:600,fontSize:".88rem",color:"var(--t3)",marginBottom:"1.1rem"}}>Mode Imposteur · 7 manches</div>
              <div style={{background:"linear-gradient(135deg,rgba(191,90,242,.1),rgba(191,90,242,.05))",borderRadius:"14px",padding:"1rem",marginBottom:"1rem",border:"1px solid rgba(191,90,242,.2)"}}>
                <div style={{fontSize:".6rem",fontWeight:700,color:"var(--t4)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:".16rem"}}>SCORE FINAL</div>
                <div className="score-num" style={{fontWeight:800,fontSize:"3rem",color:"var(--purple)",letterSpacing:"-.04em",lineHeight:1}}>{imScore}</div>
                <div style={{fontSize:".76rem",color:"var(--t4)",fontWeight:500,marginTop:".3rem"}}>sur 28 possibles · record {Math.max(hsIM,imScore)}</div>
              </div>
              <div style={{display:"flex",gap:".65rem",justifyContent:"center"}}>
                <button className="btn btn-purple" onClick={startImpostor} style={{fontSize:".95rem",padding:"14px 26px"}}>🔄 Rejouer</button>
                <button className="btn btn-ghost" onClick={()=>setScrn("menu")} style={{fontSize:".9rem",padding:"14px 20px"}}>← Menu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if(scr==="hl_play"&&hlCat&&hlLeft&&hlRight){
    const showVal = hlPhase==="reveal";
    const rightBetter = hlRight.rank < hlLeft.rank;
    const total = hlCat.t.length;
    const rankBadge=(rank,col)=>(
      <div style={{display:"inline-flex",alignItems:"center",gap:".4rem",background:`${col}15`,border:`1.5px solid ${col}35`,borderRadius:"12px",padding:".35rem .9rem"}}>
        <span style={{fontWeight:800,fontSize:"1.4rem",color:col,letterSpacing:"-.02em"}}>
          {rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":`#${rank}`}
        </span>
        <span style={{fontSize:".72rem",color:"var(--t4)",fontWeight:600}}>sur {total}</span>
      </div>
    );
    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",padding:"1rem 1.1rem",maxWidth:"480px",margin:"0 auto",gap:".7rem",position:"relative",zIndex:1}}>
        <style>{CSS}</style>
        {xpOverlay}
        <AnimatedBG mode="highlow"/>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".3rem 0"}}>
          <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:".82rem",borderRadius:"10px"}}
            onClick={()=>setScrn("menu")}>← Menu</button>
          <div style={{textAlign:"center",position:"relative"}}>
            <div style={{fontSize:".57rem",fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".12em",textTransform:"uppercase"}}>SCORE</div>
            <div className="score-num" style={{fontWeight:800,fontSize:"1.8rem",letterSpacing:"-.04em",color:"#fff",lineHeight:1}}>{hlScore}</div>
          </div>
          <div style={{display:"flex",gap:".45rem",alignItems:"center"}}>
            {hlCombo>=2&&<div className="surface abadge" style={{padding:".22rem .5rem",textAlign:"center",borderRadius:"12px"}}>
              <div style={{fontSize:".5rem",fontWeight:700,color:"var(--t4)",letterSpacing:".1em"}}>SÉRIE</div>
              <div className="score-num" style={{fontWeight:800,fontSize:".9rem",color:hlCombo>=8?"var(--yellow)":hlCombo>=5?"var(--orange)":"var(--green)"}}>{hlCombo}🔥</div>
            </div>}
            <div style={{fontSize:"1.05rem"}}>{[...Array(3)].map((_,i)=><span key={i}>{i<hlLives?"❤️":"🤍"}</span>)}</div>
          </div>
        </div>

        {/* Category banner */}
        <div className="surface" style={{padding:".7rem 1rem",textAlign:"center"}}>
          <div style={{fontSize:".62rem",fontWeight:700,color:"var(--t4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".15rem"}}>Classement</div>
          <div style={{fontWeight:800,fontSize:"1.02rem",color:"var(--t1)",letterSpacing:"-.01em"}}>
            <span style={{marginRight:".4rem"}}>{hlCat.e}</span>{hlCat.lb}
          </div>
        </div>

        {/* Cartes pays */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:".6rem",justifyContent:"center"}}>
          {/* GAUCHE — pays connu avec son rang */}
          <div className="surface-lg" style={{padding:"1.3rem",textAlign:"center",background:"linear-gradient(135deg,rgba(50,215,75,.06),var(--s0))"}}>
            <div style={{fontSize:"2.8rem",lineHeight:1,marginBottom:".35rem"}}>{hlLeft.f}</div>
            <div style={{fontWeight:800,fontSize:"1.3rem",letterSpacing:"-.02em",color:"var(--t1)",marginBottom:".5rem"}}>{hlLeft.nm}</div>
            {rankBadge(hlLeft.rank,"#32D74B")}
          </div>

          {/* Séparateur VS */}
          <div style={{display:"flex",alignItems:"center",gap:".7rem",padding:"0 .5rem"}}>
            <div style={{flex:1,height:"1px",background:"var(--bd2)"}}/>
            <div style={{fontWeight:800,fontSize:".85rem",color:"var(--t4)",letterSpacing:".05em"}}>VS</div>
            <div style={{flex:1,height:"1px",background:"var(--bd2)"}}/>
          </div>

          {/* DROITE — pays à deviner */}
          <div className="surface-lg" style={{padding:"1.3rem",textAlign:"center",position:"relative",
            border:showVal?(hlResult?"2px solid var(--green)":"2px solid var(--red)"):"1px solid var(--bd)",
            transition:"border-color .3s"}}>
            <div style={{fontSize:"2.8rem",lineHeight:1,marginBottom:".35rem"}}>{hlRight.f}</div>
            <div style={{fontWeight:800,fontSize:"1.3rem",letterSpacing:"-.02em",color:"var(--t1)",marginBottom:".5rem"}}>{hlRight.nm}</div>
            {showVal?(
              <div className="asp">
                {rankBadge(hlRight.rank,hlResult?"#32D74B":"#FF3B30")}
                <div style={{fontSize:".82rem",fontWeight:700,marginTop:".5rem",color:hlResult?"var(--green)":"var(--red)"}}>
                  {hlResult?"✓ Bien vu !":"✗ Raté"}
                  {" · "}{rightBetter?"⬆️ Mieux classé":"⬇️ Moins bien classé"} que {hlLeft.nm}
                </div>
              </div>
            ):(
              <div style={{fontSize:"1.6rem",fontWeight:800,color:"var(--t5)",letterSpacing:".12em"}}>#?</div>
            )}
          </div>
        </div>

        {/* Boutons MIEUX / MOINS BIEN */}
        <div style={{display:"flex",gap:".7rem",paddingBottom:".2rem"}}>
          <button className="btn" disabled={hlPhase!=="playing"} onClick={()=>hlGuess("lower")}
            style={{flex:1,padding:"16px 12px",borderRadius:"16px",fontSize:".98rem",background:hlPick==="lower"?(hlResult?"var(--green)":"var(--red)"):"var(--s0)",
              border:`2px solid ${hlPick==="lower"?(hlResult?"var(--green)":"var(--red)"):"var(--bd2)"}`,
              color:hlPick==="lower"?"#fff":"var(--t1)",boxShadow:"var(--sh)",opacity:hlPhase!=="playing"&&hlPick!=="lower"?.5:1,fontWeight:800,lineHeight:1.2}}>
            ⬇️ Moins bien<br/><span style={{fontSize:".68rem",fontWeight:600,opacity:.8}}>classé</span>
          </button>
          <button className="btn" disabled={hlPhase!=="playing"} onClick={()=>hlGuess("higher")}
            style={{flex:1,padding:"16px 12px",borderRadius:"16px",fontSize:".98rem",background:hlPick==="higher"?(hlResult?"var(--green)":"var(--red)"):"var(--s0)",
              border:`2px solid ${hlPick==="higher"?(hlResult?"var(--green)":"var(--red)"):"var(--bd2)"}`,
              color:hlPick==="higher"?"#fff":"var(--t1)",boxShadow:"var(--sh)",opacity:hlPhase!=="playing"&&hlPick!=="higher"?.5:1,fontWeight:800,lineHeight:1.2}}>
            ⬆️ Mieux<br/><span style={{fontSize:".68rem",fontWeight:600,opacity:.8}}>classé</span>
          </button>
        </div>

        <div style={{textAlign:"center",color:"var(--t5)",fontSize:".66rem",fontWeight:600}}>
          <span style={{fontWeight:700,color:"var(--t4)"}}>{hlRight.nm}</span> est-il mieux ou moins bien classé que <span style={{fontWeight:700,color:"var(--t4)"}}>{hlLeft.nm}</span> ?
        </div>

        {/* Game over */}
        {hlPhase==="over"&&(
          <div className="overlay">
            <div className="sheet ashu" style={{textAlign:"center"}}>
              <div style={{fontSize:"3rem",marginBottom:".6rem"}}>{hlScore>=hsHL&&hlScore>0?"🏆":hlScore>=15?"🔥":"🎮"}</div>
              <div style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-.03em",color:"var(--t1)",marginBottom:".3rem"}}>
                {hlScore>=hsHL&&hlScore>0?"Nouveau record !":"Partie terminée"}
              </div>
              <div style={{fontWeight:600,fontSize:".88rem",color:"var(--t3)",marginBottom:"1.1rem"}}>Plus ou Moins</div>
              <div style={{background:"linear-gradient(135deg,rgba(50,215,75,.1),rgba(48,209,88,.06))",borderRadius:"14px",padding:"1rem",marginBottom:"1rem",border:"1px solid rgba(50,215,75,.2)"}}>
                <div style={{fontSize:".6rem",fontWeight:700,color:"var(--t4)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:".16rem"}}>SÉRIE FINALE</div>
                <div className="score-num" style={{fontWeight:800,fontSize:"3rem",color:"var(--green)",letterSpacing:"-.04em",lineHeight:1}}>{hlScore}</div>
                <div style={{fontSize:".76rem",color:"var(--t4)",fontWeight:500,marginTop:".3rem"}}>bonnes réponses d'affilée · record {Math.max(hsHL,hlScore)}</div>
              </div>
              <div style={{display:"flex",gap:".65rem",justifyContent:"center"}}>
                <button className="btn btn-green" onClick={startHL} style={{fontSize:".95rem",padding:"14px 26px"}}>🔄 Rejouer</button>
                <button className="btn btn-ghost" onClick={()=>setScrn("menu")} style={{fontSize:".9rem",padding:"14px 20px"}}>← Menu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     RANKING PLAY
  ═══════════════════════════════════════════════════════ */
  if(scr==="ranking_play"&&rCat){
    const di=dInfo(rCat.d);
    const foundCount=rSlots.filter(s=>s.revealed).length;

    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",padding:"1rem 1.1rem",maxWidth:"490px",margin:"0 auto",gap:".65rem",position:"relative",zIndex:1}}>
        <style>{CSS}</style>
        {xpOverlay}
        <AnimatedBG mode="rankings"/>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".3rem 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:".4rem"}}>
            <button className="btn btn-ghost" style={{padding:"7px 12px",fontSize:".82rem",borderRadius:"10px"}}
              onClick={()=>setScrn("menu")}>← Menu</button>
            <div className="surface" style={{padding:".24rem .65rem",fontSize:".74rem",color:"var(--t3)",fontWeight:600,borderRadius:"10px"}}>
              Manche <span style={{color:"var(--t1)",fontWeight:800}}>{rRound}</span>/3
            </div>
          </div>
          <div style={{textAlign:"center",position:"relative"}}>
            <div style={{fontSize:".57rem",fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".12em",textTransform:"uppercase"}}>SCORE</div>
            <div className="score-num" style={{fontWeight:800,fontSize:"1.8rem",letterSpacing:"-.04em",color:"#fff",lineHeight:1}}>{fmtN(rScore)}</div>
            {flt&&<span className="aflt" style={{top:0,left:"50%",transform:"translateX(-50%)",color:"var(--green)",fontWeight:800,fontSize:"1.05rem",whiteSpace:"nowrap"}}>{flt}</span>}
          </div>
          <div style={{display:"flex",gap:".4rem",alignItems:"center"}}>
            <div style={{fontSize:"1.1rem"}}>{[...Array(3)].map((_,i)=><span key={i}>{i<rLives?"❤️":"🤍"}</span>)}</div>
          </div>
        </div>

        {/* Category card */}
        <div className="surface" style={{padding:"1rem 1.15rem"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".35rem"}}>
            <span className="diff-badge" style={{background:`${di.c}18`,color:di.c,border:`1px solid ${di.c}28`,fontWeight:700}}>{rankDiff(rCat.d)} {di.l}</span>
            <span style={{fontSize:".68rem",color:"var(--t4)",fontWeight:500}}>{rCat.s}</span>
          </div>
          <div style={{fontWeight:800,fontSize:"clamp(1rem,3.5vw,1.3rem)",color:"var(--t1)",letterSpacing:"-.02em",lineHeight:1.25}}>
            <span style={{fontSize:"1.35rem",marginRight:".45rem"}}>{rCat.e}</span>{rCat.lb}
          </div>
          <div style={{marginTop:".55rem",display:"flex",alignItems:"center",gap:".5rem"}}>
            <div style={{flex:1,height:"5px",background:"var(--s3)",borderRadius:"3px",overflow:"hidden"}}>
              <div style={{height:"100%",background:"linear-gradient(90deg,var(--orange),var(--yellow))",borderRadius:"3px",width:`${foundCount*10}%`,transition:"width .4s cubic-bezier(.4,0,.2,1)"}}/>
            </div>
            <span style={{fontSize:".72rem",fontWeight:700,color:"var(--orange)"}}>{foundCount}/10</span>
          </div>
        </div>

        {/* Top 10 slots */}
        <div style={{display:"flex",flexDirection:"column",gap:".42rem"}}>
          {rSlots.map((slot,i)=>{
            const rankPts=(10-i)*100;
            const numCol=i===0?"#FFD60A":i===1?"#C0C0C0":i===2?"#CD7F32":"var(--t3)";
            return(
              <div key={i} className={`rank-slot${slot.revealed?" revealed":""}${slot.justRevealed?" just-revealed":slot.revealed?"":" hidden"}`}>
                <div className="rank-num" style={{background:slot.revealed?`${numCol}20`:"var(--s3)",color:slot.revealed?numCol:"var(--t5)",fontWeight:800}}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":`${i+1}`}
                </div>
                {slot.revealed?(
                  <div style={{display:"flex",alignItems:"center",gap:"10px",flex:1}}>
                    <span style={{fontSize:"1.3rem"}}>{slot.f}</span>
                    <span style={{fontWeight:700,fontSize:".95rem",color:"var(--t1)",flex:1}}>{slot.nm}</span>
                    <span className="score-num" style={{fontSize:".8rem",fontWeight:800,color:"var(--green)"}}>+2</span>
                  </div>
                ):(
                  <div style={{flex:1,display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{color:"var(--t5)",fontWeight:600,fontSize:".85rem",letterSpacing:".08em"}}>? ? ? ? ?</span>
                    <span style={{marginLeft:"auto",fontSize:".72rem",color:"var(--t5)",fontWeight:600}}>2 pts</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Wrong guesses */}
        {rWrong.length>0&&(
          <div style={{display:"flex",flexWrap:"wrap",gap:".4rem"}}>
            {rWrong.map((w,i)=>(
              <span key={i} className="wrong-pill">✗ {w.nm}</span>
            ))}
          </div>
        )}

        {/* Input */}
        {rPhase==="playing"&&(
          <div className={rShake?"ashk":""} style={{position:"relative"}}>
            <div style={{display:"flex",gap:".52rem"}}>
              <div style={{flex:1,position:"relative"}}>
                <input ref={rInpRef} value={rGuess} onChange={e=>onRInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")submitRanking();if(e.key==="Escape")setRSugg([]);}}
                  onBlur={()=>setTimeout(()=>setRSugg([]),150)}
                  placeholder="Saisir un pays du Top 10..."
                  className="inp" style={{borderColor:"var(--bd2)"}}/>
                {rSugg.length>0&&(
                  <div className="sugg" style={{position:"absolute",bottom:"calc(100% + 8px)",left:0,right:0,zIndex:50}}>
                    {rSugg.map(c=>(
                      <div key={c.nm} className="sugg-row" onMouseDown={()=>{setRGuess(c.nm);setRSugg([]);rInpRef.current?.focus();}}>
                        <span style={{fontSize:"1.08rem"}}>{c.f}</span>
                        <span style={{fontWeight:600,fontSize:".92rem",flex:1,color:"var(--t1)"}}>{c.nm}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn btn-gold" onClick={submitRanking}
                style={{padding:"0 20px",borderRadius:"14px",fontSize:"1.2rem",flexShrink:0,height:"52px"}}>✓</button>
            </div>
          </div>
        )}

        {/* Fin de manche */}
        {rPhase==="round_end"&&(
          <div className="overlay">
            <div className="sheet ashu" style={{textAlign:"center"}}>
              <div style={{fontSize:"3rem",marginBottom:".6rem"}}>{revealed===10?"🏆":revealed>=5?"👏":"💪"}</div>
              <div style={{fontWeight:800,fontSize:"1.5rem",letterSpacing:"-.03em",color:"var(--t1)",marginBottom:".25rem"}}>
                {revealed===10?"Top 10 complété !":`Manche ${rRound} terminée`}
              </div>
              <div style={{fontWeight:600,fontSize:".88rem",color:"var(--t3)",marginBottom:"1rem"}}>{rCat.e} {rCat.lb}</div>

              {/* Détail des points de la manche */}
              <div style={{background:"var(--s2)",borderRadius:"14px",padding:".9rem",marginBottom:".9rem",border:"1px solid var(--bd)"}}>
                <div style={{display:"flex",flexDirection:"column",gap:".35rem"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:".84rem"}}>
                    <span style={{color:"var(--t2)",fontWeight:500}}>{revealed} pays × 2 pts</span>
                    <span className="score-num" style={{fontWeight:800,color:"var(--t1)"}}>+{revealed*2}</span>
                  </div>
                  {revealed>=5&&revealed<10&&(
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:".84rem"}}>
                      <span style={{color:"var(--green)",fontWeight:600}}>Bonus 5+ pays</span>
                      <span className="score-num" style={{fontWeight:800,color:"var(--green)"}}>+3</span>
                    </div>
                  )}
                  {revealed===10&&(
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:".84rem"}}>
                      <span style={{color:"var(--orange)",fontWeight:600}}>Bonus Top 10 complet</span>
                      <span className="score-num" style={{fontWeight:800,color:"var(--orange)"}}>+13</span>
                    </div>
                  )}
                  <div style={{height:"1px",background:"var(--bd)",margin:".2rem 0"}}/>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:".95rem"}}>
                    <span style={{color:"var(--t1)",fontWeight:700}}>Total manche</span>
                    <span className="score-num" style={{fontWeight:800,color:"var(--orange)"}}>+{rRoundSc}</span>
                  </div>
                </div>
              </div>

              {/* Voir réponses manquantes */}
              {revealed<10&&(()=>{
                const missing=rSlots.filter(s=>!s.revealed);
                return(
                  <div style={{marginBottom:".9rem"}}>
                    <button onClick={()=>setShowMissing(v=>!v)} className="btn btn-ghost"
                      style={{width:"100%",padding:"10px",borderRadius:"12px",fontSize:".85rem",marginBottom:".5rem",justifyContent:"center"}}>
                      {showMissing?"🙈 Cacher":"👁 Voir les réponses manquantes"}
                    </button>
                    {showMissing&&(
                      <div style={{display:"flex",flexDirection:"column",gap:".3rem",textAlign:"left"}}>
                        {missing.map((s,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",padding:"8px 12px",background:"rgba(255,59,48,.06)",border:"1px solid rgba(255,59,48,.15)",borderRadius:"10px"}}>
                            <span style={{fontSize:"1.05rem"}}>{s.f}</span>
                            <span style={{fontWeight:600,fontSize:".85rem",color:"var(--t2)",flex:1}}>{s.nm}</span>
                            <span style={{fontSize:".7rem",color:"var(--red)",fontWeight:700}}>#{rSlots.indexOf(s)+1}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{fontSize:".8rem",color:"var(--t4)",fontWeight:500,marginBottom:".9rem"}}>
                Score total : <span style={{fontWeight:800,color:"var(--t2)"}}>{fmtN(rScore)}</span>
              </div>

              {rRound<3
                ? <button className="btn btn-gold" onClick={nextRanking} style={{width:"100%",fontSize:"1rem",padding:"15px",borderRadius:"14px"}}>Manche suivante ({rRound+1}/3) →</button>
                : <button className="btn btn-gold" onClick={()=>setRPhase("game_end")} style={{width:"100%",fontSize:"1rem",padding:"15px",borderRadius:"14px"}}>Voir le résultat final →</button>}
            </div>
          </div>
        )}

        {/* Fin de partie (3 manches) */}
        {rPhase==="game_end"&&(
          <div className="overlay">
            <div className="sheet ashu" style={{textAlign:"center"}}>
              <div style={{fontSize:"3rem",marginBottom:".6rem"}}>{rScore>=60?"🏆":rScore>=35?"🎉":"🎮"}</div>
              <div style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-.03em",color:"var(--t1)",marginBottom:".3rem"}}>Partie terminée</div>
              <div style={{fontWeight:600,fontSize:".88rem",color:"var(--t3)",marginBottom:"1.1rem"}}>3 manches · Top 10 Mondial</div>

              <div style={{background:"linear-gradient(135deg,rgba(255,159,10,.1),rgba(255,214,10,.08))",borderRadius:"14px",padding:"1rem",marginBottom:"1rem",border:"1px solid rgba(255,159,10,.2)"}}>
                <div style={{fontSize:".6rem",fontWeight:700,color:"var(--t4)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:".16rem"}}>SCORE FINAL</div>
                <div className="score-num" style={{fontWeight:800,fontSize:"3rem",color:"var(--orange)",letterSpacing:"-.04em",lineHeight:1}}>{fmtN(rScore)}</div>
                <div style={{fontSize:".76rem",color:"var(--t4)",fontWeight:500,marginTop:".3rem"}}>sur 69 possibles · record {fmtN(Math.max(hsR,rScore))}</div>
              </div>

              <div style={{display:"flex",gap:".65rem",justifyContent:"center"}}>
                <button className="btn btn-gold" onClick={startRanking} style={{fontSize:".95rem",padding:"14px 24px"}}>🔄 Rejouer</button>
                <button className="btn btn-ghost" onClick={()=>setScrn("menu")} style={{fontSize:".9rem",padding:"14px 20px"}}>← Menu</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     CUSTOM
  ═══════════════════════════════════════════════════════ */
  if(scr==="custom"){
    const sel=(f,v)=>setCx(p=>({...p,[f]:v}));
    const tog=f=>setCx(p=>({...p,[f]:!p[f]}));
    const togD=d=>setCx(p=>{const nd=p.diff.includes(d)?p.diff.filter(x=>x!==d):[...p.diff,d];return{...p,diff:nd.length?nd:p.diff};});
    const isFr=gt==="france";
    const rows=[
      {label:"⏱  Temps par indice",field:"timer",opts:[{l:"Sans limite",v:0},{l:"10s",v:10},{l:"20s",v:20},{l:"30s",v:30},{l:"60s",v:60}]},
      {label:"🎯  Manches",field:"rounds",opts:[{l:"5",v:5},{l:"10",v:10},{l:"15",v:15},{l:"20",v:20}]},
      {label:"💡  Indices max",field:"maxH",opts:[{l:"3 (Hardcore)",v:3},{l:"7",v:7},{l:"11 (Max)",v:11}]},
    ];
    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",padding:"1.5rem 1.25rem",maxWidth:"510px",margin:"0 auto",position:"relative",zIndex:1}}>
        <style>{CSS}</style>
        <AnimatedBG mode={gt}/>
        <div style={{display:"flex",alignItems:"center",gap:"1rem",marginBottom:"1.5rem"}}>
          <button className="btn btn-ghost" style={{padding:"9px 16px",fontSize:".85rem"}} onClick={()=>setScrn("menu")}>← Retour</button>
          <div style={{fontWeight:800,fontSize:"1.2rem",letterSpacing:"-.02em",color:"var(--t1)"}}>Partie personnalisée</div>
          <div style={{marginLeft:"auto",fontSize:"1.3rem"}}>{isFr?"🇫🇷":"🌍"}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:".85rem",overflowY:"auto",flex:1,paddingBottom:"1rem"}}>
          {rows.map(row=>(
            <div key={row.field} className="surface" style={{padding:"1.1rem"}}>
              <span className="slbl">{row.label}</span>
              <div style={{display:"flex",gap:".42rem",flexWrap:"wrap"}}>
                {row.opts.map(o=>(
                  <button key={String(o.v)} className={`tag${cx[row.field]===o.v?" on":""}`} onClick={()=>sel(row.field,o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
          ))}
          {!isFr&&<>
            <div className="surface" style={{padding:"1.1rem"}}>
              <span className="slbl">⚡  Difficulté</span>
              <div style={{display:"flex",gap:".42rem",flexWrap:"wrap"}}>
                {[{d:1,l:"Facile"},{d:2,l:"Moyen"},{d:3,l:"Difficile"},{d:4,l:"Extrême"}].map(o=>(
                  <button key={o.d} className={`tag${cx.diff.includes(o.d)?" on":""}`} onClick={()=>togD(o.d)}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="surface" style={{padding:"1.1rem"}}>
              <span className="slbl">🗺️  Région</span>
              <div style={{display:"flex",gap:".42rem",flexWrap:"wrap"}}>
                {[{l:"🌍 Monde",v:"all"},{l:"🇪🇺 Europe",v:"eu"},{l:"🌏 Asie",v:"as"},{l:"🌍 Afrique",v:"af"},{l:"🌎 Amériques",v:"am"},{l:"🌊 Océanie",v:"oc"},{l:"🏝️ Micro-états",v:"micro"},{l:"🌑 Rares",v:"rare"}].map(o=>(
                  <button key={o.v} className={`tag${cx.region===o.v?" on":""}`} onClick={()=>sel("region",o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
          </>}
          <div className="surface" style={{padding:"1.1rem"}}>
            <span className="slbl">🌪️  Modes spéciaux</span>
            <div style={{display:"flex",gap:".42rem",flexWrap:"wrap"}}>
              {[{f:"chaos",l:"🌪️ Chaos"},{f:"fake",l:"🎭 Fake Hint"}].map(o=>(
                <button key={o.f} className={`tag${cx[o.f]?" on":""}`} onClick={()=>tog(o.f)}>{o.l}</button>
              ))}
            </div>
            {cx.fake&&<div style={{fontSize:".72rem",color:"var(--orange)",marginTop:".5rem",fontWeight:500}}>⚠️ Un indice par manche sera faux</div>}
          </div>
          <button className={`btn btn-${isFr?"blue":"blue"}`} style={{padding:"17px",fontSize:"1rem",borderRadius:"16px"}}
            onClick={()=>startGame({id:"custom",icon:"⚙️",name:"Custom",col:accent,...cx})}>
            Lancer la partie →
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     NATION RUSH PLAYING
  ═══════════════════════════════════════════════════════ */
  if(scr==="playing"){
    if(!cc||!hints.length) return<div style={{minHeight:"100vh",position:"relative",zIndex:1}}><style>{CSS}</style><AnimatedBG mode={gt}/></div>;
    const curH=hints[hi],prevH=hints.slice(Math.max(0,hi-3),hi),nextH=hi<hints.length-1?hints[hi+1]:null;
    const isLast=hi>=hints.length-1,isFlag=curH?.id==="flag",isScr=curH?.id==="scramble";
    const di=dInfo(cc.d),pNow=roundPoints(hi),pNxt=roundPoints(hi+1);
    const isFr=gt==="france",accCol=isFr?"#1B4FBB":"var(--blue)";

    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",padding:"1rem 1.1rem",maxWidth:"490px",margin:"0 auto",gap:".6rem",position:"relative",zIndex:1}}>
        <style>{CSS}</style>
        <AnimatedBG mode={gt}/>

        {/* Header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".3rem 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:".4rem"}}>
            <button className="btn btn-ghost" style={{padding:"6px 11px",fontSize:"1rem",borderRadius:"10px"}}
              onClick={()=>setPaused(true)} aria-label="Menu">☰</button>
            <div className="surface" style={{padding:".24rem .7rem",fontSize:".76rem",color:"var(--t3)",fontWeight:600,borderRadius:"10px"}}>
              <span style={{color:"var(--t1)",fontWeight:800}}>{qi+1}</span>/{q.length}
            </div>
          </div>
          <div style={{textAlign:"center",position:"relative"}}>
            <div style={{fontSize:".57rem",fontWeight:700,color:"rgba(255,255,255,.5)",letterSpacing:".12em",textTransform:"uppercase"}}>SCORE</div>
            <div className="score-num" style={{fontWeight:800,fontSize:"1.8rem",letterSpacing:"-.04em",color:"#fff",lineHeight:1}}>{fmtN(score)}</div>
            {flt&&<span className="aflt" style={{top:0,left:"50%",transform:"translateX(-50%)",color:"var(--green)",fontWeight:800,fontSize:"1.05rem",whiteSpace:"nowrap"}}>{flt}</span>}
          </div>
          <div style={{display:"flex",gap:".42rem",alignItems:"center"}}>
            {!!cfg.timer&&<div className="score-num" style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-.04em",lineHeight:1,width:"1.8rem",textAlign:"center",color:spT<=2?"var(--red)":accCol,...(spT<=2?{animation:"blk .5s ease-in-out infinite"}:{})}}>{spT}</div>}
          </div>
        </div>

        {/* Points strip */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:".44rem .78rem",background:"var(--s0)",borderRadius:"13px",border:"1px solid var(--bd)",boxShadow:"var(--sh)"}}>
          <div style={{display:"flex",alignItems:"center",gap:".48rem"}}>
            {!isFr&&<span className="chip" style={{background:`${di.c}18`,color:di.c,border:`1px solid ${di.c}28`,fontWeight:700}}>{di.l}</span>}
            {isFr&&<span className="chip" style={{background:"rgba(27,79,187,.1)",color:"#1B4FBB",border:"1px solid rgba(27,79,187,.22)",fontWeight:700}}>🇫🇷 France</span>}
            <span style={{fontSize:".77rem",color:"var(--t4)",fontWeight:500}}>Cet indice :</span>
            <span className="score-num" style={{fontWeight:800,fontSize:".95rem",color:pNow>=8?"var(--green)":pNow>=4?"var(--yellow)":"var(--orange)"}}>{pNow} pt{pNow>1?"s":""}</span>
          </div>
          <div style={{display:"flex",gap:"4px"}}>
            {hints.map((_,i)=>(<div key={i} className="dot" style={{width:i<hi?16:i===hi?11:6,background:i<hi?`${accCol}35`:i===hi?accCol:"var(--s3)",boxShadow:i===hi?`0 0 6px ${accCol}70`:"none"}}/>))}
          </div>
        </div>

        {/* Hints */}
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:".44rem"}}>
          {prevH.map((h,i,arr)=>(
            <div key={`p${i}`} className="surface" style={{padding:".44rem .88rem",display:"flex",alignItems:"center",gap:".58rem",opacity:.18+(i/Math.max(arr.length-1,1))*.32,transform:`scale(${.95+i*.017})`,borderRadius:"14px"}}>
              <span style={{fontSize:".84rem",flexShrink:0}}>{h.icon}</span>
              <span style={{color:"var(--t4)",fontSize:".7rem",minWidth:"82px",fontWeight:600}}>{h.label}</span>
              <span style={{color:"var(--t3)",fontSize:".83rem",fontWeight:500}}>{h.value}</span>
            </div>
          ))}

          {phase==="playing"&&curH&&(
            <div key={`h${hi}`} className="surface-hint asr" style={{padding:"1.25rem"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:".72rem"}}>
                <div style={{display:"flex",alignItems:"center",gap:".45rem"}}>
                  <div style={{width:"8px",height:"8px",borderRadius:"50%",background:curH.col,boxShadow:`0 0 8px ${curH.col}90`,flexShrink:0}}/>
                  <span style={{fontSize:".63rem",fontWeight:800,letterSpacing:".1em",color:curH.col,textTransform:"uppercase"}}>{curH.label}</span>
                </div>
                <span style={{fontSize:".67rem",color:"var(--t4)",fontWeight:600}}>#{hi+1}/{hints.length}</span>
              </div>
              {isFlag?<div style={{textAlign:"center",padding:".5rem 0",fontSize:"4.5rem"}}>{curH.value}</div>
                :isScr?<div style={{textAlign:"center",padding:".3rem 0"}}>
                  <div>{curH.value.split("").map((l,i)=><span key={i} className="lbox">{l}</span>)}</div>
                  <div style={{color:"var(--t4)",fontSize:".72rem",marginTop:".55rem",fontWeight:500}}>Remets les lettres dans l'ordre</div>
                </div>
                :<div style={{fontWeight:600,fontSize:"clamp(1.05rem,3.5vw,1.48rem)",color:"var(--t1)",lineHeight:1.38,letterSpacing:"-.01em",wordBreak:"break-word"}}>{curH.value}</div>}
            </div>
          )}

          {phase==="revealed"&&revC&&!sheet&&(
            <div className="surface-fail asp" style={{padding:"1.65rem",textAlign:"center"}}>
              <div style={{fontSize:"3rem",marginBottom:".45rem"}}>{isFr?"📍":revC.f}</div>
              <div style={{color:"var(--red)",fontSize:".7rem",fontWeight:800,letterSpacing:".1em",textTransform:"uppercase",marginBottom:".26rem"}}>C'ÉTAIT...</div>
              <div style={{fontWeight:800,fontSize:"1.65rem",letterSpacing:"-.02em",color:"var(--t1)"}}>{revC.nm}</div>
              {isFr&&<div style={{color:"var(--t3)",fontSize:".82rem",marginTop:".28rem",fontWeight:500}}>{revC.rg}</div>}
              <div style={{color:"var(--t4)",fontSize:".8rem",marginTop:".42rem",fontWeight:500}}>0 point pour cette manche</div>
            </div>
          )}
        </div>

        {phase==="playing"&&(
          <div style={{display:"flex",flexDirection:"column",gap:".55rem"}}>
            <div className={shake?"ashk":""} style={{display:"flex",gap:".52rem"}}>
              <div style={{flex:1,position:"relative"}}>
                <input ref={inpRef} value={guess} onChange={e=>onInput(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Enter")submit();if(e.key==="Escape")setSg([]);}}
                  onBlur={()=>setTimeout(()=>setSg([]),150)}
                  placeholder={isFr?"Saisir la ville...":"Saisir le pays..."}
                  className="inp"/>
                {sugg.length>0&&(
                  <div className="sugg" style={{position:"absolute",bottom:"calc(100% + 8px)",left:0,right:0,zIndex:50}}>
                    {sugg.map(c=>(
                      <div key={c.nm} className="sugg-row" onMouseDown={()=>{setGs(c.nm);setSg([]);inpRef.current?.focus();}}>
                        <span style={{fontSize:"1.08rem"}}>{isFr?"📍":c.f}</span>
                        <span style={{fontWeight:600,fontSize:".92rem",flex:1,color:"var(--t1)"}}>{c.nm}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button className={`btn btn-${isFr?"blue":"blue"}`} onClick={submit}
                style={{padding:"0 20px",borderRadius:"14px",fontSize:"1.25rem",flexShrink:0,height:"52px"}}>✓</button>
            </div>

            <button className={`hint-btn${isLast?" hint-btn-last":""}`} onClick={doSkip}>
              <div style={{textAlign:"left",flex:1}}>
                <div style={{fontSize:".6rem",fontWeight:700,color:"var(--t4)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".28rem"}}>{isLast?"Révéler la réponse":"Prochain indice"}</div>
                <div style={{fontWeight:700,fontSize:"1.02rem",letterSpacing:"-.01em",color:isLast?"var(--red)":"var(--t1)",display:"flex",alignItems:"center",gap:".42rem"}}>
                  {isLast?<><span>⚡</span> Voir la réponse</>:nextH?<><span>{nextH.icon}</span> {nextH.label}</>:null}
                </div>
                {!isLast&&<div style={{fontSize:".72rem",color:"var(--orange)",marginTop:".18rem",fontWeight:600}}>−{pNow-pNxt} pt{(pNow-pNxt)>1?"s":""} sur la manche</div>}
              </div>
              <div style={{width:"44px",height:"44px",borderRadius:"12px",background:isLast?"rgba(255,59,48,.1)":`${accCol}14`,border:`1.5px solid ${isLast?"rgba(255,59,48,.22)":accCol+"30"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.05rem",color:isLast?"var(--red)":accCol,flexShrink:0,transition:"transform .1s"}}>→</div>
            </button>

            {/* Bouton passer */}
            <button className="btn btn-ghost" onClick={skipEntry}
              style={{padding:"11px",fontSize:".85rem",borderRadius:"13px",justifyContent:"center",color:"var(--t3)"}}>
              ⏭ Passer {isFr?"cette ville":"ce pays"} (0 pt)
            </button>

            {!!cfg.timer&&<div style={{height:"3px",background:"var(--s3)",borderRadius:"2px",overflow:"hidden"}}>
              <div key={`tb${hi}`} style={{height:"100%",background:`linear-gradient(90deg,${accCol},var(--green))`,borderRadius:"2px",animation:`shrink ${cfg.timer}s linear forwards`}}/>
            </div>}
          </div>
        )}

        <div style={{textAlign:"center",color:"var(--t5)",fontSize:".6rem",fontWeight:700,letterSpacing:".12em",textTransform:"uppercase"}}>
          {gt==="france"?"🇫🇷 VILLES DE FRANCE":"🌍 PAYS DU MONDE"}
        </div>

        {/* Overlay PAUSE / MENU */}
        {paused&&(
          <div className="overlay" style={{alignItems:"center"}} onClick={()=>setPaused(false)}>
            <div className="sheet ashu" style={{textAlign:"center",maxWidth:"360px"}} onClick={e=>e.stopPropagation()}>
              <div style={{fontSize:"2.2rem",marginBottom:".5rem"}}>⏸</div>
              <div style={{fontWeight:800,fontSize:"1.4rem",letterSpacing:"-.02em",color:"var(--t1)",marginBottom:".3rem"}}>Pause</div>
              <div style={{fontSize:".82rem",color:"var(--t4)",fontWeight:500,marginBottom:"1.4rem"}}>Manche {qi+1}/{q.length} · Score {fmtN(score)}</div>
              <div style={{display:"flex",flexDirection:"column",gap:".6rem"}}>
                <button className="btn btn-blue" style={{padding:"15px",fontSize:".95rem",borderRadius:"14px"}}
                  onClick={()=>{setPaused(false);setTimeout(()=>inpRef.current?.focus(),100);}}>▶ Reprendre</button>
                <button className="btn btn-ghost" style={{padding:"15px",fontSize:".95rem",borderRadius:"14px"}}
                  onClick={()=>{setPaused(false);startGame(cfg);}}>🔄 Recommencer</button>
                <button className="btn btn-ghost" style={{padding:"15px",fontSize:".95rem",borderRadius:"14px"}}
                  onClick={()=>{setPaused(false);setCanResume(true);setScrn("menu");}}>← Menu (reprise possible)</button>
              </div>
            </div>
          </div>
        )}

        {sheet&&bkd&&revC&&(
          <div className="overlay" onClick={()=>setSht(false)}>
            <div className="sheet ashu" onClick={e=>e.stopPropagation()}>
              <div style={{textAlign:"center",marginBottom:"1.15rem"}}>
                <div style={{fontSize:"2.8rem",marginBottom:".38rem"}}>{isFr?"📍":revC.f}</div>
                <div style={{fontSize:".7rem",fontWeight:800,color:"var(--green)",letterSpacing:".1em",textTransform:"uppercase",marginBottom:".2rem"}}>✓ CORRECT</div>
                <div style={{fontWeight:800,fontSize:"1.6rem",letterSpacing:"-.03em",color:"var(--t1)"}}>{revC.nm}</div>
                {isFr&&<div style={{color:"var(--t3)",fontSize:".82rem",marginTop:".18rem",fontWeight:500}}>{revC.rg}</div>}
              </div>
              <div style={{textAlign:"center",background:"rgba(0,102,255,.07)",borderRadius:"14px",padding:".9rem",marginBottom:".6rem",border:"1px solid rgba(0,102,255,.12)"}}>
                <div style={{fontSize:".6rem",fontWeight:700,color:"var(--t4)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:".16rem"}}>POINTS GAGNÉS</div>
                <div className="score-num" style={{fontWeight:800,fontSize:"2.8rem",color:"var(--blue)",letterSpacing:"-.04em",lineHeight:1}}>+{bkd.pts}</div>
                <div style={{fontSize:".74rem",color:"var(--t4)",fontWeight:500,marginTop:".25rem"}}>Trouvé à l'indice #{bkd.hi+1}</div>
              </div>
              <div style={{height:"2px",background:"var(--s3)",borderRadius:"2px",overflow:"hidden"}}>
                <div style={{height:"100%",background:"linear-gradient(90deg,var(--blue),var(--green))",borderRadius:"2px",animation:"shrink 2.5s linear forwards"}}/>
              </div>
              <div style={{textAlign:"center",marginTop:".58rem",fontSize:".7rem",color:"var(--t4)",fontWeight:500}}>Appuie pour continuer</div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════
     GAME OVER (NationRush)
  ═══════════════════════════════════════════════════════ */
  if(scr==="over"){
    const curHs=gt==="france"?hsF:hsW;
    const newRec=score>0&&score>=curHs;
    const played=q.length;
    const acc=played?Math.round((rOk/played)*100):0;
    const maxPossible=played*10;
    const isFr=gt==="france";
    return(
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"2rem 1.5rem",position:"relative",zIndex:1,textAlign:"center"}}>
        <style>{CSS}</style>
        <AnimatedBG mode={gt}/>
        {xpOverlay}
        <div className="afu" style={{width:"100%",maxWidth:"400px"}}>
          <div style={{fontSize:"2.8rem",marginBottom:".8rem"}}>{newRec?"🏆":rOk>played*.6?"🎉":"🎮"}</div>
          <div style={{fontWeight:800,fontSize:"clamp(1.5rem,5vw,2.1rem)",letterSpacing:"-.03em",color:"#fff",textShadow:"0 2px 16px rgba(0,0,0,.4)",marginBottom:".35rem"}}>{newRec?"Nouveau record !":"Partie terminée"}</div>
          <div style={{fontSize:".8rem",color:"rgba(255,255,255,.6)",fontWeight:500,marginBottom:".7rem"}}>{isFr?"🇫🇷 Villes de France":"🌍 Pays du Monde"}</div>
          {newRec&&<div style={{display:"inline-block",background:"rgba(255,214,10,.12)",border:"1px solid rgba(255,214,10,.28)",borderRadius:"10px",padding:".28rem 1rem",marginBottom:".75rem",color:"var(--yellow)",fontWeight:800,fontSize:".72rem",letterSpacing:".05em",textTransform:"uppercase"}}>✨ RECORD {isFr?"FRANCE":"MONDIAL"}</div>}
          <div className="surface-lg" style={{padding:"1.55rem 1.65rem",marginBottom:"1.4rem"}}>
            <div style={{fontSize:".6rem",fontWeight:700,color:"var(--t4)",letterSpacing:".12em",textTransform:"uppercase",marginBottom:".22rem"}}>SCORE FINAL</div>
            <div className="score-num" style={{fontWeight:800,fontSize:"3rem",letterSpacing:"-.04em",color:"var(--blue)",lineHeight:1,marginBottom:".2rem"}}>{fmtN(score)}</div>
            <div style={{fontSize:".76rem",color:"var(--t4)",fontWeight:500,marginBottom:".95rem"}}>sur {maxPossible} possibles</div>
            <div style={{height:"1px",background:"var(--bd)",margin:".85rem 0"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:".5rem"}}>
              {[{l:"Trouvés",v:`${rOk}/${played}`,c:"var(--green)"},{l:"Précision",v:`${acc}%`,c:"var(--yellow)"}].map(s=>(
                <div key={s.l} style={{background:"var(--s2)",borderRadius:"12px",padding:".58rem .38rem",border:"1px solid var(--bd)"}}>
                  <div style={{fontSize:".62rem",color:"var(--t4)",fontWeight:600,marginBottom:".18rem"}}>{s.l}</div>
                  <div className="score-num" style={{fontWeight:800,fontSize:"1.15rem",color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
            <div style={{height:"1px",background:"var(--bd)",margin:".85rem 0"}}/>
            <div style={{fontSize:".78rem",color:"var(--t4)",fontWeight:500}}>Meilleur : <span style={{fontWeight:800,color:"var(--t2)"}}>{fmtN(Math.max(curHs,score))}</span></div>
          </div>
          <div style={{display:"flex",gap:".65rem",justifyContent:"center"}}>
            <button className="btn btn-blue" onClick={()=>startGame(cfg)} style={{fontSize:".95rem",padding:"14px 30px"}}>🔄 Rejouer</button>
            <button className="btn btn-ghost" onClick={()=>setScrn("menu")} style={{fontSize:".9rem",padding:"14px 22px"}}>← Menu</button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
