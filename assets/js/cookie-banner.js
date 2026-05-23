(function() {
  'use strict';

  // Only show if not yet accepted
  if (localStorage.getItem('hdl_cookie_consent')) return;

  var banner = document.createElement('div');
  banner.id = 'hdl-cookie-banner';
  banner.style.cssText = [
    'position:fixed',
    'bottom:0',
    'left:0',
    'right:0',
    'z-index:9999',
    'background:#1b1c1c',
    'color:#fbf9f8',
    'padding:20px 24px',
    'font-family:Manrope,sans-serif',
    'font-size:14px',
    'line-height:1.5',
    'box-shadow:0 -4px 20px rgba(0,0,0,0.2)'
  ].join(';');

  var inner = document.createElement('div');
  inner.style.cssText = 'max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;';

  var text = document.createElement('div');
  text.style.cssText = 'flex:1;min-width:260px;';
  text.innerHTML = 'Questo sito utilizza cookie tecnici e di analytics per offrirti la migliore esperienza. '
    + '<a href="/privacy.html" style="color:#87d992;text-decoration:underline;">Maggiori informazioni</a>';

  var btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex;gap:10px;flex-shrink:0;';

  var acceptBtn = document.createElement('button');
  acceptBtn.textContent = 'Accetta';
  acceptBtn.style.cssText = 'background:#186C32;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-weight:600;font-size:13px;cursor:pointer;';

  var declineBtn = document.createElement('button');
  declineBtn.textContent = 'Rifiuta';
  declineBtn.style.cssText = 'background:transparent;color:#ccc;border:1px solid #555;padding:10px 20px;border-radius:8px;font-size:13px;cursor:pointer;';

  var closeFunc = function() {
    if (banner.parentElement) banner.remove();
  };

  acceptBtn.addEventListener('click', function() {
    localStorage.setItem('hdl_cookie_consent', 'accepted');
    closeFunc();
  });

  declineBtn.addEventListener('click', function() {
    localStorage.setItem('hdl_cookie_consent', 'declined');
    closeFunc();
  });

  btnRow.appendChild(acceptBtn);
  btnRow.appendChild(declineBtn);
  inner.appendChild(text);
  inner.appendChild(btnRow);
  banner.appendChild(inner);
  document.body.appendChild(banner);
})();
