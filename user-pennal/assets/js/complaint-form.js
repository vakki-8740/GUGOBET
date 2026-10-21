/* GUGOBET Support - shared complaint form logic (deposit / withdrawal / email) */
(function () {
  'use strict';

  function esc(s) { return GS.util.escapeHtml(s); }

  function fieldLabel(form, name) {
    var el = form.elements[name];
    if (!el) return name;
    var wrap = el.closest ? el.closest('.field') : null;
    var label = wrap ? wrap.querySelector('label') : null;
    return label ? label.textContent.replace(/\*/g, '').trim() : name;
  }

  function setFieldError(form, name, message) {
    var el = form.elements[name];
    if (!el) return;
    var wrap = el.closest ? el.closest('.field') : null;
    if (!wrap) return;
    var err = wrap.querySelector('.field-error');
    if (message) {
      wrap.classList.add('error');
      if (err) err.textContent = message;
      el.setAttribute('aria-invalid', 'true');
    } else {
      wrap.classList.remove('error');
      el.removeAttribute('aria-invalid');
    }
  }

  function clearErrors(form) {
    var fields = form.querySelectorAll('.field');
    for (var i = 0; i < fields.length; i++) {
      fields[i].classList.remove('error');
      var el = fields[i].querySelector('input, select, textarea');
      if (el) el.removeAttribute('aria-invalid');
    }
  }

  function readFile(file, cb) {
    var reader = new FileReader();
    reader.onload = function () { cb(null, reader.result); };
    reader.onerror = function () { cb('Could not read the selected file.'); };
    reader.readAsDataURL(file);
  }

  /* Downscale + compress so a 10 MB photo still fits device storage. */
  function encodeImage(file, cb) {
    var settled = false;
    var raw = '';
    var finish = function (err, data) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cb(err, data);
    };
    var timer = setTimeout(function () { finish(null, raw || null); }, 2500);
    readFile(file, function (err, dataUrl) {
      if (err) return finish(err);
      raw = dataUrl;
      var img = new Image();
      img.onerror = function () { finish(null, raw); };
      img.onload = function () {
        try {
          var MAX_DIM = 1600;
          var MAX_CHARS = 700 * 1024;
          var scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          if (!ctx) return finish(null, raw);
          var out = '';
          var qualities = [0.86, 0.72, 0.6, 0.45];
          for (var i = 0; i < qualities.length; i++) {
            canvas.width = w;
            canvas.height = h;
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            out = canvas.toDataURL('image/jpeg', qualities[i]);
            if (out.length <= MAX_CHARS) break;
            w = Math.max(1, Math.round(w * 0.75));
            h = Math.max(1, Math.round(h * 0.75));
          }
          finish(null, out || raw);
        } catch (e) {
          finish(null, raw);
        }
      };
      img.src = raw;
    });
  }

  window.GS_FORM = function (config) {
    var form = document.getElementById(config.formId);
    var successEl = document.getElementById(config.successId);
    var noticeEl = document.getElementById('storageNotice');
    var fileInput = form ? form.querySelector('input[type="file"]') : null;
    var fileLabel = form ? form.querySelector('[data-file-label]') : null;
    var defaultFileLabel = fileLabel ? (fileLabel.textContent || '').trim() : 'Attach screenshot';
    var fileThumb = form ? form.querySelector('[data-file-thumb]') : null;
    var uploadBox = form ? form.querySelector('[data-upload]') : null;
    var uploadBadge = form ? form.querySelector('[data-upload-badge]') : null;
    var proofData = '';
    var proofName = '';

    if (noticeEl) noticeEl.innerHTML = GS.ui.storageWarning();

    if (!form) return;

    /* ---- proof upload (required) ---- */

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var file = fileInput.files && fileInput.files[0];
        proofData = '';
        proofName = '';
        if (uploadBox) uploadBox.classList.remove('has-file');
        if (uploadBadge) uploadBadge.hidden = true;
        if (fileLabel) fileLabel.textContent = defaultFileLabel;

        if (!file) {
          if (uploadBox) {
            var emptyField = uploadBox.closest ? uploadBox.closest('.field') : null;
            if (emptyField) emptyField.classList.add('error');
            if (emptyField) {
              var emptyErr = emptyField.querySelector('.field-error');
              if (emptyErr) emptyErr.textContent = 'Please upload the image.';
            }
          }
          return;
        }
        if (!/^image\//.test(file.type)) {
          GS.ui.toast('Only image files are supported.', 'error');
          fileInput.value = '';
          return;
        }
        if (file.size > GS.PROOF_LIMIT) {
          GS.ui.toast('Image is too large. Limit is 10 MB.', 'error');
          fileInput.value = '';
          return;
        }
        encodeImage(file, function (err, data) {
          if (err) { GS.ui.toast(err, 'error'); fileInput.value = ''; return; }
          proofData = data;
          proofName = file.name;
          if (fileLabel) fileLabel.textContent = file.name;
          if (fileThumb) fileThumb.src = data;
          if (uploadBox) uploadBox.classList.add('has-file');
          if (uploadBadge) uploadBadge.hidden = false;
          if (uploadBox) {
            var boxField = uploadBox.closest ? uploadBox.closest('.field') : null;
            if (boxField) boxField.classList.remove('error');
          }
          GS.ui.toast('Image uploaded', 'success');
        });
      });
    }

    /* ---- validation ---- */

    function validate() {
      clearErrors(form);
      var firstBad = null;

      for (var i = 0; i < config.fields.length; i++) {
        var f = config.fields[i];
        var el = form.elements[f.name];
        if (!el) continue;
        var val = (el.value || '').trim();

        if (f.required && !val) {
          setFieldError(form, f.name, f.requiredMsg || (fieldLabel(form, f.name) + ' is required.'));
          if (!firstBad) firstBad = el;
          continue;
        }
        if (val && f.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) {
          setFieldError(form, f.name, f.errorMsg || 'Enter a valid email address.');
          if (!firstBad) firstBad = el;
          continue;
        }
        if (val && f.type === 'number') {
          var num = parseFloat(val.replace(/[^\d.]/g, ''));
          if (isNaN(num) || num <= 0) {
            setFieldError(form, f.name, f.errorMsg || 'Enter a valid amount.');
            if (!firstBad) firstBad = el;
          }
        }
        if (f.maxLen && val.length > f.maxLen) {
          setFieldError(form, f.name, 'Maximum ' + f.maxLen + ' characters allowed.');
          if (!firstBad) firstBad = el;
        }
      }

      if (!proofData) {
        if (uploadBox) {
          var uploadField = uploadBox.closest ? uploadBox.closest('.field') : null;
          if (uploadField) {
            uploadField.classList.add('error');
            var uploadErr = uploadField.querySelector('.field-error');
            if (uploadErr) uploadErr.textContent = 'Please upload the image.';
          }
        }
        if (!firstBad) firstBad = fileInput;
      }

      if (firstBad) {
        firstBad.focus();
        if (firstBad.scrollIntoView) firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return false;
      }
      return true;
    }

    form.addEventListener('input', function (e) {
      var wrap = e.target.closest ? e.target.closest('.field') : null;
      if (wrap && wrap.classList.contains('error')) wrap.classList.remove('error');
    });

    /* ---- collect ---- */

    function collect() {
      var data = { category: config.category, proof: proofData };
      for (var i = 0; i < config.fields.length; i++) {
        var f = config.fields[i];
        var el = form.elements[f.name];
        data[f.name] = el ? (el.value || '').trim() : '';
      }
      return data;
    }

    /* ---- submit ---- */

    var submitBtn = form.querySelector('[type="submit"]');
    var submitting = false;

    function setLoading(on) {
      submitting = on;
      if (!submitBtn) return;
      submitBtn.disabled = on;
      submitBtn.classList.toggle('is-loading', on);
      submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (submitting) return;
      if (!validate()) return;
      doSubmit(collect());
    });

    function revealSuccess(c) {
      form.hidden = true;
      if (!successEl) return;
      successEl.hidden = false;
      successEl.innerHTML =
        '<div class="mark">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' +
        '</div>' +
        '<h2>Complaint saved</h2>' +
        '<p>Submitted on ' + esc(GS.util.fmtDateTime(c.createdAt)) + '</p>' +
        '<div class="notice" style="text-align:left;margin-top:16px;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>' +
        '<span>You can track this complaint and its live status in your Inbox.</span>' +
        '</div>' +
        '<div class="actions">' +
        '<a class="btn btn-primary" href="inbox.html">View Inbox</a>' +
        '<a class="btn btn-ghost" href="index.html">Home</a>' +
        '</div>';
      if (successEl.scrollIntoView) successEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }

    function showSentPopup(c) {
      var root = GS.ui.openModal(
        '<div class="modal-sent">' +
        '<p class="modal-sent-text">Your complain Sent to GUGOBET support center please wait for 30 minites ⌛</p>' +
        '<div class="modal-actions">' +
        '<button type="button" class="btn btn-primary" data-act="ok">OK</button>' +
        '</div>' +
        '</div>',
        null
      );
      root.classList.add('modal-center');
      root.querySelector('[data-act="ok"]').addEventListener('click', function () {
        GS.ui.closeModal();
        revealSuccess(c);
      });
    }

    function doSubmit(data) {
      setLoading(true);

      var res = GS.complaints.add(data);
      if (!res.ok) {
        setLoading(false);
        GS.ui.toast(res.error || 'Could not save the complaint.', 'error');
        return;
      }

      var c = res.complaint;

      if (window.GBET_FB_USER && typeof GBET_FB_USER.save === 'function') {
        GBET_FB_USER.save(c).catch(function () {
          /* no internet: local copy is still saved */
        });
      }

      window.setTimeout(function () {
        setLoading(false);
        GS.ui.toast('Complaint saved locally.', 'success');
        showSentPopup(c);
      }, 3000);
    }
  };
})();
