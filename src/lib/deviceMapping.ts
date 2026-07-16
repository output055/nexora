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
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",

  // Samsung Devices
  "SM-A546B": "Galaxy A54 5G",
  "SM-A546E": "Galaxy A54 5G",
  "SM-A546U": "Galaxy A54 5G",
  "SM-A536B": "Galaxy A53 5G",
  "SM-A536E": "Galaxy A53 5G",
  "SM-A536U": "Galaxy A53 5G",
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
  return DEVICE_MODEL_MAP[productName] || null;
}
