export const DEVICE_MODEL_MAP: Record<string, string> = {
  // Apple Devices
  "iPhone10,1": "iPhone 8",
  "iPhone10,4": "iPhone 8",
  "iPhone10,2": "iPhone 8 Plus",
  "iPhone10,5": "iPhone 8 Plus",
  "iPhone10,3": "iPhone X",
  "iPhone10,6": "iPhone X",
  "iPhone11,2": "iPhone XS",
  "iPhone11,4": "iPhone XS Max",
  "iPhone11,6": "iPhone XS Max",
  "iPhone11,8": "iPhone XR",
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE (2nd gen)",
  "iPhone13,1": "iPhone 12 mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,4": "iPhone 13 mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,6": "iPhone SE (3rd gen)",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",

  // iPads
  "iPad6,11": "iPad (5th gen)",
  "iPad6,12": "iPad (5th gen)",
  "iPad7,5": "iPad (6th gen)",
  "iPad7,6": "iPad (6th gen)",
  "iPad7,11": "iPad (7th gen)",
  "iPad7,12": "iPad (7th gen)",
  "iPad11,6": "iPad (8th gen)",
  "iPad11,7": "iPad (8th gen)",
  "iPad12,1": "iPad (9th gen)",
  "iPad12,2": "iPad (9th gen)",
  "iPad13,18": "iPad (10th gen)",
  "iPad13,19": "iPad (10th gen)",
  "iPad13,1": "iPad Air (4th gen)",
  "iPad13,2": "iPad Air (4th gen)",
  "iPad13,16": "iPad Air (5th gen)",
  "iPad13,17": "iPad Air (5th gen)",
  "iPad14,3": "iPad Pro 11-inch (4th gen)",
  "iPad14,4": "iPad Pro 11-inch (4th gen)",
  "iPad14,5": "iPad Pro 12.9-inch (6th gen)",
  "iPad14,6": "iPad Pro 12.9-inch (6th gen)",

  // Samsung Devices
  "SM-A546B": "Galaxy A54 5G",
  "SM-A546E": "Galaxy A54 5G",
  "SM-A546U": "Galaxy A54 5G",
  "SM-A536B": "Galaxy A53 5G",
  "SM-A536E": "Galaxy A53 5G",
  "SM-A536U": "Galaxy A53 5G",
  "SM-A336E": "Galaxy A33 5G",
  "SM-A336U": "Galaxy A33 5G",
  "SM-A736B": "Galaxy A73 5G",
  "SM-A736U": "Galaxy A73 5G",
  "SM-A236E": "Galaxy A23 5G",
  "SM-A236U": "Galaxy A23 5G",
  "SM-A137M": "Galaxy A13",
  "SM-A137U": "Galaxy A13",
  "SM-F946B": "Galaxy Z Fold4",
  "SM-F946U": "Galaxy Z Fold4",
  "SM-G991N": "Galaxy S21 5G",
  "SM-S901B": "Galaxy S22",
  "SM-S906B": "Galaxy S22+",
  "SM-S908B": "Galaxy S22 Ultra",
  "SM-S911B": "Galaxy S23",
  "SM-S916B": "Galaxy S23+",
  "SM-S918B": "Galaxy S23 Ultra",
  "SM-S921B": "Galaxy S24",
  "SM-S926B": "Galaxy S24+",
  "SM-S928B": "Galaxy S24 Ultra",
  
  // Add other devices as needed
};

/**
 * Tries to map a technical device product name (like iPhone14,5 or SM-A546B)
 * to a human readable marketing name (like iPhone 13 or Galaxy A54 5G).
 */
export function getHumanReadableDeviceName(productName: string | undefined): string | null {
  if (!productName) return null;
  
  // Exact match first
  if (DEVICE_MODEL_MAP[productName]) {
    return DEVICE_MODEL_MAP[productName];
  }
  
  // Try case-insensitive and space-removed match
  const normalizedInput = productName.toLowerCase().replace(/\s+/g, '');
  for (const [key, value] of Object.entries(DEVICE_MODEL_MAP)) {
    if (key.toLowerCase().replace(/\s+/g, '') === normalizedInput) {
      return value;
    }
  }
  
  return null;
}
