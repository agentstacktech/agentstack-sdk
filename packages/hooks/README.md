# @agentstack/hooks

**Languages:** [English (canonical)](README.en.md) · **Русский** (this file)

**Shared data hooks for AgentStack SDK - AI-First Design**

## 🤖 AI-First Philosophy

These hooks are designed for AI agents and AI-assisted development:
- **3-Second Rule**: AI understands hook purpose in 3 seconds
- **Type-Safe**: Full TypeScript inference
- **Self-Documenting**: JSDoc comments explain everything
- **Predictable**: Standard React Query pattern
- **Copy-Paste Ready**: Examples work immediately

## 📦 Installation

```bash
npm install @agentstack/hooks @tanstack/react-query
```

## 🚀 Quick Start

```typescript
import { useSecurityData } from '@agentstack/hooks';

function SecurityPage() {
  const { data, isLoading, error } = useSecurityData();
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {data.map(event => (
        <SecurityCard key={event.id} {...event} />
      ))}
    </div>
  );
}
```

## 📚 Available Hooks

### useSecurityData()

Fetch security events with filtering and auto-refresh.

```typescript
const { data, isLoading } = useSecurityData({
  filters: { severity: 'critical' },
  refreshInterval: 30000  // 30 seconds
});

// data: SecurityEvent[]
```

### useAuditData()

Fetch audit logs for compliance and tracking.

```typescript
const { data } = useAuditData({
  filters: { action: 'delete', resource_type: 'project' }
});

// data: AuditLog[]
```

### useAnalyticsData()

Fetch analytics metrics for dashboards.

```typescript
const { data } = useAnalyticsData({
  period: '7d'  // Last 7 days
});

// data: AnalyticsMetrics
// - totalUsers, activeUsers
// - totalProjects, activeProjects
// - apiCalls, errorRate
```

### useWalletData()

Fetch multi-currency wallets.

```typescript
const { data } = useWalletData({
  filters: { type: 'game', is_active: true }
});

// data: Wallet[]
// Each wallet has balances for multiple currencies
```

## 🎯 Hook Pattern

All hooks follow the same pattern:

```typescript
const {
  data,        // The actual data (never undefined)
  isLoading,   // Loading state
  error,       // Error state
  refetch      // Manual refetch function
} = useHook({
  filters,         // Optional filters
  refreshInterval, // Auto-refresh (ms)
  enabled,         // Enable/disable hook
  staleTime        // Cache duration
});
```

## 🔧 Options

### Common Options (all hooks)

```typescript
{
  refreshInterval?: number;  // Auto-refresh interval (default: 60000)
  enabled?: boolean;         // Enable hook (default: true)
  staleTime?: number;        // Cache duration (default: 300000)
}
```

### Hook-Specific Options

**useSecurityData:**
```typescript
{
  filters?: {
    severity?: 'low' | 'medium' | 'high' | 'critical';
    type?: 'login' | 'logout' | 'failed_login' | ...;
    user_id?: number;
    from_date?: string;
    to_date?: string;
  }
}
```

**useAuditData:**
```typescript
{
  filters?: {
    action?: 'create' | 'update' | 'delete' | 'read';
    resource_type?: 'user' | 'project' | 'session' | ...;
    user_id?: number;
    from_date?: string;
    to_date?: string;
  }
}
```

**useAnalyticsData:**
```typescript
{
  period?: '24h' | '7d' | '30d' | '90d' | 'all';
  project_id?: number;
}
```

**useWalletData:**
```typescript
{
  filters?: {
    type?: 'user' | 'agentpay' | 'game' | 'savings';
    is_active?: boolean;
    currency?: string;
  },
  user_id?: number;
}
```

## 📖 Type Definitions

All types are fully documented with JSDoc:

```typescript
import type { 
  SecurityEvent,
  AuditLog,
  AnalyticsMetrics,
  Wallet
} from '@agentstack/hooks';

// TypeScript shows full documentation on hover!
```

## 🎨 Example: Custom Dashboard

```typescript
import { 
  useSecurityData, 
  useAuditData, 
  useAnalyticsData 
} from '@agentstack/hooks';

function AdminDashboard() {
  const security = useSecurityData({ 
    filters: { severity: 'critical' } 
  });
  
  const audit = useAuditData({ 
    filters: { action: 'delete' } 
  });
  
  const analytics = useAnalyticsData({ 
    period: '7d' 
  });
  
  return (
    <div>
      <MetricsGrid data={analytics.data} />
      <SecurityAlerts data={security.data} />
      <AuditTimeline data={audit.data} />
    </div>
  );
}
```

## 🚀 Advanced: Custom UI

```typescript
function CustomSecurityDashboard() {
  const { data, isLoading, refetch } = useSecurityData();
  
  return (
    <div className="my-custom-layout">
      <button onClick={() => refetch()}>Refresh</button>
      
      <div className="grid">
        {data.map(event => (
          <MyCustomCard 
            key={event.id}
            severity={event.severity}
            type={event.type}
            details={event.details}
            timestamp={event.timestamp}
            onResolve={() => {/* handle */}}
          />
        ))}
      </div>
    </div>
  );
}
```

## 🤖 AI Usage Guide

**For AI Agents:**

1. **Import the hook:**
   ```typescript
   import { useSecurityData } from '@agentstack/hooks';
   ```

2. **Use in component:**
   ```typescript
   const { data, isLoading } = useSecurityData();
   ```

3. **TypeScript shows types automatically:**
   - `data` → `SecurityEvent[]`
   - `isLoading` → `boolean`
   - `error` → `Error | null`

4. **Render UI:**
   ```typescript
   return data.map(item => <Card {...item} />)
   ```

**AI understands this pattern in 3 seconds!**

## 📊 React Query Integration

All hooks use React Query internally:
- ✅ Automatic caching
- ✅ Background refetching
- ✅ Stale-while-revalidate
- ✅ Error retry logic
- ✅ Request deduplication

## 🔗 Links

- [AgentStack platform](https://agentstack.tech) · [Swagger](https://agentstack.tech/swagger)
- [React Query Docs](https://tanstack.com/query)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)

## 📄 License

MIT

