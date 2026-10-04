// Content collections. Every record is validated at build time, so a typo in a data
// file fails the build instead of shipping. Data lives in src/data (single-entry files)
// and src/content (one file per record).
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const linkKind = z.enum(['internal', 'ext', 'pdf', 'video']);
const navLink = z.object({
  label: z.string(),
  meta: z.string().optional(),
  href: z.string().optional(),
  service: z.string().optional(),
  kind: linkKind.default('internal')
});

const settings = defineCollection({
  loader: file('src/data/settings.yaml'),
  schema: z.object({
    admissions: z.object({
      state: z.enum(['closed', 'open', 'opening']),
      statusText: z.string().default(''),
      enquiryOnPage: z.boolean().default(false)
    }),
    forms: z.object({ mode: z.enum(['demo', 'live']) }),
    facilityDrafts: z.boolean(),
    songRecording: z.string().nullable()
  })
});

const school = defineCollection({
  loader: file('src/data/school.yaml'),
  schema: z.object({
    name: z.string(),
    fullName: z.string(),
    tagline: z.string(),
    affiliationNo: z.string(),
    schoolCode: z.string(),
    founded: z.number(),
    trust: z.string(),
    url: z.string().url(),
    address: z.object({
      name: z.string(),
      street: z.string(),
      city: z.string(),
      region: z.string(),
      postalCode: z.string(),
      disclosure: z.string()
    }),
    phones: z.array(z.object({ display: z.string(), tel: z.string() })),
    whatsapp: z.object({ display: z.string(), href: z.string().url() }),
    email: z.string().email(),
    hours: z.array(z.object({ days: z.string(), daysLong: z.string().optional(), time: z.string() })),
    principalMeeting: z.string(),
    social: z.object({ facebook: z.string().url(), youtube: z.string().url() }),
    values: z.array(z.string())
  })
});

const services = defineCollection({
  loader: file('src/data/services.yaml'),
  schema: z.object({
    label: z.string(),
    description: z.string(),
    url: z.string().url(),
    kind: z.enum(['external', 'pdf', 'video']),
    domain: z.string(),
    size: z.string().optional()
  })
});

const navigation = defineCollection({
  loader: file('src/data/navigation.yaml'),
  schema: z.object({
    sections: z.array(
      z.object({
        key: z.string(),
        label: z.string(),
        /** A fuller name for links to the hub (e.g. "School Information"); the extra words are visually hidden. */
        fullLabel: z.string().optional(),
        hub: z.string(),
        eyebrow: z.string(),
        title: z.string(),
        intro: z.string(),
        lead: z.object({ label: z.string(), href: z.string() }).optional(),
        cols: z.number().int().min(1).max(3),
        years: z.boolean().default(false),
        groups: z.array(z.object({ label: z.string().optional(), links: z.array(navLink) })).default([]),
        facilityGroups: z.array(z.object({ label: z.string(), group: z.enum(['learn', 'grow']) })).default([]),
        photo: z.string(),
        caption: z.string()
      })
    ),
    searchQuickLinks: z.array(navLink),
    footer: z.object({ ourSchool: z.array(navLink), quickLinks: z.array(navLink) })
  })
});

const facilities = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/facilities' }),
  schema: z.object({
    num: z.string(),
    name: z.string(),
    atlasName: z.string().optional(),
    alt: z.string().optional(),
    short: z.string(),
    group: z.enum(['learn', 'grow']),
    descriptor: z.string(),
    atlasDesc: z.string(),
    atlasPlaceholder: z.boolean().default(false),
    atlasPhoto: z.string(),
    homePhoto: z.string(),
    photoNeeded: z.boolean().default(false),
    photos: z.array(z.string()),
    facts: z.array(z.object({ value: z.string(), unit: z.string(), label: z.string(), source: z.string() })).default([]),
    what: z.array(z.string()).default([]),
    how: z.array(z.string()).default([]),
    features: z.array(z.string()).default([]),
    pending: z
      .object({
        what: z.string().optional(),
        how: z.string().optional(),
        howItems: z.array(z.string()).default([]),
        features: z.string().optional()
      })
      .optional(),
    related: z.array(z.string()).default([])
  })
});

