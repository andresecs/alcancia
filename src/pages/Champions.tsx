import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";

const champions = [
  { name: "Guille Cagigas", titles: "3" },
  { name: "Jane Doe", titles: "2" },
  { name: "John Doe", titles: "2" },
];

export default function Champions() {

  return (
    <main className="champions-page">
      <SiteHeader />

      <section className="champions-main">
        <div className="champions-title" role="heading" aria-level={1}>
          Champions
        </div>
        <p className="champions-subtitle">
          Every title since Reserve Cup I — Miami, 2024
        </p>

        <div className="champions-list">
          <div className="champions-list__title" role="heading" aria-level={2}>
            Most Titles
          </div>
          <div className="champions-card-grid">
            {champions.map((champion) => (
              <article className="champion-card" key={champion.name}>
                <p>{champion.name}</p>
                <span>{champion.titles}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="champions-coming-soon">
        <div role="heading" aria-level={2}>
          Under Construction
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
