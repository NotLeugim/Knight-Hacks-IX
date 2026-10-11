"""
backend/app/services/plant_impacts.py

Engineering evaluation service analyzing weather effects on power plant safety and operations.
Supported plant types:
- natural_gas (Combined Cycle / Peaking Natural Gas)
- nuclear (Nuclear Power Facility)
- solar (Utility Photovoltaic Solar)
- wind (Utility Wind Turbine Farm)
- battery_storage (Battery Energy Storage System - BESS)

All thresholds are maintained in a single documented config as typical values.
Every reason is explicitly tagged with a source attribution label.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

VALID_PLANT_TYPES = {
    "natural_gas",
    "nuclear",
    "solar",
    "wind",
    "battery_storage",
}

# ---------------------------------------------------------------------------
# Documented Configuration of Typical Engineering Thresholds
# ---------------------------------------------------------------------------
PLANT_IMPACT_CONFIG: dict[str, Any] = {
    "sources": {
        "equipment": "Typical value; varies by equipment",
        "engineering": "General engineering knowledge",
        "nws": "National Weather Service alert",
    },
    "safety": {
        "thunderstorm_codes": [95, 96, 97, 98, 99],
        "wind_gust_warning_ms": 25.0,  # ~56 mph
        "wind_gust_watch_ms": 17.0,    # ~38 mph
        "heavy_rain_watch_mmh": 7.6,   # Standard AMS heavy rain definition
        "extreme_heat_warning_c": 40.0,
        "high_heat_watch_c": 35.0,
        "freezing_watch_c": 0.0,
        "extreme_cold_warning_c": -10.0,
    },
    "natural_gas": {
        "rating_ambient_temp_c": 15.0,  # ISO 3977 rating temperature
        "derate_pct_per_deg_c": 0.7,    # 0.5% - 0.9% typical for combustion turbines
        "extreme_cold_freeze_c": -5.0,
    },
    "solar": {
        "stc_temp_c": 25.0,               # Standard Test Conditions temperature
        "temp_coeff_pct_per_c": 0.4,      # 0.3% - 0.5% typical for crystalline silicon
        "stc_radiation_wm2": 1000.0,      # Peak solar irradiance benchmark
        "hail_codes": [96, 99],
        "snow_codes": [71, 73, 75, 77, 85, 86],
    },
    "wind": {
        "cut_in_speed_ms": 3.0,     # Typical turbine cut-in
        "rated_speed_ms": 12.0,     # Typical rated output wind speed
        "cut_out_speed_ms": 25.0,   # Typical shutdown to prevent mechanical damage
        "icing_temp_c": 0.0,
        "icing_humidity_pct": 90.0,
    },
    "battery_storage": {
        "heat_watch_c": 35.0,
        "heat_warning_c": 40.0,
        "cold_watch_c": 0.0,
    },
}


def _evaluate_common_safety(
    temp: float,
    gust: float,
    precip: float,
    weather_code: int,
    alerts: list[dict[str, Any]],
) -> tuple[str, list[dict[str, str]], list[str]]:
    """
    Evaluates baseline outdoor safety risks applicable across all plant types.
    Returns (highest_level, reasons_with_source, recommended_actions).
    Levels: "Normal" -> "Watch" -> "Warning"
    """
    safety = PLANT_IMPACT_CONFIG["safety"]
    sources = PLANT_IMPACT_CONFIG["sources"]

    level = "Normal"
    reasons: list[dict[str, str]] = []
    actions: list[str] = []

    def raise_level(new_lvl: str) -> None:
        nonlocal level
        if new_lvl == "Warning":
            level = "Warning"
        elif new_lvl == "Watch" and level != "Warning":
            level = "Watch"

    # 1. Thunderstorms & Lightning (Codes 95-99)
    if weather_code in safety["thunderstorm_codes"]:
        raise_level("Warning")
        reasons.append(
            {
                "text": "Thunderstorm activity detected: severe lightning hazard for outdoor personnel and exposed electrical equipment.",
                "source": sources["engineering"],
            }
        )
        actions.append("Suspend outdoor yard maintenance and seek indoor shelter until storm passes.")

    # 2. Wind Gusts
    if gust >= safety["wind_gust_warning_ms"]:
        raise_level("Warning")
        reasons.append(
            {
                "text": f"Severe wind gusts ({gust:.1f} m/s): high hazard of structural damage and flying debris.",
                "source": sources["equipment"],
            }
        )
        actions.append("Secure loose equipment in yard and halt crane or elevated work.")
    elif gust >= safety["wind_gust_watch_ms"]:
        raise_level("Watch")
        reasons.append(
            {
                "text": f"Strong wind gusts ({gust:.1f} m/s): elevated hazard for outdoor elevated operations.",
                "source": sources["equipment"],
            }
        )
        actions.append("Monitor high-profile yard structures and secure light material.")

    # 3. Heavy Rain
    if precip >= safety["heavy_rain_watch_mmh"]:
        raise_level("Watch")
        reasons.append(
            {
                "text": f"Heavy rainfall ({precip:.1f} mm/h): elevated risk of local site flooding and drainage overflow.",
                "source": sources["engineering"],
            }
        )
        actions.append("Inspect drainage catchments, sumps, and basement pump readiness.")

    # 4. Temperature Extremes
    if temp >= safety["extreme_heat_warning_c"]:
        raise_level("Warning")
        reasons.append(
            {
                "text": f"Extreme ambient heat ({temp:.1f} °C): severe heat illness hazard for workers and heavy grid demand stress.",
                "source": sources["engineering"],
            }
        )
        actions.append("Enforce mandatory heat breaks, hydrate personnel, and monitor thermal systems.")
    elif temp >= safety["high_heat_watch_c"]:
        raise_level("Watch")
        reasons.append(
            {
                "text": f"High ambient heat ({temp:.1f} °C): worker heat stress risk and elevated equipment cooling load.",
                "source": sources["engineering"],
            }
        )
        actions.append("Schedule heavy physical tasks during cooler hours and verify chiller loops.")
    elif temp <= safety["extreme_cold_warning_c"]:
        raise_level("Warning")
        reasons.append(
            {
                "text": f"Extreme freezing conditions ({temp:.1f} °C): critical risk of line rupture, sensor freezing, and equipment trips.",
                "source": sources["engineering"],
            }
        )
        actions.append("Activate emergency heat tracing and inspect critical freeze-protection systems.")
    elif temp <= safety["freezing_watch_c"]:
        raise_level("Watch")
        reasons.append(
            {
                "text": f"Freezing temperatures ({temp:.1f} °C): potential ice formation on walkways, lines, and sensing instruments.",
                "source": sources["engineering"],
            }
        )
        actions.append("Apply anti-icing on outdoor walkways and verify heat tracing operation.")

    # 5. National Weather Service Active Alerts
    for alert in alerts:
        sev = alert.get("severity", "Unknown")
        headline = alert.get("headline") or alert.get("event") or "Active official alert"
        if sev in ("Extreme", "Severe"):
            raise_level("Warning")
            reasons.append(
                {
                    "text": f"NWS {sev} Alert: {headline}",
                    "source": sources["nws"],
                }
            )
            actions.append("Execute site emergency weather action plan and heed local official directives.")
        else:
            raise_level("Watch")
            reasons.append(
                {
                    "text": f"NWS Advisory: {headline}",
                    "source": sources["nws"],
                }
            )
            actions.append("Review relevant severe weather procedure checklist.")

    return level, reasons, actions


def evaluate_natural_gas_impact(hour_data: dict[str, Any], alerts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluates a Natural Gas plant (Combined Cycle / Simple Cycle).
    Output reduces by ~0.7% per °C above 15 °C due to air density drop.
    """
    cfg = PLANT_IMPACT_CONFIG["natural_gas"]
    sources = PLANT_IMPACT_CONFIG["sources"]

    temp = hour_data["temperature"]
    gust = hour_data["windGusts10m"]
    precip = hour_data["precipitation"]
    code = hour_data["weatherCode"]

    level, reasons, actions = _evaluate_common_safety(temp, gust, precip, code, alerts)

    # Output calculation
    base_rating = cfg["rating_ambient_temp_c"]  # 15.0 °C
    derate_rate = cfg["derate_pct_per_deg_c"]   # 0.7% per °C

    if temp > base_rating:
        delta = temp - base_rating
        loss_pct = round(delta * derate_rate, 1)
        output_pct = round(max(50.0, 100.0 - loss_pct), 1)
        reasons.append(
            {
                "text": f"Ambient temperature {temp:.1f} °C reduces intake air density. Output drops ~{loss_pct}% compared to 15 °C rating.",
                "source": sources["equipment"],
            }
        )
        actions.append("Plan for reduced peak generation capacity during afternoon heat peak.")
    else:
        output_pct = 100.0

    if output_pct >= 100.0:
        status_label = "Nominal capacity"
        output_label = f"Estimated output: ~{output_pct:.0f}% of rated (nominal)"
    elif output_pct >= 90.0:
        status_label = "Slightly reduced (warm air)"
        output_label = f"Estimated output: ~{output_pct:.0f}% of rated (warm air slightly lowers gas turbine output)"
    else:
        status_label = "Reduced in heat"
        output_label = f"Estimated output: ~{output_pct:.0f}% of rated (warm air lowers gas turbine output)"

    if temp <= 0.0:
        reasons.append(
            {
                "text": "Sub-freezing air poses risk of freeze-up in sensing lines, sample lines, and fuel valves.",
                "source": sources["engineering"],
            }
        )
        actions.append("Check freeze protection on gas metering stations and condensate drain lines.")

    return {
        "impactLevel": level,
        "status": status_label,
        "estimatedOutputPct": output_pct,
        "outputLabel": output_label,
        "reasons": reasons,
        "recommendedActions": list(dict.fromkeys(actions)),
    }


