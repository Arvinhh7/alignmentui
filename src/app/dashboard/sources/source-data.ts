export type SourceType =
  | 'UGC'
  | 'Editorial'
  | 'Corporate'
  | 'Reference'
  | 'Marketplace'
  | 'Retailer'
  | 'Affiliate'
  | 'Institutional'
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
  'UGC',
  'Editorial',
  'Corporate',
  'Reference',
  'Marketplace',
  'Retailer',
  'Affiliate',
  'Institutional',
  'Other',
]

export const SOURCE_TYPE_STYLES: Record<SourceType, { badge: string; bar: string }> = {
  UGC: { badge: 'bg-[#DDF7FA] text-[#0B8EA0] border-[#B8EDF2]', bar: 'bg-[#17B8C8]' },
  Editorial: { badge: 'bg-[#E7F0FF] text-[#2D6CDF] border-[#C7DAFF]', bar: 'bg-[#3B82F6]' },
  Corporate: { badge: 'bg-[#FFF0E2] text-[#E05E16] border-[#FFD3AA]', bar: 'bg-[#F97316]' },
  Reference: { badge: 'bg-[#F1E8FF] text-[#7C3AED] border-[#DCC9FF]', bar: 'bg-[#8B5CF6]' },
  Marketplace: { badge: 'bg-[#FFF1DE] text-[#C7661C] border-[#FFD7A3]', bar: 'bg-[#F59E0B]' },
  Retailer: { badge: 'bg-[#DFF8EE] text-[#2B8A62] border-[#BDEDD9]', bar: 'bg-[#34A879]' },
  Affiliate: { badge: 'bg-[#FFEDE6] text-[#D15F2A] border-[#FFD0BA]', bar: 'bg-[#FB7185]' },
  Institutional: { badge: 'bg-[#E1F8F3] text-[#0F8F7B] border-[#BDEDE3]', bar: 'bg-[#14B8A6]' },
  Other: { badge: 'bg-surface-muted text-ink-3 border-divider-light', bar: 'bg-ink-3' },
}

export const SOURCE_TYPE_DISTRIBUTION: Record<SourceType, { count: number; citations: number; share: number }> = {
  UGC: { count: 4812, citations: 701318, share: 28.8 },
  Editorial: { count: 32741, citations: 836482, share: 34.3 },
  Corporate: { count: 21904, citations: 316716, share: 13.0 },
  Reference: { count: 9848, citations: 170713, share: 7.0 },
  Marketplace: { count: 3126, citations: 80479, share: 3.3 },
  Retailer: { count: 18742, citations: 224366, share: 9.2 },
  Affiliate: { count: 7214, citations: 85357, share: 3.5 },
  Institutional: { count: 1143, citations: 17071, share: 0.7 },
  Other: { count: 4000, citations: 6261, share: 0.3 },
}

