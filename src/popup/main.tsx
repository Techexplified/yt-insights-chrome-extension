import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './Popup'
import './index.css' // Optional: if we want to add some base styles later, but inline styles in Popup are fine for MVP

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Popup />
    </React.StrictMode>,
)
