# 🚖 BharaDekhi — Dhaka Multi-Modal Transit Planner & Living City Simulator

[![Live Deployment](https://img.shields.io/badge/Production-Live%20on%20Vercel-blue?style=for-the-badge&logo=vercel)](https://bharadekhi.vercel.app/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?style=for-the-badge&logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Modern%20UI-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet.js-Geospatial%20Mapping-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres%20RLS-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)

> **BharaDekhi** (ভাড়া দেখি) is a production-grade, Dhaka-tailored multimodal transportation planning, fare estimation, and living city simulation web platform. It eliminates urban commuting uncertainty by bridging direct ride-hailing options (Bike, CNG, Car) with public transit networks (MRT Line 6 Metro Rail, Local City Buses, and first/last-mile feeder connections).

---

## 🔗 Live Application & Links

* 🌐 **Live Web Application:** [https://bharadekhi.vercel.app/](https://bharadekhi.vercel.app/)
* 👨‍💻 **Developer Portfolio:** [https://bharadekhi.vercel.app/about.html](https://bharadekhi.vercel.app/about.html)
* ❓ **Interactive FAQ & Help Center:** [https://bharadekhi.vercel.app/faq.html](https://bharadekhi.vercel.app/faq.html)
* 💼 **Developer LinkedIn:** [Amiyo Hasan](https://www.linkedin.com/in/amiyo-hasan-6729873a7/)
* 🐙 **GitHub Repository:** [https://github.com/AmiyoTheAnalyst/BharaDekhi](https://github.com/AmiyoTheAnalyst/BharaDekhi)

---

## 🏙️ Problem & Solution

Dhaka commuters face daily challenges with unpredictable ride-hailing surge spikes during monsoon storms and peak rush hours, fragmented public transit information, and lack of clarity on whether combining the Metro Rail with feeder rides (rickshaws, CNGs, bikes) is cheaper and faster than a direct ride. 

**BharaDekhi solves this** through an intuitive, two-screen single-page application that visualizes, calculates, and compares all practical travel options between any pickup and destination in Dhaka.

---

## 🌟 Key Features

### 1. 🌆 Screen 1: Living Dhaka Crossroads (2.5D Animated Intersection)
* **Dedicated City Showcase (`#/home`):** Welcomes commuters with a full-screen, responsive 2.5D miniature simulation of Dhaka's iconic Mirpur 10 Crossroads.
* **Proportional Responsive Scaling:** Natively scales down to fit any viewport (from 320px mobile screens to large desktop monitors) using aspect-ratio preservation without cropping any buildings, roads, or vehicles.
* **4-Phase Coordinated Signal Engine:** Simulates authentic Dhaka traffic signals (N-S Green ➔ N-S Yellow ➔ Pedestrians Crossing ➔ E-W Green ➔ E-W Yellow) with dynamic signal head lamps and live HUD status.
* **Autonomous Multi-Modal Traffic:** Autonomous Dhaka buses, private cars, CNG auto-rickshaws, motorbikes, and footed rickshaws that queue, stop at red halt bars, and accelerate smoothly on green.
* **Pedestrian Crossings & Metro Viaduct:** Pedestrians cross along zebra paths during red signals, beneath the elevated MRT Line 6 track with moving metro trains and Mirpur 10 Station.
* **Illuminated Dhaka Architecture:** Handcrafted skyline across all 4 quadrants (Mirpur Plaza, Bangla Tech, Sonali Jewelers, Dhaka Book Depot, Janata Pharmacy clinic, rooftop water tanks, and hazard beacons).
* **Seamless SPA Transition:** Floating bottom-right **"Plan Your Trip →"** CTA button guides users directly into the trip planning flow.

### 2. 🗺️ Screen 2: Dedicated Multi-Modal Trip Planner (`#/plan-trip`)
* **Flexible Geocoding:** Search locations, tap anywhere on the map, use HTML5 browser geolocation, or launch one-click corridor shortcuts (e.g., *Uttara ⇄ Motijheel*, *Mirpur 10 ⇄ Dhanmondi*).
* **OSRM Road Routing & Haversine Resiliency:** Computes driving polyline geometry and duration via OSRM, with a zero-downtime trigonometric Haversine fallback engine.
* **Animated Route Playback:** Smooth camera panning and vehicle marker tracking with heading angle rotation along real road paths.

### 3. 🚆 "More Ways to Travel" Public Transit Comparison Hub
* **Side-by-Side Public Transit Cards:** Metro Rail and Local Bus cards directly compare fares and travel durations against private ride options.
* **Total Route Fare Breakdown:** Computes the lowest total route fare by combining metro/bus ticket fares with first-mile and last-mile feeder rides.
* **Interactive Feeder Selector:** Select Rickshaw, CNG, Bike, or Car for station transfers, recalculating total costs and journey times in real time.
* **Synchronized Map Switcher:** Toggling public transit dynamically renders the MRT Line 6 track light-path, station hubs, and feeder connections on the Leaflet map.

### 4. ⚡ Weather Adaptation & Peak Surge Radar
* **Time-Aware Peak Surge Engine:** Calibrated rush-hour multiplier (1.4x – 2.2x) based on local Dhaka time (`Asia/Dhaka`: 8:30–10:30 AM, 5:00–8:00 PM).
* **Live Rain Detection:** Automatically polls the Open-Meteo Weather API for central Dhaka rain, dynamically applying an automated 30%–50% rain surge to ride and feeder fares while holding Metro fares constant.

### 5. 🎨 Refined Micro-Interactions & Accessibility
* **Fluid Card Transitions:** Subtle desktop hover lift (`transform: translateY(-2px)`), soft glow expansion, and smooth selection state interpolation.
* **Mobile Touch Optimization:** Hover states wrapped inside `@media (hover: hover) and (pointer: fine)` to prevent sticky hover states on touchscreens, coupled with clean `:active` scale feedback and zero tap-highlight boxes.
* **Zero-Layout-Shift Bilingual System:** Instant toggling between English and Bangla (`[data-en]`, `[data-bn]`) with exact font-size parity.
* **Dual Palette:** Dark navy transit theme and clean light theme with synchronized map tiles and `localStorage` persistence.

---

## 🛠️ Verified Technology Stack

| Domain | Technologies Used | Implementation Details |
| :--- | :--- | :--- |
| **Frontend Core** | Vanilla JavaScript (ES6+), HTML5 Semantic Layout, CSS Custom Properties | Pure client-side static architecture, 0 build dependencies |
| **Styling & Design** | [Tailwind CSS](https://tailwindcss.com/) (CDN), Glassmorphism, Conic Gradients | Custom dark mode selector, radial gradients, glowing borders |
| **Motion & 2.5D Simulation** | SVG Vectors, CSS `@keyframes`, SVG `<animateMotion>`, Canvas Particles | Mirpur 10 Crossroads, autonomous vehicle logic, beacon pulses |
| **Geospatial & Mapping** | [Leaflet.js](https://leafletjs.com/) (v1.9.4), OpenStreetMap Cartography | Themed tile sets, SVG vehicle markers, driving polylines |
| **Routing & Geocoding** | [OSRM Driving API](https://project-osrm.org/), Nominatim API, Haversine Engine | Turn-by-turn road geometry, reverse geocoding, fallback math |
| **External Feeds & Time** | [Open-Meteo Weather API](https://open-meteo.com/), `Asia/Dhaka` Clock Engine | Central Dhaka precipitation polling, rush-hour surge gauge |
| **Backend & Authentication** | [Supabase](https://supabase.com/) (`@supabase/supabase-js` v2), PostgreSQL | User authentication, session persistence, Row-Level Security (RLS) |
| **Architecture & DevOps** | Client-Side SPA Hash Routing (`#/home`, `#/plan-trip`), Git, GitHub, Vercel | Instant branch-driven automated CI/CD deployment |

---

## 📂 Repository Structure

```
commute-dhaka-web/
├── assets/
│   ├── bharadekhi-mark.svg           # Official BharaDekhi vector logo icon
│   └── dhaka-bus-routes.json         # Dhaka city bus corridor graph & stop database
├── supabase/
│   └── schema.sql                    # Supabase PostgreSQL schema, RLS policies & triggers
├── index.html                        # Main web application (Crossroads Animation, Planner, Map)
├── about.html                        # Developer portfolio & engineering skills matrix
├── faq.html                          # Interactive commuter FAQ accordion & help center
├── favicon.png                       # High-resolution web application favicon
├── robots.txt                        # Search engine indexing directives
├── sitemap.xml                       # XML Sitemap for search indexing
└── README.md                         # Project documentation
```

---

## 📐 Baseline Fare Calculation Models

| Transport Mode | Base Rate | Distance Rate | Estimated Speeds | Surge & Weather Modeling |
| :--- | :--- | :--- | :--- | :--- |
| **🏍️ Bike** | ৳30 | ৳14 / km | 18 km/h (Peak) / 24 km/h | 1.4x – 2.2x Rush hour · +30%–50% Rain uplift |
| **🛺 CNG Auto-Rickshaw** | ৳50 | ৳18 / km | 12 km/h (Peak) / 18 km/h | 1.4x – 2.2x Rush hour · +30%–50% Rain uplift |
| **🚗 Car (Sedan)** | ৳80 | ৳24 / km | 15 km/h (Peak) / 22 km/h | 1.4x – 2.2x Rush hour · +30%–50% Rain uplift |
| **🚲 Feeder Rickshaw** | ৳20 | ৳12 / km (round to ৳10) | 12 km/h | Peak adds ৳10 to upper bargaining limit; +30%–50% Rain |
| **🚇 MRT Line 6 Metro** | ৳20 min | ৳5 / km (max ৳100) | 2 min/station + 5 min wait | Fixed official fare matrix; 10% MRT Pass discount |
| **🚌 Local City Bus** | ৳10 min (Non-AC) | ৳2.45 / km | BRTA Draft Table | BRTA distance guidelines; unaffected by rain |

*All calculated fares and travel times are calibrated illustrative estimates engineered for urban travel comparison, and do not represent live quotes or verified operator charges.*

---

## 💻 Local Development Setup

Setup takes under 30 seconds with zero package installation required:

### 1. Clone the Repository
```bash
git clone https://github.com/AmiyoTheAnalyst/BharaDekhi.git
cd BharaDekhi
```

### 2. Start a Local Web Server
```bash
# Using Python 3:
python -m http.server 8000

# Or using Node.js:
npx serve .
```

### 3. Open in Browser
Visit **`http://localhost:8000`** in any modern web browser.

---

## ⚠️ Limitations & Calibration Notice

* **Illustrative Estimates:** Fare estimates reflect calibrated baseline algorithms representing Dhaka's prevailing rates and surge formulas; they do not query live proprietary ride-hailing APIs (Uber/Pathao) for locked quotes.
* **Simulated Animation:** The Mirpur 10 crossroads is an autonomous SVG traffic and pedestrian simulation; it is not hooked into municipal CCTV cameras.
* **Transit Scope:** MRT Line 6 (Uttara North to Motijheel) is fully implemented; additional lines will be integrated as Dhaka Mass Rapid Transit development progresses.

---

## 👨‍💻 Developer & Profile

**Amiyo Hasan**  
*Creator of BharaDekhi · Full-Stack Software Engineer & Web Developer*  
*Bachelor of Science in Computer Science & Engineering (B.Sc. CSE)*  
*BRAC University, Dhaka, Bangladesh*

* 🌐 **Portfolio Website:** [https://bharadekhi.vercel.app/about.html](https://bharadekhi.vercel.app/about.html)
* 💼 **LinkedIn Profile:** [https://www.linkedin.com/in/amiyo-hasan-6729873a7/](https://www.linkedin.com/in/amiyo-hasan-6729873a7/)
* 🐙 **GitHub:** [@AmiyoTheAnalyst](https://github.com/AmiyoTheAnalyst)
* 📧 **Email:** [amiyohasan23@gmail.com](mailto:amiyohasan23@gmail.com)

---

## 📄 License & Attribution

* **License:** Released for Dhaka commuters under standard open web practices.
* **Map Cartography:** © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors, [CartoDB](https://carto.com/).
* **Routing Services:** Powered by [Project OSRM](https://project-osrm.org/).
* **Weather Data:** Provided by [Open-Meteo.com](https://open-meteo.com/) under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