const results = defineCollection({
  loader: file('src/data/results.yaml'),
  schema: z.object({
    classX: z.array(z.object({ year: z.number(), registered: z.number(), passed: z.number(), passPct: z.string(), remarks: z.string() })),
    firstBatch: z.object({ year: z.string(), passPct: z.string() }),
    distribution: z.object({ year: z.number(), bands: z.array(z.object({ band: z.string(), students: z.number() })) }),
    achievers: z.object({ year: z.number(), list: z.array(z.object({ name: z.string(), score: z.string() })) }),
    banners: z.array(z.object({ year: z.string(), file: z.string(), rows: z.array(z.object({ name: z.string(), score: z.string() })) })).default([])
  })
});

const stat = z.object({
  value: z.string(), unit: z.string().optional(), unitSm: z.string().optional(),
  label: z.string(), labelSm: z.string().optional(),
  detail: z.string().optional(), detailSm: z.string().optional(),
  source: z.string(), sourceSm: z.string().optional()
});

const home = defineCollection({
  loader: file('src/data/home.yaml'),
  schema: z.object({
    hero: z.object({
      eyebrow: z.string(), titleLine1: z.string(), titleEm: z.string(), titleLine2: z.string(), lead: z.string(),
      primary: z.object({ label: z.string(), href: z.string() }), tour: z.string(), photo: z.string(), photoAlt: z.string()
    }),
    values: z.array(z.object({ word: z.string(), line: z.string(), sm: z.string() })),
    idea: z.object({ quoteStart: z.string(), quoteEm: z.string(), body: z.string() }),
    vision: z.string(),
    mission: z.array(z.string()),
    journey: z.array(z.object({
      num: z.string(), label: z.string(), range: z.string(), title: z.string(), cta: z.string(), href: z.string(),
      photo: z.string(), photoPinned: z.string().optional(), text: z.string()
    })),
    stats: z.array(stat),
    campusScenes: z.array(z.object({ verb: z.string(), places: z.string(), photo: z.string(), photoSm: z.string().optional(), cta: z.string(), href: z.string() })),
    campusPhoto: z.string(),
    campusPhotoSm: z.string(),
    life: z.object({
      album: z.object({ year: z.string(), slug: z.string(), title: z.string(), yearLabel: z.string(), count: z.number() }),
      photos: z.array(z.string()), photoSm: z.string(), recentYear: z.string(), recent: z.array(z.string()), activities: z.array(z.string())
    }),
    admissionSteps: z.array(z.object({ title: z.string(), note: z.string().optional() })),
    closing: z.object({ visit: z.object({ label: z.string(), href: z.string() }) })
  })
});

const about = defineCollection({
  loader: file('src/data/about.yaml'),
  schema: z.object({
    hero: z.object({
      title: z.string(), titleEm: z.string(), lead: z.string(), photo: z.string(), photoSm: z.string(), photoAlt: z.string(),
      facts: z.array(z.object({ label: z.string(), value: z.string() }))
    }),
    intro: z.string(),
    milestones: z.array(z.object({ year: z.string(), text: z.string() })),
    beyond: z.object({
      sports: z.array(z.string()), activities: z.array(z.string()),
      photos: z.array(z.object({ label: z.string(), labelSm: z.string().optional(), alt: z.string(), altSm: z.string().optional(), caption: z.string() })),
      closing: z.string()
    }),
    logo: z.object({ eyebrow: z.string(), title: z.string(), ken: z.string(), bridge: z.string(), note: z.string() })
  })
});

const founder = defineCollection({
  loader: file('src/data/founder.yaml'),
  schema: z.object({
    name: z.string(), honorific: z.string(), roles: z.array(z.string()), motto: z.string(), mottoCaption: z.string(),
    lead: z.string(), paragraphs: z.array(z.string()), closing: z.string(), words: z.array(z.string()), excerpt: z.string()
  })
});

