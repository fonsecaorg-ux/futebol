import React from 'react'
import { createRoot } from 'react-dom/client'
import ScoutPredict from './components/ScoutPredict'

import './styles.css'

const App = () => (
  <div>
    <ScoutPredict />
  </div>
)

createRoot(document.getElementById('root')).render(<App />)
