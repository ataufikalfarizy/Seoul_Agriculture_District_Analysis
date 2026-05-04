## 📊 Methodology
This project was developed as part of an **Information Systems** research focus on data visualization and spatial analysis. It utilizes advanced filtering logic to categorize industrial sectors and identifies proximity-based synergies that contribute to Seoul's economic density.

---

## 🤝 Contributing
Contributions are welcome! If you have suggestions for new features (like heatmaps or real-time traffic integration), feel free to open an issue or submit a pull request.

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Developed with ❤️ by an Aspiring Data Professional.*

---

### **Tips Tambahan untuk GitHub:**
1.  **Screenshots:** Pastikan kamu mengambil *screenshot* terbaru setelah revisi "garis putus-putus" dan "sidebar tutup-buka" selesai, lalu unggah ke folder `assets` di GitHub agar README-nya terlihat semakin menarik.
2.  **About Section:** Di sebelah kanan halaman GitHub, jangan lupa isi bagian *About* dengan deskripsi singkat dan *tags* seperti `#webgis`, `#leafletjs`,Tentu, ini adalah draf **README.md** yang dirancang secara profesional, terstruktur, dan menonjolkan kecanggihan teknis proyek WebGIS kamu. File ini siap untuk langsung di-*copy-paste* ke repositori GitHub.

---

# 🏙️ Seoul Industry Insight: Advanced WebGIS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Leaflet](https://img.shields.io/badge/Library-Leaflet.js-green)](https://leafletjs.com/)
[![Turf.js](https://img.shields.io/badge/Analysis-Turf.js-orange)](https://turfjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Style-Tailwind_CSS-38B2AC)](https://tailwindcss.com/)

An aesthetic and high-performance WebGIS application designed to analyze industrial density and spatial synergy across **Seoul, South Korea**. Built with a focus on modern UI/UX, this tool provides deep insights into why Seoul's industrial zones are strategically clustered.

![Project Preview](image_9b7ab2.png)
*(Note: Replace this with your actual screenshot once uploaded to GitHub)*

---

## ✨ Key Features

*   **Dynamic Industrial Clustering:** Efficiently handles thousands of data points using `Leaflet.markercluster` to prevent visual clutter.
*   **Proximity Analysis Engine:** Integrated with **Turf.js** to calculate and visualize industrial relationships within a 500m radius in real-time.
*   **Smart Geometry Styling:** 
    *   **Points:** High-contrast markers for industrial hubs.
    *   **Land Use:** Elegant, dashed-line polygons that trace land boundaries without distracting from the primary data.
*   **Modern Adaptive UI:** 
    *   **Glassmorphism Sidebar:** A collapsible control panel for filtering categories.
    *   **Dual Mode:** Seamless transition between **Light Mode** (Positron) and **Dark Mode** (Dark Matter).
    *   **Responsive Design:** Fully optimized for mobile, tablet, and desktop viewing.

## 🛠️ Tech Stack

*   **Mapping:** [Leaflet.js](https://leafletjs.com/)
*   **Spatial Logic:** [Turf.js](https://turfjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Icons:** [Lucide Icons](https://lucide.dev/)
*   **Data Format:** GeoJSON (Seoul Geographical Data)

## 🚀 Getting Started

### Prerequisites
To avoid CORS issues when loading the GeoJSON data, please run this project through a local server.

### Installation
1. **Clone the repository:**
   ```bash
   git clone [https://github.com/yourusername/seoul-webgis.git](https://github.com/yourusername/seoul-webgis.git)

