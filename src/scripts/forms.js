// Shared form behaviour (EnquiryForm, ContactForm boards): custom validation on submit, a focused
// error summary whose links jump to the fields, inline errors tied with aria-describedby, values kept.
// Each control carries its own messages (data-required-msg, data-format-msg); its type decides the
// format check (email, or a 10-digit Indian mobile for tel).
// demo mode: a valid submit says plainly that nothing was sent and keeps everything typed.
// live mode: posts the form to its action (sending → sent, or failed with values kept).
function problem(control) {
  const v = control.value.trim();
  if (!v) return control.required ? control.dataset.requiredMsg || 'Fill in this field' : '';
  if (control.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return control.dataset.formatMsg || 'Enter a valid email address';
  if (control.type === 'tel') {
    const digits = v.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (digits.length !== 10) return control.dataset.formatMsg || 'Enter a 10-digit mobile number';
  }
  return '';
}

document.querySelectorAll('form[data-enquiry], form[data-form]').forEach((form) => {
  form.noValidate = true;
  const summary = form.querySelector('[data-enquiry-summary]');
  const list = form.querySelector('[data-enquiry-summary-list]');
  const title = form.querySelector('[data-enquiry-summary-title]');
  const demo = form.querySelector('[data-enquiry-demo]');
  const live = form.querySelector('[data-enquiry-live]');
  const controls = [...form.querySelectorAll('input, select, textarea')].filter((c) => c.name);

  function setError(control, msg) {
    const box = control.closest('[data-field]');
    if (!box) return;
    box.querySelector('[data-field-error-text]').textContent = msg;
    box.querySelector('[data-field-error]').hidden = !msg;
    box.classList.toggle('has-error', !!msg);
    if (msg) control.setAttribute('aria-invalid', 'true'); else control.removeAttribute('aria-invalid');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (demo) demo.hidden = true;
    const errors = [];
    for (const control of controls) {
      const msg = problem(control);
      setError(control, msg);
      if (msg) errors.push({ id: control.id, msg });
    }
    if (errors.length) {
      list.replaceChildren(...errors.map(({ id, msg }) => {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `#${id}`;
        a.textContent = msg;
        a.addEventListener('click', (ev) => { ev.preventDefault(); document.getElementById(id).focus(); });
        li.append(a);
        return li;
      }));
      title.textContent = errors.length === 1 ? 'There is 1 problem with this form' : `There are ${errors.length} problems with this form`;
      summary.hidden = false;
      summary.focus();
      return;
    }
    summary.hidden = true;

    if (form.dataset.mode !== 'live') {
      demo.hidden = false;
      demo.focus();
      return;
    }

    // Live mode (wired up once a form service is chosen): post, then report honestly.
    const button = form.querySelector('[data-enquiry-submit]');
    const label = button.textContent;
    button.disabled = true;
    button.textContent = 'Sending…';
    live.textContent = 'Sending';
    fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); live.textContent = 'Sent'; button.textContent = label; })
      .catch(() => { live.textContent = 'Could not be sent. Nothing you typed has been lost.'; button.textContent = 'Try again'; })
      .finally(() => { button.disabled = false; });
  });
});
