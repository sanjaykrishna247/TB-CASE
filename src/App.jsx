import { AppProvider } from './AppContext';
import Preloader from './components/Preloader';
import Navbar from './components/Navbar';
import BackChip from './components/BackChip';
import Hero from './sections/Hero';
import CaseHistory from './sections/CaseHistory';
import { Q1, Q2, Q3, Q4, Q5, Q6, Q7, Q8 } from './sections/Questions';
import QuestionIndex from './sections/QuestionIndex';
import Footer from './sections/Footer';

export default function App() {
  return (
    <AppProvider>
      <Preloader />
      <Navbar />
      <BackChip />
      <main>
        <Hero />
        <CaseHistory />
        <Q1 />
        <Q2 />
        <Q3 />
        <Q4 />
        <Q5 />
        <Q6 />
        <Q7 />
        <Q8 />
        <QuestionIndex />
      </main>
      <Footer />
    </AppProvider>
  );
}
