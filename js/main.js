(function($) {
  
  "use strict";

  // Sticky Nav
    $(window).on('scroll', function() {
        if ($(window).scrollTop() > 200) {
            $('.scrolling-navbar').addClass('top-nav-collapse');
        } else {
            $('.scrolling-navbar').removeClass('top-nav-collapse');
        }
    });

    /* 
   One Page Navigation & wow js
   ========================================================================== */
    // Minimal animations: only hero sections animate on load
    document.querySelectorAll('.wow').forEach(function(el) {
      var inHero = el.closest('#hero-area') || el.closest('#barong-hero');
      if (!inHero) {
        el.classList.remove('wow');
        el.style.visibility = 'visible';
      }
    });
    new WOW({ offset: 0 }).init();

    // one page navigation 
    $('.main-navigation').onePageNav({
            currentClass: 'active'
    }); 

    $(window).on('load', function() {
       
        $('body').scrollspy({
            target: '.navbar-collapse',
            offset: 195
        });

        $(window).on('scroll', function() {
            if ($(window).scrollTop() > 200) {
                $('.fixed-top').addClass('menu-bg');
            } else {
                $('.fixed-top').removeClass('menu-bg');
            }
        });

    });

    // Mobile drawer is initialized from js/mobile-drawer.js (vanilla JS, no jQuery)


/*
   CounterUp
   ========================================================================== */
    if ($('.counter').length) {
      $('.counter').counterUp({
        time: 1000
      });
    }

/*
   Portfolio Gallery Carousel (Owl Carousel)
   ========================================================================== */
    if ($('#portfolio-carousel').length) {
      $('#portfolio-carousel').owlCarousel({
        navigation: true,
        pagination: true,
        slideSpeed: 600,
        stopOnHover: true,
        autoPlay: 5000,
        items: 3,
        itemsDesktop: [1199, 3],
        itemsDesktopSmall: [1024, 3],
        itemsTablet: [768, 2],
        itemsMobile: [479, 1]
      });
      $('#portfolio-carousel').find('.owl-prev').html('<i class="lnr lnr-chevron-left"></i>');
      $('#portfolio-carousel').find('.owl-next').html('<i class="lnr lnr-chevron-right"></i>');
    }

/*
   Testimonials Carousel (Owl Carousel)
   ========================================================================== */
    if ($('#testimonials-carousel').length) {
      // Show a "Read more" cue only on cards whose quote was clamped (overflowing).
      function markTruncatedTestimonials() {
        $('#testimonials-carousel .testimonial-card').each(function () {
          var quote = this.querySelector('.testimonial-quote');
          var btn = this.querySelector('.testimonial-readmore');
          if (!quote) return;
          var clamped = quote.scrollHeight > quote.clientHeight + 2;
          if (clamped && !btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'testimonial-readmore';
            btn.textContent = 'Read more';
            quote.insertAdjacentElement('afterend', btn);
          } else if (!clamped && btn) {
            btn.parentNode.removeChild(btn);
          }
        });
        equalizeCardHeights();
      }

      // Make all cards in the same Owl page the same height as the tallest one.
      function equalizeCardHeights() {
        var cards = $('#testimonials-carousel .testimonial-card');
        cards.css('height', '');           // reset so we measure natural height
        var maxH = 0;
        cards.each(function () { maxH = Math.max(maxH, $(this).outerHeight()); });
        if (maxH > 0) cards.css('height', maxH + 'px');
      }

      $('#testimonials-carousel').owlCarousel({
        navigation: false,
        pagination: true,
        slideSpeed: 600,
        stopOnHover: true,
        autoPlay: 6000,
        items: 3,
        itemsDesktop: [1199, 3],
        itemsDesktopSmall: [1024, 3],
        itemsTablet: [768, 2],
        itemsMobile: [575, 1],
        afterInit: markTruncatedTestimonials,
        afterUpdate: markTruncatedTestimonials
      });

      // Open the pop-out modal from the whole card; ignore drags so swiping doesn't trigger it.
      var tmDownX = 0, tmDownY = 0, tmMoved = false;
      $('#testimonials-carousel').on('mousedown touchstart', '.testimonial-card', function (e) {
        var p = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
        tmDownX = p.pageX; tmDownY = p.pageY; tmMoved = false;
      });
      $('#testimonials-carousel').on('mousemove touchmove', '.testimonial-card', function (e) {
        var p = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
        if (Math.abs(p.pageX - tmDownX) > 8 || Math.abs(p.pageY - tmDownY) > 8) tmMoved = true;
      });
      $('#testimonials-carousel').on('click', '.testimonial-card', function (e) {
        if (tmMoved) return;             // it was a swipe/drag, not a tap
        if (e.target.closest('a')) return;
        openTestimonialModal(this);
      });
    }

    function openTestimonialModal(card) {
      var modal = document.getElementById('testimonial-modal');
      if (!modal || !card) return;
      modal.querySelector('.testimonial-modal__stars').innerHTML = card.querySelector('.testimonial-stars').innerHTML;
      modal.querySelector('.testimonial-modal__quote').textContent = card.querySelector('.testimonial-quote').textContent;
      modal.querySelector('.testimonial-modal__author h5').textContent = card.querySelector('.testimonial-author h5').textContent;
      modal.querySelector('.testimonial-modal__author span').textContent = card.querySelector('.testimonial-author span').textContent;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('testimonial-modal-open');
    }
    function closeTestimonialModal() {
      var modal = document.getElementById('testimonial-modal');
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('testimonial-modal-open');
    }
    $(document).on('click', '[data-tm-close]', closeTestimonialModal);
    $(document).on('keyup', function (e) {
      if (e.key === 'Escape' || e.keyCode === 27) closeTestimonialModal();
    });

/*
   Touch Owl Carousel
   ========================================================================== */
    if ($('.touch-slider').length) {
      var owl = $(".touch-slider");
      owl.owlCarousel({
        navigation: false,
        pagination: true,
        slideSpeed: 1000,
        stopOnHover: true,
        autoPlay: true,
        items: 2,
        itemsDesktop : [1199,2],
        itemsDesktopSmall: [1024, 2],
        itemsTablet: [600, 1],
        itemsMobile: [479, 1]
      });
      $('.touch-slider').find('.owl-prev').html('<i class="fa fa-chevron-left"></i>');
      $('.touch-slider').find('.owl-next').html('<i class="fa fa-chevron-right"></i>');
    }

/* 
   Sticky Nav
   ========================================================================== */
    $(window).on('scroll', function() {
        if ($(window).scrollTop() > 200) {
            $('.header-top-area').addClass('menu-bg');
        } else {
            $('.header-top-area').removeClass('menu-bg');
        }
    });

/*
   VIDEO POP-UP
   ========================================================================== */
    if ($('.video-popup').length) {
      $('.video-popup').magnificPopup({
          disableOn: 700,
          type: 'iframe',
          mainClass: 'mfp-fade',
          removalDelay: 160,
          preloader: false,
          fixedContentPos: false,
      });
    }


  /* 
   SMOOTH SCROLL
   ========================================================================== */
    var scrollAnimationTime = 1200,
        scrollAnimation = 'easeInOutExpo';

    $('a.scrollto').on('bind', 'click.smoothscroll', function (event) {
        event.preventDefault();
        var target = this.hash;
        
        $('html, body').stop().animate({
            'scrollTop': $(target).offset().top
        }, scrollAnimationTime, scrollAnimation, function () {
            window.location.hash = target;
        });
    });

/* 
   Back Top Link
   ========================================================================== */
    var offset = 200;
    var duration = 500;
    $(window).scroll(function() {
      if ($(this).scrollTop() > offset) {
        $('.back-to-top').fadeIn(400);
      } else {
        $('.back-to-top').fadeOut(400);
      }
    });

    $('.back-to-top').on('click',function(event) {
      event.preventDefault();
      $('html, body').animate({
        scrollTop: 0
      }, 600);
      return false;
    })

/* Nivo Lightbox
  ========================================================*/
    if ($('.lightbox').length) {
      $('.lightbox').nivoLightbox({
        effect: 'fadeScale',
        keyboardNav: true,
      });
    }


/* stellar js
  ========================================================*/
  $.stellar({
    horizontalScrolling: true,
    verticalOffset: 40,
    responsive: true
  });

/* 
   Page Loader
   ========================================================================== */
  $('#loader').fadeOut();

}(jQuery));

