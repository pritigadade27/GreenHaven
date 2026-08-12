import Icon from '../../common/Icon/Icon.jsx';
import Button from '../../common/Button/Button.jsx';
import useScrollReveal from '../../../hooks/useScrollReveal.js';
import { useCatalogue } from '../../../context/CatalogueContext.jsx';
import philodendron from '../../../assets/images/plants/philodendron.jpg';
import calathea from '../../../assets/images/plants/calathea.jpg';
import './WhyChooseUs.css';

const REASONS = [
  {
    icon: 'leaf',
    title: 'Nursery grown, never resold',
    body: 'Every plant is raised in our own nursery and acclimatised to Indian homes before it ships. No warehouse stock, no mystery imports.',
  },
  {
    icon: 'drop',
    title: 'A care card with every plant',
    body: 'Light, water, soil, humidity, temperature, feeding and repotting — written down for your exact plant, not a generic leaflet.',
  },
  {
    icon: 'paw',
    title: 'Honest pet-safety labelling',
    body: 'We tell you when a plant is toxic to cats and dogs, even when it is one of our best sellers. You should not have to google it after buying.',
  },
  {
    icon: 'shield',
    title: 'The 30-day plant promise',
    body: 'If it arrives unhappy or fails within a month, we replace it. Plants travel badly sometimes — that is our problem, not yours.',
  },
];

export default function WhyChooseUs() {
  const { PLANTS } = useCatalogue();
  const ref = useScrollReveal();

  const petSafe = PLANTS.filter((p) => p.petSafety === 'safe').length;

  return (
    <section className="why section" id="why" ref={ref}>
      <div className="container why__inner">
        <div className="why__visual reveal reveal--left">
          <figure className="why__photo why__photo--main">
            <img src={philodendron} alt="A philodendron in afternoon light" loading="lazy" />
          </figure>
          <figure className="why__photo why__photo--inset">
            <img src={calathea} alt="A calathea in a cream pot" loading="lazy" />
          </figure>

          <div className="why__stat">
            <strong>{petSafe}</strong>
            <span>
              pet-safe plants
              <br />
              clearly labelled
            </span>
          </div>
        </div>

        <div className="why__content">
          <header className="reveal">
            <span className="eyebrow">Why Green Haven</span>
            <h2>
              Anyone can sell you a plant.
              <br />
              <em>Keeping it alive is the job.</em>
            </h2>
            <p className="why__lede">
              Most plants die in the first six weeks, and almost always for a reason that could
              have been written on a card. So we write it on a card.
            </p>
          </header>

          <ul className="why__list">
            {REASONS.map(({ icon, title, body }, index) => (
              <li key={title} className={`reveal reveal--right delay-${index + 1}`}>
                <span className="why__icon">
                  <Icon name={icon} size={20} />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="reveal">
            <Button to="/about" variant="outline" icon="arrowRight">
              Our story
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