def evaluate_nuclear_impact(hour_data: dict[str, Any], alerts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluates a Nuclear plant.
    Nuclear output remains steady and independent of sun/wind.
    Key risks: heat/cooling limits, severe storms/high winds, and flooding.
    """
    sources = PLANT_IMPACT_CONFIG["sources"]

    temp = hour_data["temperature"]
    gust = hour_data["windGusts10m"]
    precip = hour_data["precipitation"]
    code = hour_data["weatherCode"]

    level, reasons, actions = _evaluate_common_safety(temp, gust, precip, code, alerts)

    # Specific nuclear engineering context
    if temp >= 35.0:
        reasons.append(
            {
                "text": f"High ambient temperature ({temp:.1f} °C) stresses condenser cooling. Ultimate Heat Sink (UHS) water temperature limits may constrain operations (water temp is not in this forecast).",
                "source": sources["engineering"],
            }
        )
        actions.append("Monitor cooling water intake temperatures and secondary heat exchanger delta-T.")

    if gust >= 20.0 or code in PLANT_IMPACT_CONFIG["safety"]["thunderstorm_codes"]:
        actions.append("Review severe storm and high-wind emergency operating procedures.")

    if precip >= 7.6:
        actions.append("Confirm flood barriers, sump pump status, and site drainage clearances.")

    # Standard nuclear recommended actions
    actions.append("Follow plant technical specifications and licensed operating procedures.")

    return {
        "impactLevel": level,
        "estimatedOutputPct": None,  # No output estimate for nuclear
        "outputLabel": "Output steady; base-load dispatch",
        "nuclearNotice": "Nuclear output is steady regardless of solar or wind. Main weather risks involve cooling water limits, severe storms, and site flooding. Water temperature is not in this atmospheric forecast.",
        "guidanceLabel": "General guidance; follow your plant's procedures and license requirements.",
        "reasons": reasons,
        "recommendedActions": list(dict.fromkeys(actions)),
    }


def evaluate_solar_impact(hour_data: dict[str, Any], alerts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluates Utility Photovoltaic Solar generation.
    Output index = (shortwave_radiation / 1000 W/m²) * (1 - 0.004 * (temp - 25))
    Zero at night.
    """
    cfg = PLANT_IMPACT_CONFIG["solar"]
    sources = PLANT_IMPACT_CONFIG["sources"]

    temp = hour_data["temperature"]
    gust = hour_data["windGusts10m"]
    precip = hour_data["precipitation"]
    code = hour_data["weatherCode"]
    rad = hour_data["shortwaveRadiation"]
    clouds = hour_data["cloudCover"]

    level, reasons, actions = _evaluate_common_safety(temp, gust, precip, code, alerts)

    # Hail damage Warning
    if code in cfg["hail_codes"]:
        level = "Warning"
        reasons.append(
            {
                "text": "Hailstorm hazard detected: potential physical impact damage to photovoltaic module glass.",
                "source": sources["equipment"],
            }
        )
        actions.append("Stow tracker panels in high-tilt hail-defense position if equipped.")

    # Snow cover Watch
    if code in cfg["snow_codes"]:
        if level != "Warning":
            level = "Watch"
        reasons.append(
            {
                "text": "Snowfall detected: snow accumulation on module surfaces drastically cuts solar output.",
                "source": sources["engineering"],
            }
        )
        actions.append("Plan for post-storm snow shedding or module clearing once precipitation ends.")

    # Solar output calculation
    if rad <= 0.0:
        output_index = 0.0
        reasons.append(
            {
                "text": "Night hours: zero solar irradiance.",
                "source": sources["engineering"],
            }
        )
    else:
        # Base index from irradiance (1000 W/m² STC)
        base_index = rad / cfg["stc_radiation_wm2"]
        # Thermal derating (-0.4% per °C above 25 °C)
        if temp > cfg["stc_temp_c"]:
            thermal_factor = 1.0 - ((temp - cfg["stc_temp_c"]) * (cfg["temp_coeff_pct_per_c"] / 100.0))
        else:
            thermal_factor = 1.0
        output_index = round(max(0.0, min(1.2, base_index * thermal_factor)), 2)

        if clouds > 70.0:
            reasons.append(
                {
                    "text": f"Dense cloud cover ({clouds:.0f}%) significantly reduces global horizontal irradiance.",
                    "source": sources["engineering"],
                }
            )
        elif rad >= 800.0 and temp <= 25.0:
            reasons.append(
                {
                    "text": f"Strong solar irradiance ({rad:.0f} W/m²) combined with cool temperatures maximizes PV efficiency.",
                    "source": sources["equipment"],
                }
            )
        elif temp >= 35.0:
            reasons.append(
                {
                    "text": f"High cell operating temperature ({temp:.1f} °C ambient) lowers silicon voltage and conversion efficiency.",
                    "source": sources["equipment"],
                }
            )

    return {
        "impactLevel": level,
        "estimatedOutputIndex": output_index,
        "outputLabel": f"Solar output index: {output_index:.2f} (0.0 to 1.0+)",
        "reasons": reasons,
        "recommendedActions": list(dict.fromkeys(actions)),
    }


def evaluate_wind_impact(hour_data: dict[str, Any], alerts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluates Wind Turbine generation using a standard power curve:
    - Speed < 3.0 m/s: 0.0 (cut-in)
    - Speed 3.0 to 12.0 m/s: cubic progression ((speed / 12) ** 3)
    - Speed 12.0 to 25.0 m/s: 1.0 (rated)
    - Speed > 25.0 m/s: 0.0 (high-wind cutout to protect against mechanical failure)
    """
    cfg = PLANT_IMPACT_CONFIG["wind"]
    sources = PLANT_IMPACT_CONFIG["sources"]

    temp = hour_data["temperature"]
    gust = hour_data["windGusts10m"]
    precip = hour_data["precipitation"]
    code = hour_data["weatherCode"]
    rh = hour_data["relativeHumidity"]
    # 80m hub height wind speed
    ws = hour_data["windSpeed80m"]

    level, reasons, actions = _evaluate_common_safety(temp, gust, precip, code, alerts)

    # Icing check
    if temp <= cfg["icing_temp_c"] and (precip > 0.0 or rh >= cfg["icing_humidity_pct"]):
        if level != "Warning":
            level = "Watch"
        reasons.append(
            {
                "text": f"Freezing temperature ({temp:.1f} °C) with moisture/high humidity creates blade icing hazard.",
                "source": sources["equipment"],
            }
        )
        actions.append("Enable blade de-icing heaters if available and inspect for aerodynamic imbalance.")

    # Wind power curve
    cut_in = cfg["cut_in_speed_ms"]    # 3.0
    rated = cfg["rated_speed_ms"]      # 12.0
    cut_out = cfg["cut_out_speed_ms"]  # 25.0

    if ws < cut_in:
        output_index = 0.0
        reasons.append(
            {
                "text": f"Wind speed at hub height ({ws:.1f} m/s) is below cut-in threshold ({cut_in:.1f} m/s). Turbines idle.",
                "source": sources["equipment"],
            }
        )
    elif ws > cut_out:
        output_index = 0.0
        level = "Warning"
        reasons.append(
            {
                "text": f"Extreme wind speed ({ws:.1f} m/s) exceeds cut-out limit ({cut_out:.1f} m/s). Turbines automatically shut down to prevent mechanical failure.",
                "source": sources["equipment"],
            }
        )
        actions.append("Confirm pitch-to-feather shutdown and monitor yaw brake systems.")
    elif ws >= rated:
        output_index = 1.0
        reasons.append(
            {
                "text": f"Wind speed ({ws:.1f} m/s) is at or above rated capacity ({rated:.1f} m/s). Generating full rated output.",
                "source": sources["equipment"],
            }
        )
    else:
        # Cubic curve between cut-in and rated
        output_index = round(min(1.0, (ws / rated) ** 3), 2)
        reasons.append(
            {
                "text": f"Wind speed at hub height is {ws:.1f} m/s; generating partial output (~{output_index * 100:.0f}% of rated).",
                "source": sources["equipment"],
            }
        )

    return {
        "impactLevel": level,
        "estimatedOutputIndex": output_index,
        "outputLabel": f"Wind output index: {output_index:.2f} (0.0 to 1.0)",
        "reasons": reasons,
        "recommendedActions": list(dict.fromkeys(actions)),
    }


def evaluate_battery_impact(hour_data: dict[str, Any], alerts: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluates Battery Energy Storage Systems (BESS).
    Thermal constraints govern degradation, round-trip efficiency, and cooling loads.
    """
    cfg = PLANT_IMPACT_CONFIG["battery_storage"]
    sources = PLANT_IMPACT_CONFIG["sources"]

    temp = hour_data["temperature"]
    gust = hour_data["windGusts10m"]
    precip = hour_data["precipitation"]
    code = hour_data["weatherCode"]

    level, reasons, actions = _evaluate_common_safety(temp, gust, precip, code, alerts)

    if temp >= cfg["heat_warning_c"]:
        level = "Warning"
        reasons.append(
            {
                "text": f"Extreme heat ({temp:.1f} °C): heavy HVAC cooling load, accelerated cell degradation risk, and potential C-rate throttling.",
                "source": sources["equipment"],
            }
        )
        actions.append("Verify enclosure HVAC chiller operations and inspect cell temperature spreads.")
    elif temp >= cfg["heat_watch_c"]:
        if level != "Warning":
            level = "Watch"
        reasons.append(
            {
                "text": f"High ambient heat ({temp:.1f} °C): increases auxiliary cooling power consumption.",
                "source": sources["equipment"],
            }
        )
        actions.append("Monitor container thermal margins ahead of peak discharge cycles.")
    elif temp <= cfg["cold_watch_c"]:
        if level != "Warning":
            level = "Watch"
        reasons.append(
            {
                "text": f"Freezing temperatures ({temp:.1f} °C): internal cell resistance rises; charging rates may be limited to avoid lithium plating.",
                "source": sources["equipment"],
            }
        )
        actions.append("Ensure enclosure thermal management maintains cell temperatures above charging limits.")

    if precip >= 7.6:
        actions.append("Check outdoor battery enclosure seals and perimeter trench drains for standing water.")

    reasons.append(
        {
            "text": "BESS operational role: ready to cover intermittency drops in solar or wind generation and provide rapid frequency response.",
            "source": sources["engineering"],
        }
    )

    return {
        "impactLevel": level,
        "estimatedOutputPct": None,
        "outputLabel": "Storage readiness nominal",
        "reasons": reasons,
        "recommendedActions": list(dict.fromkeys(actions)),
    }


def compute_plant_impacts(forecast_data: dict[str, Any], plant_type: str) -> dict[str, Any]:
    """
    Computes weather impacts for the current hour and all next 48 hours for the chosen plant type.
    """
    if plant_type not in VALID_PLANT_TYPES:
        raise ValueError(f"Invalid plant type: {plant_type}. Must be one of {sorted(VALID_PLANT_TYPES)}")

    hourly = forecast_data.get("hourly") or []
    alerts = forecast_data.get("alerts") or []

    if not hourly:
        raise ValueError("Forecast contains no hourly data points")

    current_hour = hourly[0]

    evaluators = {
        "natural_gas": evaluate_natural_gas_impact,
        "nuclear": evaluate_nuclear_impact,
        "solar": evaluate_solar_impact,
        "wind": evaluate_wind_impact,
        "battery_storage": evaluate_battery_impact,
    }

    evaluator = evaluators[plant_type]
    current_evaluation = evaluator(current_hour, alerts)

    # 48-hour timeline evaluation
    timeline: list[dict[str, Any]] = []
    for h in hourly[:48]:
        res = evaluator(h, alerts)
        timeline.append(
            {
                "time": h["time"],
                "temperature": h["temperature"],
                "impactLevel": res["impactLevel"],
                "estimatedOutputPct": res.get("estimatedOutputPct"),
                "estimatedOutputIndex": res.get("estimatedOutputIndex"),
            }
        )

    return {
        "plantType": plant_type,
        "location": forecast_data.get("location"),
        "fetchedAt": forecast_data.get("fetchedAt"),
        "current": current_evaluation,
        "timeline": timeline,
        "alerts": alerts,
        "configUsed": {
            "thresholds": PLANT_IMPACT_CONFIG["safety"],
            "note": "Typical values; vary by equipment and manufacturer specifications.",
        },
    }
