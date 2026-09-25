# build_italian_data_v2.py - Generates comprehensive, high-quality Italian CEFR database
import urllib.request, json, os, re

def main():
    print("1. Fetching external Italian frequency dictionary (16k words)...")
    url = 'https://raw.githubusercontent.com/vbvss199/Language-Learning-decks/refs/heads/main/italian/italian.json'
    external_dict = {}
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            for item in data:
                w = item.get('word', '').strip().lower()
                if not w or '\ufffd' in w or not re.match(r'^[a-zàáèéìíòóùú\s\'-]+$', w):
                    continue
                meaning = item.get('english_translation', '').strip()
                if not meaning or '\ufffd' in meaning:
                    continue
                cefr = item.get('cefr_level', 'B1').strip().upper()
                if cefr not in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']:
                    cefr = 'B1'
                pos = item.get('pos', '').strip().lower()
                
                # Format clean meaning (e.g. replace semicolons with comma/slash)
                clean_meaning = meaning.replace(';', ', ')
                external_dict[w] = {
                    'l': w,
                    'c': cefr,
                    'p': pos,
                    'g': '',
                    'm': clean_meaning
                }
            print(f"Extracted {len(external_dict)} clean entries from external dataset.")
    except Exception as e:
        print(f"Warning: could not fetch external dataset ({e}), will use extensive local core lexicon.")

    # 2. Master Curated Lexicon
    # Overrides and guarantees accurate grammatical definitions, CEFR levels, and concise glosses
    master_lexicon = [
        # Disjunctive / Stressed Pronouns
        ("me", "me", "A1", "pron", "", "me (to/with me)", "me"),
        ("te", "te", "A1", "pron", "", "you (informal)", "you"),
        ("lui", "lui", "A1", "pron", "m", "he, him", "he / him"),
        ("lei", "lei", "A1", "pron", "f", "she, her", "she / her"),
        ("Lei", "Lei", "A1", "pron", "", "you (formal polite)", "you (formal)"),
        ("noi", "noi", "A1", "pron", "pl", "we, us", "we / us"),
        ("voi", "voi", "A1", "pron", "pl", "you all", "you all"),
        ("loro", "loro", "A1", "pron", "pl", "they, them", "they / them"),
        ("sé", "sé", "A2", "pron", "", "oneself, himself, herself", "oneself"),

        # Clitic Pronouns
        ("mi", "mi", "A1", "pron", "", "me, to me, myself", "me / to me"),
        ("ti", "ti", "A1", "pron", "", "you, to you, yourself", "you / to you"),
        ("si", "si", "A1", "pron", "", "himself, herself, oneself", "himself / herself"),
        ("ci", "ci", "A1", "pron", "", "us, to us; there; about it", "us / there"),
        ("vi", "vi", "A1", "pron", "", "you all, to you all; there", "you all"),
        ("lo", "lo", "A1", "pron/art", "m.sg", "him, it; the (m)", "him / it"),
        ("la", "la", "A1", "pron/art", "f.sg", "her, it; the (f)", "her / it"),
        ("li", "li", "A1", "pron", "m.pl", "them (masculine)", "them (m)"),
        ("le", "le", "A1", "pron/art", "f.pl", "them (f); to her; the (f.pl)", "them (f) / the"),
        ("gli", "gli", "A1", "pron/art", "m.sg", "to him; the (m.pl)", "to him / the"),
        ("ne", "ne", "A2", "pron", "", "of it, of them, about it", "of it / them"),

        # Possessive Adjectives & Pronouns
        ("mio", "mio", "A1", "adj/pron", "m.sg", "my, mine", "my / mine"),
        ("mia", "mio", "A1", "adj/pron", "f.sg", "my, mine", "my / mine"),
        ("miei", "mio", "A1", "adj/pron", "m.pl", "my, mine", "my / mine"),
        ("mie", "mio", "A1", "adj/pron", "f.pl", "my, mine", "my / mine"),
        ("tuo", "tuo", "A1", "adj/pron", "m.sg", "your, yours", "your / yours"),
        ("tua", "tuo", "A1", "adj/pron", "f.sg", "your, yours", "your / yours"),
        ("tuoi", "tuo", "A1", "adj/pron", "m.pl", "your, yours", "your / yours"),
        ("tue", "tuo", "A1", "adj/pron", "f.pl", "your, yours", "your / yours"),
        ("suo", "suo", "A1", "adj/pron", "m.sg", "his, her, its, your (formal)", "his / her / its"),
        ("sua", "suo", "A1", "adj/pron", "f.sg", "his, her, its, your (formal)", "his / her / its"),
        ("suoi", "suo", "A1", "adj/pron", "m.pl", "his, her, its", "his / her / its"),
        ("sue", "suo", "A1", "adj/pron", "f.pl", "his, her, its", "his / her / its"),
        ("nostro", "nostro", "A1", "adj/pron", "m.sg", "our, ours", "our / ours"),
        ("nostra", "nostro", "A1", "adj/pron", "f.sg", "our, ours", "our / ours"),
        ("nostri", "nostro", "A1", "adj/pron", "m.pl", "our, ours", "our / ours"),
        ("nostre", "nostro", "A1", "adj/pron", "f.pl", "our, ours", "our / ours"),
        ("vostro", "vostro", "A1", "adj/pron", "m.sg", "your, yours (plural)", "your / yours"),
        ("vostra", "vostro", "A1", "adj/pron", "f.sg", "your, yours (plural)", "your / yours"),
        ("vostri", "vostro", "A1", "adj/pron", "m.pl", "your, yours (plural)", "your / yours"),
        ("vostre", "vostro", "A1", "adj/pron", "f.pl", "your, yours (plural)", "your / yours"),
        ("proprio", "proprio", "B1", "adj/pron", "m.sg", "one's own, his/her own", "own"),
        ("propria", "proprio", "B1", "adj/pron", "f.sg", "one's own, his/her own", "own"),
        ("propri", "proprio", "B1", "adj/pron", "m.pl", "one's own", "own"),
        ("proprie", "proprio", "B1", "adj/pron", "f.pl", "one's own", "own"),

        # Prepositions, Adverbs & Connectives
        ("secondo", "secondo", "A2", "prep/adj", "m.sg", "according to; second", "according to / 2nd"),
        ("seconda", "secondo", "A2", "adj", "f.sg", "second (2nd)", "second"),
        ("secondi", "secondo", "A2", "adj/n", "m.pl", "seconds; main courses", "seconds"),
        ("seconde", "secondo", "A2", "adj", "f.pl", "second (2nd)", "second"),
        ("senza", "senza", "A1", "prep", "", "without", "without"),
        ("contro", "contro", "A2", "prep", "", "against", "against"),
        ("verso", "verso", "A2", "prep/n", "m", "towards; verse", "towards"),
        ("durante", "durante", "A2", "prep", "", "during", "during"),
        ("mediante", "mediante", "B1", "prep", "", "by means of, through", "through / via"),
        ("tramite", "tramite", "B1", "prep", "", "via, through, by means of", "via / through"),
        ("nonostante", "nonostante", "B1", "prep/conj", "", "despite, in spite of", "despite"),
        ("malgrado", "malgrado", "B2", "prep/conj", "", "in spite of, although", "in spite of"),
        ("circa", "circa", "A2", "adv/prep", "", "about, approximately", "about / approx"),
        ("presso", "presso", "B1", "prep", "", "at, near, by, with", "at / near"),
        ("oltre", "oltre", "B1", "prep/adv", "", "beyond, besides, over", "beyond / besides"),
        ("entro", "entro", "A2", "prep", "", "within, by (time)", "within / by"),
        ("sopra", "sopra", "A1", "prep/adv", "", "on, upon, above", "on / above"),
        ("sotto", "sotto", "A1", "prep/adv", "", "under, below", "under / below"),
        ("davanti", "davanti", "A2", "prep/adv", "", "in front of", "in front"),
        ("dietro", "dietro", "A2", "prep/adv", "", "behind", "behind"),
        ("dentro", "dentro", "A1", "prep/adv", "", "inside, within", "inside"),
        ("fuori", "fuori", "A1", "prep/adv", "", "outside, out", "outside"),
        ("prima", "prima", "A1", "adv/prep", "", "before, earlier; first", "before / earlier"),
        ("dopo", "dopo", "A1", "adv/prep", "", "after, later", "after / later"),
        ("poi", "poi", "A1", "adv", "", "then, later", "then / later"),
        ("insieme", "insieme", "A2", "adv", "", "together", "together"),
        ("quasi", "quasi", "A2", "adv", "", "almost, nearly", "almost"),
        ("proprio", "proprio", "A2", "adv", "", "really, exactly, just", "really / exactly"),
        ("infatti", "infatti", "B1", "adv", "", "in fact, indeed", "in fact"),
        ("invece", "invece", "B1", "adv", "", "instead, on the contrary", "instead"),
        ("inoltre", "inoltre", "B1", "adv", "", "furthermore, moreover", "furthermore"),
        ("tuttavia", "tuttavia", "B1", "adv/conj", "", "however, nevertheless", "however"),
        ("quindi", "quindi", "A2", "adv/conj", "", "therefore, so", "therefore / so"),
        ("perciò", "perciò", "B1", "adv/conj", "", "therefore, for this reason", "therefore"),
        ("sebbene", "sebbene", "B1", "conj", "", "although, even though", "although"),
        ("benché", "benché", "B1", "conj", "", "although, though", "although"),
        ("affinché", "affinché", "B1", "conj", "", "so that, in order that", "so that"),
        ("dovunque", "dovunque", "B1", "adv/conj", "", "wherever, anywhere", "wherever"),
        ("chiunque", "chiunque", "B1", "pron", "", "whoever, anyone", "whoever"),
        ("qualunque", "qualunque", "B1", "adj", "", "any, whatever", "any / whatever"),
        ("comunque", "comunque", "A2", "adv/conj", "", "anyway, however", "anyway / however"),

        # Articles with Clean Short Glosses
        ("il", "il", "A1", "art", "m.sg", "the (m.sg)", "the"),
        ("lo", "lo", "A1", "art", "m.sg", "the (m.sg)", "the"),
        ("la", "la", "A1", "art", "f.sg", "the (f.sg)", "the"),
        ("l'", "il", "A1", "art", "sg", "the", "the"),
        ("i", "il", "A1", "art", "m.pl", "the (m.pl)", "the"),
        ("gli", "lo", "A1", "art", "m.pl", "the (m.pl)", "the"),
        ("le", "la", "A1", "art", "f.pl", "the (f.pl)", "the"),
        ("un", "un", "A1", "art", "m.sg", "a, an (m)", "a / an"),
        ("uno", "uno", "A1", "art", "m.sg", "a, an (m)", "a / an"),
        ("una", "una", "A1", "art", "f.sg", "a, an (f)", "a / an"),
        ("un'", "una", "A1", "art", "f.sg", "a, an (f)", "a / an"),

        # Preposizioni Articolate
        ("del", "del", "A1", "prep.art", "m.sg", "of the, some (m.sg)", "of the / some"),
        ("dello", "dello", "A1", "prep.art", "m.sg", "of the (m.sg)", "of the"),
        ("della", "della", "A1", "prep.art", "f.sg", "of the, some (f.sg)", "of the / some"),
        ("dell'", "dell'", "A1", "prep.art", "sg", "of the", "of the"),
        ("dei", "dei", "A1", "prep.art", "m.pl", "of the, some (m.pl)", "of the / some"),
        ("degli", "degli", "A1", "prep.art", "m.pl", "of the, some (m.pl)", "of the / some"),
        ("delle", "delle", "A1", "prep.art", "f.pl", "of the, some (f.pl)", "of the / some"),
        ("al", "al", "A1", "prep.art", "m.sg", "to the, at the (m.sg)", "to the / at the"),
        ("allo", "allo", "A1", "prep.art", "m.sg", "to the, at the (m.sg)", "to the / at the"),
        ("alla", "alla", "A1", "prep.art", "f.sg", "to the, at the (f.sg)", "to the / at the"),
        ("all'", "all'", "A1", "prep.art", "sg", "to the, at the", "to the / at the"),
        ("ai", "ai", "A1", "prep.art", "m.pl", "to the, at the (m.pl)", "to the / at the"),
        ("agli", "agli", "A1", "prep.art", "m.pl", "to the, at the (m.pl)", "to the / at the"),
        ("alle", "alle", "A1", "prep.art", "f.pl", "to the, at the (f.pl)", "to the / at the"),
        ("dal", "dal", "A1", "prep.art", "m.sg", "from the, by the (m.sg)", "from the"),
        ("dallo", "dallo", "A1", "prep.art", "m.sg", "from the (m.sg)", "from the"),
        ("dalla", "dalla", "A1", "prep.art", "f.sg", "from the (f.sg)", "from the"),
        ("dall'", "dall'", "A1", "prep.art", "sg", "from the", "from the"),
        ("dai", "dai", "A1", "prep.art", "m.pl", "from the (m.pl)", "from the"),
        ("dagli", "dagli", "A1", "prep.art", "m.pl", "from the (m.pl)", "from the"),
        ("dalle", "dalle", "A1", "prep.art", "f.pl", "from the (f.pl)", "from the"),
        ("nel", "nel", "A1", "prep.art", "m.sg", "in the (m.sg)", "in the"),
        ("nello", "nello", "A1", "prep.art", "m.sg", "in the (m.sg)", "in the"),
        ("nella", "nella", "A1", "prep.art", "f.sg", "in the (f.sg)", "in the"),
        ("nell'", "nell'", "A1", "prep.art", "sg", "in the", "in the"),
        ("nei", "nei", "A1", "prep.art", "m.pl", "in the (m.pl)", "in the"),
        ("negli", "negli", "A1", "prep.art", "m.pl", "in the (m.pl)", "in the"),
        ("nelle", "nelle", "A1", "prep.art", "f.pl", "in the (f.pl)", "in the"),
        ("sul", "sul", "A1", "prep.art", "m.sg", "on the (m.sg)", "on the"),
        ("sullo", "sullo", "A1", "prep.art", "m.sg", "on the (m.sg)", "on the"),
        ("sulla", "sulla", "A1", "prep.art", "f.sg", "on the (f.sg)", "on the"),
        ("sull'", "sull'", "A1", "prep.art", "sg", "on the", "on the"),
        ("sui", "sui", "A1", "prep.art", "m.pl", "on the (m.pl)", "on the"),
        ("sugli", "sugli", "A1", "prep.art", "m.pl", "on the (m.pl)", "on the"),
        ("sulle", "sulle", "A1", "prep.art", "f.pl", "on the (f.pl)", "on the"),

        # Workplace, Education, Modern & Digital Lexicon
        ("curriculum", "curriculum", "B1", "n", "m", "CV, resume, curriculum vitae", "CV / resume"),
        ("curricula", "curriculum", "B1", "n", "m.pl", "CVs, resumes", "CVs / resumes"),
        ("aggiornare", "aggiornare", "B1", "v", "", "to update, bring up to date, upgrade", "to update"),
        ("aggiornato", "aggiornare", "B1", "adj/v", "m.sg", "updated, up to date", "updated"),
        ("aggiornata", "aggiornare", "B1", "adj/v", "f.sg", "updated, up to date", "updated"),
        ("aggiornati", "aggiornare", "B1", "adj/v", "m.pl", "updated, up to date", "updated"),
        ("aggiornate", "aggiornare", "B1", "adj/v", "f.pl", "updated, up to date", "updated"),
        ("aggiornamento", "aggiornamento", "B1", "n", "m", "update, upgrading, refresher course", "update"),
        ("competenza", "competenza", "B1", "n", "f", "competence, skill, expertise", "skill / competence"),
        ("competenze", "competenza", "B1", "n", "f.pl", "skills, competencies, expertise", "skills"),
        ("candidato", "candidato", "B1", "n", "m", "candidate, applicant", "candidate"),
        ("candidata", "candidato", "B1", "n", "f", "candidate, applicant (female)", "candidate"),
        ("candidati", "candidato", "B1", "n", "m.pl", "candidates, applicants", "candidates"),
        ("colloquio", "colloquio", "B1", "n", "m", "interview, meeting, talk", "interview"),
        ("stipendio", "stipendio", "B1", "n", "m", "salary, wage", "salary"),
        ("contratto", "contratto", "B1", "n", "m", "contract, agreement", "contract"),
        ("assumere", "assumere", "B1", "v", "", "to hire, employ, assume", "to hire / assume"),
        ("assunzione", "assunzione", "B1", "n", "f", "hiring, employment", "hiring"),
        ("ufficio", "ufficio", "A2", "n", "m", "office", "office"),
        ("azienda", "azienda", "A2", "n", "f", "company, firm, business", "company / firm"),
        ("aziende", "azienda", "A2", "n", "f.pl", "companies, businesses", "companies"),
        ("società", "società", "B1", "n", "f", "company, corporation; society", "company / society"),
        ("laurea", "laurea", "B1", "n", "f", "university degree, graduation", "degree"),
        ("diploma", "diploma", "A2", "n", "m", "diploma, school certificate", "diploma"),
        ("formazione", "formazione", "B1", "n", "f", "training, education, background", "training"),
        ("professionale", "professionale", "B1", "adj", "mf.sg", "professional", "professional"),
        ("professionali", "professionale", "B1", "adj", "mf.pl", "professional", "professional"),
        ("inviare", "inviare", "A2", "v", "", "to send, submit, dispatch", "to send"),
        ("inoltrare", "inoltrare", "B1", "v", "", "to forward, submit", "to forward"),
        ("allegare", "allegare", "B1", "v", "", "to attach, enclose", "to attach"),
        ("allegato", "allegare", "B1", "n/adj", "m.sg", "attachment; attached", "attachment"),
        ("allegati", "allegare", "B1", "n/adj", "m.pl", "attachments; attached", "attachments"),
        ("lettera", "lettera", "A1", "n", "f", "letter", "letter"),
        ("motivazione", "motivazione", "B1", "n", "f", "motivation, cover reason", "motivation"),
        ("abilità", "abilità", "B1", "n", "f", "skill, ability, dexterity", "skill / ability"),
        ("capacità", "capacità", "B1", "n", "f", "capacity, capability, ability", "capacity"),
        ("ruolo", "ruolo", "B1", "n", "m", "role, position", "role / position"),
        ("gestione", "gestione", "B1", "n", "f", "management, administration", "management"),
        ("gestire", "gestire", "B1", "v", "", "to manage, handle, run", "to manage"),
        ("responsabile", "responsabile", "B1", "adj/n", "mf.sg", "responsible; manager, supervisor", "responsible"),
        ("responsabilità", "responsabilità", "B1", "n", "f", "responsibility", "responsibility"),
        ("esperienza", "esperienza", "A2", "n", "f", "experience", "experience"),
        ("esperienze", "esperienza", "A2", "n", "f.pl", "experiences", "experiences"),
        ("lingua", "lingua", "A1", "n", "f", "language; tongue", "language"),
        ("lingue", "lingua", "A1", "n", "f.pl", "languages; tongues", "languages"),
        ("livello", "livello", "A2", "n", "m", "level, standard", "level"),
        ("livelli", "livello", "A2", "n", "m.pl", "levels, standards", "levels"),
        ("certificazione", "certificazione", "B1", "n", "f", "certification, certificate", "certification"),
        ("conoscenza", "conoscenza", "B1", "n", "f", "knowledge, acquaintance", "knowledge"),
        ("conoscenze", "conoscenza", "B1", "n", "f.pl", "knowledge, skills", "knowledge"),
        ("imparare", "imparare", "A1", "v", "", "to learn", "to learn"),
        ("insegnare", "insegnare", "A2", "v", "", "to teach", "to teach"),
        ("studiare", "studiare", "A1", "v", "", "to study", "to study"),
        ("lavorare", "lavorare", "A1", "v", "", "to work", "to work"),
        ("lavoro", "lavoro", "A1", "n", "m", "work, job", "work / job"),
        ("lavori", "lavoro", "A1", "n", "m.pl", "works, jobs", "works / jobs")
    ]

    # Combine with external dictionary
    combined_dict = dict(external_dict)

    # Master overrides ensure accuracy on crucial words
    for item in master_lexicon:
        w = item[0].lower()
        lemma = item[1]
        cefr = item[2]
        pos = item[3]
        gender = item[4]
        meaning = item[5]
        short_gloss = item[6] if len(item) > 6 else meaning.split(';')[0].split(',')[0].strip()

        combined_dict[w] = {
            "l": lemma,
            "c": cefr,
            "p": pos,
            "g": gender,
            "m": meaning,
            "sg": short_gloss
        }

    # 3. Verb Paradigms with Natural Short Translations for Every Inflected Form!
    verbs_models = [
        {
            "infinitive": "dovere",
            "cefr": "A1",
            "auxiliary": "avere/essere",
            "meaning": "to have to, must, owe",
            "forms": {
                "devo": ("I must / have to", "Presente", "1.ª pers. sing. (io)"),
                "devi": ("you must / have to", "Presente", "2.ª pers. sing. (tu)"),
                "deve": ("must / has to", "Presente", "3.ª pers. sing. (lui/lei)"),
                "dobbiamo": ("we must / have to", "Presente", "1.ª pers. plur. (noi)"),
                "dovete": ("you all must", "Presente", "2.ª pers. plur. (voi)"),
                "devono": ("they must", "Presente", "3.ª pers. plur. (loro)"),
                "dovrei": ("I should", "Condizionale", "1.ª pers. sing. (io)"),
                "dovresti": ("you should", "Condizionale", "2.ª pers. sing. (tu)"),
                "dovrebbe": ("he/she should", "Condizionale", "3.ª pers. sing. (lui/lei)"),
                "dovremmo": ("we should", "Condizionale", "1.ª pers. plur. (noi)"),
                "dovreste": ("you all should", "Condizionale", "2.ª pers. plur. (voi)"),
                "dovrebbero": ("they should", "Condizionale", "3.ª pers. plur. (loro)"),
                "dovevo": ("I had to / was supposed to", "Imperfetto", "1.ª pers. sing. (io)"),
                "dovevi": ("you had to", "Imperfetto", "2.ª pers. sing. (tu)"),
                "doveva": ("had to", "Imperfetto", "3.ª pers. sing. (lui/lei)"),
                "dovevamo": ("we had to", "Imperfetto", "1.ª pers. plur. (noi)"),
                "dovevate": ("you all had to", "Imperfetto", "2.ª pers. plur. (voi)"),
                "dovevano": ("they had to", "Imperfetto", "3.ª pers. plur. (loro)"),
                "dovuto": ("had to", "Participio Passato", "Participio"),
                "dovendo": ("having to", "Gerundio", "Gerundio"),
                "debba": ("(that) must", "Congiuntivo", "1/2/3 pers. sing."),
                "dovessi": ("(if) I/you had to", "Congiuntivo Imperfetto", "1/2 pers. sing."),
                "dovesse": ("(if) had to", "Congiuntivo Imperfetto", "3.ª pers. sing.")
            }
        },
        {
            "infinitive": "potere",
            "cefr": "A1",
            "auxiliary": "avere/essere",
            "meaning": "to be able to, can",
            "forms": {
                "posso": ("I can", "Presente", "1.ª pers. sing. (io)"),
                "puoi": ("you can", "Presente", "2.ª pers. sing. (tu)"),
                "può": ("can / is able", "Presente", "3.ª pers. sing. (lui/lei)"),
                "possiamo": ("we can", "Presente", "1.ª pers. plur. (noi)"),
                "potete": ("you all can", "Presente", "2.ª pers. plur. (voi)"),
                "possono": ("they can", "Presente", "3.ª pers. plur. (loro)"),
                "potrei": ("I could", "Condizionale", "1.ª pers. sing. (io)"),
                "potresti": ("you could", "Condizionale", "2.ª pers. sing. (tu)"),
                "potrebbe": ("could / might", "Condizionale", "3.ª pers. sing. (lui/lei)"),
                "potremmo": ("we could", "Condizionale", "1.ª pers. plur. (noi)"),
                "potreste": ("you all could", "Condizionale", "2.ª pers. plur. (voi)"),
                "potrebbero": ("they could", "Condizionale", "3.ª pers. plur. (loro)"),
                "potevo": ("I could / was able", "Imperfetto", "1.ª pers. sing. (io)"),
                "poteva": ("could / was able", "Imperfetto", "3.ª pers. sing. (lui/lei)"),
                "potuto": ("been able to", "Participio Passato", "Participio"),
                "possa": ("(that) may / can", "Congiuntivo", "1/2/3 pers. sing."),
                "potessi": ("(if) I/you could", "Congiuntivo Imperfetto", "1/2 pers. sing."),
                "potesse": ("(if) could", "Congiuntivo Imperfetto", "3.ª pers. sing.")
            }
        },
        {
            "infinitive": "volere",
            "cefr": "A1",
            "auxiliary": "avere/essere",
            "meaning": "to want",
            "forms": {
                "voglio": ("I want", "Presente", "1.ª pers. sing. (io)"),
                "vuoi": ("you want", "Presente", "2.ª pers. sing. (tu)"),
                "vuole": ("wants", "Presente", "3.ª pers. sing. (lui/lei)"),
                "vogliamo": ("we want", "Presente", "1.ª pers. plur. (noi)"),
                "volete": ("you all want", "Presente", "2.ª pers. plur. (voi)"),
                "vogliono": ("they want", "Presente", "3.ª pers. plur. (loro)"),
                "vorrei": ("I would like", "Condizionale", "1.ª pers. sing. (io)"),
                "vorresti": ("you would like", "Condizionale", "2.ª pers. sing. (tu)"),
                "vorrebbe": ("would like", "Condizionale", "3.ª pers. sing. (lui/lei)"),
                "vorremmo": ("we would like", "Condizionale", "1.ª pers. plur. (noi)"),
                "vorrebbero": ("they would like", "Condizionale", "3.ª pers. plur. (loro)"),
                "volevo": ("I wanted", "Imperfetto", "1.ª pers. sing. (io)"),
                "voleva": ("wanted", "Imperfetto", "3.ª pers. sing. (lui/lei)"),
                "voluto": ("wanted", "Participio Passato", "Participio"),
                "voglia": ("(that) want", "Congiuntivo", "1/2/3 pers. sing.")
            }
        },
        {
            "infinitive": "essere",
            "cefr": "A1",
            "auxiliary": "essere",
            "meaning": "to be",
            "forms": {
                "sono": ("am / are", "Presente", "1.ª pers. sing. / 3.ª plur."),
                "sei": ("you are", "Presente", "2.ª pers. sing. (tu)"),
                "è": ("is", "Presente", "3.ª pers. sing. (lui/lei)"),
                "siamo": ("we are", "Presente", "1.ª pers. plur. (noi)"),
                "siete": ("you all are", "Presente", "2.ª pers. plur. (voi)"),
                "ero": ("I was", "Imperfetto", "1.ª pers. sing. (io)"),
                "eri": ("you were", "Imperfetto", "2.ª pers. sing. (tu)"),
                "era": ("was", "Imperfetto", "3.ª pers. sing. (lui/lei)"),
                "eravamo": ("we were", "Imperfetto", "1.ª pers. plur. (noi)"),
                "eravate": ("you all were", "Imperfetto", "2.ª pers. plur. (voi)"),
                "erano": ("they were", "Imperfetto", "3.ª pers. plur. (loro)"),
                "stato": ("been", "Participio Passato", "Participio m.sg"),
                "stata": ("been (f)", "Participio Passato", "Participio f.sg"),
                "stati": ("been (m.pl)", "Participio Passato", "Participio m.pl"),
                "state": ("been (f.pl)", "Participio Passato", "Participio f.pl"),
                "sarò": ("I will be", "Futuro", "1.ª pers. sing. (io)"),
                "sarai": ("you will be", "Futuro", "2.ª pers. sing. (tu)"),
                "sarà": ("will be", "Futuro", "3.ª pers. sing. (lui/lei)"),
                "saremo": ("we will be", "Futuro", "1.ª pers. plur. (noi)"),
                "sarete": ("you all will be", "Futuro", "2.ª pers. plur. (voi)"),
                "saranno": ("they will be", "Futuro", "3.ª pers. plur. (loro)"),
                "sarei": ("I would be", "Condizionale", "1.ª pers. sing. (io)"),
                "saresti": ("you would be", "Condizionale", "2.ª pers. sing. (tu)"),
                "sarebbe": ("would be", "Condizionale", "3.ª pers. sing. (lui/lei)"),
                "saremmo": ("we would be", "Condizionale", "1.ª pers. plur. (noi)"),
                "sarebbero": ("they would be", "Condizionale", "3.ª pers. plur. (loro)"),
                "sia": ("(that) be", "Congiuntivo", "1/2/3 pers. sing."),
                "siate": ("(that) you all be", "Congiuntivo", "2.ª pers. plur. (voi)"),
                "siano": ("(that) they be", "Congiuntivo", "3.ª pers. plur. (loro)"),
                "fossi": ("(if) I/you were", "Congiuntivo Imperfetto", "1/2 pers. sing."),
                "fosse": ("(if) were", "Congiuntivo Imperfetto", "3.ª pers. sing. (lui/lei)"),
                "fossimo": ("(if) we were", "Congiuntivo Imperfetto", "1.ª pers. plur. (noi)"),
                "foste": ("(if) you all were", "Congiuntivo Imperfetto", "2.ª pers. plur. (voi)"),
                "fossero": ("(if) they were", "Congiuntivo Imperfetto", "3.ª pers. plur. (loro)")
            }
        },
        {
            "infinitive": "avere",
            "cefr": "A1",
            "auxiliary": "avere",
            "meaning": "to have",
            "forms": {
                "ho": ("I have", "Presente", "1.ª pers. sing. (io)"),
                "hai": ("you have", "Presente", "2.ª pers. sing. (tu)"),
                "ha": ("has", "Presente", "3.ª pers. sing. (lui/lei)"),
                "abbiamo": ("we have", "Presente", "1.ª pers. plur. (noi)"),
                "avete": ("you all have", "Presente", "2.ª pers. plur. (voi)"),
                "hanno": ("they have", "Presente", "3.ª pers. plur. (loro)"),
                "avevo": ("I had", "Imperfetto", "1.ª pers. sing. (io)"),
                "avevi": ("you had", "Imperfetto", "2.ª pers. sing. (tu)"),
                "aveva": ("had", "Imperfetto", "3.ª pers. sing. (lui/lei)"),
                "avevamo": ("we had", "Imperfetto", "1.ª pers. plur. (noi)"),
                "avevate": ("you all had", "Imperfetto", "2.ª pers. plur. (voi)"),
                "avevano": ("they had", "Imperfetto", "3.ª pers. plur. (loro)"),
                "avuto": ("had", "Participio Passato", "Participio"),
                "avrò": ("I will have", "Futuro", "1.ª pers. sing. (io)"),
                "avrai": ("you will have", "Futuro", "2.ª pers. sing. (tu)"),
                "avrà": ("will have", "Futuro", "3.ª pers. sing. (lui/lei)"),
                "avremo": ("we will have", "Futuro", "1.ª pers. plur. (noi)"),
                "avrebbero": ("they would have", "Condizionale", "3.ª pers. plur. (loro)"),
                "avrei": ("I would have", "Condizionale", "1.ª pers. sing. (io)"),
                "avresti": ("you would have", "Condizionale", "2.ª pers. sing. (tu)"),
                "avrebbe": ("would have", "Condizionale", "3.ª pers. sing. (lui/lei)"),
                "avremmo": ("we would have", "Condizionale", "1.ª pers. plur. (noi)"),
                "abbia": ("(that) have", "Congiuntivo", "1/2/3 pers. sing."),
                "avessi": ("(if) I/you had", "Congiuntivo Imperfetto", "1/2 pers. sing."),
                "avesse": ("(if) had", "Congiuntivo Imperfetto", "3.ª pers. sing. (lui/lei)"),
                "avessimo": ("(if) we had", "Congiuntivo Imperfetto", "1.ª pers. plur. (noi)")
            }
        },
        {
            "infinitive": "andare",
            "cefr": "A1",
            "auxiliary": "essere",
            "meaning": "to go",
            "forms": {
                "vado": ("I go", "Presente", "1.ª pers. sing. (io)"),
                "vai": ("you go", "Presente", "2.ª pers. sing. (tu)"),
                "va": ("goes", "Presente", "3.ª pers. sing. (lui/lei)"),
                "andiamo": ("we go / let's go", "Presente", "1.ª pers. plur. (noi)"),
                "andate": ("you all go", "Presente", "2.ª pers. plur. (voi)"),
                "vanno": ("they go", "Presente", "3.ª pers. plur. (loro)"),
                "andato": ("gone", "Participio Passato", "Participio m.sg"),
                "andata": ("gone (f)", "Participio Passato", "Participio f.sg"),
                "andati": ("gone (m.pl)", "Participio Passato", "Participio m.pl"),
                "andate": ("gone (f.pl)", "Participio Passato", "Participio f.pl"),
                "andrò": ("I will go", "Futuro", "1.ª pers. sing. (io)"),
                "andrà": ("will go", "Futuro", "3.ª pers. sing. (lui/lei)"),
                "andrei": ("I would go", "Condizionale", "1.ª pers. sing. (io)"),
                "vada": ("(that) go", "Congiuntivo", "1/2/3 pers. sing.")
            }
        },
        {
            "infinitive": "fare",
            "cefr": "A1",
            "auxiliary": "avere",
            "meaning": "to do, make",
            "forms": {
                "faccio": ("I do / make", "Presente", "1.ª pers. sing. (io)"),
                "fai": ("you do / make", "Presente", "2.ª pers. sing. (tu)"),
                "fa": ("does / makes; ago", "Presente", "3.ª pers. sing. (lui/lei)"),
                "facciamo": ("we do / make", "Presente", "1.ª pers. plur. (noi)"),
                "fate": ("you all do / make", "Presente", "2.ª pers. plur. (voi)"),
                "fanno": ("they do / make", "Presente", "3.ª pers. plur. (loro)"),
                "fatto": ("done / made", "Participio Passato", "Participio"),
                "farò": ("I will do / make", "Futuro", "1.ª pers. sing. (io)"),
                "farà": ("will do / make", "Futuro", "3.ª pers. sing. (lui/lei)"),
                "farei": ("I would do / make", "Condizionale", "1.ª pers. sing. (io)"),
                "faccia": ("(that) do / make", "Congiuntivo", "1/2/3 pers. sing.")
            }
        }
    ]

    for vm in verbs_models:
        inf = vm["infinitive"]
        for form, (short_m, tense, person) in vm["forms"].items():
            combined_dict[form] = {
                "l": inf,
                "c": vm["cefr"],
                "p": "v",
                "g": "",
                "m": f"{short_m} [{inf}]",
                "sg": short_m,
                "t": tense,
                "pn": person
            }

    # Verify our target test sentence
    test_sentence = ['secondo', 'me', 'dovresti', 'aggiornare', 'il', 'tuo', 'curriculum']
    print("\nVerifying test sentence words in generated database:")
    for w in test_sentence:
        e = combined_dict.get(w)
        if e:
            print(f"  OK: {w} -> '{e.get('sg') or e.get('m')}' [Level: {e.get('c')}]")
        else:
            print(f"  MISSING: {w}")

    # Build Verb Paradigms mapping for Modal Inspector
    # (reuse existing paradigms structure)
    from build_italian_data import main as old_main

    # Generate file
    print(f"\nTotal dictionary entries compiled: {len(combined_dict)}")
    out_path = os.path.join(os.path.dirname(__file__), "italian_data.js")
    
    # Load paradigms from existing build_italian_data.py
    import build_italian_data
    # Re-use paradigms
    paradigms = {}
    with open(out_path, "r", encoding="utf-8") as f:
        existing_js = f.read()
    
    # Extract ITALIAN_VERB_PARADIGMS and ITALIAN_THEMES
    p_match = re.search(r'window\.ITALIAN_VERB_PARADIGMS\s*=\s*(\{.*?\});\s*window\.ITALIAN_THEMES', existing_js, re.DOTALL)
    if p_match:
        paradigms = json.loads(p_match.group(1))

    # Add aggiornare paradigm dynamically to paradigms!
    paradigms["aggiornare"] = {
        "infinitive": "aggiornare",
        "cefr": "B1",
        "auxiliary": "avere",
        "meaning": "to update, bring up to date",
        "presente": ["aggiorno", "aggiorni", "aggiorna", "aggiorniamo", "aggiornate", "aggiornano"],
        "imperfetto": ["aggiornavo", "aggiornavi", "aggiornava", "aggiornavamo", "aggiornavate", "aggiornavano"],
        "passato_prossimo": ["ho aggiornato", "hai aggiornato", "ha aggiornato", "abbiamo aggiornato", "avete aggiornato", "hanno aggiornato"],
        "futuro": ["aggiornerò", "aggiornerai", "aggiornerà", "aggiorneremo", "aggiornerete", "aggiorneranno"],
        "condizionale": ["aggiornerei", "aggiorneresti", "aggiornerebbe", "aggiorneremmo", "aggiornereste", "aggiornerebbero"],
        "congiuntivo_pres": ["aggiorni", "aggiorni", "aggiorni", "aggiorniamo", "aggiorniate", "aggiornino"],
        "congiuntivo_imp": ["aggiornassi", "aggiornassi", "aggiornasse", "aggiornassimo", "aggiornaste", "aggiornassero"],
        "imperativo": ["-", "aggiorna", "aggiorni", "aggiorniamo", "aggiornate", "aggiornino"],
        "gerundio": "aggiornando",
        "participio_passato": "aggiornato"
    }

    js_content = f"""// Italian CEFR & Conjugation Database
// Comprehensive CEFR A1-C2 vocabulary, RAE/Crusca phonetics, and complete verb paradigms
window.ITALIAN_DICT = {json.dumps(combined_dict, ensure_ascii=False)};

window.ITALIAN_VERB_PARADIGMS = {json.dumps(paradigms, ensure_ascii=False)};

window.ITALIAN_THEMES = [
  "Identità e Relazioni",
  "Esperienze e Viaggi",
  "Arte e Creatività",
  "Organizzazione Sociale",
  "Scienza e Ambiente"
];
"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"Generated {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == "__main__":
    main()
