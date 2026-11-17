import React, { useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import type { RevenueSeries } from '../types/marketplace';
import { formatMoney } from '../lib/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

interface RevenueChartProps {
  series: RevenueSeries;
  currencySymbol?: string;
  mode?: 'admin' | 'client' | 'freelancer';
  simpleData?: { labels: string[]; values: number[]; label: string };
}

type PeriodKey = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const RevenueChart: React.FC<RevenueChartProps> = ({
  series,
  currencySymbol = '$',
  mode = 'admin',
  simpleData,
}) => {
  const [period, setPeriod] = useState<PeriodKey>('monthly');

  if (simpleData) {
    const data = {
      labels: simpleData.labels,
      datasets: [
        {
          label: simpleData.label,
          data: simpleData.values,
          backgroundColor: 'rgba(56, 189, 248, 0.35)',
          borderColor: '#38bdf8',
          borderWidth: 1.5,
          borderRadius: 6,
        },
      ],
    };

    return (
      <div className="liquid-glass rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100">{simpleData.label}</h3>
            <p className="text-xs text-slate-400">Settled database activity</p>
          </div>
          <span className="font-mono text-sm font-medium text-sky-300 tabular-nums">
            {formatMoney(
              simpleData.values.reduce((a, b) => a + b, 0),
              currencySymbol
            )}
          </span>
        </div>
        <div className="h-60 w-full">
          <Bar
            data={data}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: {
                  backgroundColor: 'rgba(9, 14, 28, 0.95)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  ticks: { color: '#94a3b8', font: { size: 11 } },
                },
                y: {
                  grid: { color: 'rgba(255,255,255,0.06)' },
                  ticks: { color: '#94a3b8', font: { size: 11 } },
                },
              },
            }}
          />
        </div>
      </div>
    );
  }

  const active = series[period];
  const totalGross = active.gross.reduce((a, b) => a + b, 0);
  const totalCommission = active.commission.reduce((a, b) => a + b, 0);

  const chartData = {
    labels: active.labels,
    datasets: [
      {
        label: 'Gross Volume',
        data: active.gross,
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.14)',
        fill: true,
        tension: 0.35,
        pointRadius: 3.5,
        pointBackgroundColor: '#38bdf8',
      },
      {
        label: mode === 'admin' ? 'Platform Commission' : 'Net Settlement',
        data: active.commission,
        borderColor: '#818cf8',
        backgroundColor: 'rgba(129, 140, 248, 0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 3,
        pointBackgroundColor: '#818cf8',
      },
    ],
  };

  return (
    <div className="liquid-glass rounded-2xl p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-100">Revenue Analytics</h3>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="font-mono tabular-nums text-slate-200">
              Gross: {formatMoney(totalGross, currencySymbol)}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-sky-300">
              Platform Fee: {formatMoney(totalCommission, currencySymbol)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          {(['daily', 'weekly', 'monthly', 'yearly'] as PeriodKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={`whitespace-nowrap shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                period === key
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72 w-full">
        <Line
          data={chartData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: {
                labels: { color: '#cbd5e1', boxWidth: 10, font: { size: 12 } },
              },
              tooltip: {
                backgroundColor: 'rgba(9, 14, 28, 0.95)',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                titleColor: '#f8fafc',
                bodyColor: '#cbd5e1',
              },
            },
            scales: {
              x: {
                grid: { color: 'rgba(255,255,255,0.04)' },
                ticks: { color: '#94a3b8', font: { size: 11 } },
              },
              y: {
                grid: { color: 'rgba(255,255,255,0.06)' },
                ticks: {
                  color: '#94a3b8',
                  font: { size: 11 },
                  callback: (val) => `${currencySymbol}${val}`,
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
};
