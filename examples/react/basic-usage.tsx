/**
 * Basic React usage example for AgentStack SDK
 */

import React from 'react';
import {
  AgentStackProvider,
  AgentStackLoading,
  AgentStackErrorBoundary,
  useAuth,
  usePayments,
  useCreatePayment
} from '@agentstack/react';

// ============================================================================
// App Component
// ============================================================================

function App() {
  return (
    <AgentStackErrorBoundary>
      <AgentStackProvider
        config={{
          baseUrl: 'https://api.agentstack.com',
          apiKey: 'your-api-key',
          projectId: 123,
          enableCaching: true,
          enableMetrics: true
        }}
        onError={(error) => {
          console.error('SDK Error:', error);
        }}
        onInitialized={(sdk) => {
          console.log('SDK Initialized:', sdk);
        }}
      >
        <AgentStackLoading fallback={<div>Loading AgentStack...</div>}>
          <Dashboard />
        </AgentStackLoading>
      </AgentStackProvider>
    </AgentStackErrorBoundary>
  );
}

// ============================================================================
// Dashboard Component
// ============================================================================

function Dashboard() {
  const { isAuthenticated, user, login, logout, loading } = useAuth();
  const { data: payments, loading: paymentsLoading } = usePayments();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <LoginForm onLogin={login} />;
  }

  return (
    <div>
      <header>
        <h1>Welcome, {user?.username}!</h1>
        <button onClick={() => logout()}>Logout</button>
      </header>
      
      <main>
        <PaymentsList payments={payments} loading={paymentsLoading} />
        <CreatePaymentForm />
      </main>
    </div>
  );
}

// ============================================================================
// Login Form Component
// ============================================================================

interface LoginFormProps {
  onLogin: (credentials: { email: string; password: string; projectId: number }) => void;
}

function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      email,
      password,
      projectId: 123
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>
      <div>
        <label>Email:</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit">Login</button>
    </form>
  );
}

// ============================================================================
// Payments List Component
// ============================================================================

interface PaymentsListProps {
  payments: any[] | null;
  loading: boolean;
}

function PaymentsList({ payments, loading }: PaymentsListProps) {
  if (loading) {
    return <div>Loading payments...</div>;
  }

  if (!payments || payments.length === 0) {
    return <div>No payments found</div>;
  }

  return (
    <div>
      <h2>Payments</h2>
      <ul>
        {payments.map((payment) => (
          <li key={payment.id}>
            <div>
              <strong>Amount:</strong> {payment.amount} {payment.currency}
            </div>
            <div>
              <strong>Status:</strong> {payment.status}
            </div>
            <div>
              <strong>Method:</strong> {payment.method}
            </div>
            <div>
              <strong>Created:</strong> {new Date(payment.createdAt).toLocaleDateString()}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// Create Payment Form Component
// ============================================================================

function CreatePaymentForm() {
  const { mutate: createPayment, loading, error } = useCreatePayment();
  const [amount, setAmount] = React.useState('');
  const [currency, setCurrency] = React.useState('USD');
  const [description, setDescription] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    createPayment({
      amount: parseFloat(amount),
      currency,
      method: 'card',
      description
    }).then(() => {
      // Reset form
      setAmount('');
      setDescription('');
    }).catch((err) => {
      console.error('Payment creation failed:', err);
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Payment</h2>
      
      {error && (
        <div style={{ color: 'red' }}>
          Error: {error.message}
        </div>
      )}
      
      <div>
        <label>Amount:</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label>Currency:</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
      
      <div>
        <label>Description:</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Payment'}
      </button>
    </form>
  );
}

export default App;
