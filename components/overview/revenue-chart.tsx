'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface RevenueChartProps {
  data: Array<{ month: string; revenue: number }>
}

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="oklch(0.623 0.214 259.815)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="oklch(0.623 0.214 259.815)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 8%)" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'oklch(0.708 0 0)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'oklch(0.708 0 0)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `€${v}`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'oklch(0.205 0 0)',
            border: '1px solid oklch(1 0 0 / 10%)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'oklch(0.985 0 0)',
          }}
          formatter={(value) => [`€${value ?? 0}`, 'Prihod']}
          labelStyle={{ color: 'oklch(0.708 0 0)', marginBottom: 4 }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="oklch(0.623 0.214 259.815)"
          strokeWidth={2}
          fill="url(#revenueGrad)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
