# Italian CEFR & Fonetica Explorer 🇮🇹

An interactive HTML5 Single Page Application to paste or write Italian text, analyze phonological syllabification (*sillabazione*), classify tonic stress (*piana, sdrucciola, tronca, bisdrucciola*), explore CEFR levels (**A1–C2**), inspect verb conjugations, and practice listening with synchronized audio playback and hover-to-play buttons.

## 🚀 Live Demo
Experience the live application hosted on GitHub Pages:
**[https://pango47.github.io/italian-cefr-spa/](https://pango47.github.io/italian-cefr-spa/)**

---

## ✨ Features

- **📖 Ruby Annotated Text (Reader)**:
  - Toggle between **English translation glosses** or **Phonological syllabification** (`vi·ag·GIA·re`) right above each word.
  - Optional visual **CEFR badges (A1, A2, B1, B2, C1, C2)**.
  - **Full-Text Synchronized Audio Player**: Listen to the entire passage with karaoke-style highlighting of the currently spoken word and auto-scroll.
  - **Word Hover Play Button (`▶`)**: Hover over any word to pop up an instant pronunciation button.
  - Font size zoom controls (`A-` / `A+`).

- **🗣️ Phonological Syllabification & Tonic Stress (Accademia della Crusca)**:
  - Hiatus vs. Diphthong detection.
  - Double consonants (*consonanti doppie*) splitting rules.
  - *S* impura and inseparable consonant cluster grouping.
  - Automatic classification of tonic stress:
    - **Piana (Parossitona)**: Penultimate syllable (~80% of Italian words).
    - **Sdrucciola (Proparossitona)**: Antepenultimate syllable (*tàvola, àlbero, telèfono, sùbito*).
    - **Tronca (Ossitona)**: Final syllable (*caffè, città, virtù, perché*).
    - **Bisdrucciola**: 4th from last syllable (*àbitano, dimentìcamelo*).
    - **Monosillabo**: Diacritic accent rules (*è/e, dà/da, sì/si, là/la*).
  - Phonetic guidance for Italian learners: hard/soft *c* and *g*, *gl/gli*, *gn*, *sc*, and open/closed vowels (*è/é*, *ò/ó*).

- **🔍 Interactive Word & Verb Inspector Modal**:
  - Click any word to inspect its lemma, part of speech, gender, tonic stress type, and Accademia della Crusca rules.
  - Full verb conjugation tables covering **Presente, Imperfetto, Passato Prossimo, Futuro Semplice, Condizionale Presente, Congiuntivo Presente, and Imperativo**.

- **🗂️ Vocab Flashcards & 📋 Table View**:
  - Study cards with flip, CEFR tags, and frequency counts.
  - Sortable vocabulary table with one-click **CSV** and **Anki deck** export.

- **📊 CEFR & Phonetic Analytics**:
  - Lexical richness ratio (unique words vs total words).
  - CEFR difficulty breakdown bar chart.
  - Tonic stress distribution chart (Piana % vs Sdrucciola % vs Tronca %).

---

## 🛠️ Local Development

To run locally:
```bash
# Clone the repository
git clone https://github.com/pango47/italian-cefr-spa.git
cd italian-cefr-spa

# Launch with Node.js
node server.js
# Or on Windows, double-click start.bat
```
Navigate to `http://localhost:3002` in your browser.

---

## 📜 License
MIT License.
