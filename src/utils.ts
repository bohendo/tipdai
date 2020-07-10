import { utils } from "ethers";

const { arrayify, hexlify, isHexString, randomBytes }  = utils;

export const isValidHex = (hex: string, bytes: number): boolean =>
  isHexString(hex) && arrayify(hex).length === bytes;

export const getRandomBytes32 = (): string =>
	hexlify(randomBytes(32));
