import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

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

// Detects narrow viewports so we can avoid overlapping fixed-position UI on mobile
function useIsMobile(breakpoint = 760) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return isMobile;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// ─── Theme tokens ──────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    bg: '#0d0d14',
    panel: '#15151d',
    panelBorder: 'rgba(255,255,255,0.07)',
    text: '#f0f0f5',
    textDim: '#8b8b9a',
    textFaint: '#5a5a66',
    cardBg: 'rgba(255,255,255,0.03)',
    cardBorder: 'rgba(255,255,255,0.06)',
    inputBg: '#0d0d14',
    inputBorder: 'rgba(255,255,255,0.09)',
    hoverBg: 'rgba(255,255,255,0.06)',
    dotEmpty: 'rgba(255,255,255,0.1)',
    dotToday: 'rgba(255,255,255,0.18)',
    dotFuture: 'rgba(255,255,255,0.08)',
    shadow: '0 12px 40px rgba(0,0,0,0.45)',
    primaryBtnBg: '#f0f0f5',
    primaryBtnText: '#0d0d14',
  },
  light: {
    bg: '#f4f4f8',
    panel: '#ffffff',
    panelBorder: 'rgba(0,0,0,0.06)',
    text: '#16161e',
    textDim: '#6b6b78',
    textFaint: '#9a9aa6',
    cardBg: 'rgba(0,0,0,0.02)',
    cardBorder: 'rgba(0,0,0,0.06)',
    inputBg: '#ffffff',
    inputBorder: 'rgba(0,0,0,0.1)',
    hoverBg: 'rgba(0,0,0,0.04)',
    dotEmpty: 'rgba(0,0,0,0.08)',
    dotToday: 'rgba(0,0,0,0.14)',
    dotFuture: 'rgba(0,0,0,0.05)',
    shadow: '0 12px 40px rgba(0,0,0,0.08)',
    primaryBtnBg: '#16161e',
    primaryBtnText: '#ffffff',
  },
};

// Preset color palette offered when creating categories
const CATEGORY_COLOR_PALETTE = [
  '#FF4E6A', '#9B6DFF', '#00E5CC', '#FFB830',
  '#38BDF8', '#A3E635', '#F472B6', '#FB923C',
];

