(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const cfg = window.WEDDING_CONFIG || {};

  const toast = (message) => {
    const el = $('#toast');
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 2200);
  };
  const openDialog = (dialog) => {
    if (!dialog || dialog.open) return;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  };
  const closeDialog = (dialog) => { if (dialog?.open) dialog.close(); };
  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('close', () => { document.body.style.overflow = ''; });
    dialog.addEventListener('click', (event) => {
      const rect = dialog.getBoundingClientRect();
      const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
      if (outside) closeDialog(dialog);
    });
  });

  const targetDate = new Date(cfg.date || '2027-02-13T17:40:00+09:00');
  const pad = (value) => String(Math.max(0, value)).padStart(2, '0');
  const updateCountdown = () => {
    const diff = targetDate.getTime() - Date.now();
    if (diff <= 0) {
      $('#countLabel').textContent = '오늘, 저희 결혼합니다';
      $('#dayline').textContent = 'D-DAY';
      ['days', 'hours', 'mins', 'secs'].forEach((id) => { $('#' + id).textContent = '00'; });
      return;
    }
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    $('#dayline').textContent = `D-${days}`;
    $('#days').textContent = pad(days);
    $('#hours').textContent = pad(Math.floor(totalSeconds % 86400 / 3600));
    $('#mins').textContent = pad(Math.floor(totalSeconds % 3600 / 60));
    $('#secs').textContent = pad(totalSeconds % 60);
  };
  updateCountdown();
  setInterval(updateCountdown, 1000);

  const petalLayer = $('.petals');
  if (petalLayer && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 18; i += 1) {
      const petal = document.createElement('i');
      petal.className = 'petal';
      petal.style.setProperty('--x', `${Math.random() * 100}%`);
      petal.style.setProperty('--delay', `${Math.random() * -18}s`);
      petal.style.setProperty('--t', `${11 + Math.random() * 10}s`);
      petal.style.setProperty('--s', `${7 + Math.random() * 8}px`);
      petal.style.setProperty('--blur', `${Math.random() * 0.7}px`);
      petal.style.setProperty('--dx', `${-40 + Math.random() * 80}px`);
      petalLayer.append(petal);
    }
  }

  const photos = (Array.isArray(cfg.photos) ? cfg.photos : [])
    .map((photo) => typeof photo === 'string' ? { thumb: photo, view: photo, full: photo } : photo)
    .filter((photo) => photo?.view || photo?.full);
  const grid = $('#galleryGrid');
  const lightbox = $('#lightbox');
  let photoIndex = 0;
  let photoToken = 0;
  const showPhoto = (requestedIndex) => {
    if (!photos.length) return;
    photoIndex = (requestedIndex + photos.length) % photos.length;
    const photo = photos[photoIndex];
    const image = $('#bigPhoto');
    const original = $('#originalPhoto');
    const token = ++photoToken;
    image.src = photo.thumb || photo.view || photo.full;
    const preloader = new Image();
    preloader.onload = () => { if (photoToken === token) image.src = photo.view || photo.full; };
    preloader.src = photo.view || photo.full;
    $('#photoNumber').textContent = `${photoIndex + 1} / ${photos.length}`;
    original.hidden = !photo.full || photo.full === photo.view;
    original.disabled = false;
    original.textContent = '고화질 보기';
    openDialog(lightbox);
  };
  if (grid) {
    photos.forEach((photo, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', `웨딩 사진 ${index + 1} 크게 보기`);
      const image = document.createElement('img');
      image.src = photo.thumb || photo.view || photo.full;
      image.loading = 'lazy';
      image.decoding = 'async';
      image.alt = `웨딩 사진 ${index + 1}`;
      button.append(image);
      button.addEventListener('click', () => showPhoto(index));
      grid.append(button);
    });
  }
  $('#prevPhoto')?.addEventListener('click', () => showPhoto(photoIndex - 1));
  $('#nextPhoto')?.addEventListener('click', () => showPhoto(photoIndex + 1));
  $('#closeGallery')?.addEventListener('click', () => closeDialog(lightbox));
  lightbox?.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') showPhoto(photoIndex - 1);
    if (event.key === 'ArrowRight') showPhoto(photoIndex + 1);
  });
  let touchX = 0;
  $('#bigPhoto')?.addEventListener('touchstart', (event) => { touchX = event.changedTouches[0].clientX; }, { passive: true });
  $('#bigPhoto')?.addEventListener('touchend', (event) => {
    const diff = event.changedTouches[0].clientX - touchX;
    if (Math.abs(diff) > 45) showPhoto(photoIndex + (diff < 0 ? 1 : -1));
  }, { passive: true });
  $('#originalPhoto')?.addEventListener('click', () => {
    const photo = photos[photoIndex];
    if (photo?.full) $('#bigPhoto').src = photo.full;
  });

  const online = Boolean(cfg.supabaseUrl && cfg.supabaseAnonKey);
  const apiBase = String(cfg.supabaseUrl || '').replace(/\/$/, '');
  const apiHeaders = online ? { apikey: cfg.supabaseAnonKey, Authorization: `Bearer ${cfg.supabaseAnonKey}` } : {};
  const letterDialog = $('#letterDialog');
  const envelope = $('#envelope');
  const messageList = $('#messageList');
  const guestKey = 'jongsung-yumi-guestbook-v1';
  let localMessages = [];
  try { localMessages = JSON.parse(localStorage.getItem(guestKey) || '[]'); } catch { localMessages = []; }
  if (!Array.isArray(localMessages)) localMessages = [];
  const renderMessages = (items) => {
    messageList.replaceChildren();
    if (!items.length) return;
    const title = document.createElement('strong');
    title.textContent = online ? '최근 메시지' : '이 기기에 저장된 메시지';
    messageList.append(title);
    items.slice(0, 30).forEach((item) => {
      const article = document.createElement('article');
      const name = document.createElement('strong');
      const message = document.createElement('p');
      name.textContent = item.name;
      message.textContent = item.message;
      article.append(name, message);
      messageList.append(article);
    });
  };
  const readMessages = async () => {
    if (!online) { renderMessages(localMessages); return; }
    try {
      const response = await fetch(`${apiBase}/rest/v1/wedding_guestbook?select=name,message,created_at&approved=eq.true&order=created_at.desc&limit=30`, { headers: apiHeaders });
      if (!response.ok) throw new Error('read');
      renderMessages(await response.json());
    } catch { messageList.textContent = '축하 메시지를 불러오지 못했습니다.'; }
  };
  const openLetter = () => {
    envelope?.classList.add('open');
    envelope?.setAttribute('aria-expanded', 'true');
    setTimeout(() => { openDialog(letterDialog); readMessages(); }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650);
  };
  envelope?.addEventListener('click', openLetter);
  $('#guestOpen')?.addEventListener('click', openLetter);
  $('#closeLetter')?.addEventListener('click', () => closeDialog(letterDialog));
  letterDialog?.addEventListener('close', () => { envelope?.classList.remove('open'); envelope?.setAttribute('aria-expanded', 'false'); });
  $('#storageNotice').textContent = online ? '작성한 메시지는 신랑 신부에게 전달됩니다.' : '미리보기: 이 기기에만 저장됩니다.';
  $('#guestForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = form.elements.name.value.trim();
    const message = form.elements.message.value.trim();
    const status = $('#formStatus');
    const submit = form.querySelector('[type=submit]');
    if (!name || !message) { status.textContent = '이름과 메시지를 작성해 주세요.'; return; }
    submit.disabled = true;
    try {
      if (online) {
        const response = await fetch(`${apiBase}/rest/v1/wedding_guestbook`, { method: 'POST', headers: { ...apiHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ name, message }) });
        if (!response.ok) throw new Error('submit');
      } else {
        localMessages.unshift({ name, message, created_at: new Date().toISOString() });
        localMessages = localMessages.slice(0, 100);
        localStorage.setItem(guestKey, JSON.stringify(localMessages));
        renderMessages(localMessages);
      }
      form.reset();
      closeDialog(letterDialog);
      toast(online ? '축하 메시지를 전했어요 ♡' : '이 기기에 메시지를 저장했어요 ♡');
    } catch { status.textContent = '저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'; }
    finally { submit.disabled = false; }
  });

  if (cfg.naverMapClientId) {
    const script = document.createElement('script');
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(cfg.naverMapClientId)}`;
    script.addEventListener('load', () => {
      if (!window.naver?.maps) return;
      const target = document.createElement('div');
      target.style.cssText = 'position:absolute;inset:0';
      $('#map').prepend(target);
      const location = new naver.maps.LatLng(37.5384534, 127.122446);
      const map = new naver.maps.Map(target, { center: location, zoom: 17, zoomControl: true });
      new naver.maps.Marker({ position: location, map, title: '라비니움' });
      $('#fallbackMap').hidden = true;
      $('#mapProvider').textContent = '네이버 지도';
    });
    document.head.append(script);
  }
  $('#tmap')?.addEventListener('click', (event) => {
    if (!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      event.preventDefault();
      window.open('https://www.tmap.co.kr/', '_blank', 'noopener');
      toast('모바일 환경에서 티맵 앱으로 연결됩니다.');
    }
  });
  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast('복사했어요.'); }
    catch {
      const field = document.createElement('textarea');
      field.value = text;
      document.body.append(field);
      field.select();
      try { document.execCommand('copy'); toast('복사했어요.'); } catch { toast('복사할 수 없습니다.'); }
      field.remove();
    }
  };
  $('#copyAddr')?.addEventListener('click', () => copy('서울 송파구 천호대로 996 청람빌딩 4F 블룸홀'));
  document.querySelectorAll('.account-copy').forEach((button) => button.addEventListener('click', () => copy(button.dataset.account)));
  $('#share')?.addEventListener('click', async () => {
    if (!/^https?:/.test(location.protocol)) { toast('웹에 게시한 후 링크 공유가 가능합니다.'); return; }
    if (navigator.share) {
      try { await navigator.share({ title: '이종성 ♥ 전유미 결혼합니다', text: '2027년 2월 13일 오후 5시 40분 · 라비니움', url: location.href }); return; }
      catch (error) { if (error.name === 'AbortError') return; }
    }
    copy(location.href);
  });
  $('#toTop')?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  addEventListener('scroll', () => { $('#toTop').hidden = scrollY < 600; }, { passive: true });

  const rsvpDialog = $('#rsvpDialog');
  const rsvpForm = $('#rsvpForm');
  const rsvpKey = 'jongsung-yumi-rsvp-v1';
  const rsvpDetails = () => {
    const attending = rsvpForm.elements.attendance.value === 'yes';
    $('#attendanceDetails').hidden = !attending;
    rsvpForm.querySelectorAll('[name=meal]').forEach((input) => { input.disabled = !attending; input.required = attending; });
    rsvpForm.elements.companions.disabled = !attending;
  };
  $('#openRsvp')?.addEventListener('click', () => openDialog(rsvpDialog));
  $('#closeRsvp')?.addEventListener('click', () => closeDialog(rsvpDialog));
  $('#skipRsvp')?.addEventListener('click', () => closeDialog(rsvpDialog));
  rsvpForm?.addEventListener('change', rsvpDetails);
  rsvpDetails();
  $('#rsvpNotice').textContent = online ? '전달하신 정보는 예식 준비 목적으로만 이용합니다.' : '미리보기: 입력값은 이 기기에만 저장됩니다.';
  rsvpForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const fields = rsvpForm.elements;
    const attending = fields.attendance.value === 'yes';
    const payload = { guest_name: fields.guest_name.value.trim(), side: fields.side.value, attendance: fields.attendance.value, meal: attending ? fields.meal.value : 'not_applicable', companions: attending ? Number(fields.companions.value || 0) : 0, consent: true };
    const status = $('#rsvpStatus');
    const submit = rsvpForm.querySelector('[type=submit]');
    if (!payload.guest_name) { status.textContent = '성함을 입력해 주세요.'; return; }
    submit.disabled = true;
    try {
      if (online) {
        const response = await fetch(`${apiBase}/rest/v1/wedding_rsvp`, { method: 'POST', headers: { ...apiHeaders, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error('submit');
      } else { localStorage.setItem(rsvpKey, JSON.stringify({ ...payload, created_at: new Date().toISOString() })); }
      rsvpForm.reset();
      rsvpDetails();
      closeDialog(rsvpDialog);
      toast(online ? '참석 여부를 전달했어요. 감사합니다 ♡' : '이 기기에 참석 여부를 저장했어요 ♡');
    } catch { status.textContent = '전달하지 못했습니다. 다시 시도해 주세요.'; }
    finally { submit.disabled = false; }
  });

  const intro = $('#ribbonIntro');
  const invitation = $('#top');
  let introFinished = false;
  let introTimer;
  const finishIntro = () => {
    if (introFinished) return;
    introFinished = true;
    clearTimeout(introTimer);
    intro.hidden = true;
    invitation.inert = false;
    document.body.classList.remove('intro-active');
    try { sessionStorage.setItem('wedding-ribbon-intro-v3', '1'); } catch {}
    setTimeout(() => openDialog(rsvpDialog), 500);
  };
  const untieRibbon = () => {
    if (introFinished) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finishIntro(); return; }
    intro.classList.add('untying');
    $('#untieRibbon').disabled = true;
    introTimer = setTimeout(finishIntro, 2350);
  };
  $('#untieRibbon')?.addEventListener('click', untieRibbon);
  $('#skipIntro')?.addEventListener('click', finishIntro);
  $('.ribbon-scene').style.pointerEvents = 'auto';
  $('.ribbon-scene')?.addEventListener('click', untieRibbon);
  invitation.inert = true;
  document.body.classList.add('intro-active');
  try { if (sessionStorage.getItem('wedding-ribbon-intro-v3') === '1') finishIntro(); } catch {}
})();
