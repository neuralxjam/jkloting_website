/* J.Kloting — Footer newsletter signup (posts to /api/subscribe → MailerLite) */
(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.footer-newsletter-form');
    if (!form) return;

    var input = form.querySelector('.footer-newsletter-input');
    var btn = form.querySelector('.footer-newsletter-btn');
    var honey = form.querySelector('input[name="website"]');
    var msg = document.querySelector('.footer-newsletter-msg');
    var emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var email = (input && input.value ? input.value : '').trim();
      if (!emailRe.test(email)) {
        showMsg(false, 'Please enter a valid email address.');
        if (input) input.focus();
        return;
      }

      var original = btn ? btn.textContent : 'Subscribe';
      if (btn) { btn.disabled = true; btn.textContent = 'Subscribing…'; }
      showMsg(null, '');

      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, website: honey ? honey.value : '' }),
      })
        .then(function (res) {
          return res.json().catch(function () {
            return { ok: false, message: 'Something went wrong. Please try again.' };
          });
        })
        .then(function (data) {
          showMsg(!!data.ok, data.message || (data.ok ? 'Subscribed!' : 'Something went wrong.'));
          if (data.ok) form.reset();
        })
        .catch(function () {
          showMsg(false, 'Network error. Please try again.');
        })
        .finally(function () {
          if (btn) { btn.disabled = false; btn.textContent = original; }
        });
    });

    function showMsg(ok, text) {
      if (!msg) return;
      msg.textContent = text || '';
      msg.className =
        'footer-newsletter-msg' + (ok === true ? ' is-success' : ok === false ? ' is-error' : '');
    }
  });
})();