function categoryGlow(accent) {
  // Convert hex to rgba with 0.25 alpha for glow effects
  const hex = accent.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r},${g},${b},0.25)`;
}

function getCategory(categories, categoryId) {
  return categories.find(c => c.id === categoryId) || categories[0] || { id: 'none', label: 'Other', accent: '#8b8b9a', emoji: '✨' };
}

const ALL_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const DEFAULT_HABITS = [];

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
  if (habit.createdAt && dateStr < habit.createdAt) return false;
  const jsDow = new Date(dateStr).getDay();
  const idx = jsDowToRepeatIndex(jsDow);
  return habit.repeatDays.includes(idx);
}

// ─── Progress Ring ────────────────────────────────────────────────────────────

function ProgressRing({ done, accent, glow, onClick, theme, size = 52 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const [pressed, setPressed] = useState(false);
  const trackColor = theme.bg === THEMES.dark.bg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
  const idleIconColor = theme.bg === THEMES.dark.bg ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)';

  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      title={done ? 'Mark as not done' : 'Mark as done'}
      style={{
        width: size, height: size, cursor: 'pointer', flexShrink: 0,
        transform: pressed ? 'scale(0.93)' : 'scale(1)',
        transition: 'transform 0.12s ease',
        filter: done ? `drop-shadow(0 0 8px ${glow})` : 'none',
      }}
    >
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={trackColor} strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={accent} strokeWidth={5}
          strokeDasharray={circ}
          strokeDashoffset={done ? 0 : circ}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition: 'stroke-dashoffset 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <text x={size/2} y={size/2 + 6} textAnchor="middle"
          fontSize={done ? 20 : 18} fontWeight={done ? 700 : 500}
          fill={done ? accent : idleIconColor}>
          {done ? '✓' : '✓'}
        </text>
      </svg>
    </div>
  );
}

// ─── Week Calendar (sidebar) ──────────────────────────────────────────────────

const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function WeekCalendar({ habits, categories, weekOffset, onChangeWeek, theme }) {
  const days = getWeek(weekOffset);
  const today = todayStr();

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <button onClick={() => onChangeWeek(weekOffset - 1)} style={navBtn(theme)}>‹</button>
        <span style={{ fontSize: 13, color: theme.textDim, fontWeight: 500, letterSpacing: '0.05em' }}>
          {weekOffset === 0 ? 'This week' : weekOffset === -1 ? 'Last week' : `${Math.abs(weekOffset)} weeks ago`}
        </span>
        <button onClick={() => onChangeWeek(Math.min(0, weekOffset + 1))} style={navBtn(theme)}
          disabled={weekOffset === 0}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
        {days.map((day, i) => {
          const isToday = day === today;
          const isPast = day < today;
          const dots = habits.map(h => ({
            color: getCategory(categories, h.category).accent,
            done: !!h.entries[day]?.done,
          }));

          return (
            <div key={day} style={{
              background: isToday ? theme.hoverBg : theme.cardBg,
              border: isToday ? `1px solid ${theme.cardBorder}` : `1px solid ${theme.cardBorder}`,
              borderRadius: 14, padding: '10px 6px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              opacity: !isPast && !isToday ? 0.45 : 1,
            }}>
              <span style={{ fontSize: 11, color: theme.textDim, fontWeight: 500 }}>{DAY_LABELS[i]}</span>
              <span style={{
                fontSize: 15, fontWeight: isToday ? 700 : 500,
                color: isToday ? theme.text : theme.textDim,
              }}>
                {parseInt(day.split('-')[2])}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 6px)', gap: 3 }}>
                {dots.map((dot, di) => (
                  <div key={di} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: dot.done ? dot.color : theme.dotEmpty,
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

function MonthCalendar({ habits, categories, monthOffset, onChangeMonth, centered, theme }) {
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
        <button onClick={() => onChangeMonth(monthOffset - 1)} style={navBtn(theme)}>‹</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: '-0.01em', color: theme.text }}>
          {MONTH_NAMES[month]} {year}
        </h2>
        <button onClick={() => onChangeMonth(monthOffset + 1)} style={navBtn(theme)}>›</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: theme.textDim, fontWeight: 600, padding: '4px 0' }}>
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
              background: isToday ? theme.hoverBg : theme.cardBg,
              border: isToday ? `1px solid ${theme.cardBorder}` : `1px solid ${theme.cardBorder}`,
              borderRadius: 14,
              padding: '8px 8px 10px',
              minHeight: 54,
              display: 'flex', flexDirection: 'column', gap: 6,
              opacity: isFuture ? 0.4 : 1,
            }}>
              <span style={{
                fontSize: 13, fontWeight: isToday ? 800 : 500,
                color: isToday ? theme.text : theme.textDim,
              }}>
                {dayNum}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignContent: 'flex-start' }}>
                {scheduledHabits.map(h => {
                  const done = !!h.entries[dateStr]?.done;
                  const { accent } = getCategory(categories, h.category);

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
                        background: theme.dotToday,
                      }} />
                    );
                  }
                  if (isFuture) {
                    return (
                      <div key={h.id} title={h.name} style={{
                        width: 9, height: 9, borderRadius: '50%',
                        background: theme.dotFuture,
                      }} />
                    );
                  }
                  // past, incomplete -> cross
                  return (
                    <div key={h.id} title={h.name} style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: theme.dotEmpty,
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

function TopStreaksCardFull({ habits, onMore, theme }) {
  const ranked = habits
    .map(h => ({ ...h, streak: calcStreaks(h.entries).current }))
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5);

  return (
    <div style={{
      background: theme.panel,
      border: `1px solid ${theme.panelBorder}`,
      borderRadius: 16, padding: '12px 14px',
      minWidth: 150,
      display: 'flex', flexDirection: 'column', gap: 6,
      boxShadow: theme.shadow,
    }}>
      <div style={{ fontSize: 10, color: theme.textDim, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>
        TOP STREAKS
      </div>
      {ranked.length === 0 ? (
        <div style={{ fontSize: 12, color: theme.textFaint, padding: '4px 0' }}>None yet</div>
      ) : (
        ranked.map(h => (
          <div key={h.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
          }}>
            <span style={{
              fontSize: 12, color: theme.textDim, fontWeight: 500,
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
        background: 'transparent', border: 'none', color: theme.textDim,
        fontSize: 11, cursor: 'pointer', padding: '4px 0 0', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
      }}>
        More ⌄
      </button>
    </div>
  );
}

// Mini translucent card -> expands to full card on hover, shown floating over the calendar
function TopStreaksCardFloating({ habits, onMore, theme }) {
  const [hovered, setHovered] = useState(false);

  const ranked = habits
    .map(h => ({ ...h, streak: calcStreaks(h.entries).current }))
    .filter(h => h.streak > 0)
    .sort((a, b) => b.streak - a.streak);

  const top1 = ranked[0];
  const isDark = theme.bg === THEMES.dark.bg;
  const translucentBg = isDark ? 'rgba(22,22,30,0.45)' : 'rgba(255,255,255,0.55)';
  const solidBg = isDark ? 'rgba(22,22,30,0.96)' : 'rgba(255,255,255,0.97)';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed', top: 24, right: 24, zIndex: 20,
        transition: 'background 0.2s, border-color 0.2s, backdrop-filter 0.2s',
        background: hovered ? solidBg : translucentBg,
        border: hovered ? `1px solid ${theme.cardBorder}` : `1px solid ${theme.cardBorder}`,
        backdropFilter: 'blur(6px)',
        borderRadius: 16, padding: hovered ? '12px 14px' : '10px 14px',
        minWidth: hovered ? 150 : 110,
        display: 'flex', flexDirection: 'column', gap: 6,
        boxShadow: hovered ? theme.shadow : 'none',
      }}
    >
      {!hovered ? (
        top1 ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 12, color: theme.textDim, fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 80,
            }}>
              {top1.name}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFB830', whiteSpace: 'nowrap' }}>
              🔥 {top1.streak}
            </span>
          </div>
        ) : (
          <div style={{ fontSize: 11, color: theme.textDim }}>No streaks yet</div>
        )
      ) : (
        <>
          <div style={{ fontSize: 10, color: theme.textDim, fontWeight: 700, letterSpacing: '0.06em', marginBottom: 2 }}>
            TOP STREAKS
          </div>
          {ranked.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.textFaint, padding: '4px 0' }}>None yet</div>
          ) : (
            ranked.slice(0, 5).map(h => (
              <div key={h.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  fontSize: 12, color: theme.textDim, fontWeight: 500,
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
            background: 'transparent', border: 'none', color: theme.textDim,
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

function MoreHabitsModal({ habits, categories, onClose, onEdit, onDelete, theme }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.panel, border: `1px solid ${theme.panelBorder}`,
        borderRadius: 20, padding: 22, width: 360, maxWidth: '90vw',
        maxHeight: '70vh', display: 'flex', flexDirection: 'column',
        boxShadow: theme.shadow,
      }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 16, fontWeight: 700, color: theme.text }}>
          All habits
        </h2>
        <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {habits.map(h => {
            const { accent } = getCategory(categories, h.category);
            const { current } = calcStreaks(h.entries);
            return (
              <div key={h.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: theme.cardBg, borderRadius: 12, padding: '10px 12px',
              }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{h.name}</div>
                  <div style={{ fontSize: 11, color: accent, fontWeight: 600 }}>🔥 {current} day{current !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={() => onEdit(h)} style={smallGhostBtn(theme)}>Edit</button>
                <button onClick={() => onDelete(h.id)} style={smallDangerBtn}>Delete</button>
              </div>
            );
          })}
          {habits.length === 0 && (
            <div style={{ fontSize: 13, color: theme.textFaint, textAlign: 'center', padding: '20px 0' }}>
              No habits yet.
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ ...ghostBtn(theme), marginTop: 16 }}>Close</button>
      </div>
    </div>
  );
}

// ─── Habit Card ───────────────────────────────────────────────────────────────

function HabitCard({ habit, categories, onToggle, onOpen, theme }) {
  const cat = getCategory(categories, habit.category);
  const accent = cat.accent;
  const glow = categoryGlow(accent);
  const today = todayStr();
  const done = !!habit.entries[today]?.done;
  const { current, longest } = calcStreaks(habit.entries);

  return (
    <div
      onClick={() => onOpen(habit)}
      style={{
        background: done
          ? `linear-gradient(135deg, ${theme.cardBg}, ${glow.replace('0.25','0.06')})`
          : theme.cardBg,
        border: done ? `1px solid ${accent}44` : `1px solid ${theme.cardBorder}`,
        borderRadius: 20,
        padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        position: 'relative', cursor: 'pointer',
        transition: 'border-color 0.3s, background 0.3s',
      }}
    >
      {/* Category icon */}
      <div style={{
        width: 46, height: 46, borderRadius: 14, flexShrink: 0,
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: cat.emoji ? 21 : 18, fontWeight: 800, color: accent,
      }}>
        {cat.emoji || (cat.label ? cat.label.charAt(0).toUpperCase() : '✨')}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2,
        }}>
          <span style={{
            fontSize: 16, fontWeight: 600, color: theme.text,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {habit.name}
          </span>
          {current > 0 && (
            <span style={{
              background: theme.hoverBg,
              border: `1px solid ${accent}55`,
              borderRadius: 20, padding: '2px 8px',
              fontSize: 11, fontWeight: 700, color: accent,
              whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              🔥 {current}
            </span>
          )}
        </div>
        <div style={{ fontSize: 13, color: theme.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {habit.subtitle}
        </div>
        {longest > 0 && (
          <div style={{ fontSize: 11, color: accent, marginTop: 5, opacity: 0.8 }}>
            Best: {longest} day{longest !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Ring */}
      <ProgressRing done={done} accent={accent} glow={glow} onClick={() => onToggle(habit.id)} theme={theme} />
    </div>
  );
}

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

function HabitModal({ initial, categories, onAddCategory, onSave, onClose, onDelete, theme }) {
  const [name, setName]         = useState(initial?.name || '');
  const [subtitle, setSubtitle] = useState(initial?.subtitle || '');
  const [category, setCategory] = useState(initial?.category || categories[0]?.id || '');
  const [repeatDays, setRepeatDays] = useState(initial?.repeatDays ?? [0,1,2,3,4,5,6]);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_PALETTE[0]);
  const [newCatEmoji, setNewCatEmoji] = useState('');

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
      createdAt: initial?.createdAt || todayStr(),
      entries: initial?.entries || {},
    });
  };

  const handleAddCategory = () => {
    if (!newCatName.trim() || categories.length >= 6) return;
    const newCat = { id: crypto.randomUUID(), label: newCatName.trim(), accent: newCatColor, emoji: newCatEmoji || null };
    onAddCategory(newCat);
    setCategory(newCat.id);
    setNewCatName('');
    setNewCatEmoji('');
    setAddingCategory(false);
  };

  const everyday = repeatDays.length === 7;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.panel, border: `1px solid ${theme.panelBorder}`,
        borderRadius: 24, padding: 28, width: 380, maxWidth: '90vw',
        maxHeight: '85vh', overflowY: 'auto',
        boxShadow: theme.shadow,
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: theme.text }}>
          {initial ? 'Edit habit' : 'New habit'}
        </h2>

        <label style={lbl(theme)}>Name</label>
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Morning Run" style={inp(theme)} />

        <label style={lbl(theme)}>Description <span style={{ color: theme.textFaint }}>(optional)</span></label>
        <input value={subtitle} onChange={e => setSubtitle(e.target.value)}
          placeholder="e.g. Build endurance daily" style={inp(theme)} />

        <label style={lbl(theme)}>Category</label>
        {categories.length === 0 && !addingCategory && (
          <div style={{ fontSize: 12, color: theme.textFaint, marginBottom: 10 }}>
            No categories yet — add one below.
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {categories.map(cat => (
            <div key={cat.id} onClick={() => setCategory(cat.id)} style={{
              padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
              border: category === cat.id ? `1.5px solid ${cat.accent}` : `1.5px solid ${theme.cardBorder}`,
              background: category === cat.id ? `${cat.accent}15` : theme.cardBg,
              display: 'flex', alignItems: 'center', gap: 8,
              transition: 'all 0.15s',
            }}>
              <div style={{
                width: 14, height: 14, borderRadius: '50%', background: cat.emoji ? 'transparent' : cat.accent,
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
              }}>
                {cat.emoji || ''}
              </div>
              <span style={{
                fontSize: 12, color: category === cat.id ? cat.accent : theme.textDim, fontWeight: 500,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {cat.label}
              </span>
            </div>
          ))}
        </div>

        {categories.length < 6 && (
          addingCategory ? (
            <div style={{
              border: `1.5px dashed ${theme.cardBorder}`, borderRadius: 12,
              padding: 12, marginBottom: 16,
            }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <EmojiPickerButton
                  value={newCatEmoji}
                  onChange={setNewCatEmoji}
                  theme={theme}
                  accent={newCatColor}
                />
                <input
                  autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name" style={{ ...inp(theme), marginBottom: 0, flex: 1 }}
                />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {CATEGORY_COLOR_PALETTE.map(c => (
                  <div key={c} onClick={() => setNewCatColor(c)} style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: newCatColor === c ? `2px solid ${theme.text}` : '2px solid transparent',
                    boxSizing: 'border-box',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddCategory} style={primaryBtn(theme)}>Add category</button>
                <button onClick={() => { setAddingCategory(false); setNewCatName(''); setNewCatEmoji(''); }} style={ghostBtn(theme)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddingCategory(true)}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                border: `1.5px dashed ${theme.cardBorder}`, background: 'transparent',
                color: theme.textDim, fontSize: 12, fontWeight: 600, marginBottom: 16,
              }}
            >
              + New category
            </button>
          )
        )}

        <label style={lbl(theme)}>Repeat</label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            onClick={setEveryday}
            style={{
              flex: 1, padding: '8px 0', borderRadius: 10, fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              border: everyday ? `1.5px solid ${theme.text}` : `1.5px solid ${theme.inputBorder}`,
              background: everyday ? theme.hoverBg : 'transparent',
              color: everyday ? theme.text : theme.textDim,
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
                border: active ? '1.5px solid #00E5CC' : `1.5px solid ${theme.inputBorder}`,
                background: active ? 'rgba(0,229,204,0.12)' : 'transparent',
                color: active ? '#00E5CC' : theme.textDim,
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
          <button onClick={onClose} style={ghostBtn(theme)}>Cancel</button>
          <button onClick={handleSave} style={primaryBtn(theme)} disabled={!category}>
            {initial ? 'Save changes' : 'Add habit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared styles (theme-aware) ─────────────────────────────────────────────

const navBtn = (theme) => ({
  background: theme.hoverBg, border: `1px solid ${theme.cardBorder}`,
  borderRadius: 8, color: theme.textDim, fontSize: 18, width: 32, height: 32,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  lineHeight: 1, padding: 0, flexShrink: 0,
});
const lbl = (theme) => ({ display: 'block', fontSize: 12, color: theme.textDim, marginBottom: 6, marginTop: 2 });
const inp = (theme) => ({
  width: '100%', boxSizing: 'border-box', background: theme.inputBg,
  border: `1px solid ${theme.inputBorder}`, borderRadius: 10,
  padding: '10px 14px', color: theme.text, fontSize: 14, marginBottom: 14, outline: 'none',
});
const primaryBtn = (theme) => ({
  flex: 1, background: theme.primaryBtnBg, color: theme.primaryBtnText, border: 'none',
  borderRadius: 10, padding: '11px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
});
const ghostBtn = (theme) => ({
  flex: 1, background: 'transparent', color: theme.textDim,
  border: `1px solid ${theme.inputBorder}`, borderRadius: 10,
  padding: '11px 0', fontSize: 14, cursor: 'pointer',
});
const dangerBtn = {
  background: 'transparent', color: '#FF4E6A',
  border: '1px solid #FF4E6A44', borderRadius: 10,
  padding: '11px 14px', fontSize: 14, cursor: 'pointer',
};
const smallGhostBtn = (theme) => ({
  background: 'transparent', color: theme.textDim,
  border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
  padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
});
const smallDangerBtn = {
  background: 'transparent', color: '#FF4E6A',
  border: '1px solid #FF4E6A44', borderRadius: 8,
  padding: '6px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600,
};

// ─── Settings Modal ───────────────────────────────────────────────────────────

function SettingsModal({
  firstName, categories, themeName, originalTheme,
  onClose, onCancel, onSave, onLiveThemeChange, onLogout, theme,
}) {
  const [nameInput, setNameInput] = useState(firstName || '');
  const [cats, setCats] = useState(categories);
  const [selectedTheme, setSelectedTheme] = useState(themeName);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_PALETTE[0]);
  const [newCatEmoji, setNewCatEmoji] = useState('');

  const handleThemeClick = (t) => {
    setSelectedTheme(t);
    onLiveThemeChange(t); // apply immediately for live preview
  };

  const handleClose = () => {
    // Closed without saving -> revert theme preview to original
    if (selectedTheme !== originalTheme) onLiveThemeChange(originalTheme);
    onCancel();
  };

  const handleSave = () => {
    onSave({
      name: nameInput.trim(),
      categories: cats,
      theme: selectedTheme,
    });
  };

  const handleAddCat = () => {
    if (!newCatName.trim() || cats.length >= 6) return;
    setCats(prev => [...prev, { id: crypto.randomUUID(), label: newCatName.trim(), accent: newCatColor, emoji: newCatEmoji || null }]);
    setNewCatName(''); setNewCatEmoji(''); setAddingCat(false);
  };

  const handleRemoveCat = (id) => {
    setCats(prev => prev.filter(c => c.id !== id));
  };

  const handleRecolor = (id, color) => {
    setCats(prev => prev.map(c => c.id === id ? { ...c, accent: color } : c));
  };

  const handleRecategoryEmoji = (id, emoji) => {
    setCats(prev => prev.map(c => c.id === id ? { ...c, emoji: emoji || null } : c));
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 250,
    }} onClick={handleClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: theme.panel, border: `1px solid ${theme.panelBorder}`,
        borderRadius: 24, padding: 28, width: 400, maxWidth: '90vw',
        maxHeight: '85vh', overflowY: 'auto', position: 'relative',
        boxShadow: theme.shadow,
      }}>
        <button onClick={handleClose} aria-label="Close settings" style={{
          position: 'absolute', top: 18, right: 18,
          background: theme.hoverBg, border: `1px solid ${theme.cardBorder}`,
          borderRadius: 8, width: 28, height: 28, color: theme.textDim,
          cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center',
          lineHeight: 1, padding: 0,
        }}>
          ✕
        </button>

        <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: theme.text }}>
          Settings
        </h2>

        <label style={lbl(theme)}>Your name</label>
        <input value={nameInput} onChange={e => setNameInput(e.target.value)}
          placeholder="Your name" style={inp(theme)} />

        <label style={lbl(theme)}>Categories</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
          {cats.map(cat => (
            <div key={cat.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: theme.cardBg, borderRadius: 12, padding: '8px 10px',
            }}>
              <EmojiPickerButton
                value={cat.emoji}
                onChange={(emoji) => handleRecategoryEmoji(cat.id, emoji)}
                theme={theme}
                accent={cat.accent}
              />
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 96 }}>
                {CATEGORY_COLOR_PALETTE.map(c => (
                  <div key={c} onClick={() => handleRecolor(cat.id, c)} style={{
                    width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: cat.accent === c ? `2px solid ${theme.text}` : '2px solid transparent',
                    boxSizing: 'border-box', flexShrink: 0,
                  }} />
                ))}
              </div>
              <span style={{ flex: 1, fontSize: 13, color: theme.text, fontWeight: 500, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {cat.label}
              </span>
              <button onClick={() => handleRemoveCat(cat.id)} style={{
                background: 'transparent', border: 'none', color: '#FF4E6A',
                cursor: 'pointer', fontSize: 12, fontWeight: 700, padding: 4, lineHeight: 1,
              }}>
                ✕
              </button>
            </div>
          ))}
          {cats.length === 0 && (
            <div style={{ fontSize: 12, color: theme.textFaint }}>No categories yet.</div>
          )}
        </div>

        {cats.length < 6 && (
          addingCat ? (
            <div style={{ border: `1.5px dashed ${theme.cardBorder}`, borderRadius: 12, padding: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <EmojiPickerButton
                  value={newCatEmoji}
                  onChange={setNewCatEmoji}
                  theme={theme}
                  accent={newCatColor}
                />
                <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name" style={{ ...inp(theme), marginBottom: 0, flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {CATEGORY_COLOR_PALETTE.map(c => (
                  <div key={c} onClick={() => setNewCatColor(c)} style={{
                    width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: newCatColor === c ? `2px solid ${theme.text}` : '2px solid transparent',
                    boxSizing: 'border-box',
                  }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleAddCat} style={primaryBtn(theme)}>Add</button>
                <button onClick={() => { setAddingCat(false); setNewCatName(''); setNewCatEmoji(''); }} style={ghostBtn(theme)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCat(true)} style={{
              width: '100%', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
              border: `1.5px dashed ${theme.cardBorder}`, background: 'transparent',
              color: theme.textDim, fontSize: 12, fontWeight: 600, marginBottom: 16,
            }}>
              + New category
            </button>
          )
        )}

        <label style={lbl(theme)}>Theme</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['dark', 'light'].map(t => (
            <button key={t} onClick={() => handleThemeClick(t)} style={{
              flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', textTransform: 'capitalize',
              border: selectedTheme === t ? `1.5px solid ${theme.text}` : `1.5px solid ${theme.inputBorder}`,
              background: selectedTheme === t ? theme.hoverBg : 'transparent',
              color: selectedTheme === t ? theme.text : theme.textDim,
            }}>
              {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>

        <button onClick={onLogout} style={{
          width: '100%', background: '#FF4E6A', color: '#fff', border: 'none',
          borderRadius: 12, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          marginBottom: 10,
        }}>
          Log out
        </button>

        <button onClick={handleSave} style={{ ...primaryBtn(theme), width: '100%' }}>
          Save settings
        </button>
      </div>
    </div>
  );
}

// ─── Emoji picker button (small popover) ──────────────────────────────────────

const EMOJI_OPTIONS = ['🏃','🧘','📚','✨','💪','🎯','🎨','🍎','💧','😴','🧠','💼','🎵','🌱','❤️','📝','🏠','💰'];

function EmojiPickerButton({ value, onChange, theme, accent }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 32, height: 32, borderRadius: 10, flexShrink: 0,
          background: `${accent}18`, border: `1px solid ${accent}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, cursor: 'pointer', padding: 0,
          color: accent, fontWeight: 800,
        }}
        title="Choose an emoji"
      >
        {value || '+'}
      </button>
      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 38, left: 0, zIndex: 300,
            background: theme.panel, border: `1px solid ${theme.panelBorder}`,
            borderRadius: 12, padding: 8, boxShadow: theme.shadow,
            display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4,
            width: 180,
          }}
        >
          {EMOJI_OPTIONS.map(e => (
            <button key={e} onClick={() => { onChange(e); setOpen(false); }} style={{
              background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer',
              padding: 4, borderRadius: 6,
            }}>
              {e}
            </button>
          ))}
          <button onClick={() => { onChange(''); setOpen(false); }} style={{
            gridColumn: 'span 6', background: 'transparent', border: `1px solid ${theme.cardBorder}`,
            borderRadius: 6, color: theme.textDim, fontSize: 11, cursor: 'pointer',
            padding: '6px 0', marginTop: 4, fontWeight: 600,
          }}>
            No emoji
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Habit Tracker (main UI, shown when logged in) ───────────────────────────

