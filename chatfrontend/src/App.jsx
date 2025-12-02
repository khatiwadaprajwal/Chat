import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/auth/login";
import Signup from "./pages/auth/signup";
import VerifyOTP from "./pages/auth/verifyotp";
import SendOTP from "./pages/auth/sendotp";
import ResetPassword from "./pages/auth/forgotpassword";
import Chat from "./pages/chat";



const App = () => {
  return (
    <div className="app-container">
      <Router>
        <div className="main-content w-full">
          <Routes>
            <Route path="/" element={<  Login/>} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/verify-otp" element={<VerifyOTP />} />
            <Route path="/login" element={<Login />} />
            <Route path="/send-otp" element={<SendOTP />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/chat" element={<Chat />} />
            
          </Routes>
        </div>
      </Router>
    </div>
  );
};

export default App;
