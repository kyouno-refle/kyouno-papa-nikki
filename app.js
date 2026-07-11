'use strict';

window.addEventListener('DOMContentLoaded', async () => {
  const $ = (id) => document.getElementById(id);
  const required = ['SUPABASE_URL','SUPABASE_ANON_KEY','POSTS_TABLE','IMAGES_BUCKET'];
  for (const key of required) {
    if (!window[key]) {
      document.body.insertAdjacentHTML('afterbegin', `<div style="position:fixed;inset:0;z-index:9999;background:#080914;color:#fff;padding:30px">設定エラー：${key} がありません。</div>`);
      return;
    }
  }

  const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
  let currentUser = null;
  let currentFilter = '';

  const els = {
    authActions: $('authActions'), authModal: $('authModal'), mypageModal: $('mypageModal'),
    openLoginBtn: $('openLoginBtn'), openRegisterBtn: $('openRegisterBtn'),
    gateLoginBtn: $('gateLoginBtn'), gateRegisterBtn: $('gateRegisterBtn'), postGate: $('postGate'),
    closeAuthBtn: $('closeAuthBtn'), closeMypageBtn: $('closeMypageBtn'),
    loginTabBtn: $('loginTabBtn'), registerTabBtn: $('registerTabBtn'),
    loginForm: $('loginForm'), registerForm: $('registerForm'), recoveryForm: $('recoveryForm'),
    loginStatus: $('loginStatus'), registerStatus: $('registerStatus'), recoveryStatus: $('recoveryStatus'),
    postForm: $('postForm'), postStatus: $('postStatus'), postsList: $('postsList'), postCount: $('postCount'), rankingList: $('rankingList'),
    searchInput: $('searchInput'), searchBtn: $('searchBtn'), reloadBtn: $('reloadBtn'), floatingPostBtn: $('floatingPostBtn'),
    mypageNickname: $('mypageNickname'), mypageEmail: $('mypageEmail'), myPostsList: $('myPostsList'), mypageStatus: $('mypageStatus'),
    refreshMyPostsBtn: $('refreshMyPostsBtn'), logoutBtn: $('logoutBtn')
  };

  const esc = (value='') => String(value).replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
  const stars = (n) => '★'.repeat(Number(n || 0)) + '☆'.repeat(Math.max(0, 5 - Number(n || 0)));
  const nameOf = (user) => user?.user_metadata?.nickname || user?.email?.split('@')[0] || '会員';
  const setStatus = (el, text, isError=false) => { el.textContent = text; el.style.color = isError ? '#ff7886' : '#ffd4ea'; };

  function openModal(modal) { modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); }
  function closeModal(modal) { modal.classList.remove('open'); modal.setAttribute('aria-hidden','true'); }

  function setAuthMode(mode) {
    const isLogin = mode === 'login';
    const isRegister = mode === 'register';
    els.loginForm.classList.toggle('hidden', !isLogin);
    els.registerForm.classList.toggle('hidden', !isRegister);
    els.recoveryForm.classList.toggle('hidden', mode !== 'recovery');
    els.loginTabBtn.classList.toggle('active', isLogin);
    els.registerTabBtn.classList.toggle('active', isRegister);
    els.loginTabBtn.classList.toggle('hidden', mode === 'recovery');
    els.registerTabBtn.classList.toggle('hidden', mode === 'recovery');
    openModal(els.authModal);
  }

  function bindStaticEvents() {
    els.openLoginBtn?.addEventListener('click', () => setAuthMode('login'));
    els.openRegisterBtn?.addEventListener('click', () => setAuthMode('register'));
    els.gateLoginBtn.addEventListener('click', () => setAuthMode('login'));
    els.gateRegisterBtn.addEventListener('click', () => setAuthMode('register'));
    els.loginTabBtn.addEventListener('click', () => setAuthMode('login'));
    els.registerTabBtn.addEventListener('click', () => setAuthMode('register'));
    els.closeAuthBtn.addEventListener('click', () => closeModal(els.authModal));
    els.closeMypageBtn.addEventListener('click', () => closeModal(els.mypageModal));
    els.authModal.addEventListener('click', (e) => { if (e.target === els.authModal) closeModal(els.authModal); });
    els.mypageModal.addEventListener('click', (e) => { if (e.target === els.mypageModal) closeModal(els.mypageModal); });
    els.searchBtn.addEventListener('click', () => { currentFilter = els.searchInput.value.trim(); loadPosts(); });
    els.reloadBtn.addEventListener('click', loadPosts);
    els.searchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { currentFilter = els.searchInput.value.trim(); loadPosts(); } });
    document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => {
      currentFilter = button.dataset.category || '';
      els.searchInput.value = currentFilter;
      loadPosts();
      document.getElementById('posts').scrollIntoView({behavior:'smooth'});
    }));
    els.floatingPostBtn.addEventListener('click', () => {
      if (!currentUser) setAuthMode('register');
      else document.getElementById('post').scrollIntoView({behavior:'smooth'});
    });
  }

  function updateAuthUI() {
    if (currentUser) {
      els.authActions.innerHTML = `<button class="btn ghost" id="mypageBtn" type="button">👤 ${esc(nameOf(currentUser))}</button>`;
      document.getElementById('mypageBtn').addEventListener('click', openMypage);
      els.postGate.classList.add('hidden');
      $('nickname').value = nameOf(currentUser);
    } else {
      els.authActions.innerHTML = '<button class="btn ghost" id="openLoginBtn2" type="button">👤 ログイン</button><button class="btn primary" id="openRegisterBtn2" type="button">無料会員登録</button>';
      document.getElementById('openLoginBtn2').addEventListener('click', () => setAuthMode('login'));
      document.getElementById('openRegisterBtn2').addEventListener('click', () => setAuthMode('register'));
      els.postGate.classList.remove('hidden');
    }
  }

  async function initAuth() {
    const { data, error } = await sb.auth.getSession();
    if (error) console.error(error);
    currentUser = data?.session?.user || null;
    updateAuthUI();

    sb.auth.onAuthStateChange((event, session) => {
      currentUser = session?.user || null;
      updateAuthUI();
      if (event === 'SIGNED_IN') closeModal(els.authModal);
      if (event === 'PASSWORD_RECOVERY') setAuthMode('recovery');
    });
  }

  els.loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(els.loginStatus, 'ログイン中...');
    const { error } = await sb.auth.signInWithPassword({
      email: $('loginEmail').value.trim(),
      password: $('loginPassword').value
    });
    if (error) return setStatus(els.loginStatus, `ログインできません：${error.message}`, true);
    setStatus(els.loginStatus, 'ログインしました。');
  });

  els.registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    setStatus(els.registerStatus, '登録中...');
    const nickname = $('registerNickname').value.trim();
    const email = $('registerEmail').value.trim();
    const password = $('registerPassword').value;
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { nickname }, emailRedirectTo: `${location.origin}/` }
    });
    if (error) return setStatus(els.registerStatus, `登録できません：${error.message}`, true);
    if (data.session) setStatus(els.registerStatus, '登録してログインしました。');
    else setStatus(els.registerStatus, '確認メールを送信しました。メール内のリンクを押してください。');
  });

  $('forgotPasswordBtn').addEventListener('click', async () => {
    const email = $('loginEmail').value.trim();
    if (!email) return setStatus(els.loginStatus, '先にメールアドレスを入力してください。', true);
    const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/` });
    if (error) return setStatus(els.loginStatus, `送信できません：${error.message}`, true);
    setStatus(els.loginStatus, 'パスワード再設定メールを送りました。');
  });

  els.recoveryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = $('newPassword').value;
    const { error } = await sb.auth.updateUser({ password });
    if (error) return setStatus(els.recoveryStatus, `更新できません：${error.message}`, true);
    setStatus(els.recoveryStatus, 'パスワードを更新しました。');
    setTimeout(() => closeModal(els.authModal), 700);
  });

  async function uploadImage(file) {
    if (!file) return null;
    if (file.size > 5 * 1024 * 1024) throw new Error('画像は5MB以下にしてください。');
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from(window.IMAGES_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false });
    if (error) throw error;
    const { data } = sb.storage.from(window.IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  els.postForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return setAuthMode('register');
    if (!els.postForm.reportValidity()) return;
    setStatus(els.postStatus, '投稿中...');
    try {
      const imageUrl = await uploadImage($('photo').files[0] || null);
      const payload = {
        user_id: currentUser.id,
        nickname: $('nickname').value.trim() || nameOf(currentUser),
        category: $('category').value,
        area: $('area').value.trim(),
        title: $('title').value.trim(),
        rating: Number($('rating').value),
        body: $('body').value.trim(),
        image_url: imageUrl,
        is_public: true,
        is_deleted: false,
        likes_count: 0,
        reports_count: 0
      };
      const { error } = await sb.from(window.POSTS_TABLE).insert(payload);
      if (error) throw error;
      els.postForm.reset();
      $('nickname').value = nameOf(currentUser);
      setStatus(els.postStatus, '投稿しました！');
      await loadPosts();
      document.getElementById('posts').scrollIntoView({behavior:'smooth'});
    } catch (error) {
      setStatus(els.postStatus, `投稿できません：${error.message}`, true);
    }
  });

  function postHtml(post) {
    const image = post.image_url ? `style="background-image:url('${esc(post.image_url)}')"` : '';
    const date = post.created_at ? new Date(post.created_at).toLocaleDateString('ja-JP') : '';
    return `<article class="post-card">
      <div class="post-image" ${image}>${post.image_url ? '' : 'NO PHOTO'}<span class="badge">${esc(post.category || '')}</span></div>
      <div class="post-content">
        <div class="meta">📍 ${esc(post.area || '')}<span style="float:right">${esc(date)}</span></div>
        <h3>${esc(post.title || '')}</h3>
        <div class="stars">${stars(post.rating)} ${Number(post.rating || 0)}.0</div>
        <p>${esc(post.body || '')}</p>
        <small class="muted">投稿者：${esc(post.nickname || '匿名さん')}</small>
      </div>
    </article>`;
  }

  async function loadPosts() {
    els.postsList.innerHTML = '<p class="muted">読み込み中...</p>';
    let query = sb.from(window.POSTS_TABLE).select('*').eq('is_public', true).eq('is_deleted', false).order('created_at', { ascending: false }).limit(100);
    if (currentFilter) query = query.or(`title.ilike.%${currentFilter}%,area.ilike.%${currentFilter}%,category.ilike.%${currentFilter}%,body.ilike.%${currentFilter}%`);
    const { data, error } = await query;
    if (error) {
      els.postsList.innerHTML = `<p class="muted">読み込みエラー：${esc(error.message)}</p>`;
      els.postCount.textContent = '−';
      return;
    }
    const rows = data || [];
    els.postCount.textContent = `${rows.length}件`;
    els.postsList.innerHTML = rows.length ? rows.map(postHtml).join('') : '<p class="muted">投稿はまだありません。</p>';
    const ranking = [...rows].sort((a,b) => Number(b.likes_count || 0) - Number(a.likes_count || 0)).slice(0,5);
    els.rankingList.innerHTML = ranking.length ? ranking.map((post,index) => `<div class="ranking-item"><div class="ranking-num">${index+1}</div><div><strong>${esc(post.title || '')}</strong><div class="muted">${esc(post.category || '')}</div></div></div>`).join('') : '<p class="muted">投稿が増えると表示されます。</p>';
  }

  async function openMypage() {
    if (!currentUser) return setAuthMode('login');
    els.mypageNickname.textContent = nameOf(currentUser);
    els.mypageEmail.textContent = currentUser.email || '';
    openModal(els.mypageModal);
    await loadMyPosts();
  }

  async function loadMyPosts() {
    els.myPostsList.innerHTML = '<p class="muted">読み込み中...</p>';
    const { data, error } = await sb.from(window.POSTS_TABLE).select('*').eq('user_id', currentUser.id).order('created_at', {ascending:false});
    if (error) return els.myPostsList.innerHTML = `<p class="muted">読み込みエラー：${esc(error.message)}</p>`;
    const rows = data || [];
    els.myPostsList.innerHTML = rows.length ? rows.map((post) => `<div class="my-post"><div><strong>${esc(post.title)}</strong><div class="muted">${esc(post.category)}・${new Date(post.created_at).toLocaleDateString('ja-JP')}</div></div><div class="my-post-buttons"><button class="btn ghost edit-post-btn" data-id="${post.id}" type="button">編集</button><button class="btn danger delete-post-btn" data-id="${post.id}" type="button">削除</button></div></div>`).join('') : '<p class="muted">自分の投稿はまだありません。</p>';
    document.querySelectorAll('.edit-post-btn').forEach((button) => button.addEventListener('click', async () => {
      const post = rows.find((row) => String(row.id) === String(button.dataset.id));
      if (!post) return;
      const title = prompt('タイトルを編集', post.title || '');
      if (title === null) return;
      const area = prompt('地域を編集', post.area || '');
      if (area === null) return;
      const body = prompt('本文を編集', post.body || '');
      if (body === null) return;
      const ratingText = prompt('評価を1〜5で入力', String(post.rating || 3));
      if (ratingText === null) return;
      const rating = Number(ratingText);
      if (!title.trim() || !body.trim() || !Number.isInteger(rating) || rating < 1 || rating > 5) {
        return setStatus(els.mypageStatus, 'タイトル・本文・評価（1〜5）を正しく入力してください。', true);
      }
      const { error: updateError } = await sb.from(window.POSTS_TABLE).update({
        title: title.trim(), area: area.trim(), body: body.trim(), rating
      }).eq('id', button.dataset.id).eq('user_id', currentUser.id);
      if (updateError) return setStatus(els.mypageStatus, `編集できません：${updateError.message}`, true);
      setStatus(els.mypageStatus, '投稿を更新しました。');
      await Promise.all([loadMyPosts(), loadPosts()]);
    }));
    document.querySelectorAll('.delete-post-btn').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('この投稿を削除しますか？')) return;
      const { error: deleteError } = await sb.from(window.POSTS_TABLE).update({is_deleted:true}).eq('id', button.dataset.id).eq('user_id', currentUser.id);
      if (deleteError) return setStatus(els.mypageStatus, `削除できません：${deleteError.message}`, true);
      setStatus(els.mypageStatus, '削除しました。');
      await Promise.all([loadMyPosts(), loadPosts()]);
    }));
  }

  els.refreshMyPostsBtn.addEventListener('click', loadMyPosts);
  els.logoutBtn.addEventListener('click', async () => { await sb.auth.signOut(); closeModal(els.mypageModal); });

  bindStaticEvents();
  await initAuth();
  await loadPosts();
});
