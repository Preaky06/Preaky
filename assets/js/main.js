/* Visionneuse d'images et copie de l'adresse e-mail. Le site reste lisible sans ce script. */
(function () {
  'use strict';

  /* ---- visionneuse : un lien [data-zoom] ouvre l'image en grand ---- */
  var dialog = document.createElement('dialog');
  dialog.className = 'zoom-dialog';
  dialog.setAttribute('aria-label', 'Image agrandie');
  dialog.innerHTML = '<form method="dialog"><button class="zoom-close" type="submit">Fermer</button></form><img alt="">';
  document.body.appendChild(dialog);
  var big = dialog.querySelector('img');

  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[data-zoom]');
    if (!link || typeof dialog.showModal !== 'function') return;
    e.preventDefault();
    var img = link.querySelector('img');
    big.src = link.getAttribute('href');
    big.alt = img ? img.alt : '';
    dialog.showModal();
  });
  /* un clic hors de l'image ferme la visionneuse */
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  /* ---- copie de l'adresse e-mail ---- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    var state = btn.querySelector('.copy-state');
    var initial = state ? state.textContent : '';
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy');
      var done = function () {
        if (!state) return;
        state.textContent = 'Copié';
        setTimeout(function () { state.textContent = initial; }, 1800);
      };
      var fallback = function () {
        var target = document.getElementById(btn.getAttribute('aria-controls'));
        if (!target) return;
        var range = document.createRange();
        range.selectNodeContents(target);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        if (state) state.textContent = 'Sélectionné';
      };
      try {
        navigator.clipboard.writeText(text).then(done, fallback);
      } catch (err) {
        fallback();
      }
    });
  });
})();