const principal = defineCollection({
  loader: file('src/data/principal.yaml'),
  schema: z.object({
    name: z.string(), role: z.string(), qualifications: z.string(), opening: z.string(), openingEm: z.string(),
    paragraphs: z.array(z.string()), quote: z.string(), quoteCaption: z.string(), signOff: z.string(), excerpt: z.string(),
    facts: z.array(z.object({ label: z.string(), value: z.string(), note: z.string().optional() }))
  })
});

const learning = defineCollection({
  loader: file('src/data/learning.yaml'),
  schema: z.object({
    eyebrow: z.string(), title: z.string(), introLabel: z.string(), intro: z.string(), introMuted: z.string(),
    stagesTitle: z.string(), stagesHint: z.string(),
    promises: z.object({
      eyebrow: z.string(), title: z.string(), titleEm: z.string(),
      items: z.array(z.object({ title: z.string(), text: z.string(), muted: z.string().optional() }))
    }),
    ages: z.object({
      eyebrow: z.string(), title: z.string(), note: z.string(),
      cta: z.object({ label: z.string(), href: z.string() }),
      list: z.array(z.object({ label: z.string(), years: z.string() }))
    })
  })
});

const label = z.object({ label: z.string(), value: z.string() });
// ProgramDetail chapter types (the board's five): subjects · activities · words · statement · age.
const chapter = z.object({
  type: z.enum(['subjects', 'activities', 'words', 'statement', 'age']),
  title: z.string(),
  intro: z.string().optional(),
  listLabel: z.string().optional(),
  items: z.array(z.object({ name: z.string(), note: z.string().optional() })).default([]),
  words: z.array(z.string()).default([]),
  calloutKicker: z.string().optional(),
  callout: z.string().optional(),
  facts: z.array(label).default([]),
  after: z.string().optional(),
  statement: z.string().optional(),
  ages: z.array(z.object({ label: z.string(), years: z.string() })).default([]),
  ageNote: z.string().optional()
});

const programmes = defineCollection({
  loader: glob({ pattern: '*.yaml', base: 'src/content/programmes' }),
  schema: z.object({
    stage: z.number().int().min(1).max(4),
    num: z.string(),
    name: z.string(),
    range: z.string(),
    hub: z.object({
      lead: z.string(), classes: z.array(z.string()), focus: z.array(z.string()), next: z.string(), cta: z.string(),
      photo: z.string(), photoSm: z.string()
    }),
    eyebrow: z.string(),
    chip: z.string(),
    lead: z.string(),
    heroPhoto: z.string(),
    facts: z.array(label).default([]),
    resultsFacts: z.boolean().default(false),
    admissionCta: z.string().optional(),
    chapters: z.array(chapter),
    related: z.array(z.object({ facility: z.string(), photo: z.string().optional(), photoSm: z.string().optional() })).default([])
  })
});

const campus = defineCollection({
  loader: file('src/data/campus.yaml'),
  schema: z.object({
    hero: z.object({ title: z.string(), lead: z.string(), photo: z.string(), photoSm: z.string(), alt: z.string(), explore: z.string(), tour: z.string() }),
    figures: z.object({
      title: z.string(), source: z.string(),
      items: z.array(z.object({ value: z.string(), unit: z.string().optional(), label: z.string(), note: z.string().optional(), icon: z.literal('globe').optional() }))
    }),
    scenes: z.object({
      eyebrow: z.string(), title: z.string(),
      list: z.array(z.object({ verb: z.string(), places: z.string(), photo: z.string(), text: z.string(), facilities: z.array(z.string()) }))
    }),
    atlas: z.object({
      eyebrow: z.string(), title: z.string(), hint: z.string(),
      also: z.object({ name: z.string(), text: z.string(), photo: z.string() })
    }),
    closing: z.object({
      tourEyebrow: z.string(), tourTitle: z.string(), tourThumb: z.string(), eyebrow: z.string(), title: z.string(), text: z.string(),
      directions: z.object({ label: z.string(), href: z.string() })
    })
  })
});

