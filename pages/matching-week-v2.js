import MatchingWeek from './matching-week';

/* /matching-week 축제(포스터) 디자인 시안 — 내용·동작은 같고 스킨만 다르다.
   메뉴·배너 어디에도 링크하지 않는다(직접 URL 로만 접근, noindex). */
export { getStaticProps } from './matching-week';

export default function MatchingWeekV2(props) {
  return <MatchingWeek {...props} variant="fest" />;
}
