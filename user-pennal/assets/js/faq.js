/* GUGOBET Support - FAQ accordion (home page) */
(function () {
  'use strict';

  var section = document.querySelector('.faq-section');
  if (!section) return;

  function itemOf(btn) {
    return btn.closest ? btn.closest('.faq-item') : null;
  }

  function setOpen(item, open) {
    var btn = item.querySelector('.faq-q');
    var panel = item.querySelector('.faq-a');
    item.classList.toggle('open', open);
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (panel) panel.style.maxHeight = open ? panel.scrollHeight + 'px' : '0px';
  }

  section.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('.faq-q') : null;
    if (!btn) return;
    var item = itemOf(btn);
    if (!item) return;
    setOpen(item, !item.classList.contains('open'));
  });

  window.addEventListener('resize', function () {
    var open = section.querySelectorAll('.faq-item.open');
    for (var i = 0; i < open.length; i++) {
      var panel = open[i].querySelector('.faq-a');
      if (panel) panel.style.maxHeight = panel.scrollHeight + 'px';
    }
  });
})();
