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

// Share buttons
const $shareFb     = document.getElementById('jk-share-fb')
const $shareNative = document.getElementById('jk-share-native')
const $shareCopy   = document.getElementById('jk-share-copy')
const SHARE_ORIGIN = 'https://jkloting.store'
// Web Share API (navigator.share) exists mainly on phones — used to decide whether to
// render the native-share button on each card.
const SUPPORTS_SHARE = !!(typeof navigator !== 'undefined' && navigator.share)

// Size guide modal refs
const $sizeModal = document.getElementById('size-guide-modal')

// AI Stylist modal refs
const $stylistModal   = document.getElementById('barong-stylist-modal')
const $stylistForm    = document.getElementById('jk-stylist-form')
const $stylistResult  = document.getElementById('jk-stylist-result')
const $stylistSubmit  = document.getElementById('jk-stylist-submit')

// ---- STATE -----------------------------------------------------------------
let allBarongs = []       // full sorted list; index === modal lookup key
let filteredBarongs = []  // active filtered list (default: all)
let searchTerm = ''
let loadedCount = 0       // how many cards shown so far (Load More)
let featuredBarongs = []  // featured:true subset, for carousel
let currentModalBarong = null // item currently shown in the product modal (for sharing)
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

  // Share icons inline with the label (right side). FB + native share only — no copy link.
  const nativeShareBtn = SUPPORTS_SHARE
    ? `<button type="button" class="jk-card__share-btn" data-no-modal data-card-share="native" aria-label="Share" title="Share"><i class="fa fa-share-alt"></i></button>`
    : ''
  const shareIcons = `
          <div class="jk-card__share-btns">
            <button type="button" class="jk-card__share-btn" data-no-modal data-card-share="fb" aria-label="Share on Facebook" title="Share on Facebook"><i class="fa fa-facebook"></i></button>
            ${nativeShareBtn}
          </div>`

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
          <div class="jk-card__title-row">
            <h4 class="jk-card__title">${label}</h4>
            ${shareIcons}
          </div>
          <p class="jk-card__sub">${size ? 'Size ' + size : 'One size'}</p>
          <div class="jk-card__footer">
            <div class="jk-card__footer-left">
              <span class="jk-card__price">${escapeHtml(price)}</span>
              <a href="${orderUrl}" target="_blank" rel="noopener" class="jk-card__cta" data-no-modal>
                Buy Now
              </a>
            </div>
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
  currentModalBarong = b
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

// ---- SHARE -----------------------------------------------------------------
function shareUrlFor(b) {
  return SHARE_ORIGIN + '/barong?item=' + encodeURIComponent(b.id)
}
function shareTextFor(b) {
  const colorVal = b.color || b.type || b.label
  const name = colorVal ? 'Modern ' + capitalize(colorVal) + ' Barong' : 'Modern Barong'
  return name + ' · ' + peso(b.price || 0) + ' — J.Kloting'
}
function wireShareButtons() {
  // Native share only exists on most phones — reveal it only when supported.
  if ($shareNative && navigator.share) $shareNative.hidden = false

  if ($shareFb) $shareFb.addEventListener('click', () => {
    if (!currentModalBarong) return
    const u = encodeURIComponent(shareUrlFor(currentModalBarong))
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + u, '_blank', 'width=600,height=500,noopener')
  })

  if ($shareNative) $shareNative.addEventListener('click', async () => {
    if (!currentModalBarong || !navigator.share) return
    try {
      await navigator.share({
        title: 'J.Kloting Barong',
        text: shareTextFor(currentModalBarong),
        url: shareUrlFor(currentModalBarong),
      })
    } catch (_) { /* user dismissed the share sheet */ }
  })

  if ($shareCopy) $shareCopy.addEventListener('click', async () => {
    if (!currentModalBarong) return
    const url = shareUrlFor(currentModalBarong)
    try {
      await navigator.clipboard.writeText(url)
    } catch (_) {
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } catch (_) {}
      document.body.removeChild(ta)
    }
    const label = $shareCopy.querySelector('.jk-share-copy-label')
    $shareCopy.classList.add('is-copied')
    if (label) label.textContent = 'Copied!'
    setTimeout(() => {
      $shareCopy.classList.remove('is-copied')
      if (label) label.textContent = 'Copy link'
    }, 1500)
  })
}
wireShareButtons()

// Per-card share (grid). Resolves the barong from the card's data-index, then runs the
// same action as the modal (Facebook popup / native share sheet / copy link).
function handleCardShare(btn) {
  const card = btn.closest('.jk-card')
  if (!card) return
  const b = allBarongs[Number(card.dataset.index)]
  if (!b) return
  const action = btn.dataset.cardShare
  if (action === 'fb') {
    const u = encodeURIComponent(shareUrlFor(b))
    window.open('https://www.facebook.com/sharer/sharer.php?u=' + u, '_blank', 'width=600,height=500,noopener')
  } else if (action === 'native' && navigator.share) {
    navigator.share({
      title: 'J.Kloting Barong',
      text: shareTextFor(b),
      url: shareUrlFor(b),
    }).catch(() => { /* user dismissed the share sheet */ })
  } else if (action === 'copy') {
    copyTextToClipboard(shareUrlFor(b))
    btn.classList.add('is-copied')
    const prevTitle = btn.getAttribute('title')
    btn.setAttribute('title', 'Copied!')
    setTimeout(() => {
      btn.classList.remove('is-copied')
      if (prevTitle) btn.setAttribute('title', prevTitle)
    }, 1500)
  }
}

