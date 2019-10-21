import { Injectable } from '@nestjs/common';
import { arrayify, hexlify, isHexString, randomBytes, verifyMessage } from 'ethers/utils';

const isValidHex = (hex: string, bytes: number): boolean =>
  isHexString(hex) && arrayify(hex).length === bytes;

const badToken = (warning: string): any => {
  console.warn(warning);
  return false;
};

@Injectable()
export class UserService {
  private nonces: { [key: string]: { address: string; expiry: number } } = {};
  private signerCache: { [key: string]: string } = {};

  getNonce(address: string): string | undefined {
    if (!isValidHex(address, 20)) {
      console.log(`Invalid address: ${address}`);
      return;
    }
    const nonce = hexlify(randomBytes(16));
    const expiry = Date.now() + (2 * 60 * 60 * 1000);
    this.nonces[nonce] = { address, expiry };
    console.log(`getNonce: Gave address ${address} a nonce that expires at ${expiry}: ${nonce}`);
    return nonce;
  }

  verifySig(givenAddress: string, token: string): boolean {
    // Get & validate the nonce + signature from provided token
    if (token.indexOf(':') === -1) {
      return badToken(`Missing or malformed token: ${token}`);
    }
    const nonce = token.split(':')[0];
    const sig = token.split(':')[1];
    if (!isValidHex(nonce, 16) || !isValidHex(sig, 65)) {
      return badToken(`Improperly formatted nonce or sig in token: ${token}`);
    }

    // Get & validate expected address/expiry from local nonce storage
    if (!this.nonces[nonce] || !this.nonces[nonce].address || !this.nonces[nonce].expiry) {
      return badToken(`Unknown nonce provided by ${givenAddress}: ${nonce}`);
    }
    const { address, expiry } = this.nonces[nonce];
    if (givenAddress !== address) {
      return badToken(`Nonce ${nonce} for address ${address}, but xpub maps to ${givenAddress}`);
    }
    if (Date.now() >= expiry) {
      delete this.nonces[nonce];
      return badToken(`Nonce ${nonce} for ${address} expired at ${expiry}`);
    }

    // Cache sig recovery calculation
    if (!this.signerCache[token]) {
      this.signerCache[token] = verifyMessage(arrayify(nonce), sig);
      console.log(`Recovered signer ${this.signerCache[token]} from token ${token}`);
    }
    const signer = this.signerCache[token];
    if (this.signerCache[token] !== address) {
      return badToken(`Bad sig for ${nonce}: Got ${this.signerCache[token]}, expected ${address}`);
    }
    return true;
  }

}