function HabitTracker({
  habits, setHabits, onLogout, userEmail, firstName, onUpdateName,
  categories, onUpdateCategories, themeName, onUpdateTheme, syncing,
}) {
  const [weekOffset, setWeekOffset]   = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [moreOpen, setMoreOpen]       = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Drag-to-reorder state
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const longPressTimer = React.useRef(null);

  const theme = THEMES[themeName] || THEMES.dark;
  const isMobile = useIsMobile();
  const settingsOriginalThemeRef = React.useRef(themeName);

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

  const addCategory = (cat) => {
    onUpdateCategories([...categories, cat]);
  };

  const openSettings = () => {
    settingsOriginalThemeRef.current = themeName;
    setSettingsOpen(true);
  };

  const handleSettingsCancel = () => {
    setSettingsOpen(false);
  };

  const handleSettingsSave = ({ name, categories: newCats, theme: newTheme }) => {
    if (name && name !== firstName) onUpdateName(name);
    onUpdateCategories(newCats);
    onUpdateTheme(newTheme);
    setSettingsOpen(false);
  };

  // ─── Drag-to-reorder handlers ───
  // Long-press (500ms) on a habit card starts a drag; moving the pointer
  // over other cards reorders them live; releasing finalizes the order.
  const cardRefs = React.useRef({});
  const dragStateRef = React.useRef({ active: false });

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const endDrag = () => {
    dragStateRef.current = { active: false };
    setDragIndex(null);
    setOverIndex(null);
    window.removeEventListener('pointermove', onPointerMoveRef.current);
    window.removeEventListener('pointerup', onPointerUpRef.current);
  };

  const onPointerMoveRef = React.useRef(() => {});
  const onPointerUpRef = React.useRef(() => {});

  onPointerMoveRef.current = (e) => {
    if (!dragStateRef.current.active) return;
    const y = e.clientY;
    let closestIndex = null;
    let closestDist = Infinity;
    habits.forEach((h, idx) => {
      const el = cardRefs.current[h.id];
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const dist = Math.abs(center - y);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = idx;
      }
    });
    if (closestIndex !== null) setOverIndex(closestIndex);
  };

  onPointerUpRef.current = () => {
    const { dragIndex: di } = dragStateRef.current;
    setHabits(prev => {
      const overIdx = dragStateRef.current.overIndex;
      if (di == null || overIdx == null || di === overIdx) return prev;
      const next = [...prev];
      const [moved] = next.splice(di, 1);
      next.splice(overIdx, 0, moved);
      return next;
    });
    endDrag();
  };

  const startLongPress = (index, e) => {
    // Avoid starting a drag from a normal click/scroll: cancel if pointer
    // moves more than a few pixels before the long-press threshold fires.
    const startX = e.clientX, startY = e.clientY;
    const moveCancelHandler = (moveEvent) => {
      const dx = Math.abs(moveEvent.clientX - startX);
      const dy = Math.abs(moveEvent.clientY - startY);
      if (dx > 8 || dy > 8) {
        clearLongPress();
        window.removeEventListener('pointermove', moveCancelHandler);
      }
    };
    window.addEventListener('pointermove', moveCancelHandler);

    longPressTimer.current = setTimeout(() => {
      window.removeEventListener('pointermove', moveCancelHandler);
      dragStateRef.current = { active: true, dragIndex: index, overIndex: index };
      setDragIndex(index);
      setOverIndex(index);
      window.addEventListener('pointermove', onPointerMoveRef.current);
      window.addEventListener('pointerup', onPointerUpRef.current);
    }, 500);

    // Clean up the move-cancel listener once the press ends (pointerup before activation)
    const upCleanup = () => {
      window.removeEventListener('pointermove', moveCancelHandler);
      window.removeEventListener('pointerup', upCleanup);
    };
    window.addEventListener('pointerup', upCleanup);
  };

  const cancelLongPress = () => {
    clearLongPress();
  };

  // Keep dragStateRef.overIndex in sync with state for the pointerup handler
  React.useEffect(() => {
    if (dragStateRef.current.active) {
      dragStateRef.current.overIndex = overIndex;
    }
  }, [overIndex]);

  const todayDone = habits.filter(h => h.entries[todayStr()]?.done).length;

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      background: theme.bg,
      color: theme.text,
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
            background: theme.panel,
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: 22,
            boxShadow: theme.shadow,
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
                ...navBtn(theme), width: 36, height: 36, fontSize: 16,
                flexDirection: 'column', gap: 3, marginTop: 2,
              }}
            >
              <span style={hamburgerLine(theme)} />
              <span style={hamburgerLine(theme)} />
              <span style={hamburgerLine(theme)} />
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 4, fontWeight: 500 }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Hey {firstName || 'there'}! 👋
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: theme.textDim }}>
                {todayDone === habits.length && habits.length > 0
                  ? 'All done for today 🎉'
                  : `${todayDone} of ${habits.length} done today`}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                <span style={{ fontSize: 11, color: theme.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                  {userEmail}
                </span>
                <span style={{ fontSize: 10, color: syncing ? '#FFB830' : '#00E5CC', fontWeight: 600 }}>
                  {syncing ? '● Syncing' : '● Synced'}
                </span>
              </div>
            </div>
            <button
              onClick={openSettings}
              aria-label="Open settings"
              style={{ ...navBtn(theme), width: 36, height: 36, fontSize: 16, marginTop: 2 }}
            >
              ⚙
            </button>
          </div>

          {/* Weekly Calendar */}
          <WeekCalendar habits={habits} categories={categories} weekOffset={weekOffset} onChangeWeek={setWeekOffset} theme={theme} />

          {/* Section header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.textDim, letterSpacing: '0.04em' }}>
              TODAY'S HABITS
            </span>
            <button
              onClick={() => { setEditTarget(null); setModalOpen(true); }}
              style={{
                background: theme.hoverBg, border: `1px solid ${theme.cardBorder}`,
                borderRadius: 10, padding: '6px 14px', fontSize: 13, color: theme.text,
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
              border: `1px dashed ${theme.cardBorder}`, borderRadius: 20,
              color: theme.textDim,
            }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>🌱</div>
              <p style={{ margin: 0, fontSize: 15 }}>No habits yet.</p>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>Tap "+ Add" to build your first streak.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {habits.map((habit, index) => (
                <div
                  key={habit.id}
                  ref={(el) => { if (el) cardRefs.current[habit.id] = el; else delete cardRefs.current[habit.id]; }}
                  onPointerDown={(e) => startLongPress(index, e)}
                  onPointerUp={() => { if (!dragStateRef.current.active) cancelLongPress(); }}
                  onPointerLeave={() => { if (!dragStateRef.current.active) cancelLongPress(); }}
                  style={{
                    opacity: dragIndex === index ? 0.4 : 1,
                    outline: overIndex === index && dragIndex !== null && dragIndex !== index
                      ? `2px dashed ${theme.textDim}` : 'none',
                    outlineOffset: 2,
                    borderRadius: 20,
                    transition: 'opacity 0.15s',
                    cursor: dragIndex !== null ? 'grabbing' : 'default',
                    userSelect: dragIndex !== null ? 'none' : undefined,
                    touchAction: dragIndex !== null ? 'none' : undefined,
                  }}
                >
                  <HabitCard
                    habit={habit}
                    categories={categories}
                    onToggle={toggleToday}
                    onOpen={(h) => { if (dragIndex === null) { setEditTarget(h); setModalOpen(true); } }}
                    theme={theme}
                  />
                </div>
              ))}
            </div>
          )}

          <p style={{ textAlign: 'center', fontSize: 11, color: theme.textFaint, marginTop: 32 }}>
            Tap the ring to mark done · Tap a card to edit · Long-press &amp; drag to reorder
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
              ...navBtn(theme), width: 40, height: 40, fontSize: 16,
              flexDirection: 'column', gap: 3,
              position: 'fixed', top: 24, left: 24, zIndex: 20,
            }}
          >
            <span style={hamburgerLine(theme)} />
            <span style={hamburgerLine(theme)} />
            <span style={hamburgerLine(theme)} />
          </button>
        )}

        {/* Floating mini top-streak card, only when sidebar is open */}
        {sidebarOpen && !isMobile && (
          <TopStreaksCardFloating habits={habits} onMore={() => setMoreOpen(true)} theme={theme} />
        )}

        {/* Solid top streaks card, fixed to viewport top-right, when sidebar closed */}
        {!sidebarOpen && (
          <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 20 }}>
            <TopStreaksCardFull habits={habits} onMore={() => setMoreOpen(true)} theme={theme} />
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
            categories={categories}
            monthOffset={monthOffset}
            onChangeMonth={setMonthOffset}
            centered={true}
            theme={theme}
          />
        </div>
      </div>

      {modalOpen && (
        <HabitModal
          initial={editTarget}
          categories={categories}
          onAddCategory={addCategory}
          onSave={saveHabit}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onDelete={deleteHabit}
          theme={theme}
        />
      )}

      {moreOpen && (
        <MoreHabitsModal
          habits={habits}
          categories={categories}
          onClose={() => setMoreOpen(false)}
          onEdit={(h) => { setMoreOpen(false); setEditTarget(h); setModalOpen(true); }}
          onDelete={deleteHabit}
          theme={theme}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          firstName={firstName}
          categories={categories}
          themeName={themeName}
          originalTheme={settingsOriginalThemeRef.current}
          onCancel={handleSettingsCancel}
          onSave={handleSettingsSave}
          onLiveThemeChange={onUpdateTheme}
          onLogout={onLogout}
          theme={theme}
        />
      )}
    </div>
  );
}

