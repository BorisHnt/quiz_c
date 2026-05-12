import { initCommon } from "./main.js";

const CODE_PAGE_STORAGE_KEY = "c_revision_codes_page_v1";
const CODE_VERSION_COMPLETE = "complete";
const CODE_VERSION_OPTI = "opti";

const EXERCISES = [
  {
    id: "union",
    title: "union",
    exam: "EX2",
    target: "main",
    fileName: "union.c",
    summary: "Affiche les caractères uniques de argv[1] puis argv[2], dans l’ordre d’apparition.",
    helpers: ["init_seen", "print_unique_from"],
    code: `#include <unistd.h>

static void init_seen(unsigned char seen[256])
{
    int i;

    i = 0;
    while (i < 256)
    {
        seen[i] = 0;
        i++;
    }
}

static void print_unique_from(char *str, unsigned char seen[256])
{
    int i;
    unsigned char c;

    i = 0;
    while (str[i])
    {
        c = (unsigned char)str[i];
        if (seen[c] == 0)
        {
            seen[c] = 1;
            write(1, &str[i], 1);
        }
        i++;
    }
}

int main(int argc, char **argv)
{
    unsigned char seen[256];

    if (argc != 3)
    {
        write(1, "\\n", 1);
        return (0);
    }
    init_seen(seen);
    print_unique_from(argv[1], seen);
    print_unique_from(argv[2], seen);
    write(1, "\\n", 1);
    return (0);
}`,
  },
  {
    id: "atoi",
    title: "atoi",
    exam: "EX2",
    target: "ft_atoi",
    fileName: "ft_atoi.c",
    summary: "Convertit une chaîne en entier en gérant espaces, signe et suite de chiffres.",
    helpers: ["is_space"],
    code: `static int is_space(char c)
{
    if (c == ' ')
        return (1);
    if (c >= 9 && c <= 13)
        return (1);
    return (0);
}

int ft_atoi(const char *str)
{
    int i;
    int sign;
    int result;

    i = 0;
    while (is_space(str[i]))
        i++;
    sign = 1;
    if (str[i] == '-' || str[i] == '+')
    {
        if (str[i] == '-')
            sign = -1;
        i++;
    }
    result = 0;
    while (str[i] >= '0' && str[i] <= '9')
    {
        result = result * 10;
        result = result + (str[i] - '0');
        i++;
    }
    return (result * sign);
}`,
  },
  {
    id: "strdup",
    title: "strdup",
    exam: "EX2",
    target: "ft_strdup",
    fileName: "ft_strdup.c",
    summary: "Duplique une chaîne en allouant exactement la place nécessaire.",
    helpers: ["ft_strlen"],
    code: `#include <stdlib.h>

static int ft_strlen(char *str)
{
    int i;

    i = 0;
    while (str[i])
        i++;
    return (i);
}

char *ft_strdup(char *src)
{
    int len;
    int i;
    char *dup;

    len = ft_strlen(src);
    dup = (char *)malloc(sizeof(char) * (len + 1));
    if (dup == NULL)
        return (NULL);
    i = 0;
    while (src[i])
    {
        dup[i] = src[i];
        i++;
    }
    dup[i] = '\\0';
    return (dup);
}`,
  },
  {
    id: "strrev",
    title: "strrev",
    exam: "EX2",
    target: "ft_strrev",
    fileName: "ft_strrev.c",
    summary: "Inverse une chaîne en place avec deux index et un swap temporaire.",
    helpers: ["ft_strlen"],
    code: `static int ft_strlen(char *str)
{
    int i;

    i = 0;
    while (str[i])
        i++;
    return (i);
}

char *ft_strrev(char *str)
{
    int i;
    int j;
    char tmp;

    i = 0;
    j = ft_strlen(str) - 1;
    while (i < j)
    {
        tmp = str[i];
        str[i] = str[j];
        str[j] = tmp;
        i++;
        j--;
    }
    return (str);
}`,
  },
  {
    id: "inter",
    title: "inter",
    exam: "EX2",
    target: "main",
    fileName: "inter.c",
    summary: "Affiche les caractères communs à argv[1] et argv[2] sans doublons.",
    helpers: ["init_tables", "mark_seen", "print_intersection"],
    code: `#include <unistd.h>

static void init_tables(unsigned char seen[256], unsigned char printed[256])
{
    int i;

    i = 0;
    while (i < 256)
    {
        seen[i] = 0;
        printed[i] = 0;
        i++;
    }
}

static void mark_seen(char *str, unsigned char seen[256])
{
    int i;

    i = 0;
    while (str[i])
    {
        seen[(unsigned char)str[i]] = 1;
        i++;
    }
}

static void print_intersection(char *str, unsigned char seen[256], unsigned char printed[256])
{
    int i;
    unsigned char c;

    i = 0;
    while (str[i])
    {
        c = (unsigned char)str[i];
        if (seen[c] == 1 && printed[c] == 0)
        {
            printed[c] = 1;
            write(1, &str[i], 1);
        }
        i++;
    }
}

int main(int argc, char **argv)
{
    unsigned char seen[256];
    unsigned char printed[256];

    if (argc != 3)
    {
        write(1, "\\n", 1);
        return (0);
    }
    init_tables(seen, printed);
    mark_seen(argv[2], seen);
    print_intersection(argv[1], seen, printed);
    write(1, "\\n", 1);
    return (0);
}`,
  },
  {
    id: "last_word",
    title: "last_word",
    exam: "EX2",
    target: "main",
    fileName: "last_word.c",
    summary: "Affiche uniquement le dernier mot de l’argument en gérant les espaces.",
    helpers: ["is_space"],
    code: `#include <unistd.h>

static int is_space(char c)
{
    if (c == ' ')
    {
        return (1);
    }
    if (c == '\\t')
    {
        return (1);
    }
    return (0);
}

int main(int argc, char **argv)
{
    int i;
    int start;

    if (argc != 2)
    {
        write(1, "\\n", 1);
        return (0);
    }
    i = 0;
    while (argv[1][i])
        i++;
    while (i > 0 && is_space(argv[1][i - 1]))
        i--;
    start = i;
    while (start > 0 && is_space(argv[1][start - 1]) == 0)
        start--;
    while (start < i)
    {
        write(1, &argv[1][start], 1);
        start++;
    }
    write(1, "\\n", 1);
    return (0);
}`,
  },
  {
    id: "wdmatch",
    title: "wdmatch",
    exam: "EX2",
    target: "main",
    fileName: "wdmatch.c",
    summary: "Vérifie que argv[1] apparaît dans argv[2] dans le même ordre de caractères.",
    helpers: ["ft_strlen"],
    code: `#include <unistd.h>

static int ft_strlen(char *str)
{
    int i;

    i = 0;
    while (str[i])
        i++;
    return (i);
}

int main(int argc, char **argv)
{
    int i;
    int j;

    if (argc != 3)
    {
        write(1, "\\n", 1);
        return (0);
    }
    i = 0;
    j = 0;
    while (argv[2][j])
    {
        if (argv[1][i] == argv[2][j])
            i++;
        j++;
    }
    if (argv[1][i] == '\\0')
        write(1, argv[1], ft_strlen(argv[1]));
    write(1, "\\n", 1);
    return (0);
}`,
  },
  {
    id: "lstsize",
    title: "lstsize",
    exam: "EX3",
    target: "ft_list_size",
    fileName: "ft_list_size.c",
    summary: "Compte le nombre de maillons d’une liste chaînée.",
    helpers: [],
    code: `typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

int ft_list_size(t_list *begin_list)
{
    int count;
    t_list *cur;

    count = 0;
    cur = begin_list;
    while (cur)
    {
        count++;
        cur = cur->next;
    }
    return (count);
}`,
  },
  {
    id: "range",
    title: "range",
    exam: "EX3",
    target: "ft_range",
    fileName: "ft_range.c",
    summary: "Alloue et remplit un tableau inclusif entre start et end.",
    helpers: ["ft_abs"],
    code: `#include <stdlib.h>

static int ft_abs(int n)
{
    if (n < 0)
        return (-n);
    return (n);
}

int *ft_range(int start, int end)
{
    int *tab;
    int size;
    int step;
    int i;
    int value;

    size = ft_abs(end - start) + 1;
    tab = (int *)malloc(sizeof(int) * size);
    if (tab == NULL)
        return (NULL);
    step = 1;
    if (start > end)
        step = -1;
    i = 0;
    value = start;
    while (i < size)
    {
        tab[i] = value;
        value = value + step;
        i++;
    }
    return (tab);
}`,
  },
  {
    id: "list_remove_if",
    title: "list_remove_if",
    exam: "EX4",
    target: "ft_list_remove_if",
    fileName: "ft_list_remove_if.c",
    summary: "Supprime les maillons dont data est égal à data_ref selon cmp, y compris en tête de liste.",
    helpers: [],
    code: `#include <stdlib.h>

typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

void ft_list_remove_if(t_list **begin_list, void *data_ref, int (*cmp)(void *, void *))
{
    t_list *tmp;

    if (begin_list == 0 || cmp == 0)
        return ;
    while (*begin_list)
    {
        if (cmp((*begin_list)->data, data_ref) == 0)
        {
            tmp = *begin_list;
            *begin_list = (*begin_list)->next;
            free(tmp);
        }
        else
            begin_list = &((*begin_list)->next);
    }
}`,
  },
  {
    id: "lstforeach",
    title: "lstforeach",
    exam: "EX4",
    target: "ft_list_foreach",
    fileName: "ft_list_foreach.c",
    summary: "Parcourt la liste et applique une fonction sur chaque maillon.",
    helpers: [],
    code: `typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

void ft_list_foreach(t_list *begin_list, void (*f)(void *))
{
    t_list *cur;

    if (f == 0)
        return ;
    cur = begin_list;
    while (cur)
    {
        (*f)(cur->data);
        cur = cur->next;
    }
}`,
  },
  {
    id: "lstsort",
    title: "lstsort",
    exam: "EX4",
    target: "sort_list",
    fileName: "sort_list.c",
    summary: "Trie une liste en place avec un bubble sort basé sur swap de data.",
    helpers: [],
    code: `typedef struct s_list
{
    int data;
    struct s_list *next;
} t_list;

t_list *sort_list(t_list *lst, int (*cmp)(int, int))
{
    t_list *cur;
    int swapped;
    int tmp;

    if (lst == 0 || cmp == 0)
        return (lst);
    if (lst->next == 0)
        return (lst);
    swapped = 1;
    while (swapped == 1)
    {
        swapped = 0;
        cur = lst;
        while (cur->next)
        {
            if (cmp(cur->data, cur->next->data) == 0)
            {
                tmp = cur->data;
                cur->data = cur->next->data;
                cur->next->data = tmp;
                swapped = 1;
            }
            cur = cur->next;
        }
    }
    return (lst);
}`,
  },
  {
    id: "split",
    title: "split",
    exam: "EX4",
    target: "ft_split",
    fileName: "ft_split.c",
    summary: "Découpe une chaîne en mots avec nettoyage mémoire complet en cas d’erreur.",
    helpers: ["is_sep", "count_words", "word_len", "copy_word", "free_words"],
    code: `#include <stdlib.h>

static int is_sep(char c)
{
    if (c == ' ')
        return (1);
    if (c == '\\t')
        return (1);
    if (c == '\\n')
        return (1);
    return (0);
}

static int count_words(char *str)
{
    int count;

    count = 0;
    while (*str)
    {
        while (*str && is_sep(*str))
            str++;
        if (*str)
        {
            count++;
            while (*str && is_sep(*str) == 0)
                str++;
        }
    }
    return (count);
}

static int word_len(char *str)
{
    int len;

    len = 0;
    while (str[len] && is_sep(str[len]) == 0)
        len++;
    return (len);
}

static char *copy_word(char *src, int len)
{
    char *word;
    int i;

    word = (char *)malloc(sizeof(char) * (len + 1));
    if (word == NULL)
        return (NULL);
    i = 0;
    while (i < len)
    {
        word[i] = src[i];
        i++;
    }
    word[i] = '\\0';
    return (word);
}

static char **free_words(char **tab, int filled)
{
    int i;

    i = 0;
    while (i < filled)
    {
        free(tab[i]);
        i++;
    }
    free(tab);
    return (NULL);
}

char **ft_split(char *str)
{
    char **tab;
    int words;
    int i;
    int len;

    if (str == NULL)
        return (NULL);
    words = count_words(str);
    tab = (char **)malloc(sizeof(char *) * (words + 1));
    if (tab == NULL)
        return (NULL);
    i = 0;
    while (*str)
    {
        while (*str && is_sep(*str))
            str++;
        if (*str)
        {
            len = word_len(str);
            tab[i] = copy_word(str, len);
            if (tab[i] == NULL)
                return (free_words(tab, i));
            i++;
            str = str + len;
        }
    }
    tab[i] = NULL;
    return (tab);
}`,
  },
  {
    id: "itoa",
    title: "itoa",
    exam: "EX4",
    target: "ft_itoa",
    fileName: "ft_itoa.c",
    summary: "Convertit un int en string en gérant signe, zéro et allocation exacte.",
    helpers: ["count_digits", "fill_digits_from_right"],
    code: `#include <stdlib.h>

static int count_digits(long n)
{
    int len;

    len = 1;
    while (n >= 10)
    {
        n = n / 10;
        len++;
    }
    return (len);
}

static void fill_digits_from_right(char *str, int index, long n)
{
    while (index >= 0)
    {
        str[index] = (char)((n % 10) + '0');
        n = n / 10;
        index--;
    }
}

char *ft_itoa(int nbr)
{
    long n;
    int sign;
    int len;
    char *str;

    n = (long)nbr;
    sign = 0;
    if (n < 0)
    {
        sign = 1;
        n = -n;
    }
    len = count_digits(n) + sign;
    str = (char *)malloc(sizeof(char) * (len + 1));
    if (str == NULL)
        return (NULL);
    str[len] = '\\0';
    fill_digits_from_right(str, len - 1, n);
    if (sign == 1)
        str[0] = '-';
    return (str);
}`,
  },
];

