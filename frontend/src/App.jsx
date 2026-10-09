
import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sprout } from 'lucide-react';

// ==========================================
// BACKGROUND COMPONENT
// ==========================================

import ParticleBackground from './components/ui/ParticleBackground';

// ==========================================
// EXISTING MODULES
// ==========================================

import LiveTelemetry from './components/tabs/LiveTelemetry';
import CropIntelligence from './components/tabs/CropIntelligence';
import FieldControl from './components/tabs/FieldControl';
import PlantHealth from './components/tabs/PlantHealth';
import HarvestYield from './components/tabs/HarvestYield';
import MarketIntelligence from './components/tabs/MarketIntelligence';

// ==========================================
// NEW ML MODULES
// ==========================================

import GeoSuitability from './components/tabs/GeoSuitability';
import MarketRisk90 from './components/tabs/MarketRisk90';


// ==========================================
// NAVIGATION TABS
// ==========================================

const tabs = [
  {
    id: 'telemetry',
    label: 'Live Telemetry',
    component: LiveTelemetry,
  },
  {
    id: 'intelligence',
    label: 'Crop Intelligence',
    component: CropIntelligence,
  },
  {
    id: 'geo',
    label: 'Geo Suitability',
    component: GeoSuitability,
  },
  {
    id: 'control',
    label: 'Field Control',
    component: FieldControl,
  },
  {
    id: 'health',
    label: 'Plant Health',
    component: PlantHealth,
  },
  {
    id: 'harvest',
    label: 'Harvest & Yield',
    component: HarvestYield,
  },
  {
    id: 'market',
    label: 'Market Intelligence',
    component: MarketIntelligence,
  },
  {
    id: 'market90',
    label: '90-Day Market Risk',
    component: MarketRisk90,
  },
];


// ==========================================
// MAIN APPLICATION
// ==========================================

function App() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  const ActiveComponent = tabs.find(
    (tab) => tab.id === activeTab
  )?.component;

  return (
    <div className="relative min-h-screen bg-agri-dark text-[#e0ffe0] font-space overflow-hidden flex flex-col">

      {/* ==================================
          ANIMATED BACKGROUND
      ================================== */}

      <ParticleBackground />


      {/* ==================================
          HEADER & NAVIGATION
      ================================== */}

      <header className="relative z-10 glass-card p-4 border-b border-agri-green/20 flex flex-col md:flex-row items-center justify-between gap-4">

        {/* LOGO */}

        <div className="flex items-center gap-3">

          <div className="p-2 rounded-full neon-border bg-agri-green/10">
            <Sprout className="w-8 h-8 text-agri-green" />
          </div>

          <h1 className="text-2xl font-rajdhani font-bold tracking-wider glow-text uppercase">
            AgriGenome
            <span className="text-agri-green">-Nexus</span>
          </h1>

        </div>


        {/* NAVIGATION TABS */}

        <nav className="flex flex-wrap justify-center gap-2">

          {tabs.map((tab) => (

            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 relative
                ${
                  activeTab === tab.id
                    ? 'text-agri-green bg-agri-green/10 neon-border'
                    : 'text-gray-400 hover:text-[#e0ffe0] hover:bg-agri-green/5'
                }`}
            >

              {tab.label}

              {activeTab === tab.id && (

                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 border-b-2 border-agri-green rounded-lg"
                  initial={false}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                />

              )}

            </button>

          ))}

        </nav>

      </header>


      {/* ==================================
          MAIN CONTENT
      ================================== */}

      <main className="relative z-10 flex-grow p-6 overflow-y-auto">

        <AnimatePresence mode="wait">

          <motion.div
            key={activeTab}
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -20,
            }}
            transition={{
              duration: 0.3,
            }}
            className="max-w-7xl mx-auto h-full"
          >

            {ActiveComponent && <ActiveComponent />}

          </motion.div>

        </AnimatePresence>

      </main>

    </div>
  );
}

export default App;
