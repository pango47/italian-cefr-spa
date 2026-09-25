/**
 * Italian CEFR & Pronunciation Explorer - Core Application Engine
 */

// ==========================================
// 1. Speech Synthesis Controller
// ==========================================
const SpeechController = {
  voice: null,
  lang: 'it-IT',
  rate: 0.85,

  init() {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => this.loadVoices();
      this.loadVoices();
    }
  },

  loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();

    // Find Italian voice
    this.voice = voices.find(v => v.lang.replace('_', '-').startsWith('it')) || null;

    // Populate voice dropdown in settings
    const voiceSelect = document.getElementById('setting-tts-voice');
    if (voiceSelect) {
      voiceSelect.innerHTML = '';
      const italianVoices = voices.filter(v => v.lang.startsWith('it'));
      if (italianVoices.length === 0) {
        voiceSelect.innerHTML = '<option value="">Voce Italiana Predefinita del Sistema</option>';
      } else {
        italianVoices.forEach(v => {
          const opt = document.createElement('option');
          opt.value = v.name;
          opt.textContent = `${v.name} (${v.lang})`;
          if (this.voice && this.voice.name === v.name) opt.selected = true;
          voiceSelect.appendChild(opt);
        });
      }
    }
  },

  speak(text) {
    if (!('speechSynthesis' in window)) {
      alert('La sintesi vocale non è supportata su questo browser.');
      return;
    }
    RubyAudioPlayer.stop();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = this.rate;
    window.speechSynthesis.speak(utterance);
  },

  speakWord(text, blockEl) {
    if (RubyAudioPlayer.isPlaying && !RubyAudioPlayer.isPaused) {
      RubyAudioPlayer.pause();
    }

    if (blockEl) {
      blockEl.classList.add('word-highlight-active');
      setTimeout(() => {
        if (!RubyAudioPlayer.isPlaying) {
          blockEl.classList.remove('word-highlight-active');
        }
      }, 750);
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    if (this.voice) utterance.voice = this.voice;
    utterance.rate = RubyAudioPlayer.speed || this.rate;
    window.speechSynthesis.speak(utterance);
  }
};

// ==========================================
// 2. Sequential Text Audio Player (Karaoke)
// ==========================================
const RubyAudioPlayer = {
  isPlaying: false,
  isPaused: false,
  currentIndex: 0,
  tokens: [],
  speed: 0.8,
  timer: null,

  start(tokens) {
    if (!tokens || tokens.length === 0) return;
    this.stop();
    this.tokens = tokens;
    this.currentIndex = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.updateUI('playing');
    this.playStep();
  },

  pause() {
    if (!this.isPlaying) return;
    this.isPaused = true;
    clearTimeout(this.timer);
    window.speechSynthesis.cancel();
    this.updateUI('paused');
    const statusEl = document.getElementById('ruby-play-status');
    if (statusEl) {
      statusEl.textContent = `⏸️ In pausa alla parola ${this.getWordStepNumber()} di ${this.getWordTokensCount()}`;
    }
  },

  resume() {
    if (!this.isPlaying || !this.isPaused) return;
    this.isPaused = false;
    this.updateUI('playing');
    this.playStep();
  },

  stop() {
    this.isPlaying = false;
    this.isPaused = false;
    clearTimeout(this.timer);
    window.speechSynthesis.cancel();
    this.clearHighlights();
    this.updateUI('idle');
    const statusEl = document.getElementById('ruby-play-status');
    if (statusEl) {
      statusEl.textContent = '💡 Passa il mouse sopra qualsiasi parola per ascoltarne la pronuncia';
    }
  },

  playStep() {
    if (!this.isPlaying || this.isPaused) return;

    while (this.currentIndex < this.tokens.length && this.tokens[this.currentIndex].type === 'non-word') {
      this.currentIndex++;
    }

    if (this.currentIndex >= this.tokens.length) {
      this.stop();
      const statusEl = document.getElementById('ruby-play-status');
      if (statusEl) statusEl.textContent = '✨ Lettura del testo completata!';
      return;
    }

    const tok = this.tokens[this.currentIndex];
    const blockEl = document.querySelector(`.italian-word-block[data-token-idx="${this.currentIndex}"]`);

    this.highlightBlock(blockEl);

    const totalWords = this.getWordTokensCount();
    const currentNum = this.getWordStepNumber();
    const statusEl = document.getElementById('ruby-play-status');
    if (statusEl) {
      statusEl.innerHTML = `🔊 Riproduzione: <strong>${tok.text}</strong> <span style="color:var(--accent-primary);">[${tok.syllables?.hyphenated || ''}]</span> (${currentNum}/${totalWords})`;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(tok.text);
    utterance.lang = SpeechController.lang;
    if (SpeechController.voice) utterance.voice = SpeechController.voice;
    utterance.rate = this.speed;

    let handled = false;
    const advance = () => {
      if (handled) return;
      handled = true;

      let pauseMs = 80;
      const nextTok = this.tokens[this.currentIndex + 1];
      if (nextTok && nextTok.type === 'non-word') {
        if (/[,;]/.test(nextTok.text)) {
          pauseMs = 280;
        } else if (/[.!?\n]/.test(nextTok.text)) {
          pauseMs = 450;
        }
      }

      this.currentIndex++;
      this.timer = setTimeout(() => {
        this.playStep();
      }, pauseMs);
    };

    utterance.onend = advance;
    utterance.onerror = () => advance();

    const maxTime = Math.max(1200, (tok.text.length * 600) / this.speed);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!handled && this.isPlaying && !this.isPaused) advance();
    }, maxTime);

    window.speechSynthesis.speak(utterance);
  },

  highlightBlock(blockEl) {
    this.clearHighlights();
    if (blockEl) {
      blockEl.classList.add('word-highlight-active');
      blockEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  },

  clearHighlights() {
    document.querySelectorAll('.italian-word-block.word-highlight-active').forEach(el => {
      el.classList.remove('word-highlight-active');
    });
  },

  getWordTokensCount() {
    return this.tokens.filter(t => t.type === 'word').length;
  },

  getWordStepNumber() {
    let count = 0;
    for (let i = 0; i <= this.currentIndex && i < this.tokens.length; i++) {
      if (this.tokens[i].type === 'word') count++;
    }
    return count;
  },

  updateUI(state) {
    const btnPlay = document.getElementById('btn-ruby-play');
    const btnPause = document.getElementById('btn-ruby-pause');
    const btnStop = document.getElementById('btn-ruby-stop');
    const playText = document.getElementById('ruby-play-text');
    const playIcon = document.getElementById('ruby-play-icon');

    if (state === 'playing') {
      if (btnPlay) btnPlay.style.display = 'none';
      if (btnPause) {
        btnPause.style.display = 'inline-flex';
        btnPause.textContent = '⏸️ Pausa';
      }
      if (btnStop) btnStop.style.display = 'inline-flex';
    } else if (state === 'paused') {
      if (btnPlay) {
        btnPlay.style.display = 'inline-flex';
        if (playText) playText.textContent = 'Riprendi';
        if (playIcon) playIcon.textContent = '▶️';
      }
      if (btnPause) btnPause.style.display = 'none';
      if (btnStop) btnStop.style.display = 'inline-flex';
    } else {
      // idle
      if (btnPlay) {
        btnPlay.style.display = 'inline-flex';
        if (playText) playText.textContent = 'Riproduci Testo';
        if (playIcon) playIcon.textContent = '▶️';
      }
      if (btnPause) btnPause.style.display = 'none';
      if (btnStop) btnStop.style.display = 'none';
    }
  }
};