const EXAM_OPTI_VARIANTS = {
  union: {
    summary: "Version compacte type exam (rank 02 / level 2), parcours direct avec table seen[256].",
    helpers: [],
    fileName: "union_opti_exam.c",
    code: `#include <unistd.h>

int main(int argc, char **argv)
{
    unsigned char seen[256] = {0};
    int i;
    unsigned char c;

    if (argc != 3)
    {
        write(1, "\\n", 1);
        return (0);
    }
    i = 0;
    while (argv[1][i])
    {
        c = (unsigned char)argv[1][i];
        if (seen[c] == 0)
        {
            seen[c] = 1;
            write(1, &argv[1][i], 1);
        }
        i++;
    }
    i = 0;
    while (argv[2][i])
    {
        c = (unsigned char)argv[2][i];
        if (seen[c] == 0)
        {
            seen[c] = 1;
            write(1, &argv[2][i], 1);
        }
        i++;
    }
    write(1, "\\n", 1);
    return (0);
}`,
  },
  atoi: {
    summary: "Version compacte type exam (rank 02 / level 2), gestion espaces, signe et accumulation.",
    helpers: ["ft_isspace", "ft_isdigit"],
    fileName: "ft_atoi_opti_exam.c",
    code: `static int ft_isspace(int c)
{
    if (c == ' ')
        return (1);
    if (c >= 9 && c <= 13)
        return (1);
    return (0);
}

static int ft_isdigit(int c)
{
    if (c >= '0' && c <= '9')
        return (1);
    return (0);
}

int ft_atoi(const char *str)
{
    int i;
    int sign;
    int result;

    i = 0;
    while (ft_isspace((unsigned char)str[i]))
        i++;
    sign = 1;
    if (str[i] == '-' || str[i] == '+')
    {
        if (str[i] == '-')
            sign = -1;
        i++;
    }
    result = 0;
    while (ft_isdigit((unsigned char)str[i]))
    {
        result = result * 10 + (str[i] - '0');
        i++;
    }
    return (result * sign);
}`,
  },
  strdup: {
    summary: "Version compacte type exam (rank 02 / level 2), allocation exacte puis copie simple.",
    helpers: [],
    fileName: "ft_strdup_opti_exam.c",
    code: `#include <stdlib.h>

char *ft_strdup(char *src)
{
    char *dup;
    int len;
    int i;

    len = 0;
    while (src[len])
        len++;
    dup = (char *)malloc(sizeof(char) * (len + 1));
    if (dup == NULL)
        return (NULL);
    i = 0;
    while (src[i])
    {
        dup[i] = src[i];
        i++;
    }
    dup[i] = '\\0';
    return (dup);
}`,
  },
  strrev: {
    summary: "Version compacte type exam (rank 02 / level 2), inversion in-place avec double index.",
    helpers: [],
    fileName: "ft_strrev_opti_exam.c",
    code: `char *ft_strrev(char *str)
{
    int i;
    int j;
    char tmp;

    i = 0;
    j = 0;
    while (str[j])
        j++;
    j--;
    while (i < j)
    {
        tmp = str[i];
        str[i] = str[j];
        str[j] = tmp;
        i++;
        j--;
    }
    return (str);
}`,
  },
  inter: {
    summary: "Version compacte type exam (rank 02 / level 2), intersection sans doublons en gardant l’ordre de argv[1].",
    helpers: [],
    fileName: "inter_opti_exam.c",
    code: `#include <unistd.h>

int main(int argc, char **argv)
{
    unsigned char in_second[256] = {0};
    unsigned char printed[256] = {0};
    int i;
    unsigned char c;

    if (argc != 3)
    {
        write(1, "\\n", 1);
        return (0);
    }
    i = 0;
    while (argv[2][i])
    {
        in_second[(unsigned char)argv[2][i]] = 1;
        i++;
    }
    i = 0;
    while (argv[1][i])
    {
        c = (unsigned char)argv[1][i];
        if (in_second[c] == 1 && printed[c] == 0)
        {
            printed[c] = 1;
            write(1, &argv[1][i], 1);
        }
        i++;
    }
    write(1, "\\n", 1);
    return (0);
}`,
  },
  last_word: {
    summary: "Version compacte type exam (rank 02 / level 2), extraction du dernier mot avec trim espace/tab.",
    helpers: [],
    fileName: "last_word_opti_exam.c",
    code: `#include <unistd.h>

static int is_sep(char c)
{
    if (c == ' ' || c == '\\t')
        return (1);
    return (0);
}

int main(int argc, char **argv)
{
    int i;
    int start;
    char *s;

    if (argc == 2)
    {
        s = argv[1];
        i = 0;
        while (s[i])
            i++;
        while (i > 0 && is_sep(s[i - 1]))
            i--;
        start = i;
        while (start > 0 && is_sep(s[start - 1]) == 0)
            start--;
        while (start < i)
            write(1, &s[start++], 1);
    }
    write(1, "\\n", 1);
    return (0);
}`,
  },
  wdmatch: {
    summary: "Version compacte type exam (rank 02 / level 2), sous-séquence vérifiée par double index.",
    helpers: [],
    fileName: "wdmatch_opti_exam.c",
    code: `#include <unistd.h>

static int ft_strlen(char *str)
{
    int i;

    i = 0;
    while (str[i])
        i++;
    return (i);
}

int main(int argc, char **argv)
{
    int i;
    int j;

    if (argc == 3)
    {
        i = 0;
        j = 0;
        while (argv[2][j] && argv[1][i])
        {
            if (argv[1][i] == argv[2][j])
                i++;
            j++;
        }
        if (argv[1][i] == '\\0')
            write(1, argv[1], ft_strlen(argv[1]));
    }
    write(1, "\\n", 1);
    return (0);
}`,
  },
  lstsize: {
    summary: "Version compacte type exam (rank 02 / level 3), comptage linéaire robuste de la liste.",
    helpers: [],
    fileName: "ft_list_size_opti_exam.c",
    code: `typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

int ft_list_size(t_list *begin_list)
{
    int count;

    count = 0;
    while (begin_list)
    {
        count++;
        begin_list = begin_list->next;
    }
    return (count);
}`,
  },
  range: {
    summary: "Version compacte type exam (rank 02 / level 3), allocation inclusive avec step dynamique.",
    helpers: [],
    fileName: "ft_range_opti_exam.c",
    code: `#include <stdlib.h>

int *ft_range(int start, int end)
{
    int len;
    int step;
    int i;
    int *tab;

    len = end - start;
    if (len < 0)
        len = -len;
    len++;
    tab = (int *)malloc(sizeof(int) * len);
    if (tab == NULL)
        return (NULL);
    step = 1;
    if (start > end)
        step = -1;
    i = 0;
    while (i < len)
    {
        tab[i] = start;
        start = start + step;
        i++;
    }
    return (tab);
}`,
  },
  itoa: {
    summary: "Version compacte type exam (rank 02 / level 4), optimisée pour mémorisation rapide.",
    helpers: ["ft_count_len"],
    fileName: "ft_itoa_opti_exam.c",
    code: `#include <stdlib.h>

int ft_count_len(int nbr)
{
    int i;

    i = 0;
    if (nbr <= 0)
        i++;
    while (nbr != 0)
    {
        nbr = nbr / 10;
        i++;
    }
    return (i);
}

char *ft_itoa(int nbr)
{
    int i;
    int len;
    long num;
    char *str;

    num = nbr;
    len = ft_count_len(nbr);
    str = (char *)malloc(sizeof(char) * (len + 1));
    if (!str)
        return (NULL);
    str[len] = '\\0';
    i = len - 1;
    if (num < 0)
    {
        str[0] = '-';
        num = -num;
    }
    while (num > 9)
    {
        str[i] = (char)(num % 10 + '0');
        num = num / 10;
        i--;
    }
    str[i] = (char)(num + '0');
    return (str);
}`,
  },
  lstforeach: {
    summary: "Version compacte type exam (rank 02 / level 4), parcours direct de la liste.",
    helpers: [],
    fileName: "ft_list_foreach_opti_exam.c",
    code: `typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

void ft_list_foreach(t_list *begin_list, void (*f)(void *))
{
    if (f == 0)
        return ;
    while (begin_list)
    {
        (*f)(begin_list->data);
        begin_list = begin_list->next;
    }
}`,
  },
  list_remove_if: {
    summary:
      "Version compacte type exam (rank 02 / level 4), suppression en place avec pointeur sur pointeur.",
    helpers: [],
    fileName: "ft_list_remove_if_opti_exam.c",
    code: `#include <stdlib.h>

typedef struct s_list
{
    struct s_list *next;
    void *data;
} t_list;

void ft_list_remove_if(t_list **begin_list, void *data_ref, int (*cmp)(void *, void *))
{
    t_list *tmp;

    if (begin_list == 0 || cmp == 0)
        return ;
    while (*begin_list)
    {
        if (cmp((*begin_list)->data, data_ref) == 0)
        {
            tmp = *begin_list;
            *begin_list = (*begin_list)->next;
            free(tmp);
        }
        else
            begin_list = &((*begin_list)->next);
    }
}`,
  },
  lstsort: {
    summary: "Version compacte type exam (rank 02 / level 4), bubble sort avec reset sur la tête.",
    helpers: [],
    fileName: "sort_list_opti_exam.c",
    code: `#include "list.h"

t_list *sort_list(t_list *lst, int (*cmp)(int, int))
{
    int tmp;
    t_list *head;

    head = lst;
    while (lst != 0 && lst->next != 0)
    {
        if ((*cmp)(lst->data, lst->next->data) == 0)
        {
            tmp = lst->data;
            lst->data = lst->next->data;
            lst->next->data = tmp;
            lst = head;
        }
        else
            lst = lst->next;
    }
    return (head);
}`,
  },
  split: {
    summary: "Version compacte type exam (rank 02 / level 4), découpe espaces/tabs/newlines en tableau NULL-terminated.",
    helpers: ["is_sep", "count_words", "word_len", "copy_word"],
    fileName: "ft_split_opti_exam.c",
    code: `#include <stdlib.h>

static int is_sep(char c)
{
    if (c == ' ' || c == '\\t' || c == '\\n')
        return (1);
    return (0);
}

static int count_words(char *str)
{
    int count;

    count = 0;
    while (*str)
    {
        while (*str && is_sep(*str))
            str++;
        if (*str)
            count++;
        while (*str && is_sep(*str) == 0)
            str++;
    }
    return (count);
}

static int word_len(char *str)
{
    int len;

    len = 0;
    while (str[len] && is_sep(str[len]) == 0)
        len++;
    return (len);
}

static char *copy_word(char *str)
{
    char *word;
    int len;
    int i;

    len = word_len(str);
    word = (char *)malloc(sizeof(char) * (len + 1));
    if (word == 0)
        return (0);
    i = 0;
    while (i < len)
    {
        word[i] = str[i];
        i++;
    }
    word[i] = '\\0';
    return (word);
}

char **ft_split(char *str)
{
    char **tab;
    int i;

    tab = (char **)malloc(sizeof(char *) * (count_words(str) + 1));
    if (tab == 0)
        return (0);
    i = 0;
    while (*str)
    {
        while (*str && is_sep(*str))
            str++;
        if (*str)
        {
            tab[i] = copy_word(str);
            if (tab[i] == 0)
                return (0);
            i++;
        }
        while (*str && is_sep(*str) == 0)
            str++;
    }
    tab[i] = 0;
    return (tab);
}`,
  },
};

