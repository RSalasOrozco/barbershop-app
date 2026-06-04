"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function StatsDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error:", error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500 dark:text-gray-400 text-lg">
          Cargando estadísticas...
        </div>
      </div>
    );
  }

  const citasPorDia = stats?.citasPorDia || [];
  const serviciosPopulares = stats?.serviciosPopulares || [];

  // Personalizar tooltip para modo oscuro
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-300 font-medium">
            {label}
          </p>
          <p className="text-blue-600 dark:text-blue-400 font-bold">
            Total: {payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Tarjetas de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Total Citas
          </h3>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">
            {stats?.metricas?.totalCitas || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Citas Hoy
          </h3>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {stats?.metricas?.citasHoy || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Ingresos Totales
          </h3>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            ${stats?.metricas?.ingresosTotales?.toLocaleString() || 0}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">
            Clientes Activos
          </h3>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {stats?.metricas?.clientesActivos || 0}
          </p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de líneas */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            📈 Citas por Día (Últimos 7 días)
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={citasPorDia}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="fecha"
                  stroke="#9ca3af"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: "currentColor" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: "currentColor" }}
                  formatter={(value) => (
                    <span className="text-gray-700 dark:text-gray-300">
                      {value}
                    </span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#0088FE"
                  strokeWidth={2}
                  dot={{ fill: "#0088FE" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de pastel */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            🥧 Servicios Más Populares
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={serviciosPopulares}
                  dataKey="total"
                  nameKey="servicio"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={true}
                >
                  {serviciosPopulares.map((entry: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de barras */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-100 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
            📊 Popularidad de Servicios
          </h3>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={serviciosPopulares}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#e5e7eb"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="servicio"
                  stroke="#9ca3af"
                  tick={{ fill: "currentColor" }}
                />
                <YAxis stroke="#9ca3af" tick={{ fill: "currentColor" }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ color: "currentColor" }}
                  formatter={(value) => (
                    <span className="text-gray-700 dark:text-gray-300">
                      {value}
                    </span>
                  )}
                />
                <Bar dataKey="total" fill="#00C49F" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
