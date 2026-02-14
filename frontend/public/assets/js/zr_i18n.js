(() => {
        const SUPPORTED = ['en', 'de', 'fr', 'es', 'pt-BR'];
        const DEFAULT = 'en';

        const TRANSLATIONS = {
          "en": {
                    "page_title": "Zenreader",
                    "lang_label": "Language",
                    "search_placeholder": "Search books or authors…",
                    "search_aria_label": "Search",
                    "nav_about": "About me",
                    "nav_home": "Home",
                    "nav_readingdiary": "Reading diary",
                    //"nav_contact": "Contact",
                    //"nav_newsletter": "Newsletter",
                    //"nav_shop": "Shop",
                    "nav_faq": "FAQ",
                    "nav_login": "Login",
                    "nav_youtube": "YouTube",
                    "nav_tiktok": "TikTok",
                    "nav_instagram": "Instagram",
                    "stats_books_in": "Books in",
                    "stats_loading": "loading…",
                    "stats_finished": "Finished",
                    "stats_abandoned": "Abandoned",
                    "stats_top": "Top",
                    "stats_in_stock": "In stock",
                    "stats_all_books": "Books",
                    "stats_live_db": "live from DB{base}",
                    "stats_error": "Could not load stats: {error}",
                    "intro_quote": "“I don’t need a lot… all I need is a top-book.”",
                    "intro_lead": "That quote sums up my reading life: how I discover new titles, organize my reading list, and use an unconventional reading technique to make the most of every free minute. My goal is simple—find true page-turners from a huge variety of books.",
                    "intro_explore": "Explore",
                    "li1_prefix": "Discover my",
                    "li1_link": "reading technique",
                    "li1_img_alt": "Reading technique",
                    "li2_prefix1": "See the",
                    "li2_link_equipment": "equipment",
                    "li2_suffix1": "I use",
                    "li2_img1_alt": "Equipment and setup",
                    "li2_mid": "and the page-turners I’ve discovered",
                    "li2_link_recently": "recently",
                    "li2_img2_alt": "Recent discoveries",
                    "li3_prefix": "Get to know my most-read",
                    "li3_link_authors": "authors",
                    "li3_suffix": "",
                    "li3_img_alt": "Most-read authors",
                    "li4_prefix": "Explore the",
                    "li4_link_sources": "sources",
                    "li4_mid": "that inspire me and how I find new",
                    "li4_link_books": "books",
                    "li5_prefix": "Listen to my",
                    "li5_link_podcast": "podcast",
                    "li5_mid": "with Andreas Bach from the YouTube channel",
                    "li5_link_bookdeckel": "Bookdeckel",
                    "note_html": "And finally, meet <strong>Lili</strong>—my reading companion. She joins me on my reading trips and has become the symbol of my <strong>BookSwipe</strong> promotion activities.",
                    "logo_alt": "Zenreader logo"
          },
          "de": {
                    "page_title": "Zenreader",
                    "lang_label": "Sprache",
                    "search_placeholder": "Bücher oder Autoren suchen…",
                    "search_aria_label": "Suchen",
                    "nav_about": "Über mich",
                    "nav_home": "Start",
                    "nav_readingdiary": "Lesetagebuch",
                    "nav_contact": "Kontakt",
                    "nav_newsletter": "Newsletter",
                    "nav_shop": "Shop",
                    "nav_faq": "FAQ",
                    "nav_login": "Login",
                    "nav_youtube": "YouTube",
                    "nav_tiktok": "TikTok",
                    "nav_instagram": "Instagram",
                    "stats_books_in": "Bücher in",
                    "stats_loading": "lädt…",
                    "stats_finished": "Fertig",
                    "stats_abandoned": "Abgebrochen",
                    "stats_top": "Top",
                    "stats_in_stock": "Auf Lager",
                    "stats_all_books": "Bücher",
                    "stats_live_db": "Live aus der DB{base}",
                    "stats_error": "Konnte Statistiken nicht laden: {error}",
                    "intro_quote": "„Ich brauche nicht viel… alles, was ich brauche, ist ein Top-Buch.“",
                    "intro_lead": "Dieses Zitat fasst mein Leseleben zusammen: wie ich neue Titel entdecke, meine Leseliste organisiere und mit einer unkonventionellen Lesetechnik das Beste aus jeder freien Minute heraushole. Mein Ziel ist einfach—echte Page-Turner aus einer riesigen Vielfalt an Büchern zu finden.",
                    "intro_explore": "Entdecken",
                    "li1_prefix": "Entdecke meine",
                    "li1_link": "Lesetechnik",
                    "li1_img_alt": "Lesetechnik",
                    "li2_prefix1": "Sieh dir die",
                    "li2_link_equipment": "Ausrüstung",
                    "li2_suffix1": "an, die ich benutze",
                    "li2_img1_alt": "Ausrüstung und Setup",
                    "li2_mid": "und die Page-Turner, die ich",
                    "li2_link_recently": "kürzlich entdeckt habe",
                    "li2_img2_alt": "Kürzliche Entdeckungen",
                    "li3_prefix": "Lerne meine meistgelesenen",
                    "li3_link_authors": "Autor*innen",
                    "li3_suffix": "kennen",
                    "li3_img_alt": "Meistgelesene Autor*innen",
                    "li4_prefix": "Erkunde die",
                    "li4_link_sources": "Quellen",
                    "li4_mid": "die mich inspirieren und wie ich neue",
                    "li4_link_books": "Bücher",
                    "li5_prefix": "Hör dir meinen",
                    "li5_link_podcast": "Podcast",
                    "li5_mid": "mit Andreas Bach vom YouTube-Kanal",
                    "li5_link_bookdeckel": "Bookdeckel",
                    "note_html": "Und zum Schluss: Das ist <strong>Lili</strong>—meine Lese-Begleiterin. Sie begleitet mich auf meinen Lesereisen und ist zum Symbol meiner <strong>BookSwipe</strong>-Promotions geworden.",
                    "logo_alt": "Zenreader-Logo"
          },
          "fr": {
                    "page_title": "Zenreader",
                    "lang_label": "Langue",
                    "search_placeholder": "Rechercher des livres ou des auteurs…",
                    "search_aria_label": "Rechercher",
                    "nav_about": "À propos",
                    "nav_home": "Accueil",
                    "nav_readingdiary": "Journal de lecture",
                    "nav_contact": "Contact",
                    "nav_newsletter": "Newsletter",
                    "nav_shop": "Boutique",
                    "nav_faq": "FAQ",
                    "nav_login": "Connexion",
                    "nav_youtube": "YouTube",
                    "nav_tiktok": "TikTok",
                    "nav_instagram": "Instagram",
                    "stats_books_in": "Livres en",
                    "stats_loading": "chargement…",
                    "stats_finished": "Terminés",
                    "stats_abandoned": "Abandonnés",
                    "stats_top": "Top",
                    "stats_in_stock": "En stock",
                    "stats_all_books": "Livres",
                    "stats_live_db": "en direct de la base de données{base}",
                    "stats_error": "Impossible de charger les statistiques : {error}",
                    "intro_quote": "« Je n’ai pas besoin de grand-chose… tout ce qu’il me faut, c’est un livre au top. »",
                    "intro_lead": "Cette citation résume ma vie de lecture : comment je découvre de nouveaux titres, j’organise ma liste de lectures et j’utilise une technique de lecture peu conventionnelle pour profiter de chaque minute libre. Mon objectif est simple—trouver de vrais page-turners parmi une immense variété de livres.",
                    "intro_explore": "Explorer",
                    "li1_prefix": "Découvrez ma",
                    "li1_link": "technique de lecture",
                    "li1_img_alt": "Technique de lecture",
                    "li2_prefix1": "Découvrez l’",
                    "li2_link_equipment": "équipement",
                    "li2_suffix1": "que j’utilise",
                    "li2_img1_alt": "Équipement et installation",
                    "li2_mid": "et les livres captivants que j’ai",
                    "li2_link_recently": "découverts récemment",
                    "li2_img2_alt": "Découvertes récentes",
                    "li3_prefix": "Faites connaissance avec mes",
                    "li3_link_authors": "auteurs",
                    "li3_suffix": "les plus lus",
                    "li3_img_alt": "Auteurs les plus lus",
                    "li4_prefix": "Explorez les",
                    "li4_link_sources": "sources",
                    "li4_mid": "qui m’inspirent et comment je trouve de nouveaux",
                    "li4_link_books": "livres",
                    "li5_prefix": "Écoutez mon",
                    "li5_link_podcast": "podcast",
                    "li5_mid": "avec Andreas Bach de la chaîne YouTube",
                    "li5_link_bookdeckel": "Bookdeckel",
                    "note_html": "Et pour finir, voici <strong>Lili</strong>—ma compagne de lecture. Elle m’accompagne dans mes sorties lecture et est devenue le symbole de mes actions de promotion <strong>BookSwipe</strong>.",
                    "logo_alt": "Logo Zenreader"
          },
          "es": {
                    "page_title": "Zenreader",
                    "lang_label": "Idioma",
                    "search_placeholder": "Buscar libros o autores…",
                    "search_aria_label": "Buscar",
                    "nav_about": "Sobre mí",
                    "nav_home": "Inicio",
                    "nav_readingdiary": "Diario de lectura",
                    "nav_contact": "Contacto",
                    "nav_newsletter": "Boletín",
                    "nav_shop": "Tienda",
                    "nav_faq": "FAQ",
                    "nav_login": "Iniciar sesión",
                    "nav_youtube": "YouTube",
                    "nav_tiktok": "TikTok",
                    "nav_instagram": "Instagram",
                    "stats_books_in": "Libros en",
                    "stats_loading": "cargando…",
                    "stats_finished": "Terminados",
                    "stats_abandoned": "Abandonados",
                    "stats_top": "Top",
                    "stats_in_stock": "En stock",
                    "stats_all_books": "Libros",
                    "stats_live_db": "en vivo desde la base de datos{base}",
                    "stats_error": "No se pudieron cargar las estadísticas: {error}",
                    "intro_quote": "« No necesito mucho… todo lo que necesito es un libro top. »",
                    "intro_lead": "Esa frase resume mi vida lectora: cómo descubro nuevos títulos, organizo mi lista de lectura y uso una técnica poco convencional para aprovechar cada minuto libre. Mi objetivo es simple—encontrar verdaderos libros que enganchan entre una enorme variedad.",
                    "intro_explore": "Explorar",
                    "li1_prefix": "Descubre mi",
                    "li1_link": "técnica de lectura",
                    "li1_img_alt": "Técnica de lectura",
                    "li2_prefix1": "Mira el",
                    "li2_link_equipment": "equipo",
                    "li2_suffix1": "que uso",
                    "li2_img1_alt": "Equipo y configuración",
                    "li2_mid": "y los libros que me han atrapado que he",
                    "li2_link_recently": "descubierto recientemente",
                    "li2_img2_alt": "Descubrimientos recientes",
                    "li3_prefix": "Conoce a mis",
                    "li3_link_authors": "autores",
                    "li3_suffix": "más leídos",
                    "li3_img_alt": "Autores más leídos",
                    "li4_prefix": "Explora las",
                    "li4_link_sources": "fuentes",
                    "li4_mid": "que me inspiran y cómo consigo nuevos",
                    "li4_link_books": "libros",
                    "li5_prefix": "Escucha mi",
                    "li5_link_podcast": "pódcast",
                    "li5_mid": "con Andreas Bach del canal de YouTube",
                    "li5_link_bookdeckel": "Bookdeckel",
                    "note_html": "Y por último, conoce a <strong>Lili</strong>—mi compañera de lectura. Me acompaña en mis rutas de lectura y se ha convertido en el símbolo de mis actividades de promoción de <strong>BookSwipe</strong>.",
                    "logo_alt": "Logo de Zenreader"
          },
          "pt-BR": {
                    "page_title": "Zenreader",
                    "lang_label": "Idioma",
                    "search_placeholder": "Buscar livros ou autores…",
                    "search_aria_label": "Buscar",
                    "nav_about": "Sobre mim",
                    "nav_home": "Início",
                    "nav_readingdiary": "Diário de leitura",
                    "nav_contact": "Contato",
                    "nav_newsletter": "Newsletter",
                    "nav_shop": "Loja",
                    "nav_faq": "FAQ",
                    "nav_login": "Entrar",
                    "nav_youtube": "YouTube",
                    "nav_tiktok": "TikTok",
                    "nav_instagram": "Instagram",
                    "stats_books_in": "Livros em",
                    "stats_loading": "carregando…",
                    "stats_finished": "Concluídos",
                    "stats_abandoned": "Interrompidos",
                    "stats_top": "Top",
                    "stats_in_stock": "Em estoque",
                    "stats_all_books": "Livros",
                    "stats_live_db": "ao vivo do banco de dados{base}",
                    "stats_error": "Não foi possível carregar as estatísticas: {error}",
                    "intro_quote": "“Não preciso de muito… tudo o que preciso é de um livro top.”",
                    "intro_lead": "Essa frase resume minha vida de leitura: como descubro novos títulos, organizo minha lista e uso uma técnica pouco convencional para aproveitar cada minuto livre. Meu objetivo é simples—encontrar livros que prendem a atenção em meio a uma enorme variedade.",
                    "intro_explore": "Explorar",
                    "li1_prefix": "Conheça minha",
                    "li1_link": "técnica de leitura",
                    "li1_img_alt": "Técnica de leitura",
                    "li2_prefix1": "Veja o",
                    "li2_link_equipment": "equipamento",
                    "li2_suffix1": "que eu uso",
                    "li2_img1_alt": "Equipamento e configuração",
                    "li2_mid": "e os livros que me prenderam e que eu",
                    "li2_link_recently": "descobri recentemente",
                    "li2_img2_alt": "Descobertas recentes",
                    "li3_prefix": "Conheça meus",
                    "li3_link_authors": "autores",
                    "li3_suffix": "mais lidos",
                    "li3_img_alt": "Autores mais lidos",
                    "li4_prefix": "Explore as",
                    "li4_link_sources": "fontes",
                    "li4_mid": "que me inspiram e como encontro novos",
                    "li4_link_books": "livros",
                    "li5_prefix": "Ouça meu",
                    "li5_link_podcast": "podcast",
                    "li5_mid": "com Andreas Bach do canal do YouTube",
                    "li5_link_bookdeckel": "Bookdeckel",
                    "note_html": "E por fim, conheça <strong>Lili</strong>—minha companheira de leitura. Ela me acompanha nas minhas jornadas de leitura e se tornou o símbolo das minhas ações de promoção do <strong>BookSwipe</strong>.",
                    "logo_alt": "Logo do Zenreader"
          }
};

        const normalizeLocale = (input) => {
          if (!input) return null;
          let l = String(input).trim().replace('_', '-');
          if (SUPPORTED.includes(l)) return l;
          const low = l.toLowerCase();
          if (low.startsWith('pt')) return 'pt-BR';
          if (low.startsWith('en')) return 'en';
          if (low.startsWith('de')) return 'de';
          if (low.startsWith('fr')) return 'fr';
          if (low.startsWith('es')) return 'es';
          return null;
        };

        const getQueryLocale = () => {
          const params = new URLSearchParams(location.search);
          return params.get('lang') || params.get('locale') || params.get('l');
        };

        const getInitialLocale = () => {
          const qp = normalizeLocale(getQueryLocale());
          if (qp) return qp;

          const stored = normalizeLocale(localStorage.getItem('zr_locale'));
          if (stored) return stored;

          const nav = normalizeLocale(navigator.language || (navigator.languages && navigator.languages[0]));
          if (nav) return nav;

          return DEFAULT;
        };

        let current = getInitialLocale();

        const interpolate = (str, vars) =>
          String(str).replace(/\{(\w+)\}/g, (_, k) =>
            (vars && vars[k] != null) ? String(vars[k]) : ''
          );

        const t = (key, vars) => {
          const dict = TRANSLATIONS[current] || {};
          const fallback = TRANSLATIONS[DEFAULT] || {};
          const raw = (key in dict) ? dict[key] : ((key in fallback) ? fallback[key] : key);
          return interpolate(raw, vars);
        };

        const apply = () => {
          document.documentElement.lang = current;
          document.title = t('page_title');

          document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            el.textContent = t(key);
          });

          document.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            el.innerHTML = t(key);
          });

          const attrMap = [
            ['placeholder', 'data-i18n-placeholder'],
            ['aria-label', 'data-i18n-aria-label'],
            ['title', 'data-i18n-title'],
            ['alt', 'data-i18n-alt'],
          ];

          for (const [attr, dataAttr] of attrMap) {
            document.querySelectorAll('[' + dataAttr + ']').forEach((el) => {
              const key = el.getAttribute(dataAttr);
              el.setAttribute(attr, t(key));
            });
          }

          const sel = document.getElementById('zr-lang-select');
          if (sel) sel.value = current;

          const lbl = document.getElementById('zr-lang-label');
          if (lbl) lbl.textContent = t('lang_label');
        };

        const setLocale = (next) => {
          current = normalizeLocale(next) || DEFAULT;
          localStorage.setItem('zr_locale', current);
          apply();
          document.dispatchEvent(new CustomEvent('zr:langchange', { detail: { locale: current } }));
        };

        window.ZR_I18N = { t, setLocale, getLocale: () => current, supported: SUPPORTED };
        window.t = t;

        const onReady = () => {
          apply();
          const sel = document.getElementById('zr-lang-select');
          if (sel) sel.addEventListener('change', (e) => setLocale(e.target.value));
        };

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', onReady);
        } else {
          onReady();
        }
      })();
