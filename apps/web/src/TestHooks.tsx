import { useState, useEffect } from 'react';

export default function TestHooks(): JSX.Element {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Hooks are working!');

  useEffect(() => {
    setMessage(`Count is: ${count}`);
  }, [count]);

  return (
    <div style={{ padding: 20, border: '2px solid green', margin: 10, borderRadius: 5 }}>
      <h3>🧪 React Hooks Test</h3>
      <p><strong>Status:</strong> {message}</p>
      <p><strong>Count:</strong> {count}</p>
      <button onClick={() => setCount(count + 1)} style={{ padding: '8px 16px', marginRight: '10px' }}>
        Increment
      </button>
      <button onClick={() => setCount(0)} style={{ padding: '8px 16px' }}>
        Reset
      </button>
    </div>
  );
}