const hamburgerLine = (theme) => ({
  display: 'block', width: 16, height: 2, borderRadius: 1,
  background: theme.textDim,
});

// ─── Login Screen ─────────────────────────────────────────────────────────────

function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }
    if (mode === 'signup' && !firstName.trim()) {
      setError('Please enter your first name.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { first_name: firstName.trim() } },
        });
        if (error) throw error;
        setInfo('Account created! If email confirmation is enabled, check your inbox. Otherwise you can log in now.');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: '#0d0d14', color: '#f0f0f5',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxSizing: 'border-box', padding: 16,
    }}>
      <GlobalStyles />
      <div style={{
        background: '#15151d', border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 22, padding: 32, width: 380, maxWidth: '100%',
        boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: '#8b8b9a' }}>
          {mode === 'login'
            ? 'Log in to sync your habits across devices.'
            : 'Sign up to start syncing your habits everywhere.'}
        </p>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label style={lbl(THEMES.dark)}>First name</label>
              <input
                type="text" value={firstName} onChange={e => setFirstName(e.target.value)}
                placeholder="Saatvik" style={inp(THEMES.dark)} autoComplete="given-name"
              />
            </>
          )}

          <label style={lbl(THEMES.dark)}>Email</label>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" style={inp(THEMES.dark)} autoComplete="email"
          />

          <label style={lbl(THEMES.dark)}>Password</label>
          <input
            type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" style={inp(THEMES.dark)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />

          {error && (
            <div style={{ color: '#FF4E6A', fontSize: 12, marginBottom: 12 }}>{error}</div>
          )}
          {info && (
            <div style={{ color: '#00E5CC', fontSize: 12, marginBottom: 12 }}>{info}</div>
          )}

          <button type="submit" disabled={loading} style={{ ...primaryBtn(THEMES.dark), width: '100%', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setInfo(''); }}
          style={{
            background: 'transparent', border: 'none', color: '#8b8b9a',
            fontSize: 13, cursor: 'pointer', marginTop: 16, width: '100%', textAlign: 'center',
          }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}

