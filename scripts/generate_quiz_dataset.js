const fs = require('fs');
const path = require('path');

const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'quiz.json');

const profiles = [
  {
    fn: 'ft_split',
    output: 'un tableau de mots',
    sequence: 'Compter les mots, allouer `nb_mots + 1` pointeurs, copier chaque mot, puis poser le NULL final.',
    failSafe: 'Libérer chaque mot déjà alloué, libérer le tableau, puis retourner NULL.',
    advanceRule: 'Avancer d’abord sur les séparateurs, puis sur les caractères du mot sans sauter d’index.',
    finalizeRule: 'Écrire `tab[word_count] = NULL` après le dernier mot copié.',
    edgeCase: 'Une entrée vide ou composée uniquement de séparateurs.',
    trapFix: 'Ajouter la case de terminaison (`+1`) pour stocker le pointeur NULL final.',
    sizeRule: 'Allouer `(nb_mots + 1) * sizeof(char *)` pour le tableau de pointeurs.',
    ownerRule: 'L’appelant libère chaque mot puis le tableau retourné.',
    pointerRule: 'Conserver un index de mot stable pour ne pas perdre les allocations intermédiaires.',
    limitCase: 'Le dernier mot n’est pas suivi d’un séparateur.',
    implicitRule: 'Si les arguments du main de test sont invalides, écrire uniquement un retour ligne.',
    mallocRequired: true,
    guardRule: 'Tester chaque retour de malloc immédiatement avec `if (!ptr)`.',
  },
  {
    fn: 'ft_range',
    output: 'un tableau d\'int entre start et end',
    sequence: 'Calculer la taille inclusive, allouer le tableau, remplir avec un step `+1` ou `-1`, puis retourner le pointeur.',
    failSafe: 'Retourner NULL immédiatement si l’allocation échoue.',
    advanceRule: 'Mettre à jour la valeur courante avec `value += step` à chaque itération.',
    finalizeRule: 'Retourner le pointeur du début du tableau, jamais un pointeur avancé.',
    edgeCase: 'Le cas `start == end`, qui doit retourner un tableau de taille 1.',
    trapFix: 'Calculer `abs(end - start) + 1` pour éviter le off-by-one.',
    sizeRule: 'Allouer `size * sizeof(int)` avec `size = abs(end - start) + 1`.',
    ownerRule: 'L’appelant libère le tableau d\'int retourné.',
    pointerRule: 'Conserver un pointeur de base pour le return final.',
    limitCase: 'Le cas `start > end`, qui impose un parcours décroissant.',
    implicitRule: 'Respecter exactement le prototype demandé par l’énoncé pour la correction.',
    mallocRequired: true,
    guardRule: 'Tester le pointeur retourné par malloc avant tout remplissage.',
  },
  {
    fn: 'ft_list_remove_if',
    output: 'une liste nettoyée des maillons à supprimer',
    sequence: 'Nettoyer les têtes correspondantes, parcourir avec `cur`, reconnecter, free, puis continuer le parcours.',
    failSafe: 'Si la liste est vide ou le pointeur de tête est invalide, sortir sans toucher la mémoire.',
    advanceRule: 'Ne pas avancer `cur` juste après suppression de `cur->next`.',
    finalizeRule: 'Mettre à jour `*begin_list` pour conserver la nouvelle tête réelle.',
    edgeCase: 'Plusieurs maillons en tête correspondent au critère de suppression.',
    trapFix: 'Faire `tmp = cur->next`, puis unlink, puis free(tmp), dans cet ordre strict.',
    sizeRule: 'Aucune allocation: la fonction modifie la liste en place.',
    ownerRule: 'La fonction free uniquement les maillons supprimés, pas les maillons conservés.',
    pointerRule: 'Utiliser `t_list **begin_list` pour modifier la tête depuis la fonction.',
    limitCase: 'Suppression du dernier maillon sans perdre la chaîne.',
    implicitRule: 'Garder exactement la signature imposée (`t_list **begin_list`, cmp, free_fct).',
    mallocRequired: false,
    guardRule: 'Vérifier `begin_list` et `*begin_list` avant toute déréférence.',
  },
  {
    fn: 'sort_list',
    output: 'une liste triée en place',
    sequence: 'Parcourir la liste, swap les data quand `cmp > 0`, marquer swapped, relancer tant qu’il y a eu échange.',
    failSafe: 'Si la liste est vide ou contient un seul maillon, retourner immédiatement.',
    advanceRule: 'Avancer `cur = cur->next` pendant le passage, puis recommencer au début si swapped.',
    finalizeRule: 'Arrêter quand un passage complet se fait sans swap.',
    edgeCase: 'Liste vide ou liste d\'un seul élément.',
    trapFix: 'Swapper les `data` plutôt que les liens si tu n’as pas une gestion complète des pointeurs.',
    sizeRule: 'Aucune allocation: tri in-place sur la liste existante.',
    ownerRule: 'Aucun free à faire dans le tri: on réordonne sans libérer.',
    pointerRule: 'Utiliser une variable temporaire pour le swap de data.',
    limitCase: 'Tous les éléments égaux, le tri doit rester stable sans boucle infinie.',
    implicitRule: 'Respecter strictement la fonction de comparaison imposée par l’énoncé.',
    mallocRequired: false,
    guardRule: 'Tester `if (!lst || !lst->next)` avant le premier passage.',
  },
  {
    fn: 'itoa',
    output: 'la chaîne représentant l’entier',
    sequence: 'Gérer signe et cas spéciaux, caster en long, compter les caractères, allouer, poser `\\0`, remplir à l’envers.',
    failSafe: 'Retourner NULL si malloc échoue, sans écrire dans un pointeur invalide.',
    advanceRule: 'Décrémenter l’index de fin pendant le remplissage de la chaîne.',
    finalizeRule: 'Placer `str[len] = \\0` avant de remplir les chiffres.',
    edgeCase: 'Les valeurs `0` et `INT_MIN`.',
    trapFix: 'Caster en `long` avant de manipuler la valeur négative.',
    sizeRule: 'Allouer `(digits + sign + 1) * sizeof(char)`.',
    ownerRule: 'L’appelant est responsable du free de la chaîne retournée.',
    pointerRule: 'Remplir depuis la fin pour éviter un second renversement de chaîne.',
    limitCase: 'INT_MIN ne peut pas être négaté en int sans overflow.',
    implicitRule: 'Ne rien afficher: itoa doit uniquement retourner une chaîne.',
    mallocRequired: true,
    guardRule: 'Tester le résultat de malloc avant d’écrire un seul caractère.',
  },
  {
    fn: 'wdmatch',
    output: 'un affichage conditionnel de argv[1]',
    sequence: 'Vérifier argc, parcourir argv[2], avancer index argv[1] sur match, valider quand argv[1] est entièrement consommé.',
    failSafe: 'Si argc est invalide, écrire seulement `\\n` et retourner.',
    advanceRule: 'Avancer l’index de argv[1] uniquement quand un caractère match dans argv[2].',
    finalizeRule: 'Afficher argv[1] seulement si tous ses caractères ont été trouvés dans l’ordre.',
    edgeCase: 'Le cas où argv[1] est vide.',
    trapFix: 'Conserver le sens de parcours: on scanne argv[2], pas l’inverse.',
    sizeRule: 'Aucune allocation dynamique n’est nécessaire pour la logique.',
    ownerRule: 'Aucune mémoire dynamique à libérer dans l’implémentation standard.',
    pointerRule: 'Utiliser deux index indépendants pour garder l’ordre des caractères.',
    limitCase: 'Un caractère manquant doit invalider immédiatement le match.',
    implicitRule: 'Sortie stricte: aucun texte annexe, juste le résultat attendu et `\\n`.',
    mallocRequired: false,
    guardRule: 'Valider argc avant tout accès à argv[1] et argv[2].',
  },
  {
    fn: 'union',
    output: 'une sortie sans doublons provenant de deux chaînes',
    sequence: 'Initialiser seen[256], parcourir la première chaîne puis la seconde, afficher un char inédit, marquer seen.',
    failSafe: 'Si argc est invalide, écrire uniquement `\\n` et sortir.',
    advanceRule: 'Parcourir chaque chaîne caractère par caractère jusqu’à `\\0`.',
    finalizeRule: 'Toujours terminer par un `\\n` unique.',
    edgeCase: 'Les chaînes vides doivent être gérées sans accès hors borne.',
    trapFix: 'Indexer seen avec `(unsigned char)c` pour éviter les index négatifs.',
    sizeRule: 'Aucune allocation dynamique: tableau seen local de 256 cases.',
    ownerRule: 'Aucune mémoire dynamique à libérer dans cette approche.',
    pointerRule: 'Caster le caractère avant indexation dans seen.',
    limitCase: 'Caractères hors ASCII standard avec char signé.',
    implicitRule: 'Respecter la sortie exacte attendue, sans espace ni message supplémentaire.',
    mallocRequired: false,
    guardRule: 'Tester argc avant d’accéder aux arguments utilisateur.',
  },
  {
    fn: 'atoi',
    output: 'la valeur entière convertie',
    sequence: 'Ignorer espaces, lire le signe, accumuler les chiffres, arrêter au premier non-chiffre.',
    failSafe: 'Si l’entrée est invalide selon le sujet, retourner la valeur de repli prévue (souvent 0).',
    advanceRule: 'Incrémenter l’index à chaque étape consommée.',
    finalizeRule: 'Arrêter la conversion dès qu’un caractère non numérique apparaît.',
    edgeCase: 'Chaîne vide, signe seul, ou `-0`.',
    trapFix: 'Vérifier l’incrément dans toutes les branches de boucle pour éviter la boucle infinie.',
    sizeRule: 'Aucune allocation dynamique n’est requise.',
    ownerRule: 'Aucune mémoire dynamique à libérer pour atoi.',
    pointerRule: 'Travailler avec un index de lecture stable pour ne pas perdre la position.',
    limitCase: 'Entrée avec espaces puis signe, ex: "   -42".',
    implicitRule: 'La fonction retourne une valeur; elle ne doit pas produire de sortie texte.',
    mallocRequired: false,
    guardRule: 'Vérifier le pointeur d’entrée si le sujet le demande explicitement.',
  },
];

