import { syncDivinePower } from '../dao/DivinePowerLedger.ts';

const format = new Intl.NumberFormat('vi-VN');
const number = value => format.format(value);
const gameTime = ({day, minute}) =>
  `Ngày ${day} · ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

export function mountDivinePowerJournal(scene) {
  const wallet = document.getElementById('heaven-wallet');
  const panel = document.getElementById('divine-power-journal');
  const notice = document.getElementById('divine-power-notice');
  const summary = panel.querySelector('dl');
  const history = panel.querySelector('ol');
  const world = scene.populationWorld;
  let last = syncDivinePower(world), shown = last.balance, from = shown, animateAt = 0;
  let pending = 0, sources = 0, example, nextNotice = 0, hideAt = 0;
  let displayedLedger, displayedDay;

  function habitat(entry) {
    if (entry.siteId) return `${scene.underground?.sites.get(entry.siteId)?.name ?? entry.siteId} · Tầng ${entry.floor + 1}`;
    if (entry.zoneId) {
      const zone = scene.faunaZones?.find(zone => zone.zoneId === entry.zoneId);
      if (zone?.name) return zone.name;
    }
    return scene.regionAtPoint(entry.x, entry.y);
  }

  function toggle(open) {
    panel.hidden = !open;
    wallet.setAttribute('aria-expanded', String(open));
    if (open) {
      document.getElementById('heaven-shop').hidden = true;
      scene.refreshDivinePowerJournal();
    }
  }

  function locate(entry) {
    const {siteId, floor, x, y} = entry;
    const underground = scene.underground;
    if (underground?.view.controlled) return;
    if (siteId) {
      if (!underground?.sites.get(siteId)?.map.floors[floor]) return;
      underground.view.show(siteId, floor);
      underground.view.follow = null;
      underground.view.focus(entry);
      underground.view.render();
    } else {
      underground?.view.hide();
      scene.navigateCameraTo(x, y, 'divine-power-journal');
    }
    toggle(false);
  }

  function render(ledger) {
    displayedLedger = ledger;
    displayedDay = world.clock.day;
    summary.replaceChildren();
    for (const [label, value] of [
      ['Hiện có', ledger.balance], ['Tổng tích lũy', ledger.earned], ['Số dư khi mở nhật ký', ledger.opening],
      ['Từ đột phá', ledger.breakthrough], ['Từ NPC tử vong', ledger.npcDeath],
      ['Từ yêu thú tử vong', ledger.faunaDeath], ['Đã tiêu hao', ledger.spent],
      ['Nhận hôm nay', ledger.day === displayedDay ? ledger.today : 0],
    ]) {
      const term = document.createElement('dt'), amount = document.createElement('dd');
      term.textContent = label;
      amount.textContent = number(value);
      summary.append(term, amount);
    }
    history.replaceChildren();
    panel.querySelector('[data-divine-empty]').hidden = ledger.recent.length > 0;
    for (const entry of [...ledger.recent].reverse()) {
      const item = document.createElement('li'), title = document.createElement('b');
      const details = document.createElement('small'), value = document.createElement('strong');
      title.textContent = entry.name ?? entry.cause;
      details.textContent = [gameTime(entry), entry.realm && `${entry.realm} tầng ${entry.level}`,
        entry.name && entry.cause, entry.name && habitat(entry)].filter(Boolean).join(' · ');
      value.textContent = (entry.points > 0 ? '+' : '') + number(entry.points);
      value.className = entry.points < 0 ? 'spent' : '';
      item.append(title, value, details);
      if (Number.isFinite(entry.x) && Number.isFinite(entry.y)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Định vị';
        button.onclick = () => locate(entry);
        item.append(button);
      }
      history.append(item);
    }
  }

  scene.refreshDivinePowerJournal = () => {
    const now = performance.now(), ledger = syncDivinePower(world);
    const received = ledger.earned - last.earned;
    if (received > 0) {
      const index = ledger.recent.indexOf(last.recent.at(-1));
      const gains = ledger.recent.slice(index + 1).filter(entry => entry.points > 0);
      sources += Math.max(1, gains.length);
      example = gains.at(-1);
      pending += received;
      from = shown;
      animateAt = now;
      wallet.classList.add('divine-gain');
    }
    if (ledger.balance < last.balance) animateAt = 0;
    last = ledger;
    const t = animateAt ? Math.min(1, (now - animateAt) / 650) : 1;
    shown = Math.floor(animateAt && t < 1 ? from + (ledger.balance - from) * (1 - (1 - t) ** 2) : ledger.balance);
    if (t === 1) wallet.classList.remove('divine-gain');
    const label = number(shown) + ' Thần lực';
    if (wallet.textContent !== label) wallet.textContent = label;
    if (pending && now >= nextNotice) {
      const description = sources === 1 && example?.name
        ? `${example.name} · ${example.realm} tầng ${example.level} · ${example.cause}`
        : 'Thiên Đạo cảm ứng';
      notice.textContent = `${description} · +${number(pending)} Thần lực`;
      notice.hidden = false;
      pending = sources = 0;
      nextNotice = now + 2600;
      hideAt = now + 3200;
    }
    if (!notice.hidden && now >= hideAt) notice.hidden = true;
    if (!panel.hidden && (displayedLedger !== ledger || displayedDay !== world.clock.day)) render(ledger);
  };

  wallet.onclick = () => toggle(panel.hidden);
  panel.querySelector('[data-close-divine]').onclick = () => { toggle(false); wallet.focus(); };
  scene.refreshDivinePowerJournal();
}
