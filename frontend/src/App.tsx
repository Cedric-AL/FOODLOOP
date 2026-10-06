import { useEffect, useState } from 'react';
import { healthCheck } from './services/api';

function App() {
  const [status, setStatus] = useState<string>('Checking backend status...');

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await healthCheck();
        setStatus(`${response.data.status} - ${response.data.message}`);
      } catch (error) {
        setStatus('Backend connection unavailable. Please start the Spring Boot server.');
      }
    };

    fetchHealth();
  }, []);

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>FoodLoop</h1>
      <p>Initial frontend foundation for the FoodLoop project.</p>
      <p>{status}</p>
    </main>
  );
}

export default App;
