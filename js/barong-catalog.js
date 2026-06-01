// ============================================================
// J.Kloting — Barong Catalog
// Reads available Barongs from Firestore and renders cards.
// Writes are blocked at the security-rules layer; this is read-only.
// ============================================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js'
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js'

// ---- CONFIG ----------------------------------------------------------------
const firebaseConfig = {
  apiKey: 'AIzaSyCLcgQZofD-rBfYyafEy4HQWz_NTJVAeK8',
  authDomain: 'jklothing-inventory.firebaseapp.com',
  projectId: 'jklothing-inventory',
  storageBucket: 'jklothing-inventory.firebasestorage.app',
  messagingSenderId: '613814178111',
  appId: '1:613814178111:web:08a930469d95e98248438a',
}

const MESSENGER_URL = 'https://m.me/jklotingofficial'
const PLACEHOLDER_IMG = 'img/dummy.png'
const BRAND_MARK = 'img/brand-mark.png' // drop your new icon here; falls back to favicon if missing

const PAGE_SIZE = 8  // cards per "Load More" batch
const NEW_COUNT = 4  // newest N pieces get a "New" badge

// ---- INIT ------------------------------------------------------------------
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ---- DOM REFS --------------------------------------------------------------
const $loading        = document.getElementById('barong-catalog-loading')
const $empty          = document.getElementById('barong-catalog-empty')
const $grid           = document.getElementById('barong-grid')
const $pagination     = document.getElementById('barong-pagination')
const $loadMoreWrap   = document.getElementById('barong-load-more-wrap')
const $loadMoreBtn    = document.getElementById('barong-load-more')
const $searchInputs   = () => document.querySelectorAll('.barong-search-input')
const $carouselWrap   = document.getElementById('barong-featured-carousel-wrap')
const $carouselTrack = document.getElementById('jk-carousel-track')
const $carouselDots = document.getElementById('jk-carousel-dots')
const $carouselPrev = document.getElementById('jk-carousel-prev')
const $carouselNext = document.getElementById('jk-carousel-next')
const $allLabel = document.getElementById('barong-all-label')

// Product detail modal refs
const $modal = document.getElementById('barong-modal')
const $modalImg = document.getElementById('jk-modal-img')
const $modalThumbs = document.getElementById('jk-modal-thumbs')
const $modalEyebrow = document.getElementById('jk-modal-eyebrow')
const $modalTitle = document.getElementById('jk-modal-title')
const $modalPrice = document.getElementById('jk-modal-price')
const $modalSize = document.getElementById('jk-modal-size')
const $modalCta = document.getElementById('jk-modal-cta')

// Size guide modal refs
const $sizeModal = document.getElementById('size-guide-modal')

// AI Stylist modal refs
const $stylistModal   = document.getElementById('barong-stylist-modal')
const $stylistForm    = document.getElementById('jk-stylist-form')
const $stylistResult  = document.getElementById('jk-stylist-result')
const $stylistSubmit  = document.getElementById('jk-stylist-submit')
const $stylistMotif   = document.getElementById('jk-stylist-motif')

// ---- STATE -----------------------------------------------------------------
let allBarongs = []       // full sorted list; index === modal lookup key
let filteredBarongs = []  // active filtered list (default: all)
let searchTerm = ''
let loadedCount = 0       // how many cards shown so far (Load More)
let featuredBarongs = []  // featured:true subset, for carousel
let carouselActive = 0    // index inside featuredBarongs
let carouselTimer = null
const CAROUSEL_INTERVAL = 4000

// ---- HELPERS ---------------------------------------------------------------
function peso(n) {
  return '₱' + Number(n).toLocaleString('en-PH')
}