const admissions = defineCollection({
  loader: file('src/data/admissions.yaml'),
  schema: z.object({
    title: z.string(),
    ctas: z.object({ enquire: z.string(), call: z.string(), brochure: z.string() }),
    glance: z.object({ title: z.string(), ages: z.string() }),
    jumps: z.array(z.object({ id: z.string(), label: z.string() })),
    age: z.object({
      eyebrow: z.string(), title: z.string(), intro: z.string(),
      ages: z.array(z.object({ cls: z.string(), years: z.string(), programme: z.string() })),
      strictLead: z.string(), strict: z.string()
    }),
    procedure: z.object({
      eyebrow: z.string(), title: z.string(), note: z.string(),
      steps: z.array(z.object({ title: z.string(), summary: z.string(), details: z.array(z.object({ lead: z.string().optional(), text: z.string() })) }))
    }),
    notes: z.object({ title: z.string(), items: z.array(z.string()) }),
    docs: z.object({ title: z.string(), subtitle: z.string(), print: z.string(), items: z.array(z.object({ title: z.string(), note: z.string() })), pending: z.string() }),
    faq: z.object({ title: z.string(), intro: z.string(), items: z.array(z.object({ q: z.string(), a: z.string() })) }),
    enquire: z.object({ title: z.string(), intro: z.string(), externalLead: z.string(), externalNote: z.string() }),
    office: z.object({ title: z.string() }),
    classes: z.array(z.string())
  })
});

const achievements = defineCollection({
  loader: file('src/data/achievements.yaml'),
  schema: z.object({
    title: z.string(), lead: z.string(),
    howTo: z.object({ title: z.string(), text: z.string() }),
    achievers: z.object({
      eyebrow: z.string(), source: z.string(), sourceSm: z.string(), portrait: z.string(), portraitSm: z.string(),
      distTitle: z.string(), distSub: z.string(), distSource: z.string()
    }),
    annual: z.object({
      eyebrow: z.string(), title: z.string(), source: z.string(),
      chartTitle: z.string(), chartSub: z.string(), chartSource: z.string(), chartSourceSm: z.string()
    }),
    archive: z.object({ eyebrow: z.string(), title: z.string(), intro: z.string(), introSm: z.string() }),
    beyond: z.object({
      eyebrow: z.string(), title: z.string(), namedLabel: z.string(),
      albums: z.array(z.object({ name: z.string(), year: z.string(), count: z.string(), href: z.string() }))
    })
  })
});

const gallery = defineCollection({
  loader: file('src/data/gallery.yaml'),
  schema: z.object({
    categories: z.array(z.string()),
    categoryOf: z.record(z.string(), z.string()),
    years: z.array(z.object({ year: z.string(), lead: z.string(), more: z.boolean().default(false), albums: z.array(z.string()) })),
    albums: z.array(z.object({
      year: z.string(), slug: z.string(), name: z.string(), date: z.string(), more: z.array(z.string()).default([]),
      photos: z.array(z.object({ file: z.string(), ratio: z.number(), alt: z.string().optional(), caption: z.string().optional() }))
    }))
  })
});

