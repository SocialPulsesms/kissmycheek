'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, 
  Search, 
  ChevronDown, 
  Check, 
  Globe, 
  Building2, 
  Navigation,
  Sparkles,
  X
} from 'lucide-react';
import { 
  NIGERIAN_STATES, 
  ALL_COUNTRIES, 
  getCitiesForState, 
  getStateForCity 
} from '@/lib/locationsData';

interface LocationPickerProps {
  value: string;
  onChange: (location: string) => void;
  required?: boolean;
  className?: string;
  error?: string;
}

export function LocationPicker({
  value,
  onChange,
  required = false,
  className = '',
  error
}: LocationPickerProps) {
  // Mode: 'nigeria' | 'international'
  const [countryMode, setCountryMode] = useState<'nigeria' | 'international'>('nigeria');
  
  // Nigeria state & city selections
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [specificArea, setSpecificArea] = useState<string>('');

  // International state & city selections
  const [selectedCountry, setSelectedCountry] = useState<string>('United Kingdom');
  const [selectedIntlCity, setSelectedIntlCity] = useState<string>('');

  // Direct Search Mode
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);

  // Parse initial value if provided
  useEffect(() => {
    if (!value) {
      setSelectedState('');
      setSelectedCity('');
      setSpecificArea('');
      return;
    }

    if (value.includes('Nigeria')) {
      setCountryMode('nigeria');
      // Try to deduce state
      const detectedState = getStateForCity(value);
      if (detectedState) {
        setSelectedState(detectedState);
      }
    } else {
      // Could be international
      const foundCountry = ALL_COUNTRIES.find(c => value.toLowerCase().includes(c.country.toLowerCase()));
      if (foundCountry && foundCountry.country !== 'Nigeria') {
        setCountryMode('international');
        setSelectedCountry(foundCountry.country);
      }
    }
  }, [value]);

  // Cities available for current selected Nigerian State
  const availableCities = useMemo(() => {
    if (!selectedState) return [];
    return getCitiesForState(selectedState);
  }, [selectedState]);

  // Cities available for current international country
  const availableIntlCities = useMemo(() => {
    const countryObj = ALL_COUNTRIES.find(c => c.country === selectedCountry);
    return countryObj ? countryObj.cities : [];
  }, [selectedCountry]);

  // Flat list of all Nigerian cities for search
  const filteredSearchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const results: { city: string; state: string }[] = [];

    for (const stateObj of NIGERIAN_STATES) {
      if (stateObj.state.toLowerCase().includes(q)) {
        // State matches
        stateObj.cities.forEach(c => results.push({ city: c, state: stateObj.state }));
      } else {
        // City matches
        stateObj.cities.forEach(c => {
          if (c.toLowerCase().includes(q)) {
            results.push({ city: c, state: stateObj.state });
          }
        });
      }
    }

    // Also check international
    for (const c of ALL_COUNTRIES) {
      if (c.country !== 'Nigeria') {
        c.cities.forEach(city => {
          if (city.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)) {
            results.push({ city: `${city}, ${c.country}`, state: 'Global' });
          }
        });
      }
    }

    return results.slice(0, 15);
  }, [searchQuery]);

  // Update parent when Nigeria selections change
  const handleNigeriaCitySelect = (city: string) => {
    setSelectedCity(city);
    if (!city) {
      if (selectedState) {
        onChange(`${selectedState}, Nigeria`);
      }
      return;
    }
    const finalStr = specificArea.trim() 
      ? `${specificArea.trim()}, ${city}, ${selectedState}, Nigeria`
      : `${city}, ${selectedState}, Nigeria`;
    onChange(finalStr);
  };

  const handleStateSelect = (state: string) => {
    setSelectedState(state);
    setSelectedCity('');
    setSpecificArea('');
    if (state) {
      onChange(`${state}, Nigeria`);
    } else {
      onChange('');
    }
  };

  const handleAreaBlur = () => {
    if (selectedCity && selectedState) {
      const finalStr = specificArea.trim() 
        ? `${specificArea.trim()}, ${selectedCity}, ${selectedState}, Nigeria`
        : `${selectedCity}, ${selectedState}, Nigeria`;
      onChange(finalStr);
    }
  };

  const handleIntlCitySelect = (city: string) => {
    setSelectedIntlCity(city);
    if (city && selectedCountry) {
      onChange(`${city}, ${selectedCountry}`);
    }
  };

  const handleSearchResultPick = (city: string, state: string) => {
    if (state === 'Global') {
      onChange(city);
    } else {
      setSelectedState(state);
      setSelectedCity(city);
      onChange(`${city}, ${state}, Nigeria`);
    }
    setSearchQuery('');
    setShowSearchDropdown(false);
  };

  const handleClearLocation = () => {
    setSelectedState('');
    setSelectedCity('');
    setSpecificArea('');
    setSelectedIntlCity('');
    setSearchQuery('');
    onChange('');
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Current Selection Status Banner */}
      {value ? (
        <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-amber-500/5 to-transparent border border-emerald-500/30 flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
                Primary Residence Set
              </span>
              <p className="text-xs font-semibold text-white truncate">
                {value}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearLocation}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"
            title="Change location"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2.5 text-amber-200 text-xs">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Please select your <strong>State and City</strong> below to set your primary residence.
          </span>
        </div>
      )}

      {/* Country Rail Toggle: Nigeria vs International */}
      <div className="flex p-1 rounded-full bg-black/60 border border-white/10">
        <button
          type="button"
          onClick={() => {
            setCountryMode('nigeria');
            if (value && !value.includes('Nigeria')) handleClearLocation();
          }}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            countryMode === 'nigeria'
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <span>🇳🇬</span> Nigeria (36 States + FCT)
        </button>
        <button
          type="button"
          onClick={() => {
            setCountryMode('international');
            if (value && value.includes('Nigeria')) handleClearLocation();
          }}
          className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            countryMode === 'international'
              ? 'bg-[#D4AF37] text-black shadow-md'
              : 'text-white/60 hover:text-white'
          }`}
        >
          <Globe className="w-3.5 h-3.5" /> International Metros
        </button>
      </div>

      {/* Quick Search Filter Across All 250+ Cities */}
      <div className="relative">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search any Nigerian city or state (e.g. Lekki, Maitama, GRA, Bodija, Asaba...)"
            value={searchQuery}
            onFocus={() => setShowSearchDropdown(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            className="w-full pl-9 pr-8 py-2 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs focus:border-[#D4AF37] focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setShowSearchDropdown(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Autocomplete Results */}
        {showSearchDropdown && filteredSearchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-[#0E0E14] border border-[#D4AF37]/40 rounded-2xl p-2 shadow-2xl max-h-56 overflow-y-auto divide-y divide-white/5">
            <div className="px-3 py-1 text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider">
              Select Matching Location:
            </div>
            {filteredSearchResults.map((res, i) => (
              <div
                key={i}
                onClick={() => handleSearchResultPick(res.city, res.state)}
                className="px-3 py-2 text-xs text-white hover:bg-white/10 rounded-xl cursor-pointer flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span className="font-medium">{res.city}</span>
                </div>
                <span className="text-[10px] text-white/50 px-2 py-0.5 rounded-full bg-white/5">
                  {res.state}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODE 1: NIGERIA (ALL 36 STATES + FCT ABUJA) */}
      {countryMode === 'nigeria' && (
        <div className="space-y-2.5 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* 1. STATE DROPDOWN */}
            <div>
              <label className="text-[11px] font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-[#D4AF37]" />
                1. Select State (36 States + FCT) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  value={selectedState}
                  onChange={(e) => handleStateSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/15 text-white text-xs focus:border-[#D4AF37] focus:outline-none appearance-none pr-8 cursor-pointer"
                >
                  <option value="">— Select Nigerian State —</option>
                  
                  {/* Top VIP Hubs First for Convenience */}
                  <optgroup label="⭐ Primary VIP Hubs">
                    <option value="Lagos">Lagos (Commercial Capital)</option>
                    <option value="FCT Abuja">FCT Abuja (Federal Capital)</option>
                    <option value="Rivers">Rivers (Port Harcourt)</option>
                    <option value="Enugu">Enugu (Coal City Hub)</option>
                    <option value="Oyo">Oyo (Ibadan)</option>
                    <option value="Delta">Delta (Asaba / Warri)</option>
                    <option value="Kano">Kano (Northern Commerce)</option>
                  </optgroup>

                  {/* All 36 States + FCT Alphabetical */}
                  <optgroup label="🏛️ All 36 States + FCT Abuja">
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s.state} value={s.state}>
                        {s.state} State ({s.cities.length} verified areas)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* 2. CITY / DISTRICT DROPDOWN */}
            <div>
              <label className="text-[11px] font-semibold text-white/80 mb-1 flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-[#D4AF37]" />
                2. Select City / Area <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <select
                  disabled={!selectedState}
                  value={selectedCity}
                  onChange={(e) => handleNigeriaCitySelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/15 text-white text-xs focus:border-[#D4AF37] focus:outline-none appearance-none pr-8 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedState ? `— Select City/Area in ${selectedState} —` : '— First Select State Above —'}
                  </option>
                  {availableCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* 3. SPECIFIC NEIGHBORHOOD / ESTATE (OPTIONAL REFINEMENT) */}
          {selectedCity && (
            <div className="pt-1 animate-fadeIn">
              <label className="text-[10px] text-white/60 mb-1 block">
                Specific Neighborhood, Estate, or Street (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Banana Island, Pinnock Beach, Osborne Phase 2, Old GRA..."
                value={specificArea}
                onChange={(e) => setSpecificArea(e.target.value)}
                onBlur={handleAreaBlur}
                className="w-full px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* MODE 2: INTERNATIONAL METROS */}
      {countryMode === 'international' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* COUNTRY */}
          <div>
            <label className="text-[11px] font-semibold text-white/80 mb-1 block">
              Country <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedIntlCity('');
                }}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/15 text-white text-xs focus:border-[#D4AF37] focus:outline-none appearance-none pr-8 cursor-pointer"
              >
                {ALL_COUNTRIES.filter(c => c.country !== 'Nigeria').map((c) => (
                  <option key={c.code} value={c.country}>
                    {c.flag} {c.country} ({c.region})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* CITY */}
          <div>
            <label className="text-[11px] font-semibold text-white/80 mb-1 block">
              City <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedIntlCity}
                onChange={(e) => handleIntlCitySelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/15 text-white text-xs focus:border-[#D4AF37] focus:outline-none appearance-none pr-8 cursor-pointer"
              >
                <option value="">— Select City in {selectedCountry} —</option>
                {availableIntlCities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-white/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {error && (
        <span className="text-[11px] text-rose-400 block mt-1">
          {error}
        </span>
      )}
    </div>
  );
}