function escapeHtml(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function imagesOf(barong) {
  return Array.isArray(barong.images) && barong.images.length > 0
    ? barong.images
    : [PLACEHOLDER_IMG]
}

function messengerLinkFor(barong) {
  // Use custom fb_link if provided, otherwise default Messenger handle
  return barong.fb_link && barong.fb_link.trim() ? barong.fb_link : MESSENGER_URL
}

// ---- CARD RENDER -----------------------------------------------------------
function renderCard(barong, globalIndex, posInPage) {
  const images = imagesOf(barong)
  const noPhoto = images.length === 1 && images[0] === PLACEHOLDER_IMG
  const mainImg = images[0]
  const label = escapeHtml(barong.label || 'Barong')
  const size = escapeHtml(barong.size || '')
  const price = peso(barong.price || 0)
  const cardId = 'barong-' + barong.id
  const orderUrl = escapeHtml(messengerLinkFor(barong))

  // Top-left badge: Featured wins, else newest N get "New"
  let badge = ''
  if (barong.featured === true) {
    badge = '<span class="jk-card__badge jk-card__badge--featured">Featured</span>'
  } else if (globalIndex < NEW_COUNT) {
    badge = '<span class="jk-card__badge jk-card__badge--new">New</span>'
  }

  // Media: placeholder div or real image
  const mediaContent = noPhoto
    ? `<div class="jk-card__placeholder" aria-label="No photo yet">
        <i class="lnr lnr-shirt" aria-hidden="true"></i>
        <span>Photo Coming Soon</span>
      </div>`
    : `<img src="${escapeHtml(mainImg)}" alt="${label}" data-main-img loading="lazy" decoding="async" />`

  // Carousel dots — only when 2+ real images
  const dots = (!noPhoto && images.length > 1)
    ? `<div class="jk-card__dots">
        ${images.map((url, i) =>
          `<button type="button" class="jk-dot${i === 0 ? ' is-active' : ''}" data-src="${escapeHtml(url)}" aria-label="View image ${i + 1}"></button>`
        ).join('')}
      </div>`
    : ''

  const wowDelay = (0.05 + (posInPage % 4) * 0.08).toFixed(2)

  return `
    <div class="col-lg-3 col-md-4 col-sm-6 col-12 wow fadeInUp" data-wow-delay="${wowDelay}s">
      <article class="jk-card" id="${cardId}" data-index="${globalIndex}" role="button" tabindex="0" aria-label="View details for ${label}">
        <div class="jk-card__media${noPhoto ? ' jk-card__media--placeholder' : ''}">
          ${mediaContent}
          ${badge}
          <span class="jk-card__brand"><img src="${BRAND_MARK}" alt="J.Kloting" loading="lazy" decoding="async" /></span>
          ${dots}
        </div>
        <div class="jk-card__body">
          <h4 class="jk-card__title">${label}</h4>
          <p class="jk-card__sub">${size ? 'Size ' + size : 'One size'}</p>
          <div class="jk-card__footer">
            <span class="jk-card__price">${escapeHtml(price)}</span>
            <a href="${orderUrl}" target="_blank" rel="noopener" class="jk-card__cta" data-no-modal>
              Reserve <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </article>
    </div>
  `
}

// ---- LOAD MORE (all screens) -----------------------------------------------
function renderLoadMore(append) {
  const slice = filteredBarongs.slice(loadedCount, loadedCount + PAGE_SIZE)
  if (!slice.length) return
  const html = slice.map((b, i) => renderCard(b, b._index, loadedCount + i)).join('')
  if (append) {
    $grid.insertAdjacentHTML('beforeend', html)
  } else {
    $grid.innerHTML = html
  }
  loadedCount += slice.length
  const hasMore = loadedCount < filteredBarongs.length
  $loadMoreWrap.style.display = hasMore ? 'flex' : 'none'
  if (window.WOW) { try { new window.WOW().sync() } catch (_) {} }
}

function initGrid() {
  loadedCount = 0
  $grid.innerHTML = ''
  $pagination.innerHTML = ''
  renderLoadMore(false)
}

// ---- MODAL: PRODUCT DETAIL -------------------------------------------------
function openModal(index) {
  const b = allBarongs[index]
  if (!b) return
  const images = imagesOf(b)
  const label = b.label || 'Barong'
  const colorVal = b.color || b.type

  $modalImg.src = images[0]
  $modalImg.alt = label
  $modalEyebrow.textContent = colorVal ? capitalize(colorVal) + ' Barong' : 'Barong'
  $modalTitle.textContent = label
  $modalPrice.textContent = peso(b.price || 0)
  $modalSize.textContent = b.size ? 'Size ' + b.size : 'One size'
  $modalCta.href = messengerLinkFor(b)

  $modalThumbs.innerHTML = images.length > 1
    ? images.map((url, i) =>
        `<button type="button" class="jk-modal__thumb${i === 0 ? ' is-active' : ''}" data-src="${escapeHtml(url)}" aria-label="View image ${i + 1}"><img src="${escapeHtml(url)}" alt="${escapeHtml(label)} ${i + 1}" /></button>`
      ).join('')
    : ''

  openOverlay($modal)
}

// ---- MODAL: SHARED OVERLAY HELPERS -----------------------------------------
function openOverlay(el) {
  if (!el) return
  el.classList.add('is-open')
  el.setAttribute('aria-hidden', 'false')
  document.body.classList.add('jk-modal-open')
}

function closeOverlay(el) {
  if (!el) return
  el.classList.remove('is-open')
  el.setAttribute('aria-hidden', 'true')
  if (!document.querySelector('.jk-modal.is-open')) {
    document.body.classList.remove('jk-modal-open')
  }
}

function openSizeGuide() {
  openOverlay($sizeModal)
}

// ---- CAROUSEL --------------------------------------------------------------
function renderCarouselSlide(b, slideIndex) {
  const images = imagesOf(b)
  const noPhoto = images.length === 1 && images[0] === PLACEHOLDER_IMG
  const label = escapeHtml(b.label || 'Barong')
  const price = peso(b.price || 0)
  const size = escapeHtml(b.size || '')
  const mainImg = escapeHtml(images[0])
  const orderUrl = escapeHtml(messengerLinkFor(b))
  const mediaContent = noPhoto
    ? `<div class="jk-carousel__placeholder" aria-label="No photo yet">
        <i class="lnr lnr-shirt" aria-hidden="true"></i>
        <span>Photo Coming Soon</span>
      </div>`
    : `<img src="${mainImg}" alt="${label}" />`
  return `
    <li class="jk-carousel__slide" data-slide="${slideIndex}" data-index="${b._index}" role="button" tabindex="0" aria-label="View ${label}">
      <div class="jk-carousel__card">
        <div class="jk-carousel__img-wrap${noPhoto ? ' jk-carousel__img-wrap--placeholder' : ''}">
          ${mediaContent}
        </div>
        <div class="jk-carousel__info">
          <h4 class="jk-carousel__title">${label}</h4>
          <p class="jk-carousel__sub">${size ? 'Size ' + size : 'One size'}</p>
          <div class="jk-carousel__footer">
            <span class="jk-card__price">${escapeHtml(price)}</span>
            <a href="${orderUrl}" target="_blank" rel="noopener" class="jk-card__cta" data-no-modal>
              Reserve <span aria-hidden="true">&rarr;</span>
            </a>
          </div>
        </div>
      </div>
    </li>
  `
}

function setCarouselActive(index) {
  const total = featuredBarongs.length
  carouselActive = ((index % total) + total) % total
  $carouselTrack.querySelectorAll('.jk-carousel__slide').forEach((slide, i) => {
    const offset = i - carouselActive
    const norm = ((offset % total) + total) % total
    const wrapped = norm > total / 2 ? norm - total : norm
    slide.classList.remove('is-active', 'is-prev', 'is-next', 'is-far')
    if (wrapped === 0)       slide.classList.add('is-active')
    else if (wrapped === -1) slide.classList.add('is-prev')
    else if (wrapped === 1)  slide.classList.add('is-next')
    else                     slide.classList.add('is-far')
  })
  $carouselDots.querySelectorAll('.jk-cdot').forEach((d, i) => {
    d.classList.toggle('is-active', i === carouselActive)
  })
}

function buildCarousel() {
  if (!featuredBarongs.length) return
  $carouselTrack.innerHTML = featuredBarongs.map((b, i) => renderCarouselSlide(b, i)).join('')
  $carouselDots.innerHTML = featuredBarongs.map((_, i) =>
    `<button type="button" class="jk-cdot" data-slide="${i}" aria-label="Go to slide ${i + 1}"></button>`
  ).join('')
  setCarouselActive(0)
  $carouselWrap.style.display = 'block'
  $allLabel.style.display = 'flex'
  startCarouselTimer()
}

function startCarouselTimer() {
  clearInterval(carouselTimer)
  if (featuredBarongs.length > 1) {
    carouselTimer = setInterval(() => setCarouselActive(carouselActive + 1), CAROUSEL_INTERVAL)
  }
}

function resetCarouselTimer() {
  clearInterval(carouselTimer)
  startCarouselTimer()
}

// ---- SEARCH ----------------------------------------------------------------
function applySearch(term) {
  searchTerm = term.trim().toLowerCase()
  // Sync all search inputs
  $searchInputs().forEach((inp) => { if (inp.value !== term) inp.value = term })

  filteredBarongs = searchTerm
    ? allBarongs.filter((b) => {
        const label = (b.label || '').toLowerCase()
        const color = (b.color || '').toLowerCase()
        const type  = (b.type  || '').toLowerCase()
        return label.includes(searchTerm) || color.includes(searchTerm) || type.includes(searchTerm)
      })
    : allBarongs.slice()

  loadedCount = 0
  $grid.innerHTML = ''
  $pagination.innerHTML = ''

  if (!filteredBarongs.length) {
    $loadMoreWrap.style.display = 'none'
    $grid.innerHTML = `
      <div class="col-12 barong-no-results">
        <i class="lnr lnr-magnifier" aria-hidden="true"></i>
        <p>No barongs found for <strong>"${escapeHtml(term)}"</strong>.</p>
        <p class="barong-no-results__sub">Try a different color, or <a href="${MESSENGER_URL}" target="_blank" rel="noopener">message us</a> for custom orders.</p>
        <p class="barong-no-results__sub">Not sure what to look for? <a href="#" data-stylist-open>Try the AI Stylist</a>.</p>
        <div class="barong-no-results__social">
          <p class="barong-no-results__social-label">Follow us for the newest drops</p>
          <div class="barong-no-results__social-links">
            <a href="https://www.facebook.com/jklotingofficial" target="_blank" rel="noopener" aria-label="Facebook"><i class="fa fa-facebook" aria-hidden="true"></i></a>
            <a href="https://www.instagram.com/jkloting_/" target="_blank" rel="noopener" aria-label="Instagram"><i class="fa fa-instagram" aria-hidden="true"></i></a>
          </div>
        </div>
      </div>`
  } else {
    renderLoadMore(false)
  }
}

// ---- AI STYLIST ------------------------------------------------------------
// Client-side, rule-based color recommender. Reads the user's answers, scores
// the colors that actually exist in stock, and hands the winner to applySearch.

// Canonical colors + the free-form synonyms a Firestore `color` value might use,
// plus a swatch for the result panel.
const CANONICAL_COLORS = {
  white:  { label: 'White',             swatch: '#f4f1ea', syn: ['white', 'ivory', 'cream', 'off-white', 'offwhite', 'eggshell', 'pearl', 'bone'] },
  beige:  { label: 'Beige / Champagne', swatch: '#cbb892', syn: ['beige', 'champagne', 'gold', 'golden', 'tan', 'khaki', 'sand', 'nude', 'taupe', 'camel'] },
  gray:   { label: 'Gray',              swatch: '#8a8f98', syn: ['gray', 'grey', 'silver', 'ash', 'smoke', 'stone'] },
  navy:   { label: 'Navy Blue',         swatch: '#1f2d4d', syn: ['navy', 'blue', 'royal', 'midnight', 'cobalt', 'teal'] },
  black:  { label: 'Black',             swatch: '#1a1a1a', syn: ['black', 'jet', 'onyx', 'charcoal'] },
  maroon: { label: 'Maroon',            swatch: '#6b2230', syn: ['maroon', 'burgundy', 'wine', 'oxblood', 'red'] },
  green:  { label: 'Green',             swatch: '#3b5d4a', syn: ['green', 'emerald', 'olive', 'sage', 'forest'] },
  colored:{ label: 'Colored / Printed', swatch: 'linear-gradient(135deg,#d98cb3,#8cb3d9,#d9c98c)', syn: ['colored', 'colorful', 'color', 'printed', 'print', 'pattern', 'patterned', 'floral', 'multi'] },
}

// Scoring tables: per answer, how well each canonical color fits.
const STYLIST_RULES = {
  occasion: {
    'wedding-groom': { white: 3, beige: 2, gray: 1 },
    'wedding-guest': { black: 3, navy: 3, gray: 2, maroon: 1 },
    'formal':        { white: 3, navy: 2, beige: 2, gray: 1 },
    'casual':        { black: 2, gray: 2, navy: 1, maroon: 1, green: 1, colored: 2 },
  },
  skin: {
    'fair':   { navy: 2, black: 2, maroon: 2, green: 1 },
    'medium': { navy: 2, maroon: 2, beige: 1, white: 1, green: 1, colored: 1 },
    'morena': { white: 2, beige: 2, gray: 1, maroon: 1, colored: 1 },
  },
  vibe: {
    'classic': { white: 2, black: 2, navy: 1 },
    'modern':  { beige: 2, gray: 2, green: 1, maroon: 1, colored: 2 },
  },
}

const OCCASION_LABEL = {
  'wedding-groom': 'your wedding day',
  'wedding-guest': 'attending a wedding',
  'formal':        'a formal event',
  'casual':        'everyday wear',
}
const SKIN_LABEL = { fair: 'fair', medium: 'medium', morena: 'morena' }

// Current selections (chip groups) + optional motif text.
let stylistAnswers = { occasion: '', skin: '', vibe: '', motif: '' }

// Map a free-form color string to a canonical key (first synonym hit wins).
// Matches whole words so e.g. "colored" doesn't match the "red" synonym.
function canonicalOf(colorStr) {
  const s = String(colorStr || '').toLowerCase()
  for (const key in CANONICAL_COLORS) {
    if (CANONICAL_COLORS[key].syn.some((syn) => {
      const pattern = '\\b' + syn.replace(/[^a-z]+/g, '\\W?') + '\\b'
      return new RegExp(pattern).test(s)
    })) return key
  }
  return null
}

// Distinct in-stock colors → { lower: { display, count } }.
function stockColors() {
  const map = new Map()
  allBarongs.forEach((b) => {
    const c = (b.color || '').trim()
    if (!c) return
    const lc = c.toLowerCase()
    const entry = map.get(lc) || { display: c, count: 0 }
    entry.count += 1
    map.set(lc, entry)
  })
  return map
}

// Score the actual in-stock colors against the answers and pick a winner.
// Returns { ok, display, canon, count, fallback } or { ok:false } when no
// colored stock exists at all.
function scoreColors(answers) {
  const stock = stockColors()
  if (stock.size === 0) return { ok: false }

  let best = null
  stock.forEach((info, lc) => {
    const canon = canonicalOf(lc)
    let score = 0
    if (canon) {
      score += (STYLIST_RULES.occasion[answers.occasion] || {})[canon] || 0
      score += (STYLIST_RULES.skin[answers.skin] || {})[canon] || 0
      score += (STYLIST_RULES.vibe[answers.vibe] || {})[canon] || 0
      if (answers.motifCanon) {
        if (canon === 'white' || canon === 'beige') score += 1   // neutral complements
        if (canon === answers.motifCanon) score += 1             // tonal match
      }
    }
    // Tie-break by how many pieces are available in that color.
    if (!best || score > best.score || (score === best.score && info.count > best.count)) {
      best = { display: info.display, canon, score, count: info.count }
    }
  })

  // score 0 = no rule matched stock; still suggest the most-available color.
  return { ok: true, fallback: best.score === 0, ...best }
}

// Build a short, plain-English reason for the pick.
function stylistReason(answers, rec) {
  if (rec.fallback) {
    return `This is one of our most-loved colors right now and works for almost any occasion.`
  }
  const bits = []
  if (OCCASION_LABEL[answers.occasion]) bits.push(`great for ${OCCASION_LABEL[answers.occasion]}`)
  if (SKIN_LABEL[answers.skin]) bits.push(`flattering on ${SKIN_LABEL[answers.skin]} skin`)
  if (answers.vibe === 'modern') bits.push('with a modern feel')
  else if (answers.vibe === 'classic') bits.push('with a timeless, classic look')
  const tail = bits.length ? bits.join(', ') : 'a versatile, easy-to-style choice'
  return `A ${rec.display.toLowerCase()} barong is ${tail}.`
}

function openStylist() {
  resetStylist()
  openOverlay($stylistModal)
}

function resetStylist() {
  stylistAnswers = { occasion: '', skin: '', vibe: '', motif: '' }
  if ($stylistMotif) $stylistMotif.value = ''
  if ($stylistForm) {
    $stylistForm.style.display = 'block'
    $stylistForm.querySelectorAll('.jk-chip.is-selected').forEach((c) => c.classList.remove('is-selected'))
  }
  if ($stylistResult) { $stylistResult.style.display = 'none'; $stylistResult.innerHTML = '' }
}

function renderStylistResult() {
  stylistAnswers.motif = ($stylistMotif && $stylistMotif.value || '').trim()
  const answers = { ...stylistAnswers, motifCanon: stylistAnswers.motif ? canonicalOf(stylistAnswers.motif) : null }
  const rec = scoreColors(answers)

  if (!rec.ok) {
    // No colored stock to recommend — point the shopper to us instead.
    $stylistResult.innerHTML = `
      <p class="jk-stylist__rec">We're between drops right now.</p>
      <p class="jk-stylist__reason">Follow along or message us and we'll help you pick the perfect color for your event.</p>
      <div class="jk-stylist__actions">
        <a href="${MESSENGER_URL}" target="_blank" rel="noopener" class="jk-stylist__view">Message us</a>
        <button type="button" class="jk-stylist__restart" data-stylist-restart>Start over</button>
      </div>`
    $stylistForm.style.display = 'none'
    $stylistResult.style.display = 'block'
    return
  }

  const swatch = (rec.canon && CANONICAL_COLORS[rec.canon]) ? CANONICAL_COLORS[rec.canon].swatch : '#cccccc'
  const countLabel = rec.count === 1 ? '1 piece available now' : `${rec.count} pieces available now`
  $stylistResult.innerHTML = `
    <span class="jk-stylist__swatch" style="background:${swatch}" aria-hidden="true"></span>
    <p class="jk-stylist__rec">We recommend a <strong>${escapeHtml(capitalize(rec.display))}</strong> barong</p>
    <p class="jk-stylist__reason">${escapeHtml(stylistReason(answers, rec))}</p>
    <p class="jk-stylist__count">${countLabel}</p>
    <div class="jk-stylist__actions">
      <button type="button" class="jk-stylist__view" data-stylist-view="${escapeHtml(rec.display)}">View these barongs</button>
      <button type="button" class="jk-stylist__restart" data-stylist-restart>Start over</button>
    </div>`
  $stylistForm.style.display = 'none'
  $stylistResult.style.display = 'block'
}

// Filter the live catalog to the recommended color and scroll to the grid.
function viewStylistPick(color) {
  closeOverlay($stylistModal)
  applySearch(color)
  const grid = document.getElementById('barong-grid')
  if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ---- EVENT WIRING ----------------------------------------------------------
function wireEvents() {
  // Carousel: prev/next, dot, slide click
  $carouselPrev.addEventListener('click', () => { setCarouselActive(carouselActive - 1); resetCarouselTimer() })
  $carouselNext.addEventListener('click', () => { setCarouselActive(carouselActive + 1); resetCarouselTimer() })
  $carouselDots.addEventListener('click', (e) => {
    const dot = e.target.closest('.jk-cdot')
    if (dot) { setCarouselActive(Number(dot.dataset.slide)); resetCarouselTimer() }
  })
  $carouselTrack.addEventListener('click', (e) => {
    if (e.target.closest('[data-no-modal]')) return
    const slide = e.target.closest('.jk-carousel__slide')
    if (!slide) return
    const si = Number(slide.dataset.slide)
    if (si !== carouselActive) { setCarouselActive(si); resetCarouselTimer(); return }
    openModal(Number(slide.dataset.index))
  })
  $carouselTrack.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const slide = e.target.closest('.jk-carousel__slide')
    if (!slide || e.target.closest('[data-no-modal]')) return
    e.preventDefault()
    openModal(Number(slide.dataset.index))
  })

  // Grid: open modal on card click / Enter; switch image on dot click
  $grid.addEventListener('click', (e) => {
    const dot = e.target.closest('.jk-dot')
    if (dot) {
      const media = dot.closest('.jk-card__media')
      const img = media && media.querySelector('[data-main-img]')
      if (img) img.src = dot.dataset.src
      media.querySelectorAll('.jk-dot').forEach((d) => d.classList.remove('is-active'))
      dot.classList.add('is-active')
      return
    }
    if (e.target.closest('[data-no-modal]')) return
    const card = e.target.closest('.jk-card')
    if (card) openModal(Number(card.dataset.index))
  })

  $grid.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    const card = e.target.closest('.jk-card')
    if (card && !e.target.closest('[data-no-modal]') && !e.target.closest('.jk-dot')) {
      e.preventDefault()
      openModal(Number(card.dataset.index))
    }
  })

  // Load More (all screens)
  $loadMoreBtn.addEventListener('click', () => renderLoadMore(true))

  // Search inputs (debounced, synced across desktop + mobile)
  $searchInputs().forEach((inp) => {
    let debounceTimer = null
    inp.addEventListener('input', () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => applySearch(inp.value), 300)
    })
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { applySearch(''); inp.blur() }
    })
  })

  // Product modal: switch main image on thumb click
  $modalThumbs.addEventListener('click', (e) => {
    const thumb = e.target.closest('.jk-modal__thumb')
    if (!thumb) return
    $modalImg.src = thumb.dataset.src
    $modalThumbs.querySelectorAll('.jk-modal__thumb').forEach((t) => t.classList.remove('is-active'))
    thumb.classList.add('is-active')
  })

  // Any [data-close] element closes its parent modal
  document.querySelectorAll('.jk-modal [data-close]').forEach((el) => {
    el.addEventListener('click', () => closeOverlay(el.closest('.jk-modal')))
  })

  // Size guide triggers
  document.querySelectorAll('[data-size-guide]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault()
      openSizeGuide()
    })
  })

  // Escape closes any open modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.jk-modal.is-open').forEach((m) => closeOverlay(m))
    }
  })

  // --- AI Stylist ---
  // Open from any trigger (CTA button, drawer item, no-results link).
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-stylist-open]')) { e.preventDefault(); openStylist() }
  })

  if ($stylistForm) {
    // Chip selection: one choice per group.
    $stylistForm.addEventListener('click', (e) => {
      const chip = e.target.closest('.jk-chip')
      if (!chip) return
      const wrap = chip.closest('[data-group]')
      if (!wrap) return
      const group = wrap.dataset.group
      wrap.querySelectorAll('.jk-chip').forEach((c) => c.classList.remove('is-selected'))
      chip.classList.add('is-selected')
      stylistAnswers[group] = chip.dataset.value
    })
  }

  if ($stylistSubmit) $stylistSubmit.addEventListener('click', renderStylistResult)

  if ($stylistResult) {
    $stylistResult.addEventListener('click', (e) => {
      const view = e.target.closest('[data-stylist-view]')
      if (view) { viewStylistPick(view.dataset.stylistView); return }
      if (e.target.closest('[data-stylist-restart]')) resetStylist()
    })
  }
}

