import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Bhara dekhi | Dhaka Rickshaw, Bus, Metro & Ride Fare Estimator',
  description:
    'Bhara dekhi helps plan trips in Dhaka. Check accurate rickshaw fare estimation, local bus routes, metro rail (MRT-6) routes, and compare bike, CNG, and car fares in Uber and Pathao.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      {/* 
        CRITICAL FOR GSAP SCROLLTRIGGER & STICKY 3D CANVAS:
        Neither html nor body have overflow: hidden, allowing position: sticky
        and 400vh scroll choreography to operate smoothly without clipping.
      */}
      <body className="bg-slate-950 text-slate-100 min-h-screen antialiased overflow-x-hidden overflow-y-auto selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
