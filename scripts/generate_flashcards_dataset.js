const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', 'flashcards.json');
const TXT_PATH = path.join(__dirname, '..', 'data', 'Flashcards.txt');

const oldData = fs.existsSync(JSON_PATH) ? JSON.parse(fs.readFileSync(JSON_PATH, 'utf8')) : [];
const oldById = new Map(oldData.map((card) => [card.id, card]));

const themes = [
  'Patterns',
  'Pièges',
  'Réflexes mémoire',
  'Pointeurs',
  'Malloc',
  'Listes chaînées',
  'Conditions limites',
  'Règles implicites des énoncés',
];

const functionProfiles = [
  {
    fn: 'ft_split',
    decision: 'compter les mots avant toute allocation',
    guard: 'ignorer les séparateurs avant de marquer un mot',
    allocation: 'allouer (words + 1) pointeurs puis chaque mot en len + 1',
    fail: 'free les mots déjà alloués, free le tableau, return NULL',
    pointer: 'avancer index caractère sans sauter le dernier mot',
    edge: 'string vide ou composée uniquement de séparateurs',
    output: 'poser tab[word_count] = NULL avant return',
    implicit: 'si argc invalide dans un main test, écrire seulement un retour ligne',
  },
  {
    fn: 'ft_range',
    decision: 'calculer size = abs(end - start) + 1',
    guard: 'définir step à +1 ou -1 selon start/end',
    allocation: 'malloc(size * sizeof(int))',
    fail: 'if (!arr) return NULL immédiatement',
    pointer: 'écrire arr[i], puis value += step',
    edge: 'start == end doit retourner un tableau de taille 1',
    output: 'retourner le pointeur de base, jamais un pointeur avancé',
    implicit: 'respecter exactement le prototype demandé',
  },
  {
    fn: 'ft_list_remove_if',
    decision: 'nettoyer la tête avec while(*begin_list && cmp(...) == 0)',
    guard: 'tester begin_list et *begin_list avant déréférence',
    allocation: 'aucun malloc, suppression en place',
    fail: 'si liste vide, return sans toucher aux pointeurs',
    pointer: 'tmp = cur->next, unlink, free(tmp), puis décider si cur avance',
    edge: 'plusieurs suppressions consécutives',
    output: 'laisser *begin_list cohérent après toutes suppressions',
    implicit: 'garder la signature imposée avec free_fct',
  },
  {
    fn: 'sort_list',
    decision: 'boucler tant que swapped == 1',
    guard: 'si la liste est vide ou à un maillon, return lst',
    allocation: 'aucun malloc, tri en place',
    fail: 'si cmp est instable, ne pas casser les liens',
    pointer: 'swap data avec tmp, pas les liens des maillons',
    edge: 'liste vide, liste à un maillon, éléments égaux',
    output: 'arrêter après un passage complet sans swap',
    implicit: 'respecter la convention cmp(a, b) > 0 pour swap',
  },
  {
    fn: 'itoa',
    decision: 'caster n en long avant traitement du signe',
    guard: 'gérer explicitement le cas n == 0',
    allocation: 'malloc(digits + sign + 1)',
    fail: 'if (!str) return NULL',
    pointer: 'remplir depuis la fin puis placer le signe',
    edge: 'INT_MIN doit rester correct sans overflow',
    output: "poser str[len] = '\\0' avant return",
    implicit: 'la fonction retourne une string, elle ne doit rien afficher',
  },
  {
    fn: 'wdmatch',
    decision: 'parcourir argv[2] et avancer argv[1] uniquement en cas de match',
    guard: 'if (argc != 3) écrire uniquement un retour ligne',
    allocation: 'aucun malloc dans la solution standard',
    fail: 'si un caractère manque, ne pas afficher argv[1]',
    pointer: 'i2 avance toujours, i1 avance seulement sur match',
    edge: 'argv[1] vide doit être géré proprement',
    output: 'afficher argv[1] seulement si tout est consommé dans l’ordre',
    implicit: 'sortie stricte sans texte additionnel',
  },
  {
    fn: 'union',
    decision: 'utiliser seen[256] initialisé à 0',
    guard: 'caster chaque char en unsigned char avant indexation',
    allocation: 'aucun malloc, tableau local seen',
    fail: 'argc invalide, écrire un retour ligne et sortir',
    pointer: 'parcourir la première string puis la seconde',
    edge: 'char signé négatif sur caractères étendus',
    output: 'écrire un caractère inédit une seule fois',
    implicit: 'respecter le format exact de sortie demandé',
  },
  {
    fn: 'atoi',
    decision: 'ignorer espaces, lire signe, accumuler chiffre par chiffre',
    guard: 'arrêter au premier caractère non numérique',
    allocation: 'aucun malloc nécessaire',
    fail: 'entrée vide ou signe seul, retourner la valeur prévue par le sujet',
    pointer: 'incrémenter l’index dans toutes les branches de lecture',
    edge: 'gérer correctement -0 et les espaces initiaux',
    output: 'return sign * result sans affichage',
    implicit: 'pas de sortie texte dans la fonction',
  },
  {
    fn: 'last_word',
    decision: 'aller en fin de string puis reculer sur séparateurs',
    guard: 'if (argc != 2), écrire seulement un retour ligne',
    allocation: 'aucun malloc, affichage direct',
    fail: 'si aucun mot trouvé, écrire seulement un retour ligne',
    pointer: 'reculer jusqu’au début du mot puis afficher le segment',
    edge: 'espaces et tabulations en fin de chaîne',
    output: 'écrire exactement le dernier mot puis un retour ligne',
    implicit: 'aucun espace en trop dans la sortie',
  },
  {
    fn: 'inter',
    decision: 'vérifier l’appartenance dans argv[2] avant d’afficher',
    guard: 'if (argc != 3), sortie minimale avec retour ligne',
    allocation: 'aucun malloc, logique en parcours',
    fail: 'pas de caractère commun, afficher seulement un retour ligne',
    pointer: 'parcourir argv[1], scanner argv[2], marquer les déjà affichés',
    edge: 'doublons multiples dans argv[1]',
    output: 'n’afficher chaque caractère commun qu’une seule fois',
    implicit: 'sortie stricte sans message de debug',
  },
];

