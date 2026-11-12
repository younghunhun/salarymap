import { useState } from 'react';
import { BRAND, c, s } from './ktcStyles';

/* 공고 자기소개서 입력 폼 — 지원 모달(KtcApply)과 메일 착지(/ktc/essay)가 같이 쓴다.
   문항은 lib/jobEssays.js. 전 문항 필수. */

const T = {
  vi: { yes: 'Có', no: 'Không', required: 'Vui lòng trả lời tất cả câu hỏi.', ph: 'Nhập câu trả lời của bạn' },
  ko: { yes: '가능', no: '불가', required: '모든 문항에 답해 주세요.', ph: '답변을 입력해 주세요' },
  en: { yes: 'Yes', no: 'No', required: 'Please answer all questions.', ph: 'Your answer' },
};

export const essayLang = (lang) => (T[lang] ? lang : 'vi');

export default function EssayForm({ questions, lang, initial, submitLabel, busy, error, onSubmit }) {
  const L = essayLang(lang);
  const tt = T[L];
  const [vals, setVals] = useState(() => ({ ...(initial || {}) }));
  const [missing, setMissing] = useState(false);
  const set = (k, v) => setVals((o) => ({ ...o, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (busy) return;
    const ok = questions.every((q) => String(vals[q.key] || '').trim());
    setMissing(!ok);
    if (ok) onSubmit(vals);
  };

  const box = {
    width: '100%', boxSizing: 'border-box', minHeight: 110, padding: '10px 12px', borderRadius: 10,
    border: `1px solid ${c.lineStrong}`, background: '#fff', color: c.text, fontSize: 14, lineHeight: 1.55,
    fontFamily: 'inherit', resize: 'vertical',
  };
  const pill = (on) => ({
    flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${on ? BRAND : c.lineStrong}`, background: on ? '#fff4ec' : '#fff', color: on ? BRAND : c.textDim,
  });

  return (
    <form onSubmit={submit}>
      {questions.map((q, i) => (
        <div key={q.key} style={{ marginBottom: 18 }}>
          <label style={{ display: 'block', fontSize: 14, fontWeight: 700, lineHeight: 1.5, color: c.text, marginBottom: 8 }}>
            {i + 1}. {q.label[L] || q.label.vi}
          </label>
          {q.type === 'yesno' ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={pill(vals[q.key] === 'yes')} onClick={() => set(q.key, 'yes')}>{tt.yes}</button>
              <button type="button" style={pill(vals[q.key] === 'no')} onClick={() => set(q.key, 'no')}>{tt.no}</button>
            </div>
          ) : (
            <textarea style={box} value={vals[q.key] || ''} placeholder={tt.ph} maxLength={4000}
              onChange={(e) => set(q.key, e.target.value)} />
          )}
        </div>
      ))}
      {(missing || error) && (
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#e5383b' }}>{missing ? tt.required : error}</p>
      )}
      <button type="submit" disabled={busy}
        style={{ ...s.btnPrimary, width: '100%', opacity: busy ? 0.55 : 1, cursor: busy ? 'default' : 'pointer' }}>
        {submitLabel}
      </button>
    </form>
  );
}
