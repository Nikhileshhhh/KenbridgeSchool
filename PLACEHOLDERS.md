# Placeholders on the built site

Every `[bracketed placeholder]` the site renders, worded exactly as in the design. Each stays visible until the school supplies the real content; none is ever filled with invented text. `node scripts/check-placeholders.mjs` fails the check if a rendered placeholder is missing from this file.

Source list for the whole design: `../design-handoff/PLACEHOLDERS.md`. This file grows batch by batch as pages are built.

## Global shell (every page)

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Photo · Founder’s portrait, school archive] | About mega menu | Photograph |
| [Caption for the founder’s portrait.] | About mega menu | Caption |
| [Photo · A Primary classroom at work] | Learning mega menu | Photograph |
| [Caption: class, subject, term.] | Learning mega menu | Caption |
| [Photo · The school campus from the playground] | Campus mega menu | Photograph |
| [Caption for the campus photograph.] | Campus mega menu | Caption |
| [Photo · Parents and a child at the school reception] | Admissions mega menu | Photograph |
| [Caption for the admissions photograph.] | Admissions mega menu | Caption |
| [File size] | Admissions mega menu · Download Brochure | Brochure PDF file size |
| [Photo · Cover photo from the latest album] | Gallery mega menu | Photograph |
| [Album name, 2026–27.] | Gallery mega menu | Album name |
| [Photo · Morning assembly in the courtyard] | Information mega menu | Photograph |
| [Caption for the assembly photograph.] | Information mega menu | Caption |
| [Photo · The school entrance on Shahabad Road] | Contact mega menu | Photograph |
| [Caption for the entrance photograph.] | Contact mega menu | Caption |

## Home (`/`)

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Photo · DSC_9673 / drone front view · blurred 24 px, darkened] | Hero background (desktop) | Original of DSC_9673 |
| [One line on what integrity means at KenBridge, for the school to approve] · [One line on integrity, for the school to approve] | Values (desktop · phone wording) | Approved line (OPEN-QUESTIONS "Value statements") |
| [One line on what compassion means at KenBridge, for the school to approve] · [One line on compassion, for the school to approve] | Values | Approved line |
| [One line on what commitment means at KenBridge, for the school to approve] · [One line on commitment, for the school to approve] | Values | Approved line |
| [Photo · Pre-Primary activity room] · [Photo · Class-Room.jpg] · [Photo · Science lab session] · [Photo · Library-2.jpg] | Learning journey (still and phone forms) | Photographs |
| [Photo · Primary classroom (Class-Room.jpg)] · [Photo · Secondary students in the library (Library-2.jpg)] | Learning journey (pinned scene) | Photographs |
| [Students appeared / passed] · [Appeared / passed] | Proof in numbers · Class X 2025 | Number appeared and passed |
| [Mandatory Public Disclosure] | Proof in numbers · source of campus area, classrooms, labs, teachers | Confirmation of the figures and year |
| [Portrait · Abdullah S. Khan] · [Portrait · Ganesh A Patil] · [Portrait · Basavaprabhu Hiremath] | Achievers 2026 | Portraits, with consent |
| [Photo · DJI_0401 · aerial view of the campus, full bleed] · [Photo · DJI_0401 · aerial] | Campus section | Original of DJI_0401 |
| [Class-Room.jpg · Math-Lab.jpg] · [Class-Room.jpg] · [Indoor-Sports-Room-1.jpg] · [Dance-Room-2.jpg · Music-Room-2.jpg] · [Dance-Room-2.jpg] · [MPH.jpg] | Campus scenes (Learn / Play / Create / Gather) | Photographs |
| [Photo · Drone-Front.jpg] and, as the preview changes, [Photo · Class-Room.jpg], [Photo · [Playground photo]], [Photo · MPH.jpg], [Photo · [Science Lab photo]], [Photo · [Language Lab photo]], [Photo · Math-Lab.jpg], [Photo · Indoor-Sports-Room-1.jpg], [Photo · Dance-Room-2.jpg], [Photo · Library-2.jpg] | Ten places on campus | Photographs; Playground, Science Lab and Language Lab have none yet |
| [Photo · ANNUAL-2025-26SC_01.jpg] · [ANNUAL-2025-26SC_01.jpg] · [Photo · ANNUAL-2025-26SC_07.jpg] · [Photo · SC_11] · [Photo · SC_15] | Life at KenBridge | Annual Day originals |
| [Album cover] | Recent albums (2026–27) | Album covers once the albums are imported |
| [size] | Quick access · Brochure | Brochure PDF file size |
| [YouTube video NA7Ksy1WsnY · campus tour] | Virtual tour dialog | None: the tour plays on YouTube |

