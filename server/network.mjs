import os from 'node:os';

// 返回所有可用的局域网 IPv4 地址；优先常见的家用网段。
export function getLanAddresses() {
  const candidates = [];
  for (const [name, addresses] of Object.entries(os.networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== 'IPv4' || address.internal) continue;
      if (address.address.startsWith('169.254.')) continue;
      candidates.push({ name, address: address.address });
    }
  }
  const score = (ip) => {
    if (ip.startsWith('192.168.')) return 0;
    if (ip.startsWith('10.')) return 1;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) return 2;
    return 3;
  };
  return candidates.sort((a, b) => score(a.address) - score(b.address));
}

export function getLanUrls(port) {
  return getLanAddresses().map(({ name, address }) => ({
    name,
    address,
    url: `http://${address}:${port}`,
  }));
}

export function getPrimaryLanUrl(port) {
  return getLanUrls(port)[0]?.url || '';
}