const listProfiles = functionProfiles.filter((profile) =>
  profile.fn === 'ft_list_remove_if' || profile.fn === 'sort_list'
);

const difficultyByTheme = {
  Patterns: 'medium',
  'Pièges': 'hard',
  'Réflexes mémoire': 'medium',
  Pointeurs: 'medium',
  Malloc: 'medium',
  'Listes chaînées': 'hard',
  'Conditions limites': 'hard',
  'Règles implicites des énoncés': 'medium',
};

function makeAnswer(lines) {
  return lines
    .map((line) => String(line).replace(/\|/g, ' ou ').replace(/\s+/g, ' ').trim())
    .join(' | ');
}

function makeExplanation(theme, fn, hint) {
  const prefix = {
    Patterns: `Sur ${fn}, ce réflexe évite l’improvisation et réduit les erreurs de structure en exam.`,
    'Pièges': `Sur ${fn}, ce point évite un bug typique qui passe en local mais tombe en correction automatique.`,
    'Réflexes mémoire': `Sur ${fn}, cette décision sécurise mémoire et ownership sans complexifier inutilement.`,
    Pointeurs: `Sur ${fn}, la stabilité dépend du bon niveau d’indirection et de l’ordre des déréférencements.`,
    Malloc: `Sur ${fn}, ce choix d’allocation conditionne directement la réussite sur cas limites.`,
    'Listes chaînées': `Sur ${fn}, l’ordre unlink/free/avancement est la clé pour éviter corruption et sauts.`,
    'Conditions limites': `Sur ${fn}, ce cas est testé tôt à l’exam et doit être géré explicitement.`,
    'Règles implicites des énoncés': `Sur ${fn}, la conformité de sortie et de signature compte autant que l’algorithme.`,
  };
  return `${prefix[theme]} ${hint}`;
}

