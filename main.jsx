* { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  min-height: 100vh;
}

body {
  background: #0a0e1a;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  overscroll-behavior: none;
}

/* Évite le zoom involontaire sur mobile au focus d'un champ */
input, button, select, textarea { font-family: inherit; }
