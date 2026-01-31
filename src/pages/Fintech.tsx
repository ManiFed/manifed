import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect to the main client menu - no subscription required
export default function Fintech() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/client", { replace: true });
  }, [navigate]);

  return null;
}