export const PUBLIC_SOURCE_DOMAINS: PublicSourceDomain[] = [
  { rank: 1, name: 'Reddit', domain: 'reddit.com', type: 'UGC', citations: 412867, share: 16.9, avgPosition: 4.1, topics: 18420, sampleTopics: ['fast electric bikes', 'folding electric bikes', 'fat tire electric bikes'] },
  { rank: 2, name: 'TechRadar', domain: 'techradar.com', type: 'Editorial', citations: 68420, share: 2.8, avgPosition: 3.5, topics: 6410, sampleTopics: ['enclosed 3d printers', 'waterproof swimming headphones', 'printer brands and drivers'] },
  { rank: 3, name: "Tom's Guide", domain: 'tomsguide.com', type: 'Editorial', citations: 62184, share: 2.5, avgPosition: 3.3, topics: 6895, sampleTopics: ['outdoor security cameras', 'folding electric bikes', 'smart home hubs with screen'] },
  { rank: 4, name: 'Forbes', domain: 'forbes.com', type: 'Editorial', citations: 43892, share: 1.8, avgPosition: 2.6, topics: 5124, sampleTopics: ["women's electric shavers", 'intimate apparel', 'weighted silk eye masks'] },
  { rank: 5, name: 'Alibaba', domain: 'alibaba.com', type: 'Marketplace', citations: 39651, share: 1.6, avgPosition: 3.4, topics: 7038, sampleTopics: ['motorcycle engine parts', 'sustainable swimwear', 'mechanical music boxes'] },
  { rank: 6, name: 'Good Housekeeping', domain: 'goodhousekeeping.com', type: 'Editorial', citations: 34220, share: 1.4, avgPosition: 3.2, topics: 4861, sampleTopics: ['solar generators for home', 'leaf blowers with mulcher', 'leaf vacuums'] },
  { rank: 7, name: 'Allure', domain: 'allure.com', type: 'Editorial', citations: 30492, share: 1.3, avgPosition: 3.1, topics: 3294, sampleTopics: ['best lip stains', 'drugstore mascara', 'tubing mascara'] },
  { rank: 8, name: 'Walmart', domain: 'walmart.com', type: 'Retailer', citations: 28876, share: 1.2, avgPosition: 3.0, topics: 7420, sampleTopics: ['baby wipes for newborns', 'air mattresses with headboard', 'Winnie the Pooh onesies'] },
  { rank: 9, name: 'Vogue', domain: 'vogue.com', type: 'Editorial', citations: 26715, share: 1.1, avgPosition: 3.2, topics: 3726, sampleTopics: ['collagen hydrating face masks', 'organic aloe vera gel', 'LED light therapy masks'] },
  { rank: 10, name: 'Better Homes & Gardens', domain: 'bhg.com', type: 'Editorial', citations: 24844, share: 1.0, avgPosition: 3.7, topics: 4412, sampleTopics: ['waterproof outdoor rugs', 'cantilever umbrellas', 'outdoor rugs 9x12'] },
  { rank: 11, name: 'WIRED', domain: 'wired.com', type: 'Editorial', citations: 23690, share: 1.0, avgPosition: 4.0, topics: 3984, sampleTopics: ['fat tire electric bikes', 'class 1 electric bikes', 'water filter pitchers'] },
  { rank: 12, name: 'Consumer Reports', domain: 'consumerreports.org', type: 'Reference', citations: 22538, share: 0.9, avgPosition: 2.2, topics: 2886, sampleTopics: ['best wall ovens', 'Keurig and K-Cup coffee makers', 'single wall ovens'] },
  { rank: 13, name: 'Home Depot', domain: 'homedepot.com', type: 'Retailer', citations: 21417, share: 0.9, avgPosition: 3.2, topics: 4551, sampleTopics: ['gas ranges for propane', 'gas ranges with double ovens', 'white gas ranges'] },
  { rank: 14, name: 'YouTube', domain: 'youtube.com', type: 'UGC', citations: 20735, share: 0.8, avgPosition: 4.0, topics: 5272, sampleTopics: ['hearing aids for tinnitus', 'short throw projectors', 'setting powder for dry skin'] },
  { rank: 15, name: 'RTINGS', domain: 'rtings.com', type: 'Reference', citations: 19684, share: 0.8, avgPosition: 2.1, topics: 2210, sampleTopics: ['4 slice toasters', 'cordless stick vacuum cleaners', 'loud Bluetooth speakers'] },
  { rank: 16, name: 'Who What Wear', domain: 'whowhatwear.com', type: 'Editorial', citations: 18926, share: 0.8, avgPosition: 3.4, topics: 3088, sampleTopics: ['drugstore setting powder', 'setting powder for dry skin', 'lengthening mascara'] },
  { rank: 17, name: 'Real Simple', domain: 'realsimple.com', type: 'Editorial', citations: 18175, share: 0.7, avgPosition: 3.8, topics: 3895, sampleTopics: ['vintage cafe curtains', 'steam cleaners for grout and tile', 'faux fur blankets'] },
  { rank: 18, name: 'The Spruce', domain: 'thespruce.com', type: 'Editorial', citations: 17612, share: 0.7, avgPosition: 3.5, topics: 3354, sampleTopics: ['stair tread rugs', 'extension cables', 'water test kits for drinking water'] },
  { rank: 19, name: 'The Verge', domain: 'theverge.com', type: 'Editorial', citations: 16880, share: 0.7, avgPosition: 4.1, topics: 3021, sampleTopics: ['item and Bluetooth smart trackers', 'Bluetooth trackers for iPhone', 'Android smart trackers'] },
  { rank: 20, name: 'Bob Vila', domain: 'bobvila.com', type: 'Editorial', citations: 16224, share: 0.7, avgPosition: 2.7, topics: 2785, sampleTopics: ['ductless range hoods', 'handheld pool vacuums', 'evaporative humidifiers'] },
  { rank: 21, name: "Macy's", domain: 'macys.com', type: 'Retailer', citations: 15870, share: 0.7, avgPosition: 3.0, topics: 3440, sampleTopics: ['holiday family pajamas', "women's pajama sets", 'family matching sleepwear'] },
  { rank: 22, name: 'Android Central', domain: 'androidcentral.com', type: 'Editorial', citations: 14986, share: 0.6, avgPosition: 3.6, topics: 2269, sampleTopics: ['smartwatches with Android', 'smartwatches for Android', 'Fossil smartwatches'] },
  { rank: 23, name: 'Wikipedia', domain: 'wikipedia.org', type: 'Reference', citations: 14330, share: 0.6, avgPosition: 3.2, topics: 3184, sampleTopics: ['collectible figure dolls', 'futuristic sci-fi 360 drones', 'Gee Bend quilts'] },
  { rank: 24, name: 'Digital Camera World', domain: 'digitalcameraworld.com', type: 'Editorial', citations: 13792, share: 0.6, avgPosition: 3.4, topics: 1690, sampleTopics: ['professional pocket cameras', 'beginner battery cameras', 'mirrorless battery cameras'] },
  { rank: 25, name: 'Smart Home Explorer', domain: 'smarthomeexplorer.com', type: 'Affiliate', citations: 13318, share: 0.5, avgPosition: 2.8, topics: 1937, sampleTopics: ['Smart Home Hubs for Google Home', 'smart home control panels', 'smart home sensors for garage doors'] },
  { rank: 26, name: 'Parents', domain: 'parents.com', type: 'Editorial', citations: 12842, share: 0.5, avgPosition: 4.0, topics: 2016, sampleTopics: ['baby swaddles with safety', 'newborn baby bottles', 'swaddle baby sleep sacks'] },
  { rank: 27, name: 'Target', domain: 'target.com', type: 'Retailer', citations: 12290, share: 0.5, avgPosition: 3.0, topics: 3105, sampleTopics: ['maternity clothing at Target', 'baby sleep sacks with sleeves', 'formula milk dispensers'] },
  { rank: 28, name: 'Best Buy', domain: 'bestbuy.com', type: 'Retailer', citations: 11864, share: 0.5, avgPosition: 3.1, topics: 2988, sampleTopics: ['36 inch gas cooktops', 'restaurant and food delivery gift cards', 'gift cards for online marketplaces'] },
  { rank: 29, name: 'Glamour', domain: 'glamour.com', type: 'Editorial', citations: 11428, share: 0.5, avgPosition: 3.3, topics: 2510, sampleTopics: ["women's electric shavers", 'infrared hair dryers', 'strapless shapewear'] },
  { rank: 30, name: 'T3', domain: 't3.com', type: 'Editorial', citations: 10872, share: 0.4, avgPosition: 4.1, topics: 2369, sampleTopics: ['smart radiator thermostats', 'razors for manscaping', 'performance outdoor apparel'] },
  { rank: 31, name: 'Ulta', domain: 'ulta.com', type: 'Retailer', citations: 10490, share: 0.4, avgPosition: 2.9, topics: 2042, sampleTopics: ['talc-free setting powder', 'weighted silk eye masks', 'flat hair clips'] },
  { rank: 32, name: 'People', domain: 'people.com', type: 'Editorial', citations: 10158, share: 0.4, avgPosition: 3.7, topics: 2314, sampleTopics: ['dog chew toys', 'dog food storage containers', 'outdoor blankets for patio'] },
  { rank: 33, name: 'New York Post', domain: 'nypost.com', type: 'Editorial', citations: 9734, share: 0.4, avgPosition: 4.4, topics: 2806, sampleTopics: ['high chairs with safety', 'residential poe security systems', 'high chairs for newborns'] },
  { rank: 34, name: 'OutdoorGearLab', domain: 'outdoorgearlab.com', type: 'Affiliate', citations: 9318, share: 0.4, avgPosition: 2.6, topics: 1452, sampleTopics: ['class 3 electric bikes', "women's water shoes", "women's trekking poles"] },
  { rank: 35, name: "Tom's Hardware", domain: 'tomshardware.com', type: 'Editorial', citations: 9072, share: 0.4, avgPosition: 3.0, topics: 1475, sampleTopics: ['3d printers for food', 'powered USB hubs', 'SLA 3d printers'] },
  { rank: 36, name: 'Popular Mechanics', domain: 'popularmechanics.com', type: 'Editorial', citations: 8861, share: 0.4, avgPosition: 3.6, topics: 1884, sampleTopics: ['high-capacity portable power stations', 'portable power stations for home', 'portable power station reviews'] },
  { rank: 37, name: 'Byrdie', domain: 'byrdie.com', type: 'Editorial', citations: 8414, share: 0.3, avgPosition: 3.7, topics: 1980, sampleTopics: ['tattoo cover makeup', 'makeup remover for eyelash extensions', 'head massagers for hair growth'] },
  { rank: 38, name: 'Healthline', domain: 'healthline.com', type: 'Editorial', citations: 8180, share: 0.3, avgPosition: 2.6, topics: 1602, sampleTopics: ['Apnea Monitor Infant Baby Monitors', "baby and children's thermometers", 'infant breathing monitors'] },
  { rank: 39, name: 'Business Insider', domain: 'businessinsider.com', type: 'Editorial', citations: 7792, share: 0.3, avgPosition: 3.5, topics: 1718, sampleTopics: ['fiber-optic enterprise drones', 'maternity sleepwear onesies', 'cotton sleepwear'] },
  { rank: 40, name: "Lowe's", domain: 'lowes.com', type: 'Retailer', citations: 7416, share: 0.3, avgPosition: 3.3, topics: 2134, sampleTopics: ['bamboo shades for porch', 'cordless roller shades', 'vinyl roller shades'] },
  { rank: 41, name: 'Babylist', domain: 'babylist.com', type: 'Marketplace', citations: 7195, share: 0.3, avgPosition: 2.7, topics: 1388, sampleTopics: ['baby bottle washers for newborns', 'organic cotton crib sheets', 'baby bottle washers for older babies'] },
  { rank: 42, name: 'RedditRecs', domain: 'redditrecs.com', type: 'Affiliate', citations: 6958, share: 0.3, avgPosition: 3.6, topics: 1607, sampleTopics: ['automatic espresso machines', 'warm mist humidifiers', 'portable Bluetooth speakers'] },
  { rank: 43, name: 'The Guardian', domain: 'theguardian.com', type: 'Editorial', citations: 6820, share: 0.3, avgPosition: 4.2, topics: 1840, sampleTopics: ['home battery systems with rebates', 'home battery systems with solar panels', 'silk eye masks for sleeping'] },
  { rank: 44, name: 'Influenster', domain: 'influenster.com', type: 'UGC', citations: 6497, share: 0.3, avgPosition: 3.8, topics: 1525, sampleTopics: ['disposable nursing pads', 'clear mascara', 'scented hand sanitiser'] },
  { rank: 45, name: 'Redrec', domain: 'redrec.co', type: 'Affiliate', citations: 6263, share: 0.3, avgPosition: 2.9, topics: 1688, sampleTopics: ['electric scooters for adults', 'cordless stick vacuum cleaners', 'LED light therapy masks for sleep'] },
  { rank: 46, name: 'arXiv', domain: 'arxiv.org', type: 'Institutional', citations: 5936, share: 0.2, avgPosition: 5.0, topics: 1304, sampleTopics: ['AI humanoid robots', 'humanoid robots from China', 'sports-playing robots'] },
  { rank: 47, name: 'Southern Living', domain: 'southernliving.com', type: 'Editorial', citations: 5721, share: 0.2, avgPosition: 3.9, topics: 1608, sampleTopics: ['specialty form camping canopies', 'silk duvet covers with corner ties', 'holiday lights shows and attractions'] },
  { rank: 48, name: 'Review Rating', domain: 'reviewrating.com', type: 'Affiliate', citations: 5368, share: 0.2, avgPosition: 3.7, topics: 1170, sampleTopics: ['kids mini cameras', 'toy and novelty webcams', 'Bluetooth trackers with magnetic clips'] },
  { rank: 49, name: 'wellwhisk.com', domain: 'wellwhisk.com', type: 'Other', citations: 5156, share: 0.2, avgPosition: 2.6, topics: 1524, sampleTopics: ['electric shavers for bald heads', 'heated silk eye masks', 'cat treats for kidney disease'] },
  { rank: 50, name: 'GummySearch', domain: 'gummysearch.com', type: 'Corporate', citations: 4924, share: 0.2, avgPosition: 3.0, topics: 1446, sampleTopics: ['high pigment eyeshadow palette', 'plus size nursing bras', 'breast pumps with Medicaid'] },
]

export function faviconUrl(domain: string) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`
}