const EXERCISE_SUBJECTS = {
  union: String.raw`Assignment name  : union
Expected files   : union.c
Allowed functions: write
--------------------------------------------------------------------------------

Ècrire un programme nommé union qui prend en paramètre deux chaînes de
caractères et qui affiche, sans doublon, les caractères qui apparaissent dans
l'une ou dans l'autre.

L'affichage se fera dans l'ordre d'apparition dans la ligne de commande.

L'affichage doit etre suivi d'un retour à la ligne.

Si le nombre de paramètres transmis est différent de 2, le programme affiche
\n.

Exemple:

$>./union zpadinton "paqefwtdjetyiytjneytjoeyjnejeyj" | cat -e
zpadintoqefwjy$
$>./union ddf6vewg64f gtwthgdwthdwfteewhrtag6h4ffdhsd | cat -e
df6vewg4thras$
$>./union "rien" "cette phrase ne cache rien" | cat -e
rienct phas$
$>./union | cat -e
$
$>
$>./union "rien" | cat -e
$
$>`,
  atoi: String.raw`Assignment name  : ft_atoi
Expected files   : ft_atoi.c
Allowed functions: None
--------------------------------------------------------------------------------

Écrire une fonction qui convertit une chaîne en un entier (type int) et le retourne.

Marche comme la fonction standard atoi(const char *str), voir le man.

La fonction doit être prototypée comme suit:

int	ft_atoi(const char *str);`,
  strdup: String.raw`Assignment name  : ft_strdup
Expected files   : ft_strdup.c
Allowed functions: malloc
--------------------------------------------------------------------------------

Reproduisez à l'identique le comportement de la fonction strdup (man strdup).

Votre fonction devra être prototypée de la façon suivante :

char    *ft_strdup(char *src);`,
  strrev: String.raw`Assignment name  : ft_strrev
Expected files   : ft_strrev.c
Allowed functions:
--------------------------------------------------------------------------------

Écrire une fonction qui inverse (en place) une chaîne de caractères.

Elle devra renvoyer son paramètre.

Votre fonction devra être prototypée de la façon suivante :

char    *ft_strrev(char *str);`,
  inter: String.raw`Assignment name  : inter
Expected files   : inter.c
Allowed functions: write
--------------------------------------------------------------------------------

Écrire un programme qui prend en paramètres deux chaînes de caractères et qui
affiche sans doublon les caractères communs aux deux chaînes.

L'affichage se fera dans l'ordre d'apparition dans la premiere chaîne.
L'affichage doit être suivi d'un '\n'.

Si le nombre de paramètres transmis est différent de 2, le programme affiche
'\n'.

Exemples:
$>./inter "padinton" "paqefwtdjetyiytjneytjoeyjnejeyj" | cat -e
padinto$
$>./inter ddf6vewg64f gtwthgdwthdwfteewhrtag6h4ffdhsd | cat -e
df6ewg4$
$>./inter "rien" "cette phrase ne cache rien" | cat -e
rien$
$>./inter | cat -e
$`,
  last_word: String.raw`Assignment name  : last_word
Expected files   : last_word.c
Allowed functions: write
--------------------------------------------------------------------------------

Écrire un programme qui prend une chaîne de caractères en paramètre, et qui
affiche le dernier mot de cette chaîne, suivi d'un '\n'.

On appelle "mot" une portion de chaîne de caractères délimitée soit par des
espaces et/ou des tabulations, soit par le début / fin de la chaîne.

Si le nombre de paramètres transmis est différent de 1, ou s'il n'y a aucun mot
à afficher, le programme affiche '\n'.

Exemple:

$> ./last_word "FOR PONY" | cat -e
PONY$
$> ./last_word "this        ...       is sparta, then again, maybe    not" | cat -e
not$
$> ./last_word "   " | cat -e
$
$> ./last_word "a" "b" | cat -e
$
$> ./last_word "  lorem,ipsum  " | cat -e
lorem,ipsum$
$>`,
  wdmatch: String.raw`Assignment name  : wdmatch
Expected files   : wdmatch.c
Allowed functions: write
--------------------------------------------------------------------------------

Le programme prend en paramètres deux chaînes de caractères et vérifie qu'il
est possible d'écrire la première chaîne de caractères a l'aide des caractères
de la deuxiême chaîne, tout en respectant l'ordre des caractères dans la
deuxième chaîne.

Si cela est possible, le programme affiche la première chaîne de caractères,
suivie de '\n'. Sinon le programme affiche seulement '\n'.

Si le nombre de paramètres transmis est différent de 2, le programme affiche
'\n'.

Exemples :

$>./wdmatch "faya" "fgvvfdxcacpolhyghbreda" | cat -e
faya$
$>./wdmatch "faya" "fgvvfdxcacpolhyghbred" | cat -e
$
$>./wdmatch "quarante deux" "qfqfsudf arzgsayns tsregfdgs sjytdekuoixq " | cat -e
quarante deux$
$>./wdmatch "error" rrerrrfiiljdfxjyuifrrvcoojh | cat -e
$
$>./wdmatch | cat -e
$`,
  lstsize: String.raw`Assignment name  : ft_list_size
Expected files   : ft_list_size.c, ft_list.h
Allowed functions:
--------------------------------------------------------------------------------

Écrire une fonction qui renvoie le nombre d'éléments dans la liste chaînée
passée en paramètre.

Elle devra être prototypée de la façon suivante:

int	ft_list_size(t_list *begin_list);

Vous devez utiliser la structure suivante, et la rendre dans un fichier
ft_list.h:

typedef struct    s_list
{
	struct s_list *next;
	void          *data;
}                 t_list;`,
  range: String.raw`Assignment name  : ft_range
Expected files   : ft_range.c
Allowed functions: malloc
--------------------------------------------------------------------------------

Écrire la fonction suivante :

int     *ft_range(int start, int end);

Cette fonction doit allouer avec malloc() un tableau d'ints, le remplir avec
les valeurs (consécutives) démarrant à start et finissant à end (start et end
inclus !), et renvoyer un pointeur vers la première valeur du tableau.

Exemples:

- Avec (1, 3) vous devrez renvoyer un tableau contenant 1, 2 et 3.
- Avec (-1, 2) vous devrez renvoyer un tableau contenant -1, 0, 1 et 2.
- Avec (0, 0) vous devrez renvoyer un tableau contenant 0.
- Avec (0, -3) vous devrez renvoyer un tableau contenant 0, -1, -2 et -3.`,
  list_remove_if: String.raw`Assignment name  : ft_list_remove_if
Expected files   : ft_list_remove_if.c
Allowed functions: free
--------------------------------------------------------------------------------

Écrire une fonction ft_list_remove_if qui efface de la liste tous les élements
dont la donnée est "égale" à la donnée de référence.

Elle devra être prototypée de la façon suivante :

void ft_list_remove_if(t_list **begin_list, void *data_ref, int (*cmp)());

À la correction, vous disposez du fichier ft_list.h tel que :

$>cat ft_list.h
typedef struct      s_list
{
    struct s_list   *next;
    void            *data;
}                   t_list;
$>`,
  lstforeach: String.raw`Assignment name  : ft_list_foreach
Expected files   : ft_list_foreach.c, ft_list.h
Allowed functions:
--------------------------------------------------------------------------------

Écrire une fonction qui prend une liste et un pointeur sur fonction en
paramètres, et applique la fonction à chaque élément de la liste.

Elle devra être prototypée de la façon suivante:

void    ft_list_foreach(t_list *begin_list, void (*f)(void *));

La fonction pointée par f sera utilisée comme suit:

(*f)(list_ptr->data);

Vous devez utiliser la structure suivante, et la rendre dans un fichier
ft_list.h:

typedef struct    s_list
{
    struct s_list *next;
    void          *data;
}                 t_list;`,
  lstsort: String.raw`Assignment name  : sort_list
Expected files   : sort_list.c
Allowed functions:
--------------------------------------------------------------------------------

Écrire la fonction suivante:

t_list	*sort_list(t_list* lst, int (*cmp)(int, int));

Cette fonction doit trier la liste passée en premier paramètre, en utilisant le
pointeur sur fonction cmp pour déterminer l'ordre à appliquer, et
renvoyer un pointeur vers le premier élément de la liste triée.

Les doublons doivent être préservés.

Les entrées seront toujours cohérentes.

Vous devez utiliser le type t_list décrit dans le fichier list.h qui vous est
fourni. Vous devrez inclure (#include "list.h") ce fichier, mais ne pas le
rendre. Nous utiliserons le notre pour compiler votre exercice.

Les fonctions passées en tant que cmp renverront toujours une valeur
différente de 0 si a et b sont dans le bon ordre,
dans le cas contraire elles renverront 0.

Par exemple, la fonction suivante utilisée en tant que cmp devra
permettre de trier la liste par ordre croissant:

int croissant(int a, int b)
{
	return (a <= b);
}`,
  split: String.raw`Assignment name  : ft_split
Expected files   : ft_split.c
Allowed functions: malloc
--------------------------------------------------------------------------------

Écrire une fonction qui prend en paramètre une chaîne de caractères et la
découpe en mots, qui seront retournés sous la forme d'un tableau de chaînes
terminé par NULL.

On appelle "mot" une portion de chaîne de caractères délimitée soit par des
espaces, des retours à la ligne et/ou des tabulations, soit par le début / fin
de la chaîne.

Votre fonction devra être prototypée de la façon suivante :

char    **ft_split(char *str);`,
  itoa: String.raw`Assignment name  : ft_itoa
Expected files   : ft_itoa.c
Allowed functions: malloc
--------------------------------------------------------------------------------

Écrire une fonction qui prend un int et le convertit en chaîne terminée par un
caractère nul. Cette fonction retourne le résultat en tant qu'un tableau de
char que vous devez allouer.

Votre fonction sera déclarée comme suit:

char	*ft_itoa(int nbr);`,
};

