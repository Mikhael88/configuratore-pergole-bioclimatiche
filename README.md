# Configuratore 3D Pergole Bioclimatiche

Applicazione web interattiva per la configurazione in tempo reale di pergole bioclimatiche in 3D con Three.js, React e Vite.

## ✨ Caratteristiche Principali

- **Visualizzazione 3D Real-time**: Modellazione parametrica e assemblaggio con Three.js (`@react-three/fiber` & `@react-three/drei`).
- **Asset CAD & Draco Compression**: Geometrie reali ottimizzate in formato GLB compresso con decodificatore locale Draco.
- **Design System Glassmorphism & Neumorphism**:
  - Pannello laterale satinato ad alto blur con specular highlight.
  - Controlli fisici, switch e slider tattili con finitura convessa/concava.
- **Parametrizzazione Completa**:
  - **Dimensioni**: Larghezza, profondità e altezza personalizzabili in tempo reale.
  - **Tetto & Lamelle**: Orientamento e inclinazione lamelle con cinematica fluida e sormonto watertight a tenuta di luce.
  - **Chiusure Laterali**: Tende a scorrimento verticale (zip screen) e vetrate panoramiche scorrevoli a doppia porta centrale simmetrica.
  - **Pareti & Montaggio**: Pergola autoportante a 4 colonne o addossata (1 parete / 2 pareti ad angolo).
  - **Finiture & Materiali**: Ampia selezione di colori sablé micacei, corten, bronzo architetturale e alluminio anodizzato con texture fisicamente accurate.
  - **Illuminazione & LED**: Strip LED integrate su travi perimetrali e colonne esterne, con controllo del sole (azimut ed elevazione) e ombre di contatto.
  - **Ambiente Studio & Cielo**: Pavimento a limbo infinito senza tagli visivi con nebbia volumetrica o ambiente naturale con HDRI.
- **Funzionalità di Export**:
  - 🔗 Condivisione configurazione con sincronizzazione istantanea su URL hash.
  - 📸 Screenshot HD ad alta risoluzione.
  - 📄 Generazione Scheda Tecnica PDF con viste ortogonali quotate (fronte, lato, alto).

## 🛠️ Stack Tecnologico

- **React 19** + **TypeScript**
- **Vite 5**
- **Three.js** (`@react-three/fiber` v9, `@react-three/drei` v10)
- **Zustand 5** (State management reattivo e unidirezionale)
- **jsPDF** (Generazione schede tecniche PDF)

## 🚀 Avvio Rapido

### Installazione Dipendenze
```bash
npm install
```

### Avvio Server di Sviluppo
```bash
npm run dev
```
Il configuratore sarà disponibile all'indirizzo `http://localhost:5173/`.

### Build di Produzione
```bash
npm run build
npm run preview
```

## 📁 Struttura del Progetto

```
configurator/
├── public/
│   ├── draco/               # Decodificatore locale Draco WASM/JS
│   └── models/              # Modello 3D GLB (pergola-lib.glb)
├── src/
│   ├── lib/
│   │   ├── store.ts         # Store globale Zustand e sync URL
│   │   └── types.ts         # Definizione tipi configurazione
│   ├── scene/
│   │   ├── Pergola.tsx      # Assemblaggio 3D principale
│   │   ├── SceneEnv.tsx     # Illuminazione, ombre, limbo infinito
│   │   ├── WallMounting.tsx # Pareti perimetrali per montaggio addossato
│   │   └── ...
│   ├── ui/
│   │   └── Panel.tsx        # Interfaccia utente Neumorphism / Glassmorphism
│   ├── App.tsx              # Componente radice e canvas 3D
│   ├── index.css            # Stili globali e componenti fisici
│   └── main.tsx             # Entry point React
└── package.json
```
