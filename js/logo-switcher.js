/* Logo Switcher on Navbar Scroll
 * This will switch between white and dark logo based on scroll position
 */

(function ($) {
  "use strict";

  // Logo switcher configuration
  var logoWhite = "img/logo-white.png"; // Path to your white logo
  var logoDark = "img/logo.png"; // Path to your dark/colored logo
  var scrollThreshold = 200; // Synced with .top-nav-collapse threshold so the wordmark
                              // (with its baked-in white background) only appears once the
                              // navbar itself has turned white — prevents the white-box-on-dark-nav artifact

  // Get the logo element
  var $logo = $(".navbar-brand img");

  // Check scroll position and switch logo
  function switchLogo() {
    if ($(window).scrollTop() > scrollThreshold) {
      // Scrolled - use dark logo
      $logo.attr("src", logoDark);
    } else {
      // At top - use white logo
      $logo.attr("src", logoWhite);
    }
  }

  // Run on page load
  switchLogo();

  // Run on scroll
  $(window).on("scroll", function () {
    switchLogo();
  });
})(jQuery);