const ui = {
  examFilter: null,
  exerciseSelect: null,
  versionSelect: null,
  prevBtn: null,
  nextBtn: null,
  copyBtn: null,
  downloadBtn: null,
  title: null,
  summary: null,
  versionBadge: null,
  exam: null,
  target: null,
  helpersCount: null,
  helpersList: null,
  fileName: null,
  subject: null,
  code: null,
  feedback: null,
};

const state = {
  exam: "all",
  exerciseId: EXERCISES[0].id,
  version: CODE_VERSION_COMPLETE,
};

function defaultState() {
  return {
    exam: "all",
    exerciseId: EXERCISES[0].id,
    version: CODE_VERSION_COMPLETE,
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(CODE_PAGE_STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    const exams = new Set(["all", "EX2", "EX3", "EX4"]);
    const versions = new Set([CODE_VERSION_COMPLETE, CODE_VERSION_OPTI]);
    const ids = new Set(EXERCISES.map((item) => item.id));
    return {
      exam: exams.has(parsed.exam) ? parsed.exam : "all",
      exerciseId: ids.has(parsed.exerciseId) ? parsed.exerciseId : EXERCISES[0].id,
      version: versions.has(parsed.version) ? parsed.version : CODE_VERSION_COMPLETE,
    };
  } catch (_error) {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(CODE_PAGE_STORAGE_KEY, JSON.stringify(state));
}

function selectUi() {
  ui.examFilter = document.querySelector("#codeExamFilter");
  ui.exerciseSelect = document.querySelector("#codeExerciseSelect");
  ui.versionSelect = document.querySelector("#codeVersionSelect");
  ui.prevBtn = document.querySelector("#prevCodeBtn");
  ui.nextBtn = document.querySelector("#nextCodeBtn");
  ui.copyBtn = document.querySelector("#copyCodeBtn");
  ui.downloadBtn = document.querySelector("#downloadCodeBtn");
  ui.title = document.querySelector("#codeTitle");
  ui.summary = document.querySelector("#codeSummary");
  ui.versionBadge = document.querySelector("#codeVersionBadge");
  ui.exam = document.querySelector("#codeExam");
  ui.target = document.querySelector("#codeTarget");
  ui.helpersCount = document.querySelector("#codeHelpersCount");
  ui.helpersList = document.querySelector("#codeHelpersList");
  ui.fileName = document.querySelector("#codeFileName");
  ui.subject = document.querySelector("#codeSubject");
  ui.code = document.querySelector("#exerciseCode");
  ui.feedback = document.querySelector("#codeFeedback");

  return Object.values(ui).every((node) => node !== null);
}

function setFeedback(message, type = "") {
  ui.feedback.textContent = message;
  ui.feedback.classList.remove("is-success", "is-error");
  if (type) {
    ui.feedback.classList.add(type);
  }
}

function filteredExercises() {
  if (state.exam === "all") {
    return EXERCISES;
  }
  return EXERCISES.filter((item) => item.exam === state.exam);
}

function ensureValidSelection() {
  const available = filteredExercises();
  if (available.length === 0) {
    state.exerciseId = "";
    return;
  }

  const exists = available.some((item) => item.id === state.exerciseId);
  if (!exists) {
    state.exerciseId = available[0].id;
  }
}

function currentExercise() {
  return EXERCISES.find((item) => item.id === state.exerciseId) || null;
}

function getVersionedExercise(exercise) {
  const optiVariant = EXAM_OPTI_VARIANTS[exercise.id] || null;
  const optiRequested = state.version === CODE_VERSION_OPTI;
  const useOpti = optiRequested && optiVariant !== null;
  const helpers = useOpti ? optiVariant.helpers : exercise.helpers;

  return {
    code: useOpti ? optiVariant.code : exercise.code,
    summary: useOpti ? optiVariant.summary : exercise.summary,
    fileName: useOpti ? optiVariant.fileName : exercise.fileName,
    helpers: Array.isArray(helpers) ? helpers : [],
    isOpti: useOpti,
    optiRequested,
    optiAvailable: optiVariant !== null,
  };
}

function setVersionBadge(isOpti) {
  ui.versionBadge.textContent = isOpti ? "Opti for Exam" : "Complet";
  ui.versionBadge.classList.toggle("is-opti", isOpti);
  ui.versionBadge.classList.toggle("is-complete", !isOpti);
}

function renderExerciseOptions() {
  const available = filteredExercises();
  ui.exerciseSelect.innerHTML = "";

  available.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = `${item.title} (${item.exam})`;
    ui.exerciseSelect.appendChild(option);
  });

  ui.exerciseSelect.value = state.exerciseId;
}