## About (`/about`, `/about/founder`, `/about/principal`)

Founder and Principal have no placeholders: the boards draw no portrait or signature, so none is shown (none is invented).

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Photo · Drone-Front.jpg · school front, architectural] · [Photo · Drone-Front.jpg] | Our Story hero background (desktop · phone wording) | Original of Drone-Front.jpg |
| [Photo · playground match] · [Caption · sport, class, year] | Beyond the classroom, large photo | A sports photograph and its caption |
| [Photo · Indoor-Sports-Room-2.jpg] · [Indoor-Sports-Room-2.jpg] · [Caption] | Beyond the classroom (desktop · phone wording) | Original and caption |
| [Photo · Music-Room-2.jpg] · [Music-Room-2.jpg] · [Caption] | Beyond the classroom (desktop · phone wording) | Original and caption |

## Learning (`/learning`, `/learning/[stage]`)

Only Primary is drawn on the boards; the other three stages reuse its template and the same placeholder wording style.

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Photo · Pre-primary activity room (the “a right choice for YOUR BIG DREAMS” image can guide the crop)] · [Photo · Pre-primary activity room] | Learning stage 01 panel (desktop · phone); Pre-Primary hero | Photograph |
| [Photo · Primary classroom (Class-Room.jpg)] | Learning stage 02; Primary hero | Original of Class-Room.jpg |
| [Photo · Middle-school students in the Maths Lab (Math-Lab.jpg)] · [Photo · Maths Lab (Math-Lab.jpg)] | Learning stage 03 (desktop · phone); Middle School hero | Original of Math-Lab.jpg |
| [Photo · Secondary students in the library (Library-2.jpg)] · [Photo · Library (Library-2.jpg)] | Learning stage 04 (desktop · phone); Secondary School hero | Original of Library-2.jpg |
| [School to confirm one line on how it continues through Classes VI–X.] | Every stage, one school · Value Education | One approved line |
| [Photo · Class-Room.jpg] · [Photo · Library-2.jpg] · [Photo · Math-Lab.jpg] · [Photo · Dance-Room-2.jpg / Music-Room-2.jpg] · [Photo · Dance-Room-2.jpg] | Related facilities (Primary; desktop · phone wording for Dance & Music) | Originals |
| [Photo · [Science Lab photo]] · [Photo · [Language Lab photo]] · [Photo · Indoor-Sports-Room-1.jpg] | Related facilities (Middle School, Secondary School) | Photographs; Science Lab and Language Lab have none yet |