const info = defineCollection({
  loader: file('src/data/information.yaml'),
  schema: z.object({
    hub: z.object({
      title: z.string(), lead: z.string(),
      groups: z.array(z.object({ label: z.string(), items: z.array(z.object({ icon: z.string(), title: z.string(), desc: z.string().optional(), quote: z.string().optional(), by: z.string().optional(), href: z.string() })) })),
      downloads: z.array(z.object({ title: z.string(), desc: z.string(), kind: z.enum(['pdf', 'external']), service: z.string().optional() }))
    }),
    timings: z.object({
      title: z.string(), meta: z.string(),
      terms: z.array(z.object({ label: z.string(), months: z.string(), span: z.number() })),
      months: z.array(z.string()),
      morning: z.array(z.object({ label: z.string(), time: z.string(), ampm: z.string() })),
      byClass: z.array(z.object({ classes: z.string(), days: z.string(), hours: z.string(), lunch: z.string() })),
      periods: z.array(z.object({ label: z.string(), short: z.string(), from: z.string(), to: z.string(), time: z.string(), min: z.number(), break: z.boolean().default(false) })),
      dayStart: z.string(), dayEnd: z.string(),
      office: z.object({ title: z.string(), text: z.string() }),
      printFooter: z.string()
    }),
    rules: z.object({
      title: z.string(), meta: z.string(),
      groups: z.array(z.object({ id: z.string(), title: z.string(), range: z.string(), parents: z.boolean().default(false), rules: z.array(z.object({ n: z.string(), text: z.string() })) }))
    }),
    decorum: z.object({
      title: z.string(), lead: z.string(),
      attendance: z.object({ label: z.string(), value: z.number(), note: z.string() }),
      sections: z.array(z.object({ id: z.string(), letter: z.string(), title: z.string(), points: z.array(z.object({ id: z.string(), title: z.string(), text: z.string(), list: z.array(z.string()).default([]) })) }))
    }),
    song: z.object({
      title: z.string(), kicker: z.string(), recording: z.object({ meta: z.string() }),
      stanzas: z.array(z.object({ label: z.string(), lines: z.array(z.string()), refrain: z.array(z.number()).default([]), chorus: z.boolean().default(false), closing: z.boolean().default(false) }))
    }),
    prayer: z.object({ title: z.string(), kicker: z.string(), subtitle: z.string(), author: z.string(), lines: z.array(z.string()) }),
    disclosure: z.object({
      title: z.string(), lead: z.string(), updated: z.string(),
      general: z.array(z.object({ label: z.string(), value: z.string().optional(), href: z.string().optional(), phones: z.array(z.object({ display: z.string(), tel: z.string() })).optional(), note: z.string().optional() })),
      documents: z.array(z.object({ title: z.string(), kind: z.enum(['pdf', 'na', 'unavailable']), note: z.string().optional(), href: z.string().optional() })),
      academics: z.array(z.object({ title: z.string(), kind: z.enum(['pdf', 'na', 'unavailable']), note: z.string().optional(), href: z.string().optional() })),
      staff: z.array(z.object({ role: z.string(), value: z.string(), details: z.string().optional() })),
      infrastructure: z.array(z.object({ label: z.string(), value: z.string() }))
    })
  })
});

const contact = defineCollection({
  loader: file('src/data/contact.yaml'),
  schema: z.object({
    contact: z.object({
      title: z.string(), lead: z.string(),
      photo: z.object({ label: z.string(), alt: z.string() }),
      phoneNotes: z.array(z.string()),
      meeting: z.string(),
      map: z.object({ directions: z.string().url(), embed: z.string().url(), iframeTitle: z.string(), note: z.string(), drawingLabel: z.string() }),
      form: z.object({ title: z.string(), intro: z.string(), introLink: z.string(), introAfter: z.string() }),
      shortcuts: z.array(z.object({ icon: z.string(), title: z.string(), desc: z.string(), service: z.string(), domain: z.string().optional() }))
    }),
    services: z.object({
      title: z.string(), lead: z.string(),
      mostUsed: z.array(z.string()),
      groups: z.array(z.object({
        id: z.string(), title: z.string(), note: z.string(),
        items: z.array(z.object({
          service: z.string().optional(), icon: z.string(), title: z.string().optional(), desc: z.string().optional(),
          kind: z.enum(['external', 'pdf']).optional(), domain: z.string().optional()
        }))
      })),
      legend: z.object({ external: z.string(), pdf: z.string(), signins: z.string() }),
      app: z.object({ title: z.string(), lead: z.string(), playBadge: z.string(), appleBadge: z.string(), qrTitle: z.string(), qrNote: z.string() })
    })
  })
});

const photos = defineCollection({
  loader: file('src/data/photos.yaml'),
  schema: z.object({ alt: z.record(z.string(), z.string()) })
});

export const collections = {
  photos, settings, school, services, navigation, facilities, results, home, about, founder, principal, learning, programmes, campus, admissions, achievements, gallery, info, contact
};