function cardForTheme(theme, profile, variant) {
  const fn = profile.fn;

  if (theme === 'Patterns') {
    if (variant === 0) {
      return {
        question: `${fn} : tu lances l’exercice. Quelle checklist exécuter avant la première boucle ?`,
        answer: makeAnswer([
          `Commencer par la garde d’entrée : ${profile.guard}`,
          `Ordre de travail : ${profile.decision}`,
          `Plan de sortie mémoire : ${profile.allocation}`,
          `Validation finale : ${profile.output}`,
        ]),
        explanation: makeExplanation(theme, fn, 'Tu gagnes du temps et évites les oublis de dernière minute.'),
      };
    }
    return {
      question: `${fn} : tu hésites au milieu du code. Quelle action immédiate te remet dans le bon pattern ?`,
      answer: makeAnswer([
        `Action clé : ${profile.decision}`,
        `Chemin d’échec prêt : ${profile.fail}`,
        `Parcours maîtrisé : ${profile.pointer}`,
        `Retour conforme : ${profile.output}`,
      ]),
      explanation: makeExplanation(theme, fn, 'Le flux reste stable même sous pression chronométrée.'),
    };
  }

  if (theme === 'Pièges') {
    if (variant === 0) {
      return {
        question: `${fn} : le code compile mais la moulinette casse. Quel piège corriges-tu en premier ?`,
        answer: makeAnswer([
          `Piège fréquent : oublier ${profile.output.toLowerCase()}`,
          `Vérification prioritaire : ${profile.guard}`,
          `Ordre sûr : ${profile.pointer}`,
          `Si erreur : ${profile.fail}`,
        ]),
        explanation: makeExplanation(theme, fn, 'Ce type de bug apparaît surtout sur les tests cachés.'),
      };
    }
    return {
      question: `${fn} : tu vois un comportement aléatoire. Quel test concret lève le doute rapidement ?`,
      answer: makeAnswer([
        `Rejouer le cas limite : ${profile.edge}`,
        `Confirmer la garde : ${profile.guard}`,
        `Contrôler la sortie exacte : ${profile.output}`,
        `Écarter les effets de bord : ${profile.pointer}`,
      ]),
      explanation: makeExplanation(theme, fn, 'La correction devient reproductible et non aléatoire.'),
    };
  }

  if (theme === 'Réflexes mémoire') {
    if (variant === 0) {
      return {
        question: `${fn} : tu retournes une donnée allouée. Quel réflexe mémoire appliquer tout de suite ?`,
        answer: makeAnswer([
          `Allocation exacte : ${profile.allocation}`,
          `Test immédiat : ${profile.fail}`,
          `Contrat de libération : appelant responsable du free`,
          `Sortie sûre : ${profile.output}`,
        ]),
        explanation: makeExplanation(theme, fn, 'Le contrat mémoire reste clair entre fonction et appelant.'),
      };
    }
    return {
      question: `${fn} : une allocation intermédiaire échoue. Quelle séquence de cleanup exécuter ?`,
      answer: makeAnswer([
          `Ne jamais continuer après échec : ${profile.fail}`,
          `Libérer ce qui est déjà possédé`,
          `Ne pas free une zone jamais allouée`,
          `Retourner NULL de façon explicite`,
      ]),
      explanation: makeExplanation(theme, fn, 'Ce réflexe évite les fuites silencieuses en EX2-EX4.'),
    };
  }

  if (theme === 'Pointeurs') {
    if (variant === 0) {
      return {
        question: `${fn} : avant un unlink ou une écriture, quel pointeur dois-tu sécuriser ?`,
        answer: makeAnswer([
          `Conserver l’adresse utile dans un temporaire`,
          `Déréférencer seulement après garde : ${profile.guard}`,
          `Avancer selon la règle : ${profile.pointer}`,
          `Éviter toute adresse locale au return`,
        ]),
        explanation: makeExplanation(theme, fn, 'Le temporaire empêche de perdre la chaîne ou le buffer.'),
      };
    }
    return {
      question: `${fn} : tu modifies la structure puis return. Quel réflexe pointeur évite un pointeur mort ?`,
      answer: makeAnswer([
          `Conserver le pointeur de base pour le return`,
          `Ne jamais retourner l’adresse d’une variable locale`,
          `Vérifier la validité avant chaque -> ou *`,
          `Finaliser avec une sortie cohérente : ${profile.output}`,
      ]),
      explanation: makeExplanation(theme, fn, 'Le return reste valide après la sortie de fonction.'),
    };
  }

  if (theme === 'Malloc') {
    if (variant === 0) {
      return {
        question: `${fn} : quelle taille malloc dois-tu poser pour passer les tests limites ?`,
        answer: makeAnswer([
          `Formule exacte : ${profile.allocation}`,
          `Inclure toujours la terminaison nécessaire`,
          `Éviter les tailles arbitraires`,
          `Tester l’échec avant toute écriture : ${profile.fail}`,
        ]),
        explanation: makeExplanation(theme, fn, 'Le sizing exact évite off-by-one et corruption mémoire.'),
      };
    }
    return {
      question: `${fn} : tu as un NULL de malloc en plein run. Quelle décision immédiate prendre ?`,
      answer: makeAnswer([
          `Sortir proprement : ${profile.fail}`,
          `Nettoyer les allocations déjà faites`,
          `Ne jamais écrire dans un pointeur NULL`,
          `Retourner un état d’échec explicite`,
      ]),
      explanation: makeExplanation(theme, fn, 'Le chemin d’erreur doit être aussi propre que le nominal.'),
    };
  }

  if (theme === 'Conditions limites') {
    if (variant === 0) {
      return {
        question: `${fn} : quel cas limite testes-tu en premier avant de valider la fonction ?`,
        answer: makeAnswer([
          `Cas critique : ${profile.edge}`,
          `Confirmer la garde : ${profile.guard}`,
          `Contrôler la sortie : ${profile.output}`,
          `Vérifier le comportement en erreur : ${profile.fail}`,
        ]),
        explanation: makeExplanation(theme, fn, 'Le premier crash exam vient souvent de ce cas ignoré.'),
      };
    }
    return {
      question: `${fn} : en entrée minimale, quel comportement doit rester stable ?`,
      answer: makeAnswer([
          `Aucune déréférence sans garde`,
          `Aucune allocation inutile`,
          `Retour déterministe et conforme`,
          `Sortie attendue strictement respectée`,
      ]),
      explanation: makeExplanation(theme, fn, 'Un cas minimal bien géré évite la majorité des rejets cachés.'),
    };
  }

  if (theme === 'Règles implicites des énoncés') {
    if (variant === 0) {
      return {
        question: `${fn} : l’énoncé impose un prototype strict. Quelle vérification fais-tu avant rendu ?`,
        answer: makeAnswer([
          `Signature identique au sujet`,
          `Fonctions autorisées uniquement`,
          `Aucun print de debug`,
          `Sortie formatée exactement comme demandé`,
        ]),
        explanation: makeExplanation(theme, fn, 'Même un bon algo est refusé si le contrat est brisé.'),
      };
    }
    return {
      question: `${fn} : argc est invalide dans le main de test. Quel comportement conforme appliques-tu ?`,
      answer: makeAnswer([
        `Règle d’énoncé : ${profile.implicit}`,
        `Ne pas ajouter de message personnel`,
        `Conserver stdout conforme`,
        `Quitter proprement sans effet de bord`,
      ]),
      explanation: makeExplanation(theme, fn, 'La moulinette compare la sortie caractère par caractère.'),
    };
  }

  throw new Error(`Theme non géré: ${theme}`);
}

