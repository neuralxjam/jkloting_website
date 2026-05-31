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

