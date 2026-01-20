import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'

import './App.css'

function App() {
  const programs = [
    {
      id: 1,
      title: 'MSc in CS',
      description: 'An advanced program covering theoretical and practical aspects of computer science, including',
      deadline: '10th November 2025',
      resources: 5
    },
    {
      id: 2,
      title: 'MBA in eGovernance',
      description: 'This program focuses on the application of information technology in government',
      deadline: '15th November 2025',
      resources: 3
    },
    {
      id: 3,
      title: 'MSc in DS & AI',
      description: 'A comprehensive program that combines advanced data science techniques with artificial',
      deadline: '20th November 2025',
      resources: 3
    },
    {
      id: 4,
      title: 'MBA in IT',
      description: 'MBA in IT degree program combine the very best of general MBA programs with specialist',
      specializations: ['Business Analytics', 'Information Technology'],
      deadline: '10th November 2025',
      resources: 5
    },
    {
      id: 5,
      title: 'Master of DS & AI',
      description: 'A professional master\'s program designed for working professionals, focusing on practical applications',
      deadline: '5th November 2025',
      resources: 3
    }
  ];

  return (

    <Router>
      <Routes>
        <Route path="/" element={<HomePage programs={programs} />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </Router>

  )
}

export default App
