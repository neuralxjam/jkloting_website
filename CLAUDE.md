# J.Kloting Website — Project Guide

## What This Project Is

Single-page marketing/portfolio site for **J.Kloting** (JKloting), an apparel printing shop in Meycauayan, Bulacan, Philippines. Static HTML/CSS/JS — no build system, no framework. Edit files directly; `scss/` exists but is not compiled — always edit `css/main.css` directly.

## Shop Details

| Field | Value |
|---|---|
| Business | J.Kloting / JKloting |
| Address | 1111 Balaongan Street, Pantoc, Meycauayan City, Bulacan, PH |
| Phone | +63 965 287 7366 |
| Email | jklothing.official@gmail.com |
| Facebook | jklotingofficial |
| Instagram | jkloting_ |

**Print services:** Direct to Film (DTF) · Sublimation · Silk Screen
**Product lines:** T-shirts · jackets · hoodies · polo shirts · sportswear & jerseys · corporate uniforms · school/org uniforms · **Modern/Casual Barong** (polo barong, contemporary cuts, custom embroidery)

## Enhancement Plan (in progress)

Primary goal: **Portfolio showcase** to attract bulk/corporate buyers. Style: modernize (cleaner typography, bigger photography, more breathing room) — keep existing Bootstrap structure.

### Approved section plan

| Section | Action |
|---|---|
| Hero | Keep + add "View Our Work" secondary CTA |
| Services | Keep + add MOQ hints per card + 4th Barong card |
| **Barong Collection** (`#barong`) | **ADD** — new section after Services |
| Why Choose Us | Keep as-is |
| Portfolio | Overhaul — new categories, caption overlays |
| Pricing | Replace lorem ipsum with real DTF/Sub/Silk Screen tiers |
| **How It Works / Process** (`#process`) | **ADD** — new section before Contact |
| Contact | Dual form: Quick Contact + Request a Quote |
| Footer | Keep + polish |
| Team | **REMOVE** |
| Testimonials | **REMOVE** (re-add when real quotes available) |
| Blog | **REMOVE** |
| Video promo | **REMOVE** |
| Counters | **REMOVE** (re-add when real numbers confirmed) |

### New nav order
`Home · Services · Barong · Portfolio · Pricing · Process · Contact`

### Portfolio categories (replaces design/development/print)
`All · Barong · Uniforms · Sportswear · Streetwear · Corporate`

### Process section steps
1. Send Inquiry → 2. Get Quote & Mockup → 3. Approve & Pay (50% downpayment) → 4. Production & Delivery

### Turnaround times (owner to confirm exact numbers)
- DTF: 3–5 business days
- Sublimation: 5–7 business days
- Silk Screen bulk: 7–10 business days

### Payment & delivery
- Payment: GCash, bank transfer, cash on pickup
- Delivery: Pickup in Meycauayan, nationwide via J&T / Lalamove

## Implementation Order

1. Nav + section removals (Team, Testimonials, Blog, Video, Counters)
2. Portfolio overhaul (filter categories, caption overlays)
3. Add Barong Collection section
4. Replace Pricing with real package tiers
5. Add Process / Logistics section
6. Dual contact form + PHP handler update
7. Design refresh (typography, spacing, button polish)

## Key Files

- `index.html` — entire page (single file)
- `css/main.css` — primary stylesheet to edit (not `scss/`)
- `css/responsive.css` — mobile breakpoints
- `php/form-process.php` — contact form handler (extend for quote form)
- `js/main.js` — primary JS (add form hooks here if needed)
- `js/logo-switcher.js` — handles white↔dark logo on scroll — **do not touch**

## Libraries in Use (vendor — do not modify)

- Bootstrap 4 (grid, navbar, collapse)
- jQuery + jquery.mixitup.js (portfolio filter — change category names only, no JS rewrite)
- nivo-lightbox (portfolio lightbox — keep `class="lightbox"` on tiles)
- WOW.js (scroll animations — reuse `wow fadeIn` pattern on new sections)
- form-validator.min.js (form validation — reuse `data-error` + `required` pattern)
- jquery.stellar.min.js (parallax on hero/features/contact)
- owl.carousel.js (testimonial slider — being removed)

## Photo / Asset Strategy

Real photos are **coming later**. Build with labeled placeholders:
- Keep existing `img/portfolio/img1-6.jpg` as placeholder tiles for now
- Add `<!-- TODO: replace with real barong-1.jpg -->` comments on every image
- Shot list needed: Barong ×4, Uniforms ×4, Sportswear ×4, Streetwear ×4, Corporate ×4 (~20 photos total)

## Constraints & Rules

- **Never edit `scss/`** — compiled CSS only; edit `css/main.css` directly
- **Never touch `js/logo-switcher.js`** — logo scroll behavior already works
- **No new vendor libraries** unless strictly necessary — keep page weight down
- **No build system, no CMS, no e-commerce** — static files only
- **No SCSS recompilation** — direct CSS edits only
- PHP form handler (`php/form-process.php`) is the only backend; no new server-side code beyond extending the quote form
