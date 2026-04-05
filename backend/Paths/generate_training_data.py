"""
generate_training_data_v2.py
Produces realistic synthetic data with overlapping distributions,
label noise, and ambiguous cases – so ML metrics are not perfect 1.0.

Run: python generate_training_data_v2.py
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
from faker import Faker

fake = Faker('en_IN')
np.random.seed(42)
random.seed(42)

# ============================================================
# 1. RISK MODEL DATA (10,000 rows) – with noise & overlap
# ============================================================
print("Generating risk_model_data.csv (overlapping distributions)...")

cities = ['Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad']
zones_per_city = 200
zone_ids = []
for city in cities:
    for i in range(zones_per_city):
        zone_ids.append(f"{city[:3].upper()}-{city[:2].upper()}{i:04d}")

n_risk = 10000
risk_data = []

def get_season(month):
    if month in [6,7,8,9]:
        return 'Monsoon'
    elif month in [10,11,12,1,2]:
        return 'Winter'
    else:
        return 'Summer'

def rainfall_by_season(season, city):
    # add random noise
    base = 0
    if season == 'Monsoon':
        base = np.random.gamma(shape=2, scale=10)
    elif season == 'Summer':
        base = np.random.exponential(scale=5)
    else:
        base = np.random.exponential(scale=2)
    if city == 'Mumbai':
        base *= 1.5
    elif city == 'Chennai':
        base *= 1.2
    noise = np.random.normal(0, 5)
    return max(0, base + noise)

def temperature_by_season(season, city):
    if season == 'Winter':
        base = np.random.normal(22, 5)
    elif season == 'Summer':
        base = np.random.normal(38, 6)
    else:
        base = np.random.normal(30, 4)
    if city in ['Delhi', 'Ahmedabad']:
        base += 3
    elif city in ['Bengaluru', 'Pune']:
        base -= 2
    noise = np.random.normal(0, 2)
    return max(15, min(48, base + noise))

def aqi_by_city_month(city, month):
    base = 80
    if city == 'Delhi' and month in [10,11,12,1,2]:
        base = np.random.normal(350, 80)
    elif city == 'Mumbai':
        base = np.random.normal(120, 40)
    elif city == 'Kolkata':
        base = np.random.normal(150, 50)
    else:
        base = np.random.normal(100, 30)
    noise = np.random.normal(0, 15)
    return max(30, min(500, base + noise))

for _ in range(n_risk):
    zone_id = random.choice(zone_ids)
    city = zone_id.split('-')[0].replace('MUM','Mumbai').replace('DEL','Delhi').replace('BEN','Bengaluru').replace('CHE','Chennai').replace('KOL','Kolkata').replace('HYD','Hyderabad').replace('PUN','Pune').replace('AHM','Ahmedabad')
    week_start = fake.date_between(start_date='-2y', end_date='today')
    month = week_start.month
    season = get_season(month)
    
    avg_rainfall = rainfall_by_season(season, city)
    max_temp = temperature_by_season(season, city)
    aqi_avg = aqi_by_city_month(city, month)
    aqi_max = aqi_avg + np.random.uniform(10, 50)
    civic_incidents = np.random.poisson(lam=0.2) if season != 'Monsoon' else np.random.poisson(lam=0.05)
    flood_zone_tier = np.random.choice([1,2,3,4,5], p=[0.2,0.25,0.3,0.15,0.1])
    
    # Target variables with added noise so they are not perfectly predictable
    p_weather = 0
    if avg_rainfall > 20:
        p_weather = min(0.9, 0.3 + (avg_rainfall-20)/100)
    elif max_temp > 42:
        p_weather = min(0.7, 0.2 + (max_temp-42)/20)
    else:
        p_weather = np.random.uniform(0, 0.2)
    p_weather += np.random.normal(0, 0.05)          # additive noise
    p_weather = np.clip(p_weather, 0, 1)
    
    p_civic = min(0.8, civic_incidents * 0.15 + np.random.uniform(0,0.1))
    p_civic += np.random.normal(0, 0.03)
    p_civic = np.clip(p_civic, 0, 1)
    
    p_pollution = min(0.9, (aqi_avg-100)/400 if aqi_avg>100 else 0) + np.random.uniform(0,0.05)
    p_pollution += np.random.normal(0, 0.04)
    p_pollution = np.clip(p_pollution, 0, 1)
    
    risk_data.append({
        'zone_id': zone_id,
        'city': city,
        'week_start_date': week_start,
        'month': month,
        'season': season,
        'avg_rainfall_mm_day': round(avg_rainfall, 2),
        'max_temp_c': round(max_temp, 1),
        'aqi_avg': round(aqi_avg, 1),
        'aqi_max': round(aqi_max, 1),
        'civic_incidents_count': civic_incidents,
        'flood_zone_tier': flood_zone_tier,
        'p_weather_actual': round(p_weather, 4),
        'p_civic_actual': round(p_civic, 4),
        'p_pollution_actual': round(p_pollution, 4)
    })

df_risk = pd.DataFrame(risk_data).drop_duplicates(subset=['zone_id', 'week_start_date'])
df_risk.to_csv('risk_model_data.csv', index=False)
print(f"Saved {len(df_risk)} rows to risk_model_data.csv")

# ============================================================
# 2. FRAUD MODEL DATA (10,000 rows) – overlapping distributions
# ============================================================
print("Generating fraud_model_data.csv (overlapping distributions)...")

trigger_types = ['heavy_rainfall', 'extreme_heat', 'civic_unrest', 'severe_pollution']
n_fraud = 10000
fraud_data = []

for i in range(n_fraud):
    claim_id = f"CLM{datetime.now().strftime('%Y%m%d')}{i:06d}"
    rider_id = f"RID{random.randint(10000,99999)}"
    trigger = random.choice(trigger_types)
    
    is_fraud_prob = np.random.uniform(0, 1)
    
    # duty_on_minutes: fraud tends low, legit can also be low
    if is_fraud_prob < 0.1:
        duty_on = np.random.exponential(scale=5)
    else:
        duty_on = np.random.gamma(shape=2, scale=30)
    duty_on = np.clip(duty_on, 0.5, 240)
    
    # orders_last_60min: fraud often zero, but sometimes 1-2; legit sometimes zero
    if is_fraud_prob < 0.1:
        orders = np.random.choice([0,0,0,1,2], p=[0.7,0.15,0.05,0.07,0.03])
    else:
        orders = np.random.poisson(lam=3)
        orders = min(orders, 10)
    
    # gps_accuracy: fraud can be too precise or noisy; legit varies by weather
    if is_fraud_prob < 0.1:
        gps_acc = np.random.choice([np.random.uniform(2,10), np.random.uniform(40,200)], p=[0.5,0.5])
    else:
        if trigger == 'heavy_rainfall':
            gps_acc = np.random.uniform(20, 150)
        else:
            gps_acc = np.random.uniform(8, 60)
    gps_acc = min(gps_acc, 200)
    
    # velocity: fraud often stationary, legit can be stuck
    if is_fraud_prob < 0.1:
        velocity = np.random.uniform(0, 15)
    else:
        velocity = np.random.gamma(shape=2, scale=15)
    velocity = min(velocity, 80)
    
    # jump distance: fraud teleports, legit can have glitches
    if is_fraud_prob < 0.1:
        jump = np.random.choice([np.random.uniform(5,20), np.random.uniform(0,2)], p=[0.8,0.2])
    else:
        jump = np.random.exponential(scale=1.5)
    jump = min(jump, 20)
    
    # co_claimants: fraud rings cause high counts; legit also high during city-wide event
    if is_fraud_prob < 0.1:
        co_claimants = np.random.poisson(lam=35)
    else:
        co_claimants = np.random.poisson(lam=8)
    co_claimants = min(co_claimants, 100)
    
    # z_score: fraud high, legit occasional high due to bad luck
    if is_fraud_prob < 0.1:
        z_score = np.random.normal(3, 0.8)
    else:
        z_score = np.random.normal(0, 1.2)
    
    # days_active: fraud often low, but some rings build history
    if is_fraud_prob < 0.1:
        days_active = np.random.choice([1,2,3,4,5,8,12], p=[0.3,0.25,0.2,0.1,0.05,0.05,0.05])
    else:
        days_active = np.random.randint(7, 30)
    
    is_fraud = 1 if is_fraud_prob < 0.1 else 0
    
    fraud_data.append({
        'claim_id': claim_id,
        'rider_id': rider_id,
        'trigger_type': trigger,
        'duty_on_minutes_before_trigger': round(duty_on, 1),
        'orders_last_60min': orders,
        'gps_accuracy_m': round(gps_acc, 1),
        'velocity_kmh_last_ping': round(velocity, 1),
        'gps_coordinate_jump_km': round(jump, 2),
        'co_claimants_same_event': co_claimants,
        'rider_claim_frequency_z_score': round(z_score, 2),
        'days_active_last_30': days_active,
        'is_fraud': is_fraud
    })

df_fraud = pd.DataFrame(fraud_data)
# Add 5% label noise
noise_mask = np.random.random(len(df_fraud)) < 0.05
df_fraud.loc[noise_mask, 'is_fraud'] = 1 - df_fraud.loc[noise_mask, 'is_fraud']
df_fraud = df_fraud.drop_duplicates(subset=['claim_id'])
df_fraud.to_csv('fraud_model_data.csv', index=False)
print(f"Saved {len(df_fraud)} rows to fraud_model_data.csv")

# ============================================================
# 3. ZONE CLUSTERING DATA (5,000 rows) – realistic noise
# ============================================================
print("Generating zone_clustering_data.csv...")

n_zones = 5000
zone_data = []
pin_ranges = {
    'Mumbai': (400001, 400104),
    'Delhi': (110001, 110096),
    'Bengaluru': (560001, 560103),
    'Chennai': (600001, 600130),
    'Kolkata': (700001, 700160),
    'Hyderabad': (500001, 500098),
    'Pune': (411001, 411062),
    'Ahmedabad': (380001, 380063)
}

for i in range(n_zones):
    city = random.choice(cities)
    zone_id = f"{city[:3].upper()}-ZN{i:05d}"
    lat = round(random.uniform(8.0, 37.0), 6)
    lng = round(random.uniform(68.0, 97.0), 6)
    pin_range = pin_ranges.get(city, (100000, 999999))
    pin_code = str(random.randint(pin_range[0], pin_range[1]))
    
    flood_history = np.random.uniform(0, 1)
    if city in ['Mumbai', 'Chennai', 'Kolkata']:
        flood_history *= 1.5
    flood_history = min(1.0, flood_history)
    
    avg_rainfall = np.random.gamma(shape=2, scale=15)
    if city in ['Mumbai']:
        avg_rainfall *= 1.8
    elif city in ['Delhi', 'Ahmedabad']:
        avg_rainfall *= 0.6
    avg_rainfall += np.random.normal(0, 10)
    avg_rainfall = max(0, avg_rainfall)
    
    avg_aqi = aqi_by_city_month(city, month=random.randint(1,12))
    civic_rate = np.random.exponential(scale=0.05) + np.random.normal(0, 0.01)
    civic_rate = max(0, civic_rate)
    claim_rate = np.random.beta(a=2, b=5) + np.random.normal(0, 0.03)
    claim_rate = np.clip(claim_rate, 0, 1)
    delivery_density = np.random.lognormal(mean=3, sigma=0.5) * np.random.uniform(0.8, 1.2)
    
    zone_data.append({
        'zone_id': zone_id,
        'city': city,
        'lat': lat,
        'lng': lng,
        'pin_code': pin_code,
        'flood_history_score': round(flood_history, 3),
        'avg_annual_rainfall_mm': round(avg_rainfall, 1),
        'avg_aqi_annual': round(avg_aqi, 1),
        'civic_incident_rate_annual': round(civic_rate, 4),
        'historical_claim_rate': round(claim_rate, 3),
        'avg_delivery_density': round(delivery_density, 2)
    })

df_zone = pd.DataFrame(zone_data).drop_duplicates(subset=['zone_id'])
df_zone.to_csv('zone_clustering_data.csv', index=False)
print(f"Saved {len(df_zone)} rows to zone_clustering_data.csv")

# ============================================================
# 4. NLP CLASSIFIER DATA (8,000 rows) – ambiguous & mislabeled
# ============================================================
print("Generating nlp_classifier_data.csv (ambiguous + label noise)...")

disruption_templates = [
    "Heavy rainfall of {rain}mm in {area} leads to waterlogging, Section 144 imposed.",
    "Curfew declared in {area} after communal clashes, all shops and restaurants closed.",
    "Bandh called by {group} in {area}, normal life disrupted.",
    "AQI crosses 450 in {area}, emergency measures activated.",
    "Cyclone {name} makes landfall, {area} receives red alert.",
    "Farmers protest blocks highways in {area}, markets shut.",
    "Power outage hits {area} for 6 hours, delivery services affected.",
    "Road blockade by activists in {area}, police advisory issued.",
    "Temperature soars to {temp}°C in {area}, heatwave declared.",
    "Landslide blocks arterial road in {area}, delivery partners stranded."
]

normal_templates = [
    "Traffic advisory issued for {area} due to marathon event.",
    "New restaurant opens in {area}, delivery zone expanded.",
    "Weather remains pleasant in {area}, high demand for deliveries.",
    "Local festival {festival} celebrated peacefully in {area}.",
    "Zomato launches new loyalty program for {area} riders.",
    "Police conduct routine checks in {area}, no disruptions reported.",
    "Construction work on {road} causes minor delays.",
    "RTO issues new guidelines for delivery partners in {area}.",
    "Food safety inspection conducted in {area} restaurants.",
    "Ride-hailing demand increases in {area} due to metro strike (resolved quickly)."
]

# Also create ambiguous texts that could be either disruption or normal
ambiguous_templates = [
    "Heavy traffic reported in {area} due to ongoing road work.",
    "Local authorities ask residents to stay indoors due to {reason}.",
    "{area} experiences intermittent connectivity issues, delivery times may vary.",
    "Minor scuffle reported in {area}, police present, normalcy restored.",
    "Weather alert issued for {area}, but no major impact expected."
]

areas = ['Andheri East', 'Dharavi', 'Bandra West', 'Powai', 'Goregaon', 'Koramangala', 'Indiranagar', 'Connaught Place', 'Saket', 'Salt Lake', 'Park Street', 'Jubilee Hills', 'Hitech City', 'Koregaon Park', 'Vastrapur']
groups = ['political party', 'student union', 'trader association', 'local residents']
names = ['Tauktae', 'Amphan', 'Yaas', 'Gulab', 'Shaheen']
reasons = ['unidentified odor', 'police drill', 'construction blast']

n_nlp = 8000
nlp_data = []

for i in range(n_nlp):
    # Decide if this example will be clear, ambiguous, or mislabeled
    r = random.random()
    if r < 0.7:   # clear case
        if random.random() < 0.5:
            label = "DISRUPTION"
            template = random.choice(disruption_templates)
        else:
            label = "NORMAL"
            template = random.choice(normal_templates)
    elif r < 0.85: # ambiguous (could be either)
        label = random.choice(["DISRUPTION", "NORMAL"])
        template = random.choice(ambiguous_templates)
        # fill with random values
        area = random.choice(areas)
        reason = random.choice(reasons)
        text = template.format(area=area, reason=reason)
        confidence = round(random.uniform(0.5, 0.85), 3)   # lower confidence for ambiguous
        nlp_data.append({'text': text, 'label': label, 'confidence': confidence})
        continue
    else:         # intentionally mislabeled (label noise)
        if random.random() < 0.5:
            label = "DISRUPTION"   # but we'll use a normal template
            template = random.choice(normal_templates)
        else:
            label = "NORMAL"       # but we'll use a disruption template
            template = random.choice(disruption_templates)
    
    # Fill template
    area = random.choice(areas)
    if '{rain}' in template:
        rain = random.randint(30, 150)
        text = template.format(rain=rain, area=area)
    elif '{temp}' in template:
        temp = random.randint(42, 48)
        text = template.format(temp=temp, area=area)
    elif '{name}' in template:
        name = random.choice(names)
        text = template.format(name=name, area=area)
    elif '{group}' in template:
        group = random.choice(groups)
        text = template.format(group=group, area=area)
    elif '{festival}' in template:
        festivals = ['Diwali', 'Holi', 'Eid', 'Christmas', 'Pongal']
        festival = random.choice(festivals)
        text = template.format(area=area, festival=festival)
    elif '{road}' in template:
        roads = ['Western Express Highway', 'NH48', 'MG Road', 'Brigade Road']
        road = random.choice(roads)
        text = template.format(area=area, road=road)
    else:
        text = template.format(area=area)
    
    # Confidence reflects ambiguity or mislabeling
    if r < 0.7:
        confidence = round(random.uniform(0.85, 1.0), 3)
    else:
        confidence = round(random.uniform(0.4, 0.84), 3)
    
    nlp_data.append({
        'text': text,
        'label': label,
        'confidence': confidence
    })

df_nlp = pd.DataFrame(nlp_data).drop_duplicates(subset=['text'])
df_nlp.to_csv('nlp_classifier_data.csv', index=False)
print(f"Saved {len(df_nlp)} rows to nlp_classifier_data.csv")

print("\nAll CSV files regenerated with overlapping distributions and label noise.")
print("Now re-train your models – metrics will no longer be perfect 1.0.")