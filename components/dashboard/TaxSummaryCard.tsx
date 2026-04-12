// SolTax AU - Tax Summary Card Component
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatAUD } from '@/lib/utils/formatters';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

interface TaxSummaryCardProps {
  title: string;
  value: number;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  icon?: 'currency' | 'percent' | 'trending-up' | 'trending-down';
  prefix?: string;
  suffix?: string;
}

export function TaxSummaryCard({
  title,
  value,
  description,
  trend,
  trendValue,
  icon = 'currency',
  prefix,
  suffix,
}: TaxSummaryCardProps) {
  const iconComponents = {
    currency: <DollarSign className="h-4 w-4 text-gray-500" />,
    percent: <Percent className="h-4 w-4 text-gray-500" />,
    'trending-up': <TrendingUp className="h-4 w-4 text-green-500" />,
    'trending-down': <TrendingDown className="h-4 w-4 text-red-500" />,
  };

  const formatValue = () => {
    if (icon === 'percent') {
      return `${(value * 100).toFixed(2)}%`;
    }
    return `${prefix || ''}${formatAUD(value)}${suffix || ''}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        {icon && iconComponents[icon]}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue()}</div>
        {description && (
          <CardDescription className="mt-1">
            {description}
          </CardDescription>
        )}
        {trend && trendValue !== undefined && (
          <div className="flex items-center mt-2 text-xs">
            {trend === 'up' && (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            )}
            {trend === 'down' && (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            )}
            <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : ''}>
              {trendValue > 0 ? '+' : ''}{trendValue}%
            </span>
            <span className="text-gray-500 ml-1">vs last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Pre-configured summary cards for common tax metrics
export function IncomeCard({ income, change }: { income: number; change?: number }) {
  return (
    <TaxSummaryCard
      title="Total Income"
      value={income}
      description="Assessable income from crypto"
      trend={change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral'}
      trendValue={Math.abs(change || 0)}
      icon="currency"
    />
  );
}

export function CapitalGainsCard({ gains, losses, change }: { gains: number; losses: number; change?: number }) {
  const netGain = gains - losses;

  return (
    <TaxSummaryCard
      title="Net Capital Gain"
      value={netGain}
      description={`Gains: ${formatAUD(gains)}, Losses: ${formatAUD(losses)}`}
      trend={netGain > 0 ? 'up' : netGain < 0 ? 'down' : 'neutral'}
      trendValue={Math.abs(change || 0)}
      icon={netGain >= 0 ? 'trending-up' : 'trending-down'}
    />
  );
}

export function TaxPayableCard({ tax, effectiveRate }: { tax: number; effectiveRate: number }) {
  return (
    <TaxSummaryCard
      title="Estimated Tax Payable"
      value={tax}
      description={`Effective rate: ${(effectiveRate * 100).toFixed(1)}%`}
      icon="percent"
      suffix=""
    />
  );
}