// ─── Onboarding: Categories ───────────────────────────────────────────────────

function OnboardingCategories({ onNext, onSkip }) {
  const theme = THEMES.dark;
  const [cats, setCats] = useState([
    { name: '', color: CATEGORY_COLOR_PALETTE[0], emoji: '' },
    { name: '', color: CATEGORY_COLOR_PALETTE[1], emoji: '' },
    { name: '', color: CATEGORY_COLOR_PALETTE[2], emoji: '' },
  ]);

  const updateCat = (i, field, value) => {
    setCats(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const addBox = () => {
    if (cats.length >= 6) return;
    const usedColors = cats.map(c => c.color);
    const nextColor = CATEGORY_COLOR_PALETTE.find(c => !usedColors.includes(c)) || CATEGORY_COLOR_PALETTE[cats.length % CATEGORY_COLOR_PALETTE.length];
    setCats(prev => [...prev, { name: '', color: nextColor, emoji: '' }]);
  };

  const handleNext = () => {
    const filled = cats
      .filter(c => c.name.trim())
      .map(c => ({ id: crypto.randomUUID(), label: c.name.trim(), accent: c.color, emoji: c.emoji || null }));
    onNext(filled);
  };

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: theme.bg, color: theme.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxSizing: 'border-box', padding: 16, position: 'relative',
    }}>
      <GlobalStyles />
      <div style={{
        background: theme.panel, border: `1px solid ${theme.panelBorder}`,
        borderRadius: 22, padding: 32, width: 440, maxWidth: '100%',
        boxShadow: theme.shadow,
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
          What do you want to track?
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: theme.textDim }}>
          Create categories for your habits — e.g. Health, Work, Learning. You can add up to 6, and change these anytime in settings.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {cats.map((cat, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <EmojiPickerButton
                value={cat.emoji}
                onChange={(emoji) => updateCat(i, 'emoji', emoji)}
                theme={theme}
                accent={cat.color}
              />
              <input
                value={cat.name}
                onChange={e => updateCat(i, 'name', e.target.value)}
                placeholder={`Category ${i + 1}`}
                style={{ ...inp(theme), marginBottom: 0, flex: 1 }}
              />
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                {CATEGORY_COLOR_PALETTE.slice(0, 4).map(c => (
                  <div key={c} onClick={() => updateCat(i, 'color', c)} style={{
                    width: 18, height: 18, borderRadius: '50%', background: c, cursor: 'pointer',
                    border: cat.color === c ? `2px solid ${theme.text}` : '2px solid transparent',
                    boxSizing: 'border-box',
                  }} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {cats.length < 6 && (
          <button onClick={addBox} style={{
            width: '100%', padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
            border: `1.5px dashed ${theme.cardBorder}`, background: 'transparent',
            color: theme.textDim, fontSize: 12, fontWeight: 600, marginBottom: 24,
          }}>
            + Add another category
          </button>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
          <button onClick={onSkip} style={{
            background: 'transparent', border: 'none', color: theme.textFaint,
            fontSize: 13, cursor: 'pointer', fontWeight: 500, padding: '10px 14px',
          }}>
            Skip
          </button>
          <button onClick={handleNext} style={{ ...primaryBtn(theme), flex: 'none', padding: '11px 28px' }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Onboarding: Theme ─────────────────────────────────────────────────────────

function OnboardingTheme({ onFinish, onSkip }) {
  const [selected, setSelected] = useState('dark');
  const theme = THEMES[selected];

  return (
    <div style={{
      height: '100vh', width: '100vw',
      background: theme.bg, color: theme.text,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxSizing: 'border-box', padding: 16, transition: 'background 0.2s, color 0.2s',
    }}>
      <GlobalStyles />
      <div style={{
        background: theme.panel, border: `1px solid ${theme.panelBorder}`,
        borderRadius: 22, padding: 32, width: 400, maxWidth: '100%',
        boxShadow: theme.shadow,
      }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>
          Pick your style
        </h1>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: theme.textDim }}>
          You can switch this anytime in settings.
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 28 }}>
          {['dark', 'light'].map(t => (
            <button key={t} onClick={() => setSelected(t)} style={{
              flex: 1, padding: '20px 0', borderRadius: 14, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', textTransform: 'capitalize',
              border: selected === t ? `1.5px solid ${theme.text}` : `1.5px solid ${theme.inputBorder}`,
              background: selected === t ? theme.hoverBg : 'transparent',
              color: selected === t ? theme.text : theme.textDim,
              transition: 'all 0.15s',
            }}>
              {t === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
          <button onClick={onSkip} style={{
            background: 'transparent', border: 'none', color: theme.textFaint,
            fontSize: 13, cursor: 'pointer', fontWeight: 500, padding: '10px 14px',
          }}>
            Skip
          </button>
          <button onClick={() => onFinish(selected)} style={{ ...primaryBtn(theme), flex: 'none', padding: '11px 28px' }}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Top-level App: handles auth + cloud sync ────────────────────────────────

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [habits, setHabits] = useState([]);
  const [loadingHabits, setLoadingHabits] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Profile: categories, theme, onboarded flag
  const [categories, setCategories] = useState([]);
  const [themeName, setThemeName] = useState('dark');
  const [onboarded, setOnboarded] = useState(null); // null = unknown/loading
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState('categories'); // 'categories' | 'theme'

  // Watch auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load habits when logged in
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoadingHabits(true);
    (async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('data')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Failed to load habits:', error);
        setHabits(DEFAULT_HABITS);
      } else if (data && data.data) {
        setHabits(data.data);
      } else {
        setHabits(DEFAULT_HABITS);
      }
      setLoadingHabits(false);
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Load profile (categories, theme, onboarded) when logged in
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoadingProfile(true);
    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('categories, theme, onboarded')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (cancelled) return;
      if (error) {
        console.error('Failed to load profile:', error);
        setCategories([]);
        setThemeName('dark');
        setOnboarded(false);
      } else if (data) {
        setCategories(data.categories || []);
        setThemeName(data.theme || 'dark');
        setOnboarded(!!data.onboarded);
      } else {
        setCategories([]);
        setThemeName('dark');
        setOnboarded(false);
      }
      setLoadingProfile(false);
    })();
    return () => { cancelled = true; };
  }, [session]);

  // Save habits to Supabase whenever they change (debounced)
  useEffect(() => {
    if (!session || loadingHabits) return;
    setSyncing(true);
    const timeout = setTimeout(async () => {
      const { error } = await supabase
        .from('habits')
        .upsert({ user_id: session.user.id, data: habits, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) console.error('Failed to save habits:', error);
      setSyncing(false);
    }, 800);
    return () => clearTimeout(timeout);
  }, [habits, session, loadingHabits]);

  // Save profile (categories/theme/onboarded) whenever they change (debounced)
  useEffect(() => {
    if (!session || loadingProfile || onboarded === null) return;
    const timeout = setTimeout(async () => {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: session.user.id,
          categories,
          theme: themeName,
          onboarded,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
      if (error) console.error('Failed to save profile:', error);
    }, 500);
    return () => clearTimeout(timeout);
  }, [categories, themeName, onboarded, session, loadingProfile]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setHabits([]);
    setCategories([]);
    setThemeName('dark');
    setOnboarded(null);
  };

  const handleUpdateName = async (newName) => {
    const { data, error } = await supabase.auth.updateUser({ data: { first_name: newName } });
    if (error) console.error('Failed to update name:', error);
    else if (data?.user) setSession(prev => prev ? { ...prev, user: data.user } : prev);
  };

  // ─── Onboarding flow handlers ───
  const handleCategoriesNext = (cats) => {
    setCategories(cats);
    setOnboardingStep('theme');
  };
  const handleCategoriesSkip = () => {
    setOnboardingStep('theme');
  };
  const handleThemeFinish = (chosenTheme) => {
    setThemeName(chosenTheme);
    setOnboarded(true);
  };
  const handleThemeSkip = () => {
    setThemeName('dark');
    setOnboarded(true);
  };

  if (session === undefined) {
    // Still checking auth state
    return (
      <div style={{
        height: '100vh', width: '100vw', background: '#0d0d14', color: '#8b8b9a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <GlobalStyles />
        Loading…
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={() => {}} />;
  }

  if (loadingHabits || loadingProfile || onboarded === null) {
    return (
      <div style={{
        height: '100vh', width: '100vw', background: '#0d0d14', color: '#8b8b9a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <GlobalStyles />
        Loading your habits…
      </div>
    );
  }

  if (!onboarded) {
    if (onboardingStep === 'categories') {
      return <OnboardingCategories onNext={handleCategoriesNext} onSkip={handleCategoriesSkip} />;
    }
    return <OnboardingTheme onFinish={handleThemeFinish} onSkip={handleThemeSkip} />;
  }

  return (
    <HabitTracker
      habits={habits}
      setHabits={setHabits}
      onLogout={handleLogout}
      userEmail={session.user.email}
      firstName={session.user.user_metadata?.first_name || ''}
      onUpdateName={handleUpdateName}
      categories={categories}
      onUpdateCategories={setCategories}
      themeName={themeName}
      onUpdateTheme={setThemeName}
      syncing={syncing}
    />
  );
}
