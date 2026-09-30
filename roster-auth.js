/* 2026-09-30 安全修補：會員名冊不再公開讀取，改成登入（帳號＋生日）後由後端回傳。
   沿用通訊錄同一組登入（同網域、同一份記住的帳密），沒登入過會請你輸入一次。 */
(function () {
  var API = 'https://script.google.com/macros/s/AKfycbxZFmBC8rpRV9GMg3d5rROMW7Cmf3pQZrQ74INM5WKYnnYYCwGCdLWXluFfZlwS3grz/exec';
  function creds(forceAsk) {
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
  /* 取名冊後呼叫 window[cbName](resp)；resp 外型與原本 gviz 相同。onFail(訊息) 可選。 */
  window.fetchRosterAuthed = function (cbName, onFail, _retry) {
    var c = creds(!!_retry);
    if (!c) { if (onFail) onFail('未登入，無法讀取名冊'); return; }
    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getRosterSheet', payload: c })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.status === 'ok') {
        localStorage.setItem('jci_acc', c.acc); localStorage.setItem('jci_pwd', c.pwd);
        window[cbName](res);
      } else if (res.status === 'auth_failed' && !_retry) {
        alert('帳號或密碼錯誤，請重新輸入');
        window.fetchRosterAuthed(cbName, onFail, true);
      } else if (onFail) onFail(res.message || '讀取失敗');
    }).catch(function () { if (onFail) onFail('連線失敗，請稍後再試'); });
  };
})();
