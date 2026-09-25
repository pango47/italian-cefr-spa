/**
 * Italian Syllabification & Accentuation Engine (Accademia della Crusca Compliant)
 * Handles syllabification (sillabazione), hiatus/diphthong rules, tonic stress, and phonetics.
 */

const ItalianSyllables = {
  vowels: 'aàáeèéiìíoòóuùú',
  strongVowels: 'aàáeèéoòó',
  weakVowels: 'iìíuùú',
  accentedVowels: 'àáèéìíòóùú',

  inseparableClusters: [
    'ch', 'gh', 'gn',
    'pr', 'br', 'tr', 'dr', 'cr', 'gr', 'fr', 'vr',
    'pl', 'bl', 'cl', 'gl', 'fl',
    'qu', 'gu'
  ],

  // Common words known to be sdrucciole (accent on antepenultimate)
  sdruccioleWords: new Set([
    'abito', 'albero', 'anima', 'angolo', 'attimo', 'autobus', 'bambola',
    'camera', 'carattere', 'carica', 'carico', 'cenere', 'chilo', 'circolo',
    'debito', 'dialogo', 'dubbio', 'epoca', 'esercito', 'facile', 'fegato',
    'femmina', 'fisica', 'genero', 'gomito', 'isola', 'lacrima', 'lampada',
    'leggero', 'libero', 'limite', 'liquido', 'macchina', 'manica', 'medico',
    'merito', 'metodo', 'mobile', 'modulo', 'musica', 'numero', 'opera',
    'origine', 'pagina', 'parcheggio', 'patria', 'pecora', 'pericolo', 'pettine',
    'piacere', 'piacere', 'piccolo', 'popolo', 'pratica', 'pratico', 'prossimo',
    'pubblico', 'quadro', 'regola', 'sabato', 'scatola', 'secolo', 'semplice',
    'secolo', 'simile', 'sindaco', 'singolo', 'solito', 'spettacolo', 'subito',
    'tavolo', 'tavola', 'telefono', 'termine', 'titolo', 'traffico', 'ultimo',
    'uomo', 'utile', 'valido', 'veicolo', 'vicolo', 'visita', 'vittima',
    'abitano', 'accadono', 'arrivano', 'chiedono', 'credono', 'dicono',
    'dormono', 'entrano', 'fanno', 'leggono', 'mettono', 'nascono', 'parlano',
    'partono', 'perdono', 'possono', 'prendono', 'restano', 'ridono', 'salgono',
    'scendono', 'scrivono', 'sentono', 'sanno', 'spengono', 'tornano', 'trovano',
    'vedono', 'vengono', 'vivono', 'vogliono'
  ]),

  // Words with explicit hiatus where weak vowel does not form a diphthong
  hiatusWords: new Set([
    'poeta', 'poesia', 'paese', 'leone', 'teatro', 'maestro', 'aereo',
    'reale', 'idea', 'museo', 'linea', 'europeo', 'corea', 'eroe',
    'zii', 'paura', 'baule', 'faina', 'suo', 'tua', 'sua', 'tue', 'sue',
    'due', 'mio', 'mia', 'miei', 'mie', 'tuo', 'tui', 'via', 'vie',
    'dio', 'dii', 'io', 'zia', 'zie', 'zio'
  ]),

  // Split an Italian word into its constituent syllables
  split(word) {
    if (!word) return [];
    const cleanWord = word.trim();
    const w = cleanWord.toLowerCase();

    // Remove punctuation
    const lettersOnly = w.replace(/[^a-zàáèéìíòóùú]/g, '');
    if (lettersOnly.length <= 1) return [cleanWord];

    // Step 1: Detect vowel nuclei (single vowels, diphthongs, triphthongs)
    const nuclei = [];
    let i = 0;

    while (i < w.length) {
      if (this.vowels.includes(w[i])) {
        const start = i;
        let nucleus = w[i];
        i++;

        // Check if next character is also a vowel
        if (i < w.length && this.vowels.includes(w[i])) {
          const v1 = nucleus;
          const v2 = w[i];

          // Hiatus check:
          // 1. Two strong vowels always separate (e.g., po-e-ta, ma-e-stro, le-o-ne)
          const bothStrong = this.strongVowels.includes(v1) && this.strongVowels.includes(v2);
          // 2. Accented weak vowel next to strong vowel separates (e.g., zi-o, scì-i, pa-ù-ra)
          const accentedWeak = (this.weakVowels.includes(v1) && this.accentedVowels.includes(v1)) ||
                              (this.weakVowels.includes(v2) && this.accentedVowels.includes(v2));

          const isKnownHiatus = this.hiatusWords.has(lettersOnly) && (bothStrong || ['ia', 'ie', 'io', 'ua', 'ue', 'uo'].includes(v1 + v2));

          if (!bothStrong && !accentedWeak && !isKnownHiatus) {
            // Form diphthong
            nucleus += v2;
            i++;

            // Check for triphthong (e.g. miei, tuoi, guai)
            if (i < w.length && this.vowels.includes(w[i]) &&
                this.weakVowels.includes(w[i]) && !this.accentedVowels.includes(w[i])) {
              nucleus += w[i];
              i++;
            }
          }
        }
        nuclei.push({ start, end: i, text: nucleus });
      } else {
        i++;
      }
    }

    if (nuclei.length <= 1) return [cleanWord];

    // Step 2: Determine division cuts between consecutive vowel nuclei
    const cuts = [];
    for (let n = 0; n < nuclei.length - 1; n++) {
      const curN = nuclei[n];
      const nextN = nuclei[n + 1];
      const inter = w.slice(curN.end, nextN.start);
      const interLen = inter.length;

      let cutPos = curN.end;

      if (interLen === 0) {
        // Immediate vowel hiatus (e.g., po-e-ta)
        cutPos = curN.end;
      } else if (interLen === 1) {
        // Single consonant between vowels joins following syllable: ca-sa, ma-re
        cutPos = curN.end;
      } else if (interLen === 2) {
        // Double consonants ALWAYS split: gat-to, ros-so, mez-zo, ac-qua
        if (inter[0] === inter[1] || inter === 'cq') {
          cutPos = curN.end + 1;
        }
        // Inseparable clusters (ch, gh, gn, gl, br, cr, dr, fr, gr, pr, tr, bl, cl, fl, pl): join following
        else if (this.inseparableClusters.includes(inter) || (inter === 'gl' && w[nextN.start] === 'i') || (inter === 'sc' && ['e', 'i', 'è', 'é', 'ì', 'í'].includes(w[nextN.start]))) {
          cutPos = curN.end;
        }
        // "s" impura rule (s followed by consonant): joins following syllable! (pe-sca, ba-sta, sco-la)
        else if (inter[0] === 's') {
          cutPos = curN.end;
        }
        // Other two consonants split (por-ta, cal-do, tem-po, al-to)
        else {
          cutPos = curN.end + 1;
        }
      } else if (interLen === 3) {
        // Three consonants:
        // If starts with 's', whole cluster joins following (fi-ne-stra)
        if (inter[0] === 's') {
          cutPos = curN.end;
        }
        // If last two are inseparable (e.g., com-prar, in-trec-cio), first splits
        else if (this.inseparableClusters.includes(inter.slice(1)) || inter.slice(1).startsWith('s')) {
          cutPos = curN.end + 1;
        } else {
          cutPos = curN.end + 1;
        }
      } else if (interLen >= 4) {
        cutPos = curN.end + 2;
      }

      cuts.push(cutPos);
    }

    // Cut original string preserving original casing
    const result = [];
    let lastCut = 0;
    for (const c of cuts) {
      result.push(cleanWord.slice(lastCut, c));
      lastCut = c;
    }
    result.push(cleanWord.slice(lastCut));
    return result;
  },

  // Analyze tonic syllable, stress position, and classification
  analyzeStress(syllables, rawWord) {
    if (!syllables || syllables.length === 0) {
      return { tonicIdx: 0, type: 'Monosillabo', rule: 'Parola monosillaba' };
    }

    const clean = rawWord.toLowerCase().replace(/[^a-zàáèéìíòóùú]/g, '');

    // 1. Look for explicit written accent (e.g., caffè, virtù, città, perché)
    let tonicIdx = -1;
    for (let i = 0; i < syllables.length; i++) {
      const s = syllables[i].toLowerCase();
      if ([...s].some(c => this.accentedVowels.includes(c))) {
        tonicIdx = i;
        break;
      }
    }

    // 2. Check known sdrucciole list
    if (tonicIdx === -1 && syllables.length >= 3) {
      if (this.sdruccioleWords.has(clean)) {
        tonicIdx = syllables.length - 3;
      }
    }

    // 3. Standard Italian phonetic default:
    // The vast majority of Italian words are "piane" (penultimate syllable stressed)
    if (tonicIdx === -1) {
      if (syllables.length === 1) {
        tonicIdx = 0;
      } else {
        tonicIdx = syllables.length - 2;
      }
    }

    const posFromEnd = syllables.length - tonicIdx;
    let type = '';
    let rule = '';
    let phoneticNote = '';

    if (syllables.length === 1) {
      type = 'Monosillabo';
      rule = 'Monosillabo: la maggior parte non porta accento grafico, salvo nei casi di accento diacritico per distinguere gli omofoni (es. è/e, dà/da, sì/si, là/la, lì/li, sé/se, tè/te, né/ne).';
    } else if (posFromEnd === 1) {
      type = 'Tronca (Ossitona)';
      rule = 'Parola tronca: l\'accento tonico cade sull\'ultima sillaba. In italiano è obbligatorio l\'accento grafico (es. caffè, virtù, città, perché, lunedì).';
    } else if (posFromEnd === 2) {
      type = 'Piana (Parossitona)';
      rule = 'Parola piana: l\'accento tonico cade sulla penultima sillaba. È il pattern più comune nella lingua italiana (~80% del lessico) e non richiede accento grafico.';
    } else if (posFromEnd === 3) {
      type = 'Sdrucciola (Proparossitona)';
      rule = 'Parola sdrucciola: l\'accento tonico cade sulla terzultima sillaba (es. tàvola, àlbero, telèfono, mèdico, mùsica, sùbito). Di norma l\'accento grafico non si scrive nei testi standard tranne per fini didattici o di disambiguazione.';
    } else {
      type = 'Bisdrucciola';
      rule = 'Parola bisdrucciola: l\'accento tonico cade sulla quartultima sillaba (es. àbitano, dìtemelo, cèlebravano).';
    }

    // Phonetic insights for Italian learners
    const notes = [];
    if (/c[eèéiìí]/.test(clean)) {
      notes.push('C dolce: suono palatale [tʃ] (come in "cena" o "cielo").');
    }
    if (/c[aou]|ch/.test(clean)) {
      notes.push('C dura: suono velare [k] (come in "casa" o "chiave").');
    }
    if (/g[eèéiìí]/.test(clean)) {
      notes.push('G dolce: suono affricato [dʒ] (come in "gelato" o "giorno").');
    }
    if (/g[aou]|gh/.test(clean)) {
      notes.push('G dura: suono occlusivo [g] (come in "gatto" o "spaghetti").');
    }
    if (/gli[aeou]?/.test(clean)) {
      notes.push('GL: suono laterale palatale [ʎ] (come in "figlio", "famiglia").');
    }
    if (/gn/.test(clean)) {
      notes.push('GN: suono nasale palatale [ɲ] (come in "gnocchi", "bagno").');
    }
    if (/sc[eèéiìí]/.test(clean)) {
      notes.push('SC dolce: suono fricativo postalveolare [ʃ] (come in "pesce", "sciare").');
    }
    if (/(tt|ss|rr|ll|mm|nn|pp|bb|cc|gg|ff|vv|zz|cq)/.test(clean)) {
      notes.push('Consonante doppia: rafforzamento fonosintattico marcato nella durata articolatoria.');
    }
    if (/[èé]/.test(clean)) {
      notes.push(clean.includes('è') ? 'Vocale E aperta (/ɛ/ come in "caffè").' : 'Vocale E chiusa (/e/ come in "perché").');
    }
    if (/[òó]/.test(clean)) {
      notes.push(clean.includes('ò') ? 'Vocale O aperta (/ɔ/ come in "però").' : 'Vocale O chiusa (/o/ come in "sole").');
    }

    phoneticNote = notes.join(' ');

    return {
      tonicIdx,
      posFromEnd,
      type,
      rule,
      phoneticNote
    };
  },

  // Returns formatted syllables string with the tonic syllable emphasized: e.g. "be-VE-re"
  formatHyphenated(word) {
    const syls = this.split(word);
    if (syls.length <= 1) return word;
    const { tonicIdx } = this.analyzeStress(syls, word);

    return syls.map((s, idx) => {
      return idx === tonicIdx ? s.toUpperCase() : s.toLowerCase();
    }).join('·');
  },

  // Full analysis package for a given word
  analyze(word) {
    const syllables = this.split(word);
    const stress = this.analyzeStress(syllables, word);

    return {
      word,
      syllables,
      tonicIndex: stress.tonicIdx,
      type: stress.type,
      rule: stress.rule,
      phoneticNote: stress.phoneticNote,
      hyphenated: this.formatHyphenated(word),
      syllableCount: syllables.length
    };
  }
};

if (typeof window !== 'undefined') {
  window.ItalianSyllables = ItalianSyllables;
}
if (typeof module !== 'undefined') {
  module.exports = ItalianSyllables;
}
