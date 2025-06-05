import { useState, useEffect } from "react";
import { SimpleAuth } from "./components/simple-auth";
import Dashboard from "@/pages/dashboard";

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated
    fetch('/api/user', { credentials: 'include' })
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        return null;
      })
      .then(userData => {
        setUser(userData);
        setIsLoading(false);
      })
      .catch(() => {
        setUser(null);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading Orient Medical ERP...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <SimpleAuth />;
  }

  return <Dashboard />;
}

export default App;
