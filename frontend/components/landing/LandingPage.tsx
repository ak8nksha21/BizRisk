import React from 'react';
import { Inter } from 'next/font/google';
import LandingNavbar from './LandingNavbar';
import HeroSection from './HeroSection';
import InvestigationFlow from './InvestigationFlow';
import WhyBizRisk from './WhyBizRisk';
import BrowserResearch from './BrowserResearch';
import EvidenceValidation from './EvidenceValidation';
import EntityResolution from './EntityResolution';
import RiskIntelligence from './RiskIntelligence';
import DecisionEngine from './DecisionEngine';
import HumanInLoop from './HumanInLoop';
import Capabilities from './Capabilities';
import Evaluation from './Evaluation';
import HowItWorks from './HowItWorks';
import FinalCTA from './FinalCTA';
import Footer from './Footer';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export default function LandingPage() {
  return (
    <div className={`landing-page ${inter.className}`}>
      <LandingNavbar />
      <HeroSection />
      <InvestigationFlow />
      <WhyBizRisk />
      <BrowserResearch />
      <EvidenceValidation />
      <EntityResolution />
      <RiskIntelligence />
      <DecisionEngine />
      <HumanInLoop />
      <Capabilities />
      <Evaluation />
      <HowItWorks />
      <FinalCTA />
      <Footer />
    </div>
  );
}
