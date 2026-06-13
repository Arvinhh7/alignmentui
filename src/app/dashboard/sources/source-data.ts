export type SourceType =
  | 'Community'
  | 'Media'
  | 'Marketplace'
  | 'Retailer'
  | 'Affiliate/Aggregator'
  | 'Brand-owned'
  | 'Official/Edu'
  | 'Other'

export interface PublicSourceDomain {
  rank: number
  name: string
  domain: string
  type: SourceType
  citations: number
  share: number
  avgPosition: number
  topics: number
  sampleTopics: string[]
}

export const SOURCE_TYPES: SourceType[] = [
  'Community',
  'Media',
  'Marketplace',
  'Retailer',
  'Affiliate/Aggregator',
  'Brand-owned',
  'Official/Edu',
  'Other',
]

export const SOURCE_TYPE_STYLES: Record<SourceType, { badge: string; bar: string }> = {
  Community: { badge: 'bg-[#F0E9FF] text-[#7B4BDB] border-[#D8C9FF]', bar: 'bg-[#8B5CF6]' },
  Media: { badge: 'bg-[#E7F7FF] text-[#2486B8] border-[#BFEAFF]', bar: 'bg-[#38A7D8]' },
  Marketplace: { badge: 'bg-[#FFF1DE] text-[#C7661C] border-[#FFD7A3]', bar: 'bg-[#F59E0B]' },
  Retailer: { badge: 'bg-[#DFF8EE] text-[#2B8A62] border-[#BDEDD9]', bar: 'bg-[#34A879]' },
  'Affiliate/Aggregator': { badge: 'bg-[#FFF0E8] text-[#D15F2A] border-[#FFD0BA]', bar: 'bg-[#F97316]' },
  'Brand-owned': { badge: 'bg-[#FFE8F1] text-[#C73C70] border-[#FFC5DB]', bar: 'bg-[#EC4899]' },
  'Official/Edu': { badge: 'bg-[#DDF7F5] text-[#248D88] border-[#B9EAE5]', bar: 'bg-[#14B8A6]' },
  Other: { badge: 'bg-surface-muted text-ink-3 border-divider-light', bar: 'bg-ink-3' },
}

