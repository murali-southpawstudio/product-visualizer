import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import ProductFamilies from './ProductFamilies.jsx'
import ProductFamilyDetail from './ProductFamilyDetail.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/brand/:brandName" element={<App />} />
        <Route path="/families" element={<ProductFamilies />} />
        <Route path="/families/:familyId" element={<ProductFamilies />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
)
