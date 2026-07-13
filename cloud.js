// ════════════════════════════════════════════════════════════════
//  cloud.js — Backend Nation Rush (Supabase)
//  Tout passe par ce fichier. Si les clés ne sont pas renseignées,
//  le jeu fonctionne normalement en mode hors-ligne (sans planter).
//
//  NOTE : Supabase est chargé DYNAMIQUEMENT (import() au runtime) pour
//  que l'aperçu/preview fonctionne même sans npm install. En production
//  (après `npm install`), tout marche normalement.
// ════════════════════════════════════════════════════════════════

// ⚠️ COLLE TES 2 CLÉS ICI (Supabase → Project Settings → API)
const SUPABASE_URL = "https://edwshvnvldtvrhkkdhxa.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_POLm4dn_rYp6Y7Io-7UHxw_zen02gbP";

let supabase = null;
let _initTried = false;

// Le cloud est "activé" uniquement si les 2 clés sont renseignées
export const cloudEnabled = () => !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// Charge Supabase à la demande (import dynamique → ne casse pas le preview)
async function getClient() {
  if (!cloudEnabled()) return null;
  if (supabase) return supabase;
  if (_initTried) return null;
  _initTried = true;
  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabase;
  } catch (e) {
    console.warn("[cloud] Supabase non disponible:", e);
    return null;
  }
}

// ── Connexion anonyme automatique (aucune friction pour le joueur) ──
export async function ensureSession() {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { data: { session } } = await sb.auth.getSession();
    if (session) return session.user;
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) { console.warn("[cloud] auth anon:", error.message); return null; }
    return data.user;
  } catch (e) {
    console.warn("[cloud] ensureSession:", e);
    return null;
  }
}

// ── Récupérer mon profil (pseudo, avatar, code ami) ──
export async function getProfile() {
  const sb = await getClient();
  if (!sb) return null;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;
  const { data } = await sb.from("profiles").select("*").eq("id", user.id).single();
  return data;
}

// ── Changer mon pseudo / avatar ──
export async function updateProfile({ pseudo, avatar }) {
  const sb = await getClient();
  if (!sb) return;
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  const patch = {};
  if (pseudo !== undefined) patch.pseudo = pseudo.slice(0, 18);
  if (avatar !== undefined) patch.avatar = avatar;
  await sb.from("profiles").update(patch).eq("id", user.id);
}

// ── Envoyer un score (le backend ne garde que le meilleur) ──
export async function submitScore(mode, score) {
  if (!score) return;
  const sb = await getClient();
  if (!sb) return;
  try {
    await sb.rpc("submit_score", { p_mode: mode, p_score: Math.round(score) });
  } catch (e) {
    console.warn("[cloud] submitScore:", e);
  }
}

// ── Classement mondial d'un mode (Top 100) ──
export async function getLeaderboard(mode, limit = 100) {
  const sb = await getClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("leaderboard", { p_mode: mode, p_limit: limit });
  if (error) { console.warn("[cloud] leaderboard:", error.message); return []; }
  return data || [];
}

// ── Mon rang mondial sur un mode ──
export async function getMyRank(mode) {
  const sb = await getClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc("my_rank", { p_mode: mode });
  if (error) return null;
  return data;
}

// ── Classement entre amis ──
export async function getFriendsLeaderboard(mode) {
  const sb = await getClient();
  if (!sb) return [];
  const { data, error } = await sb.rpc("friends_leaderboard", { p_mode: mode });
  if (error) { console.warn("[cloud] friends_leaderboard:", error.message); return []; }
  return data || [];
}

// ── Ajouter un ami via son code ('ok' | 'introuvable' | 'soi-meme') ──
export async function addFriend(code) {
  const sb = await getClient();
  if (!sb) return "offline";
  const { data, error } = await sb.rpc("add_friend", { p_code: code });
  if (error) { console.warn("[cloud] add_friend:", error.message); return "erreur"; }
  return data;
}