Content held back or still to confirm on these pages (see `design-handoff/OPEN-QUESTIONS.md`): teacher–student ratios (#2, hidden), Middle School range VI–VIII (#1), Play Way vs Montessori (#10), Middle and Secondary activity and career-guidance wording (#9), and which facilities relate to Pre-Primary (none linked yet).

## Campus (`/campus`)

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Photo · DJI_0401 / Drone-Front · aerial view of the campus, full bleed] · [Photo · DJI_0401 / Drone-Front · aerial, cropped for portrait] | Hero (desktop · phone) | Originals of DJI_0401 and Drone-Front |
| [Photo · Class-Room.jpg] · [Photo · Indoor-Sports-Room-1.jpg (playground photo needed)] · [Photo · Dance-Room-2.jpg / Music-Room-2.jpg] · [Photo · MPH.jpg] | Learn / Play / Create / Gather scenes | Originals; a playground photograph |
| [Photo · Drone-Front.jpg / DJI_0401] and, as the preview changes, [Photo · Class-Room.jpg], [Photo needed · playground], [Photo · MPH.jpg], [Photo needed · science lab], [Photo needed · language lab], [Photo · Math-Lab.jpg], [Photo · Indoor-Sports-Room-1.jpg], [Photo · Dance-Room-2.jpg / Music-Room-2.jpg], [Photo · Library-2.jpg] | Facility atlas preview (desktop) | Photographs; Playground, Science Lab and Language Lab have none yet |
| [Drone-Front.jpg] · [Class-Room.jpg] · [Photo needed] · [MPH.jpg] · [Math-Lab.jpg] · [Indoor-Sports-Room-1.jpg] · [Dance-Room-2.jpg] · [Library-2.jpg] | Facility atlas thumbnails (phone) | As above |
| [One or two lines from the school.] | Atlas · Language Lab and Maths Lab | One or two approved lines each (OPEN-QUESTIONS #8) |
| [Photo · comp2.jpg, 2015: newer photo needed] | Atlas · Also: Computer Lab | A newer photograph |
| [Thumbnail · YouTube NA7Ksy1WsnY] | Closing · virtual tour card | None: the card is drawn, the video plays on YouTube |
| [YouTube video NA7Ksy1WsnY · campus tour · privacy-enhanced embed] · [YouTube NA7Ksy1WsnY] | Virtual tour dialog (desktop · phone) | None |

## Facility pages (`/campus/[facility]`)

Each hero names its first photo, e.g. [Photo · MPH.jpg · full bleed] on desktop and [Photo · MPH.jpg · portrait crop] on phones; a facility with no photo shows [Photo · photo needed · full bleed] / [Photo · photo needed · portrait crop]. Draft boxes ("Draft · not shown on the live page") appear only while `settings.facilityDrafts` is on (the demo) and are listed in `src/content/facilities/*.yaml` under `pending`.

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Photo · Drone-Front.jpg · full bleed] · [Photo · Drone-Front.jpg · portrait crop] | School Campus hero | Original |
| [Photo · Class-Room.jpg · full bleed] · [Photo · Class-Room.jpg · portrait crop] | Classrooms hero | Original |
| [Photo · MPH.jpg · full bleed] · [Photo · MPH.jpg · portrait crop] | Multipurpose Hall hero | Original |
| [Photo · Math-Lab.jpg · full bleed] · [Photo · Math-Lab.jpg · portrait crop] | Maths Lab hero | Original |
| [Photo · Indoor-Sports-Room-1.jpg · full bleed] · [Photo · Indoor-Sports-Room-1.jpg · portrait crop] | Indoor Sports Room hero | Original |
| [Photo · Dance-Room-2.jpg · full bleed] · [Photo · Dance-Room-2.jpg · portrait crop] | Dance & Music Room hero | Original |
| [Photo · Library-2.jpg · full bleed] · [Photo · Library-2.jpg · portrait crop] | Library hero | Original |
| [Photo · photo needed · full bleed] · [Photo · photo needed · portrait crop] | Playground, Science Lab, Language Lab heroes | Photographs |
| [One line from the school.] | Language Lab and Maths Lab descriptor | One approved line each (OPEN-QUESTIONS #8) |
| [Photo · Indoor-Sports-Room-2.jpg] · [Photo · Indoor-Sports-Room-3.jpg] | Indoor Sports Room · Inside the room | Originals |
| [Photo · Library-3.jpg] · [Photo · lib3.jpg (2015: replace with a newer photo if available)] | Library · Inside the library | Originals; a newer photo for lib3 |
| [Caption from the school: what the photo shows.] | Image story captions | A caption per photo |
| [Photo needed] | Related facilities tiles (Playground, Science Lab, Language Lab) | Photographs |

## Admissions (`/admissions`)

| Placeholder | Where | Needed from the school |
|---|---|---|
| [School to confirm: how many photographs of each, and whether copies or originals are needed.] | Documents checklist | The exact photo counts and whether copies or originals |
| [size] | Brochure link (shared with Home quick access) | Brochure PDF file size |

Content still to confirm on this page (see `design-handoff/OPEN-QUESTIONS.md`): "Nursery & LKG" vs Pre-KG in step 03, Security Deposit vs caution money in the notes and FAQ, and the form backend (the on-page EnquiryForm stays off; `settings.admissions.enquiryOnPage`). The Enquiry form's states are reviewed on `/dev/enquiry-states` (development only).

## Results & Achievements (`/achievements`)

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Portrait · crop from the 2026 banner, with consent] · [Portrait, with consent] | Class X 2026 achievers (desktop · phone) | Portraits, used only with consent |
| [Result banner · toppers_2021-1.jpg] · [Result banner · toppers_2022.jpg] · [Result banner · 2023-Results.jpg] · [Result banner · 2024-results.jpg] · [Result banner · 2026BannerREV.jpg] | Toppers archive | The banner images |
| [Result banner · 2026BannerREV.jpg · full size] · [Result banner · 2026BannerREV.jpg · pinch to zoom] (and the same for the selected year) | Banner dialog (desktop · phone) | As above |
| "Transcription needed before release" (2021, 2022, 2023, 2024) | Toppers archive | Every name and score typed out (OPEN-QUESTIONS "Result banners") |
| [Album cover] · [n] photos · [year] | Beyond academics album tiles | Album covers and counts once albums are imported |

Also to confirm: the 2026 bands add up to 184 students (OPEN-QUESTIONS "2026 results").

