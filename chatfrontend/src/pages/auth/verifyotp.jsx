import React, { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const VerifyOTP = () => {
  const { setLoading, loading } = useContext(AuthContext);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/v1/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();

      if (res.ok) {
        navigate("/login");
      } else setError(data.message || "Invalid OTP");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-300 flex items-center justify-center px-4">
      <div className="bg-white shadow-xl rounded-2xl p-10 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">Verify OTP</h1>
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            placeholder="Enter OTP"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-green-400"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-2 rounded-lg text-white font-semibold ${
              loading ? "bg-green-300" : "bg-green-600 hover:bg-green-700"
            } transition`}
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyOTP;
