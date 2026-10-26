
type Props = { verifiedAt?: string };

export function AboutData({ verifiedAt }: Props) {
  return (
    <footer className="about" aria-labelledby="about-heading">
      <h2 id="about-heading" className="about__title">
        About the data
      </h2>
      <ul className="about__list">
        <li>
          The plans compared here come from a small <strong>curated catalog</strong>
          {verifiedAt ? `, checked by hand on official pages on ${verifiedAt}` : ''}. It is not a live
          search, and prices can change after that date.
        </li>
        <li>Prices may vary by country, and taxes may apply. Amounts are shown in US dollars.</li>
        <li>
          Your offer is analyzed only from the text you paste, with simple English-phrase rules. Anything not found is
          shown as unknown, never guessed.
        </li>
        <li>This is not financial or legal advice — it shows evidence and tradeoffs so you can decide.</li>
        <li>Nothing you paste is stored or sent anywhere. Refreshing the page clears it.</li>
      </ul>
      <p className="about__colophon">FairFork — a proof of concept.</p>
    </footer>
  );
}
