import Hero from '../../components/home/Hero/Hero.jsx';
import Categories from '../../components/home/Categories/Categories.jsx';
import FeaturedPlants from '../../components/home/FeaturedPlants/FeaturedPlants.jsx';
import NewArrivals from '../../components/home/NewArrivals/NewArrivals.jsx';
import BestSellers from '../../components/home/BestSellers/BestSellers.jsx';
import WhyChooseUs from '../../components/home/WhyChooseUs/WhyChooseUs.jsx';
import PlantCareTips from '../../components/home/PlantCareTips/PlantCareTips.jsx';
import Newsletter from '../../components/home/Newsletter/Newsletter.jsx';

export default function Home() {
  return (
    <>
      <Hero />
      <Categories />
      <FeaturedPlants />
      <NewArrivals />
      <BestSellers />
      <WhyChooseUs />
      <PlantCareTips />
      <Newsletter />
    </>
  );
}