function listCard(profile, variant) {
  const fn = profile.fn;

  const variants = [
    {
      question: `${fn} : tu supprimes en tête. Quel enchaînement évite de perdre la liste ?`,
      lines: [
        'Stocker la tête cible dans tmp',
        'Repointer *begin_list vers le suivant',
        'Free(tmp) après reconnexion',
        'Reboucler tant que la tête match',
      ],
      hint: 'Le cas tête est le premier point de rupture en exam.',
    },
    {
      question: `${fn} : deux maillons consécutifs doivent disparaître. Quel réflexe d’avancement ?`,
      lines: [
        'Ne pas avancer cur après suppression',
        'Rester sur le même cur pour retester cur->next',
        'Utiliser tmp pour unlink puis free',
        'Avancer cur seulement si aucun unlink',
      ],
      hint: 'Ce point évite de sauter un maillon à supprimer.',
    },
    {
      question: `${fn} : avant d’accéder à cur->next->next, quel test est obligatoire ?`,
      lines: [
        'Vérifier cur et cur->next',
        'Ne jamais déréférencer sans garde',
        'Sortir proprement si la chaîne est courte',
        'Reprendre la boucle avec un état sûr',
      ],
      hint: 'La garde évite un segfault sur fin de liste.',
    },
    {
      question: `${fn} : suppression du dernier maillon. Que fais-tu dans l’ordre ?`,
      lines: [
        'Trouver le maillon précédent',
        'Mettre previous->next à NULL',
        'Free le dernier maillon',
        'Conserver la tête inchangée',
      ],
      hint: 'Le lien précédent doit être corrigé avant free.',
    },
    {
      question: `${fn} : liste vide en entrée. Quel comportement attendu à l’exam ?`,
      lines: [
        'Retour immédiat sans déréférence',
        'Aucun free hors contexte',
        'Aucun accès à ->next',
        'Fonction stable et silencieuse',
      ],
      hint: 'Le cas vide est un test standard de robustesse.',
    },
    {
      question: `${fn} : dans sort_list, quand arrêtes-tu les passes de tri ?`,
      lines: [
        'Initialiser swapped à 0 en début de passe',
        'Mettre swapped à 1 sur chaque échange',
        'Arrêter quand une passe finit sans swap',
        'Ne pas casser les liens pendant le tri',
      ],
      hint: 'Le flag swapped supprime les boucles infinies.',
    },
    {
      question: `${fn} : swap des maillons ou swap des data ? Quelle décision rapide prend-tu ?`,
      lines: [
        'Privilégier le swap de data en exam',
        'Utiliser tmp pour échanger proprement',
        'Éviter de relier les next sans plan complet',
        'Valider cmp avant chaque échange',
      ],
      hint: 'Le swap de data est plus sûr sous contrainte de temps.',
    },
    {
      question: `${fn} : après unlink d’un maillon, quel ordre garde l’intégrité mémoire ?`,
      lines: [
        'Reconnexion des liens en premier',
        'Free du maillon supprimé ensuite',
        'Aucun accès au maillon après free',
        'Poursuite du parcours avec pointeur valide',
      ],
      hint: 'Free trop tôt provoque corruption et lecture invalide.',
    },
    {
      question: `${fn} : tous les éléments sont égaux. Quel résultat est correct ?`,
      lines: [
        'Aucun swap inutile',
        'swapped reste à 0 sur la passe',
        'La liste reste stable',
        'La fonction se termine sans boucle infinie',
      ],
      hint: 'Le tri doit être stable même sans échange.',
    },
    {
      question: `${fn} : tu nettoies plusieurs têtes d’affilée. Quel test pilote la boucle ?`,
      lines: [
        'while (*begin_list && cmp(...) == 0)',
        'tmp = *begin_list avant unlink',
        '*begin_list = tmp->next puis free(tmp)',
        'Répéter jusqu’à première tête conservée',
      ],
      hint: 'Sans cette boucle, les suppressions en tête restent incomplètes.',
    },
  ];

  const selected = variants[variant];

  return {
    question: selected.question,
    answer: makeAnswer(selected.lines),
    explanation: makeExplanation('Listes chaînées', fn, selected.hint),
  };
}

