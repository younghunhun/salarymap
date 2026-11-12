// 공고 본문(평문 + 줄바꿈)의 "**텍스트**" 만 <strong> 으로 바꾼다. 나머지는 그대로 문자열.
// split 의 홀수 번째 조각이 ** 사이 텍스트다. 마크다운 전체가 아니라 굵게만 — KTC 공고 소제목용.
export function withBold(text, style) {
  if (typeof text !== 'string' || !text.includes('**')) return text;
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? <strong key={i} style={style}>{part}</strong> : part
  );
}
