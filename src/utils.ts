import { toFelt, toHex } from 'starknet/utils/number';

export function hexArrayToString(tokenURI: any) {
  const hexString = tokenURI.map((item: string) => {
    return this.hex2ascii(`${toHex(item)}`);
  });
  console.log(hexString.join(''));
  return hexString.join('');
}

export function hex2ascii(v: string) {
  if (!/^0x([0-9a-fA-F]{2})+$/.test(v)) {
    throw new Error('Not an hex string');
  }
  let str = '';
  for (let i = 2; i < v.length; i += 2) {
    str += String.fromCharCode(parseInt(v.substr(i, 2), 16));
  }
  return str;
}
export function ascii2hex(str: string) {
  const arr1 = [];
  for (let n = 0, l = str.length; n < l; n++) {
    const hex = Number(str.charCodeAt(n)).toString(16);
    arr1.push(hex);
  }
  return arr1.join('');
}

export function stringToFelt(str: string) {
  const tokenURIArray = str.match(/.{1,31}/g);
  const tokenURIArrayHex = tokenURIArray.map((item) => {
    return `0x${ascii2hex(item)}`;
  });
  const tokenURIArrayFelt = tokenURIArrayHex.map((item) => {
    return toFelt(item);
  });
  return tokenURIArrayFelt;
}
