import type { Metadata } from "next";
import { WeatherDashboardView } from "@/components/weather/weather-dashboard-view";

export const metadata: Metadata = {
  title: "Weather Intelligence Dashboard | ATMOS",
  description:
    "Comprehensive meteorological telemetry, interactive 24-hour and 7-day weather forecasts, high-resolution charts, 2D radar maps, and historical ERA5 reanalysis.",
};

export default function DashboardPage() {
  return <WeatherDashboardView />;
}
