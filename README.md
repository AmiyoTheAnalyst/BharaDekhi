# 🚖 BharaDekhi

An interactive web-based transit route planner and ride-sharing fare estimator tailored for commuters in Dhaka, Bangladesh. BharaDekhi calculates road distances and travel times across major transit hubs, models local peak-hour traffic surge conditions, and provides a multi-app launcher bridge for **Uber**, **Pathao**, and **inDrive**.

---

## 🌟 Features

* **Interactive Dhaka Map:** Leaflet.js map layer powered by OpenStreetMap, mapping high-traffic hubs across Dhaka (Azimpur, BRAC University Merul Badda, Dhanmondi 27, Gulshan 1, Mirpur 10, Motijheel).
* **Live Road Distance & Travel Duration:** Calculates driving distances and trip duration using the public Open Source Routing Machine (OSRM) API, backed by an algorithmic Haversine fallback engine.
* **Dhaka Rush-Hour Surge Engine:** Uses Dhaka local time (Asia/Dhaka) to automatically estimate morning (8:30 AM – 10:30 AM) and evening (5:30 PM – 8:30 PM) peak periods. The corner indicator and fares refresh automatically, with an optional manual simulation toggle.
* **Multi-Modal Fare Estimation:** Calibrated baseline rate heuristics for:
  * 🏍️ **Bike** (Base: ৳30 | ৳14/km)
  * 🛺 **CNG Auto-Rickshaw** (Base: ৳50 | ৳18/km)
  * 🚗 **Sedan Car** (Base: ৳80 | ৳24/km)
* **Side-by-Side Ride Comparison:** Compares estimated fares and approximate travel times for bike, CNG, and car, highlighting the lowest fare and shortest trip estimate.
* **Unified Ride-Sharing Bridge:**
  * **Uber:** Uses official universal deep-linking (`m.uber.com/ul/`) with pre-pinned pickup and drop-off coordinates.
  * **Pathao:** Opens the Pathao app with an app deep link and copies the destination to the clipboard.
  * **inDrive:** Opens the inDrive app with an app deep link and copies the destination and suggested bid for quick bidding.

---

## 🛠️ Tech Stack

* **Frontend:** HTML5, Modern Vanilla JavaScript (ES6+)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/) (CDN)
* **Map & Geodata:** [Leaflet.js](https://leafletjs.com/) with OpenStreetMap tiles
* **Routing API:** [OSRM (Open Source Routing Machine)](https://project-osrm.org/)
* **Icons:** [Lucide Icons](https://lucide.dev/)
* **Deployment & CI/CD:** Vercel
* **Authentication & shared accounts:** [Supabase](https://supabase.com/)

---

## ▲ Deploying on Vercel

1. Import this GitHub repository into Vercel and select the repository root as the project root.
2. Choose **Other** as the framework preset. This is a static HTML site; no build command is required, and `index.html` at the root is the homepage.
3. Deploy the project and assign `bharadekhi.vercel.app` as its production domain.
4. Keep `robots.txt` and `sitemap.xml` in the repository root. The sitemap and canonical URL already point to the production domain.

Vercel can deploy subsequent pushes to the connected production branch automatically.

---

## 🔐 Shared account setup

The application uses Supabase Auth for shared email/password accounts and a protected `profiles` table for the admin account list. Set up a Supabase project before enabling sign-up:

1. Create a Supabase project.
2. Open the project's **SQL Editor** and run [`supabase/schema.sql`](./supabase/schema.sql). This creates the profile table, account-sync triggers, and row-level security policies.
3. In the Supabase project settings, copy the **Project URL** and the **publishable key** (or legacy `anon` key). In `index.html`, replace `https://YOUR_PROJECT_REF.supabase.co` and `YOUR_SUPABASE_PUBLISHABLE_KEY` in the `SUPABASE_URL` and `SUPABASE_ANON_KEY` constants.
   - The publishable/anon key is intended for browser use. Never put a Supabase `service_role` or secret key in `index.html`.
4. In Supabase **Authentication → URL Configuration**, set the Site URL to `https://bharadekhi.vercel.app` and add `https://bharadekhi.vercel.app/**` (and the local development URL, if used) to the allowed redirect URLs so public sign-up and email confirmation work on the deployed site.
5. Create the admin account for `amiyohasan23@gmail.com` in Supabase **Authentication → Users** and confirm its email. The admin's verified email is checked by the database row-level security policy. The old browser-only demo admin password is no longer used.
6. Deploy the updated site. New signups will be stored centrally, and the verified admin can open **Registered Accounts** to see all profiles.

The browser only receives the public publishable/anon key. Database row-level security allows regular users to read only their own profile and allows the verified admin email above to read the account list. Passwords are managed by Supabase Auth and are never stored in the profile table.

Accounts previously stored in individual browsers are not automatically imported into Supabase. Each friend must create an account again on the updated site; this avoids transferring the old browser-stored passwords.

---

## 🚀 Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/AmiyoTheAnalyst/commute-dhaka-web.git
   cd commute-dhaka-web
