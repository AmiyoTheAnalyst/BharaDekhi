'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ScrollTransitHero with SSR disabled for optimal Three.js & WebGL compatibility
const ScrollTransitHero = dynamic(() => import('@/components/ScrollTransitHero'), {
  ssr: false,
  loading: () => (
    <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        <span>Loading Bhara dekhi 3D Transit Story...</span>
      </div>
    </div>
  ),
});

export default function HomePage() {
  const [pickup, setPickup] = useState('Mirpur 10 Crossroads');
  const [dropoff, setDropoff] = useState('Motijheel Commercial Area');
  const [activeMode, setActiveMode] = useState('all');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* 1. 3D Scroll-Triggered Storytelling Hero Component at the very top */}
      <ScrollTransitHero />

      {/* 2. Main Route Planner & Fare Estimator Section (Target of the Hero CTA) */}
      <main
        id="planner"
        className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 space-y-8 scroll-mt-6"
      >
        {/* Top Section Header & Transit Status Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Dhaka Transit Network Active
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-1">
              Bhara dekhi Route &amp; Fare Planner
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Multi-modal journey optimization across Rickshaw, Bus, Metro Rail, and Rideshare.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold">
              Live Weather Calibrated
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
              Dhaka, Bangladesh
            </span>
          </div>
        </div>

        {/* Quick Corridor Starter Pills */}
        <div className="bg-slate-900/60 backdrop-blur-lg border border-slate-800/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1.5">
            ⚡ Popular Transit Corridors:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Uttara ⇄ Motijheel (MRT-6)', from: 'Uttara North Metro', to: 'Motijheel Metro' },
              { label: 'Mirpur 10 ⇄ Dhanmondi', from: 'Mirpur 10', to: 'Dhanmondi 27' },
              { label: 'Azimpur ⇄ Gulshan 1', from: 'Azimpur Bus Stand', to: 'Gulshan 1 Circle' },
              { label: 'Farmgate ⇄ Badda', from: 'Farmgate Ananda Cinema', to: 'Middle Badda' },
            ].map((route) => (
              <button
                key={route.label}
                type="button"
                onClick={() => {
                  setPickup(route.from);
                  setDropoff(route.to);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-300 hover:text-white border border-slate-700 hover:border-sky-500/50 font-medium transition active:scale-95 cursor-pointer shadow-sm"
              >
                {route.label}
              </button>
            ))}
          </div>
        </div>

        {/* Origin & Destination Inputs + Map View Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Route Setup & Transit Options */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📍 Trip Waypoints</span>
              </h3>

              {/* Pickup Input */}
              <div className="space-y-1.5">
                <label htmlFor="pickupInput" className="text-xs font-semibold text-slate-400">
                  Origin (Pickup Point)
                </label>
                <div className="relative">
                  <input
                    id="pickupInput"
                    type="text"
                    value={pickup}
                    onChange={(e) => setPickup(e.target.value)}
                    placeholder="Enter pickup location..."
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                  />
                  <span className="absolute right-3 top-3 text-xs text-emerald-400 font-bold">A</span>
                </div>
              </div>

              {/* Destination Input */}
              <div className="space-y-1.5">
                <label htmlFor="dropoffInput" className="text-xs font-semibold text-slate-400">
                  Destination (Dropoff Point)
                </label>
                <div className="relative">
                  <input
                    id="dropoffInput"
                    type="text"
                    value={dropoff}
                    onChange={(e) => setDropoff(e.target.value)}
                    placeholder="Enter destination..."
                    className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition"
                  />
                  <span className="absolute right-3 top-3 text-xs text-rose-400 font-bold">B</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition hover:shadow-blue-500/50 active:scale-98 cursor-pointer"
                >
                  Calculate Dhaka Fares →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const temp = pickup;
                    setPickup(dropoff);
                    setDropoff(temp);
                  }}
                  title="Swap Origin and Destination"
                  className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition active:scale-95 cursor-pointer"
                >
                  ⇅
                </button>
              </div>
            </div>

            {/* Weather Surge Info Banner */}
            <div className="bg-blue-950/40 border border-blue-500/30 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-2xl">🌦️</span>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-300">
                  Live Dhaka Weather Sync Active
                </h4>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Automatic peak hours and rain surge calibration active. Bhara dekhi dynamically weights rickshaw and ride-sharing fares based on real-time traffic density.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Leaflet Map Container & Route Preview */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 shadow-xl flex-1 flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🗺️ Interactive Route Map</span>
                </h3>
                <span className="text-xs font-medium text-slate-400">
                  Powered by Leaflet.js &amp; OSRM
                </span>
              </div>

              {/* Leaflet Map Mounting Target */}
              <div
                id="map"
                className="w-full h-80 sm:h-96 rounded-2xl bg-slate-950 border border-slate-800 relative overflow-hidden flex items-center justify-center"
              >
                <div className="text-center p-6 space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-lg">
                    🗺️
                  </div>
                  <p className="text-sm font-semibold text-white">Interactive Dhaka Route Planner Map</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Map markers for origin &amp; destination will initialize here. Clicks and gestures pass cleanly through from the hero canvas above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Modal Fare Comparison Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Multi-Modal Fare Comparison</h3>
            <span className="text-xs text-slate-400">Calibrated for Dhaka Standard Rates</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Rickshaw Card */}
            <div className="bg-slate-900/70 border border-amber-500/30 rounded-2xl p-5 space-y-3 hover:border-amber-500/60 transition shadow-lg">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300">
                  Rickshaw
                </span>
                <span className="text-xs text-slate-400">Hyper-Local</span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">৳ 40 – ৳ 65</p>
                <p className="text-xs text-slate-400 mt-1">Short hops &amp; neighborhood alleys</p>
              </div>
              <div className="text-[11px] text-amber-300/80 font-medium pt-2 border-t border-slate-800">
                Weather Surge: None (Clear)
              </div>
            </div>

            {/* BRTA Bus Card */}
            <div className="bg-slate-900/70 border border-teal-500/30 rounded-2xl p-5 space-y-3 hover:border-teal-500/60 transition shadow-lg">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-500/20 text-teal-300">
                  Local Bus
                </span>
                <span className="text-xs text-slate-400">BRTA Rates</span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">৳ 20 – ৳ 35</p>
                <p className="text-xs text-slate-400 mt-1">Direct corridor routes</p>
              </div>
              <div className="text-[11px] text-teal-300/80 font-medium pt-2 border-t border-slate-800">
                Standard BRTA Distance Fare
              </div>
            </div>

            {/* Metro Rail Card */}
            <div className="bg-slate-900/70 border border-emerald-500/30 rounded-2xl p-5 space-y-3 hover:border-emerald-500/60 transition shadow-lg">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300">
                  MRT Line-6
                </span>
                <span className="text-xs text-slate-400">Rapid Transit</span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">৳ 30 – ৳ 50</p>
                <p className="text-xs text-slate-400 mt-1">Zero traffic gridlock</p>
              </div>
              <div className="text-[11px] text-emerald-300/80 font-medium pt-2 border-t border-slate-800">
                Fixed Station-to-Station Fare
              </div>
            </div>

            {/* Rideshare (Bike / CNG / Car) Card */}
            <div className="bg-slate-900/70 border border-blue-500/30 rounded-2xl p-5 space-y-3 hover:border-blue-500/60 transition shadow-lg">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-500/20 text-blue-300">
                  Ride Comparison
                </span>
                <span className="text-xs text-slate-400">Pathao / Uber</span>
              </div>
              <div>
                <p className="text-2xl font-black text-white">৳ 120 – ৳ 260</p>
                <p className="text-xs text-slate-400 mt-1">Bike ৳120 • Car ৳260</p>
              </div>
              <div className="text-[11px] text-blue-300/80 font-medium pt-2 border-t border-slate-800">
                Real-Time Benchmark Range
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
