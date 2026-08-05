import Button from '../../components/common/Button/Button.jsx';
import Icon from '../../components/common/Icon/Icon.jsx';
import useScrollReveal from '../../hooks/useScrollReveal.js';
import { useCatalogue } from '../../context/CatalogueContext.jsx';
import storyImg from '../../assets/images/plants/cast-iron-plant.jpg';
import nurseryImg from '../../assets/images/plants/areca-palm.jpg';
import './About.css';

const VALUES = [
  {
    icon: 'leaf',
    title: 'Grow it ourselves',
    body: 'Every plant is propagated and hardened off in our own nursery. We know what it has been through before it reaches you.',
  },
  {
    icon: 'paw',
    title: 'Tell the truth',
    body: 'If a plant is toxic to cats, we print it on the card — even on our best sellers. Many of our best-known plants are. You deserve to know which.',
  },
  {
    icon: 'drop',
    title: 'Teach, do not just sell',
    body: 'A care card ships in every box, and the same information is free on the site whether you buy from us or not.',
  },
  {
    icon: 'shield',
    title: 'Stand behind it',
    body: 'Plants travel badly sometimes. If yours arrives unhappy or fails inside 30 days, we replace it without an argument.',
  },
];

export default function About() {
  const { ALL_PLANTS, CATEGORIES } = useCatalogue();
  const ref = useScrollReveal();
  const petSafe = ALL_PLANTS.filter((p) => p.petSafety === 'safe').length;

  return (
    <div ref={ref}>
      <h1 className="sr-only">About Green Haven</h1>

      {/* ------------------------------------------------------------ story */}
      <section className="about-story section">
        <div className="container about-story__inner">
          <figure className="about-story__art reveal reveal--left">
            <img src={storyImg} alt="A cast iron plant beside a window" loading="lazy" />
          </figure>

          <div className="about-story__copy reveal reveal--right">
            <span className="eyebrow">How it started</span>
            <h2>Nobody tells you why it died</h2>
            <p>
              Priti killed eleven plants in her first year. Every one came with a plastic stake
              saying &ldquo;water regularly, keep in indirect light&rdquo; &mdash; advice so vague
              it is useless. Nobody said that a money plant wants to dry out between waterings, or
              that a peace lily droops on purpose to tell you it is thirsty.
            </p>
            <p>
              So Green Haven was built backwards from that problem. First we wrote the care cards.
              Then we chose which plants to sell, keeping only the ones we could honestly explain
              how to keep alive. The nursery came third.
            </p>
            <p>
              Today the catalogue runs to {ALL_PLANTS.length} species across {CATEGORIES.length}{' '}
              categories, and every single one carries seven fields of care detail, a difficulty
              rating and an honest pet-safety label.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- mission / vision */}
      <section className="about-mv section section--tint">
        <div className="container about-mv__grid">
          <article className="reveal reveal--up delay-1">
            <span className="about-mv__label">Mission</span>
            <h3>Keep the plant alive, not just sell it</h3>
            <p>
              To put a living plant in every Indian home and give its owner enough information that
              it is still there a year later. A plant that dies is a customer we failed, not a
              repeat sale.
            </p>
          </article>

          <article className="reveal reveal--up delay-2">
            <span className="about-mv__label">Vision</span>
            <h3>Make plant care ordinary knowledge</h3>
            <p>
              A country where nobody is intimidated by a houseplant, because the information they
              need is plain, free and attached to the thing itself &mdash; not buried in a forum
              thread from 2011.
            </p>
          </article>

          <article className="reveal reveal--up delay-3">
            <span className="about-mv__label">Promise</span>
            <h3>No claim we cannot back</h3>
            <p>
              Every number on this site is counted from the catalogue, not invented for marketing.{' '}
              {petSafe} pet-safe plants means {petSafe} &mdash; go and count them on the shop page.
            </p>
          </article>
        </div>
      </section>

      {/* ----------------------------------------------------------- values */}
      <section className="about-values section">
        <div className="container">
          <header className="section-heading section-heading--center reveal">
            <span className="eyebrow">What we hold to</span>
            <h2>Four rules we do not bend</h2>
          </header>

          <div className="about-values__grid">
            {VALUES.map(({ icon, title, body }, i) => (
              <article key={title} className={`about-value reveal reveal--up delay-${i + 1}`}>
                <span className="about-value__icon">
                  <Icon name={icon} size={22} />
                </span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------- cta */}
      <section className="about-cta section">
        <div className="container about-cta__inner reveal reveal--zoom">
          <figure>
            <img src={nurseryImg} alt="An areca palm in the nursery" loading="lazy" />
          </figure>
          <div>
            <h2>Come and see the nursery</h2>
            <p>
              We are on Baner Road in Pune, open Tuesday to Sunday. Bring a photo of the spot you
              are trying to fill and we will tell you honestly what will survive there.
            </p>
            <div className="about-cta__actions">
              <Button to="/shop" size="lg" icon="arrowRight">
                Browse the catalogue
              </Button>
              <Button to="/contact" size="lg" variant="outline">
                Get in touch
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
