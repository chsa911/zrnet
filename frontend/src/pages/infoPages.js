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

  impressum: {
  titleKey: "info.impressum.title",
  blocks: [
    { type: "h2", key: "info.impressum.owner" },
    { type: "lines", keys: ["info.impressum.name", "info.impressum.street", "info.impressum.city"] },
    { type: "p", key: "info.impressum.email" },
    { type: "p", key: "info.impressum.disclaimer" },
  ],
},
  datenschutz: {
    titleKey: "info.privacy.title",
    blocks: [
      { type: "h2", key: "info.privacy.controller_h" },
      { type: "p", key: "info.privacy.controller_p" },
      { type: "h2", key: "info.privacy.rights_h" },
      { type: "p", key: "info.privacy.rights_p" },
      { type: "callout", key: "info.privacy.contact_callout" },
    ],
  },
};