function renderHelpers(helpers) {
  ui.helpersList.innerHTML = "";

  if (!Array.isArray(helpers) || helpers.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Aucune fonction satellite: la fonction cible est autonome.";
    ui.helpersList.appendChild(li);
    return;
  }

  helpers.forEach((helper) => {
    const li = document.createElement("li");
    li.className = "mono";
    li.textContent = helper;
    ui.helpersList.appendChild(li);
  });
}

function renderExercise() {
  const exercise = currentExercise();

  if (!exercise) {
    ui.title.textContent = "Aucun exercice disponible";
    ui.summary.textContent = "Ajuste le filtre pour afficher un code complet.";
    setVersionBadge(false);
    ui.subject.textContent = "";
    ui.code.textContent = "";
    return;
  }

  const versioned = getVersionedExercise(exercise);

  ui.title.textContent = exercise.title;
  ui.summary.textContent = versioned.summary;
  setVersionBadge(versioned.isOpti);
  ui.exam.textContent = exercise.exam;
  ui.target.textContent = exercise.target;
  ui.helpersCount.textContent = String(versioned.helpers.length);
  ui.fileName.textContent = versioned.fileName;
  ui.subject.textContent = EXERCISE_SUBJECTS[exercise.id] || "Sujet non disponible pour cet exercice.";
  ui.code.textContent = versioned.code;
  renderHelpers(versioned.helpers);

  if (versioned.isOpti) {
    setFeedback("Version Opti for Exam chargée.", "is-success");
  } else if (versioned.optiRequested && !versioned.optiAvailable) {
    setFeedback("Version complète chargée: Opti for Exam indisponible pour cet exercice.");
  } else {
    setFeedback("Code complet chargé.");
  }
}