export const PUBLIC_SOURCE_DOMAINS: PublicSourceDomain[] = [
  { rank: 1, name: 'Reddit', domain: 'reddit.com', type: 'Community', citations: 282133, share: 27.7, avgPosition: 4.3, topics: 12907, sampleTopics: ['fast electric bikes', 'folding electric bikes', 'fat tire electric bikes'] },
  { rank: 2, name: 'TechRadar', domain: 'techradar.com', type: 'Media', citations: 15963, share: 1.6, avgPosition: 3.7, topics: 2767, sampleTopics: ['enclosed 3d printers', 'waterproof swimming headphones', 'printer brands and drivers'] },
  { rank: 3, name: "Tom's Guide", domain: 'tomsguide.com', type: 'Media', citations: 14627, share: 1.4, avgPosition: 3.4, topics: 2875, sampleTopics: ['outdoor security cameras', 'folding electric bikes', 'smart home hubs with screen'] },
  { rank: 4, name: 'Forbes', domain: 'forbes.com', type: 'Media', citations: 8576, share: 0.8, avgPosition: 2.3, topics: 2875, sampleTopics: ["women's electric shavers", 'intimate apparel', 'weighted silk eye masks'] },
  { rank: 5, name: 'Alibaba', domain: 'alibaba.com', type: 'Marketplace', citations: 8480, share: 0.8, avgPosition: 3.3, topics: 3371, sampleTopics: ['motorcycle engine parts', 'sustainable swimwear', 'mechanical music boxes'] },
  { rank: 6, name: 'Good Housekeeping', domain: 'goodhousekeeping.com', type: 'Media', citations: 7801, share: 0.8, avgPosition: 3.4, topics: 2487, sampleTopics: ['solar generators for home', 'leaf blowers with mulcher', 'leaf vacuums'] },
  { rank: 7, name: 'Allure', domain: 'allure.com', type: 'Media', citations: 6977, share: 0.7, avgPosition: 3.2, topics: 1482, sampleTopics: ['best lip stains', 'drugstore mascara', 'tubing mascara'] },
  { rank: 8, name: 'Walmart', domain: 'walmart.com', type: 'Retailer', citations: 6721, share: 0.7, avgPosition: 3.2, topics: 3242, sampleTopics: ['baby wipes for newborns', 'air mattresses with headboard', 'Winnie the Pooh onesies'] },
  { rank: 9, name: 'Vogue', domain: 'vogue.com', type: 'Media', citations: 6531, share: 0.6, avgPosition: 3.3, topics: 1905, sampleTopics: ['collagen hydrating face masks', 'organic aloe vera gel', 'LED light therapy masks'] },
  { rank: 10, name: 'Better Homes & Gardens', domain: 'bhg.com', type: 'Media', citations: 5808, share: 0.6, avgPosition: 3.9, topics: 2070, sampleTopics: ['waterproof outdoor rugs', 'cantilever umbrellas', 'outdoor rugs 9x12'] },
  { rank: 11, name: 'RedditRecs', domain: 'redditrecs.com', type: 'Affiliate/Aggregator', citations: 5714, share: 0.6, avgPosition: 3.9, topics: 1133, sampleTopics: ['automatic espresso machines', 'warm mist humidifiers', 'portable Bluetooth speakers'] },
  { rank: 12, name: 'GummySearch', domain: 'gummysearch.com', type: 'Brand-owned', citations: 5541, share: 0.5, avgPosition: 3.1, topics: 2206, sampleTopics: ['high pigment eyeshadow palette', 'plus size nursing bras', 'breast pumps with Medicaid'] },
  { rank: 13, name: 'WIRED', domain: 'wired.com', type: 'Media', citations: 5239, share: 0.5, avgPosition: 4.3, topics: 2200, sampleTopics: ['fat tire electric bikes', 'class 1 electric bikes', 'water filter pitchers'] },
  { rank: 14, name: 'Home Depot', domain: 'homedepot.com', type: 'Retailer', citations: 5200, share: 0.5, avgPosition: 3.4, topics: 1857, sampleTopics: ['gas ranges for propane', 'gas ranges with double ovens', 'white gas ranges'] },
  { rank: 15, name: 'Who What Wear', domain: 'whowhatwear.com', type: 'Media', citations: 4788, share: 0.5, avgPosition: 3.6, topics: 1473, sampleTopics: ['drugstore setting powder', 'setting powder for dry skin', 'lengthening mascara'] },
  { rank: 16, name: 'Real Simple', domain: 'realsimple.com', type: 'Media', citations: 4474, share: 0.4, avgPosition: 3.9, topics: 2108, sampleTopics: ['vintage cafe curtains', 'steam cleaners for grout and tile', 'faux fur blankets'] },
  { rank: 17, name: 'Consumer Reports', domain: 'consumerreports.org', type: 'Media', citations: 4395, share: 0.4, avgPosition: 2.4, topics: 1533, sampleTopics: ['best wall ovens', 'Keurig and K-Cup coffee makers', 'single wall ovens'] },
  { rank: 18, name: 'YouTube', domain: 'youtube.com', type: 'Community', citations: 4218, share: 0.4, avgPosition: 4.2, topics: 2554, sampleTopics: ['hearing aids for tinnitus', 'short throw projectors', 'setting powder for dry skin'] },
  { rank: 19, name: 'The Spruce', domain: 'thespruce.com', type: 'Media', citations: 4143, share: 0.4, avgPosition: 3.8, topics: 1668, sampleTopics: ['stair tread rugs', 'extension cables', 'water test kits for drinking water'] },
  { rank: 20, name: 'Bob Vila', domain: 'bobvila.com', type: 'Media', citations: 4017, share: 0.4, avgPosition: 2.6, topics: 1265, sampleTopics: ['ductless range hoods', 'handheld pool vacuums', 'evaporative humidifiers'] },
  { rank: 21, name: 'The Verge', domain: 'theverge.com', type: 'Media', citations: 3915, share: 0.4, avgPosition: 4.5, topics: 1461, sampleTopics: ['item and Bluetooth smart trackers', 'Bluetooth trackers for iPhone', 'Android smart trackers'] },
  { rank: 22, name: 'RTINGS', domain: 'rtings.com', type: 'Media', citations: 3849, share: 0.4, avgPosition: 2.2, topics: 740, sampleTopics: ['4 slice toasters', 'cordless stick vacuum cleaners', 'loud Bluetooth speakers'] },
  { rank: 23, name: "Macy's", domain: 'macys.com', type: 'Retailer', citations: 3479, share: 0.3, avgPosition: 3.1, topics: 1623, sampleTopics: ['holiday family pajamas', "women's pajama sets", 'family matching sleepwear'] },
  { rank: 24, name: 'Parents', domain: 'parents.com', type: 'Media', citations: 3434, share: 0.3, avgPosition: 4.2, topics: 741, sampleTopics: ['baby swaddles with safety', 'newborn baby bottles', 'swaddle baby sleep sacks'] },
  { rank: 25, name: 'Wikipedia', domain: 'wikipedia.org', type: 'Community', citations: 3348, share: 0.3, avgPosition: 3.3, topics: 1629, sampleTopics: ['collectible figure dolls', 'futuristic sci-fi 360 drones', 'Gee Bend quilts'] },
  { rank: 26, name: 'Android Central', domain: 'androidcentral.com', type: 'Media', citations: 3243, share: 0.3, avgPosition: 3.7, topics: 805, sampleTopics: ['smartwatches with Android', 'smartwatches for Android', 'Fossil smartwatches'] },
  { rank: 27, name: 'Smart Home Explorer', domain: 'smarthomeexplorer.com', type: 'Media', citations: 3243, share: 0.3, avgPosition: 2.9, topics: 784, sampleTopics: ['Smart Home Hubs for Google Home', 'smart home control panels', 'smart home sensors for garage doors'] },
  { rank: 28, name: 'Digital Camera World', domain: 'digitalcameraworld.com', type: 'Media', citations: 3157, share: 0.3, avgPosition: 3.5, topics: 572, sampleTopics: ['professional pocket cameras', 'beginner battery cameras', 'mirrorless battery cameras'] },
  { rank: 29, name: 'Redrec', domain: 'redrec.co', type: 'Affiliate/Aggregator', citations: 3013, share: 0.3, avgPosition: 3.0, topics: 1358, sampleTopics: ['electric scooters for adults', 'cordless stick vacuum cleaners', 'LED light therapy masks for sleep'] },
  { rank: 30, name: 'Ulta', domain: 'ulta.com', type: 'Retailer', citations: 2889, share: 0.3, avgPosition: 3.0, topics: 865, sampleTopics: ['talc-free setting powder', 'weighted silk eye masks', 'flat hair clips'] },
  { rank: 31, name: 'T3', domain: 't3.com', type: 'Media', citations: 2888, share: 0.3, avgPosition: 4.3, topics: 1265, sampleTopics: ['smart radiator thermostats', 'razors for manscaping', 'performance outdoor apparel'] },
  { rank: 32, name: 'New York Post', domain: 'nypost.com', type: 'Media', citations: 2857, share: 0.3, avgPosition: 4.6, topics: 1514, sampleTopics: ['high chairs with safety', 'residential poe security systems', 'high chairs for newborns'] },
  { rank: 33, name: 'Glamour', domain: 'glamour.com', type: 'Media', citations: 2798, share: 0.3, avgPosition: 3.5, topics: 1264, sampleTopics: ["women's electric shavers", 'infrared hair dryers', 'strapless shapewear'] },
  { rank: 34, name: 'People', domain: 'people.com', type: 'Media', citations: 2537, share: 0.2, avgPosition: 3.9, topics: 1267, sampleTopics: ['dog chew toys', 'dog food storage containers', 'outdoor blankets for patio'] },
  { rank: 35, name: 'wellwhisk.com', domain: 'wellwhisk.com', type: 'Other', citations: 2384, share: 0.2, avgPosition: 2.7, topics: 1108, sampleTopics: ['electric shavers for bald heads', 'heated silk eye masks', 'cat treats for kidney disease'] },
  { rank: 36, name: 'Target', domain: 'target.com', type: 'Retailer', citations: 2383, share: 0.2, avgPosition: 3.1, topics: 1286, sampleTopics: ['maternity clothing at Target', 'baby sleep sacks with sleeves', 'formula milk dispensers'] },
  { rank: 37, name: 'Best Buy', domain: 'bestbuy.com', type: 'Retailer', citations: 2297, share: 0.2, avgPosition: 3.2, topics: 1242, sampleTopics: ['36 inch gas cooktops', 'restaurant and food delivery gift cards', 'gift cards for online marketplaces'] },
  { rank: 38, name: 'OutdoorGearLab', domain: 'outdoorgearlab.com', type: 'Affiliate/Aggregator', citations: 2294, share: 0.2, avgPosition: 2.7, topics: 675, sampleTopics: ['class 3 electric bikes', "women's water shoes", "women's trekking poles"] },
  { rank: 39, name: 'arXiv', domain: 'arxiv.org', type: 'Official/Edu', citations: 2221, share: 0.2, avgPosition: 5.3, topics: 763, sampleTopics: ['AI humanoid robots', 'humanoid robots from China', 'sports-playing robots'] },
  { rank: 40, name: 'Influenster', domain: 'influenster.com', type: 'Other', citations: 2219, share: 0.2, avgPosition: 3.9, topics: 915, sampleTopics: ['disposable nursing pads', 'clear mascara', 'scented hand sanitiser'] },
  { rank: 41, name: 'Byrdie', domain: 'byrdie.com', type: 'Media', citations: 2140, share: 0.2, avgPosition: 3.8, topics: 984, sampleTopics: ['tattoo cover makeup', 'makeup remover for eyelash extensions', 'head massagers for hair growth'] },
  { rank: 42, name: 'Popular Mechanics', domain: 'popularmechanics.com', type: 'Media', citations: 2120, share: 0.2, avgPosition: 3.8, topics: 885, sampleTopics: ['high-capacity portable power stations', 'portable power stations for home', 'portable power station reviews'] },
  { rank: 43, name: 'Southern Living', domain: 'southernliving.com', type: 'Other', citations: 2115, share: 0.2, avgPosition: 4.1, topics: 1014, sampleTopics: ['specialty form camping canopies', 'silk duvet covers with corner ties', 'holiday lights shows and attractions'] },
  { rank: 44, name: 'Healthline', domain: 'healthline.com', type: 'Media', citations: 2092, share: 0.2, avgPosition: 2.7, topics: 717, sampleTopics: ['Apnea Monitor Infant Baby Monitors', "baby and children's thermometers", 'infant breathing monitors'] },
  { rank: 45, name: 'The Guardian', domain: 'theguardian.com', type: 'Media', citations: 2082, share: 0.2, avgPosition: 4.4, topics: 1052, sampleTopics: ['home battery systems with rebates', 'home battery systems with solar panels', 'silk eye masks for sleeping'] },
  { rank: 46, name: 'Babylist', domain: 'babylist.com', type: 'Marketplace', citations: 2052, share: 0.2, avgPosition: 2.7, topics: 456, sampleTopics: ['baby bottle washers for newborns', 'organic cotton crib sheets', 'baby bottle washers for older babies'] },
  { rank: 47, name: "Lowe's", domain: 'lowes.com', type: 'Retailer', citations: 2009, share: 0.2, avgPosition: 3.4, topics: 901, sampleTopics: ['bamboo shades for porch', 'cordless roller shades', 'vinyl roller shades'] },
  { rank: 48, name: "Tom's Hardware", domain: 'tomshardware.com', type: 'Media', citations: 1921, share: 0.2, avgPosition: 3.1, topics: 517, sampleTopics: ['3d printers for food', 'powered USB hubs', 'SLA 3d printers'] },
  { rank: 49, name: 'Business Insider', domain: 'businessinsider.com', type: 'Media', citations: 1879, share: 0.2, avgPosition: 3.7, topics: 739, sampleTopics: ['fiber-optic enterprise drones', 'maternity sleepwear onesies', 'cotton sleepwear'] },
  { rank: 50, name: 'Review Rating', domain: 'reviewrating.com', type: 'Affiliate/Aggregator', citations: 1879, share: 0.2, avgPosition: 3.9, topics: 652, sampleTopics: ['kids mini cameras', 'toy and novelty webcams', 'Bluetooth trackers with magnetic clips'] },
]

export function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
}
