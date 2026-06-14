import React, { useState, useEffect } from 'react';

// ─── Global styles (font + custom scrollbar) ─────────────────────────────────

const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

* { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }

.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;
}
.sidebar-scroll:hover {
  scrollbar-color: rgba(255,255,255,0.18) transparent;
}
.sidebar-scroll::-webkit-scrollbar {
  width: 6px;
}
.sidebar-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-scroll::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 10px;
}
.sidebar-scroll:hover::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.18);
}
.sidebar-scroll:hover::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.3);
}

.main-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.08) transparent;
}
.main-scroll::-webkit-scrollbar {
  width: 6px;
}
.main-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.main-scroll::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.08);
  border-radius: 10px;
}
.main-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.18);
}
`;

function GlobalStyles() {
  return <style>{GLOBAL_STYLES}</style>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'habit-tracker-v4';

const CATEGORY_COLORS = {
  health:       { accent: '#FF4E6A', glow: 'rgba(255,78,106,0.25)',  label: 'Health & Fitness',      icon: '🏃' },
  mindfulness:  { accent: '#9B6DFF', glow: 'rgba(155,109,255,0.25)', label: 'Mindfulness & Mental',  icon: '🧘' },
  productivity: { accent: '#00E5CC', glow: 'rgba(0,229,204,0.25)',   label: 'Productivity & Learning', icon: '📚' },
  routine:      { accent: '#FFB830', glow: 'rgba(255,184,48,0.25)',  label: 'Daily Routine',         icon: '✨' },
};

const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DEFAULT_HABITS = [
  { id: '1', name: 'Morning Run',  category: 'health',       subtitle: 'Build endurance daily',   repeatDays: [0,1,2,3,4,5,6], entries: {} },
  { id: '2', name: 'Meditate',     category: 'mindfulness',  subtitle: 'Clear your mind, 10 min', repeatDays: [0,1,2,3,4,5,6], entries: {} },
  { id: '3', name: 'Read & Learn', category: 'productivity', subtitle: 'One chapter every day',   repeatDays: [0,1,2,3,4,5,6], entries: {} },
  { id: '4', name: 'Make the Bed', category: 'routine',      subtitle: 'Start with a small win',  repeatDays: [0,1,2,3,4,5,6], entries: {} },
];

// ─── Date Helpers ─────────────────────────────────────────────────────────────

function toDateStr(d) { return d.toISOString().split('T')[0]; }
function todayStr()   { return toDateStr(new Date()); }
function addDays(ds, n) {
  const d = new Date(ds); d.setDate(d.getDate() + n); return toDateStr(d);
}
function getWeek(offset = 0) {
  const days = [];
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + 1 + offset * 7);
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    days.push(toDateStr(d));
  }
  return days;
}
function calcStreaks(entries) {
  const checked = Object.keys(entries).filter(d => entries[d]?.done).sort();
  if (!checked.length) return { current: 0, longest: 0 };
  const set = new Set(checked);
  let longest = 0, run = 0, prev = null;
  for (const d of checked) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  let current = 0, cursor = todayStr();
  if (!set.has(cursor)) cursor = addDays(cursor, -1);
  while (set.has(cursor)) { current++; cursor = addDays(cursor, -1); }
  return { current, longest };
}

// JS getDay() = 0 (Sun) .. 6 (Sat). Our repeatDays use 0=Mon..6=Sun (matches ALL_DAYS order).
function jsDowToRepeatIndex(jsDow) {
  return (jsDow + 6) % 7; // Sun(0)->6, Mon(1)->0, ... Sat(6)->5
}
function isScheduled(habit, dateStr) {
  const jsDow = new Date(dateStr).getDay();
  const idx = jsDowToRepeatIndex(jsDow);
  return habit.repeatDays.includes(idx);
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ done, accent, glow, onClick, size = 52 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        width: size, height: size, cursor: 'pointer', flexShrink: 0,
        transform: pressed ? 'scale(0.93)' : 'scale(1)',
        transition: 'transform 0.12s ease',
        filter: done ? `drop-shadow(0 0 8px ${glow})` : 'none',
      }}
    >
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke="rgba(255,255,255,0.07)" strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={accent} strokeWidth={5}
          strokeDasharray={circ}
          strokeDashoffset={done ? 0 : circ}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <text x={size/2} y={size/2 + 5} textAnchor="middle"
          fontSize={done ? 18 : 15} fill={done ? accent : 'rgba(255,255,255,0.25)'}>
          {done ? '✓' : '○'}
        </text>
      </svg>
    </div>
  );
}

// ─── Week Calendar (sidebar) ──────────────────────────────────────────────────

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function WeekCalendar({ habits, weekOffset, onChangeWeek }) {
  const days = getWeek(weekOffset);
  const today = todayStr();

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => onChangeWeek(weekOffset - 1)} style={navBtn}>‹</button>
        <span style={{ fontSize: 13, color: '#8b8b9a', fontWeight: 500, letterSpacing: '0.05em' }}>
          {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
        </span>
        <button onClick={() => onChangeWeek(Math.min(0, weekOffset + 1))} style={navBtn}
          disabled={weekOffset === 0}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {days.map((day, i) => {
          const isToday = day === today;
          const isPast = day < today;
          const dots = habits.map(h => ({
            color: CATEGORY_COLORS[h.category].accent,
            done: !!h.entries[day]?.done,
          }));

          return (
            <div key={day} style={{
              background: isToday ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
              border: isToday ? '1px solid rgba(255,255,255,0.15)' : '1px solid rgba(255,255,255,0.05)',
              borderRadius: 14, padding: '10px 6px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              opacity: !isPast && !isToday ? 0.45 : 1,
            }}>
              <span style={{ fontSize: 11, color: '#8b8b9a', fontWeight: 500 }}>{DAY_LABELS[i]}</span>
              <span style={{
                fontSize: 15, fontWeight: isToday ? 700 : 500,
                color: isToday ? '#fff' : '#c4c4cc',
              }}>
                {parseInt(day.split('-')[2])}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 6px)', gap: 3 }}>
                {dots.map((dot, di) => (
                  <div key={di} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: dot.done ? dot.color : 'rgba(255,255,255,0.1)',
                    transition: 'background 0.2s',
                    boxShadow: dot.done ? `0 0 4px ${dot.color}` : 'none',
                  }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Monthly Calendar (main area) ─────────────────────────────────────────────

function MonthCalendar({ habits, monthOffset, onChangeMonth, centered }) {
  const today = todayStr();
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const startDow = jsDowToRepeatIndex(firstOfMonth.getDay()); // 0=Mon..6=Sun

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    cells.push(toDateStr(dateObj));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div style={{
      width: '100%',
      maxWidth: centered ? 920 : undefined,
      margin: centered ? '0 auto' : undefined,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <button onClick={() => onChangeMonth(monthOffset - 1)} style={navBtn}>‹</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em' }}>
          {MONTH_NAMES[month]} {year}
        </h2>
        <button onClick={() => onChangeMonth(monthOffset + 1)} style={navBtn}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: '#8b8b9a', fontWeight: 600, padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const isToday = dateStr === today;
          const isFuture = dateStr > today;
          const dayNum = parseInt(dateStr.split('-')[2]);

          const scheduledHabits = habits.filter(h => isScheduled(h, dateStr));

          return (
            <div key={dateStr} style={{
              background: isToday ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.025)',
              border: isToday ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.05)',
              borderRadius: 14,
              padding: '8px 8px 10px',
              minHeight: 54,
              display: 'flex', flexDirection: 'column', gap: 6,
              opacity: isFuture ? 0.4 : 1,
            }}>
              <span style={{
                fontSize: 13, fontWeight: isToday ? 800 : 500,
                color: isToday ? '#fff' : '#c4c4cc',
              }}>
                {dayNum}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start' }}>
                {scheduledHabits.map(h => {
                  const done = !!h.entries[dateStr]?.done;
                  const { accent } = CATEGORY_COLORS[h.category];

                  if (done) {
                    return (
                      <div key={h.id} title={h.name} style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: accent, boxShadow: `0 0 4px ${accent}`,
                      }} />
                    );
                  }
                  // incomplete
                  if (isToday) {
                    return (
                      <div key={h.id} title={h.name} style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.18)',
                      }} />
                    );
                  }
                  if (isFuture) {
                    return (
                      <div key={h.id} title={h.name} style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.08)',
                      }} />
                    );
                  }
                  // past, incomplete -> cross
                  return (
                    <div key={h.id} title={h.name} style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, color: '#FF4E6A', lineHeight: 1, fontWeight: 700,
                    }}>
                      ×
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Top Streaks Card (full / mini) ──────────────────────────────────────────

function TopStreaksCardFull({ habits, onMore }) {
  const ranked = habits
    .map(h => ({ ...h, streak: calcStreaks(h.entries).current }))
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 16, padding: '12px 14px',
      minWidth: 150,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 10, color: '#8b8b9a', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>
        TOP STREAKS
      </div>
      {ranked.length === 0 ? (
        <div style={{ fontSize: 12, color: '#5a5a66', padding: '4px 0' }}>None yet</div>
      ) : (
        ranked.map(h => (
          <div key={h.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              fontSize: 12, color: '#c4c4cc', fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90,
            }}>
              {h.name}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFB830', whiteSpace: 'nowrap' }}>
              🔥 {h.streak}
            </span>
          </div>
        ))
      )}
      <button onClick={onMore} style={{
        background: 'transparent', border: 'none', color: '#8b8b9a',
        fontSize: 11, cursor: 'pointer', padding: '4px 0 0', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
      }}>
        More ⌄
      </button>
    </div>
  );
}

// Mini translucent card -> expands to full card on hover, shown floating over the calendar
function TopStreaksCardFloating({ habits, onMore }) {
  const [hovered, setHovered] = useState(false);

  const ranked = habits
    .map(h => ({ ...h, streak: calcStreaks(h.entries).current }))
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak);

  const top1 = ranked[0];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', top: 24, right: 24, zIndex: 20,
        transition: 'background 0.2s, border-color 0.2s, backdrop-filter 0.2s',
        background: hovered ? 'rgba(22,22,30,0.96)' : 'rgba(22,22,30,0.45)',
        border: hovered ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(6px)',
        borderRadius: 16, padding: hovered ? '12px 14px' : '10px 14px',
        minWidth: hovered ? 150 : 110,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      {!hovered ? (
        top1 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 12, color: '#c4c4cc', fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80,
            }}>
              {top1.name}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFB830', whiteSpace: 'nowrap' }}>
              🔥 {top1.streak}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: '#8b8b9a' }}>No streaks yet</div>
        )
      ) : (
        <>
          <div style={{ fontSize: 10, color: '#8b8b9a', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>
            TOP STREAKS
          </div>
          {ranked.length === 0 ? (
            <div style={{ fontSize: 12, color: '#5a5a66', padding: '4px 0' }}>None yet</div>
          ) : (
            ranked.slice(0, 5).map(h => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  fontSize: 12, color: '#c4c4cc', fontWeight: 500,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90,
                }}>
                  {h.name}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FFB830', whiteSpace: 'nowrap' }}>
                  🔥 {h.streak}
                </span>
              </div>
            ))
          )}
          <button onClick={onMore} style={{
            background: 'transparent', border: 'none', color: '#8b8b9a',
            fontSize: 11, cursor: 'pointer', padding: '4px 0 0', textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
          }}>
            More ⌄
          </button>
        </>
      )}
    </div>
  );
}

// ─── More Habits Popup ────────────────────────────────────────────────────────

function MoreHabitsModal({ habits, onClose, onEdit, onDelete }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#16161e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20, padding: 22, width: 360, maxWidth: '90vw',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
      }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: '#f0f0f5' }}>
          All habits
        </h2>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {habits.map(h => {
            const { accent, icon } = CATEGORY_COLORS[h.category];
            const { current } = calcStreaks(h.entries);
            return (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '10px 12px',
              }}>
                <span style={{ fontSize: 18 }}>{icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f5' }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>🔥 {current} day{current !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={() => onEdit(h)} style={smallGhostBtn}>Edit</button>
                <button onClick={() => onDelete(h.id)} style={smallDangerBtn}>Delete</button>
              </div>
            );
          })}
          {habits.length === 0 && (
            <div style={{ fontSize: 13, color: '#5a5a66', textAlign: 'center', padding: '20px 0' }}>
              No habits yet.
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ ...ghostBtn, marginTop: 16 }}>Close</button>
      </div>
    </div>
  );
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

function HabitCard({ habit, onToggle, onOpen }) {
  const { accent, glow, icon } = CATEGORY_COLORS[habit.category];
  const today = todayStr();
  const done = !!habit.entries[today]?.done;
  const { current, longest } = calcStreaks(habit.entries);

  return (
    <div
      onClick={() => onOpen(habit)}
      style={{
        background: done
          ? `linear-gradient(135deg, rgba(255,255,255,0.04), ${glow.replace('0.25','0.06')})`
          : 'rgba(255,255,255,0.03)',
        border: done ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 20,
        padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'relative', cursor: 'pointer',
        transition: 'border-color 0.3s, background 0.3s',
      }}
    >
      {/* Icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 21,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
        }}>
          <span style={{
            fontSize: 16, fontWeight: 600, color: '#f0f0f5',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {habit.name}
          </span>
          {current > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.07)',
              border: `1px solid ${accent}55`,
              borderRadius: 20, padding: '2px 8px',
              fontSize: 11, fontWeight: 700, color: accent,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              🔥 {current}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: '#8b8b9a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {habit.subtitle}
        </div>
        {longest > 0 && (
          <div style={{ fontSize: 11, color: accent, marginTop: 5, opacity: 0.8 }}>
            Best: {longest} day{longest !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Ring */}
      <ProgressRing done={done} accent={accent} glow={glow} onClick={() => onToggle(habit.id)} />
    </div>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function HabitModal({ initial, onSave, onClose, onDelete }) {
  const [name, setName]         = useState(initial?.name || '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '');
  const [category, setCategory] = useState(initial?.category || 'health');
  const [repeatDays, setRepeatDays] = useState(initial?.repeatDays ?? [0,1,2,3,4,5,6]);

  const toggleDay = (i) => {
    setRepeatDays(prev =>
      prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort()
    );
  };

  const setEveryday = () => setRepeatDays([0,1,2,3,4,5,6]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id || crypto.randomUUID(),
      name: name.trim(), subtitle: subtitle.trim(),
      category,
      repeatDays: repeatDays.length ? repeatDays : [0,1,2,3,4,5,6],
      entries: initial?.entries || {},
    });
  };

  const everyday = repeatDays.length === 7;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#16161e', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24, padding: 28, width: 380, maxWidth: '90vw',
        maxHeight: '85vh', overflowY: 'auto',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#f0f0f5' }}>
          {initial ? 'Edit habit' : 'New habit'}
        </h2>

        <label style={lbl}>Name</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Morning Run" style={inp} />

        <label style={lbl}>Description <span style={{ color: '#555' }}>(optional)</span></label>
        <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
          placeholder="e.g. Build endurance daily" style={inp} />

        <label style={lbl}>Category</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
          {Object.entries(CATEGORY_COLORS).map(([key, val]) => (
            <div key={key} onClick={() => setCategory(key)} style={{
              padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
              border: category === key ? `1.5px solid ${val.accent}` : '1.5px solid rgba(255,255,255,0.07)',
              background: category === key ? `${val.accent}15` : 'rgba(255,255,255,0.02)',
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: 18 }}>{val.icon}</span>
              <span style={{ fontSize: 12, color: category === key ? val.accent : '#8b8b9a', fontWeight: 500 }}>
                {val.label}
              </span>
            </div>
          ))}
        </div>

        <label style={lbl}>Repeat</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            onClick={setEveryday}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              border: everyday ? '1.5px solid #f0f0f5' : '1.5px solid rgba(255,255,255,0.08)',
              background: everyday ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: everyday ? '#f0f0f5' : '#8b8b9a',
            }}
          >
            Every day
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 24 }}>
          {ALL_DAYS.map((d, i) => {
            const active = repeatDays.includes(i);
            return (
              <div key={i} onClick={() => toggleDay(i)} style={{
                textAlign: 'center', padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
                border: active ? '1.5px solid #00E5CC' : '1.5px solid rgba(255,255,255,0.08)',
                background: active ? 'rgba(0,229,204,0.12)' : 'transparent',
                color: active ? '#00E5CC' : '#8b8b9a',
                transition: 'all 0.15s',
              }}>
                {d}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          {initial && (
            <button onClick={() => onDelete(initial.id)} style={dangerBtn}>Delete</button>
          )}
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSave} style={primaryBtn}>
            {initial ? 'Save changes' : 'Add habit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const navBtn = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8, color: '#c4c4cc', fontSize: 18, width: 32, height: 32,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1, padding: 0, flexShrink: 0,
};
const lbl = { display: 'block', fontSize: 12, color: '#8b8b9a', marginBottom: 6, marginTop: 2 };
const inp = {
  width: '100%', boxSizing: 'border-box', background: '#0d0d14',
  border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10,
  padding: '10px 14px', color: '#f0f0f5', fontSize: 14, marginBottom: 14, outline: 'none',
};
const primaryBtn = {
  flex: 1, background: '#f0f0f5', color: '#0d0d14', border: 'none',
  borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
};
const ghostBtn = {
  flex: 1, background: 'transparent', color: '#8b8b9a',
  border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10,
  padding: '11px 0', fontSize: 14, cursor: 'pointer',
};
const dangerBtn = {
  background: 'transparent', color: '#FF4E6A',
  border: '1px solid #FF4E6A44', borderRadius: 10,
  padding: '11px 14px', fontSize: 14, cursor: 'pointer',
};
const smallGhostBtn = {
  background: 'transparent', color: '#8b8b9a',
  border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8,
  padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
};
const smallDangerBtn = {
  background: 'transparent', color: '#FF4E6A',
  border: '1px solid #FF4E6A44', borderRadius: 8,
  padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [habits, setHabits] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || DEFAULT_HABITS; }
    catch { return DEFAULT_HABITS; }
  });
  const [weekOffset, setWeekOffset]   = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [moreOpen, setMoreOpen]       = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits]);

  const toggleToday = (id) => {
    const today = todayStr();
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const entries = { ...h.entries };
      entries[today] = { ...entries[today], done: !entries[today]?.done };
      return { ...h, entries };
    }));
  };

  const saveHabit = (habit) => {
    setHabits(prev => {
      const exists = prev.find(h => h.id === habit.id);
      return exists
        ? prev.map(h => h.id === habit.id ? { ...habit, entries: h.entries } : h)
        : [...prev, habit];
    });
    setModalOpen(false); setEditTarget(null);
  };

  const deleteHabit = (id) => {
    setHabits(prev => prev.filter(h => h.id !== id));
    setModalOpen(false); setEditTarget(null); setMoreOpen(false);
  };

  const todayDone = habits.filter(h => h.entries[todayStr()]?.done).length;

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: '#0d0d14',
      color: '#f0f0f5',
      display: 'flex',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <GlobalStyles />

      {/* ── Sidebar (compact left layout) ── */}
      {sidebarOpen && (
        <div
          className="sidebar-scroll"
          style={{
            width: '30%', minWidth: 320, maxWidth: 420,
            flexShrink: 0,
            margin: '14px 0 14px 14px',
            background: '#15151d',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 22,
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            padding: '0 16px 32px',
            height: 'calc(100vh - 28px)',
            overflowY: 'auto',
            boxSizing: 'border-box',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '24px 0 28px',
          }}>
            <button
              onClick={() => setSidebarOpen(false)}
              aria-label="Collapse sidebar"
              style={{
                ...navBtn, width: 36, height: 36, fontSize: 16,
                flexDirection: 'column', gap: 3, marginTop: 2,
              }}
            >
              <span style={hamburgerLine} />
              <span style={hamburgerLine} />
              <span style={hamburgerLine} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: '#8b8b9a', marginBottom: 4, fontWeight: 500 }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Hey Saatvik! 👋
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8b8b9a' }}>
                {todayDone === habits.length && habits.length > 0
                  ? 'All done for today 🎉'
                  : `${todayDone} of ${habits.length} done today`}
              </p>
            </div>
          </div>

          {/* Weekly Calendar */}
          <WeekCalendar habits={habits} weekOffset={weekOffset} onChangeWeek={setWeekOffset} />

          {/* Section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#c4c4cc', letterSpacing: '0.04em' }}>
              TODAY'S HABITS
            </span>
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              style={{
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 10, padding: '6px 14px', fontSize: 13, color: '#f0f0f5',
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              + Add
            </button>
          </div>

          {/* Habit Cards */}
          {habits.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 20,
              color: '#8b8b9a',
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
              <p style={{ margin: 0, fontSize: 15 }}>No habits yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>Tap "+ Add" to build your first streak.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {habits.map(habit => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  onToggle={toggleToday}
                  onOpen={(h) => { setEditTarget(h); setModalOpen(true); }}
                />
              ))}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 11, color: '#3a3a45', marginTop: 32 }}>
            Tap the ring to mark done · Tap a card to edit or delete
          </p>
        </div>
      )}

      {/* ── Main area: monthly calendar ── */}
      <div
        className="main-scroll"
        style={{
          flex: 1, position: 'relative',
          boxSizing: 'border-box',
          height: '100vh',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {/* Hamburger to reopen sidebar when collapsed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            style={{
              ...navBtn, width: 40, height: 40, fontSize: 16,
              flexDirection: 'column', gap: 3,
              position: 'fixed', top: 24, left: 24, zIndex: 20,
            }}
          >
            <span style={hamburgerLine} />
            <span style={hamburgerLine} />
            <span style={hamburgerLine} />
          </button>
        )}

        {/* Floating mini top-streak card, only when sidebar is open */}
        {sidebarOpen && (
          <TopStreaksCardFloating habits={habits} onMore={() => setMoreOpen(true)} />
        )}

        {/* Solid top streaks card, fixed to viewport top-right, when sidebar closed */}
        {!sidebarOpen && (
          <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 20 }}>
            <TopStreaksCardFull habits={habits} onMore={() => setMoreOpen(true)} />
          </div>
        )}

        {/* Calendar, centered */}
        <div style={{
          flex: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '64px 32px 48px',
          minHeight: '100vh',
          boxSizing: 'border-box',
        }}>
          <MonthCalendar
            habits={habits}
            monthOffset={monthOffset}
            onChangeMonth={setMonthOffset}
            centered={true}
          />
        </div>
      </div>

      {modalOpen && (
        <HabitModal
          initial={editTarget}
          onSave={saveHabit}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onDelete={deleteHabit}
        />
      )}

      {moreOpen && (
        <MoreHabitsModal
          habits={habits}
          onClose={() => setMoreOpen(false)}
          onEdit={(h) => { setMoreOpen(false); setEditTarget(h); setModalOpen(true); }}
          onDelete={deleteHabit}
        />
      )}
    </div>
  );
}

const hamburgerLine = {
  display: 'block', width: 16, height: 2, borderRadius: 1,
  background: '#c4c4cc',
};
