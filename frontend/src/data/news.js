// Neuigkeiten für die News-Seite (/news).
//
// Neue Meldung hinzufügen: einfach einen Eintrag oben in die Liste kopieren.
// - id:    kurzer eindeutiger Name, wird als Anker genutzt (/news#<id>)
// - date:  Datum im Format JJJJ-MM-TT (die Liste wird automatisch neueste zuerst sortiert)
// - link:  optional, { href, to } – "to" für interne Seiten, "href" für externe/E-Mail
// - Texte pro Sprache (de, en, es, fr, pt-BR). Fehlt eine Sprache, wird Englisch,
//   sonst Deutsch angezeigt. "text" darf mehrere Absätze haben (Array).

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
];

export default NEWS;
