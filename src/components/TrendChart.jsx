import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceArea, Legend,
} from 'recharts';
import { pad } from '../utils';

const tick = (long) => (ms) => {
  const d = new Date(ms);
  return long ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
              : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function TrendChart({ data, cfg, long = false, height = 300 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid stroke="#e5eaf2" strokeDasharray="3 3" />
        <XAxis dataKey="ts" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={tick(long)} stroke="#94a3b8" fontSize={12} minTickGap={40} />
        <YAxis yAxisId="t" stroke="#2563eb" fontSize={12} unit="°" domain={['auto', 'auto']} />
        <YAxis yAxisId="h" orientation="right" stroke="#0d9488" fontSize={12} unit="%" domain={[0, 100]} />
        <Tooltip
          labelFormatter={(ms) => new Date(ms).toLocaleString()}
          formatter={(v, n) => (n === 'Temperature' ? [`${v} °C`, n] : [`${v} %`, n])}
          contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}
        />
        <Legend verticalAlign="top" height={28} iconType="plainline" />
        <ReferenceArea yAxisId="t" y1={cfg.tempMin} y2={cfg.tempMax} fill="#22c55e" fillOpacity={0.08} />
        <Line yAxisId="t" type="monotone" dataKey="temp" name="Temperature" stroke="#2563eb" strokeWidth={2.2} dot={false} isAnimationActive={false} />
        <Line yAxisId="h" type="monotone" dataKey="hum" name="Humidity" stroke="#0d9488" strokeWidth={1.8} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