function moveSelection(direction) {
  const available = filteredExercises();
  if (available.length === 0) {
    return;
  }

  const currentIndex = available.findIndex((item) => item.id === state.exerciseId);
  const safeCurrent = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeCurrent + direction + available.length) % available.length;

  state.exerciseId = available[nextIndex].id;
  ui.exerciseSelect.value = state.exerciseId;
  saveState();
  renderExercise();
}

async function copyCurrentCode() {
  const exercise = currentExercise();
  if (!exercise) {
    return;
  }
  const versioned = getVersionedExercise(exercise);

  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(versioned.code);
      setFeedback("Code copié dans le presse-papiers.", "is-success");
      return;
    }

    const area = document.createElement("textarea");
    area.value = versioned.code;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    setFeedback("Code copié dans le presse-papiers.", "is-success");
  } catch (_error) {
    setFeedback("Impossible de copier le code automatiquement.", "is-error");
  }
}

function downloadCurrentCode() {
  const exercise = currentExercise();
  if (!exercise) {
    return;
  }
  const versioned = getVersionedExercise(exercise);

  const blob = new Blob([versioned.code], { type: "text/x-c" });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = versioned.fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(href);
  setFeedback("Fichier .c téléchargé.", "is-success");
}

function bindEvents() {
  ui.examFilter.addEventListener("change", () => {
    state.exam = ui.examFilter.value;
    ensureValidSelection();
    renderExerciseOptions();
    renderExercise();
    saveState();
  });

  ui.exerciseSelect.addEventListener("change", () => {
    state.exerciseId = ui.exerciseSelect.value;
    renderExercise();
    saveState();
  });

  ui.versionSelect.addEventListener("change", () => {
    state.version = ui.versionSelect.value;
    renderExercise();
    saveState();
  });

  ui.prevBtn.addEventListener("click", () => moveSelection(-1));
  ui.nextBtn.addEventListener("click", () => moveSelection(1));
  ui.copyBtn.addEventListener("click", copyCurrentCode);
  ui.downloadBtn.addEventListener("click", downloadCurrentCode);

  document.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      moveSelection(-1);
    }
    if (event.key === "ArrowRight") {
      moveSelection(1);
    }
  });
}

function initCodesPage() {
  if (!selectUi()) {
    return;
  }

  initCommon("codes", "codes.html");

  const loaded = loadState();
  state.exam = loaded.exam;
  state.exerciseId = loaded.exerciseId;
  state.version = loaded.version;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("id");
  if (fromQuery && EXERCISES.some((item) => item.id === fromQuery)) {
    state.exerciseId = fromQuery;
  }

  ui.examFilter.value = state.exam;
  ui.versionSelect.value = state.version;
  ensureValidSelection();
  renderExerciseOptions();
  renderExercise();
  bindEvents();
  saveState();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCodesPage, { once: true });
} else {
  initCodesPage();
}
