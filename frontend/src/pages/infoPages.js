// One React "InfoPage" can render many static information pages.
// Each page is described as a list of blocks to render.

export const INFO_PAGES = {
  technik: {
    titleKey: "info.technik.title",
    blocks: [
      { type: "p", key: "info.technik.p1" },
      { type: "p", key: "info.technik.p2" },
      { type: "p", key: "info.technik.p3" },
      {
        type: "img",
        src: "/assets/images/allgemein/hosentasche.jpeg",
        altKey: "info.technik.img_pocket_alt",
      },
      { type: "p", key: "info.technik.p4" },
      { type: "callout", key: "info.technik.callout" },
    ],
  },

  ausruestung: {
    titleKey: "info.ausruestung.title",
    blocks: [
      { type: "p", key: "info.ausruestung.p1" },

      { type: "h2", key: "info.ausruestung.h_markers" },
      {
        type: "img",
        src: "/assets/images/allgemein/markierstifte.jpeg",
        altKey: "info.ausruestung.img_markers_alt",
      },
      { type: "p", key: "info.ausruestung.p_markers" },

      { type: "h2", key: "info.ausruestung.h_ducktape" },
      {
        type: "img",
        src: "/assets/images/allgemein/packband.jpeg",
        altKey: "info.ausruestung.img_ducktape_alt",
      },
      { type: "p", key: "info.ausruestung.p_ducktape" },

      { type: "h2", key: "info.ausruestung.h_bookshelf" },
      {
        type: "img",
        src: "/assets/images/allgemein/buecherschrank.jpeg",
        altKey: "info.ausruestung.img_bookshelf_alt",
      },
      { type: "p", key: "info.ausruestung.p_bookshelf" },

      { type: "h2", key: "info.ausruestung.h_bag" },
      {
        type: "img",
        src: "/assets/images/allgemein/lesetasche.jpeg",
        altKey: "info.ausruestung.img_bag_alt",
      },
      { type: "p", key: "info.ausruestung.p_bag" },
    ],
  },

  beschaffung: {
    titleKey: "info.beschaffung.title",
    blocks: [
      { type: "p", key: "info.beschaffung.p1" },
      { type: "p", key: "info.beschaffung.p2" },
      { type: "p", key: "info.beschaffung.p3" },
    ],
  },

  faq: {
    titleKey: "info.faq.title",
    blocks: [
      {
        type: "qa",
        items: [
          { qKey: "info.faq.q1", aKey: "info.faq.a1" },
          { qKey: "info.faq.q2", aKey: "info.faq.a2" },
          { qKey: "info.faq.q3", aKey: "info.faq.a3" },
          { qKey: "info.faq.q4", aKey: "info.faq.a4" },
        ],
      },
    ],
  },

  ueber_mich: {
    titleKey: "info.about.title",
    blocks: [
      { type: "lede", key: "info.about.lede" },
      { type: "p", key: "info.about.p1" },
      { type: "p", key: "info.about.p2" },
      { type: "p", key: "info.about.p3" },
      { type: "p", key: "info.about.p4" },
      {
        type: "actions",
        items: [
          { to: "/info/technik", labelKey: "info.about.cta_technique" },
          { to: "/", labelKey: "info.about.cta_home" },
        ],
      },
    ],
  },

  impressum: {
    titleKey: "info.impressum.title",
    blocks: [
      { type: "p", key: "info.impressum.owner" },
      { type: "lines", keys: ["info.impressum.name", "info.impressum.street", "info.impressum.city"] },
      { type: "p", key: "info.impressum.email" },
      { type: "p", key: "info.impressum.disclaimer" },
    ],
  },
};
