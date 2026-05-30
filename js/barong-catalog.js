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

const PAGE_SIZE = 8 // cards per page
const NEW_COUNT = 4 // newest N pieces get a "New" badge

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

// ---- STATE -----------------------------------------------------------------
let allBarongs = []      // full sorted list; index === modal lookup key
let currentPage = 1
let mobileLoaded = 0     // how many cards shown on mobile so far
let featuredBarongs = [] // featured:true subset, for carousel
let carouselActive = 0   // index inside featuredBarongs
let carouselTimer = null
const CAROUSEL_INTERVAL = 4000

function isMobile() { return window.innerWidth < 768 }

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

  // Carousel dots — only when 2+ images
  const dots = images.length > 1
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
        <div class="jk-card__media">
          <img src="${escapeHtml(mainImg)}" alt="${label}" data-main-img loading="lazy" decoding="async" />
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

// ---- PAGINATION (desktop) --------------------------------------------------
function totalPages() {
  return Math.max(1, Math.ceil(allBarongs.length / PAGE_SIZE))
}

function renderPagination() {
  const pages = totalPages()
  if (pages <= 1) { $pagination.innerHTML = ''; return }
  let html = `<button type="button" class="jk-page jk-page--nav" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''} aria-label="Previous page">&larr;</button>`
  for (let p = 1; p <= pages; p++) {
    html += `<button type="button" class="jk-page${p === currentPage ? ' is-active' : ''}" data-page="${p}" aria-label="Page ${p}">${p}</button>`
  }
  html += `<button type="button" class="jk-page jk-page--nav" data-page="${currentPage + 1}" ${currentPage === pages ? 'disabled' : ''} aria-label="Next page">&rarr;</button>`
  $pagination.innerHTML = html
}

function renderPage(page, scroll) {
  const pages = totalPages()
  currentPage = Math.min(Math.max(1, page), pages)
  const start = (currentPage - 1) * PAGE_SIZE
  const slice = allBarongs.slice(start, start + PAGE_SIZE)
  $grid.innerHTML = slice.map((b, i) => renderCard(b, b._index, i)).join('')
  renderPagination()
  if (window.WOW) { try { new window.WOW().sync() } catch (_) {} }
  if (scroll) {
    const top = document.getElementById('products')
    if (top) window.scrollTo({ top: top.offsetTop - 70, behavior: 'smooth' })
  }
}

// ---- LOAD MORE (mobile) ----------------------------------------------------
function renderLoadMore(append) {
  const slice = allBarongs.slice(mobileLoaded, mobileLoaded + PAGE_SIZE)
  if (!slice.length) return
  const html = slice.map((b, i) => renderCard(b, b._index, mobileLoaded + i)).join('')
  if (append) {
    $grid.insertAdjacentHTML('beforeend', html)
  } else {
    $grid.innerHTML = html
  }
  mobileLoaded += slice.length
  const hasMore = mobileLoaded < allBarongs.length
  $loadMoreWrap.style.display = hasMore ? 'flex' : 'none'
  if (window.WOW) { try { new window.WOW().sync() } catch (_) {} }
}

function initMobileGrid() {
  mobileLoaded = 0
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
  const label = escapeHtml(b.label || 'Barong')
  const price = peso(b.price || 0)
  const size = escapeHtml(b.size || '')
  const mainImg = escapeHtml(images[0])
  const orderUrl = escapeHtml(messengerLinkFor(b))
  return `
    <li class="jk-carousel__slide" data-slide="${slideIndex}" data-index="${b._index}" role="button" tabindex="0" aria-label="View ${label}">
      <div class="jk-carousel__card">
        <div class="jk-carousel__img-wrap">
          <img src="${mainImg}" alt="${label}" />
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
  $allLabel.style.display = 'block'
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
    if (e.target.closest('[data-no-modal]')) return // Reserve link → let it through
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

  // Pagination (desktop)
  $pagination.addEventListener('click', (e) => {
    const btn = e.target.closest('.jk-page')
    if (!btn || btn.disabled) return
    renderPage(Number(btn.dataset.page), true)
  })

  // Load More (mobile)
  $loadMoreBtn.addEventListener('click', () => renderLoadMore(true))

  // Swap modes if window resizes across the breakpoint
  let lastMobile = isMobile()
  window.addEventListener('resize', () => {
    const nowMobile = isMobile()
    if (nowMobile === lastMobile) return
    lastMobile = nowMobile
    if (nowMobile) {
      initMobileGrid()
    } else {
      $loadMoreWrap.style.display = 'none'
      mobileLoaded = 0
      renderPage(1, false)
    }
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

  // Size guide triggers (header link + in-modal link)
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
    featuredBarongs = allBarongs.filter((b) => b.featured === true)

    if ($loading) $loading.style.display = 'none'

    if (allBarongs.length === 0) {
      if ($empty) $empty.style.display = 'block'
      return
    }

    injectProductSchema(allBarongs)

    wireEvents()
    if (featuredBarongs.length) buildCarousel()
    if (isMobile()) {
      initMobileGrid()
    } else {
      renderPage(1, false)
    }
  } catch (err) {
    console.error('[barong-catalog] failed to load:', err)
    showError("We couldn't load the catalog right now. Please refresh, or message us on Facebook.")
  }
}

loadCatalog()