function buildCards() {
  const cards = [];

  for (const theme of themes) {
    if (theme === 'Listes chaînées') {
      for (const profile of listProfiles) {
        for (let variant = 0; variant < 10; variant += 1) {
          const card = listCard(profile, variant);
          cards.push({ theme, ...card });
        }
      }
      continue;
    }

    for (const profile of functionProfiles) {
      for (let variant = 0; variant < 2; variant += 1) {
        const card = cardForTheme(theme, profile, variant);
        cards.push({ theme, ...card });
      }
    }
  }

  if (cards.length !== 160) {
    throw new Error(`Deck invalide: ${cards.length} cartes (attendu 160).`);
  }

  return cards;
}

function toJsonCards(cards) {
  return cards.map((card, index) => {
    const id = `fc-${String(index + 1).padStart(3, '0')}`;
    const prev = oldById.get(id) || {};

    const lines = card.answer.split('|').map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0 || lines.length > 6) {
      throw new Error(`Verso invalide pour ${id}: ${lines.length} lignes.`);
    }

    return {
      id,
      category: card.theme,
      question: card.question,
      answer: card.answer,
      explanation: card.explanation,
      difficulty: difficultyByTheme[card.theme] || 'medium',
      successCount: Number.isFinite(prev.successCount) ? prev.successCount : 0,
      failCount: Number.isFinite(prev.failCount) ? prev.failCount : 0,
      lastSeen: Number.isFinite(prev.lastSeen) ? prev.lastSeen : 0,
      nextDue: Number.isFinite(prev.nextDue) ? prev.nextDue : 0,
    };
  });
}