## Gallery (`/gallery`, `/gallery/[year]`, `/gallery/[year]/[album]`)

Generated families are tracked as rules (the checker matches every rendered label against them):

| Placeholder | Rule | Where | Needed from the school |
|---|---|---|---|
| [Cover · Annual Day], [Cover · Yoga Day] … one per album | `pattern: ^Cover · .+$` | Album tiles (year pages) and "More from" tiles | A cover photo per album |
| [01 · ANNUAL-2025-26SC_01.jpg] … [18 · ANNUAL-2025-26SC_18.jpg] | `pattern: ^\d\d · ANNUAL-2025-26SC_\d\d\.jpg$` | Annual Day 2025-26 photo grid | Full-size originals (the live copies are 768 × 510) |
| [Photo 07 · ANNUAL-2025-26SC_07.jpg · fitted to the screen] (set by script) | `pattern: ^Photo \d\d · .+ · fitted to the screen$` | Lightbox | As above |
| [Alt text for photo 7: who and what is in the picture] · [Caption for photo 7 from the school: …] | `pattern: ^(Alt text|Caption) for photo \d+` | Lightbox and thumbnail labels | Alt text and a caption for every photo |
| [Date of the event] | | Album header | The event date |
| [n] photos · [the small thumbnail shows here, softly blurred, until the full photo arrives] | | Album tiles; lightbox loading state | Photo counts once albums are imported |

Every year except 2024-25, 2025-26 and 2026-27 shows the empty state with a Draft note ("the current site has albums for … Import them before launch") while `settings.facilityDrafts` is on; 2024-25 shows "has more albums on the current site". Only Annual Day 2025-26 has photos imported, so it is the only album page; other album tiles are unlinked.

## School Information (`/information` and its six pages)

| Placeholder | Where | Needed from the school |
|---|---|---|
| [Academic year] | Timings heading and print sheet; Fee Structure and Calendar rows (hub) | The academic year each document and timetable covers |
| [size] | Brochure, Fee Structure, Calendar (hub); every disclosure PDF | File sizes once the PDFs are supplied |
| [File to be supplied] | Disclosure documents with no file yet (shown instead of an "Open" link) | The PDFs: affiliation letter, trust deed, NOC, building and fire safety, water/health/sanitation, fee structure, calendar, SMC |
| [date] | Disclosure "Last updated" | The date the disclosure was last updated |
| [to be confirmed] | Disclosure › Contact (third number) | OPEN-QUESTIONS #4: 98866 99966 vs 98869 99660 |
| [Inspection video link] | Disclosure › Infrastructure | The inspection video URL |
| [duration] · recorded by [choir / year] | School Song recording block (shown only when `settings.songRecording` is set) | A recording, if one exists |

Fee Structure and the Annual Academic Calendar are listed but not linked until the files are supplied; the brochure links to the live PDF. Content still to confirm: school start time vs the 09:00 timetable, Headmistress vs Vice Principal, caution money vs Security Deposit, and the Data Bank teacher counts (all `TODO(content)` in `src/data/information.yaml`).

## Contact, Services and the app page (`/contact`, `/services`, `/app`)

| Placeholder (exact) | Where | What to supply |
|---|---|---|
| [Photo · Drone-Front.jpg · warm evening light] | Contact › beside the essentials (desktop), after office hours (phones) | The drone photograph of the campus front |
| [Official “Get it on Google Play” badge artwork] | Services › app card; /app | Google's official badge (download it from Google's badge generator; use it unaltered) |
| [Official “Download on the App Store” badge artwork] | Services › app card; /app | Apple's official badge (from Apple's marketing guidelines; use it unaltered) |
| [File to be supplied] | Services › Fee Structure, Academic Calendar | The two PDFs; until then the rows are not links |

The contact form is a design demo: a valid send says plainly that nothing was sent (`settings.forms.mode: demo`). The board's privacy line mentions reCAPTCHA; it is left out until a live form service that uses reCAPTCHA is chosen (`TODO(content)` in `ContactForm.astro`). The map pin and the QR code on Services (copied unchanged from the board) should be checked on a phone before launch.

## Media and files still to supply

| Item | Used for | Note |
|---|---|---|
| Logo master (1920 × 825 PNG or vector) | 3D emblem texture, Open Graph image | The 512 px artwork is used until then |
| Brochure PDF | Footer, Admissions menu, Services | Linked to the live file for now; at launch it is served from `public/wp-content/uploads/2023/01/` |
| `og-default.png` (1200 × 630) | Social sharing card | Built from the official logo once the master is supplied |
