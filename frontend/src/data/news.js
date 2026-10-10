// Neuigkeiten für die News-Seite (/news).
//
// Neue Meldung hinzufügen: einfach einen Eintrag oben in die Liste kopieren.
// - id:    kurzer eindeutiger Name, wird als Anker genutzt (/news#<id>)
// - date:  Datum im Format JJJJ-MM-TT (die Liste wird automatisch neueste zuerst sortiert)
// - link:  optional, { href, to } – "to" für interne Seiten, "href" für externe/E-Mail
// - Texte pro Sprache (de, en, es, fr, pt-BR). Fehlt eine Sprache, wird Englisch,
//   sonst Deutsch angezeigt. "text" darf mehrere Absätze haben (Array).

const BETA_MAIL =
  "mailto:christopher@christopherspages.com?subject=Interesse%20an%20PagesInLine%20Testzugang";

const NEWS = [
  {
    id: "datenbank-suche",
    date: "2026-10-10",
    link: { to: "/collection" },
    de: {
      tag: "Sammlung",
      title: "Ab jetzt durchsuchbar: meine Bücherdatenbank",
      text: [
        "Ab jetzt kann meine Datenbank durchsucht werden – nach tollen Büchern, Autorinnen und Autoren. Stöbere in meiner Sammlung und finde dein nächstes Lieblingsbuch.",
      ],
      linkLabel: "Jetzt in der Sammlung suchen",
    },
    en: {
      tag: "Collection",
      title: "Now searchable: my book database",
      text: [
        "From now on you can search my database for great books and authors. Browse my collection and find your next favourite book.",
      ],
      linkLabel: "Search the collection",
    },
    es: {
      tag: "Colección",
      title: "Ya se puede buscar en mi base de datos de libros",
      text: [
        "A partir de ahora puedes buscar en mi base de datos grandes libros y autores. Explora mi colección y encuentra tu próximo libro favorito.",
      ],
      linkLabel: "Buscar en la colección",
    },
    fr: {
      tag: "Collection",
      title: "Désormais consultable : ma base de livres",
      text: [
        "Tu peux désormais chercher de super livres et auteurs dans ma base de données. Parcours ma collection et trouve ton prochain livre préféré.",
      ],
      linkLabel: "Chercher dans la collection",
    },
    "pt-BR": {
      tag: "Coleção",
      title: "Agora pesquisável: meu banco de livros",
      text: [
        "A partir de agora você pode pesquisar ótimos livros e autores no meu banco de dados. Explore minha coleção e encontre seu próximo livro favorito.",
      ],
      linkLabel: "Pesquisar na coleção",
    },
  },
  {
    id: "news-seite",
    date: "2026-10-10",
    de: {
      tag: "Website",
      title: "Neu: Die News-Seite",
      text: [
        "Hier erfährst du ab sofort, was sich bei Christophers Pages und PagesInLine tut – neue Funktionen, Neuzugänge in der Sammlung und alles, was für dich als Leserin oder Leser interessant ist.",
      ],
    },
    en: {
      tag: "Website",
      title: "New: the news page",
      text: [
        "From now on, this is where you'll find out what's happening at Christophers Pages and PagesInLine – new features, new arrivals in the collection and anything else worth knowing for readers.",
      ],
    },
    es: {
      tag: "Web",
      title: "Novedad: la página de noticias",
      text: [
        "A partir de ahora encontrarás aquí lo que pasa en Christophers Pages y PagesInLine: nuevas funciones, nuevas incorporaciones a la colección y todo lo que interesa a los lectores.",
      ],
    },
    fr: {
      tag: "Site",
      title: "Nouveau : la page d’actualités",
      text: [
        "Désormais, c’est ici que tu découvres ce qui se passe chez Christophers Pages et PagesInLine : nouvelles fonctions, nouveaux livres dans la collection et tout ce qui intéresse les lecteurs.",
      ],
    },
    "pt-BR": {
      tag: "Site",
      title: "Novidade: a página de notícias",
      text: [
        "A partir de agora, é aqui que você fica sabendo o que acontece no Christophers Pages e no PagesInLine – novas funções, novos livros na coleção e tudo o que interessa a leitores.",
      ],
    },
  },
  {
    id: "testzugang",
    date: "2026-03-12",
    link: { href: BETA_MAIL },
    de: {
      tag: "PagesInLine",
      title: "Erste Testzugänge für PagesInLine",
      text: [
        "Der Kern von PagesInLine funktioniert: Bücher per Smartphone erfassen, eindeutig zuordnen und den Lesefortschritt sichtbar halten.",
        "Jetzt suchen wir erste Nutzerinnen und Nutzer – besonders Vielleser, Pendler und alle mit vielen eigenen Büchern zuhause –, um den Ablauf im echten Lesealltag zu prüfen. Schreib uns per E-Mail, wenn du dabei sein möchtest.",
      ],
      linkLabel: "Testzugang per E-Mail anfragen",
    },
    en: {
      tag: "PagesInLine",
      title: "First test access for PagesInLine",
      text: [
        "The core of PagesInLine works: capture books with your smartphone, identify them clearly and keep your reading progress visible.",
        "We're now looking for first users – especially avid readers, commuters and anyone with lots of books at home – to try it in everyday reading. Send us an email if you'd like to take part.",
      ],
      linkLabel: "Request test access by email",
    },
    es: {
      tag: "PagesInLine",
      title: "Primeros accesos de prueba para PagesInLine",
      text: [
        "El núcleo de PagesInLine ya funciona: registrar libros con el móvil, identificarlos con claridad y mantener visible tu progreso de lectura.",
        "Buscamos a los primeros usuarios –sobre todo grandes lectores, personas que viajan a diario y quienes tienen muchos libros en casa– para probarlo en la lectura diaria. Escríbenos si quieres participar.",
      ],
      linkLabel: "Solicitar acceso por correo",
    },
    fr: {
      tag: "PagesInLine",
      title: "Premiers accès test pour PagesInLine",
      text: [
        "Le cœur de PagesInLine fonctionne : enregistrer ses livres avec le smartphone, les identifier clairement et garder sa progression de lecture en vue.",
        "Nous cherchons maintenant les premiers utilisateurs – grands lecteurs, pendulaires et tous ceux qui ont beaucoup de livres chez eux – pour le tester au quotidien. Écris-nous si tu veux participer.",
      ],
      linkLabel: "Demander un accès par e-mail",
    },
    "pt-BR": {
      tag: "PagesInLine",
      title: "Primeiros acessos de teste ao PagesInLine",
      text: [
        "O núcleo do PagesInLine já funciona: cadastrar livros pelo celular, identificá-los com clareza e manter seu progresso de leitura visível.",
        "Agora procuramos os primeiros usuários – principalmente quem lê muito, quem passa tempo no transporte e quem tem muitos livros em casa – para testar no dia a dia. Mande um e-mail se quiser participar.",
      ],
      linkLabel: "Pedir acesso por e-mail",
    },
  },
];

export default NEWS;
