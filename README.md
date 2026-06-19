# 🌍 Nation Rush

Jeu de culture générale : devine les pays du monde, les villes de France, les classements mondiaux, joue au Plus ou Moins et démasque les imposteurs. Avec défis quotidiens, système d'XP et niveaux.

---

## 🚀 Mettre en ligne sur Netlify

### Méthode 1 — Glisser-déposer (la plus rapide)

1. Ouvre un terminal dans ce dossier et lance :
   ```bash
   npm install
   npm run build
   ```
2. Un dossier `dist/` est créé.
3. Va sur **https://app.netlify.com/drop**
4. Glisse-dépose le dossier `dist/` dans la page. C'est en ligne. ✅

### Méthode 2 — Via GitHub (déploiements automatiques)

1. Mets ce dossier sur un dépôt GitHub.
2. Sur Netlify : **Add new site → Import an existing project → GitHub**.
3. Sélectionne le dépôt. Netlify lit le fichier `netlify.toml` :
   - Build command : `npm run build`
   - Publish directory : `dist`
4. Clique **Deploy**. À chaque `git push`, le site se met à jour tout seul.

---

## 🛠️ Développement en local

```bash
npm install      # une seule fois
npm run dev      # lance le serveur local (http://localhost:5173)
npm run build    # génère le dossier dist/ pour la production
npm run preview  # prévisualise le build de production
```

---

## 📁 Structure

```
nation-rush/
├── index.html            # point d'entrée HTML
├── package.json          # dépendances et scripts
├── vite.config.js        # configuration Vite
├── netlify.toml          # configuration de déploiement Netlify
├── .gitignore
└── src/
    ├── main.jsx          # point d'entrée React
    ├── index.css         # styles globaux (reset + fond sombre)
    └── NationRush.jsx    # tout le jeu (5 modes, données, logique, UI)
```

---

## ℹ️ Bon à savoir

- **Aucun backend** : la progression (meilleurs scores, XP, niveaux, défis du jour)
  est stockée dans le `localStorage` du navigateur. Chaque joueur garde sa progression
  sur son appareil. Pas de classement mondial pour l'instant (cela nécessiterait un
  service comme Supabase ou Firebase).
- **100% statique** : se déploie partout (Netlify, Vercel, GitHub Pages, Cloudflare Pages…).
- Données chiffrées issues de sources publiques (ONU, FMI, OMS, CIO, Forbes, FAO…).

Bon jeu ! 🎮
