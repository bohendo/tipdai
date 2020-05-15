import { arrayify, isHexString } from 'ethers/utils';

export const isValidHex = (hex: string, bytes: number): boolean =>
  isHexString(hex) && arrayify(hex).length === bytes;
