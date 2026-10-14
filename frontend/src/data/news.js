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
    id: "lesetagebuch",
    date: "2026-10-14",
    link: { to: "/reading-diary" },
    de: {
      tag: "Lesetagebuch",
      title: "Neu: Mein Lesetagebuch",
      text: [
        "Unter „Lesetagebuch“ im Menü siehst du jetzt Woche für Woche, was ich zu Ende gelesen und was ich abgebrochen habe, welche Bücher neu dazugekommen sind, wo ich Daten ergänzt habe und welche Bücher ich registriert habe.",
        "Die Zahlen kommen live aus meiner Sammlung. Mit den Pfeilen blätterst du durch die Wochen, darunter findest du die letzten zwölf Wochen im Überblick.",
      ],
      linkLabel: "Zum Lesetagebuch",
    },
    en: {
      tag: "Reading diary",
      title: "New: my reading diary",
      text: [
        "Under “Reading diary” in the menu you can now see week by week what I finished and what I put down, which new books arrived, where I added data and which books I registered.",
        "The numbers come live from my collection. Use the arrows to move between weeks, and below you'll find an overview of the last twelve weeks.",
      ],
      linkLabel: "Go to the reading diary",
    },
    es: {
      tag: "Diario de lectura",
      title: "Nuevo: mi diario de lectura",
      text: [
        "En «Diario de lectura» del menú ves ahora semana a semana lo que terminé y lo que abandoné, qué libros nuevos llegaron, dónde añadí datos y qué libros registré.",
        "Las cifras vienen en directo de mi colección. Con las flechas pasas de una semana a otra y debajo tienes un resumen de las últimas doce semanas.",
      ],
      linkLabel: "Ver el diario de lectura",
    },
    fr: {
      tag: "Journal de lecture",
      title: "Nouveau : mon journal de lecture",
      text: [
        "Sous « Journal de lecture » dans le menu, tu vois maintenant semaine après semaine ce que j’ai terminé et abandonné, les nouveaux livres arrivés, les données ajoutées et les livres enregistrés.",
        "Les chiffres viennent en direct de ma collection. Avec les flèches, tu passes d’une semaine à l’autre, et en dessous tu trouves un aperçu des douze dernières semaines.",
      ],
      linkLabel: "Voir le journal de lecture",
    },
    "pt-BR": {
      tag: "Diário de leitura",
      title: "Novo: meu diário de leitura",
      text: [
        "Em “Diário de leitura” no menu você vê agora, semana a semana, o que terminei e o que abandonei, quais livros novos chegaram, onde acrescentei dados e quais livros registrei.",
        "Os números vêm ao vivo da minha coleção. Com as setas você navega entre as semanas e, logo abaixo, encontra um resumo das últimas doze semanas.",
      ],
      linkLabel: "Ver o diário de leitura",
    },
  },
  {
    id: "autoren-statistik",
    date: "2026-10-11",
    link: { to: "/author-stats" },
    de: {
      tag: "Autoren",
      title: "Neu: Welche Autoren ich gelesen habe",
      text: [
        "Unter „Autoren“ im Menü siehst du jetzt für jeden Autor, wie viele seiner Bücher ich beendet und wie viele ich abgebrochen habe, wie viele davon Top-Titel sind und wann ich zuletzt ein Buch von ihm beendet oder abgebrochen habe.",
        "Du kannst die Liste nach A–Z, nach der Zahl der gelesenen Bücher oder nach der letzten Aktivität sortieren und nach einzelnen Autoren suchen.",
      ],
      linkLabel: "Zur Autorenübersicht",
    },
    en: {
      tag: "Authors",
      title: "New: the authors I have read",
      text: [
        "Under “Authors” in the menu you can now see for every author how many of their books I finished and how many I abandoned, how many are top titles, and when I last finished or abandoned one of their books.",
        "Sort the list A–Z, by number of books read or by last activity, and search for individual authors.",
      ],
      linkLabel: "Go to the author overview",
    },
    es: {
      tag: "Autores",
      title: "Nuevo: los autores que he leído",
      text: [
        "En «Autores» del menú ves ahora para cada autor cuántos de sus libros terminé y cuántos abandoné, cuántos son títulos top y cuándo terminé o abandoné por última vez uno de sus libros.",
        "Puedes ordenar la lista de la A a la Z, por número de libros leídos o por última actividad, y buscar autores concretos.",
      ],
      linkLabel: "Ver los autores",
    },
    fr: {
      tag: "Auteurs",
      title: "Nouveau : les auteurs que j’ai lus",
      text: [
        "Sous « Auteurs » dans le menu, tu vois maintenant pour chaque auteur combien de ses livres j’ai terminés et abandonnés, combien sont des titres top, et quand j’ai terminé ou abandonné l’un de ses livres pour la dernière fois.",
        "Tu peux trier la liste de A à Z, par nombre de livres lus ou par dernière activité, et chercher un auteur précis.",
      ],
      linkLabel: "Voir les auteurs",
    },
    "pt-BR": {
      tag: "Autores",
      title: "Novo: os autores que eu li",
      text: [
        "Em “Autores” no menu você vê agora, para cada autor, quantos livros dele eu terminei e quantos abandonei, quantos são títulos top e quando terminei ou abandonei um livro dele pela última vez.",
        "Ordene a lista de A a Z, pelo número de livros lidos ou pela última atividade, e pesquise autores específicos.",
      ],
      linkLabel: "Ver os autores",
    },
  },
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
        "Hier erfährst du ab sofort, was sich bei Christophers Pages tut – neue Funktionen, Neuzugänge in der Sammlung und alles, was für dich als Leserin oder Leser interessant ist.",
      ],
    },
    en: {
      tag: "Website",
      title: "New: the news page",
      text: [
        "From now on, this is where you'll find out what's happening at Christophers Pages – new features, new arrivals in the collection and anything else worth knowing for readers.",
      ],
    },
    es: {
      tag: "Web",
      title: "Novedad: la página de noticias",
      text: [
        "A partir de ahora encontrarás aquí lo que pasa en Christophers Pages: nuevas funciones, nuevas incorporaciones a la colección y todo lo que interesa a los lectores.",
      ],
    },
    fr: {
      tag: "Site",
      title: "Nouveau : la page d’actualités",
      text: [
        "Désormais, c’est ici que tu découvres ce qui se passe chez Christophers Pages : nouvelles fonctions, nouveaux livres dans la collection et tout ce qui intéresse les lecteurs.",
      ],
    },
    "pt-BR": {
      tag: "Site",
      title: "Novidade: a página de notícias",
      text: [
        "A partir de agora, é aqui que você fica sabendo o que acontece no Christophers Pages – novas funções, novos livros na coleção e tudo o que interessa a leitores.",
      ],
    },
  },
];

export default NEWS;