function showError(message) {
  if ($loading) $loading.style.display = 'none'
  if ($empty) {
    $empty.style.display = 'block'
    $empty.innerHTML = `<p style="color:#c0392b;">${escapeHtml(message)}</p>`
  }
}

// ---- STRUCTURED DATA (SEO) -------------------------------------------------
// Inject an ItemList of Products so Google can surface the catalog as
// product rich-results. Googlebot renders JS, so this runs after fetch.
function injectProductSchema(items) {
  if (!items.length) return
  const elements = items.map((b, i) => {
    const images = imagesOf(b)
    return {
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Product',
        name: b.label || 'Barong',
        image: images.length ? images : undefined,
        category: 'Barong Tagalog',
        url: messengerLinkFor(b),
        offers: {
          '@type': 'Offer',
          priceCurrency: 'PHP',
          price: Number(b.price) || 650,
          availability: 'https://schema.org/InStock',
          seller: { '@type': 'Organization', name: 'J.Kloting' },
        },
      },
    }
  })
  const data = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'J.Kloting Barong Collection',
    itemListElement: elements,
  }
  const script = document.createElement('script')
  script.type = 'application/ld+json'
  script.id = 'barong-itemlist-schema'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

// ---- LOAD ------------------------------------------------------------------
async function loadCatalog() {
  try {
    const q = query(
      collection(db, 'barongs'),
      where('status', '==', 'available'),
      orderBy('created_at', 'desc')
    )
    const snap = await getDocs(q)

    allBarongs = []
    snap.forEach((doc) => {
      allBarongs.push({ id: doc.id, ...doc.data() })
    })
    // Stable global index used for modal lookup + "New" badge
    allBarongs.forEach((b, i) => { b._index = i })
    filteredBarongs = allBarongs.slice()
    featuredBarongs = allBarongs.filter((b) => b.featured === true)

    if ($loading) $loading.style.display = 'none'

    if (allBarongs.length === 0) {
      if ($empty) $empty.style.display = 'block'
      return
    }

    injectProductSchema(allBarongs)

    wireEvents()
    if (featuredBarongs.length) buildCarousel()
    initGrid()  // Load More on all screens
  } catch (err) {
    console.error('[barong-catalog] failed to load:', err)
    showError("We couldn't load the catalog right now. Please refresh, or message us on Facebook.")
  }
}

loadCatalog()
