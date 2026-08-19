// HTC 2026 Race Data
// Generated from HTC26 Handbook + 2025 Timing Sheet

const RACE_CONFIG = {
  year: 2026,
  startTime: "2026-08-28T05:35:00",
  teamName: "Hood to Coast 2026",
  totalDistance: 199.07,
  anticipatedFinishTime: "29:46:10", // HH:MM:SS from race start

  runners: [
    { id: 1, name: "Sarah Perrenoud-Hall", van: 1, defaultPace: { min: 11, sec: 30 } },
    { id: 2, name: "Blaize Hite", van: 1, defaultPace: { min: 7, sec: 14 } },
    { id: 3, name: "Kadeem Wilson", van: 1, defaultPace: { min: 10, sec: 3 } },
    { id: 4, name: "Hashim Hall", van: 1, defaultPace: { min: 11, sec: 40 } },
    { id: 5, name: "Lucas Diaz", van: 1, defaultPace: { min: 9, sec: 50 } },
    { id: 6, name: "Betsy Brooks", van: 1, defaultPace: { min: 10, sec: 30 } },
    { id: 7, name: "Blair Hite", van: 2, defaultPace: { min: 10, sec: 10 } },
    { id: 8, name: "Kyle Watkins", van: 2, defaultPace: { min: 9, sec: 39 } },
    { id: 9, name: "Katja Gluhr", van: 2, defaultPace: { min: 8, sec: 5 } },
    { id: 10, name: "Colleen Constant", van: 2, defaultPace: { min: 10, sec: 30 } },
    { id: 11, name: "Devin Kelly", van: 2, defaultPace: { min: 9, sec: 28 } },
    { id: 12, name: "Kimberly Watkins", van: 2, defaultPace: { min: 10, sec: 50 } }
  ],

  // Standard 12-person rotation: runner N runs legs N, N+12, N+24
  rotation: [1,2,3,4,5,6,7,8,9,10,11,12],

  legs: [
    {
      leg: 1, van: 1, runnerId: 1, distance: 6.26, difficulty: "VH",
      elevGain: 0, elevLoss: -2036, netElev: -2036,
      description: "Severe downhill on paved Timberline Road",
      exchangeAddress: "Near HWY 26 Shoulder & Government Camp, A Frame OR 97028",
      gps: { lat: 45.304771, lng: -121.759188 },
      notes: "Vans NOT allowed to stop on this leg. Run on RIGHT side of road.",
      noShade: false, gravel: false, quietZone: false, elevationChange: true
    },
    {
      leg: 2, van: 1, runnerId: 2, distance: 6.05, difficulty: "H",
      elevGain: 24, elevLoss: -1577, netElev: -1553,
      description: "Severe downhill through Government Camp on HWY 26",
      exchangeAddress: "Rd 35/HWY 26 Government Camp, OR 97028",
      gps: { lat: 45.307884, lng: -121.854509 },
      notes: "No stopping in truck escape ramp. No stopping on left side of HWY 26.",
      noShade: false, gravel: false, quietZone: false, elevationChange: true
    },
    {
      leg: 3, van: 1, runnerId: 3, distance: 4.08, difficulty: "E",
      elevGain: 7, elevLoss: -738, netElev: -731,
      description: "Gradual downhill into Rhododendron along Forest Service Roads",
      exchangeAddress: "9 Rd & Hwy 26, Rhododendron, OR 97049",
      gps: { lat: 45.334985, lng: -121.918987 },
      notes: "No stopping on left side of HWY 26.",
      noShade: false, gravel: false, quietZone: false, elevationChange: true
    },
    {
      leg: 4, van: 1, runnerId: 4, distance: 6.64, difficulty: "M",
      elevGain: 35, elevLoss: -543, netElev: -508,
      description: "Gradual downhill from Rhododendron along HWY 26",
      exchangeAddress: "Near East Sleepy Hollow Dr/HWY 26 Sandy, OR 97055",
      gps: { lat: 45.3777, lng: -122.039235 },
      notes: "No stopping on left side of HWY 26.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 5, van: 1, runnerId: 5, distance: 6.05, difficulty: "VH",
      elevGain: 421, elevLoss: -203, netElev: 218,
      description: "Long leg over very challenging rolling hills along Hwy 26",
      exchangeAddress: "SE Cherryville Drive/HWY 26 Sandy, OR 97055",
      gps: { lat: 45.366529, lng: -122.155008 },
      notes: "No stopping on left side of HWY 26. Team members must stay in van at Exch 5.",
      noShade: true, gravel: false, quietZone: false, elevationChange: true
    },
    {
      leg: 6, van: 1, runnerId: 6, distance: 7.10, difficulty: "H",
      elevGain: 163, elevLoss: -581, netElev: -418,
      description: "Challenging gains in elevation and gradual downhills along HWY 26",
      exchangeAddress: "Sandy High School 37400 Bell St, Sandy, OR 97055",
      gps: { lat: 45.405721, lng: -122.276866 },
      notes: "MAJOR VAN EXCHANGE. Van 1 parks south lot, Van 2 parks north lot.",
      noShade: false, gravel: false, quietZone: false, elevationChange: true,
      majorExchange: true
    },
    {
      leg: 7, van: 2, runnerId: 7, distance: 5.25, difficulty: "M",
      elevGain: 176, elevLoss: -292, netElev: -116,
      description: "Rolling hills along HWY 26 on paved shoulder and farm/country roads",
      exchangeAddress: "36225 SE Proctor Road Boring, OR 97009",
      gps: { lat: 45.453705, lng: -122.290537 },
      notes: "Run on LEFT side of road. Do not mark turns on roads.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 8, van: 2, runnerId: 8, distance: 6.00, difficulty: "M",
      elevGain: 140, elevLoss: -346, netElev: -206,
      description: "Downhill and rolling terrain along country roads",
      exchangeAddress: "27801 SE Dee St, Boring, OR 97009",
      gps: { lat: 45.43217, lng: -122.375395 },
      notes: "Beware sharp turns at Bluff Rd/352nd, Orient Drive/Compton Road.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 9, van: 2, runnerId: 9, distance: 5.38, difficulty: "M",
      elevGain: 38, elevLoss: -258, netElev: -220,
      description: "Long leg over relatively flat terrain on Springwater Trail",
      exchangeAddress: "Main City Park 219 S. Main Ave Gresham, OR 97030",
      gps: { lat: 45.495413, lng: -122.431662 },
      notes: "NO VAN ACCESS for 5.38 miles. Water NOT provided. Pack your own.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 10, van: 2, runnerId: 10, distance: 6.15, difficulty: "M",
      elevGain: 30, elevLoss: -129, netElev: -162,
      description: "Leg entirely along Springwater Trail with flat terrain",
      exchangeAddress: "5936 SE 111th Ave, Portland, OR 97266",
      gps: { lat: 45.478160, lng: -122.548594 },
      notes: "Limited van access. Water NOT provided. Pack your own.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 11, van: 2, runnerId: 11, distance: 3.92, difficulty: "E",
      elevGain: 12, elevLoss: -117, netElev: -105,
      description: "Leg on Springwater Trail with relatively rolling and flat terrain",
      exchangeAddress: "4401 SE Johnson Creek Blvd Portland, OR 97222",
      gps: { lat: 45.461816, lng: -122.617121 },
      notes: "HTC/Springwater Bike Patrol on trail in evening.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 12, van: 2, runnerId: 12, distance: 5.85, difficulty: "M",
      elevGain: 128, elevLoss: -189, netElev: -61,
      description: "Mostly flat with a few rolling hills, trail and paved city streets",
      exchangeAddress: "OMSI gravel lot at the end of SE 2nd Place, Portland 97214",
      gps: { lat: 45.504444, lng: -122.664167 },
      notes: "MAJOR VAN EXCHANGE (First Tech). HTC Merchandise sold here.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false,
      majorExchange: true
    },
    {
      leg: 13, van: 1, runnerId: 1, distance: 5.21, difficulty: "E",
      elevGain: 110, elevLoss: -118, netElev: -8,
      description: "Slight incline over Tilikum Crossing, flat along Willamette River",
      exchangeAddress: "3838 NW Front Ave, Portland, OR 97210",
      gps: { lat: 45.551924, lng: -122.715139 },
      notes: "Uneven ground sections. Vans do NOT follow course.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 14, van: 1, runnerId: 2, distance: 7.91, difficulty: "H",
      elevGain: 143, elevLoss: -154, netElev: -11,
      description: "Basically flat terrain along Front Ave / HWY 30 on paved shoulder",
      exchangeAddress: "Gillihan Layover Terrace Parking Lot, Portland, OR 97231",
      gps: { lat: 45.629822, lng: -122.815850 },
      notes: "Run on RIGHT side of road. No parking in paved lots.",
      noShade: true, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 15, van: 1, runnerId: 3, distance: 6.00, difficulty: "H",
      elevGain: 208, elevLoss: -183, netElev: 25,
      description: "Gently rolling terrain on paved shoulder along HWY 30",
      exchangeAddress: "Rocky Point Weigh Station Scappoose, OR",
      gps: { lat: 45.69497, lng: -122.871008 },
      notes: "VANS NOT ALLOWED TO STOP ON SHOULDER OF HWY 30.",
      noShade: true, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 16, van: 1, runnerId: 4, distance: 4.00, difficulty: "E",
      elevGain: 91, elevLoss: -109, netElev: -18,
      description: "Gently rolling terrain on paved shoulder along HWY 30",
      exchangeAddress: "Scappoose High School 33700 SE High School Way, Scappoose, OR 97056",
      gps: { lat: 45.749198, lng: -122.874359 },
      notes: "VANS NOT ALLOWED TO STOP ON SHOULDER OF HWY 30.",
      noShade: true, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 17, van: 1, runnerId: 5, distance: 5.32, difficulty: "M",
      elevGain: 82, elevLoss: -87, netElev: -5,
      description: "Basically flat terrain on paved shoulder along HWY 30",
      exchangeAddress: "Warren Baptist Church, 56799 Columbia River Hwy, Warren, OR 97053",
      gps: { lat: 45.819167, lng: -122.851389 },
      notes: "FUEL UP on this leg - last gas station before Seaside.",
      noShade: true, gravel: false, quietZone: false, elevationChange: false
    },
    {
      leg: 18, van: 1, runnerId: 6, distance: 4.15, difficulty: "H",
      elevGain: 335, elevLoss: -112, netElev: 223,
      description: "Flat and gradual uphill terrain on HWY 30 and paved backcountry roads",
      exchangeAddress: "Columbia Co. Fairgrounds 58892 Saulser Rd St. Helens, 97051",
      gps: { lat: 45.85055, lng: -122.872306 },
      notes: "MAJOR VAN EXCHANGE (Dave's Killer Bread). Quiet hours 10pm-7am. Tents allowed. Sleeping in designated areas only.",
      noShade: false, gravel: false, quietZone: true, elevationChange: true,
      majorExchange: true
    },
    {
      leg: 19, van: 2, runnerId: 7, distance: 5.89, difficulty: "VH",
      elevGain: 446, elevLoss: -305, netElev: 141,
      description: "Long leg over challenging up and down hills on paved backcountry roads",
      exchangeAddress: "30732 Pittsburgh Rd St. Helens, OR 97051",
      gps: { lat: 45.901569, lng: -122.93397 },
      notes: "NO CELL COVERAGE until after Leg 32. Only Van 2 allowed. No stopping within 1 mile of exchange.",
      noShade: false, gravel: false, quietZone: true, elevationChange: true,
      noCellCoverage: true
    },
    {
      leg: 20, van: 2, runnerId: 8, distance: 5.58, difficulty: "VH",
      elevGain: 912, elevLoss: -322, netElev: 590,
      description: "Very challenging up and downhills on partially paved and gravel roads",
      exchangeAddress: "9.75 mi on Pittsburgh Rd (near Janshaw Rd), St. Helens, 97051",
      gps: { lat: 45.890793, lng: -122.997456 },
      notes: "NO CELL COVERAGE. Gravel road - bring bandana for dust. Only Van 2 allowed.",
      noShade: false, gravel: true, quietZone: true, elevationChange: true,
      noCellCoverage: true
    },
    {
      leg: 21, van: 2, runnerId: 9, distance: 5.06, difficulty: "M",
      elevGain: 34, elevLoss: -249, netElev: -215,
      description: "Flat, slightly downhill terrain near a creek on gravel backcountry roads",
      exchangeAddress: "4.7 miles on Schaffer Rd, Vernonia, OR",
      gps: { lat: 45.945578, lng: -123.043629 },
      notes: "NO CELL COVERAGE. Gravel road - bring bandana. Only Van 2 allowed.",
      noShade: false, gravel: true, quietZone: true, elevationChange: false,
      noCellCoverage: true
    },
    {
      leg: 22, van: 2, runnerId: 10, distance: 6.82, difficulty: "H",
      elevGain: 436, elevLoss: -618, netElev: -182,
      description: "Gradual up and downhills on paved but narrow backcountry roads",
      exchangeAddress: "6.70 miles on Apiary Rd Vernonia, OR",
      gps: { lat: 45.949276, lng: -123.149365 },
      notes: "NO CELL COVERAGE. Fast moving non-race traffic possible. Only Van 2 allowed.",
      noShade: false, gravel: false, quietZone: true, elevationChange: true,
      noCellCoverage: true
    },
    {
      leg: 23, van: 2, runnerId: 11, distance: 4.16, difficulty: "E",
      elevGain: 142, elevLoss: -255, netElev: -113,
      description: "Basically flat terrain on narrow country roads with minimal shoulder",
      exchangeAddress: "67528 Nehalem HWY N, Vernonia, OR 97064",
      gps: { lat: 45.974329, lng: -123.198666 },
      notes: "NO CELL COVERAGE. Quiet hours 10pm-7am. Only Van 2 allowed.",
      noShade: false, gravel: false, quietZone: true, elevationChange: false,
      noCellCoverage: true
    },
    {
      leg: 24, van: 2, runnerId: 12, distance: 4.83, difficulty: "E",
      elevGain: 93, elevLoss: -94, netElev: -1,
      description: "Flat terrain along Nehalem River and through pastoral setting",
      exchangeAddress: "13950 HWY 202 Birkenfeld, OR 97016",
      gps: { lat: 46.002792, lng: -123.278399 },
      notes: "MAJOR VAN EXCHANGE. NO CELL COVERAGE. Tents allowed. Sleeping in designated areas only.",
      noShade: false, gravel: false, quietZone: true, elevationChange: false,
      noCellCoverage: true,
      majorExchange: true
    },
    {
      leg: 25, van: 1, runnerId: 1, distance: 3.80, difficulty: "E",
      elevGain: 105, elevLoss: -51, netElev: 54,
      description: "Gently rolling terrain (last 2 miles) on paved country roads",
      exchangeAddress: "11249 HWY 202 Birkenfeld, OR 97016",
      gps: { lat: 45.995729, lng: -123.334103 },
      notes: "NO CELL COVERAGE. Van 1 ONLY parking during high congestion.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false,
      noCellCoverage: true
    },
    {
      leg: 26, van: 1, runnerId: 2, distance: 5.65, difficulty: "H",
      elevGain: 320, elevLoss: -381, netElev: -61,
      description: "Beginning with gently rolling hills, long uphill, finishing downhill",
      exchangeAddress: "5.65 miles on HWY 202, Clatskanie, OR 97016",
      gps: { lat: 45.97556, lng: -123.416774 },
      notes: "NO CELL COVERAGE. Van 1 ONLY parking during high congestion.",
      noShade: false, gravel: false, quietZone: false, elevationChange: true,
      noCellCoverage: true
    },
    {
      leg: 27, van: 1, runnerId: 3, distance: 6.36, difficulty: "M",
      elevGain: 250, elevLoss: -276, netElev: -26,
      description: "Rolling hills on paved rural country road",
      exchangeAddress: "near 79156 HWY 202 Jewell, OR 97138",
      gps: { lat: 45.933928, lng: -123.5061 },
      notes: "NO CELL COVERAGE.",
      noShade: false, gravel: false, quietZone: true, elevationChange: false,
      noCellCoverage: true
    },
    {
      leg: 28, van: 1, runnerId: 4, distance: 3.83, difficulty: "E",
      elevGain: 236, elevLoss: -67, netElev: 169,
      description: "Gradual uphill on paved road. Narrow HWY with limited shoulder",
      exchangeAddress: "near Lee Wooden County Park Jewell, OR m.p. 25.3",
      gps: { lat: 45.954195, lng: -123.573884 },
      notes: "NO CELL COVERAGE. Van 1 ONLY. No stopping on highway - immediate DQ. Elk Preserve nearby.",
      noShade: false, gravel: false, quietZone: true, elevationChange: true,
      noCellCoverage: true
    },
    {
      leg: 29, van: 1, runnerId: 5, distance: 5.97, difficulty: "VH",
      elevGain: 602, elevLoss: -502, netElev: 100,
      description: "Very challenging up and downhills through winding wooded section of HWY 202",
      exchangeAddress: "m.p. 19.4 HWY 202 Astoria, OR 97103",
      gps: { lat: 46.020736, lng: -123.625101 },
      notes: "NO CELL COVERAGE. HIGH CONGESTION EXCHANGE. Walkie-talkies recommended. Parking 1/2 mile from exchange.",
      noShade: false, gravel: false, quietZone: false, elevationChange: true,
      noCellCoverage: true
    },
    {
      leg: 30, van: 1, runnerId: 6, distance: 5.32, difficulty: "M",
      elevGain: 230, elevLoss: -731, netElev: -501,
      description: "Gradual uphill and steep downhill on winding narrow back road",
      exchangeAddress: "87232 HWY 202 Astoria, OR 97103",
      gps: { lat: 46.065768, lng: -123.692707 },
      notes: "MAJOR VAN EXCHANGE. NO CELL COVERAGE. Sleeping fields available (no tents). CASH ONLY fundraiser.",
      noShade: false, gravel: false, quietZone: false, elevationChange: true,
      noCellCoverage: true,
      majorExchange: true
    },
    {
      leg: 31, van: 2, runnerId: 7, distance: 3.96, difficulty: "M",
      elevGain: 152, elevLoss: -296, netElev: -144,
      description: "Gradual hills on narrow paved back country road",
      exchangeAddress: "89386 HWY 202 Astoria, OR 97103",
      gps: { lat: 46.097719, lng: -123.749397 },
      notes: "NO CELL COVERAGE.",
      noShade: false, gravel: false, quietZone: true, elevationChange: false,
      noCellCoverage: true
    },
    {
      leg: 32, van: 2, runnerId: 8, distance: 4.20, difficulty: "M",
      elevGain: 191, elevLoss: -261, netElev: -70,
      description: "Basically flat terrain on narrow country roads around Young's River",
      exchangeAddress: "3.86 miles on Youngs River Rd. (from HWY 202) Olney, OR 97103",
      gps: { lat: 46.069758, lng: -123.787865 },
      notes: "Last leg with no cell coverage. VERY LIMITED parking. Only Van 2 allowed.",
      noShade: false, gravel: false, quietZone: false, elevationChange: false,
      noCellCoverage: true
    },
    {
      leg: 33, van: 2, runnerId: 9, distance: 7.72, difficulty: "H",
      elevGain: 243, elevLoss: -249, netElev: -6,
      description: "Rolling hills on narrow country roads",
      exchangeAddress: "92179 Lewis & Clark Rd Astoria, OR 97103",
      gps: { lat: 46.147492, lng: -123.846048 },
      notes: "Only Van 2 allowed. Water station at 3.67 miles.",
      noShade: false, gravel: false, quietZone: true, elevationChange: false
    },
    {
      leg: 34, van: 2, runnerId: 10, distance: 4.12, difficulty: "E",
      elevGain: 173, elevLoss: -140, netElev: 33,
      description: "Very short leg with gently rolling hills along paved country roads",
      exchangeAddress: "90886 Fort Clatsop Rd, Astoria, OR 97103",
      gps: { lat: 46.104487, lng: -123.866126 },
      notes: "Only Van 2 allowed.",
      noShade: true, gravel: false, quietZone: true, elevationChange: false
    },
    {
      leg: 35, van: 2, runnerId: 11, distance: 7.07, difficulty: "H",
      elevGain: 299, elevLoss: -87, netElev: 212,
      description: "Gently rolling terrain along a combination of paved and gravel roads",
      exchangeAddress: "86645 Lewis & Clark Rd, Astoria, OR 97103",
      gps: { lat: 46.007615, lng: -123.867294 },
      notes: "Only Van 2 allowed. Vans do NOT follow course. No littering on trail!",
      noShade: false, gravel: true, quietZone: true, elevationChange: false
    },
    {
      leg: 36, van: 2, runnerId: 12, distance: 5.03, difficulty: "M",
      elevGain: 123, elevLoss: -414, netElev: -291,
      description: "Trail section then challenging hills, finishes on sand at Broadway turnaround",
      exchangeAddress: "30 North Promenade, Seaside, OR 97138",
      gps: { lat: 45.993835, lng: -123.930111 },
      notes: "FINISH! Leg 36 racer MUST have bib with timing chip. Wait for crosswalk light at 12th Ave. Only Van 2 allowed.",
      noShade: false, gravel: true, quietZone: false, elevationChange: true
    }
  ]
};