// ==========================================
// 3. Italian Text Tokenizer & Grammar Engine
// ==========================================
class ItalianAnalyzer {
  constructor() {
    this.dict = window.ITALIAN_DICT || {};
    this.paradigms = window.ITALIAN_VERB_PARADIGMS || {};
  }

  tokenize(text) {
    if (!text || !text.trim()) return [];

    // Split keeping words with apostrophes (e.g. l'amico, un'altra, dell'arte)
    // Regex matches contractions and standard words
    const regex = /([a-zàáèéìíòóùú]+['’]|[a-zàáèéìíòóùú]+|[^a-zàáèéìíòóùú\s]+|\s+)/gi;
    const rawTokens = text.match(regex) || [];

    const tokens = [];
    rawTokens.forEach(raw => {
      if (/^\s+$/.test(raw)) {
        tokens.push({ type: 'non-word', text: raw, isSpace: true });
        return;
      }

      if (!/[a-zàáèéìíòóùú]/i.test(raw)) {
        tokens.push({ type: 'non-word', text: raw, isPunct: true });
        return;
      }

      const lower = raw.toLowerCase();
      // Handle apostrophe contraction: e.g. "l'amico" -> if raw was "l'"
      const cleanWord = lower.replace(/['’]/g, '');

      // Lookup in dictionary
      let entry = this.dict[lower] || this.dict[cleanWord];

      let lemma = cleanWord;
      let cefr = 'none';
      let pos = '';
      let gender = '';
      let meaning = '';
      let tense = '';
      let shortGloss = '';

      if (entry) {
        lemma = entry.l || cleanWord;
        cefr = entry.c || 'none';
        pos = entry.p || '';
        gender = entry.g || '';
        meaning = entry.m || '';
        shortGloss = entry.sg || '';
        tense = entry.t || '';
        person = entry.pn || '';
        theme = entry.theme || '';
      } else {
        // Fallback: estimate CEFR based on suffix and length
        if (cleanWord.endsWith('are') || cleanWord.endsWith('ere') || cleanWord.endsWith('ire')) {
          pos = 'v';
          cefr = 'B1';
          meaning = 'verb';
          shortGloss = 'verb';
        } else if (cleanWord.endsWith('mente')) {
          pos = 'adv';
          cefr = 'B2';
          meaning = 'adverb';
          shortGloss = 'adverb';
        } else if (cleanWord.length > 9) {
          cefr = 'B2';
        } else if (cleanWord.length > 6) {
          cefr = 'B1';
        } else {
          cefr = 'A2';
        }
      }

      // Syllabification and stress analysis
      const sylData = window.ItalianSyllables ? window.ItalianSyllables.analyze(raw) : null;

      tokens.push({
        type: 'word',
        text: raw,
        lower: lower,
        clean: cleanWord,
        lemma: lemma,
        cefr: cefr,
        pos: pos,
        gender: gender,
        meaning: meaning,
        shortGloss: shortGloss,
        tense: tense,
        person: person,
        theme: theme,
        syllables: sylData
      });
    });

    return tokens;
  }

  extractUniqueWords(tokens) {
    const map = new Map();
    tokens.forEach(tok => {
      if (tok.type === 'word') {
        const key = tok.lower;
        if (!map.has(key)) {
          map.set(key, { ...tok, count: 1 });
        } else {
          map.get(key).count++;
        }
      }
    });
    return Array.from(map.values());
  }

  // Generate dynamic regular verb conjugation paradigm if not present in static list
  getVerbParadigm(lemma) {
    if (this.paradigms[lemma]) {
      return this.paradigms[lemma];
    }

    // Dynamic generation for regular -are, -ere, -ire verbs
    if (lemma.endsWith('are')) {
      const stem = lemma.slice(0, -3);
      return {
        infinitive: lemma,
        cefr: 'A2',
        auxiliary: 'avere',
        meaning: `to ${lemma.slice(0, -3)}`,
        presente: [stem + 'o', stem + 'i', stem + 'a', stem + 'iamo', stem + 'ate', stem + 'ano'],
        imperfetto: [stem + 'avo', stem + 'avi', stem + 'ava', stem + 'avamo', stem + 'avate', stem + 'avano'],
        passato_prossimo: [`ho ${stem}ato`, `hai ${stem}ato`, `ha ${stem}ato`, `abbiamo ${stem}ato`, `avete ${stem}ato`, `hanno ${stem}ato`],
        futuro: [stem + 'erò', stem + 'erai', stem + 'erà', stem + 'eremo', stem + 'erete', stem + 'eranno'],
        condizionale: [stem + 'erei', stem + 'eresti', stem + 'erebbe', stem + 'eremmo', stem + 'ereste', stem + 'erebbero'],
        congiuntivo_pres: [stem + 'i', stem + 'i', stem + 'i', stem + 'iamo', stem + 'iate', stem + 'ino'],
        imperativo: ['-', stem + 'a', stem + 'i', stem + 'iamo', stem + 'ate', stem + 'ino'],
        gerundio: stem + 'ando',
        participio_passato: stem + 'ato'
      };
    } else if (lemma.endsWith('ere')) {
      const stem = lemma.slice(0, -3);
      return {
        infinitive: lemma,
        cefr: 'A2',
        auxiliary: 'avere',
        meaning: `to ${lemma.slice(0, -3)}`,
        presente: [stem + 'o', stem + 'i', stem + 'e', stem + 'iamo', stem + 'ete', stem + 'ono'],
        imperfetto: [stem + 'evo', stem + 'evi', stem + 'eva', stem + 'evamo', stem + 'evate', stem + 'evano'],
        passato_prossimo: [`ho ${stem}uto`, `hai ${stem}uto`, `ha ${stem}uto`, `abbiamo ${stem}uto`, `avete ${stem}uto`, `hanno ${stem}uto`],
        futuro: [stem + 'erò', stem + 'erai', stem + 'erà', stem + 'eremo', stem + 'erete', stem + 'eranno'],
        condizionale: [stem + 'erei', stem + 'eresti', stem + 'erebbe', stem + 'eremmo', stem + 'ereste', stem + 'erebbero'],
        congiuntivo_pres: [stem + 'a', stem + 'a', stem + 'a', stem + 'iamo', stem + 'iate', stem + 'ano'],
        imperativo: ['-', stem + 'i', stem + 'a', stem + 'iamo', stem + 'ete', stem + 'ano'],
        gerundio: stem + 'endo',
        participio_passato: stem + 'uto'
      };
    } else if (lemma.endsWith('ire')) {
      const stem = lemma.slice(0, -3);
      return {
        infinitive: lemma,
        cefr: 'A2',
        auxiliary: 'avere',
        meaning: `to ${lemma.slice(0, -3)}`,
        presente: [stem + 'o', stem + 'i', stem + 'e', stem + 'iamo', stem + 'ite', stem + 'ono'],
        imperfetto: [stem + 'ivo', stem + 'ivi', stem + 'iva', stem + 'ivamo', stem + 'ivate', stem + 'ivano'],
        passato_prossimo: [`ho ${stem}ito`, `hai ${stem}ito`, `ha ${stem}ito`, `abbiamo ${stem}ito`, `avete ${stem}ito`, `hanno ${stem}ito`],
        futuro: [stem + 'irò', stem + 'irai', stem + 'irà', stem + 'iremo', stem + 'irete', stem + 'iranno'],
        condizionale: [stem + 'irei', stem + 'iresti', stem + 'irebbe', stem + 'iremmo', stem + 'ireste', stem + 'irebbero'],
        congiuntivo_pres: [stem + 'a', stem + 'a', stem + 'a', stem + 'iamo', stem + 'iate', stem + 'ano'],
        imperativo: ['-', stem + 'i', stem + 'a', stem + 'iamo', stem + 'ite', stem + 'ano'],
        gerundio: stem + 'endo',
        participio_passato: stem + 'ito'
      };
    }
    return null;
  }
}

const analyzer = new ItalianAnalyzer();

// ==========================================
// 4. Application State
// ==========================================
const state = {
  inputText: '',
  tokens: [],
  uniqueWords: [],
  activeTab: 'ruby-view',
  rubyAnnotation: 'meaning', // 'meaning' or 'syllables'
  showCefrBadges: true,
  cardFilterCefr: 'all',
  cardSortBy: 'order',
  vocabFilterCefr: 'all',
  rubyFontSize: 1.4
};

function updateRubyFontSize() {
  const size = state.rubyFontSize || 1.4;
  const rtSize = Math.max(0.65, size * 0.45);
  document.documentElement.style.setProperty('--ruby-word-size', `${size}rem`);
  document.documentElement.style.setProperty('--ruby-rt-size', `${rtSize.toFixed(2)}rem`);
}

// Sample Presets Collection
const SAMPLE_PRESETS = {
  a1: 'Ciao a tutti! Mi chiamo Marco e vivo a Roma con la mia famiglia. La mattina faccio colazione con un caffè e un cornetto, poi vado al lavoro in treno. La sera mi piace cucinare la pasta e bere un buon bicchiere di vino con i miei amici.',
  a2: "L'estate scorsa abbiamo fatto un bellissimo viaggio a Firenze. Abbiamo visitato la cattedrale, comprato delle scarpe di pelle al mercato centrale e mangiato una deliziosa pizza margherita. Domani partiremo presto per andare al mare.",
  b1: "Sebbene il tempo fosse incerto, abbiamo deciso di esplorare le colline toscane. Credo che sia un'esperienza fondamentale per comprendere le antiche tradizioni e la cultura enogastronomica di questo splendido paese.",
  b2: 'Il neorealismo italiano ha trasformato profondamente il panorama cinematografico internazionale. È imprescindibile valorizzare il patrimonio artistico e promuovere una ricerca innovativa per affrontare le sfide della contemporaneità.',
  c1: "La salvaguardia del patrimonio culturale esige un approccio olistico e lungimirante, capace di sviscerare le complessità storiche senza mai sminuire la valenza estetica ed etica delle opere d'arte.",
  c2: "L'indagine ontologica svela la natura effimera della realtà fenomenica, dischiudendo orizzonti ermeneutici che trascendono la mera apodittica razionalità.",
  subjunctive: "Penso che sia necessario che tu vada a Venezia e che veda Piazza San Marco al tramonto. Se avessimo avuto più tempo, saremmo rimasti anche a Verona per assistere all'opera lirica all'Arena di Verona."
};

// ==========================================
// 5. UI Renderers
// ==========================================

// Intelligent Ruby Gloss Formatter
function getRubyGloss(tok) {
  if (state.rubyAnnotation === 'syllables') {
    return tok.syllables?.hyphenated || tok.text;
  }

  // 1. If explicit concise short gloss is available
  if (tok.shortGloss) {
    return tok.shortGloss;
  }

  // 2. If meaning exists, format it concisely for ruby display
  if (tok.meaning) {
    let m = tok.meaning;
    // Strip tense brackets: e.g. "[Presente]" or "[dovere]"
    m = m.replace(/\[.*?\]/g, '').trim();
    // Strip detailed gender notes: e.g. "(masculine singular before consonant)" -> ""
    m = m.replace(/\(masculine singular.*?\)/gi, '')
         .replace(/\(feminine singular.*?\)/gi, '')
         .replace(/\(masculine plural.*?\)/gi, '')
         .replace(/\(feminine plural.*?\)/gi, '')
         .replace(/\(.*?\)/g, '').trim();

    // Split on comma, semicolon, slash and pick the most concise English meaning
    const parts = m.split(/[;,/]/).map(s => s.trim()).filter(Boolean);
    if (parts.length > 0) {
      let candidate = parts[0];
      if (parts.length > 1 && (parts[0].length + parts[1].length < 15)) {
        candidate = `${parts[0]} / ${parts[1]}`;
      }
      return candidate.length > 22 ? candidate.slice(0, 20) + '…' : candidate;
    }
    return m.length > 22 ? m.slice(0, 20) + '…' : m;
  }

  // 3. Uniform height placeholder
  return '';
}

// Render Annotated Ruby Text
function renderRubyView() {
  const container = document.getElementById('ruby-text-container');
  if (!container) return;
  container.innerHTML = '';

  RubyAudioPlayer.stop();

  if (state.tokens.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
      <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">Nessun testo italiano inserito.</p>
      <p style="font-size: 0.85rem;">Incolla un testo italiano sopra e clicca <strong>Analizza Testo</strong> oppure scegli uno degli esempi.</p>
    </div>`;
    const statusEl = document.getElementById('ruby-play-status');
    if (statusEl) statusEl.textContent = '💡 Passa il mouse sopra qualsiasi parola per ascoltarne la pronuncia';
    return;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'ruby-text-wrapper';

  state.tokens.forEach((tok, tokIdx) => {
    if (tok.type === 'non-word') {
      const span = document.createElement('span');
      span.className = 'punct-span';
      span.textContent = tok.text;
      wrapper.appendChild(span);
      return;
    }

    const block = document.createElement('div');
    block.className = 'italian-word-block';
    block.setAttribute('data-token-idx', tokIdx);
    block.title = tok.meaning ? `${tok.text} [${tok.cefr}]: ${tok.meaning}` : tok.text;
    block.onclick = () => openInspector(tok.text, tok);

    // Floating Hover Play Button
    const hoverPlayBtn = document.createElement('button');
    hoverPlayBtn.className = 'word-hover-play-btn';
    hoverPlayBtn.title = `Ascolta "${tok.text}"`;
    hoverPlayBtn.setAttribute('aria-label', `Riproduci pronuncia per ${tok.text}`);
    hoverPlayBtn.innerHTML = `
      <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
        <polygon points="6 4 20 12 6 20 6 4"/>
      </svg>
    `;
    hoverPlayBtn.onclick = (e) => {
      e.stopPropagation();
      SpeechController.speakWord(tok.text, block);
    };
    block.appendChild(hoverPlayBtn);

    const ruby = document.createElement('ruby');
    const wordSpan = document.createElement('span');
    wordSpan.className = 'italian-word-text';
    wordSpan.textContent = tok.text;

    const rt = document.createElement('rt');
    const gloss = getRubyGloss(tok);
    // Use non-breaking space if empty so the ruby element retains identical vertical height
    rt.textContent = gloss || '\u00A0';

    ruby.appendChild(wordSpan);
    ruby.appendChild(rt);
    block.appendChild(ruby);

    // CEFR Badge
    if (state.showCefrBadges) {
      const pill = document.createElement('span');
      pill.className = `cefr-pill bg-cefr-${tok.cefr || 'none'}`;
      pill.textContent = tok.cefr || 'None';
      pill.style.marginTop = '0.35rem';
      block.appendChild(pill);
    }

    wrapper.appendChild(block);
  });

  container.appendChild(wrapper);
}

// Render Word Cards Grid
function renderCardsView() {
  const container = document.getElementById('cards-grid-container');
  if (!container) return;
  container.innerHTML = '';

  let list = [...state.uniqueWords];

  // Filter
  if (state.cardFilterCefr !== 'all') {
    list = list.filter(w => w.cefr === state.cardFilterCefr);
  }

  // Sort
  if (state.cardSortBy === 'frequency') {
    list.sort((a, b) => b.count - a.count);
  } else if (state.cardSortBy === 'cefr-asc') {
    const order = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6, 'none': 7 };
    list.sort((a, b) => (order[a.cefr] || 99) - (order[b.cefr] || 99));
  } else if (state.cardSortBy === 'cefr-desc') {
    const order = { 'C2': 1, 'C1': 2, 'B2': 3, 'B1': 4, 'A2': 5, 'A1': 6, 'none': 7 };
    list.sort((a, b) => (order[a.cefr] || 99) - (order[b.cefr] || 99));
  } else if (state.cardSortBy === 'alphabetical') {
    list.sort((a, b) => a.text.localeCompare(b.text, 'it'));
  }

  if (list.length === 0) {
    container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 3rem;">
      Nessun vocabolo corrispondente ai filtri selezionati.
    </div>`;
    return;
  }

  list.forEach(w => {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.onclick = () => openInspector(w.text, w);

    card.innerHTML = `
      <div class="word-card-header">
        <div>
          <div class="word-card-title">${w.text}</div>
          <div class="word-card-syllables">${w.syllables?.hyphenated || ''}</div>
        </div>
        <span class="cefr-pill bg-cefr-${w.cefr || 'none'}">${w.cefr || 'None'}</span>
      </div>
      <div class="word-card-meaning">${w.meaning || 'Nessuna definizione registrata'}</div>
      <div class="word-card-footer">
        <span>Frequenza: <strong>${w.count}x</strong></span>
        <span>${w.syllables?.type || ''}</span>
      </div>
    `;

    container.appendChild(card);
  });
}

// Render Vocabulary & Verbs Table
function renderVocabTable() {
  const tbody = document.getElementById('vocab-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  let list = [...state.uniqueWords];
  if (state.vocabFilterCefr !== 'all') {
    list = list.filter(w => w.cefr === state.vocabFilterCefr);
  }

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">Nessuna parola trovata.</td></tr>`;
    return;
  }

  list.forEach(w => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="font-weight: 700; font-size: 1.05rem;">${w.text}</td>
      <td style="font-family: var(--font-mono); color: var(--accent-primary);">${w.syllables?.hyphenated || '-'}</td>
      <td><span class="cefr-pill bg-cefr-${w.cefr || 'none'}">${w.cefr || 'None'}</span></td>
      <td style="font-size: 0.85rem; color: var(--text-secondary);">${w.tense ? `${w.tense} (${w.person || ''})` : (w.pos || '-')}</td>
      <td>${w.meaning || '-'}</td>
      <td>
        <button class="btn-icon btn-sm" title="Ascolta" onclick="event.stopPropagation(); SpeechController.speakWord('${w.text}')">🔊</button>
        <button class="btn-icon btn-sm" title="Ispezione dettagliata" onclick="openInspector('${w.text}', null)">🔍</button>
      </td>
    `;
    tr.onclick = () => openInspector(w.text, w);
    tr.style.cursor = 'pointer';
    tbody.appendChild(tr);
  });
}

// Render Analytics View
function renderAnalyticsView() {
  const container = document.getElementById('analytics-content-container');
  if (!container) return;

  const total = state.tokens.filter(t => t.type === 'word').length;
  const unique = state.uniqueWords.length;

  if (total === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 3rem;">Inserisci del testo per visualizzare le statistiche.</div>`;
    return;
  }

  // Count CEFR distribution
  const counts = { 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0, 'none': 0 };
  const stressCounts = { 'Piana (Parossitona)': 0, 'Sdrucciola (Proparossitona)': 0, 'Tronca (Ossitona)': 0, 'Bisdrucciola': 0, 'Monosillabo': 0 };

  state.uniqueWords.forEach(w => {
    const c = w.cefr || 'none';
    counts[c] = (counts[c] || 0) + w.count;

    const st = w.syllables?.type || 'Piana (Parossitona)';
    stressCounts[st] = (stressCounts[st] || 0) + 1;
  });

  const cefrItemsHtml = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'none'].map(lvl => {
    const cnt = counts[lvl] || 0;
    const pct = total > 0 ? ((cnt / total) * 100).toFixed(1) : 0;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <span class="legend-color-dot bg-cefr-${lvl}"></span>
          <strong>Livello ${lvl.toUpperCase()}</strong>
        </div>
        <div>
          <span>${cnt} parole</span>
          <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.5rem;">(${pct}%)</span>
        </div>
      </div>
      <div style="height: 6px; background-color: var(--bg-surface-elevated); border-radius: var(--radius-full); margin-bottom: 0.85rem; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%;" class="bg-cefr-${lvl}"></div>
      </div>
    `;
  }).join('');

  const stressItemsHtml = Object.keys(stressCounts).map(type => {
    const cnt = stressCounts[type];
    const pct = unique > 0 ? ((cnt / unique) * 100).toFixed(1) : 0;
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem;">
        <span><strong>${type}</strong></span>
        <span>${cnt} vocaboli (${pct}%)</span>
      </div>
      <div style="height: 6px; background-color: var(--bg-surface-elevated); border-radius: var(--radius-full); margin-bottom: 0.85rem; overflow: hidden;">
        <div style="height: 100%; width: ${pct}%; background-color: var(--accent-primary);"></div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
      <div class="guide-card">
        <h3>📊 Distribuzione Livelli QCER (Quadro Comune Europeo)</h3>
        <div style="margin-top: 1rem;">${cefrItemsHtml}</div>
      </div>

      <div class="guide-card">
        <h3>🎯 Distribuzione Accento Tonico Fonologico</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
          Ripartizione dei lemmi secondo la posizione della sillaba tonica:
        </p>
        <div style="margin-top: 1rem;">${stressItemsHtml}</div>
      </div>
    </div>
  `;
}

// Update Top Analytics Banner
function updateAnalyticsBanner() {
  const words = state.tokens.filter(t => t.type === 'word');
  const total = words.length;
  const unique = state.uniqueWords.length;
  const density = total > 0 ? Math.round((unique / total) * 100) : 0;

  const totalEl = document.getElementById('metric-total-words');
  const uniqueEl = document.getElementById('metric-unique-words');
  const densEl = document.getElementById('metric-lex-density');

  if (totalEl) totalEl.textContent = total;
  if (uniqueEl) uniqueEl.textContent = unique;
  if (densEl) densEl.textContent = `${density}%`;

  // Update CEFR Distribution Bar
  const counts = { 'A1': 0, 'A2': 0, 'B1': 0, 'B2': 0, 'C1': 0, 'C2': 0, 'none': 0 };
  words.forEach(w => {
    const c = w.cefr || 'none';
    counts[c] = (counts[c] || 0) + 1;
  });

  const bar = document.getElementById('cefr-distribution-bar');
  if (bar) {
    bar.innerHTML = '';
    if (total === 0) {
      bar.innerHTML = '<div class="cefr-bar-segment" style="width: 100%; background-color: var(--border-subtle);"></div>';
    } else {
      ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'none'].forEach(lvl => {
        const cnt = counts[lvl] || 0;
        if (cnt > 0) {
          const pct = (cnt / total) * 100;
          const seg = document.createElement('div');
          seg.className = `cefr-bar-segment bg-cefr-${lvl}`;
          seg.style.width = `${pct}%`;
          seg.title = `Livello ${lvl}: ${cnt} parole (${pct.toFixed(1)}%)`;
          bar.appendChild(seg);
        }
      });
    }
  }
}

// ==========================================
// 6. Word & Verb Inspector Modal
// ==========================================
function openInspector(rawWord, tokenObj) {
  const modal = document.getElementById('inspector-modal');
  if (!modal) return;

  const clean = rawWord.toLowerCase().replace(/['’]/g, '');
  const tok = tokenObj || state.tokens.find(t => t.lower === rawWord.toLowerCase() || t.clean === clean) || {
    text: rawWord,
    clean: clean,
    lemma: clean,
    cefr: 'none',
    meaning: '',
    syllables: window.ItalianSyllables?.analyze(rawWord)
  };

  const sylData = tok.syllables || window.ItalianSyllables?.analyze(tok.text);

  // Set titles & syllables
  document.getElementById('modal-word-title').textContent = tok.text;
  document.getElementById('modal-word-syllables').textContent = sylData?.hyphenated || tok.text;

  // Set CEFR & Stress Badges
  const cefrWrap = document.getElementById('modal-meta-cefr');
  cefrWrap.innerHTML = `<span class="cefr-pill bg-cefr-${tok.cefr || 'none'}" style="font-size: 0.85rem; padding: 0.25rem 0.65rem;">Livello QCER: ${tok.cefr || 'None'}</span>`;

  document.getElementById('modal-word-stress-type').textContent = `Tipo: ${sylData?.type || 'Piana'}`;

  // Rule & phonetic notes
  const ruleEl = document.getElementById('modal-word-rule');
  let ruleText = sylData?.rule || '';
  if (sylData?.phoneticNote) {
    ruleText += `<br><span style="margin-top: 0.35rem; display: block; color: var(--accent-primary);">💡 Note fonetiche: ${sylData.phoneticNote}</span>`;
  }
  ruleEl.innerHTML = ruleText;

  // Meaning
  const meaningEl = document.getElementById('modal-word-meaning');
  let meaningText = tok.meaning || 'Nessuna traduzione specifica memorizzata nel dizionario di base.';
  if (tok.tense) {
    meaningText += ` <span style="color: var(--text-secondary); font-size: 0.9rem;">[Forma flessa: ${tok.tense} - ${tok.person || ''}]</span>`;
  }
  meaningEl.innerHTML = meaningText;

  // Pronounce button
  const speakBtn = document.getElementById('modal-btn-speak');
  speakBtn.onclick = () => SpeechController.speakWord(tok.text);

  // Verb Conjugation Table
  const conjSection = document.getElementById('modal-conjugation-section');
  const lemmaEl = document.getElementById('modal-verb-lemma');
  const tbody = document.getElementById('modal-conjugation-tbody');

  const paradigm = analyzer.getVerbParadigm(tok.lemma || tok.clean);

  if (paradigm) {
    conjSection.style.display = 'block';
    lemmaEl.textContent = `${paradigm.infinitive} (${paradigm.meaning})`;

    tbody.innerHTML = '';
    const persons = ['io', 'tu', 'lui/lei', 'noi', 'voi', 'loro'];

    for (let pIdx = 0; pIdx < 6; pIdx++) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600; background-color: var(--bg-surface-elevated);">${persons[pIdx]}</td>
        <td>${paradigm.presente?.[pIdx] || '-'}</td>
        <td>${paradigm.imperfetto?.[pIdx] || '-'}</td>
        <td>${paradigm.passato_prossimo?.[pIdx] || '-'}</td>
        <td>${paradigm.futuro?.[pIdx] || '-'}</td>
        <td>${paradigm.condizionale?.[pIdx] || '-'}</td>
        <td>${paradigm.congiuntivo_pres?.[pIdx] || '-'}</td>
        <td>${paradigm.imperativo?.[pIdx] || '-'}</td>
      `;
      tbody.appendChild(tr);
    }
  } else {
    conjSection.style.display = 'none';
  }

  // Theme section
  const themeSection = document.getElementById('modal-theme-section');
  if (tok.theme) {
    themeSection.style.display = 'block';
    document.getElementById('modal-theme-name').textContent = tok.theme;
  } else {
    themeSection.style.display = 'none';
  }

  modal.classList.add('open');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('open');
}

// ==========================================
// 7. Event Listeners & Initialization
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  SpeechController.init();
  updateRubyFontSize();

  const inputArea = document.getElementById('italian-input');
  const charCounter = document.getElementById('input-char-count');

  // Input typing counter
  if (inputArea && charCounter) {
    inputArea.addEventListener('input', () => {
      charCounter.textContent = `${inputArea.value.length} caratteri`;
    });
  }

  // Analyze Action
  const btnAnalyze = document.getElementById('btn-analyze');
  const doAnalyze = (textToAnalyze) => {
    const text = textToAnalyze || inputArea.value;
    state.inputText = text;
    state.tokens = analyzer.tokenize(text);
    state.uniqueWords = analyzer.extractUniqueWords(state.tokens);

    updateAnalyticsBanner();
    renderRubyView();
    renderCardsView();
    renderVocabTable();
    renderAnalyticsView();
  };

  if (btnAnalyze) {
    btnAnalyze.addEventListener('click', () => doAnalyze());
  }

  // Sample Presets
  document.querySelectorAll('.preset-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-preset');
      const text = SAMPLE_PRESETS[presetKey] || '';
      if (inputArea) {
        inputArea.value = text;
        if (charCounter) charCounter.textContent = `${text.length} caratteri`;
      }
      doAnalyze(text);
    });
  });

  // Action Buttons
  const btnPaste = document.getElementById('btn-paste');
  if (btnPaste) {
    btnPaste.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (inputArea) {
          inputArea.value = text;
          if (charCounter) charCounter.textContent = `${text.length} caratteri`;
        }
        doAnalyze(text);
      } catch (err) {
        alert('Impossibile accedere agli appunti del browser.');
      }
    });
  }

  const btnClear = document.getElementById('btn-clear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (inputArea) {
        inputArea.value = '';
        if (charCounter) charCounter.textContent = '0 caratteri';
      }
      doAnalyze('');
    });
  }

  const btnSpeakAll = document.getElementById('btn-speak-all');
  if (btnSpeakAll) {
    btnSpeakAll.addEventListener('click', () => {
      const text = inputArea.value.trim();
      if (text) {
        SpeechController.speak(text);
      }
    });
  }

  // Theme Toggle
  const btnTheme = document.getElementById('btn-theme-toggle');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
      btnTheme.textContent = isDark ? '🌙' : '☀️';
    });
  }

  // Annotation Mode Switcher
  document.querySelectorAll('[data-annotation]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-annotation]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.rubyAnnotation = btn.getAttribute('data-annotation');
      renderRubyView();
    });
  });

  // CEFR Badges Toggle
  const btnToggleBadges = document.getElementById('toggle-badges');
  if (btnToggleBadges) {
    btnToggleBadges.addEventListener('click', () => {
      state.showCefrBadges = !state.showCefrBadges;
      btnToggleBadges.classList.toggle('active', state.showCefrBadges);
      renderRubyView();
    });
  }

  // Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const tabId = btn.getAttribute('data-tab');
      const pane = document.getElementById(tabId);
      if (pane) pane.classList.add('active');
      state.activeTab = tabId;
    });
  });

  // Ruby Karaoke Controls
  const btnRubyPlay = document.getElementById('btn-ruby-play');
  if (btnRubyPlay) {
    btnRubyPlay.addEventListener('click', () => {
      if (RubyAudioPlayer.isPlaying && RubyAudioPlayer.isPaused) {
        RubyAudioPlayer.resume();
      } else {
        RubyAudioPlayer.start(state.tokens);
      }
    });
  }

  const btnRubyPause = document.getElementById('btn-ruby-pause');
  if (btnRubyPause) {
    btnRubyPause.addEventListener('click', () => RubyAudioPlayer.pause());
  }

  const btnRubyStop = document.getElementById('btn-ruby-stop');
  if (btnRubyStop) {
    btnRubyStop.addEventListener('click', () => RubyAudioPlayer.stop());
  }

  const speedSelect = document.getElementById('ruby-speed-select');
  if (speedSelect) {
    speedSelect.addEventListener('change', (e) => {
      RubyAudioPlayer.speed = parseFloat(e.target.value) || 0.8;
      SpeechController.rate = RubyAudioPlayer.speed;
    });
  }

  // Font Zoom Controls
  const btnFontIn = document.getElementById('btn-font-increase');
  if (btnFontIn) {
    btnFontIn.addEventListener('click', () => {
      state.rubyFontSize = Math.min(2.2, (state.rubyFontSize || 1.4) + 0.15);
      updateRubyFontSize();
    });
  }

  const btnFontOut = document.getElementById('btn-font-decrease');
  if (btnFontOut) {
    btnFontOut.addEventListener('click', () => {
      state.rubyFontSize = Math.max(1.0, (state.rubyFontSize || 1.4) - 0.15);
      updateRubyFontSize();
    });
  }

  // Cards Filters
  const cardFilter = document.getElementById('card-cefr-filter');
  if (cardFilter) {
    cardFilter.addEventListener('change', (e) => {
      state.cardFilterCefr = e.target.value;
      renderCardsView();
    });
  }

  const cardSort = document.getElementById('card-sort-by');
  if (cardSort) {
    cardSort.addEventListener('change', (e) => {
      state.cardSortBy = e.target.value;
      renderCardsView();
    });
  }

  // Vocab Filters
  const vocabFilter = document.getElementById('vocab-cefr-filter');
  if (vocabFilter) {
    vocabFilter.addEventListener('change', (e) => {
      state.vocabFilterCefr = e.target.value;
      renderVocabTable();
    });
  }

  // CSV Export
  const btnExportCsv = document.getElementById('btn-export-csv');
  if (btnExportCsv) {
    btnExportCsv.addEventListener('click', () => {
      if (state.uniqueWords.length === 0) {
        alert('Nessun vocabolo da esportare.');
        return;
      }
      let csv = 'Parola,Sillabazione,Livello_QCER,Categoria_Grammaticale,Significato_Inglese,Frequenza\n';
      state.uniqueWords.forEach(w => {
        csv += `"${w.text}","${w.syllables?.hyphenated || ''}","${w.cefr || ''}","${w.pos || ''}","${(w.meaning || '').replace(/"/g, '""')}","${w.count}"\n`;
      });
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vocabolario_italiano_qcer.csv';
      a.click();
    });
  }

  // Anki Export
  const btnExportAnki = document.getElementById('btn-export-anki');
  if (btnExportAnki) {
    btnExportAnki.addEventListener('click', () => {
      if (state.uniqueWords.length === 0) {
        alert('Nessun vocabolo da esportare.');
        return;
      }
      let txt = '#separator:tab\n#html:true\n';
      state.uniqueWords.forEach(w => {
        const front = `<strong>${w.text}</strong><br><span style="color:#0284c7;">[${w.syllables?.hyphenated || ''}]</span>`;
        const back = `<em>${w.meaning || ''}</em><br><span style="color:#10b981;">Livello: ${w.cefr || 'None'}</span>`;
        txt += `${front}\t${back}\n`;
      });
      const blob = new Blob([txt], { type: 'text/tab-separated-values;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mazzo_anki_italiano.txt';
      a.click();
    });
  }

  // Auto-load preset A1 on startup
  const initialPreset = SAMPLE_PRESETS.a1;
  if (inputArea) {
    inputArea.value = initialPreset;
    if (charCounter) charCounter.textContent = `${initialPreset.length} caratteri`;
  }
  doAnalyze(initialPreset);
});
