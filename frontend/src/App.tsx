function App() {
  const checkHealth = async () => {
    try {
      const response = await fetch('/api/health');
      
      if (response.ok) {
        alert('Backend is connected');
      } else {
        alert('No Backend');
      }
    } catch {
      alert('No Backend');
    }
  };

  return (
    <div className="container-fluid">
      <div className="text-center">
        <h1>User Management System</h1>

        <button 
            type="button"
            className="btn btn-primary"
            onClick={checkHealth}
          >
            Health check
          </button>
      </div>
    </div>
  );
}

export default App;