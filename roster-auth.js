/* 2026-09-30 安全修補：會員名冊不再公開讀取，改成登入後由後端回傳。
   憑證優先序：jci-hub 秘書處登入（jci-fb-auth）→ LINE 登入（jci_sess）→ 通訊錄帳號＋生日（jci_acc／jci_pwd，沒有才詢問）。 */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycbxZFmBC8rpRV9GMg3d5rROMW7Cmf3pQZrQ74INM5WKYnnYYCwGCdLWXluFfZlwS3grz/exec';
  var FB_KEY = 'AIzaSyDLq7SrkQaCnjtsFArh0leKPJRbPFZTZnk';
  function secToken() {
    var a = null; try { a = JSON.parse(localStorage.getItem('jci-fb-auth') || 'null'); } catch (e) {}
    if (!a) return Promise.resolve('');
    if (Date.now() < a.exp - 60000) return Promise.resolve(a.id);
    return fetch('https://securetoken.googleapis.com/v1/token?key=' + FB_KEY, {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(a.rt)
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.id_token) { localStorage.removeItem('jci-fb-auth'); return ''; }
      localStorage.setItem('jci-fb-auth', JSON.stringify({ id: d.id_token, rt: d.refresh_token, exp: Date.now() + (+d.expires_in) * 1000 }));
      return d.id_token;
    }).catch(function () { return ''; });
  }
  function creds(forceAsk) {
    var sess = forceAsk ? '' : (localStorage.getItem('jci_sess') || '');
    if (sess) return { session: sess };
    var acc = forceAsk ? '' : (localStorage.getItem('jci_acc') || '');
    var pwd = forceAsk ? '' : (localStorage.getItem('jci_pwd') || '');
    if (!acc || !pwd) {
      acc = (prompt('讀取會員名冊需要登入\n請輸入通訊錄帳號：') || '').trim().toUpperCase();
      if (!acc) return null;
      pwd = (prompt('請輸入密碼（生日，例 19850312）：') || '').trim();
      if (!pwd) return null;
    }
    return { acc: acc, pwd: pwd };
  }
  function post(payload) {
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getRosterSheet', payload: payload }) }).then(function (r) { return r.json(); });
  }
  /* 取名冊後呼叫 window[cbName](resp)；resp 外型與原本 gviz 相同。onFail(訊息) 可選。 */
  window.fetchRosterAuthed = function (cbName, onFail, _retry) {
    secToken().then(function (tok) {
      if (tok && !_retry) {
        return post({ fbIdToken: tok }).then(function (res) {
          if (res.status === 'ok') { window[cbName](res); return; }
          window.fetchRosterAuthed(cbName, onFail, 'member');   // 秘書處憑證失效就改用會員登入
        });
      }
      var c = creds(_retry === true);
      if (!c) { if (onFail) onFail('未登入，無法讀取名冊'); return; }
      return post(c).then(function (res) {
        if (res.status === 'ok') {
          if (c.acc) { localStorage.setItem('jci_acc', c.acc); localStorage.setItem('jci_pwd', c.pwd); }
          window[cbName](res);
        } else if (res.status === 'auth_failed' && _retry !== true) {
          if (c.session) localStorage.removeItem('jci_sess');
          alert('登入已失效或帳號密碼錯誤，請重新輸入');
          window.fetchRosterAuthed(cbName, onFail, true);
        } else if (onFail) onFail(res.message || '讀取失敗');
      });
    }).catch(function () { if (onFail) onFail('連線失敗，請稍後再試'); });
  };
})();