function toTextDeck(cards) {
  return cards
    .map((card, index) => {
      const number = String(index + 1).padStart(3, '0');
      const lines = card.answer.split('|').map((line) => line.trim()).filter(Boolean);
      return [
        `CARD ${number} — ${card.theme}`,
        '',
        'Face :',
        card.question,
        '',
        'Dos :',
        ...lines.map((line) => `• ${line}`),
        '',
        '---',
        '',
      ].join('\n');
    })
    .join('');
}

function validate(cards) {
  const fnRegex = /\b(ft_split|ft_range|ft_list_remove_if|sort_list|itoa|wdmatch|union|atoi|last_word|inter)\b/;

  const byTheme = {};
  for (const card of cards) {
    byTheme[card.theme] = (byTheme[card.theme] || 0) + 1;

    if (!fnRegex.test(card.question)) {
      throw new Error(`Fonction non explicite dans la question: ${card.question}`);
    }

    const isTooTheoretical = /qu['’]est-ce qu|définis|définition/i.test(card.question);
    if (isTooTheoretical) {
      throw new Error(`Carte trop théorique: ${card.question}`);
    }

    if (!/\?|quel|quelle|que fais-tu|quelle action/i.test(card.question)) {
      throw new Error(`Face insuffisamment orientée décision: ${card.question}`);
    }

    const lineCount = card.answer.split('|').map((line) => line.trim()).filter(Boolean).length;
    if (lineCount > 6) {
      throw new Error(`Verso > 6 lignes: ${card.question}`);
    }
  }

  for (const theme of themes) {
    if (byTheme[theme] !== 20) {
      throw new Error(`Répartition invalide sur ${theme}: ${byTheme[theme] || 0}`);
    }
  }

  return byTheme;
}

const rawCards = buildCards();
const stats = validate(rawCards);
const jsonCards = toJsonCards(rawCards);
const txtDeck = toTextDeck(rawCards);

fs.writeFileSync(JSON_PATH, JSON.stringify(jsonCards, null, 2) + '\n', 'utf8');
fs.writeFileSync(TXT_PATH, txtDeck, 'utf8');

console.log(`flashcards generated: ${jsonCards.length}`);
console.log(stats);