const listProfiles = profiles.filter((p) => p.fn === 'ft_list_remove_if' || p.fn === 'sort_list');
const functionNames = profiles.map((p) => p.fn);

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function sentenceCount(value) {
  return String(value || '')
    .split(/[.!?]+/)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function hasActionContext(question, choices) {
  const haystack = `${question} ${choices.join(' ')}`.toLowerCase();
  const actionWords = [
    'action',
    'decision',
    'décision',
    'malloc',
    'free',
    'unlink',
    'retour',
    'return',
    'avancer',
    'pointeur',
    'supprimer',
    'tester',
    'null',
    'swap',
    'boucle',
    'argc',
    'prototype',
    'segfault',
    'off-by-one',
    'cas limite',
    'cas',
    'erreur',
    'sortie',
    'allouer',
    'taille',
    'parcours',
    'suppression',
  ];
  return actionWords.some((word) => haystack.includes(word));
}

function explanation(theme, fn, decision) {
  const byTheme = {
    patterns: `En ${fn}, l’ordre des étapes est évalué directement par les tests de l’exam. ${decision}`,
    pieges: `Ce choix évite un piège classique qui compile mais échoue en correction automatique sur ${fn}. ${decision}`,
    reflexes_memoire: `À l’exam, ce réflexe mémoire sécurise ${fn} sans ajouter de complexité inutile. ${decision}`,
    pointeurs: `Ici, la décision de pointeur conditionne la stabilité de ${fn} sur les cas réels. ${decision}`,
    malloc: `Sur ${fn}, cette décision d’allocation évite les crashs et les fuites pendant les tests limites. ${decision}`,
    listes_chainees: `En listes chaînées, l’ordre pointeur/reconnexion/free fait la différence dans ${fn}. ${decision}`,
    conditions_limites: `La correction de ${fn} cible d’abord ce cas limite. ${decision}`,
    regles_implicites: `Même avec une bonne logique dans ${fn}, la non-conformité au sujet fait tomber la note. ${decision}`,
  };
  return byTheme[theme];
}

function makeQuestion(theme, profile, templateIndex) {
  const { fn } = profile;

  if (theme === 'patterns') {
    if (templateIndex === 0) {
      return {
        question: `${fn} : tu dois produire ${profile.output}. Quelle séquence est la plus robuste sous pression d’exam ?`,
        choices: [
          'Allouer une taille fixe, coder vite, puis corriger après les tests.',
          profile.sequence,
          'Remplir la sortie avant de valider la taille nécessaire.',
          'Faire un free préventif avant toute vérification.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Tu limites les oublis de garde, de taille et de terminaison.'),
        tags: [theme, fn, 'sequence'],
      };
    }

    if (templateIndex === 1) {
      return {
        question: `${fn} : une étape intermédiaire échoue pendant l’implémentation. Quelle décision garde un état cohérent ?`,
        choices: [
          'Continuer la fonction avec les pointeurs déjà modifiés.',
          'Retourner une adresse locale pour garder une trace temporaire.',
          profile.failSafe,
          'Relancer la même fonction récursivement sans condition d’arrêt.',
        ],
        correct: 2,
        explanation: explanation(theme, fn, 'La stratégie d’échec doit être explicite et déterministe.'),
        tags: [theme, fn, 'fail_path'],
      };
    }

    if (templateIndex === 2) {
      return {
        question: `${fn} : dans la boucle principale, quelle règle d’avancement évite les sauts de données et les boucles infinies ?`,
        choices: [
          'N’avancer l’index qu’une fois sur deux pour ralentir le parcours.',
          'Incrémenter un pointeur global sans lien avec la condition de boucle.',
          profile.advanceRule,
          'Réinitialiser le parcours à chaque itération.',
        ],
        correct: 2,
        explanation: explanation(theme, fn, 'Le parcours devient prévisible et reproductible sur les tests cachés.'),
        tags: [theme, fn, 'loop'],
      };
    }

    if (templateIndex === 3) {
      return {
        question: `${fn} : quelle action termine correctement la sortie avant le return ?`,
        choices: [
          'Retourner immédiatement sans marquer la fin de structure.',
          profile.finalizeRule,
          'Ajouter un free global en fin de fonction même sur succès.',
          'Déléguer la terminaison à l’appelant sans contrat explicite.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'La terminaison correcte conditionne directement la validité de la sortie.'),
        tags: [theme, fn, 'finalize'],
      };
    }

    return {
      question: `${fn} : quel cas doit être traité avant le flux nominal pour éviter un comportement faux dès l’exam ?`,
      choices: [
        'Ignorer les cas spéciaux et corriger après les premiers crashes.',
        profile.edgeCase,
        'Désactiver les tests limites pendant le développement.',
        'Forcer une valeur arbitraire pour passer les cas simples.',
      ],
      correct: 1,
      explanation: explanation(theme, fn, 'Le traitement anticipé du cas critique évite un échec systématique.'),
      tags: [theme, fn, 'edge_case'],
    };
  }

  if (theme === 'pieges') {
    if (templateIndex === 0) {
      return {
        question: `${fn} : le code compile, mais un test caché plante. Quel correctif cible le piège le plus probable ?`,
        choices: [
          'Ajouter des printf partout pour contourner le test.',
          profile.trapFix,
          'Supprimer les vérifications pour accélérer l’exécution.',
          'Changer le prototype pour simplifier le code.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Ce bug est fréquent à 42 car il n’apparaît pas sur les cas nominaux.'),
        tags: [theme, fn, 'trap'],
      };
    }

    if (templateIndex === 1) {
      return {
        question: `${fn} : tu observes une sortie incohérente sur les cas limites. Quelle correction est prioritaire ?`,
        choices: [
          'Mettre un buffer fixe plus grand pour masquer le problème.',
          'Supprimer le test de retour d’erreur pour éviter les branches.',
          profile.finalizeRule,
          'Remplacer toute la logique par une valeur constante.',
        ],
        correct: 2,
        explanation: explanation(theme, fn, 'La sortie doit être terminée et structurée exactement comme attendu.'),
        tags: [theme, fn, 'output_bug'],
      };
    }

    if (templateIndex === 2) {
      return {
        question: `${fn} : après une suppression ou une écriture mémoire, quel ordre d’opérations évite la corruption ?`,
        choices: [
          'Free en premier, puis tenter de reconnecter ensuite.',
          'Écrire la suite sans conserver de pointeur temporaire.',
          profile.pointerRule,
          'Revenir au début de la fonction à chaque modification.',
        ],
        correct: 2,
        explanation: explanation(theme, fn, 'L’ordre des opérations est un piège récurrent en EX3/EX4.'),
        tags: [theme, fn, 'order'],
      };
    }

    if (templateIndex === 3) {
      return {
        question: `${fn} : le test d’exam te renvoie “Wrong output”. Quelle décision est la plus sûre en priorité ?`,
        choices: [
          'Ajouter une phrase de debug pour expliquer ton intention.',
          'Conserver strictement la sortie contractuelle, sans texte en plus.',
          'Écrire sur stderr pour séparer les infos utiles.',
          'Garder un espace final pour la lisibilité.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Les correcteurs automatiques comparent la sortie au caractère près.'),
        tags: [theme, fn, 'output_contract'],
      };
    }

    return {
      question: `${fn} : tu hésites entre optimisation rapide et garde défensive. Quel choix évite le plus de faux positifs en correction ?`,
      choices: [
        profile.guardRule,
        'Supprimer les conditions pour simplifier la lecture du code.',
        'Remplacer les cas limites par des valeurs codées en dur.',
        'Laisser le comportement indéfini et compter sur les tests visibles.',
      ],
      correct: 0,
      explanation: explanation(theme, fn, 'La garde défensive évite des crashs qui apparaissent seulement côté moulinette.'),
      tags: [theme, fn, 'defensive'],
    };
  }

  if (theme === 'reflexes_memoire') {
    if (templateIndex === 0) {
      return {
        question: `${fn} : ta fonction renvoie ${profile.output}. Qui doit libérer la mémoire dans le flux standard ?`,
        choices: [
          profile.ownerRule,
          'Le compilateur libère automatiquement avant le retour.',
          'Le système libère immédiatement après chaque instruction.',
          'La fonction doit free avant de retourner le pointeur.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Le contrat d’ownership doit être clair pour éviter fuite ou double free.'),
        tags: [theme, fn, 'ownership'],
      };
    }

    if (templateIndex === 1) {
      return {
        question: `${fn} : juste après allocation ou préparation critique, quel réflexe mémoire doit être systématique ?`,
        choices: [
          'Écrire dans le buffer puis vérifier le pointeur ensuite.',
          profile.guardRule,
          'Caster vers un type plus petit pour gagner du temps.',
          'Désactiver les vérifications en mode exam.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Ce réflexe empêche d’écrire dans une adresse invalide.'),
        tags: [theme, fn, 'guard'],
      };
    }

    if (templateIndex === 2) {
      return {
        question: `${fn} : une allocation intermédiaire échoue après plusieurs succès. Quelle sortie mémoire est correcte ?`,
        choices: [
          profile.failSafe,
          'Retourner le premier pointeur alloué sans cleanup.',
          'Continuer avec un tableau partiellement initialisé.',
          'Free uniquement la dernière allocation ratée.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Le cleanup complet évite les fuites invisibles pendant un run court.'),
        tags: [theme, fn, 'cleanup'],
      };
    }

    if (templateIndex === 3) {
      return {
        question: `${fn} : tu dois dimensionner une allocation. Quelle formule est la plus fiable ?`,
        choices: [
          profile.sizeRule,
          'Allouer 1000 octets pour être tranquille.',
          'Allouer la taille du pointeur uniquement.',
          'Allouer puis corriger la taille après écriture.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'La taille exacte est évaluée directement sur les cas limites.'),
        tags: [theme, fn, 'size'],
      };
    }

    return {
      question: `${fn} : après ` + 'free(ptr)' + ` dans une branche de correction, quelle décision évite la réutilisation accidentelle ?`,
      choices: [
        'Réutiliser `ptr` immédiatement pour gagner du temps.',
        'Laisser `ptr` inchangé et compter sur le contexte.',
        'Neutraliser le pointeur local avant de poursuivre le flux.',
        'Incrémenter `ptr` pour sortir de la zone libérée.',
      ],
      correct: 2,
      explanation: explanation(theme, fn, 'Neutraliser le pointeur réduit les erreurs de double accès en debug rapide.'),
      tags: [theme, fn, 'dangling'],
    };
  }

  if (theme === 'pointeurs') {
    if (templateIndex === 0) {
      return {
        question: `${fn} : tu dois modifier une structure partagée (tête, buffer ou index global). Quelle forme de pointeur est correcte ?`,
        choices: [
          profile.pointerRule,
          'Passer une copie locale et espérer qu’elle modifie l’original.',
          'Caster arbitrairement vers `void **` pour forcer la compilation.',
          'Utiliser un pointeur non initialisé puis corriger après.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Le bon niveau d’indirection est déterminant pour modifier la bonne zone mémoire.'),
        tags: [theme, fn, 'indirection'],
      };
    }

    if (templateIndex === 1) {
      return {
        question: `${fn} : avant de supprimer ou remplacer une cible mémoire, quel réflexe pointeur évite de perdre l’adresse utile ?`,
        choices: [
          'Écraser directement la cible puis chercher l’ancienne adresse.',
          'Stocker l’adresse dans un temporaire avant la modification.',
          'Faire `free` d’abord et lire `next` ensuite.',
          'Remonter au début de la fonction pour récupérer un pointeur propre.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Le temporaire protège le chaînage et permet un free sûr.'),
        tags: [theme, fn, 'tmp'],
      };
    }

    if (templateIndex === 2) {
      return {
        question: `${fn} : quelle décision doit précéder toute déréférence (` + '`*ptr`/`->`' + `) dans un chemin sensible ?`,
        choices: [
          'Supposer que le pointeur est valide parce que ça compile.',
          'Tester la validité du pointeur dans le contexte courant.',
          'Forcer la déréférence pour repérer rapidement le crash.',
          'Remplacer le pointeur par une constante arbitraire.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Ce contrôle évite un comportement indéfini sur les cas d’entrée vides.'),
        tags: [theme, fn, 'deref_guard'],
      };
    }

    if (templateIndex === 3) {
      return {
        question: `${fn} : pendant une boucle de transformation, quelle règle d’avancement de pointeur est correcte ?`,
        choices: [
          profile.advanceRule,
          'Avancer deux fois à chaque itération pour finir plus vite.',
          'Ne jamais avancer et dépendre d’un break manuel.',
          'Réinitialiser le pointeur à chaque tour.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'La progression doit rester alignée avec la condition de boucle.'),
        tags: [theme, fn, 'advance'],
      };
    }

    return {
      question: `${fn} : tu modifies une zone pointée puis tu dois retourner un résultat. Quel pointeur faut-il renvoyer ?`,
      choices: [
          profile.finalizeRule,
          'Le pointeur temporaire le plus avancé dans la boucle.',
          'L’adresse d’une variable locale de la fonction.',
          'NULL même en succès pour forcer le contrôle côté appelant.',
        ],
      correct: 0,
      explanation: explanation(theme, fn, 'Le return doit pointer vers une zone encore valide après la fin de la fonction.'),
      tags: [theme, fn, 'return_pointer'],
    };
  }

  if (theme === 'malloc') {
    if (templateIndex === 0) {
      return {
        question: `${fn} : dois-tu utiliser malloc dans cette implémentation, et pour quoi exactement ?`,
        choices: [
          profile.mallocRequired
            ? `Oui, pour produire ${profile.output} avec une taille calculée.`
            : 'Non, la solution standard n’a pas besoin d’allocation dynamique.',
          profile.mallocRequired
            ? 'Non, un pointeur local suffit toujours.'
            : 'Oui, il faut allouer un buffer fixe de 1024 octets.',
          'Oui, mais sans calcul de taille, juste pour éviter les warnings.',
          'Oui, puis free immédiatement avant de retourner.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Le besoin réel d’allocation dépend du contrat de sortie de la fonction.'),
        tags: [theme, fn, 'malloc_need'],
      };
    }

    if (templateIndex === 1) {
      return {
        question: `${fn} : quand malloc est nécessaire, quelle stratégie de taille est correcte ?`,
        choices: [
          profile.sizeRule,
          'Allouer la taille du pointeur retourné et multiplier au hasard.',
          'Allouer un buffer constant pour tous les cas.',
          'Allouer la moitié puis agrandir sans vérifier les bornes.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'La taille exacte est indispensable pour passer les cas cachés de la moulinette.'),
        tags: [theme, fn, 'malloc_size'],
      };
    }

    if (templateIndex === 2) {
      return {
        question: `${fn} : un malloc retourne NULL en plein run. Quelle décision garde le comportement maîtrisé ?`,
        choices: [
          profile.failSafe,
          'Écrire quand même dans le pointeur puis corriger après.',
          'Boucler sur malloc sans condition de sortie.',
          'Retourner un pointeur local pour masquer l’erreur.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Le chemin d’erreur doit être propre et immédiat.'),
        tags: [theme, fn, 'malloc_fail'],
      };
    }

    if (templateIndex === 3) {
      return {
        question: `${fn} : pour éviter un malloc trop petit ou inutile, quelle règle est la plus fiable ?`,
        choices: [
          'Allouer une taille fixe supposée suffisante.',
          'Déduire la taille des données réelles avant d’allouer.',
          'Allouer puis ignorer les erreurs de dépassement.',
          'Éviter tout test de borne pour accélérer.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Le dimensionnement piloté par les données est le réflexe attendu à l’exam.'),
        tags: [theme, fn, 'sizing_reflex'],
      };
    }

    return {
      question: `${fn} : ta fonction retourne une zone allouée. Quelle règle de free est correcte côté appelant ?`,
      choices: [
        profile.ownerRule,
        'Ne jamais free, le programme termine vite à l’exam.',
        'Free dans la fonction puis retourner le pointeur libéré.',
        'Free seulement un octet sur deux pour limiter le coût.',
      ],
      correct: 0,
      explanation: explanation(theme, fn, 'La responsabilité de libération doit être explicite dans la convention d’usage.'),
      tags: [theme, fn, 'free_contract'],
    };
  }

  if (theme === 'conditions_limites') {
    if (templateIndex === 0) {
      return {
        question: `${fn} : quel cas limite dois-tu valider avant les tests nominaux ?`,
        choices: [
          profile.edgeCase,
          'Uniquement le cas moyen, les extrêmes sont hors sujet.',
          'Le cas le plus rapide à coder, sans lien avec le sujet.',
          'Aucun, car la moulinette ne teste pas les bords.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Le cas limite est souvent la première entrée des tests cachés.'),
        tags: [theme, fn, 'edge_priority'],
      };
    }

    if (templateIndex === 1) {
      return {
        question: `${fn} : sur un run de correction, quel scénario de bord est le plus critique ici ?`,
        choices: [
          profile.limitCase,
          'Un cas purement théorique sans exécution réelle.',
          'Un cas où on désactive volontairement les bornes.',
          'Un cas sans rapport avec la fonction traitée.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Valider ce scénario réduit fortement les échecs tardifs en exam.'),
        tags: [theme, fn, 'limit_case'],
      };
    }

    if (templateIndex === 2) {
      return {
        question: `${fn} : quel garde-fou doit être exécuté avant de toucher aux données d’entrée ?`,
        choices: [
          profile.guardRule,
          'Forcer la lecture pour voir si ça crash.',
          'Remplacer les entrées invalides par une constante.',
          'Ignorer les pointeurs et avancer quand même.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'La garde d’entrée empêche les déréférencements hors contrat.'),
        tags: [theme, fn, 'input_guard'],
      };
    }

    if (templateIndex === 3) {
      return {
        question: `${fn} : sur un cas vide ou minimal, quel comportement est attendu par le sujet ?`,
        choices: [
          profile.failSafe,
          'Planter rapidement pour exposer l’erreur.',
          'Retourner une adresse locale temporaire.',
          'Écrire du texte explicatif non demandé.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'Le comportement minimal doit rester sûr et contractuel.'),
        tags: [theme, fn, 'minimal_case'],
      };
    }

    return {
      question: `${fn} : quelle décision évite un off-by-one sur les entrées extrêmes ?`,
      choices: [
        profile.trapFix,
        'Limiter la boucle à une borne arbitraire.',
        'Retirer les vérifications de fin pour accélérer.',
        'Décaler systématiquement l’index de +2.',
      ],
      correct: 0,
      explanation: explanation(theme, fn, 'Le off-by-one est un motif d’échec fréquent en EX2-EX4.'),
      tags: [theme, fn, 'off_by_one'],
    };
  }

  if (theme === 'regles_implicites') {
    if (templateIndex === 0) {
      return {
        question: `${fn} : le sujet autorise seulement un petit set de fonctions. Quelle décision est correcte avant rendu ?`,
        choices: [
          'Conserver une fonction non autorisée si elle simplifie le code.',
          'Supprimer toute fonction hors liste autorisée, même si ça marche localement.',
          'Ajouter des wrappers pour masquer les appels interdits.',
          'Laisser des prints de debug si la logique est juste.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'La conformité des fonctions autorisées est vérifiée de façon stricte.'),
        tags: [theme, fn, 'allowed_functions'],
      };
    }

    if (templateIndex === 1) {
      return {
        question: `${fn} : le prototype demandé par l’énoncé est précis. Quelle action évite un rejet immédiat ?`,
        choices: [
          'Changer le type de retour pour faciliter ton implémentation.',
          'Conserver exactement le prototype et les noms attendus.',
          'Ajouter un argument optionnel non documenté.',
          'Dupliquer la fonction sous un autre nom.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Un prototype non conforme casse souvent la compilation ou le linkage.'),
        tags: [theme, fn, 'prototype'],
      };
    }

    if (templateIndex === 2) {
      return {
        question: `${fn} : dans un main de test exam, argc est invalide. Quel comportement de sortie reste conforme ?`,
        choices: [
          profile.implicitRule,
          'Afficher un message d’aide détaillé sur plusieurs lignes.',
          'Écrire sur stderr pour informer le correcteur.',
          'Continuer l’exécution avec des argv non valides.',
        ],
        correct: 0,
        explanation: explanation(theme, fn, 'La sortie attendue est contractuelle, même sur erreur d’usage.'),
        tags: [theme, fn, 'argc_contract'],
      };
    }

    if (templateIndex === 3) {
      return {
        question: `${fn} : le sujet compare la sortie au caractère près. Quelle décision est obligatoire ?`,
        choices: [
          'Ajouter des espaces pour une sortie plus lisible.',
          'Respecter strictement le format, y compris le retour ligne final.',
          'Écrire des logs pendant le run pour expliquer le résultat.',
          'Remplacer stdout par stderr pour séparer les messages.',
        ],
        correct: 1,
        explanation: explanation(theme, fn, 'Le moindre caractère en plus ou en moins provoque un échec de test.'),
        tags: [theme, fn, 'exact_output'],
      };
    }

    return {
      question: `${fn} : avant de rendre, quelle vérification finale est la plus rentable à 42 ?`,
      choices: [
        'Relire uniquement l’algorithme sans regarder le sujet.',
        'Relire le sujet ligne par ligne et vérifier chaque contrainte technique.',
        'Optimiser le code sans retester les cas limites.',
        'Supprimer les gardes pour réduire la taille du fichier.',
      ],
      correct: 1,
      explanation: explanation(theme, fn, 'La conformité sujet + cas limites fait gagner plus de points que l’optimisation.'),
      tags: [theme, fn, 'final_check'],
    };
  }

  throw new Error(`Theme non supporte: ${theme}`);
}

function makeListQuestion(profile, contextIndex, templateIndex) {
  const fn = profile.fn;
  const contexts = [
    'suppression en tête',
    'suppression au milieu de la chaîne',
    'suppression de maillons consécutifs',
    'fin de parcours proche du dernier maillon',
  ];
  const ctx = contexts[contextIndex];

  if (templateIndex === 0) {
    return {
      question: `${fn} : en ${ctx}, quel ordre d’opérations est correct ?`,
      choices: [
        'Free le maillon cible, puis reconnecter ensuite.',
        'Reconnecter les liens, puis free le maillon supprimé.',
        'Avancer `cur` deux fois puis décider de supprimer.',
        'Réinitialiser la tête à NULL avant de comparer.',
      ],
      correct: 1,
      explanation: explanation('listes_chainees', fn, 'Le chaînage doit rester valide avant toute libération.'),
      tags: ['listes_chainees', fn, 'unlink_free'],
    };
  }

  if (templateIndex === 1) {
    return {
      question: `${fn} : en ${ctx}, quel pointeur temporaire faut-il conserver avant modification ?`,
      choices: [
        'Aucun temporaire, on peut relire l’adresse après free.',
        'Un pointeur vers le maillon ciblé (`tmp`) avant unlink.',
        'Un pointeur vers une variable locale de pile.',
        'Un pointeur global statique partagé entre appels.',
      ],
      correct: 1,
      explanation: explanation('listes_chainees', fn, 'Sans temporaire, la suppression perd rapidement la suite de la liste.'),
      tags: ['listes_chainees', fn, 'tmp_pointer'],
    };
  }

  if (templateIndex === 2) {
    return {
      question: `${fn} : en ${ctx}, quelle règle d’avancement de ` + '`cur`' + ` évite de sauter des maillons ?`,
      choices: [
        'Toujours avancer `cur` même après une suppression.',
        'N’avancer `cur` que quand aucun maillon n’a été retiré à ce tour.',
        'Remettre `cur` sur la tête à chaque suppression.',
        'Incrémenter `cur++` comme dans un tableau.',
      ],
      correct: 1,
      explanation: explanation('listes_chainees', fn, 'Ce réflexe évite les suppressions incomplètes sur des séries de matches.'),
      tags: ['listes_chainees', fn, 'advance_rule'],
    };
  }

  if (templateIndex === 3) {
    return {
      question: `${fn} : en ${ctx}, quel test de garde doit être fait avant d’accéder à ` + '`->next`' + ` ?`,
      choices: [
        'Aucun test, le compilateur protège ce cas.',
        'Vérifier que le pointeur courant et son suivant existent.',
        'Tester uniquement la valeur de comparaison cmp.',
        'Tester uniquement `errno`.',
      ],
      correct: 1,
      explanation: explanation('listes_chainees', fn, 'Cette garde évite les déréférencements invalides sur fin de liste.'),
      tags: ['listes_chainees', fn, 'guard_next'],
    };
  }

  return {
    question: `${fn} : en ${ctx}, quelle décision rend le comportement stable sur liste vide et liste à un élément ?`,
    choices: [
      'Entrer directement dans la boucle sans garde.',
      'Traiter ces cas en garde initiale puis retourner proprement.',
      'Forcer un maillon fictif pour simplifier la logique.',
      'Supprimer systématiquement le premier maillon.',
    ],
    correct: 1,
    explanation: explanation('listes_chainees', fn, 'Le cas minimal est systématiquement testé en EX3/EX4.'),
    tags: ['listes_chainees', fn, 'minimal_list'],
  };
}

function validateQuestion(item) {
  if (typeof item.question !== 'string' || !item.question.includes(':') || !item.question.includes('?')) {
    return false;
  }
  if (!functionNames.some((fn) => item.question.includes(fn))) {
    return false;
  }
  if (!Array.isArray(item.choices) || item.choices.length !== 4) {
    return false;
  }
  if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) {
    return false;
  }
  if (typeof item.explanation !== 'string' || item.explanation.length < 70) {
    return false;
  }
  if (sentenceCount(item.explanation) > 3) {
    return false;
  }
  if (item.question.includes('Dans les règles implicites')) {
    return false;
  }
  if (!/quel|quelle|quand|comment|qui|dois-tu|decision|décision/i.test(item.question)) {
    return false;
  }
  if (!hasActionContext(item.question, item.choices)) {
    return false;
  }

  const normalizedChoices = new Set();
  for (const choice of item.choices) {
    if (typeof choice !== 'string' || choice.trim().length < 25) {
      return false;
    }
    if (/\b[ABCD]\s*et\s*[ABCD]\b/i.test(choice) || /\b[ABCD]\s*ou\s*[ABCD]\b/i.test(choice)) {
      return false;
    }
    const key = normalizeText(choice);
    if (normalizedChoices.has(key)) {
      return false;
    }
    normalizedChoices.add(key);
  }

  return true;
}

function buildDataset() {
  const dataset = [];
  const standardThemes = [
    'patterns',
    'pieges',
    'reflexes_memoire',
    'pointeurs',
    'malloc',
    'conditions_limites',
    'regles_implicites',
  ];

  for (const theme of standardThemes) {
    for (const profile of profiles) {
      for (let templateIndex = 0; templateIndex < 5; templateIndex += 1) {
        const q = makeQuestion(theme, profile, templateIndex);
        dataset.push({
          theme,
          question: q.question,
          choices: q.choices,
          correct: q.correct,
          explanation: q.explanation,
          tags: q.tags,
        });
      }
    }
  }

  for (const profile of listProfiles) {
    for (let contextIndex = 0; contextIndex < 4; contextIndex += 1) {
      for (let templateIndex = 0; templateIndex < 5; templateIndex += 1) {
        const q = makeListQuestion(profile, contextIndex, templateIndex);
        dataset.push({
          theme: 'listes_chainees',
          question: q.question,
          choices: q.choices,
          correct: q.correct,
          explanation: q.explanation,
          tags: q.tags,
        });
      }
    }
  }

  const unique = new Set();
  const uniqueNormalized = new Set();
  const filtered = dataset.filter((item) => {
    const exactKey = `${item.theme}|${item.question}`;
    const normalizedKey = `${item.theme}|${normalizeText(item.question)}`;
    if (unique.has(exactKey) || uniqueNormalized.has(normalizedKey)) {
      return false;
    }
    unique.add(exactKey);
    uniqueNormalized.add(normalizedKey);
    return true;
  });

  if (filtered.length !== 320) {
    throw new Error(`Dataset inattendu: ${filtered.length} questions (attendu: 320)`);
  }

  for (const item of filtered) {
    if (!validateQuestion(item)) {
      throw new Error(`Question invalide: ${item.question}`);
    }
  }

  return filtered.map((item, index) => ({
    id: `q${String(index + 1).padStart(4, '0')}`,
    ...item,
  }));
}

function writeDataset(dataset) {
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(dataset, null, 2) + '\n', 'utf8');
}

const dataset = buildDataset();
writeDataset(dataset);

const byTheme = dataset.reduce((acc, item) => {
  acc[item.theme] = (acc[item.theme] || 0) + 1;
  return acc;
}, {});

console.log(`quiz dataset generated: ${dataset.length} questions`);
console.log(byTheme);
