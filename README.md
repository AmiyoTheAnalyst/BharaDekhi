# 🚖 CommuteHub Dhaka

An interactive web-based transit route planner and ride-sharing fare estimator tailored for commuters in Dhaka, Bangladesh. CommuteHub Dhaka calculates road distances and travel times across major transit hubs, models local peak-hour traffic surge conditions, and provides a multi-app launcher bridge for **Uber**, **Pathao**, and **inDrive**.

---

## 🌟 Features

* **Interactive Dhaka Map:** Leaflet.js map layer powered by OpenStreetMap, mapping high-traffic hubs across Dhaka (Azimpur, BRAC University Merul Badda, Dhanmondi 27, Gulshan 1, Mirpur 10, Motijheel).
* **Live Road Distance & Travel Duration:** Calculates driving distances and trip duration using the public Open Source Routing Machine (OSRM) API, backed by an algorithmic Haversine fallback engine.
* **Dhaka Rush-Hour Surge Engine:** Evaluates Bangladesh Standard Time (BST) dynamically to detect standard morning (8:30 AM – 10:30 AM) and evening (5:30 PM – 8:30 PM) Dhaka traffic congestion, featuring a real-time manual simulation toggle.
* **Multi-Modal Fare Estimation:** Calibrated baseline rate heuristics for:
  * 🏍️ **Bike** (Base: ৳30 | ৳14/km)
  * 🛺 **CNG Auto-Rickshaw** (Base: ৳50 | ৳18/km)
  * 🚗 **Sedan Car** (Base: ৳80 | ৳24/km)
* **Unified Ride-Sharing Bridge:**
  * **Uber:** Uses official universal deep-linking (`m.uber.com/ul/`) with pre-pinned pickup and drop-off coordinates.
  * **Pathao:** Copies destination coordinates directly to system clipboard and dispatches the Pathao client.
  * **inDrive:** Calculates an optimal peer-to-peer suggested bid discount (~12% below standard baseline) and copies the offer for quick bidding.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Modern Vanilla JavaScript (ES6+)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (CDN)
* **Map & Geodata:** [Leaflet.js](https://leafletjs.com/) with OpenStreetMap tiles
* **Routing API:** [OSRM (Open Source Routing Machine)](https://project-osrm.org/)
* **Icons:** [Lucide Icons](https://lucide.dev/)
* **Deployment & CI/CD:** Netlify

---

## 🚀 Running Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/AmiyoTheAnalyst/commute-dhaka-web.git](https://github.com/AmiyoTheAnalyst/commute-dhaka-web.git)
   cd commute-dhaka-web