// Clipboard write with a legacy execCommand fallback.
function copyTextToClipboard(text) {
  try {
    if (navigator.clipboard) return navigator.clipboard.writeText(text)
  } catch (_) {}
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  try { document.execCommand('copy') } catch (_) {}
  document.body.removeChild(ta)
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

// Color families — the recommendation targets + result swatch. Each barong is
// tagged with one of these in the dashboard (`color_family`).
const COLOR_FAMILIES = {
  neutral: { label: 'Neutral',     swatch: 'linear-gradient(135deg,#f4f1ea,#cfcabd)' },
  vibrant: { label: 'Vibrant',     swatch: 'linear-gradient(135deg,#e23b5a,#3b6fe2,#6b3be2)' },
  pastel:  { label: 'Pastel',      swatch: 'linear-gradient(135deg,#cfe8f3,#f3d9e8,#e0f0d8)' },
  earth:   { label: 'Earth Tones', swatch: 'linear-gradient(135deg,#8a6d3b,#6b7d4a,#a9714b)' },
}

// Scoring tables: how well each family fits each answer (tunable).
const STYLIST_RULES = {
  occasion: {
    wedding:    { neutral: 3, pastel: 2, earth: 1 },
    formal:     { neutral: 3, vibrant: 1, earth: 1 },
    graduation: { neutral: 2, pastel: 2, vibrant: 1 },
    office:     { neutral: 3, earth: 2 },
    casual:     { vibrant: 2, earth: 2, pastel: 2, neutral: 1 },
  },
  // Skin tone: '1' deepest … '5' lightest.
  skin: {
    '1': { vibrant: 2, earth: 2, neutral: 1 },
    '2': { vibrant: 2, earth: 1, pastel: 1 },
    '3': { vibrant: 1, earth: 1, neutral: 1, pastel: 1 },
    '4': { pastel: 2, neutral: 1, vibrant: 1 },
    '5': { pastel: 2, neutral: 2, vibrant: 1 },
  },
  vibe: {
    classic: { neutral: 2, earth: 1 },
    modern:  { vibrant: 2, pastel: 1 },
    minimal: { neutral: 3, pastel: 1 },
  },
  // Direct family preference — high weight so it anchors the result.
  palette: {
    neutral: { neutral: 4 },
    vibrant: { vibrant: 4 },
    pastel:  { pastel:  4 },
    earth:   { earth:   4 },
  },
}

const OCCASION_LABEL = {
  wedding:    'a wedding',
  formal:     'a formal event',
  graduation: 'a graduation',
  office:     'the office',
  casual:     'everyday wear',
}

// Current selections (occasion + skin tone + vibe).
let stylistAnswers = { skin: '', vibe: '', palette: '' }

// A barong's family is whatever the owner tagged it in the dashboard, or null.
function familyOf(b) {
  return (b && b.color_family && COLOR_FAMILIES[b.color_family]) ? b.color_family : null
}

// Distinct in-stock families → Map<familyKey, { count, label }>.
function stockFamilies() {
  const map = new Map()
  allBarongs.forEach((b) => {
    const fam = familyOf(b)
    if (!fam) return
    const entry = map.get(fam) || { count: 0, label: COLOR_FAMILIES[fam].label }
    entry.count += 1
    map.set(fam, entry)
  })
  return map
}

// Score the in-stock families against the answers and pick a winner.
// Returns { ok, family, label, count, fallback } or { ok:false } when no
// tagged stock exists at all.
function scoreColors(answers) {
  const stock = stockFamilies()
  if (stock.size === 0) return { ok: false }

  let best = null
  stock.forEach((info, fam) => {
    let score = 0
    score += (STYLIST_RULES.skin[answers.skin] || {})[fam] || 0
    score += (STYLIST_RULES.vibe[answers.vibe] || {})[fam] || 0
    score += (STYLIST_RULES.palette[answers.palette] || {})[fam] || 0
    // Tie-break by how many pieces are available in that family.
    if (!best || score > best.score || (score === best.score && info.count > best.count)) {
      best = { family: fam, label: info.label, score, count: info.count }
    }
  })

  // score 0 = no rule matched stock; still suggest the most-available family.
  return { ok: true, fallback: best.score === 0, ...best }
}

// Build a short, natural reason for the pick.
function stylistReason(answers, rec) {
  if (rec.fallback) {
    return `These are our most-available pieces right now and pair easily with almost any look.`
  }
  const vibe = answers.vibe === 'modern' ? 'modern, ' : answers.vibe === 'classic' ? 'timeless, ' : answers.vibe === 'minimal' ? 'minimalist, ' : ''
  return `${rec.label} tones are a flattering, ${vibe}easy-to-wear choice for your skin tone.`
}

function openStylist() {
  resetStylist()
  openOverlay($stylistModal)
}

function resetStylist() {
  stylistAnswers = { occasion: '', skin: '', vibe: '' }
  if ($stylistForm) {
    $stylistForm.style.display = 'block'
    $stylistForm.querySelectorAll('.jk-chip.is-selected, .jk-skin-swatch.is-selected')
      .forEach((c) => c.classList.remove('is-selected'))
  }
  if ($stylistSubmit) $stylistSubmit.disabled = true
  if ($stylistResult) { $stylistResult.style.display = 'none'; $stylistResult.innerHTML = '' }
}

// Return to the form with the current selections still intact.
function editStylistAnswers() {
  if ($stylistForm) $stylistForm.style.display = 'block'
  if ($stylistResult) $stylistResult.style.display = 'none'
}

function renderStylistResult() {
  const answers = { ...stylistAnswers }
  const rec = scoreColors(answers)

  if (!rec.ok) {
    // No tagged stock to recommend — point the shopper to us instead.
    $stylistResult.innerHTML = `
      <p class="jk-stylist__rec">We're between drops right now.</p>
      <p class="jk-stylist__reason">Follow along or message us and we'll help you pick the perfect barong for your event.</p>
      <div class="jk-stylist__actions">
        <a href="${MESSENGER_URL}" target="_blank" rel="noopener" class="jk-stylist__view">Message us</a>
        <button type="button" class="jk-stylist__restart" data-stylist-restart>Start over</button>
      </div>`
    $stylistForm.style.display = 'none'
    $stylistResult.style.display = 'block'
    return
  }

  const swatch = COLOR_FAMILIES[rec.family].swatch
  const countLabel = rec.count === 1 ? '1 piece available now' : `${rec.count} pieces available now`
  $stylistResult.innerHTML = `
    <span class="jk-stylist__swatch" style="background:${swatch}" aria-hidden="true"></span>
    <p class="jk-stylist__rec">We recommend <strong>${escapeHtml(rec.label)}</strong> barongs</p>
    <p class="jk-stylist__reason">${escapeHtml(stylistReason(answers, rec))}</p>
    <p class="jk-stylist__count">${countLabel}</p>
    <div class="jk-stylist__actions">
      <button type="button" class="jk-stylist__view" data-stylist-view-family="${rec.family}">View these barongs</button>
      <div class="jk-stylist__actions-secondary">
        <button type="button" class="jk-stylist__restart" data-stylist-edit>Edit answers</button>
        <button type="button" class="jk-stylist__restart" data-stylist-restart>Start over</button>
      </div>
    </div>`
  $stylistForm.style.display = 'none'
  $stylistResult.style.display = 'block'
}

// Filter the live catalog to the recommended family and scroll to the grid.
function viewFamily(family) {
  const def = COLOR_FAMILIES[family]
  closeOverlay($stylistModal)
  searchTerm = ''
  $searchInputs().forEach((inp) => { inp.value = def ? def.label : '' })
  filteredBarongs = allBarongs.filter((b) => familyOf(b) === family)
  loadedCount = 0
  $grid.innerHTML = ''
  $pagination.innerHTML = ''
  renderLoadMore(false)
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
    const shareBtn = e.target.closest('[data-card-share]')
    if (shareBtn) {
      handleCardShare(shareBtn)
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
    // Selection: one choice per group (chips + skin-tone swatches).
    $stylistForm.addEventListener('click', (e) => {
      const opt = e.target.closest('.jk-chip, .jk-skin-swatch')
      if (!opt) return
      const wrap = opt.closest('[data-group]')
      if (!wrap) return
      const group = wrap.dataset.group
      wrap.querySelectorAll('.jk-chip, .jk-skin-swatch').forEach((c) => c.classList.remove('is-selected'))
      opt.classList.add('is-selected')
      stylistAnswers[group] = opt.dataset.value
      if ($stylistSubmit) $stylistSubmit.disabled = false   // any answer enables submit
    })
  }

  if ($stylistSubmit) $stylistSubmit.addEventListener('click', renderStylistResult)

  if ($stylistResult) {
    $stylistResult.addEventListener('click', (e) => {
      const view = e.target.closest('[data-stylist-view-family]')
      if (view) { viewFamily(view.dataset.stylistViewFamily); return }
      if (e.target.closest('[data-stylist-edit]')) { editStylistAnswers(); return }
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

    // Deep-link: /barong?item=<id> opens that item's modal (e.g. from a shared link)
    const itemId = new URLSearchParams(location.search).get('item')
    if (itemId) {
      const match = allBarongs.find((b) => b.id === itemId)
      if (match) openModal(match._index)
    }
  } catch (err) {
    console.error('[barong-catalog] failed to load:', err)
    showError("We couldn't load the catalog right now. Please refresh, or message us on Facebook.")
  }
}

loadCatalog()
