import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import WhiteboardPage from './pages/WhiteboardPage';
import { SocketProvider } from './components/providers/SocketProvider';

function App() {
  return (
    <SocketProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/whiteboard/:id" element={<WhiteboardPage />} />
        </Routes>
      </Router>
    </SocketProvider>
  );
}

export default App;